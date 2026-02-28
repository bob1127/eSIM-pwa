import type { NextApiRequest, NextApiResponse } from "next";
import axios, { AxiosError } from "axios";

// WooCommerce 設定
const WOOCOMMERCE_API_BASE =
  "https://inf.fjg.mybluehost.me/website_d17cf1ea/wp-json/wc/v3";
const CONSUMER_KEY = "ck_ef9f4379124655ad946616864633bd37e3174bc2";
const CONSUMER_SECRET = "cs_3da596e08887d9c7ccbf8ee15213f83866c160d4";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const { order_no, email, items, total_price, "order-id": orderIdRaw } = req.body;

    if (!order_no || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "缺少必要欄位或 items 格式錯誤" });
    }

    // ✅ 檢查是否已存在同一 shopee 訂單編號
    const existingOrders = await axios.get(`${WOOCOMMERCE_API_BASE}/orders`, {
      auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
      params: {
        per_page: 1,
        search: order_no,
      },
    });

    const found = existingOrders.data.find((order: any) =>
      order.meta_data?.some(
        (meta: any) => meta.key === "shopee_order_no" && meta.value === order_no
      )
    );

    if (found) {
      return res.status(200).json({ success: true, message: "訂單已存在", order_id: found.id });
    }

    // ✅ 自行建立 line_items（不依賴 WooCommerce 商品）
    const line_items = items.map((item: any) => {
      const name = item.name || item.sku || "未命名商品";
      const sku = item.sku && item.sku.trim() !== "" ? item.sku : `CUSTOM-${name.slice(0, 10)}`;
      const price = parseFloat(item.price || "0");
      const quantity = parseInt(item.quantity || "1");

      return {
        name,
        sku,
        quantity,
        price: price.toFixed(2),
        total: (price * quantity).toFixed(2),
      };
    });

    const wooPayload = {
      payment_method: "shopee",
      payment_method_title: "蝦皮訂單",
      set_paid: true,
      billing: {
        first_name: order_no,
        email: email || "no@email.com",
        phone: "0000000000",
      },
      line_items,
      meta_data: [
        { key: "shopee_order_no", value: order_no },
        { key: "shopee_order_id", value: orderIdRaw || "" },
        { key: "source", value: "shopee" },
      ],
    };

    const wcRes = await axios.post(`${WOOCOMMERCE_API_BASE}/orders`, wooPayload, {
      auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
    });

    return res.status(200).json({ success: true, order_id: wcRes.data.id });
  } catch (err) {
    const error = err as AxiosError;
    const details = error.response?.data || error.message;
    console.error("❌ WooCommerce 訂單建立失敗：", details);
    return res.status(500).json({ error: "WooCommerce 訂單建立失敗", details });
  }
}
