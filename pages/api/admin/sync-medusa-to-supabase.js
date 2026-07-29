/**
 * POST /api/admin/sync-medusa-to-supabase?secret=<CRON_SECRET>
 * 將 Medusa Store 所有商品同步進 Supabase products + product_variations，
 * 包含 retail_price 欄位，供 J寶 聊天知識庫與商品卡使用。
 */
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import {
  getMedusaBackendUrl,
  getMedusaPublishableKey,
  formatMedusaProductForPartner,
  isVisibleOnMainSite,
} from "../../../lib/medusaStoreApi";
import { clearProductKnowledgeCache } from "../../../lib/chatProducts";

async function fetchAllFromMedusa() {
  const url = getMedusaBackendUrl();
  const key = getMedusaPublishableKey();
  if (!key) throw new Error("缺少 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");

  const all = [];
  let offset = 0;
  const limit = 50;
  const fields =
    "+metadata,*variants,*variants.prices,*variants.options,*variants.options.option";

  while (true) {
    const qs = new URLSearchParams({ limit: String(limit), offset: String(offset), fields });
    const res = await fetch(`${url}/store/products?${qs}`, {
      headers: { "x-publishable-api-key": key },
    });
    if (!res.ok) throw new Error(`Medusa ${res.status}`);
    const data = await res.json();
    const batch = (data.products || []).filter(isVisibleOnMainSite);
    all.push(...batch);
    if ((data.products || []).length < limit) break;
    offset += limit;
    if (offset > 500) break;
  }
  return all;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  if (!secret || req.query.secret !== secret) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const supabase = getSupabaseAdminServer();
    const products = await fetchAllFromMedusa();

    const results = [];

    // ── 偵測 Supabase 是否已有擴充欄位 ─────────────────────────────────
    const { error: colCheckErr } = await supabase
      .from("products")
      .select("handle")
      .limit(1);
    const hasExtendedCols = !colCheckErr;

    for (const raw of products) {
      const f = await formatMedusaProductForPartner(raw);

      // ── upsert products ──────────────────────────────────────────────
      const productPayload = {
        name: f.name,
        description: f.description || null,
        image_url: f.image_url || null,
        updated_at: new Date().toISOString(),
      };

      // 只在欄位存在時才寫
      if (hasExtendedCols) {
        productPayload.handle = f.handle || null;
        productPayload.medusa_product_id = f.medusa_product_id;
        productPayload.medusa_synced_at = new Date().toISOString();
      }

      let productId = null;

      // 優先用 medusa_product_id 查詢，否則 fallback 名稱
      // 注意：用 .limit(1) 取代 .maybeSingle()，避免歷史重複資料造成
      // 「查到多筆 → 回傳 error → existing 被當成 null → 又插入一筆新重複」
      // 的滾雪球式重複 bug（曾實際造成同名商品被重複同步出 2~3 筆）。
      let existing = null;
      if (hasExtendedCols && f.medusa_product_id) {
        const { data } = await supabase
          .from("products")
          .select("id")
          .eq("medusa_product_id", f.medusa_product_id)
          .order("id", { ascending: true })
          .limit(1);
        existing = data?.[0] || null;
      }
      if (!existing) {
        const { data } = await supabase
          .from("products")
          .select("id")
          .eq("name", f.name)
          .order("id", { ascending: true })
          .limit(1);
        existing = data?.[0] || null;
      }

      if (existing?.id) {
        await supabase.from("products").update(productPayload).eq("id", existing.id);
        productId = existing.id;
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("products")
          .insert(productPayload)
          .select("id")
          .single();
        if (insErr) throw new Error(`Insert product failed: ${insErr.message}`);
        productId = inserted.id;
      }

      // ── upsert product_variations ────────────────────────────────────
      const varCount = { upserted: 0 };

      // 偵測 product_variations 擴充欄位
      const { error: varColErr } = await supabase
        .from("product_variations")
        .select("retail_price")
        .limit(1);
      const hasRetailPrice = !varColErr;

      const { error: varMedusaColErr } = await supabase
        .from("product_variations")
        .select("medusa_variant_id")
        .limit(1);
      const hasMedusaVariantId = !varMedusaColErr;

      for (const v of f.variants || []) {
        const varPayload = {
          product_id: productId,
          sku: v.sku || v.medusa_variant_id || `${productId}-${varCount.upserted}`,
          // DB 一律存「API 原始底價」（與 lib/medusaProductSync.js 同慣例）；
          // 夥伴可見底價在讀取時才 × PARTNER_B2B_COST_RATE，不可把已含平台
          // 抽成的 v.b2b_price 寫進這欄，否則底價會被灌水、後續計算全錯。
          b2b_price: v.api_b2b_price ?? v.b2b_price ?? 0,
          attributes: v.attributes || {},
        };

        if (hasRetailPrice) varPayload.retail_price = v.retail_price || 0;
        if (hasMedusaVariantId) varPayload.medusa_variant_id = v.medusa_variant_id;
        if (hasRetailPrice) varPayload.title = v.title || null; // title 也在 00002

        // 查詢現有 variant（同樣用 .limit(1) 避免重複資料造成滾雪球式重複插入）
        let existingVar = null;
        if (hasMedusaVariantId && v.medusa_variant_id) {
          const { data } = await supabase
            .from("product_variations")
            .select("id")
            .eq("medusa_variant_id", v.medusa_variant_id)
            .order("id", { ascending: true })
            .limit(1);
          existingVar = data?.[0] || null;
        }
        if (!existingVar) {
          const { data } = await supabase
            .from("product_variations")
            .select("id")
            .eq("product_id", productId)
            .eq("sku", varPayload.sku)
            .order("id", { ascending: true })
            .limit(1);
          existingVar = data?.[0] || null;
        }

        if (existingVar?.id) {
          await supabase
            .from("product_variations")
            .update(varPayload)
            .eq("id", existingVar.id);
        } else {
          await supabase.from("product_variations").insert(varPayload);
        }
        varCount.upserted++;
      }

      results.push({ name: f.name, handle: f.handle, variants: varCount.upserted });
    }

    // 清除 J寶 快取，下次對話立即讀最新資料
    clearProductKnowledgeCache();

    return res.status(200).json({
      ok: true,
      synced: results.length,
      hasExtendedCols,
      products: results,
      migrationHint: !hasExtendedCols
        ? "⚠️ products 表缺少 handle/medusa_product_id 欄位，請到 Supabase SQL Editor 執行 supabase/migrations/20260711_product_retail_price.sql 後重新同步"
        : null,
    });
  } catch (err) {
    console.error("[sync-medusa-to-supabase]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
