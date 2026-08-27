import {
  resolveRefundMember,
  getSupabaseAdmin,
  loadOwnedRefundOrder,
} from "../../../lib/refundAuth";
import {
  REFUND_FULL_DAYS,
  REFUND_DISPUTE_DAYS,
  REFUND_REASONS_FULL,
  REFUND_REASONS_DISPUTE,
  daysSince,
  MAX_REFUND_IMAGES,
  isOrderEsimActivated,
  isNativeEsimOrder,
  NATIVE_ESIM_REFUND_MESSAGE,
} from "../../../lib/refundPolicy";
import { checkRefundAbuseLimit } from "../../../lib/refundAbuse";
import { extractEsimsFromOrders } from "../../../lib/esimOrderExtract";
import { inferEsimInstalled } from "../../../lib/esimInstallStatus";
import { queryEsimUsage } from "../../../lib/esimUsageService";
import { CONTACT_INFO } from "../../../lib/contactUi";

const VALID_REASONS = {
  full_refund: REFUND_REASONS_FULL.map((r) => r.value),
  dispute: REFUND_REASONS_DISPUTE.map((r) => r.value),
};

export default async function handler(req, res) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "伺服器未設定 SUPABASE_SERVICE_ROLE_KEY" });
  }

  if (req.method === "GET") {
    const member = await resolveRefundMember(req, res);
    if (!member?.email) {
      return res.status(401).json({ error: "請先登入" });
    }

    const emails = member.emails || [member.email];
    const { data, error } = await supabaseAdmin
      .from("refund_requests")
      .select("*")
      .in("customer_email", emails)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ requests: data || [] });
  }

  if (req.method === "POST") {
    const member = await resolveRefundMember(req, res);
    if (!member?.email) {
      return res.status(401).json({ error: "請先登入" });
    }
    const userEmail = member.email;
    const emails = member.emails || [userEmail];

    const {
      order_id,
      request_type,
      reason_type,
      reason_note,
      device_model,
      activation_claim,
      image_urls,
      agreed_terms,
    } = req.body || {};

    if (!order_id || !request_type || !reason_type) {
      return res.status(400).json({ error: "缺少必要欄位" });
    }
    if (!agreed_terms) {
      return res.status(400).json({ error: "請勾選同意退換貨政策" });
    }
    if (!["full_refund", "dispute"].includes(request_type)) {
      return res.status(400).json({ error: "無效的申請類型" });
    }
    if (!VALID_REASONS[request_type].includes(reason_type)) {
      return res.status(400).json({ error: "無效的退款原因" });
    }

    const loaded = await loadOwnedRefundOrder(
      supabaseAdmin,
      order_id,
      emails,
      member.lineUserId || null,
    );
    if (loaded.forbidden) {
      return res.status(403).json({ error: "無權限操作此訂單" });
    }
    const order = loaded.order;
    if (!order) {
      return res.status(404).json({
        error: "找不到訂單",
        hint: "主站 Medusa 訂單若尚未同步至退款資料庫，請稍後再試或聯絡客服",
      });
    }

    const status = String(order.status || "").toLowerCase();
    if (status === "refunded" || status === "refund_pending") {
      return res.status(400).json({ error: "此訂單已有退款申請或已退款" });
    }
    if (status !== "completed") {
      return res.status(400).json({ error: "僅已完成付款的訂單可申請退款" });
    }

    if (isNativeEsimOrder(order)) {
      return res.status(400).json({
        error: NATIVE_ESIM_REFUND_MESSAGE,
        code: "NATIVE_ESIM",
      });
    }

    const abuse = await checkRefundAbuseLimit(supabaseAdmin, emails);
    if (abuse.blocked) {
      return res.status(403).json({
        error: abuse.message,
        code: abuse.code,
        blocked: "abuse",
        approvedCount: abuse.approvedCount,
        days: abuse.days,
        maxApproved: abuse.maxApproved,
        lineUrl: CONTACT_INFO.lineUrl,
        showLineCta: true,
      });
    }

    const { data: existingPending } = await supabaseAdmin
      .from("refund_requests")
      .select("id")
      .eq("order_id", order_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      return res.status(400).json({ error: "此訂單已有審核中的退款申請" });
    }

    // 提交當下再向供應商查一次開通狀態（防呆）
    let liveActivated = isOrderEsimActivated(order);
    try {
      const esims = extractEsimsFromOrders([order]);
      const first = esims[0];
      let topupId = first?.missingTopupId ? null : first?.topupId || null;
      let iccid = first?.iccid || null;
      if (topupId && String(topupId).startsWith("iccid:")) {
        if (!iccid) iccid = String(topupId).replace(/^iccid:/, "");
        topupId = null;
      }
      if (topupId || iccid) {
        const usage = await queryEsimUsage({ topupId, iccid });
        if (inferEsimInstalled(usage?.ok ? usage.data || usage : usage) === true) {
          liveActivated = true;
          await supabaseAdmin
            .from("orders")
            .update({
              esim_activation_status: "activated",
              updated_at: new Date().toISOString(),
            })
            .eq("id", order_id);
        }
      }
    } catch (e) {
      console.warn("[refund/request] live activation check", e?.message || e);
    }

    const age = daysSince(order.created_at);

    if (request_type === "full_refund") {
      if (liveActivated) {
        return res.status(400).json({
          error: "系統偵測此 eSIM 已開通／已使用，請改用「售後爭議」並上傳舉證資料",
          code: "ACTIVATED",
        });
      }
      if (age > REFUND_FULL_DAYS) {
        return res.status(400).json({
          error: `未開通退款須於購買後 ${REFUND_FULL_DAYS} 日內提出`,
        });
      }
      if (activation_claim !== "not_activated") {
        return res.status(400).json({
          error: "未開通退款須確認尚未掃描 QR Code",
        });
      }
    }

    if (request_type === "dispute") {
      if (age > REFUND_DISPUTE_DAYS) {
        return res.status(400).json({
          error: `售後爭議須於購買後 ${REFUND_DISPUTE_DAYS} 日內提出`,
        });
      }
      if (!device_model?.trim()) {
        return res.status(400).json({ error: "請填寫手機型號" });
      }
      if (!reason_note?.trim() || reason_note.trim().length < 10) {
        return res.status(400).json({ error: "請詳述問題（至少 10 字）" });
      }
      const imgs = Array.isArray(image_urls) ? image_urls : [];
      if (imgs.length < 1) {
        return res.status(400).json({ error: "爭議申請須上傳至少 1 張截圖" });
      }
      if (imgs.length > MAX_REFUND_IMAGES) {
        return res.status(400).json({ error: `最多 ${MAX_REFUND_IMAGES} 張截圖` });
      }
    }

    const now = new Date().toISOString();
    const insertRow = {
      order_id,
      customer_email: userEmail,
      request_type,
      reason_type,
      reason_note: reason_note?.trim() || null,
      device_model: device_model?.trim() || null,
      activation_claim:
        request_type === "full_refund"
          ? "not_activated"
          : activation_claim || (liveActivated ? "activated" : null),
      image_urls: Array.isArray(image_urls) ? image_urls : [],
      status: "pending",
      agreed_terms_at: now,
      esim_activation_status: liveActivated ? "activated" : "unused",
      created_at: now,
      updated_at: now,
    };

    const { data: created, error: insertErr } = await supabaseAdmin
      .from("refund_requests")
      .insert(insertRow)
      .select("*")
      .single();

    if (insertErr) {
      console.error("[refund request insert]", insertErr);
      return res.status(500).json({ error: insertErr.message });
    }

    await supabaseAdmin
      .from("orders")
      .update({ status: "refund_pending", updated_at: now })
      .eq("id", order_id);

    return res.status(201).json({ success: true, request: created });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
