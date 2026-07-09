import { createClient } from "@supabase/supabase-js";
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { buildPartnerSalesReport } from "../../../lib/adminAnalytics";

const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: "伺服器未設定 SUPABASE_SERVICE_ROLE_KEY" });
  }

  const {
    partner_id: partnerId,
    store_id: storeId,
    status = "all",
    days = "30",
  } = req.query;

  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
      id, status, partner_id, store_id, customer_email,
      total_amount, b2b_cost, partner_profit, item_details, items,
      created_at, updated_at, refunded_at,
      partners ( id, name, slug, email, status ),
      stores ( id, store_name, domain, markup_rate )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const { data: partners } = await supabaseAdmin
    .from("partners")
    .select("id, name, slug, status")
    .order("name");

  const { data: stores } = await supabaseAdmin
    .from("stores")
    .select("id, store_name, domain, markup_rate")
    .order("store_name");

  const report = buildPartnerSalesReport(orders || [], {
    partnerId: partnerId ? Number(partnerId) : null,
    storeId: storeId ? Number(storeId) : null,
    status,
    days: Number(days) || 30,
  });

  return res.status(200).json({
    filters: {
      partnerId: partnerId ? Number(partnerId) : null,
      storeId: storeId ? Number(storeId) : null,
      status,
      days: Number(days) || 30,
    },
    partners: partners || [],
    stores: stores || [],
    report,
  });
}
