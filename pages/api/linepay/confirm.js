export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method Not Allowed" });

  const { transactionId, orderNo } = req.body || {};
  if (!transactionId || !orderNo) {
    return res.status(400).json({ success: false, message: "缺少 transactionId 或 orderNo" });
  }

  const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

  try {
    const response = await fetch(`${MEDUSA_URL}/linepay/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, orderNo }),
    });

    const data = await response.json().catch(() => ({}));
    return res.status(response.ok ? 200 : 400).json(data);
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "LINE Pay confirm 失敗",
    });
  }
}
