import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSupabaseAdmin } from "../../../lib/refundAuth";
import {
  buildRefundRiskContext,
  scoreRefundRisk,
  riskFlagLabel,
} from "../../../lib/refundAbuse";
import { extractEsimsFromOrders } from "../../../lib/esimOrderExtract";
import { inferEsimInstalled } from "../../../lib/esimInstallStatus";
import { queryEsimUsage } from "../../../lib/esimUsageService";

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要管理員登入" });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "伺服器未設定 SUPABASE_SERVICE_ROLE_KEY" });
  }

  if (req.method === "GET") {
    const status = req.query.status || "pending";

    let query = supabaseAdmin
      .from("refund_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (status === "high_risk") {
      query = query.eq("status", "pending");
    } else if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: requests, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const orderIds = [...new Set((requests || []).map((r) => r.order_id))];
    let ordersMap = {};
    if (orderIds.length) {
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select(
          "id, total_amount, customer_email, item_details, created_at, status, partner_id, store_id, qrcode_data, esim_activation_status",
        )
        .in("id", orderIds);
      ordersMap = Object.fromEntries((orders || []).map((o) => [o.id, o]));
    }

    let enriched = (requests || []).map((r) => ({
      ...r,
      order: ordersMap[r.order_id] || null,
    }));

    const riskCtx = await buildRefundRiskContext(supabaseAdmin, enriched);
    enriched = enriched.map((r) => {
      const risk = scoreRefundRisk(r, riskCtx);
      return {
        ...r,
        ...risk,
        riskFlagLabels: (risk.riskFlags || []).map(riskFlagLabel),
      };
    });

    if (status === "high_risk") {
      enriched = enriched.filter((r) => r.isHighRisk);
      enriched.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
    }

    return res.status(200).json({ requests: enriched });
  }

  if (req.method === "PATCH") {
    const { id, action, admin_note, esim_activation_status } = req.body || {};
    if (!id || !action) {
      return res.status(400).json({ error: "缺少 id 或 action" });
    }
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "action 須為 approve 或 reject" });
    }

    const { data: request, error: fetchErr } = await supabaseAdmin
      .from("refund_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !request) {
      return res.status(404).json({ error: "找不到退款申請" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ error: "此申請已審核完畢" });
    }

    const now = new Date().toISOString();
    const reviewer = admin.email || admin.id || "admin";

    // 核准前：未開通全額退款再向供應商查一次用量（已有人工狀態則仍以人工為準，但阻擋明確已使用）
    let liveActivation = esim_activation_status || request.esim_activation_status || null;
    if (action === "approve" && request.request_type === "full_refund") {
      try {
        const { data: orderRow } = await supabaseAdmin
          .from("orders")
          .select("id, item_details, qrcode_data, esim_activation_status")
          .eq("id", request.order_id)
          .maybeSingle();
        if (orderRow) {
          const esims = extractEsimsFromOrders([orderRow]);
          const first = esims[0];
          let topupId = first?.missingTopupId ? null : first?.topupId || null;
          let iccid = first?.iccid || null;
          if (topupId && String(topupId).startsWith("iccid:")) {
            if (!iccid) iccid = String(topupId).replace(/^iccid:/, "");
            topupId = null;
          }
          if (topupId || iccid) {
            const usage = await queryEsimUsage({ topupId, iccid });
            const installed = inferEsimInstalled(
              usage?.ok ? usage.data || usage : usage,
            );
            if (installed === true) {
              return res.status(400).json({
                error:
                  "供應商查詢顯示此 eSIM 已開通／已使用，無法以「未開通」核准退款。請改駁回或改為售後爭議流程。",
                code: "SUPPLIER_ACTIVATED",
                supplierActivated: true,
              });
            }
            if (installed === false) {
              liveActivation = "not_activated";
            }
          }
        }
      } catch (e) {
        console.warn("[admin/refunds] supplier recheck", e?.message || e);
      }
    }

    if (action === "approve") {
      const { error: reqErr } = await supabaseAdmin
        .from("refund_requests")
        .update({
          status: "approved",
          admin_note: admin_note?.trim() || null,
          esim_activation_status: liveActivation || request.esim_activation_status,
          reviewed_at: now,
          reviewed_by: reviewer,
          updated_at: now,
        })
        .eq("id", id);

      if (reqErr) {
        return res.status(500).json({ error: reqErr.message });
      }

      await supabaseAdmin
        .from("orders")
        .update({
          status: "refunded",
          refunded_at: now,
          esim_activation_status: liveActivation || "unknown",
          partner_profit: 0,
          updated_at: now,
        })
        .eq("id", request.order_id);

      return res.status(200).json({ success: true, status: "approved" });
    }

    const { error: reqErr } = await supabaseAdmin
      .from("refund_requests")
      .update({
        status: "rejected",
        admin_note: admin_note?.trim() || "未符合退換貨政策",
        esim_activation_status: liveActivation || request.esim_activation_status,
        reviewed_at: now,
        reviewed_by: reviewer,
        updated_at: now,
      })
      .eq("id", id);

    if (reqErr) {
      return res.status(500).json({ error: reqErr.message });
    }

    await supabaseAdmin
      .from("orders")
      .update({ status: "completed", updated_at: now })
      .eq("id", request.order_id);

    return res.status(200).json({ success: true, status: "rejected" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
