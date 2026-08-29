/**
 * 客戶端：登入／登出時與推播帳號狀態對齊（防切換會員洩漏、關閉再開還原）
 */
import { getPushEndpoint, ICCID_STORAGE_KEY } from "./pushBind";

export const TRAFFIC_NOTIFY_PREF_KEY = "jeko_traffic_notify_pref";

export function clearLocalPushBindCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ICCID_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function setTrafficNotifyPref(on) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRAFFIC_NOTIFY_PREF_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

export function getTrafficNotifyPref() {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(TRAFFIC_NOTIFY_PREF_KEY);
    if (v === "on" || v === "off") return v;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * 登入後呼叫：認領本機 endpoint；若清掉他人綁定則清 localStorage ICCID
 * @param {{ token?: string|null }} opts
 */
export async function claimLocalPushEndpoint({ token } = {}) {
  if (typeof window === "undefined") return null;
  try {
    const endpoint = await getPushEndpoint();
    if (!endpoint) return { subscribed: false };

    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch("/api/push/claim-endpoint/", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ endpoint }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.clearedBind) clearLocalPushBindCache();
    return data;
  } catch {
    return null;
  }
}

/**
 * 登出：只清本機 ICCID 快取；DB 訂閱列保留，等下一位會員 claim
 */
export function onPushLogout() {
  clearLocalPushBindCache();
}
