/** LINE 登入會員的 Supabase email 格式（純函式，可安全用於 client） */
export function lineUserIdToEmail(lineUserId) {
  return `${String(lineUserId).trim()}@line-login.com`.toLowerCase();
}

/** 是否為系統為 LINE 登入產生的虛擬信箱 */
export function isLineSyntheticEmail(email) {
  return /@line-login\.com$/i.test(String(email || "").trim());
}

/**
 * 會員中心顯示用：LINE 虛擬信箱改成人看得懂的文案
 * （內部訂單／推播仍用完整 {lineId}@line-login.com）
 */
export function formatMemberEmailDisplay(email) {
  const value = String(email || "").trim();
  if (!value) return "—";
  if (isLineSyntheticEmail(value)) {
    return "LINE 登入・尚未綁定 Email";
  }
  return value;
}
