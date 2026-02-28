const MAX_FAILS = 5;                 // 最多錯誤次數
const LOCK_MS = 10 * 60 * 1000;      // 鎖定 10 分鐘

function normalizeEmail(e) {
  return String(e || "").trim().toLowerCase();
}

// 常數時間字串比較，避免 timing attack（雖然這裡風險很低，但成本也低）
function safeEqual(a, b) {
  const sa = String(a || "");
  const sb = String(b || "");
  if (sa.length !== sb.length) return false;
  let out = 0;
  for (let i = 0; i < sa.length; i++) {
    out |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  }
  return out === 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  let { email, code } = req.body || {};
  email = normalizeEmail(email);

  if (!email || !code) {
    return res.status(400).json({ success: false, message: "缺少參數" });
  }

  global.verificationCodes = global.verificationCodes || {};
  const store = global.verificationCodes;
  const record = store[email];

  if (!record) {
    return res.status(400).json({ success: false, message: "尚未發送驗證碼" });
  }

  const now = Date.now();

  // 如果被鎖定中
  if (record.lockedUntil && now < record.lockedUntil) {
    const remain = Math.ceil((record.lockedUntil - now) / 1000);
    return res
      .status(429)
      .json({ success: false, message: `嘗試過多，請於 ${remain}s 後再試` });
  }

  // 檢查是否過期（順便清除）
  if (now > record.expires) {
    delete store[email];
    return res.status(400).json({ success: false, message: "驗證碼已過期" });
  }

  // 驗證碼比對
  if (!safeEqual(record.code, code)) {
    record.failCount = (record.failCount || 0) + 1;
    // 達到上限 → 鎖定
    if (record.failCount >= MAX_FAILS) {
      record.lockedUntil = now + LOCK_MS;
      return res
        .status(429)
        .json({ success: false, message: "嘗試過多，已鎖定 10 分鐘" });
    }
    const remain = MAX_FAILS - record.failCount;
    return res.status(400).json({
      success: false,
      message: `驗證碼錯誤，剩餘可嘗試 ${remain} 次`,
      attemptsLeft: remain,
    });
  }

  // ✅ 驗證成功 → 一次性刪除
  delete store[email];

  return res.status(200).json({ success: true, verified: true });
}
