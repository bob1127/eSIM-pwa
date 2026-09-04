/**
 * Navbar 精選國家分類：同源代理 Medusa，避免 localhost:3001 CORS 被擋
 * 只回傳分類＋精簡產品統計，避免 API 超過 4MB
 */
import { filterLeafCategoriesForNav } from "@/lib/categoryNavFilter";

const backendUrl =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

function medusaHeaders() {
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  return {
    "Content-Type": "application/json",
    ...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
  };
}

function pickMinPrice(product) {
  const variant = product?.variants?.[0];
  if (variant?.calculated_price?.calculated_amount != null) {
    return variant.calculated_price.calculated_amount;
  }
  if (variant?.prices?.[0]?.amount != null) {
    return variant.prices[0].amount;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const headers = medusaHeaders();

    const catRes = await fetch(`${backendUrl}/store/product-categories`, {
      method: "GET",
      headers,
    });

    if (!catRes.ok) {
      const text = await catRes.text().catch(() => "");
      return res.status(catRes.status).json({
        error: "Failed to fetch product categories",
        details: text.slice(0, 300),
      });
    }

    const catData = await catRes.json();
    const product_categories = filterLeafCategoriesForNav(
      catData.product_categories || [],
    );

    // 精簡產品：只留 id／categories／最低價，給 Navbar 統計用
    let products = [];
    try {
      const prodRes = await fetch(
        `${backendUrl}/store/products?limit=100&fields=id,*categories,*variants.calculated_price,*variants.prices`,
        { method: "GET", headers },
      );
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        products = (prodData.products || []).map((p) => ({
          id: p.id,
          categories: (p.categories || []).map((c) => ({ id: c.id })),
          variants: [
            {
              calculated_price: {
                calculated_amount: pickMinPrice(p),
              },
            },
          ],
        }));
      }
    } catch (prodErr) {
      console.warn(
        "[api/medusa/navbar-categories] products fetch skipped:",
        prodErr?.message || prodErr,
      );
    }

    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({
      product_categories,
      products,
      count: catData.count ?? product_categories.length,
    });
  } catch (error) {
    console.error("[api/medusa/navbar-categories]", error);
    return res.status(500).json({
      error: "Failed to fetch navbar categories",
      details: error?.message || String(error),
    });
  }
}
