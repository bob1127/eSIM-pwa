/**
 * 呼叫 Medusa /store/member-orders，回傳已適配成會員頁格式的訂單陣列。
 * （與 pages/api/orders/user-orders 同一條內部密鑰路徑）
 */
import { adaptMedusaOrders } from "./medusaMemberOrderAdapter";

function getInternalSecret() {
  return (
    process.env.MEMBER_ORDERS_INTERNAL_SECRET ||
    process.env.FULFILLMENT_INTERNAL_SECRET ||
    process.env.PRODUCT_CONTENT_ADMIN_SECRET ||
    ""
  );
}

/**
 * @param {{ emails?: string[], lineUserId?: string|null, supabaseUserId?: string|null }} opts
 * @returns {Promise<object[]>} adaptMedusaOrders 結果
 */
export async function fetchMedusaMemberOrders({
  emails = [],
  lineUserId = null,
  supabaseUserId = null,
} = {}) {
  const secret = getInternalSecret();
  if (!secret) {
    console.warn("[medusaMemberOrders] 缺少內部密鑰，略過 Medusa 查單");
    return [];
  }

  const emailList = (Array.isArray(emails) ? emails : [])
    .map((e) => String(e || "").trim().toLowerCase())
    .filter(Boolean);

  const qs = new URLSearchParams();
  if (emailList.length) qs.set("emails", emailList.join(","));
  if (lineUserId) qs.set("line_user_id", String(lineUserId));
  if (supabaseUserId) qs.set("supabase_user_id", String(supabaseUserId));
  if (Array.from(qs.keys()).length === 0) return [];

  const base = (
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  ).replace(/\/$/, "");
  const pub = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

  try {
    const res = await fetch(`${base}/store/member-orders?${qs.toString()}`, {
      method: "GET",
      headers: {
        "x-internal-secret": secret,
        ...(pub ? { "x-publishable-api-key": pub } : {}),
      },
    });
    if (!res.ok) {
      console.error("[medusaMemberOrders] Medusa 查單失敗:", res.status);
      return [];
    }
    const data = await res.json().catch(() => ({}));
    return adaptMedusaOrders(data.orders || []);
  } catch (err) {
    console.error("[medusaMemberOrders] 例外:", err?.message || err);
    return [];
  }
}
