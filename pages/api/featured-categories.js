// pages/api/featured-categories.js

const getWooCommerceUrl = (endpoint, params = {}) => {
  const baseUrl = process.env.WORDPRESS_URL;
  const ck = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  const queryString = new URLSearchParams({
    consumer_key: ck,
    consumer_secret: cs,
    ...params,
  }).toString();

  return `${baseUrl}/wp-json/wc/v3/${endpoint}?${queryString}`;
};

export default async function handler(req, res) {
  try {
    const url = getWooCommerceUrl("products/categories", {
      per_page: 100,      // 抓取上限 100 個
      hide_empty: false,  // 強制顯示沒商品的分類
      parent: 0,          // 只抓主分類
    });

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const allCategories = await response.json();

    // 🔥 過濾邏輯：排除「未分類」
    // WooCommerce 的未分類 slug 通常是 "uncategorized" 或中文編碼 "%e6%9c%aa%e5%88%86%e9%a1%9e"
    const filteredCategories = allCategories.filter(cat => {
      const isUncategorized = 
        cat.slug === 'uncategorized' || 
        cat.slug === '%e6%9c%aa%e5%88%86%e9%a1%9e' || // 這是 "未分類" 的 URL 編碼
        cat.name === '未分類';
        
      return !isUncategorized; // 只保留 "不是未分類" 的項目
    });

    // 依照商品數量排序 (多的排前面)
    const sortedCategories = filteredCategories.sort((a, b) => b.count - a.count);

    res.status(200).json(sortedCategories);

  } catch (error) {
    console.error("❌ [API] 失敗:", error);
    res.status(500).json({ error: "Failed to fetch categories", details: error.message });
  }
}