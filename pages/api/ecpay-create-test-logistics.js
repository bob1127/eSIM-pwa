import crypto from 'crypto';
import qs from 'querystring';

const {
  MERCHANT_ID = '3002607',
  HASH_KEY = 'pwFHCqoQZGmho4w6',
  HASH_IV = 'EkRm7iFT261dpevs',
} = process.env;

function createCheckMacValue(params) {
  const raw = `HashKey=${HASH_KEY}&${qs.stringify(
    Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)))
  )}&HashIV=${HASH_IV}`;

  const urlEncoded = encodeURIComponent(raw)
    .toLowerCase()
    .replace(/%20/g, '+')
    .replace(/%21/g, '!')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2a/g, '*');

  return crypto.createHash('md5').update(urlEncoded).digest('hex').toUpperCase();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { LogisticsSubType = 'FAMI' } = req.body; // 或 UNIMART、UNIMARTFREEZE

  const ClientReplyURL = 'https://www.starislandbaby.com.tw/thank-you';

  const params = {
    MerchantID: MERCHANT_ID,
    ClientReplyURL,
    LogisticsSubType,
    PlatformID: '',
  };

  const checkMacValue = createCheckMacValue(params);

  const html = `
    <html>
      <body onload="document.forms[0].submit()">
        <form method="POST" action="https://logistics-stage.ecpay.com.tw/Express/CreateTestData">
          ${Object.entries({ ...params, CheckMacValue: checkMacValue })
            .map(
              ([key, value]) => `<input type="hidden" name="${key}" value="${value}" />`
            )
            .join('\n')}
        </form>
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}
