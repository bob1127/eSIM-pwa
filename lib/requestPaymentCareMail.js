/** 前台：未付款／失敗時觸發關懷信（best-effort，只帶 orderNo） */
export function requestPaymentCareMail({
  orderNo,
  method,
  reason,
  message,
} = {}) {
  const no = String(orderNo || "").trim();
  if (!no || typeof window === "undefined") return;
  try {
    const key = `payment_care_requested:${no}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
  void fetch("/api/payment-care", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderNo: no,
      method: method || "",
      reason: reason || "client_unpaid",
      message: message || "",
    }),
  }).catch(() => {});
}
