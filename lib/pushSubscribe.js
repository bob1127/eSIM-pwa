import {
  withTimeout,
  fetchServerPushConfig,
  ensureServiceWorkerReady,
  subscribePushWithRetry,
} from "./pushDebug";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * 訂閱 Web Push 並寫入伺服器。訪客 / 會員皆可。
 * @returns {Promise<PushSubscription>}
 */
export async function subscribeToPush({ token, onStep } = {}) {
  const step = (label) => onStep?.(label);

  step("檢查伺服器");
  const cfg = await fetchServerPushConfig();
  if (cfg && !cfg.ok) {
    throw new Error(cfg.hint || "伺服器推播環境變數未設定");
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("找不到 NEXT_PUBLIC_VAPID_PUBLIC_KEY");

  step("通知權限");
  if (typeof Notification !== "undefined" && Notification.permission === "denied") {
    throw new Error(
      "通知已被封鎖。請點網址列左側鎖頭／網站設定 → 通知 → 改為「允許」，再重新整理後重試。",
    );
  }
  const permission = await withTimeout(
    Notification.requestPermission(),
    120000,
    "Notification.requestPermission",
  );
  if (permission !== "granted") {
    if (permission === "denied") {
      throw new Error(
        "通知已被封鎖。請點網址列左側鎖頭／網站設定 → 通知 → 改為「允許」，再重新整理後重試。",
      );
    }
    throw new Error("尚未允許通知權限，請再試一次並選擇「允許」。");
  }

  step("Service Worker");
  const registration = await ensureServiceWorkerReady();

  step("Push 訂閱");
  const subscription = await subscribePushWithRetry(
    registration,
    urlBase64ToUint8Array(publicKey),
  );

  step("儲存訂閱");
  const res = await withTimeout(
    fetch("/api/subscribe/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(subscription),
    }),
    30000,
    "POST /api/subscribe",
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.detail || `HTTP ${res.status}`);
  }

  return subscription;
}

/** 開發測試用 ICCID（僅驗證綁定流程，無法查真實流量） */
export const PUSH_TEST_ICCID = "89380000000000000001";

export function isPushTestMode() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_PUSH_TEST_MODE === "true"
  );
}
