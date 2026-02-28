// /pages/api/Cart/add.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { productId, quantity } = req.body;

  // 確保傳入的 productId 和 quantity
  if (!productId || !quantity) {
    return res.status(400).json({ error: "Product ID and quantity are required" });
  }

  try {
    const response = await fetch("https://starislandbaby.com/test/wp-json/wc/store/Cart/add-item", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // 讓請求攜帶 Cookies，確保購物車與前端同步
      body: JSON.stringify({
        id: productId,
        quantity: quantity,
      }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
}
