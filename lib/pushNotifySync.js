/**
 * 全站推播通知狀態同步（首頁「推播通知」↔ BottomSheet「流量通知」）
 */
export const PUSH_NOTIFY_SYNC_EVENT = "jeko:push-notify-sync";

/**
 * @param {{ on: boolean, source?: string }} detail
 */
export function broadcastPushNotifyState(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PUSH_NOTIFY_SYNC_EVENT, {
      detail: {
        on: Boolean(detail?.on),
        source: detail?.source || "unknown",
        at: Date.now(),
      },
    }),
  );
}

export function subscribePushNotifySync(handler) {
  if (typeof window === "undefined") return () => {};
  const listener = (e) => handler(e.detail || {});
  window.addEventListener(PUSH_NOTIFY_SYNC_EVENT, listener);
  return () => window.removeEventListener(PUSH_NOTIFY_SYNC_EVENT, listener);
}
