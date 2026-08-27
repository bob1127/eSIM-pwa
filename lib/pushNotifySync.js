/**
 * 全站推播／eSIM 綁定狀態同步
 * （BottomSheet 流量通知 ↔ data-query 開啟提醒 ↔ 首頁推播開關）
 */
export const PUSH_NOTIFY_SYNC_EVENT = "jeko:push-notify-sync";

/**
 * @param {{
 *   on?: boolean,
 *   topupId?: string|null,
 *   source?: string,
 * }} detail
 * - on：推播訂閱是否開啟（可省略，僅同步綁定時）
 * - topupId：目前綁定的 topup（null＝已解綁；undefined＝不改綁定）
 */
export function broadcastPushNotifyState(detail) {
  if (typeof window === "undefined") return;
  const payload = {
    source: detail?.source || "unknown",
    at: Date.now(),
  };
  if (detail && Object.prototype.hasOwnProperty.call(detail, "on")) {
    payload.on = Boolean(detail.on);
  }
  if (detail && Object.prototype.hasOwnProperty.call(detail, "topupId")) {
    payload.topupId =
      detail.topupId == null || detail.topupId === ""
        ? null
        : String(detail.topupId);
  }
  window.dispatchEvent(
    new CustomEvent(PUSH_NOTIFY_SYNC_EVENT, { detail: payload }),
  );
}

export function subscribePushNotifySync(handler) {
  if (typeof window === "undefined") return () => {};
  const listener = (e) => handler(e.detail || {});
  window.addEventListener(PUSH_NOTIFY_SYNC_EVENT, listener);
  return () => window.removeEventListener(PUSH_NOTIFY_SYNC_EVENT, listener);
}
