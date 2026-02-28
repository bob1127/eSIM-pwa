import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  try {
    const { orderInfo, totalPrice, items } = req.body;
    
    if (!orderInfo || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: "缺少必要的訂單資訊" });
    }

    // 🚀 關鍵修正：完全對齊你的 Supabase 截圖欄位名稱
    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          customer_name: orderInfo.name,     
          customer_email: orderInfo.email,   
          customer_phone: orderInfo.phone,   
          total_price: totalPrice,           // 👈 配合你的資料表改為 total_price
          items: items,                      // 👈 你剛剛在第一步新增的欄位
          status: "pending", 
          payment_method: orderInfo.paymentMethod || "Credit",
        }
      ])
      .select("id")
      .single();

    if (error) {
      console.error("❌ [Supabase 寫入失敗]:", JSON.stringify(error, null, 2));
      return res.status(500).json({ success: false, message: `寫入失敗: ${error.message}` });
    }

    console.log("✅ [Supabase 寫入成功] 取得 Order ID:", data.id);
    return res.status(200).json({ success: true, orderId: data.id });
    
  } catch (error) {
    console.error("🔥 [API 發生未預期錯誤]:", error);
    return res.status(500).json({ success: false, message: "伺服器內部錯誤" });
  }
}