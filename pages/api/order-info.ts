// pages/api/order-info.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

// WooCommerce 認證資料
const WOOCOMMERCE_API_URL = "https://inf.fjg.mybluehost.me/website_d17cf1ea/wp-json/wc/v3/orders";
const CONSUMER_KEY = "ck_ef9f4379124655ad946616864633bd37e3174bc2";
const CONSUMER_SECRET = "cs_3da596e08887d9c7ccbf8ee15213f83866c160d4";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { order_no } = req.query;

  if (typeof order_no !== "string") {
    return res.status(400).json({ error: "Missing or invalid order_no" });
  }

  try {
    // 🔍 改為用 meta_key/meta_value 查詢，而非 search
    const { data: orders } = await axios.get(WOOCOMMERCE_API_URL, {
      auth: {
        username: CONSUMER_KEY,
        password: CONSUMER_SECRET,
      },
      params: {
        meta_key: "newebpay_order_no",
        meta_value: order_no,
      },
    });

    const order = orders[0];

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const qrcodeMeta = order.meta_data.find((meta: any) => meta.key === "esim_qrcode");

    return res.status(200).json({
      qrcode: qrcodeMeta?.value || null,
    });
  } catch (error) {
    console.error("❌ 查詢訂單失敗：", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
