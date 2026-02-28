// /pages/api/linepay/confirm.js
import crypto from "crypto";

const CHANNEL_ID = "2007568484";
const CHANNEL_SECRET = "cb183f20b331f6c246755708eef99437";
// Sandbox 用這個： "https://sandbox-api-pay.line.me"；正式用 "https://api-pay.line.me"
const LINEPAY_BASE = "https://api-pay.line.me";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

    const { transactionId, amount } = req.body || {};
    const amt = Math.round(Number(amount));

    if (!transactionId) return res.status(400).json({ returnCode: "E001", returnMessage: "缺少 transactionId" });
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ returnCode: "E002", returnMessage: "amount 不合法" });
    }

    const uri = `/v3/payments/${transactionId}/confirm`;
    const rawBody = JSON.stringify({ amount: amt, currency: "TWD" });
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
    // 直接把 LINE Pay 的回應回傳給前端
    return res.status(resp.ok ? 200 : 400).json(json);
  } catch (e) {
    console.error("confirm error:", e?.message || e);
    return res.status(500).json({ returnCode: "E500", returnMessage: e?.message || String(e) });
  }
}
