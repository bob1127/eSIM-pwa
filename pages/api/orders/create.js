// 檔案位置: esim-store-front/pages/api/orders/create.js
//
// 這一步只負責「把地址/運費寫進 Medusa 購物車」，回傳的 orderId 其實是
// cartId（欄位名稱保留 orderId 是為了跟舊版前端呼叫的資料形狀相容，不用改
// shop.jsx / CheckoutForm.jsx）。真正的「建立付款 session + 完成訂單 + 產生
// 藍新表單」都移到 esim-backend 的 /store/newebpay-checkout 處理，
// 詳見 pages/api/newebpay-generate-form.ts。

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method Not Allowed" });

  const { cartId, orderInfo } = req.body;
  if (!cartId) return res.status(400).json({ success: false, message: "缺少購物車 ID" });

  const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  const headers = { "Content-Type": "application/json", ...(PUBLISHABLE_KEY && { "x-publishable-api-key": PUBLISHABLE_KEY }) };

  const parseMedusaError = (data) => {
    if (!data) return "未知錯誤";
    if (data.message) return data.message;
    if (Array.isArray(data.errors) && data.errors[0]?.message) return data.errors[0].message;
    return JSON.stringify(data);
  };

  const fetchMedusa = async (stepName, url, options = {}) => {
    const response = await fetch(url, options);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch { throw new Error(`[${stepName}] Medusa 回傳格式錯誤。`); }

    if (!response.ok) {
      const detail = parseMedusaError(data);
      const err = new Error(`[${stepName}] 失敗: ${detail}`);
      if (detail.toLowerCase().includes("already completed") || detail.includes("已完成")) {
        err.code = "CART_COMPLETED";
      }
      throw err;
    }
    return data;
  };

  try {
    console.log(`\n==========================================`);
    console.log(`[Next.js API] 🚀 開始處理結帳流程（地址/運費），Cart ID: ${cartId}`);

    const cartCheck = await fetchMedusa("取得購物車", `${MEDUSA_URL}/store/carts/${cartId}`, { headers });
    if (cartCheck.cart?.completed_at) {
      return res.status(400).json({
        success: false,
        code: "CART_COMPLETED",
        message: "此購物車已完成結帳，請重新整理頁面後再試（系統會自動建立新購物車）。",
      });
    }

    const addressPayload = {
      first_name: orderInfo.name,
      last_name: orderInfo.name,
      address_1: orderInfo.address,
      city: orderInfo.city || "Taipei",
      country_code: "tw",
      postal_code: orderInfo.postalCode || "000",
      phone: orderInfo.phone,
    };

    console.log(`[Next.js API] 📍 步驟 1: 更新地址...`);
    await fetchMedusa("更新地址", `${MEDUSA_URL}/store/carts/${cartId}`, { method: "POST", headers, body: JSON.stringify({ email: orderInfo.email, shipping_address: addressPayload, billing_address: addressPayload }) });

    console.log(`[Next.js API] 🚚 步驟 2: 抓取並設定運費方案...`);
    const shipOptionsData = await fetchMedusa("取得運費選項", `${MEDUSA_URL}/store/shipping-options?cart_id=${cartId}`, { headers });
    if (!shipOptionsData.shipping_options || shipOptionsData.shipping_options.length === 0) throw new Error("無可用運費");
    await fetchMedusa("套用運費", `${MEDUSA_URL}/store/carts/${cartId}/shipping-methods`, { method: "POST", headers, body: JSON.stringify({ option_id: shipOptionsData.shipping_options[0].id }) });

    console.log(`[Next.js API] 💰 步驟 3: 取得最終金額...`);
    const cartData = await fetchMedusa("取得購物車", `${MEDUSA_URL}/store/carts/${cartId}`, { headers });
    const finalAmount = cartData.cart.total || 0;

    console.log(`[Next.js API] ✅ 地址/運費設定完成，交給 /api/newebpay-generate-form 建單+產生付款表單。`);

    // orderId 這裡等於 cartId，藍新表單那一步（呼叫 esim-backend /store/newebpay-checkout）
    // 才會真正把 cart complete 成 Medusa order。
    return res.status(200).json({ success: true, orderId: cartId, amount: finalAmount });

  } catch (error) {
    console.error(`\n[Next.js API] 💥 結帳中斷: ${error.message}\n`);
    const status = error.code === "CART_COMPLETED" ? 400 : 500;
    return res.status(status).json({
      success: false,
      code: error.code || "CHECKOUT_ERROR",
      message: error.message,
    });
  }
}
