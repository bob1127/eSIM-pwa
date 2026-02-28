export default async function handler(req, res) {
  const { method } = req;

  const API_BASE = process.env.WC_API_BASE;
  const consumerKey = process.env.WC_CONSUMER_KEY;
  const consumerSecret = process.env.WC_CONSUMER_SECRET;

  if (!API_BASE || !consumerKey || !consumerSecret) {
    return res.status(500).json({ error: "API credentials missing" });
  }

  const url = `https://starislandbaby.com/test/wp-json/wc/store/Cart`;
  const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      credentials: "include",
    });

    const text = await response.text(); // 先轉為文字，確保不是 HTML
    try {
      const data = JSON.parse(text); // 嘗試轉換為 JSON
      return res.status(response.status).json(data);
    } catch (jsonError) {
      console.error("WooCommerce API 回應非 JSON:", text);
      return res.status(500).json({ error: "Invalid JSON response", details: text });
    }
  } catch (error) {
    console.error("API 錯誤:", error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
}
