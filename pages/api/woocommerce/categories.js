import axios from "axios";
import { getWooCommerceCredentials } from "../../../lib/serverEnv";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { baseUrl, consumerKey, consumerSecret } = getWooCommerceCredentials();
    const { slug } = req.query;

    if (!baseUrl || !consumerKey || !consumerSecret) {
      return res.status(500).json({ error: "WooCommerce 伺服器憑證未設定" });
    }

    if (!slug) {
      return res.status(400).json({ error: "Missing category slug in the request" });
    }

    const categoryUrl = `${baseUrl}/wp-json/wc/v3/products/categories?slug=${encodeURIComponent(
      String(slug),
    )}&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;

    const categoryResponse = await axios.get(categoryUrl);

    if (!categoryResponse.data?.length) {
      return res.status(404).json({ error: `Category with slug ${slug} not found` });
    }

    const categoryId = categoryResponse.data[0].id;
    let allProducts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const productUrl = `${baseUrl}/wp-json/wc/v3/products?category=${categoryId}&per_page=100&page=${page}&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
      const productResponse = await axios.get(productUrl);

      if (productResponse.data.length > 0) {
        allProducts = [...allProducts, ...productResponse.data];
        page++;
      } else {
        hasMore = false;
      }
    }

    return res.status(200).json(allProducts);
  } catch (error) {
    console.error("[woocommerce/categories]", error?.message || error);
    return res.status(500).json({ error: "Failed to fetch products" });
  }
}
