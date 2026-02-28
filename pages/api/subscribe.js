// pages/api/subscribe.js
import webpush from 'web-push';

// 設定 VAPID 憑證
webpush.setVapidDetails(
  'mailto:bob112722761236tom@gmail.com', // ⚠️ 請改成您的聯絡 Email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const subscription = req.body;
    
    // 💡 實務上：您應該把這個 subscription 存進資料庫，與該名會員綁定。
    // 這裡我們為了測試，收到訂閱後，直接發送一個「開通成功」的測試推播給他！

    const payload = JSON.stringify({
      title: '✈️ Jeko eSIM 準備就緒',
      body: '您的推播功能已成功開啟！流量快用完時我們會提醒您喔！',
      url: '/' // 點擊推播後打開首頁
    });

    try {
      await webpush.sendNotification(subscription, payload);
      res.status(201).json({ message: '訂閱成功並發送測試推播！' });
    } catch (error) {
      console.error('發送推播失敗', error);
      res.status(500).json({ error: '發送推播失敗' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}