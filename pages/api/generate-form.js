import crypto from 'crypto';

const {
  MERCHANT_ID = '3002607',
  HASH_KEY = 'pwFHCqoQZGmho4w6',
  HASH_IV = 'EkRm7iFT261dpevs',
  RETURN_URL = 'https://www.starislandbaby.com.tw/api/ecpay-callback',
  CLIENT_BACK_URL = 'https://www.starislandbaby.com.tw/thank-you',
} = process.env;

function getFormattedTradeDate() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}/${MM}/${dd} ${HH}:${mm}:${ss}`;
}

function createCheckMacValue(params, hashKey, hashIV) {
  const ordered = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const raw = `HashKey=${hashKey}&${ordered}&HashIV=${hashIV}`;

  const encoded = encodeURIComponent(raw)
    .replace(/%20/g, '+')
    .replace(/%21/g, '!')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2A/g, '*');

  return crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { items, orderInfo } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).send('購物車為空');
  }

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tradeNo = `STB${Date.now()}`;
  const tradeDate = getFormattedTradeDate();

  const baseParams = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: tradeNo,
    MerchantTradeDate: tradeDate,
    PaymentType: 'aio',
    TotalAmount: totalAmount,
    TradeDesc: '星嶼童裝付款',
    ItemName: items.map((i) => `${i.name}x${i.quantity}`).join('#'),
    ReturnURL: RETURN_URL,
    ClientBackURL: CLIENT_BACK_URL,
    ChoosePayment: 'Credit',
    EncryptType: '1',
  };

  const checkMacValue = createCheckMacValue(baseParams, HASH_KEY, HASH_IV);
  const html = `
    <html>
      <body onload="document.forms[0].submit()">
        <form method="POST" action="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5">
          ${Object.entries({ ...baseParams, CheckMacValue: checkMacValue })
            .map(
              ([key, val]) => `<input type="hidden" name="${key}" value="${val}" />`
            )
            .join('\n')}
        </form>
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
