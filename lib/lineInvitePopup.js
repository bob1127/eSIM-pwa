/** 未登入訪客：首頁「先加官方 LINE」情境 B 引導彈窗 */

export const LINE_INVITE_DISMISS_KEY = "jeko_line_invite_guest_dismissed_at";

/** 關閉後多久再出現（毫秒）；7 天 */
export const LINE_INVITE_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isLineInviteDismissed() {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(LINE_INVITE_DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < LINE_INVITE_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function dismissLineInvitePopup() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LINE_INVITE_DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** 測試用：清掉關閉紀錄 */
export function clearLineInviteDismiss() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LINE_INVITE_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}
