import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSupabaseAdmin } from "../../../lib/partnerServer";
import {
  netRemitAmount,
  WITHDRAWAL_STATUS_LABEL,
} from "../../../lib/partnerPayout";
import { remittanceMemo } from "../../../lib/partnerSettlementStatement";

const ALLOWED = new Set(["approved", "rejected", "remitted", "cancelled"]);

function mapAdminRequest(r, partnerMap, bankMap) {
  const fee = Math.round(Number(r.fee_amount) || 0);
  const amount = Math.round(Number(r.amount) || 0);
  return {
    ...r,
    fee_amount: fee,
    net_amount: netRemitAmount(amount, fee),
    status_label: WITHDRAWAL_STATUS_LABEL[r.status] || r.status,
    partner: partnerMap[r.partner_id] || null,
    bank: bankMap[r.partner_id] || null,
  };
}

export default async function handler(req, res) {
  try {
    await requireMedusaAdminFromRequest(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "未授權" });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: "伺服器設定不完整" });
  }

  if (req.method === "GET") {
    const partnerId = req.query.partner_id
      ? Number(req.query.partner_id)
      : null;
    const status = String(req.query.status || "").trim();
    let q = supabase
      .from("partner_withdrawal_requests")
      .select(
        "id, partner_id, amount, fee_amount, status, requested_at, processed_at, remitted_at, admin_note, remittance_memo, created_at",
      )
      .order("requested_at", { ascending: false })
      .limit(200);
    if (Number.isFinite(partnerId) && partnerId > 0) {
      q = q.eq("partner_id", partnerId);
    }
    if (status && (ALLOWED.has(status) || status === "pending")) {
      q = q.eq("status", status);
    }
    let { data, error } = await q;
    if (error && /fee_amount/i.test(error.message || "")) {
      let q2 = supabase
        .from("partner_withdrawal_requests")
        .select(
          "id, partner_id, amount, status, requested_at, processed_at, remitted_at, admin_note, remittance_memo, created_at",
        )
        .order("requested_at", { ascending: false })
        .limit(200);
      if (Number.isFinite(partnerId) && partnerId > 0) {
        q2 = q2.eq("partner_id", partnerId);
      }
      if (status && (ALLOWED.has(status) || status === "pending")) {
        q2 = q2.eq("status", status);
      }
      ({ data, error } = await q2);
    }
    if (error) {
      if (/does not exist|schema cache/i.test(error.message || "")) {
        return res.status(200).json({ requests: [], missingTable: true });
      }
      return res.status(500).json({ error: error.message });
    }

    const partnerIds = [
      ...new Set((data || []).map((r) => r.partner_id).filter(Boolean)),
    ];
    if (
      Number.isFinite(partnerId) &&
      partnerId > 0 &&
      !partnerIds.includes(partnerId)
    ) {
      partnerIds.push(partnerId);
    }
    let partnerMap = {};
    if (partnerIds.length) {
      const { data: partners } = await supabase
        .from("partners")
        .select("id, name, referral_code, slug, email")
        .in("id", partnerIds);
      for (const p of partners || []) partnerMap[p.id] = p;
    }

    const bankMap = {};
    if (partnerIds.length) {
      const { data: banks } = await supabase
        .from("partner_bank_accounts")
        .select(
          "partner_id, bank_name, bank_code, branch_name, account_name, account_number",
        )
        .in("partner_id", partnerIds);
      for (const b of banks || []) bankMap[b.partner_id] = b;
    }

    return res.status(200).json({
      bank:
        Number.isFinite(partnerId) && partnerId > 0
          ? bankMap[partnerId] || null
          : null,
      requests: (data || []).map((r) =>
        mapAdminRequest(r, partnerMap, bankMap),
      ),
    });
  }

  if (req.method === "PATCH") {
    const id = Number(req.body?.id);
    const status = String(req.body?.status || "").trim();
    const admin_note = String(req.body?.admin_note || "").trim().slice(0, 500);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "缺少申請 id" });
    }
    if (!ALLOWED.has(status) && status !== "pending") {
      return res.status(400).json({ error: "無效狀態" });
    }

    const { data: row, error: findErr } = await supabase
      .from("partner_withdrawal_requests")
      .select("id, partner_id, amount, status, requested_at")
      .eq("id", id)
      .maybeSingle();
    if (findErr) return res.status(500).json({ error: findErr.message });
    if (!row) return res.status(404).json({ error: "找不到申請" });

    const patch = {
      status,
      admin_note,
      updated_at: new Date().toISOString(),
    };
    if (status === "approved" || status === "rejected") {
      patch.processed_at = new Date().toISOString();
    }
    if (status === "remitted") {
      patch.remitted_at = new Date().toISOString();
      if (!patch.processed_at) patch.processed_at = patch.remitted_at;
      const when = new Date(row.requested_at || Date.now());
      const y = Number(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Taipei",
          year: "numeric",
        }).format(when),
      );
      const m = Number(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Taipei",
          month: "numeric",
        }).format(when),
      );
      const { data: partner } = await supabase
        .from("partners")
        .select("referral_code, slug")
        .eq("id", row.partner_id)
        .maybeSingle();
      patch.remittance_memo = remittanceMemo(
        y,
        m,
        partner?.referral_code || partner?.slug || row.partner_id,
      );
    }

    const { data: updated, error } = await supabase
      .from("partner_withdrawal_requests")
      .update(patch)
      .eq("id", id)
      .select(
        "id, partner_id, amount, status, requested_at, processed_at, remitted_at, admin_note, remittance_memo",
      )
      .single();
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      request: {
        ...updated,
        status_label: WITHDRAWAL_STATUS_LABEL[updated.status] || updated.status,
      },
    });
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  return res.status(405).end("Method Not Allowed");
}
