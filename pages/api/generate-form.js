import crypto from "crypto";

const MERCHANT_ID = process.env.MERCHANT_ID;
const HASH_KEY = process.env.HASH_KEY;
const HASH_IV = process.env.HASH_IV;
const RETURN_URL = process.env.RETURN_URL;
const CLIENT_BACK_URL = process.env.CLIENT_BACK_URL;

function getFormattedTradeDate() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const HH = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}/${MM}/${dd} ${HH}:${mm}:${ss}`;
}

function createCheckMacValue(params, hashKey, hashIV) {
  const ordered = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const raw = `HashKey=${hashKey}&${ordered}&HashIV=${hashIV}`;

  const encoded = encodeURIComponent(raw)
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

  return crypto.createHash("sha256").update(encoded.toLowerCase()).digest("hex").toUpperCase();
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  if (!MERCHANT_ID || !HASH_KEY || !HASH_IV || !RETURN_URL || !CLIENT_BACK_URL) {
    return res.status(503).json({
      error: "ECPay 未設定（缺少 MERCHANT_ID / HASH_KEY / HASH_IV / RETURN_URL / CLIENT_BACK_URL）",
    });
  }

  try {
    const { TotalAmount, TradeDesc, ItemName, CustomField1 } = req.body || {};

    const baseParams = {
      MerchantID: MERCHANT_ID,
      MerchantTradeNo: `T${Date.now()}`,
      MerchantTradeDate: getFormattedTradeDate(),
      PaymentType: "aio",
      TotalAmount: String(TotalAmount || 0),
      TradeDesc: TradeDesc || "Order",
      ItemName: ItemName || "Item",
      ReturnURL: RETURN_URL,
      ClientBackURL: CLIENT_BACK_URL,
      ChoosePayment: "ALL",
      EncryptType: "1",
      CustomField1: CustomField1 || "",
    };

    const checkMacValue = createCheckMacValue(baseParams, HASH_KEY, HASH_IV);

    return res.status(200).json({
      ...baseParams,
      CheckMacValue: checkMacValue,
    });
  } catch (err) {
    console.error("[generate-form]", err);
    return res.status(500).json({ error: "Failed to generate form" });
  }
}
