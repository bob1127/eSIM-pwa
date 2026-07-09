/** LINE 登入會員的 Supabase email 格式（純函式，可安全用於 client） */
export function lineUserIdToEmail(lineUserId) {
  return `${String(lineUserId).trim()}@line-login.com`.toLowerCase();
}
