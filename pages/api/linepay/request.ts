import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method Not Allowed" })

  const { cartId, orderInfo } = req.body || {}
  if (!cartId) return res.status(400).json({ success: false, message: "缺少 cartId" })

  const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  try {
    const backendRes = await fetch(`${MEDUSA_URL}/store/linepay-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(PUBLISHABLE_KEY && { "x-publishable-api-key": PUBLISHABLE_KEY }),
      },
      body: JSON.stringify({
        cart_id: cartId,
        orderInfo: orderInfo || {},
      }),
    })

    const data = await backendRes.json().catch(() => ({}))
    if (!backendRes.ok || !data?.success || !data?.paymentUrl) {
      return res.status(backendRes.status || 400).json({
        success: false,
        message: data?.message || "LINE Pay 建單失敗",
        detail: data,
      })
    }

    return res.status(200).json(data)
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "LINE Pay 建單失敗",
    })
  }
}
