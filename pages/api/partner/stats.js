import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import {
  REFERRAL_ORDER_SELECT,
  stripPartnerOrderCostFields,
} from "../../../lib/partnerOrderSanitize";
import { isSettledOrderStatus } from "../../../lib/refundPolicy";

/**
 * GET /api/partner/stats
 * 夥伴後台訂單統計。referral 永不回傳 b2b_cost（含 item_details）。
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: "伺服器設定不完整" });
  }

  const user = await getAuthUserFromBearer(req);
  if (!user) return res.status(401).json({ error: "請先登入" });

  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.partner) {
    return res.status(403).json({ error: access.message || "無夥伴權限" });
  }

  const partner = access.partner;
  const store = access.store;
  const partnerId = partner.id;
  const isReferral = partner.cooperation_model === "referral";

  try {
    let query = supabase
      .from("orders")
      .select(isReferral ? REFERRAL_ORDER_SELECT : "*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(5000);

    let { data: orders, error } = await query;

    // 舊庫缺 channel／referral_code 欄位時降級
    if (
      error &&
      isReferral &&
      /channel|referral_code|column/i.test(error.message || "")
    ) {
      ({ data: orders, error } = await supabase
        .from("orders")
        .select(
          "id, created_at, updated_at, status, partner_id, store_id, medusa_order_id, customer_email, customer_name, total_amount, total_price, partner_profit, item_details, items, payment_info, refunded_at, esim_activation_status, qrcode_data",
        )
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(5000));
    }

    if (error) {
      return res.status(500).json({ error: error.message || "讀取訂單失敗" });
    }

    const raw = orders || [];
    const clientOrders = isReferral
      ? raw.map(stripPartnerOrderCostFields)
      : raw;

    const valid = clientOrders.filter((o) => isSettledOrderStatus(o.status));
    const totalProfit = valid.reduce(
      (sum, o) => sum + (Number(o.partner_profit) || 0),
      0,
    );
    const totalRevenue = valid.reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0,
    );
    const totalCost = isReferral
      ? 0
      : valid.reduce((sum, o) => sum + (Number(o.b2b_cost) || 0), 0);

    let productCount = 0;
    const storeId = store?.id || null;
    if (storeId && !isReferral) {
      const { count } = await supabase
        .from("store_products")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId);
      productCount = count || 0;
    }

    return res.status(200).json({
      orders: clientOrders,
      validOrders: valid,
      totalProfit,
      totalRevenue,
      totalCost,
      orderCount: valid.length,
      productCount,
      hideCost: isReferral,
      cooperation_model: partner.cooperation_model || "store",
    });
  } catch (err) {
    console.error("[partner/stats]", err);
    return res.status(500).json({ error: err.message || "伺服器錯誤" });
  }
}
