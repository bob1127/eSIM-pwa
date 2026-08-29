import { DEFAULT_REFERRAL_DISCOUNT_PERCENT } from "./partnerReferralDiscount";

function parseItemDetails(order) {
  try {
    return Array.isArray(order?.item_details)
      ? order.item_details
      : JSON.parse(order?.item_details || "[]");
  } catch {
    return [];
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function paymentInfo(order) {
  const pi = order?.payment_info;
  if (!pi) return {};
  if (typeof pi === "string") {
    try {
      return JSON.parse(pi);
    } catch {
      return {};
    }
  }
  return pi;
}

function itemRates(items) {
  return items
    .map((it) => num(it.partner_rate_percent ?? it.partnerRatePercent))
    .filter((n) => n != null && n > 0);
}

/** 夥伴旅客折扣預設趴數（關閉時回傳 null） */
export function resolvePartnerDefaultDiscountPercent(partner) {
  if (partner?.referral_discount_enabled === false) return null;
  const partnerDiscount = num(partner?.referral_discount_percent);
  if (partnerDiscount != null && partnerDiscount > 0) {
    return Math.round(partnerDiscount);
  }
  return DEFAULT_REFERRAL_DISCOUNT_PERCENT;
}

/** 訂單層級：夥伴分潤％（優先讀同步寫入，否則夥伴預設或反推） */
export function resolveOrderPartnerRatePercent(order, partner) {
  const payment = paymentInfo(order);
  const stored = num(payment.partner_rate_percent);
  if (stored != null && stored > 0) return Math.round(stored);

  const items = parseItemDetails(order);
  const rates = itemRates(items);
  if (rates.length) {
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }

  const partnerRate = num(partner?.referral_rate);
  if (partnerRate != null && partnerRate > 0) return Math.round(partnerRate);

  const b2b = num(order?.b2b_cost);
  const profit = num(order?.partner_profit);
  if (b2b != null && b2b > 0 && profit != null && profit >= 0) {
    return Math.min(100, Math.round((profit / b2b) * 100));
  }

  return null;
}

/**
 * 訂單層級：旅客折扣％
 * — 優先讀訂單／明細寫入值
 * — 否則用夥伴設定（未設則預設 10%）
 * — 僅當夥伴明確關閉折扣時回傳 null（UI 顯示「未套用」）
 */
export function resolveOrderDiscountPercent(order, partner) {
  const fallback = resolvePartnerDefaultDiscountPercent(partner);
  if (fallback == null) return null;

  const payment = paymentInfo(order);
  const stored = num(payment.referral_discount_percent);
  if (stored != null && stored > 0) return Math.round(stored);

  const items = parseItemDetails(order);
  const itemDiscounts = items
    .map((it) => num(it.referral_discount_percent ?? it.referralDiscountPercent))
    .filter((n) => n != null && n > 0);
  if (itemDiscounts.length) {
    return Math.round(
      itemDiscounts.reduce((a, b) => a + b, 0) / itemDiscounts.length,
    );
  }

  return fallback;
}

/** 單品列：分潤／折扣％（供明細收合列） */
export function resolveLinePartnerTerms(item, order, partner) {
  const orderRate = resolveOrderPartnerRatePercent(order, partner);
  const orderDiscount = resolveOrderDiscountPercent(order, partner);

  const lineRate =
    num(item?.partner_rate_percent ?? item?.partnerRatePercent) ?? orderRate;
  const lineDiscount =
    num(item?.referral_discount_percent ?? item?.referralDiscountPercent) ??
    orderDiscount;

  return {
    partnerRatePercent: lineRate,
    discountPercent: lineDiscount,
  };
}

export function formatPercentLabel(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${Math.round(Number(value))}%`;
}

/** UI 顯示用：有值顯示趴數，否則「未套用」 */
export function formatDiscountLabel(value) {
  if (value == null || !Number.isFinite(Number(value))) return "未套用";
  return formatPercentLabel(value);
}
