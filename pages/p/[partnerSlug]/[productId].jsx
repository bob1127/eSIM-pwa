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

async function loadLocalProductFallback(listing, store) {
  const p = listing?.products;
  if (!p?.id) return null;

  const db = getPartnerStorefrontDb();
  if (!db) return null;

  const { data: variants } = await db
    .from("product_variations")
    .select("id, sku, title, b2b_price, attributes")
    .eq("product_id", p.id);

  const markup = Number(store.markup_rate) || 0;
  const customPrices = listing.custom_prices || {};

  const variations = (variants || []).map((v) => {
    const attrs = v.attributes || {};
    const retail = Number(v.b2b_price) || 0;
    const custom = customPrices[v.id];
    const price =
      custom !== undefined && custom !== null
        ? Math.round(Number(custom))
        : Math.round(retail * (1 + markup / 100));
    return {
      id: String(v.id),
      title: v.title || p.name,
      sku: v.sku || "",
      price,
      original_price: retail,
      plan_id: attrs.plan_id || "",
      attributes: {
        telecom: attrs.telecom || attrs.電信商 || "預設電信",
        days: attrs.days || attrs.天數 || "",
        data_amount: attrs.data_amount || attrs.data || attrs.數據量 || "",
      },
      tags: [],
    };
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
  if (/中國|china/i.test(s)) return "china";
  if (/日本|japan/i.test(s)) return "japan";
  if (/韓國|korea/i.test(s)) return "korea";
  if (/香港|hong.?kong|\bhk\b/i.test(s)) return "hong-kong";
  if (/泰國|thailand/i.test(s)) return "thailand";
  if (/歐洲|europe/i.test(s)) return "europe";
  if (/美國|usa|united.?states/i.test(s)) return "usa";
  return null;
}

export async function getServerSideProps(context) {
  const { partnerSlug, productId } = context.params;

  try {
    const store = await fetchActiveStoreByDomain(partnerSlug);
    if (!store) return { notFound: true };

    const listing = await resolveStoreListing(store, productId);

    const medusaId =
      listing?.medusa_product_id ||
      listing?.products?.medusa_product_id ||
      (String(productId).startsWith("prod_") ? String(productId) : null);
    const handle =
      listing?.products?.handle ||
      (!String(productId).startsWith("prod_") &&
      !/^\d+$/.test(String(productId))
        ? String(productId)
        : null);

    let formatted = null;
    let usedMedusa = false;

    if (medusaId) {
      try {
        formatted = await fetchFormattedMedusaProductPage({ id: medusaId });
        usedMedusa = Boolean(formatted);
      } catch (err) {
        console.warn("[partner product] medusa id fetch failed", err.message);
      }
    }
    if (!formatted && handle) {
      try {
        formatted = await fetchFormattedMedusaProductPage({ handle });
        usedMedusa = Boolean(formatted);
      } catch (err) {
        console.warn("[partner product] medusa handle fetch failed", err.message);
      }
    }
    if (!formatted && listing) {
      formatted = await loadLocalProductFallback(listing, store);
    }

    if (!formatted?.product) {
      return { notFound: true };
    }

    const variations = usedMedusa
      ? applyPartnerMarkupToVariations(formatted.variations, {
          markupRate: store.markup_rate,
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
