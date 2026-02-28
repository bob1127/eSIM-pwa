// pages/api/ecpay-callback.js
import { createHash } from 'crypto';

const HASH_KEY = process.env.HASH_KEY;
const HASH_IV = process.env.HASH_IV;

function verifyCheckMacValue(params, receivedMac) {
  const sorted = Object.entries(params)
    .filter(([key]) => key !== 'CheckMacValue')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const raw = `HashKey=${HASH_KEY}&${sorted}&HashIV=${HASH_IV}`;

  const encoded = encodeURIComponent(raw)
    .toLowerCase()
    .replace(/%20/g, '+')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2a');

  const hash = createHash('sha256')
    .update(encoded)
    .digest('hex')
    .toUpperCase();

  return hash === receivedMac;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { CheckMacValue, ...otherParams } = req.body;

  const isValid = verifyCheckMacValue(otherParams, CheckMacValue);
  if (!isValid) {
    console.warn("CheckMacValue 驗證失敗");
    return res.status(400).send('0|FAIL');
  }

  const { MerchantTradeNo, RtnCode, TradeNo, PaymentDate, TradeAmt } = req.body;

  if (parseInt(RtnCode) === 1) {
    console.log("✅ 付款成功：", {
      MerchantTradeNo,
      TradeNo,
      PaymentDate,
      TradeAmt,
    });

    // 🚀 這裡可以串接 WooCommerce API 寫入訂單/改變庫存

    return res.status(200).send('1|OK');
  }

  return res.status(200).send('0|FAIL');
}
