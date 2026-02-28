// scripts/mock-newebpay-notify.cjs
// 用法：node scripts/mock-newebpay-notify.cjs ORDER_NO [BASE_URL]
// 例：  node scripts/mock-newebpay-notify.cjs ORDER17575154017147 http://localhost:3000
const axios = require("axios");
const crypto = require("crypto");
const qs = require("qs");

const HASH_KEY = "OVB4Xd2HgieiLJJcj5RMx9W94sMKgHQx";
const HASH_IV  = "PKetlaZYZcZvlMmC";

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

const ORDER_NO = process.argv[2];
const BASE = (process.argv[3] || "http://localhost:3000").replace(/\/$/, "");
if (!ORDER_NO) {
  console.error("請帶入訂單號：node scripts/mock-newebpay-notify.cjs <ORDER_NO> [BASE_URL]");
  process.exit(1);
}

// 模擬「取號成功」（ATM：VACC）
const payload = {
  Status: "SUCCESS",
  Message: "TEST-PAYMENTINFO",
  Result: {
    MerchantID: "MS3788816305",
    MerchantOrderNo: ORDER_NO,
    PaymentType: "VACC",
    BankCode: "808",
    vAccount: "1234567890123456",
    ExpireDate: "2099-12-31 23:59:59",
    TradeNo: "TEST-TNO-123456",
    Amt: 100
  }
};

(async () => {
  try {
    const TradeInfo = aesEncrypt(JSON.stringify(payload), HASH_KEY, HASH_IV);
    const TradeSha  = shaEncrypt(TradeInfo, HASH_KEY, HASH_IV);
    const body = qs.stringify({ TradeInfo, TradeSha });

    // ★ 一定要尾斜線，避免 308 轉址丟失 body
    const url  = `${BASE}/api/newebpay-notify/`;

    const resp = await axios.post(url, body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      maxRedirects: 5,
    });

    console.log("notify resp:", resp.status, resp.statusText);
    console.log("X-Notify-Rev:", resp.headers["x-notify-rev"] || "(none)");
    if (resp.data && typeof resp.data === "string") {
      console.log("body:", resp.data.slice(0, 200));
    }
  } catch (err) {
    if (err.response) {
      console.error("HTTP", err.response.status, err.response.statusText);
      console.error("headers:", err.response.headers);
      console.error("data:", err.response.data);
    } else {
      console.error(err.message || err);
    }
    process.exit(1);
  }
})();
