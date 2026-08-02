import { createClient } from "@supabase/supabase-js";
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import {
  buildPartnerSettlementStatement,
  renderSettlementStatementHtml,
  settlementStatementFilename,
} from "../../../lib/partnerSettlementStatement";

const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

/**
 * GET /api/admin/partner-settlement-statement
 *   ?partner_id=123&year=2026&month=7
 *   &format=html|json  (default html — 可另存／列印為 PDF)
 */
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
    return res.status(500).json({
      error: "伺服器未設定 SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  const partnerId = Number(req.query.partner_id);
  const now = new Date();
  const taipei = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }),
  );
  // 預設：上個月（通常是要結算的成交月）
  const defaultMonthDate = new Date(taipei.getFullYear(), taipei.getMonth() - 1, 1);
  const year = Number(req.query.year) || defaultMonthDate.getFullYear();
  const month = Number(req.query.month) || defaultMonthDate.getMonth() + 1;
  const format = String(req.query.format || "html").toLowerCase();

  if (!Number.isFinite(partnerId) || partnerId <= 0) {
    return res.status(400).json({ error: "缺少 partner_id" });
  }
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: "無效的 year / month" });
  }

  const { data: partner, error: partnerErr } = await supabaseAdmin
    .from("partners")
    .select(
      "id, name, email, slug, status, cooperation_model, referral_code, referral_rate",
    )
    .eq("id", partnerId)
    .maybeSingle();

  if (partnerErr) {
    return res.status(500).json({ error: partnerErr.message });
  }
  if (!partner) {
    return res.status(404).json({ error: "找不到夥伴" });
  }

  const { data: orders, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select(
      "id, status, partner_id, total_amount, b2b_cost, partner_profit, item_details, items, created_at, refunded_at",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: true })
    .limit(5000);

  if (orderErr) {
    return res.status(500).json({ error: orderErr.message });
  }

  const { data: withdrawals, error: wdErr } = await supabaseAdmin
    .from("partner_withdrawal_requests")
    .select(
      "id, amount, status, requested_at, processed_at, remitted_at, remittance_memo, created_at",
    )
    .eq("partner_id", partnerId)
    .eq("status", "remitted")
    .limit(500);

  const withdrawalRows =
    wdErr && /does not exist|schema cache/i.test(wdErr.message || "")
      ? []
      : withdrawals || [];

  let statement;
  try {
    statement = buildPartnerSettlementStatement(
      partner,
      orders || [],
      { year, month },
      withdrawalRows,
    );
  } catch (e) {
    return res.status(400).json({ error: e.message || "無法產製對帳單" });
  }

  const filename = settlementStatementFilename(statement);
  const html = renderSettlementStatementHtml(statement);

  if (format === "json") {
    return res.status(200).json({
      filename,
      statement: {
        ...statement,
        rows: statement.rows,
      },
      html,
    });
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  return res.status(200).send(html);
}
