/**
 * GET /api/linepay/cancel?orderNo=C…
 * LINE Pay 取消付款：觸發關懷信後導回購物車。
 */
export default async function handler(req, res) {
  const raw = req.query?.orderNo;
  const orderNo = String(Array.isArray(raw) ? raw[0] : raw || "").trim();

  const MEDUSA_URL = (
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  ).replace(/\/$/, "");
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

  if (orderNo) {
    try {
      await fetch(`${MEDUSA_URL}/payment-care`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(publishableKey
            ? { "x-publishable-api-key": publishableKey }
            : {}),
        },
        body: JSON.stringify({
          orderNo,
          reason: "linepay_cancel",
          method: "linepay",
          message: "cancel",
        }),
      });
    } catch (e) {
      console.warn("[api/linepay/cancel]", e?.message || e);
    }
  }

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.jeko-esim.com.tw";
  return res.redirect(302, `${site}/Cart?linepay=cancel&step=1`);
}
