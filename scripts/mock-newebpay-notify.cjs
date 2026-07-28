// scripts/mock-newebpay-notify.cjs
//
// 用來測試 esim-backend 的 /newebpay/notify（藍新背景通知），驗證驗簽、
// authorize+capture、觸發發貨的冪等性。金鑰改讀環境變數，跟 esim-backend
// 的 NEWEBPAY_HASH_KEY / NEWEBPAY_HASH_IV 保持一致。
//
// 用法：
//   node scripts/mock-newebpay-notify.cjs <MERCHANT_ORDER_NO> [BACKEND_URL] [PAYMENT_TYPE]
//
// 例：
//   node scripts/mock-newebpay-notify.cjs 01J8X7ZQK3YV2E9T3RCEXAMPLE http://localhost:9000 CREDIT
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const qs = require("qs");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.resolve(__dirname, "../../esim-backend/.env"));
loadEnvFile(path.resolve(__dirname, "../.env.local"));

const HASH_KEY = process.env.NEWEBPAY_HASH_KEY;
const HASH_IV = process.env.NEWEBPAY_HASH_IV;

if (!HASH_KEY || !HASH_IV) {
  console.error("請先設定環境變數 NEWEBPAY_HASH_KEY / NEWEBPAY_HASH_IV（跟 esim-backend 的 .env 一致）");
  process.exit(1);
}

function aesEncrypt(data, key, iv) {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}
function shaEncrypt(encryptedText, key, iv) {
  const s = `HashKey=${key}&${encryptedText}&HashIV=${iv}`;
  return crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
}

const MERCHANT_ORDER_NO = process.argv[2];
const BASE = (process.argv[3] || "http://localhost:9000").replace(/\/$/, "");
const PAYMENT_TYPE = (process.argv[4] || "CREDIT").toUpperCase();

if (!MERCHANT_ORDER_NO) {
  console.error(
    "請帶入商店訂單編號（Medusa order.id 去掉 order_ 前綴）：\n" +
      "node scripts/mock-newebpay-notify.cjs <MERCHANT_ORDER_NO> [BACKEND_URL] [PAYMENT_TYPE]",
  );
  process.exit(1);
}

const basePayload = {
  MerchantID: process.env.NEWEBPAY_MERCHANT_ID || "MSxxxxxxxxxx",
  MerchantOrderNo: MERCHANT_ORDER_NO,
  RespondType: "JSON",
  Amt: 100,
  TradeNo: `TEST-TNO-${Date.now()}`,
  ItemDesc: "測試商品",
};

// 模擬不同付款方式的 Result
const resultByType = {
  CREDIT: { ...basePayload, PaymentType: "CREDIT", PayTime: new Date().toISOString() },
  VACC: {
    ...basePayload,
    PaymentType: "VACC",
    BankCode: "808",
    CodeNo: "1234567890123456",
    ExpireDate: "2099-12-31 23:59:59",
  },
  WEBATM: { ...basePayload, PaymentType: "WEBATM", PayTime: new Date().toISOString() },
};

const result = resultByType[PAYMENT_TYPE] || resultByType.CREDIT;
const payload = { Status: "SUCCESS", Message: "TEST-NOTIFY", Result: result };

(async () => {
  try {
    const TradeInfo = aesEncrypt(JSON.stringify(payload), HASH_KEY, HASH_IV);
    const TradeSha = shaEncrypt(TradeInfo, HASH_KEY, HASH_IV);
    const body = qs.stringify({ TradeInfo, TradeSha });

    const url = `${BASE}/newebpay/notify`;
    console.log(`→ POST ${url} (PaymentType=${PAYMENT_TYPE}, MerchantOrderNo=${MERCHANT_ORDER_NO})`);

    const resp = await axios.post(url, body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      maxRedirects: 5,
    });

    console.log("notify resp:", resp.status, resp.statusText);
    if (resp.data && typeof resp.data === "string") {
      console.log("body:", resp.data.slice(0, 200));
    }
  } catch (err) {
    if (err.response) {
      console.error("HTTP", err.response.status, err.response.statusText);
      console.error("data:", err.response.data);
    } else {
      console.error(err.message || err);
    }
    process.exit(1);
  }
})();
