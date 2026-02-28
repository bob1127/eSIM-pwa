// lib/microEsim.ts
import crypto from 'crypto';

const API_URL = process.env.MICRO_ESIM_API_URL;
const ACCOUNT = process.env.MICRO_ESIM_ACCOUNT; // test_account_9999
const SECRET = process.env.MICRO_ESIM_SECRET; 
const SALT = process.env.MICRO_ESIM_SALT;

export async function fetchDataPlans() {
  const timestamp = Date.now();
  
  // ⚠️ 關鍵：請確認這裡的順序是否跟 Postman 裡的一樣！
  // 常見組合 1: account + secret + timestamp + salt
  // 常見組合 2: account + timestamp + secret
  const strToSign = `${ACCOUNT}${SECRET}${timestamp}${SALT}`; 
  const signature = crypto.createHash('md5').update(strToSign).digest('hex');

  console.log("🔍 Debug API 參數:");
  console.log("  - URL:", `${API_URL}/api/v1/public/package/list`); // 確認 API 路徑對不對
  console.log("  - Timestamp:", timestamp);
  console.log("  - Signature:", signature);

  try {
    const res = await fetch(`${API_URL}/api/v1/public/package/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Account': ACCOUNT || '',
        'Timestamp': timestamp.toString(),
        'Signature': signature,
      },
      body: JSON.stringify({ lang: 'en' }), // 有些 API 需要 body 即使是空的
    });

    const json = await res.json();
    
    // 這裡會印出 API 到底回傳了什麼錯誤訊息
    if (json.code !== 200 && json.code !== "200") {
      console.error("❌ API 回傳錯誤代碼:", json);
    } else {
      console.log("✅ API 成功:", json); // 看看結構是不是 data.data
    }

    return json.data || []; // 如果結構是 json.list 請改成 json.list
  } catch (error) {
    console.error("❌ Fetch 失敗:", error);
    return [];
  }
}