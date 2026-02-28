import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

// WooCommerce API
const WOOCOMMERCE_API_URL =
  "https://inf.fjg.mybluehost.me/website_d17cf1ea/wp-json/wc/v3/orders";
const CONSUMER_KEY = "ck_ef9f4379124655ad946616864633bd37e3174bc2";
const CONSUMER_SECRET = "cs_3da596e08887d9c7ccbf8ee15213f83866c160d4";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { orderNo } = req.query;

  if (!orderNo || typeof orderNo !== "string") {
    return res.status(400).json({ error: "缺少 orderNo 參數" });
  }

  try {
    const { data: orders } = await axios.get(WOOCOMMERCE_API_URL, {
      auth: {
        username: CONSUMER_KEY,
        password: CONSUMER_SECRET,
      },
      params: {
        per_page: 20,
        orderby: "date",
        order: "desc",
      },
    });

    const order = orders.find((o: any) =>
      o.meta_data?.some(
        (meta: any) => meta.key === "newebpay_order_no" && meta.value === orderNo
      )
    );

    if (!order) {
      return res.status(404).json({ error: "找不到訂單" });
    }

    // 從 meta_data 抓取 QRCode
    const qrcodeMeta = order.meta_data.find(
      (meta: any) => meta.key === "esim_qrcode"
    );

    res.status(200).json({
      orderNo,
      status: order.status,
      payment_method_title: order.payment_method_title,
      date_paid: order.date_paid,
      qrcode: qrcodeMeta?.value || null,
    });
  } catch (error: any) {
    console.error("查詢失敗:", error.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
}
