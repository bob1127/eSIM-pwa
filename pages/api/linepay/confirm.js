export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  // 強制字串：LINE transactionId 為 19 位，不可被 JSON Number 化
  const transactionId = String(req.body?.transactionId || "").trim();
  const orderNo = String(req.body?.orderNo || "").trim();
  if (!transactionId || !orderNo) {
    return res.status(400).json({
      success: false,
      message: "缺少 transactionId 或 orderNo",
    });
  }

  const MEDUSA_URL = (
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  ).replace(/\/$/, "");
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

  try {
    const response = await fetch(`${MEDUSA_URL}/linepay/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(publishableKey
          ? { "x-publishable-api-key": publishableKey }
          : {}),
      },
      body: JSON.stringify({ transactionId, orderNo }),
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return res.status(502).json({
        success: false,
        message: `Backend confirm 回傳非 JSON（HTTP ${response.status}）`,
        detail: String(text || "").slice(0, 300),
      });
    }

    if (!response.ok) {
      return res.status(response.status >= 400 ? response.status : 400).json({
        success: false,
        message:
          data?.message ||
          data?.error ||
          `LINE Pay confirm 失敗（HTTP ${response.status}）`,
        detail: data?.detail ?? data,
      });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "LINE Pay confirm 失敗（無法連線 backend）",
    });
  }
}
