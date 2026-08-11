import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSupabaseAdmin } from "../../../lib/partnerServer";
import {
  netRemitAmount,
  WITHDRAWAL_STATUS_LABEL,
  payoutAccountsEqual,
  buildPayoutSnapshot,
} from "../../../lib/partnerPayout";
import {
  remittanceMemo,
  remittanceMemoForWithdrawal,
} from "../../../lib/partnerSettlementStatement";

const ALLOWED = new Set(["approved", "rejected", "remitted", "cancelled"]);

function mapAdminRequest(r, partnerMap, bankMap, storeMap) {
  const fee = Math.round(Number(r.fee_amount) || 0);
  const amount = Math.round(Number(r.amount) || 0);
  const bank = bankMap[r.partner_id] || null;
  const snapshot =
    r.payout_snapshot && typeof r.payout_snapshot === "object"
      ? r.payout_snapshot
      : null;
  const partner = partnerMap[r.partner_id] || null;
  const storeKey = partner?.slug || partner?.referral_code;
  const store = storeKey ? storeMap[String(storeKey)] || null : null;
  return {
    ...r,
    fee_amount: fee,
    net_amount: netRemitAmount(amount, fee),
    status_label: WITHDRAWAL_STATUS_LABEL[r.status] || r.status,
    partner,
    store,
    /** 匯款請以目前帳戶為準（夥伴可能在申請後修改） */
    bank,
    payout_snapshot: snapshot,
    bank_changed_since_request: !!(
      snapshot &&
      bank &&
      !payoutAccountsEqual(snapshot, buildPayoutSnapshot(bank))
    ),
  };
}

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要管理員登入" });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: "伺服器設定不完整" });
  }

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    const partnerId = req.query.partner_id
      ? Number(req.query.partner_id)
      : null;
    const status = String(req.query.status || "").trim() || "pending";
    // 指定夥伴時預設看全部狀態（詳情頁審核用）；總表仍預設 pending
    const effectiveStatus =
      Number.isFinite(partnerId) && partnerId > 0 && !req.query.status
        ? "all"
        : status;
    let q = supabase
      .from("partner_withdrawal_requests")
      .select(
        "id, partner_id, amount, fee_amount, status, requested_at, processed_at, remitted_at, admin_note, remittance_memo, payout_snapshot, created_at",
      )
      .order("requested_at", { ascending: false })
      .limit(200);
    if (Number.isFinite(partnerId) && partnerId > 0) {
      q = q.eq("partner_id", partnerId);
    }
    if (effectiveStatus && effectiveStatus !== "all") {
      q = q.eq("status", effectiveStatus);
    }
    let { data, error } = await q;
    if (error && /fee_amount|payout_snapshot/i.test(error.message || "")) {
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
      if (effectiveStatus && effectiveStatus !== "all") {
        q2 = q2.eq("status", effectiveStatus);
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
        .select("id, name, referral_code, slug, email, cooperation_model")
        .in("id", partnerIds);
      for (const p of partners || []) partnerMap[p.id] = p;
    }

    const bankMap = {};
    if (partnerIds.length) {
      let { data: banks, error: bankErr } = await supabase
        .from("partner_bank_accounts")
        .select(
          "partner_id, payout_method, bank_name, bank_code, branch_name, account_name, account_number, payout_note",
        )
        .in("partner_id", partnerIds);
      if (
        bankErr &&
        /payout_method|payout_note|column/i.test(bankErr.message || "")
      ) {
        ({ data: banks } = await supabase
          .from("partner_bank_accounts")
          .select(
            "partner_id, bank_name, bank_code, branch_name, account_name, account_number",
          )
          .in("partner_id", partnerIds));
        banks = (banks || []).map((b) => ({
          ...b,
          payout_method: "tw_bank",
          payout_note: "",
        }));
      }
      for (const b of banks || []) bankMap[b.partner_id] = b;
    }

    const storeMap = {};
    const domains = [
      ...new Set(
        Object.values(partnerMap)
          .map((p) => p.slug || p.referral_code)
          .filter(Boolean)
          .map(String),
      ),
    ];
    if (domains.length) {
      const { data: stores } = await supabase
        .from("stores")
        .select("id, domain, store_name, logo_url, status")
        .in("domain", domains);
      for (const s of stores || []) storeMap[s.domain] = s;
    }

    return res.status(200).json({
      bank:
        Number.isFinite(partnerId) && partnerId > 0
          ? bankMap[partnerId] || null
          : null,
      store:
        Number.isFinite(partnerId) && partnerId > 0
          ? (() => {
              const p = partnerMap[partnerId];
              const key = p?.slug || p?.referral_code;
              return key ? storeMap[String(key)] || null : null;
            })()
          : null,
      requests: (data || []).map((r) =>
        mapAdminRequest(r, partnerMap, bankMap, storeMap),
      ),
    });
  }

  if (req.method === "PATCH") {
    const id = Number(req.body?.id);
    const action = String(req.body?.action || "").trim();
    const statusRaw = String(req.body?.status || "").trim();
    const admin_note = String(req.body?.admin_note || "").trim().slice(0, 500);

    const actionToStatus = {
      approve: "approved",
      reject: "rejected",
      remit: "remitted",
      cancel: "cancelled",
    };
    const status = actionToStatus[action] || statusRaw;

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "缺少申請 id" });
    }
    if (!ALLOWED.has(status) && status !== "pending") {
      return res.status(400).json({ error: "無效狀態" });
    }

    const { data: row, error: findErr } = await supabase
      .from("partner_withdrawal_requests")
      .select("id, partner_id, amount, fee_amount, status, requested_at")
      .eq("id", id)
      .maybeSingle();
    if (findErr) return res.status(500).json({ error: findErr.message });
    if (!row) return res.status(404).json({ error: "找不到申請" });

    const patch = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (admin_note || req.body?.admin_note === "") {
      patch.admin_note = admin_note;
    }
    if (status === "approved" || status === "rejected") {
      patch.processed_at = new Date().toISOString();
    }
    if (status === "remitted") {
      patch.remitted_at = new Date().toISOString();
      if (!patch.processed_at) patch.processed_at = patch.remitted_at;

      const { data: partner } = await supabase
        .from("partners")
        .select("referral_code, slug")
        .eq("id", row.partner_id)
        .maybeSingle();
      const partnerCode =
        partner?.referral_code || partner?.slug || row.partner_id;

      // 備註對準 FIFO 對沖之成交月（與對帳單 JEKO-YYYYMM 一致），可被 body 覆寫
      let memoYear = Number(req.body?.settlement_year);
      let memoMonth = Number(req.body?.settlement_month);
      if (
        !(
          Number.isFinite(memoYear) &&
          Number.isFinite(memoMonth) &&
          memoMonth >= 1 &&
          memoMonth <= 12
        )
      ) {
        const [{ data: orders }, { data: siblingWds }] = await Promise.all([
          supabase
            .from("orders")
            .select("id, status, partner_profit, created_at, refunded_at")
            .eq("partner_id", row.partner_id)
            .limit(5000),
          supabase
            .from("partner_withdrawal_requests")
            .select(
              "id, amount, status, requested_at, processed_at, remitted_at, created_at",
            )
            .eq("partner_id", row.partner_id)
            .in("status", ["remitted", "pending", "approved"])
            .limit(2000),
        ]);
        const attr = remittanceMemoForWithdrawal(
          orders || [],
          siblingWds || [],
          { ...row, remitted_at: patch.remitted_at },
        );
        memoYear = attr.year;
        memoMonth = attr.month;
      }
      patch.remittance_memo =
        String(req.body?.remittance_memo || "").trim() ||
        remittanceMemo(memoYear, memoMonth, partnerCode);
    }

    const { data: updated, error } = await supabase
      .from("partner_withdrawal_requests")
      .update(patch)
      .eq("id", id)
      .select(
        "id, partner_id, amount, fee_amount, status, requested_at, processed_at, remitted_at, admin_note, remittance_memo",
      )
      .single();
    if (error) {
      // fee_amount 欄位可能尚未 migration
      if (/fee_amount/i.test(error.message || "")) {
        const { data: updated2, error: err2 } = await supabase
          .from("partner_withdrawal_requests")
          .update(patch)
          .eq("id", id)
          .select(
            "id, partner_id, amount, status, requested_at, processed_at, remitted_at, admin_note, remittance_memo",
          )
          .single();
        if (err2) return res.status(500).json({ error: err2.message });
        return res.status(200).json({
          request: {
            ...updated2,
            fee_amount: 0,
            net_amount: netRemitAmount(updated2.amount, 0),
            status_label:
              WITHDRAWAL_STATUS_LABEL[updated2.status] || updated2.status,
          },
        });
      }
      return res.status(500).json({ error: error.message });
    }

    const fee = Math.round(Number(updated.fee_amount) || 0);
    return res.status(200).json({
      request: {
        ...updated,
        fee_amount: fee,
        net_amount: netRemitAmount(updated.amount, fee),
        status_label: WITHDRAWAL_STATUS_LABEL[updated.status] || updated.status,
      },
    });
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  return res.status(405).end("Method Not Allowed");
}
