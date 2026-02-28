import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
// import axios, { AxiosError } from "axios"; // 移除 axios，因為不需要打 WooCommerce 了

// 🔐 建議改用環境變數 (目前先保留你原本的設定)
const MERCHANT_ID = "MS3788816305";
const HASH_KEY = "OVB4Xd2HgieiLJJcj5RMx9W94sMKgHQx";
const HASH_IV = "PKetlaZYZcZvlMmC";

/* === 工具：AES 加密 + SHA256 === */
function aesEncrypt(data: string, key: string, iv: string) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key, "utf8"),
    Buffer.from(iv, "utf8")
  );
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function shaEncrypt(encryptedText: string, key: string, iv: string) {
  const plainText = `HashKey=${key}&${encryptedText}&HashIV=${iv}`;
  return crypto.createHash("sha256").update(plainText).digest("hex").toUpperCase();
}

/* === 動態付款方式 === */
const SUPPORTED_METHODS = ["CREDIT", "VACC", "WEBATM", "CVS", "BARCODE", "LINEPAY"];

function normalizeMethods(input?: string | string[]): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : String(input).split(",");
  const uniq = Array.from(
    new Set(arr.map((s) => String(s).trim().toUpperCase()).filter(Boolean))
  );
  return uniq.filter((m) => SUPPORTED_METHODS.includes(m));
}

function buildFlags(methods: string[]) {
  const flags: Record<string, string> = {
    CREDIT: "0",
    VACC: "0",
    WEBATM: "0",
    CVS: "0",
    BARCODE: "0",
    LINEPAY: "0",
  };
  methods.forEach((m) => {
    if (m in flags) flags[m] = "1";
  });
  return flags;
}

/** yyyymmdd / hhmmss */
function formatExpire(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const MM = pad(d.getMinutes());
  const SS = pad(d.getSeconds());
  return { ExpireDate: `${yyyy}${mm}${dd}`, ExpireTime: `${HH}${MM}${SS}` };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  // 🚀 關鍵修改 1：接收 Supabase 的 customOrderId
  const { items, orderInfo, customOrderId } = req.body as { items: any[]; orderInfo: any; customOrderId: string };
  
  if (!customOrderId) {
     return res.status(400).json({ error: "缺少 Supabase 訂單 ID" });
  }

  const discount = Number(orderInfo?.discount) || 0;

  // === 計算金額 ===
  const rawAmount = items.reduce((total: number, item: any) => {
    return total + Number(item.price) * Number(item.quantity);
  }, 0);
  const amount = Math.max(Math.round(rawAmount - discount), 0);
  
  // 🚀 關鍵修改 2：把原本隨機的 ORDER+Date.now() 改成跟 Supabase UUID 綁定
  // 藍新 MerchantOrderNo 最長 30 碼，我們取 UUID 去掉底線前 20 碼，加上時間戳避免重複
  const cleanUuid = customOrderId.replace(/-/g, "").substring(0, 20);
  const timestamp = Date.now().toString().slice(-6);
  const orderNo = `ESIM${cleanUuid}${timestamp}`;

  /* === 付款方式決策 === */
  const envAllowedRaw = process.env.NEWEBPAY_ALLOWED_METHODS || "CREDIT,VACC,WEBATM";
  const envAllowed = normalizeMethods(envAllowedRaw);
  const requested = normalizeMethods(orderInfo?.methods ?? orderInfo?.method);
  const chosen = (requested.length ? envAllowed.filter((m) => requested.includes(m)) : envAllowed);
  const methods = chosen.length ? chosen : ["CREDIT"];
  const flags = buildFlags(methods);
  const paymentMethodValue = methods.join(",");

  /* === Step1: WooCommerce 區塊已安全刪除 === */

  /* === Step2: 準備藍新 MPG 參數（動態） === */
  const needExpire = methods.some((m) => ["VACC", "CVS", "BARCODE"].includes(m));
  const expireMinutes = Number(orderInfo?.expireMinutes ?? 1440);
  const { ExpireDate, ExpireTime } = needExpire
    ? formatExpire(Date.now() + Math.max(1, expireMinutes) * 60 * 1000)
    : { ExpireDate: undefined, ExpireTime: undefined };

  const tradeInfoObj: Record<string, string> = {
    MerchantID: MERCHANT_ID,
    RespondType: "JSON",
    TimeStamp: `${Math.floor(Date.now() / 1000)}`,
    Version: "2.3", // 保留你原本的 2.3 設定
    MerchantOrderNo: orderNo, // 🚀 傳入綁定 Supabase UUID 的訂單號
    Amt: String(amount),
    ItemDesc: "虛擬商品訂單",
    Email: orderInfo?.email || "test@example.com",

    // 回傳/通知 (保留你原本設定好的網址)
    ReturnURL: "https://www.wmesim.com/api/newebpay-callback/",
    NotifyURL: "https://www.wmesim.com/api/newebpay-notify/",
    CustomerURL: `https://www.wmesim.com/api/newebpay-customer?orderNo=${encodeURIComponent(orderNo)}`,
    ClientBackURL: `https://www.wmesim.com/thank-you?orderNo=${encodeURIComponent(orderNo)}`,

    // 動態付款方式旗標
    PaymentMethod: paymentMethodValue, 
    CREDIT: flags.CREDIT,
    VACC: flags.VACC,
    WEBATM: flags.WEBATM,
    CVS: flags.CVS,
    BARCODE: flags.BARCODE,
    LINEPAY: flags.LINEPAY,
  };

  if (needExpire && ExpireDate && ExpireTime) {
    (tradeInfoObj as any).ExpireDate = ExpireDate;
    (tradeInfoObj as any).ExpireTime = ExpireTime;
  }

  const tradeInfoStr = new URLSearchParams(tradeInfoObj).toString();
  const encrypted = aesEncrypt(tradeInfoStr, HASH_KEY, HASH_IV);
  const tradeSha = shaEncrypt(encrypted, HASH_KEY, HASH_IV);

  /* === Step3: 回傳自動送出表單 === */
const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body>
  <form id="newebpay-form" method="post" action="https://core.newebpay.com/MPG/mpg_gateway">
    <input type="hidden" name="MerchantID" value="${MERCHANT_ID}" />
    <input type="hidden" name="TradeInfo" value="${encrypted}" />
    <input type="hidden" name="TradeSha" value="${tradeSha}" />
    <input type="hidden" name="Version" value="2.3" />
  </form>
<script>
  try {
    // 🚀 關鍵修改 3：在瀏覽器中存下藍新單號與 Supabase 原始 UUID 的對應關係
    var payload = { orderNo: "${orderNo}", supabaseId: "${customOrderId}", ts: Date.now() };
    localStorage.setItem("lastOrderNo", "${orderNo}");
    localStorage.setItem("lastOrderNoPayload", JSON.stringify(payload));
  } catch(e) {}
  document.getElementById("newebpay-form").submit();
</script>
</body>
</html>
`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}