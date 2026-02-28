
import { v4 as uuidv4 } from 'uuid';
import ecpay from 'ecpay_aio_nodejs';

const { MERCHANT_ID, HASH_KEY, HASH_IV, RETURN_URL, CLIENT_BACK_URL } = process.env;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { items, orderInfo } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: '購物車為空' });
  }

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const merchantTradeNo = `STB${uuidv4().replace(/-/g, '').slice(0, 20)}`;

  const baseParam = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    PaymentType: 'aio',
    TotalAmount: totalAmount,
    TradeDesc: '星嶼童裝購物付款',
    ItemName: items.map((i) => `${i.name}x${i.quantity}`).join('#'),
    ReturnURL: RETURN_URL,
    ClientBackURL: CLIENT_BACK_URL,
    ChoosePayment: 'Credit',
    EncryptType: 1,
  };

  const create = new ecpay({
    OperationMode: 'Test', // ✅ 記得部署上正式網站改為 'Production'
    HashKey: HASH_KEY,
    HashIV: HASH_IV,
    MerchantID: MERCHANT_ID,
  });

  try {
    const html = create.payment_client.aio_check_out_credit_onetime(
      baseParam,
      {}, // No optional params
    );
    res.status(200).send(html);
  } catch (err) {
    console.error('ECPay Error:', err);
    res.status(500).json({ message: '綠界付款建立失敗' });
  }
}
