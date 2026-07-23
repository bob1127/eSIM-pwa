// pages/api/newebpay-generate-form.ts
//
// 已改為薄代理：真正的「建立付款 session、完成訂單、組 TradeInfo/TradeSha」
// 全部搬到 esim-backend 的 /store/newebpay-checkout（藍新 HashKey/HashIV
// 只存在後端環境變數，前台完全不會碰到）。
//
// 保留原本的路徑與 request/response 格式（{totalPrice, orderInfo, customOrderId}
// → text/html 自動送出表單），是為了不用改 shop.jsx / checkout/payment.jsx /
// CheckoutForm.jsx 的呼叫邏輯。這裡的 customOrderId 現在是 Medusa cart_id
// （見 pages/api/orders/create.js）。
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { totalPrice, orderInfo, customOrderId } = req.body as {
    totalPrice?: number | string;
    orderInfo?: any;
    customOrderId?: string;
  };

  if (!customOrderId) {
    return res.status(400).json({ error: "缺少購物車 ID" });
  }

  const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

  try {
    const backendRes = await fetch(`${MEDUSA_URL}/store/newebpay-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(PUBLISHABLE_KEY && { "x-publishable-api-key": PUBLISHABLE_KEY }),
      },
      body: JSON.stringify({
        cart_id: customOrderId,
        orderInfo: { ...orderInfo, totalPrice },
      }),
    });

    const contentType = backendRes.headers.get("content-type") || "";

    if (!backendRes.ok) {
      const errText = contentType.includes("application/json")
        ? JSON.stringify(await backendRes.json().catch(() => ({})))
        : await backendRes.text();
      return res.status(backendRes.status).end(errText || "無法建立藍新付款表單");
    }

    const html = await backendRes.text();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  } catch (err: any) {
    console.error("[newebpay-generate-form] 呼叫後端失敗:", err?.message || err);
    return res.status(500).end("無法連線至付款伺服器，請稍後再試。");
  }
}
