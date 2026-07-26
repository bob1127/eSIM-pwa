/** 訂單顯示用：付款方式／買家資訊（夥伴後台） */

export function parsePaymentInfo(order) {
  let info = order?.payment_info;
  if (!info) return null;
  if (typeof info === "string") {
    try {
      info = JSON.parse(info);
    } catch {
      return null;
    }
  }
  return info && typeof info === "object" ? info : null;
}

/** 付款方式標籤（不顯示繳費代碼等敏感資訊） */
export function paymentMethodLabel(order) {
  const info = parsePaymentInfo(order);
  if (!info) {
    const s = String(order?.status || "").toLowerCase();
    if (s === "completed") return "已付款（線上）";
    if (s === "pending") return "尚未選擇／待取號";
    return "—";
  }
  if (info.payment_method_label) return String(info.payment_method_label);
  const t = String(info.payment_type || info.PaymentType || "").toUpperCase();
  if (t === "CREDIT" || t === "CREDITCARD" || t.includes("CARD")) return "信用卡";
  if (t === "CVS") return "超商代碼繳費";
  if (t === "VACC" || t === "ATM") return "ATM 轉帳";
  if (t === "BARCODE") return "超商條碼繳費";
  if (t === "WEBATM") return "WebATM";
  if (t === "APPLEPAY") return "Apple Pay";
  if (t === "GOOGLEPAY") return "Google Pay";
  if (t === "LINEPAY") return "LINE Pay";
  if (info.payment_type) return String(info.payment_type);
  return "其他付款方式";
}

export function buyerDisplayName(order) {
  const name = String(order?.customer_name || "").trim();
  if (name) return name;
  const email = String(order?.customer_email || "").trim();
  if (email) return email.split("@")[0];
  return "—";
}

export function buyerEmail(order) {
  return String(order?.customer_email || "").trim();
}
