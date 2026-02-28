import nodemailer from "nodemailer";

// 驗證碼配置
const DEFAULT_COOLDOWN = 10;          // 10 秒冷卻
const CODE_TTL_MS = 10 * 60 * 1000;   // 驗證碼 10 分鐘有效
const MAX_PER_HOUR = 5;               // 單一 email 一小時內最多寄送 5 次

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { email, action = "new" } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, message: "Email 格式錯誤" });
  }

  // 初始化全域儲存（⚠️ 正式環境請改 Redis / DB）
  global.verificationCodes = global.verificationCodes || {};
  const store = global.verificationCodes;

  const now = Date.now();
  const rec = store[email];

  // ✅ 防止重複提交（10 秒內不能再次請求）
  if (rec && now - rec.lastSent < DEFAULT_COOLDOWN * 1000) {
    const wait = Math.ceil((DEFAULT_COOLDOWN * 1000 - (now - rec.lastSent)) / 1000);
    return res.status(429).json({ success: false, message: `請稍候 ${wait} 秒再試`, cooldown: wait });
  }

  // ✅ 一小時內最多 5 次
  if (rec) {
    if (!rec.windowStart || now - rec.windowStart > 60 * 60 * 1000) {
      // reset
      rec.windowStart = now;
      rec.sentCount1h = 0;
    }
    if (rec.sentCount1h >= MAX_PER_HOUR) {
      return res.status(429).json({ success: false, message: "寄送次數過多，請稍後再試" });
    }
  }

  // ✅ 每次 new/resend 都會產生新驗證碼 → 自然覆蓋掉舊的
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 建立寄信器
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "wandmesim@gmail.com",
      pass: "hwoywmluqvsuluss", // ⚠️ 建議改用環境變數保存
    },
  });

  try {
    await transporter.sendMail({
      from: `"eSIM 註冊驗證" <wandmesim@gmail.com>`,
      to: email,
      subject: "您的驗證碼",
      html: `<p>您的驗證碼是：<strong>${code}</strong></p><p>10 分鐘內有效</p>`,
    });

    // ✅ 更新記錄
    store[email] = {
      code,
      expires: now + CODE_TTL_MS,
      lastSent: now,
      sentCount1h: rec ? rec.sentCount1h + 1 : 1,
      windowStart: rec ? rec.windowStart : now,
    };

    return res.status(200).json({
      success: true,
      message: action === "resend" ? "已重新寄送驗證碼" : "驗證碼已發送",
      cooldown: DEFAULT_COOLDOWN,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "寄送失敗：" + err.message });
  }
}
