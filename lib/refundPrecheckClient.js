/**
 * 客戶端：退款前打 precheck（原生擋下／自動判開通）
 */
export async function runRefundPrecheck(order, getAuthHeaders) {
  const auth = typeof getAuthHeaders === "function" ? await getAuthHeaders() : {};
  const res = await fetch("/api/refund/precheck", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...auth,
    },
    body: JSON.stringify({
      order_id: order.id,
      status: order.status,
      created_at: order.created_at,
      item_details: order.item_details ?? order.items,
      qrcode_data: order.qrcode_data,
      esim_activation_status: order.esim_activation_status,
      metadata: order.metadata,
      customer_email: order.customer_email || order.email || null,
      is_native: order.is_native,
      native_esim: order.native_esim,
      __source: order.__source || null,
      medusa_order_id: order.medusa_order_id || null,
      display_id: order.display_id || null,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "無法檢查退款資格，請稍後再試");
  }
  return data;
}

export function enrichOrderFromPrecheck(order, precheck) {
  if (!order || !precheck) return order;
  return {
    ...order,
    esim_activation_status:
      precheck.esim_activation_status ||
      (precheck.activated ? "activated" : "unused"),
  };
}
