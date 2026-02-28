import axios from "axios";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { NEXT_PUBLIC_WP_API_BASE_URL, NEXT_PUBLIC_WC_CONSUMER_KEY, NEXT_PUBLIC_WC_CONSUMER_SECRET } = process.env;

      // 获取请求中的slug参数
      const { slug } = req.query;

      console.log("Consumer Key:", NEXT_PUBLIC_WC_CONSUMER_KEY);
      console.log("Consumer Secret:", NEXT_PUBLIC_WC_CONSUMER_SECRET);

      if (!slug) {
        return res.status(400).json({ error: "Missing category slug in the request" });
      }

      // 获取分类 ID
      const categoryUrl = `${NEXT_PUBLIC_WP_API_BASE_URL}wp-json/wc/v3/products/categories?slug=${slug}&consumer_key=${NEXT_PUBLIC_WC_CONSUMER_KEY}&consumer_secret=${NEXT_PUBLIC_WC_CONSUMER_SECRET}`;
      console.log("Category Request URL:", categoryUrl);

      const categoryResponse = await axios.get(categoryUrl);

      if (categoryResponse.data.length === 0) {
        return res.status(404).json({ error: `Category with slug ${slug} not found` });
      }

      const categoryId = categoryResponse.data[0].id;
      console.log("Category ID:", categoryId);

      // 通过分页获取所有产品
      let allProducts = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const productUrl = `${NEXT_PUBLIC_WP_API_BASE_URL}wp-json/wc/v3/products?category=${categoryId}&per_page=100&page=${page}&consumer_key=${NEXT_PUBLIC_WC_CONSUMER_KEY}&consumer_secret=${NEXT_PUBLIC_WC_CONSUMER_SECRET}`;
        console.log("Product Request URL:", productUrl);

        const productResponse = await axios.get(productUrl);

        if (productResponse.data.length > 0) {
          allProducts = [...allProducts, ...productResponse.data];
          page++; // 取下一页
        } else {
          hasMore = false; // 没有更多产品时停止
        }
      }

      console.log("Fetched Products:", allProducts.length);

      // 返回所有产品数据
      res.status(200).json(allProducts);

    } catch (error) {
      console.error("Error fetching products by category slug:", error);
      res.status(500).json({ error: "Failed to fetch products by category slug" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
