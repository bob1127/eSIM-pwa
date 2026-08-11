import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import { upsertMedusaProductToSupabase } from "../../../lib/medusaProductSync";
import { applyPartnerB2BMarkup } from "../../../lib/medusaPartnerPricing";
import { validateCustomPricesInput } from "../../../lib/partnerPricing";
import { logPricingAudit } from "../../../lib/partnerPricingAudit";
import { fetchMedusaHotSaleMapByIds } from "../../../lib/medusaStoreApi";
import {
  parseHotSaleTelecoms,
  isHotSaleTelecom,
} from "../../../lib/productHotSale";
import {
  healStoreProductListings,
  healEmptyListingsForProduct,
} from "../../../lib/healStoreProductListings";
import {
  syncCatalogAvailability,
  CATALOG_STATUS,
  probeLiveMedusaProductIds,
} from "../../../lib/partnerCatalogAvailability";

/**
 * 與前台商品頁「確認您的選擇」一致：
 *   AU(KDDI) | 5天
 * （吃到飽／無限流量不重複寫，因為商品名已含）
 */
function formatPartnerVariantLabel(attrs = {}, title, sku, id) {
  const telecom = attrs.telecom || attrs.電信商 || null;
  const daysRaw = attrs.days ?? attrs.天數;
  const days =
    daysRaw != null && String(daysRaw).trim() !== ""
      ? `${String(daysRaw).replace(/\s*天\s*$/, "")}天`
      : null;
  let data = attrs.data_amount || attrs.data || attrs.數據量 || null;
  if (data && /無限|unlimited|吃到飽/i.test(String(data))) data = null;
  const parts = [telecom, days, data].filter(Boolean);
  if (parts.length) return parts.join(" | ");
  return title || sku || `方案 #${id}`;
}

export default async function handler(req, res) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: "伺服器設定不完整" });
  }

  const user = await getAuthUserFromBearer(req);
  if (!user) {
    return res.status(401).json({ error: "請先登入" });
  }

  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.store) {
    return res.status(403).json({ error: access.message || "無夥伴權限" });
  }

  const storeId = access.store.id;

  if (req.method === "GET") {
    const selectAttempts = [
      "id, store_id, product_id, medusa_product_id, custom_prices, status, created_at",
      "id, store_id, product_id, medusa_product_id, custom_prices, created_at",
      "id, store_id, product_id, custom_prices, created_at",
      "id, product_id, medusa_product_id, custom_prices, status, created_at",
      "id, product_id, medusa_product_id, custom_prices, created_at",
      "id, product_id, custom_prices, created_at",
    ];

    let listings = null;
    let lastError = null;
    for (const cols of selectAttempts) {
      const { data, error } = await supabase
        .from("store_products")
        .select(cols)
        .eq("store_id", storeId);
      if (!error) {
        listings = (data || []).map((r) => ({
          ...r,
          store_id: r.store_id ?? storeId,
        }));
        break;
      }
      lastError = error;
      if (!/column|does not exist|schema cache/i.test(error.message || "")) {
        return res.status(500).json({ error: error.message });
      }
    }
    if (!listings) {
      return res.status(500).json({ error: lastError?.message || "讀取失敗" });
    }

    // 自動對齊：空殼／舊 products → 有 Medusa＋方案的正確商品
    let healInfo = { healed: 0, removed: 0 };
    try {
      const healed = await healStoreProductListings(supabase, listings);
      healInfo = { healed: healed.healed, removed: healed.removed };
      listings = healed.listings;
      if (healInfo.healed || healInfo.removed) {
        console.log(
          `[store-listings] heal store=${storeId} healed=${healInfo.healed} removed=${healInfo.removed}`,
        );
      }
    } catch (err) {
      console.warn("[store-listings] heal failed:", err?.message || err);
    }

    // 對齊主站：已下架／刪除的商品自動暫停夥伴上架，避免繼續販售
    let catalogSync = { checked: 0, unavailable: [], pausedListings: 0 };
    try {
      const medusaIdsForSync = [
        ...new Set(
          listings
            .map((r) => r.medusa_product_id)
            .filter(Boolean)
            .map(String),
        ),
      ];
      if (medusaIdsForSync.length) {
        catalogSync = await syncCatalogAvailability(supabase, medusaIdsForSync);
        if (catalogSync.pausedListings || catalogSync.unavailable?.length) {
          // 重新讀取 status（可能剛被 pause）
          const selectAttempts2 = [
            "id, store_id, product_id, medusa_product_id, custom_prices, status, created_at",
            "id, store_id, product_id, medusa_product_id, custom_prices, created_at",
          ];
          for (const cols of selectAttempts2) {
            const { data, error } = await supabase
              .from("store_products")
              .select(cols)
              .eq("store_id", storeId);
            if (!error) {
              listings = (data || []).map((r) => ({
                ...r,
                store_id: r.store_id ?? storeId,
              }));
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn("[store-listings] catalog sync failed:", err?.message || err);
    }

    const productIds = [
      ...new Set(listings.map((r) => r.product_id).filter(Boolean)),
    ];
    const productMeta = {};
    const variantsByProduct = {};
    if (productIds.length) {
      const nameTries = [
        "id, name, image_url, handle, hot_sale_telecoms, medusa_product_id, catalog_status, catalog_unavailable_at",
        "id, name, image_url, handle, hot_sale_telecoms, medusa_product_id",
        "id, name, image_url, handle, medusa_product_id",
        "id, name, image_url, handle",
        "id, name, image_url",
        "id, name",
      ];
      let products = null;
      for (const cols of nameTries) {
        const { data, error } = await supabase
          .from("products")
          .select(cols)
          .in("id", productIds);
        if (!error) {
          products = data || [];
          break;
        }
      }
      for (const p of products || []) {
        productMeta[p.id] = {
          name: p.name,
          image_url: p.image_url || null,
          handle: p.handle || null,
          medusa_product_id: p.medusa_product_id || null,
          hot_sale_telecoms: parseHotSaleTelecoms(p.hot_sale_telecoms),
          catalog_status: p.catalog_status || CATALOG_STATUS.ACTIVE,
          catalog_unavailable_at: p.catalog_unavailable_at || null,
          minB2B: 0,
          planCount: 0,
        };
      }

      const pushVariant = (v, includeMedusaId, includeExtra) => {
        const meta = productMeta[v.product_id];
        if (!meta) return;
        meta.planCount += 1;
        const apiCost = Number(v.b2b_price) || 0;
        if (apiCost > 0 && (meta.minB2B === 0 || apiCost < meta.minB2B)) {
          meta.minB2B = apiCost;
        }
        if (!variantsByProduct[v.product_id]) {
          variantsByProduct[v.product_id] = [];
        }
        const partnerCost = applyPartnerB2BMarkup(apiCost);
        const attrs = includeExtra ? v.attributes || {} : {};
        // 欄位可能為空，但舊資料常把 medusa_variant_id 塞在 attributes 裡
        const medusaVariantId = includeMedusaId
          ? v.medusa_variant_id || attrs.medusa_variant_id || null
          : attrs.medusa_variant_id || null;
        const title = includeExtra ? v.title || null : null;
        // 優先用 Medusa variant id 當 price_key，與前台商品頁一致
        const priceKey = String(medusaVariantId || v.id);
        const telecom = attrs.telecom || attrs.電信商 || null;
        variantsByProduct[v.product_id].push({
          id: v.id,
          medusa_variant_id: medusaVariantId,
          price_key: priceKey,
          sku: v.sku || null,
          title,
          attributes: attrs,
          telecom,
          label: formatPartnerVariantLabel(attrs, title, v.sku, v.id),
          api_b2b: apiCost,
          cost: partnerCost,
        });
      };

      // 依欄位齊全度由多到少嘗試，逐步降級，避免任一選填欄位缺失就整批查無方案
      const varsTries = [
        {
          cols: "id, product_id, sku, title, attributes, b2b_price, medusa_variant_id",
          includeMedusaId: true,
          includeExtra: true,
        },
        {
          cols: "id, product_id, sku, attributes, b2b_price, medusa_variant_id",
          includeMedusaId: true,
          includeExtra: true,
        },
        {
          cols: "id, product_id, sku, b2b_price, medusa_variant_id",
          includeMedusaId: true,
          includeExtra: false,
        },
        {
          cols: "id, product_id, sku, title, attributes, b2b_price",
          includeMedusaId: false,
          includeExtra: true,
        },
        {
          cols: "id, product_id, sku, attributes, b2b_price",
          includeMedusaId: false,
          includeExtra: true,
        },
        {
          cols: "id, product_id, sku, b2b_price",
          includeMedusaId: false,
          includeExtra: false,
        },
      ];

      for (const attempt of varsTries) {
        const { data, error } = await supabase
          .from("product_variations")
          .select(attempt.cols)
          .in("product_id", productIds);
        if (!error) {
          for (const v of data || []) {
            pushVariant(v, attempt.includeMedusaId, attempt.includeExtra);
          }
          break;
        }
      }

      for (const list of Object.values(variantsByProduct)) {
        list.sort((a, b) => (a.cost || 0) - (b.cost || 0));
      }
    }

    // 本機尚無熱銷快取時，向 Medusa 補 metadata.hot_sale_telecoms（對齊官網推薦）
    const medusaIdsNeedingHotSale = [
      ...new Set(
        listings
          .map((row) => {
            const local = row.product_id ? productMeta[row.product_id] : null;
            const mid =
              row.medusa_product_id || local?.medusa_product_id || null;
            if (!mid) return null;
            if ((local?.hot_sale_telecoms || []).length) return null;
            return String(mid);
          })
          .filter(Boolean),
      ),
    ];
    let medusaHotSaleMap = {};
    if (medusaIdsNeedingHotSale.length) {
      try {
        medusaHotSaleMap = await fetchMedusaHotSaleMapByIds(
          medusaIdsNeedingHotSale,
        );
      } catch (err) {
        console.warn(
          "[store-listings] hot_sale fetch failed:",
          err?.message || err,
        );
      }
    }

    const enriched = listings.map((row) => {
      const local = row.product_id ? productMeta[row.product_id] : null;
      const apiMin = local?.minB2B || 0;
      const medusaId =
        row.medusa_product_id || local?.medusa_product_id || null;
      const hotSale =
        (local?.hot_sale_telecoms || []).length > 0
          ? local.hot_sale_telecoms
          : parseHotSaleTelecoms(medusaHotSaleMap[String(medusaId)] || []);
      const variants = (row.product_id
        ? variantsByProduct[row.product_id] || []
        : []
      ).map((v) => ({
        ...v,
        is_hot_sale: isHotSaleTelecom(hotSale, v.telecom),
      }));
      return {
        ...row,
        product_name: local?.name || null,
        product_image: local?.image_url || null,
        product_handle: local?.handle || null,
        hot_sale_telecoms: hotSale,
        catalog_status: local?.catalog_status || CATALOG_STATUS.ACTIVE,
        catalog_unavailable_at: local?.catalog_unavailable_at || null,
        catalog_available:
          (local?.catalog_status || CATALOG_STATUS.ACTIVE) ===
          CATALOG_STATUS.ACTIVE,
        /** 夥伴可見底價（已含平台 PARTNER_B2B_COST_RATE） */
        min_b2b: applyPartnerB2BMarkup(apiMin),
        /** API 原始最低底價 */
        api_min_b2b: apiMin,
        plan_count: local?.planCount || 0,
        variants,
      };
    });

    return res.status(200).json({
      listings: enriched,
      markup_rate: Number(access.store.markup_rate) || 20,
      markup_mode: access.store.markup_mode || "percent",
      markup_fixed: Number(access.store.markup_fixed) || 50,
      heal: healInfo,
      catalog_sync: catalogSync,
    });
  }

  if (req.method === "POST") {
    const { medusa_product_id: medusaProductId } = req.body || {};
    if (!medusaProductId) {
      return res.status(400).json({ error: "缺少 medusa_product_id" });
    }

    try {
      const { productId, formatted } = await upsertMedusaProductToSupabase(
        medusaProductId,
      );

      try {
        await healEmptyListingsForProduct(supabase, {
          storeId,
          productId,
          medusaProductId,
          productName: formatted?.name,
        });
      } catch (healErr) {
        console.warn(
          "[store-listings POST] heal:",
          healErr?.message || healErr,
        );
      }

      const { data: existing } = await supabase
        .from("store_products")
        .select("id, medusa_product_id")
        .eq("store_id", storeId)
        .eq("product_id", productId)
        .maybeSingle();

      const hasMedusaCol = !(
        await supabase.from("store_products").select("medusa_product_id").limit(1)
      ).error;

      if (existing) {
        if (hasMedusaCol && !existing.medusa_product_id) {
          await supabase
            .from("store_products")
            .update({ medusa_product_id: medusaProductId })
            .eq("id", existing.id);
        }
        return res.status(200).json({
          ok: true,
          productId,
          medusaProductId,
          listingId: existing.id,
          alreadyListed: true,
        });
      }

      const insertPayload = {
        store_id: storeId,
        product_id: productId,
        custom_prices: {},
      };
      if (hasMedusaCol) insertPayload.medusa_product_id = medusaProductId;

      const { data, error } = await supabase
        .from("store_products")
        .insert([insertPayload])
        .select("id, created_at")
        .single();

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({
        ok: true,
        productId,
        medusaProductId,
        listingId: data.id,
        listedAt: data.created_at,
      });
    } catch (err) {
      console.error("[store-listings POST]", err);
      return res.status(502).json({ error: err.message || "上架失敗" });
    }
  }

  if (req.method === "PATCH") {
    const {
      medusa_product_id: medusaProductId,
      product_id: productId,
      custom_prices: customPrices,
      status,
    } = req.body || {};

    if (!medusaProductId && !productId) {
      return res.status(400).json({ error: "缺少 medusa_product_id 或 product_id" });
    }

    // 先找出這筆上架紀錄（同時確認確實屬於這間店，並取得舊值供稽核／取得 product_id 供成本驗證）
    let lookupQuery = supabase
      .from("store_products")
      .select("id, product_id, custom_prices")
      .eq("store_id", storeId);
    lookupQuery = productId
      ? lookupQuery.eq("product_id", productId)
      : lookupQuery.eq("medusa_product_id", medusaProductId);
    const { data: existingListing, error: lookupError } =
      await lookupQuery.maybeSingle();

    if (lookupError) {
      return res.status(500).json({ error: lookupError.message });
    }
    if (!existingListing) {
      return res.status(404).json({ error: "找不到此上架商品" });
    }

    const patch = {};

    if (customPrices && typeof customPrices === "object") {
      // 邊界驗證：售價／加價率需在合理範圍，且不可低於底價，避免竄改或誤填
      // 逐步降級查詢，並從 attributes.medusa_variant_id 補別名
      const varSelectTries = [
        "id, sku, b2b_price, medusa_variant_id, attributes",
        "id, sku, b2b_price, medusa_variant_id",
        "id, sku, b2b_price, attributes",
        "id, sku, b2b_price",
        "id, b2b_price",
      ];
      let variations = [];
      for (const cols of varSelectTries) {
        const { data, error } = await supabase
          .from("product_variations")
          .select(cols)
          .eq("product_id", existingListing.product_id);
        if (!error) {
          variations = data || [];
          break;
        }
      }

      const variantCosts = variations.map((v) => ({
        id: v.id,
        medusa_variant_id:
          v.medusa_variant_id || v.attributes?.medusa_variant_id || null,
        sku: v.sku || null,
        cost: applyPartnerB2BMarkup(v.b2b_price),
      }));

      const check = validateCustomPricesInput(customPrices, variantCosts);
      if (!check.ok) {
        return res.status(400).json({ error: check.error });
      }
      patch.custom_prices = check.value;
    }
    if (status === "active" || status === "paused") {
      patch.status = status;
    }

    // 主站已下架時禁止重新啟用
    if (patch.status === "active") {
      let medusaId = existingListing.medusa_product_id || null;
      let catalogStatus = null;
      if (existingListing.product_id) {
        const { data: prod } = await supabase
          .from("products")
          .select("medusa_product_id, catalog_status")
          .eq("id", existingListing.product_id)
          .maybeSingle();
        if (prod) {
          medusaId = medusaId || prod.medusa_product_id || null;
          catalogStatus = prod.catalog_status || null;
        }
      }

      if (
        catalogStatus === CATALOG_STATUS.UNAVAILABLE ||
        catalogStatus === CATALOG_STATUS.DELETED
      ) {
        return res.status(400).json({
          error:
            "此商品已於主站下架或刪除，無法重新啟用。請至選品管理移除或等待主站恢復上架。",
        });
      }
      if (medusaId) {
        const { live, confirmedMissing } = await probeLiveMedusaProductIds([
          String(medusaId),
        ]);
        if (confirmedMissing.has(String(medusaId))) {
          return res.status(400).json({
            error: "主站目前找不到此商品（已下架／刪除），無法啟用販售。",
          });
        }
        // live 未確認且非 confirmedMissing → API 暫時錯誤，允許維持原行為不誤擋
        void live;
      }
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "沒有可更新的欄位" });
    }

    const buildQuery = (cols) => {
      let q = supabase.from("store_products").update(patch).eq("store_id", storeId);
      q = productId ? q.eq("product_id", productId) : q.eq("medusa_product_id", medusaProductId);
      return q.select(cols).maybeSingle();
    };

    // 只有實際要更新 status 時才在 select 帶上該欄位，
    // 這樣舊資料庫（沒有 status 欄）在只改 custom_prices 時也能正常保存。
    const initialCols =
      patch.status !== undefined ? "id, custom_prices, status" : "id, custom_prices";
    let { data, error } = await buildQuery(initialCols);

    let statusLocalOnly = false;
    if (error && /status|schema cache|does not exist/i.test(error.message || "")) {
      // status 欄不存在：從 patch 與 select 都拿掉，只更新 custom_prices 後重試
      if (patch.status !== undefined) {
        delete patch.status;
        statusLocalOnly = true;
      }
      const retry = await buildQuery("id, custom_prices");
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (patch.custom_prices) {
      await logPricingAudit(supabase, {
        storeId,
        actorUserId: user.id,
        actorEmail: user.email,
        action: "update_custom_prices",
        field: "custom_prices",
        oldValue: existingListing.custom_prices,
        newValue: patch.custom_prices,
        req,
      });
    }

    return res.status(200).json({
      ok: true,
      listing: data,
      ...(statusLocalOnly ? { statusLocalOnly: true } : {}),
    });
  }

  if (req.method === "DELETE") {
    const medusaProductId = req.body?.medusa_product_id || req.query?.medusa_product_id;
    const productId = req.body?.product_id || req.query?.product_id;

    if (!medusaProductId && !productId) {
      return res.status(400).json({ error: "缺少 medusa_product_id 或 product_id" });
    }

    let query = supabase.from("store_products").delete().eq("store_id", storeId);

    if (productId) {
      query = query.eq("product_id", productId);
    } else {
      const hasMedusaCol = !(
        await supabase.from("store_products").select("medusa_product_id").limit(1)
      ).error;
      if (hasMedusaCol) {
        query = query.eq("medusa_product_id", medusaProductId);
      } else {
        const { productId: pid } = await upsertMedusaProductToSupabase(medusaProductId);
        query = query.eq("product_id", pid);
      }
    }

    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
  return res.status(405).end("Method Not Allowed");
}
