export const config = {
  runtime: "edge",
};

function getWooCreds() {
  const baseUrl = (
    process.env.WORDPRESS_URL ||
    process.env.WC_API_BASE ||
    process.env.NEXT_PUBLIC_WP_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
  const consumerKey =
    process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY || "";
  const consumerSecret =
    process.env.WOOCOMMERCE_CONSUMER_SECRET ||
    process.env.WC_CONSUMER_SECRET ||
    "";
  return { baseUrl, consumerKey, consumerSecret };
}

export default async function handler(req) {
  try {
    const { baseUrl, consumerKey, consumerSecret } = getWooCreds();

    if (!baseUrl || !consumerKey || !consumerSecret) {
      return new Response(JSON.stringify({ error: "環境變數未正確配置" }), {
        status: 500,
      });
    }

    const url = new URL(req.url);
    const slug = url.searchParams.get("category");

    if (!slug) {
      return new Response(
        JSON.stringify({ error: "Category slug is required" }),
        { status: 400 },
      );
    }

    const timestamp = Date.now();
    const categoriesUrl = `${baseUrl}/wp-json/wc/v3/products/categories?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
    const categoriesResponse = await fetch(categoriesUrl);

    if (!categoriesResponse.ok) {
      return new Response(
        JSON.stringify({ error: "獲取分類資料失敗" }),
        { status: 500 },
      );
    }

    const categories = await categoriesResponse.json();
    const category = categories.find((cat) => cat.slug === slug);

    if (!category) {
      return new Response(
        JSON.stringify({ error: `未找到分類 "${slug}"` }),
        { status: 404 },
      );
    }

    const productsUrl = `${baseUrl}/wp-json/wc/v3/products?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&category=${category.id}&timestamp=${timestamp}&per_page=100`;
    const response = await fetch(productsUrl);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "請求產品資料失敗" }),
        { status: 500 },
      );
    }

    const products = await response.json();
    return new Response(JSON.stringify(products), { status: 200 });
  } catch (error) {
    console.error("[api/products]", error?.message || error);
    return new Response(
      JSON.stringify({ error: "獲取產品失敗" }),
      { status: 500 },
    );
  }
}
