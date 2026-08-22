/** analytics report order（camelCase）→ 夥伴 orders 頁 snake_case */
export function reportOrderToPartnerShape(order) {
  if (!order) return null;
  return {
    id: order.id,
    status: order.status,
    created_at: order.createdAt,
    customer_name: order.customerName || "",
    customer_email: order.customerEmail || "",
    payment_info: order.paymentInfo,
    total_amount: order.totalAmount,
    b2b_cost: order.b2bCost,
    partner_profit: order.partnerProfit,
    item_details: order.itemDetails,
    medusa_order_id: order.medusaOrderId || "",
    platform_profit: order.platformProfit,
  };
}

export function reportOrdersToPartnerShape(orders = []) {
  return (orders || []).map(reportOrderToPartnerShape).filter(Boolean);
}
