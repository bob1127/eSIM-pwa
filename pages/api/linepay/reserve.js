// /pages/api/linepay/reserve.js
import crypto from "crypto";

const CHANNEL_ID = "2007568484";
const CHANNEL_SECRET = "cb183f20b331f6c246755708eef99437";
// Sandbox 用這個： "https://sandbox-api-pay.line.me"；正式用 "https://api-pay.line.me"
const LINEPAY_BASE = "https://api-pay.line.me";

const roundInt = (n) => Math.round(Number(n) || 0);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

    const { cartItems = [], discount = 0 } = req.body || {};

    // 1) 小計（後端重新計算避免被竄改）
    const subtotal = roundInt(
      cartItems.reduce(
        (s, it) => s + roundInt(it.price) * roundInt(it.quantity || 1),
        0
      )
    );
    const discountAmount = Math.max(0, roundInt(discount));
    const finalAmount = Math.max(1, subtotal - discountAmount); // TWD 金額需為整數且 > 0

    const orderId = `ORDER_${Date.now()}`;

    // 2) 組絕對網址（部署時要是外部可連）
    const xfProto = req.headers["x-forwarded-proto"];
    const xfHost = req.headers["x-forwarded-host"];
    const proto =
      (Array.isArray(xfProto) ? xfProto[0] : xfProto) ||
      (req.headers.referer && String(req.headers.referer).startsWith("https")
        ? "https"
        : "http");
    const host = (Array.isArray(xfHost) ? xfHost[0] : xfHost) || req.headers.host;
    const origin = `${proto}://${host}`;

    // 3) 建立 LINE Pay request body（合併成單一商品，避免負價品項）
    const body = {
      amount: finalAmount,
      currency: "TWD",
      orderId,
      packages: [
        {
          id: `pkg_${Date.now()}`,
          amount: finalAmount,
          name: "汪喵通 eSIM",
          products: [
            { name: "購物車合併品項(含折扣)", quantity: 1, price: finalAmount },
          ],
        },
      ],
     // /pages/api/linepay/reserve.js 裡的 redirectUrls
redirectUrls: {
  confirmUrl: `${origin}/linepay-confirm?orderId=${encodeURIComponent(orderId)}&amount=${finalAmount}`,
  cancelUrl: `${origin}/checkout?linepay=cancel`,
},

    };

    // 4) 簽章（/v3/payments/request）
    const uri = "/v3/payments/request";
    const rawBody = JSON.stringify(body);
    const nonce = crypto.randomUUID();
    const signature = crypto
      .createHmac("sha256", CHANNEL_SECRET)
      .update(CHANNEL_SECRET + uri + rawBody + nonce)
      .digest("base64");

    const resp = await fetch(`${LINEPAY_BASE}${uri}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LINE-ChannelId": CHANNEL_ID,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": signature,
      },
      body: rawBody,
    });

    const json = await resp.json();

    if (!resp.ok || json.returnCode !== "0000") {
      return res.status(400).json({ error: "LINE Pay 預約失敗", detail: json });
    }

    // 回傳付款網址（前端導向 json.info.paymentUrl.web）
    return res.status(200).json({
      ...json,
      orderId,
      amount: finalAmount,
    });
  } catch (e) {
    console.error("reserve error:", e?.message || e);
    return res
      .status(500)
      .json({ error: "LINE Pay API 請求失敗", detail: e?.message || String(e) });
  }
}
