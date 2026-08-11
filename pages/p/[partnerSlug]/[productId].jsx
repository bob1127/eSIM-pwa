import ProductPage from "../../product/[category]/[slug]";
import {
  fetchActiveStoreByDomain,
  resolveStoreListing,
  getPartnerStorefrontDb,
} from "@/lib/partnerStorefront";
import {
  fetchFormattedMedusaProductPage,
  applyPartnerMarkupToVariations,
  fetchCategoryComparablePlans,
} from "@/lib/formatMedusaProductPage";
import { applyPartnerB2BMarkup } from "@/lib/medusaPartnerPricing";

/**
 * 夥伴賣場商品內頁 — 完全沿用主站 eSIM 產品頁 UI，
 * Navbar/Footer 改為 /shop 殼層（shell="shop"）
 */
export default function PartnerProductDetailPage({
  store,
  product,
  variations,
  comparablePlans = [],
}) {
  return (
    <ProductPage
      product={product}
      variations={variations}
      comparablePlans={comparablePlans}
      shell="shop"
      store={store}
    />
  );
}

function parseDaysFromText(text = "") {
  const m = String(text).match(/(\d+)\s*天/);
  return m ? Number(m[1]) : "";
}

function parseDataFromText(text = "") {
  const s = String(text);
  if (/吃到飽|unlimited/i.test(s)) return "無限流量吃到飽";
  const m = s.match(/(\d+(?:\.\d+)?\s*(?:GB|MB|gb|mb)(?:\/日|\/天)?)/);
  return m ? m[1] : "";
}

async function loadLocalProductFallback(listing, store) {
  const p = listing?.products;
  if (!p?.id) return null;

  const db = getPartnerStorefrontDb();
  if (!db) return null;

  let variants = [];
  for (const cols of [
    "id, sku, title, b2b_price, attributes, medusa_variant_id",
    "id, sku, title, b2b_price, attributes",
    "id, sku, b2b_price, attributes",
  ]) {
    const { data, error } = await db
      .from("product_variations")
      .select(cols)
      .eq("product_id", p.id);
    if (!error) {
      variants = data || [];
      break;
    }
    if (!/column|does not exist|schema cache/i.test(error.message || "")) {
      console.warn("[loadLocalProductFallback]", error.message);
      break;
    }
  }

  const customPrices = listing.custom_prices || {};

  const variationsRaw = (variants || []).map((v) => {
    const attrs = v.attributes || {};
    const apiCost = Number(v.b2b_price) || 0;
    const cost = applyPartnerB2BMarkup(apiCost);
    const title = v.title || p.name || "";
    return {
      id: String(
        v.medusa_variant_id || attrs.medusa_variant_id || v.id,
      ),
      local_id: v.id,
      medusa_variant_id: v.medusa_variant_id || attrs.medusa_variant_id || null,
      title,
      sku: v.sku || "",
      price: cost,
      original_price: cost,
      retail_price: cost,
      b2b_price: cost,
      plan_id: attrs.plan_id || "",
      attributes: {
        telecom: attrs.telecom || attrs.電信商 || "預設電信",
        days: attrs.days || attrs.天數 || parseDaysFromText(title) || "",
        data_amount:
          attrs.data_amount ||
          attrs.data ||
          attrs.數據量 ||
          parseDataFromText(title) ||
          "",
      },
      tags: [],
    };
  });

  const variations = applyPartnerMarkupToVariations(variationsRaw, {
    markupRate: store.markup_rate,
    markupMode: store.markup_mode || "percent",
    markupFixed: Number(store.markup_fixed) || 0,
    customPrices,
  });

  return {
    product: {
      id: String(p.id),
      name: p.name,
      slug: p.handle || String(p.id),
      description: p.description || "",
      detailed_content: "",
      detailed_content_by_carrier: {},
      usage_content_by_carrier: {},
      faq_content_by_carrier: {},
      promo_offer_by_carrier: {},
      key_features_by_carrier: {},
      carrier_specs_by_carrier: {},
      hot_sale_telecoms: [],
      overview_notices_by_carrier: {},
      image_url: p.image_url || null,
      image_urls: p.image_url ? [p.image_url] : [],
      price: variations[0]?.price || null,
    },
    variations,
  };
}

function inferCategoryHandleFromProduct(product) {
  const s = `${product?.name || ""} ${product?.slug || ""}`;
  // 香港須在 china 之前（CSL / China Telecom HK）
  if (/香港|hong.?kong|\bhk\b/i.test(s)) return "hongkong";
  if (/中國|china/i.test(s)) return "china";
  if (/日本|japan/i.test(s)) return "japan";
  if (/韓國|korea/i.test(s)) return "korea";
  if (/泰國|thailand/i.test(s)) return "thailand";
  if (/歐洲|europe/i.test(s)) return "europe";
  if (/美國|usa|united.?states/i.test(s)) return "usa";
  return null;
}

function isNumericLocalId(value) {
  return /^\d+$/.test(String(value || ""));
}

export async function getServerSideProps(context) {
  const { partnerSlug, productId } = context.params;
  const rawKey = String(productId || "").trim();

  try {
    const store = await fetchActiveStoreByDomain(partnerSlug);
    if (!store) return { notFound: true };

    const listing = await resolveStoreListing(store, rawKey);

    let medusaId =
      listing?.medusa_product_id ||
      listing?.products?.medusa_product_id ||
      (String(rawKey).startsWith("prod_") ? rawKey : null);

    let handle =
      listing?.products?.handle ||
      (!String(rawKey).startsWith("prod_") && !isNumericLocalId(rawKey)
        ? rawKey
        : null);

    // 補抓 products 上可能有的 medusa／handle（select 分層時可能沒 join 到）
    if (listing?.product_id && (!medusaId || !handle)) {
      const db = getPartnerStorefrontDb();
      if (db) {
        const tries = [
          "handle, medusa_product_id, name",
          "medusa_product_id, name",
          "name",
        ];
        for (const cols of tries) {
          const { data: prod, error } = await db
            .from("products")
            .select(cols)
            .eq("id", listing.product_id)
            .maybeSingle();
          if (error) {
            if (/column|does not exist|schema cache/i.test(error.message || "")) {
              continue;
            }
            break;
          }
          if (prod) {
            handle = handle || prod.handle || null;
            medusaId = medusaId || prod.medusa_product_id || null;
          }
          break;
        }
      }
    }

    let formatted = null;
    let usedMedusa = false;

    // 與主站一致：優先 handle，再 medusa id
    if (handle) {
      try {
        formatted = await fetchFormattedMedusaProductPage({ handle });
        usedMedusa = Boolean(formatted);
      } catch (err) {
        console.warn("[partner product] medusa handle fetch failed", err.message);
      }
    }
    if (!formatted && medusaId) {
      try {
        formatted = await fetchFormattedMedusaProductPage({ id: medusaId });
        usedMedusa = Boolean(formatted);
      } catch (err) {
        console.warn("[partner product] medusa id fetch failed", err.message);
      }
    }
    if (!formatted && listing) {
      // 主站已下架／刪除時 Store API 會失敗；禁止落到本地快照繼續賣
      if (medusaId || handle) {
        console.warn(
          "[partner product] Medusa unavailable — block local fallback",
          { medusaId, handle, store: store.domain },
        );
        return { notFound: true };
      }
      formatted = await loadLocalProductFallback(listing, store);
    }

    if (!formatted?.product) {
      return { notFound: true };
    }

    // 舊連結 /p/{domain}/5/ → 導向正確 handle
    const canonicalHandle = formatted.product.slug;
    if (
      canonicalHandle &&
      rawKey !== canonicalHandle &&
      (isNumericLocalId(rawKey) ||
        (String(rawKey).startsWith("prod_") && rawKey !== formatted.product.id))
    ) {
      return {
        redirect: {
          destination: `/p/${partnerSlug}/${encodeURIComponent(canonicalHandle)}/`,
          permanent: false,
        },
      };
    }

    const variations = usedMedusa
      ? applyPartnerMarkupToVariations(formatted.variations, {
          markupRate: store.markup_rate,
          markupMode: store.markup_mode || "percent",
          markupFixed: Number(store.markup_fixed) || 0,
          customPrices: listing?.custom_prices || {},
        })
      : formatted.variations;

    let comparablePlans = [];
    const categoryHandle = inferCategoryHandleFromProduct(formatted.product);
    if (categoryHandle && usedMedusa) {
      try {
        const rawPlans = await fetchCategoryComparablePlans({
          categoryHandle,
          currentHandle: formatted.product.slug,
        });
        comparablePlans = applyPartnerMarkupToVariations(rawPlans, {
          markupRate: store.markup_rate,
          markupMode: store.markup_mode || "percent",
          markupFixed: Number(store.markup_fixed) || 0,
          customPrices: listing?.custom_prices || {},
        });
      } catch (err) {
        console.warn("[partner product] comparable plans failed", err.message);
      }
    }

    return {
      props: {
        store,
        product: formatted.product,
        variations,
        comparablePlans,
      },
    };
  } catch (err) {
    console.error("[partner product SSR]", err);
    return { notFound: true };
  }
}
