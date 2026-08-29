/** 訂單顯示用：付款方式／買家資訊／訂單編號（夥伴後台＋Boss 共用） */

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

/**
 * 對外訂單編號來源（與主站／藍新 MerchantOrderNo／Medusa 對齊）。
 * 優先：medusa_order_id → payment_info.merchant_order_no → supabase id
 */
export function resolveOrderPublicId(order) {
  const medusa = String(order?.medusa_order_id || "").trim();
  if (medusa) return medusa;
  const info = parsePaymentInfo(order);
  const merchant = String(
    info?.merchant_order_no || info?.MerchantOrderNo || "",
  ).trim();
  if (merchant) return merchant;
  const numbered = String(order?.order_number || "").trim();
  if (numbered) return numbered;
  return String(order?.id || "").trim();
}

/** 去掉 Medusa `order_` 前綴，方便與藍新 MerchantOrderNo／客服對帳 */
export function stripOrderPrefix(id) {
  const s = String(id || "").trim();
  if (/^order_/i.test(s)) return s.slice(6);
  return s;
}

/**
 * Medusa 數字 display_id（主站 Boss 銷售分析主標）。
 * 可來自 order.display_id／payment_info.display_id（同步寫入）。
 */
export function resolveOrderDisplayId(order) {
  const raw =
    order?.display_id ??
    order?.displayId ??
    parsePaymentInfo(order)?.display_id ??
    null;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.round(n);
  const s = String(raw).trim();
  return s || null;
}

/**
 * 列表／標題用短標號（與 Boss 主站銷售：`#displayId ?? id.slice(-8)` 對齊）。
 * 無 display_id 時取對外編號末 8 碼（同 thank-you shortOrderNo）。
 */
export function formatOrderCode(order) {
  const displayId = resolveOrderDisplayId(order);
  if (displayId != null) return String(displayId);

  const publicId = stripOrderPrefix(resolveOrderPublicId(order));
  if (!publicId) return "—";
  if (publicId.length <= 10) return publicId.toUpperCase();
  return publicId.slice(-8).toUpperCase();
}

/** 完整對外編號（詳情副標／對客服／CSV） */
export function formatOrderFullId(order) {
  const publicId = stripOrderPrefix(resolveOrderPublicId(order));
  return publicId || "—";
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
