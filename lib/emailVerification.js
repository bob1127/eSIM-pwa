/**
 * Email 驗證碼「已驗證」狀態的共用讀取／消耗邏輯。
 *
 * 驗證碼本身仍由 /api/send-code、/api/verify-code 管理（global.verificationCodes，
 * 單一 serverless instance 記憶體，維持現有行為不變）。這裡只封裝「伺服器端」
 * 判斷是否可信任該 email 已完成驗證，供任何要「建立帳號」的 API
 * （會員註冊 /api/register、夥伴註冊 /api/partner/register-auth）共用，
 * 避免前端可以繞過驗證直接呼叫 Supabase signUp。
 */
function normalizeEmail(e) {
  return String(e || "").trim().toLowerCase();
}

/** 該 email 是否已完成驗證且尚未過期（建立帳號用途，預設 7 天內有效） */
export function isEmailVerifiedForRegistration(email) {
  const key = normalizeEmail(email);
  if (!key) return false;
  global.verificationCodes = global.verificationCodes || {};
  const record = global.verificationCodes[key];
  if (!record?.verified) return false;
  const now = Date.now();
  const expiry = record.applicationExpires || record.expires || 0;
  return now <= expiry;
}

/** 建立帳號成功後消耗掉驗證紀錄，避免同一次驗證被重複用來建立多個帳號 */
export function consumeEmailVerification(email) {
  const key = normalizeEmail(email);
  if (!key || !global.verificationCodes) return;
  delete global.verificationCodes[key];
}
