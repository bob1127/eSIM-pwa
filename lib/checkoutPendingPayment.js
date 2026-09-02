/** sessionStorage：進行中／未完成付款（LINE Pay / 藍新） */
export const PENDING_PAYMENT_KEY = "checkout_pending_payment";

/** 24h 內視為同一筆待付款 */
export const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function readPendingPayment() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writePendingPayment(data) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    PENDING_PAYMENT_KEY,
    JSON.stringify({
      ...data,
      startedAt: data.startedAt || Date.now(),
    }),
  );
}

export function clearPendingPayment() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_PAYMENT_KEY);
}

export function isPendingPaymentActive(pending, method) {
  if (!pending?.startedAt) return false;
  if (method && pending.method !== method) return false;
  return Date.now() - Number(pending.startedAt) < PENDING_MAX_AGE_MS;
}

export function getPendingPaymentBlockMessage(pending) {
  const no = pending?.orderNo || pending?.medusaOrderId || "";
  if (pending?.method === "linepay") {
    return (
      `您有一筆 LINE Pay 訂單等待付款${no ? `（#${no}）` : ""}。` +
      "若已完成付款，請稍候或查看訂單狀態；若要重新購買，請先按「取消並重新結帳」。"
    );
  }
  return "您有一筆訂單等待付款中，請先完成或取消後再結帳。";
}
