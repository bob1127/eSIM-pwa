// pages/api/send-push.js
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:your-email@example.com', // 換成您的 Email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // 接收來自 WordPress 的資料
    const { secret, subscription, title, body, url } = req.body;

    // 簡易安全驗證，避免別人亂打您的 API
    if (secret !== 'jeko-super-secret-key-2026') {
      return res.status(401).json({ error: '通關密語錯誤！' });
    }

    // 設定推播顯示的內容
    const payload = JSON.stringify({
      title: title || 'Jeko eSIM 通知',
      body: body || '您有一則新訊息',
      url: url || '/'
    });

    try {
      await webpush.sendNotification(subscription, payload);
      res.status(200).json({ success: true, message: '推播發送成功！' });
    } catch (error) {
      console.error('發送推播失敗', error);
      res.status(500).json({ error: '發送推播失敗' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}