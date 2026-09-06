/**
 * POST /api/payment-care
 * 前台放棄／失敗頁：只傳 orderNo（不帶 email），由 Medusa 查單後寄關懷信。
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const orderNo = String(req.body?.orderNo || "").trim();
  if (!orderNo) {
    return res.status(400).json({ success: false, message: "缺少 orderNo" });
  }

  const MEDUSA_URL = (
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  ).replace(/\/$/, "");
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

  try {
    const response = await fetch(`${MEDUSA_URL}/payment-care`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(publishableKey
          ? { "x-publishable-api-key": publishableKey }
          : {}),
      },
      body: JSON.stringify({
        orderNo,
        reason: String(req.body?.reason || "client_unpaid").trim(),
        method: String(req.body?.method || "").trim(),
        message: String(req.body?.message || "").trim(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    return res.status(response.ok ? 200 : response.status).json({
      success: Boolean(response.ok && data?.success !== false),
      ...data,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "無法連線後端",
    });
  }
}
