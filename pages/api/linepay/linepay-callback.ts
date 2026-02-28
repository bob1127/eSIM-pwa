import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const CHANNEL_ID = "2007568484";
const CHANNEL_SECRET = "cb183f20b331f6c246755708eef99437";
// Sandbox 用這個： "https://sandbox-api-pay.line.me"
const LINEPAY_BASE = "https://api-pay.line.me";

function sign(uri: string, rawBody: string, nonce: string) {
  return crypto
    .createHmac("sha256", CHANNEL_SECRET)
    .update(CHANNEL_SECRET + uri + rawBody + nonce)
    .digest("base64");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const txParam = req.query.transactionId;
    const orderParam = req.query.orderId;
    const amtParam = req.query.amount;

    const transactionId = Array.isArray(txParam) ? txParam[0] : String(txParam || "");
    const orderId = Array.isArray(orderParam) ? orderParam[0] : String(orderParam || "");
    const amount = Math.round(Number(Array.isArray(amtParam) ? amtParam[0] : amtParam));

    if (!transactionId) return res.status(400).json({ error: "缺少 transactionId" });
    if (!orderId) return res.status(400).json({ error: "缺少 orderId" });
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "缺少或不合法的 amount（需與 reserve 一致）" });
    }

    const uri = `/v3/payments/${transactionId}/confirm`;
    const bodyObj = { amount, currency: "TWD" };
    const rawBody = JSON.stringify(bodyObj);
    const nonce = crypto.randomUUID();
    const signature = sign(uri, rawBody, nonce);

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
      console.error("LINE Pay confirm 失敗：", json);
      return res.status(400).json({ error: "付款確認失敗", detail: json });
    }

    // 成功：導回你的 thank-you（可視需求帶參數）
    return res.redirect(
      302,
      `/thank-you?status=success&method=linepay&tx=${encodeURIComponent(
        transactionId
      )}&oid=${encodeURIComponent(orderId)}&amount=${amount}`
    );
  } catch (e: any) {
    console.error("callback error:", e?.message);
    return res.status(500).json({ error: "LINE Pay Callback 發生錯誤", detail: e?.message });
  }
}
