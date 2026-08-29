/**
 * 優惠連結夥伴訂單欄位消毒：底價成本屬平台機密，不可回傳給 referral。
 */

export function stripPartnerOrderCostFields(order) {
  if (!order || typeof order !== "object") return order;
  const next = { ...order };
  delete next.b2b_cost;

  const stripLines = (lines) =>
    (lines || []).map((line) => {
      if (!line || typeof line !== "object") return line;
      const { b2b_cost: _omit, cost_price: _c, ...rest } = line;
      return rest;
    });

  if (Array.isArray(next.item_details)) {
    next.item_details = stripLines(next.item_details);
  } else if (typeof next.item_details === "string") {
    try {
      const parsed = JSON.parse(next.item_details);
      if (Array.isArray(parsed)) {
        next.item_details = stripLines(parsed);
      }
    } catch {
      /* 保留原字串 */
    }
  }

  // items 欄位若存在也一併清
  if (Array.isArray(next.items)) {
    next.items = stripLines(next.items);
  }

  return next;
}

/** referral 查詢用欄位（刻意不含 b2b_cost） */
export const REFERRAL_ORDER_SELECT = [
  "id",
  "created_at",
  "updated_at",
  "status",
  "partner_id",
  "store_id",
  "channel",
  "referral_code",
  "medusa_order_id",
  "customer_email",
  "customer_name",
  "total_amount",
  "total_price",
  "partner_profit",
  "item_details",
  "items",
  "payment_info",
  "refunded_at",
  "esim_activation_status",
  "qrcode_data",
].join(", ");
