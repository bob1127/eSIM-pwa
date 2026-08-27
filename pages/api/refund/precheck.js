import {
  resolveRefundMember,
  getSupabaseAdmin,
  loadOwnedRefundOrder,
} from "../../../lib/refundAuth";
import {
  isNativeEsimOrder,
  NATIVE_ESIM_REFUND_MESSAGE,
  getRefundEligibility,
} from "../../../lib/refundPolicy";
import { checkRefundAbuseLimit } from "../../../lib/refundAbuse";
import { extractEsimsFromOrders } from "../../../lib/esimOrderExtract";
import { inferEsimInstalled } from "../../../lib/esimInstallStatus";
import { queryEsimUsage } from "../../../lib/esimUsageService";
import { CONTACT_INFO } from "../../../lib/contactUi";

/**
 * POST /api/refund/precheck
 * 退款防呆：原生 eSIM 擋下；向供應商查用量自動判未開通／已開通
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const member = await resolveRefundMember(req, res);
  if (!member?.email) {
    return res.status(401).json({ error: "請先登入" });
  }
  const userEmail = member.email;
  const emails = member.emails || [userEmail];

  const body = req.body || {};
  const orderId = body.order_id;
  if (!orderId) {
    return res.status(400).json({ error: "缺少 order_id" });
  }

  const supabaseAdmin = getSupabaseAdmin();
  let order = null;

  if (supabaseAdmin) {
    const loaded = await loadOwnedRefundOrder(
      supabaseAdmin,
      orderId,
      emails,
      member.lineUserId || null,
    );
    if (loaded.forbidden) {
      // LINE／結帳信箱不一致時：會員列表已能看到此單，允許用前端快照做預檢
      // （真正提交仍走 request API 的歸屬檢查）
      const hasSnapshot =
        body.status ||
        body.item_details ||
        body.qrcode_data ||
        body.created_at;
      if (!hasSnapshot) {
        return res.status(403).json({ error: "無權限操作此訂單" });
      }
      order = null;
    } else {
      order = loaded.order;
    }
  }

  // Medusa 主站單可能尚未寫入 Supabase：用前端快照做防呆判斷
  if (!order) {
    const snapshotEmail = String(
      body.customer_email || body.email || "",
    ).toLowerCase();
    if (
      snapshotEmail &&
      !emails.includes(snapshotEmail) &&
      body.__source === "medusa"
    ) {
      // 仍允許：會員列表已過濾本人訂單；LINE／結帳信箱可能不一致
    }
    order = {
      id: orderId,
      status: body.status || "completed",
      created_at: body.created_at || new Date().toISOString(),
      item_details: body.item_details || [],
      qrcode_data: body.qrcode_data || [],
      esim_activation_status: body.esim_activation_status || null,
      customer_email: snapshotEmail || userEmail,
      metadata: body.metadata || {},
      is_native: body.is_native,
      native_esim: body.native_esim,
    };
  } else if (body.item_details && !order.item_details) {
    order = { ...order, item_details: body.item_details };
  }
  if (body.qrcode_data && !order.qrcode_data) {
    order = { ...order, qrcode_data: body.qrcode_data };
  }

  if (isNativeEsimOrder(order) || body.force_native === true) {
    return res.status(200).json({
      ok: false,
      blocked: "native",
      code: "NATIVE_ESIM",
      message: NATIVE_ESIM_REFUND_MESSAGE,
      activated: null,
      requestType: null,
    });
  }

  if (supabaseAdmin) {
    const abuse = await checkRefundAbuseLimit(supabaseAdmin, emails);
    if (abuse.blocked) {
      return res.status(200).json({
        ok: false,
        blocked: "abuse",
        code: abuse.code,
        message: abuse.message,
        approvedCount: abuse.approvedCount,
        days: abuse.days,
        maxApproved: abuse.maxApproved,
        lineUrl: CONTACT_INFO.lineUrl,
        showLineCta: true,
        activated: null,
        requestType: null,
      });
    }
  }

  const esims = extractEsimsFromOrders([order]);
  let topupId = body.topupId || null;
  let iccid = body.iccid || null;
  if (!topupId && !iccid && esims[0]) {
    topupId = esims[0].missingTopupId ? null : esims[0].topupId;
    iccid = esims[0].iccid || null;
  }
  // 假 topup key（iccid:…）不要送給供應商
  if (topupId && String(topupId).startsWith("iccid:")) {
    if (!iccid) iccid = String(topupId).replace(/^iccid:/, "");
    topupId = null;
  }

  let activated = isOrderEsimActivatedLocal(order);
  let activationProbe = "order_field";
  let usageOk = false;

  if (topupId || iccid) {
    try {
      const usage = await queryEsimUsage({ topupId, iccid });
      usageOk = Boolean(usage?.ok);
      const installed = inferEsimInstalled(usage?.ok ? usage.data || usage : usage);
      if (installed === true) {
        activated = true;
        activationProbe = "supplier_usage";
      } else if (installed === false && !activated) {
        activated = false;
        activationProbe = "supplier_unused";
      } else if (installed == null && usageOk) {
        // 有查到但無法斷定 → 維持訂單欄位；全額退款仍允許，後續人工／再查
        activationProbe = "supplier_unknown";
      }
    } catch (e) {
      activationProbe = "supplier_error";
      console.warn("[refund/precheck] usage", e?.message || e);
    }
  } else {
    activationProbe = "no_topup_iccid";
  }

  // 寫回 Supabase（有列才更新）
  if (supabaseAdmin && order?.id && !String(order.id).startsWith("order_")) {
    try {
      await supabaseAdmin
        .from("orders")
        .update({
          esim_activation_status: activated ? "activated" : "unused",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
    } catch {
      /* ignore */
    }
  }

  const enriched = {
    ...order,
    esim_activation_status: activated ? "activated" : "unused",
  };
  const eligibility = getRefundEligibility(enriched);

  if (eligibility.code === "NATIVE_ESIM") {
    return res.status(200).json({
      ok: false,
      blocked: "native",
      code: "NATIVE_ESIM",
      message: NATIVE_ESIM_REFUND_MESSAGE,
      activated,
      activationProbe,
    });
  }

  if (!eligibility.canApply) {
    return res.status(200).json({
      ok: false,
      blocked: "ineligible",
      code: eligibility.code,
      message: eligibility.hint || "目前無法申請退款",
      activated,
      activationProbe,
      eligibility,
    });
  }

  return res.status(200).json({
    ok: true,
    blocked: null,
    activated,
    activationProbe,
    usageOk,
    requestType: eligibility.requestType,
    eligibility,
    esim_activation_status: activated ? "activated" : "unused",
    message: activated
      ? "系統偵測此 eSIM 已開通／已使用，將改為售後爭議申請（須舉證）。"
      : "系統偵測尚未開通，可申請未開通全額退款。",
  });
}

function isOrderEsimActivatedLocal(order) {
  return String(order?.esim_activation_status || "").toLowerCase() === "activated";
}
