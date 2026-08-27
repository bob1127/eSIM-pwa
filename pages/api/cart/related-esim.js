/**
 * GET /api/cart/related-esim?categories=japan,china&exclude=slug-a,slug-b
 * 購物車頁：同分類／熱門 eSIM 推薦
 */
import {
  canonicalCategoryHandle,
  categoryHandlesForProductFetch,
} from "@/lib/categoryAliases";
import { resolveProductListingImage } from "@/lib/resolveProductListingImage";
import { stripInternalMarginFromSubtitle } from "@/lib/productSubtitleByCarrier";

const backendUrl =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

const FALLBACK_HANDLES = [
  "japan",
  "korea",
  "thailand",
  "china",
  "hongkong",
  "usa",
  "singapore",
];

function medusaHeaders() {
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  return {
    "Content-Type": "application/json",
    ...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
  };
}

function pickMinPrice(product) {
  const prices = (product?.variants || [])
    .map((v) => {
      if (v?.calculated_price?.calculated_amount != null) {
        return Number(v.calculated_price.calculated_amount);
      }
      const twd = v?.prices?.find(
        (p) =>
          String(p.currency_code || "").toLowerCase() === "twd" ||
          String(p.currency_code || "").toLowerCase() === "ntd",
      );
      if (twd?.amount != null) return Number(twd.amount);
      if (v?.prices?.[0]?.amount != null) return Number(v.prices[0].amount);
      return null;
    })
    .filter((n) => n != null && Number.isFinite(n) && n > 0);
  return prices.length ? Math.min(...prices) : 0;
}

function formatProduct(product) {
  const cat =
    (product.categories || []).find((c) => c?.handle) ||
    product.categories?.[0];
  const categoryHandle = canonicalCategoryHandle(cat?.handle || "product");
  const slug = product.handle || product.id;
  const isTestPlan =
    product.metadata?.microesim_test ||
    product.metadata?.test_plan ||
    String(product.title || "").includes("測試購買");

  return {
    id: product.id,
    name: product.title || "eSIM 方案",
    slug,
    categoryHandle,
    href: `/product/${categoryHandle}/${slug}`,
    image: resolveProductListingImage(product.thumbnail, {
      categorySlug: categoryHandle,
      handle: slug,
      categories: product.categories,
    }),
    minPrice: pickMinPrice(product),
    subtitle: stripInternalMarginFromSubtitle(product.subtitle || ""),
    isTestPlan: !!isTestPlan,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawCategories = String(req.query.categories || "")
    .split(",")
    .map((s) => canonicalCategoryHandle(s.trim()))
    .filter(Boolean);
  const exclude = new Set(
    String(req.query.exclude || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

  const priorityHandles = [
    ...new Set(
      rawCategories.flatMap((h) => categoryHandlesForProductFetch(h)),
    ),
  ];
  const fallbackHandles = FALLBACK_HANDLES.filter(
    (h) => !priorityHandles.includes(h),
  );
  const orderedHandles = [...priorityHandles, ...fallbackHandles];

  try {
    const headers = medusaHeaders();

    const catRes = await fetch(`${backendUrl}/store/product-categories`, {
      headers,
    });
    if (!catRes.ok) {
      return res.status(200).json({ products: [] });
    }
    const catData = await catRes.json();
    const categories = catData.product_categories || [];

    const categoryIds = [];
    for (const handle of orderedHandles) {
      const match = categories.find(
        (c) => canonicalCategoryHandle(c.handle) === handle,
      );
      if (match?.id && !categoryIds.includes(match.id)) {
        categoryIds.push(match.id);
      }
    }

    if (!categoryIds.length) {
      return res.status(200).json({ products: [] });
    }

    let regionId = "";
    try {
      const regionRes = await fetch(`${backendUrl}/store/regions`, { headers });
      if (regionRes.ok) {
        const regionData = await regionRes.json();
        const region =
          regionData.regions?.find(
            (r) => r.currency_code?.toLowerCase() === "twd",
          ) || regionData.regions?.[0];
        regionId = region?.id || "";
      }
    } catch {
      /* ignore */
    }

    const fields =
      "id,title,handle,subtitle,thumbnail,*categories,*variants,*variants.calculated_price,*variants.prices,metadata";
    const query = new URLSearchParams({ fields, limit: "80" });
    for (const id of categoryIds.slice(0, 8)) {
      query.append("category_id[]", id);
    }
    if (regionId) query.set("region_id", regionId);

    const prodRes = await fetch(
      `${backendUrl}/store/products?${query}`,
      { headers },
    );
    if (!prodRes.ok) {
      return res.status(200).json({ products: [] });
    }
    const prodData = await prodRes.json();
    const raw = prodData.products || [];

    const byHandle = new Map();
    raw.forEach((p) => {
      if (!p?.handle || exclude.has(String(p.handle).toLowerCase())) return;
      const formatted = formatProduct(p);
      if (formatted.isTestPlan) return;
      const cats = (p.categories || []).map((c) =>
        canonicalCategoryHandle(c.handle),
      );
      const score = cats.some((c) => priorityHandles.includes(c)) ? 0 : 1;
      const prev = byHandle.get(p.handle);
      if (!prev || score < prev.score) {
        byHandle.set(p.handle, { ...formatted, score });
      }
    });

    const products = [...byHandle.values()]
      .sort((a, b) => a.score - b.score || a.minPrice - b.minPrice)
      .slice(0, 12)
      .map(({ score: _s, ...rest }) => rest);

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=300",
    );
    return res.status(200).json({ products });
  } catch (err) {
    console.warn("[api/cart/related-esim]", err?.message || err);
    return res.status(200).json({ products: [] });
  }
}
