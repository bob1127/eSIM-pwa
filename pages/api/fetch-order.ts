// /pages/api/fetch-order.ts
//
// 改為呼叫 esim-backend 的 /store/newebpay/order-status（Medusa order.metadata
// 為單一事實來源），不再依賴 WooCommerce。回傳格式維持跟舊版一致，/pending
// 與 /thank-you 頁面不用改。
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

  const { orderNo } = req.query as { orderNo?: string };
  if (!orderNo || typeof orderNo !== "string") {
    return res.status(400).json({ error: "缺少訂單編號（orderNo）" });
  }

  const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

  try {
    const backendRes = await fetch(
      `${MEDUSA_URL}/store/newebpay/order-status?orderNo=${encodeURIComponent(orderNo)}`,
      {
        headers: {
          ...(PUBLISHABLE_KEY && { "x-publishable-api-key": PUBLISHABLE_KEY }),
        },
      },
    );

    const data = await backendRes.json().catch(() => ({}));
    return res.status(backendRes.status).json(data);
  } catch (err: any) {
    console.error("❌ [fetch-order] 呼叫後端失敗:", err?.message || err);
    return res.status(500).json({ error: "查詢失敗，請稍後再試", details: err?.message });
  }
}
