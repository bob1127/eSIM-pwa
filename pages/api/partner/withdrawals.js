import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import {
  computePayoutSnapshot,
  validateWithdrawalAmount,
  isWithdrawalLedgerConsistent,
  netRemitAmount,
  WITHDRAWAL_STATUS_LABEL,
  isPayoutAccountComplete,
  buildPayoutSnapshot,
  PAYOUT_MIN_WITHDRAWAL,
  PAYOUT_MAX_WITHDRAWAL,
} from "../../../lib/partnerPayout";

function mapRequest(r) {
  const fee = Math.round(Number(r.fee_amount) || 0);
  const amount = Math.round(Number(r.amount) || 0);
  return {
    ...r,
    fee_amount: fee,
    net_amount: netRemitAmount(amount, fee),
    status_label: WITHDRAWAL_STATUS_LABEL[r.status] || r.status || "未知",
  };
}

async function loadOrdersAndRequests(supabase, partnerId) {
  const ordersP = supabase
    .from("orders")
    .select("id, status, partner_profit, created_at, refunded_at")
    .eq("partner_id", partnerId)
    .limit(5000);

  let reqRes = await supabase
    .from("partner_withdrawal_requests")
    .select(
      "id, amount, fee_amount, status, requested_at, processed_at, remitted_at, admin_note, remittance_memo, created_at",
    )
    .eq("partner_id", partnerId)
    .order("requested_at", { ascending: false })
    .limit(2000);

  if (reqRes.error && /fee_amount/i.test(reqRes.error.message || "")) {
    reqRes = await supabase
      .from("partner_withdrawal_requests")
      .select(
        "id, amount, status, requested_at, processed_at, remitted_at, admin_note, remittance_memo, created_at",
      )
      .eq("partner_id", partnerId)
      .order("requested_at", { ascending: false })
      .limit(2000);
  }

  const { data: orders } = await ordersP;
  const { data: requests, error: reqErr } = reqRes;

  if (reqErr && /does not exist|schema cache/i.test(reqErr.message || "")) {
    return { orders: orders || [], requests: [], missingTable: true };
  }
  if (reqErr) throw new Error(reqErr.message);
  return { orders: orders || [], requests: requests || [], missingTable: false };
}

function isUniquePendingViolation(error) {
  const msg = String(error?.message || "");
  const code = String(error?.code || "");
  return (
    code === "23505" ||
    /uniq_partner_withdrawal_one_pending|duplicate key|unique constraint/i.test(
      msg,
    )
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
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

  const partnerId = access.partner.id;

  try {
    if (req.method === "GET") {
      const { orders, requests, missingTable } = await loadOrdersAndRequests(
        supabase,
        partnerId,
      );
      if (missingTable) {
        return res.status(503).json({
          error: "提領功能資料表尚未建立，請先執行 migration 20260802e",
        });
      }

      const snapshot = computePayoutSnapshot({ orders, requests });

      let { data: bank, error: bankGetErr } = await supabase
        .from("partner_bank_accounts")
        .select(
          "payout_method, bank_name, bank_code, branch_name, account_name, account_number, payout_note, updated_at",
        )
        .eq("partner_id", partnerId)
        .maybeSingle();
      if (
        bankGetErr &&
        /payout_method|payout_note|column/i.test(bankGetErr.message || "")
      ) {
        ({ data: bank } = await supabase
          .from("partner_bank_accounts")
          .select(
            "bank_name, bank_code, branch_name, account_name, account_number, updated_at",
          )
          .eq("partner_id", partnerId)
          .maybeSingle());
        if (bank) {
          bank = { ...bank, payout_method: "tw_bank", payout_note: "" };
        }
      }

      return res.status(200).json({
        snapshot,
        bank: bank || null,
        requests: (requests || []).map(mapRequest),
        scheduleHint:
          "次月 15 日產製對帳單；申請提領後 10 個工作天內匯款。每月第 1 次免手續費，第 2 次起每次扣 NT$15。",
      });
    }

    // ── POST 申請：以伺服器最新餘額硬擋，防超額／連點／併發 ──

    let { data: bank, error: bankErr } = await supabase
      .from("partner_bank_accounts")
      .select(
        "payout_method, account_number, account_name, bank_name, bank_code, branch_name, payout_note, updated_at",
      )
      .eq("partner_id", partnerId)
      .maybeSingle();
    if (bankErr && /payout_method|payout_note|column/i.test(bankErr.message || "")) {
      ({ data: bank } = await supabase
        .from("partner_bank_accounts")
        .select(
          "account_number, account_name, bank_name, bank_code, branch_name, updated_at",
        )
        .eq("partner_id", partnerId)
        .maybeSingle());
    }
    if (!isPayoutAccountComplete(bank)) {
      return res.status(400).json({
        error: "請先完整儲存收款帳戶資料",
        title: "請先完成收款帳戶",
      });
    }

    // 送出當下重算（勿信任前端帶的餘額）
    const fresh = await loadOrdersAndRequests(supabase, partnerId);
    if (fresh.missingTable) {
      return res.status(503).json({
        error: "提領功能資料表尚未建立，請先執行 migration 20260802e",
      });
    }

    const snapshot = computePayoutSnapshot({
      orders: fresh.orders,
      requests: fresh.requests,
    });

    const check = validateWithdrawalAmount(req.body?.amount, snapshot);
    if (!check.ok) {
      return res.status(400).json({
        error: check.error,
        title: check.title,
        detail: check.detail,
        snapshot,
      });
    }

    // 雙重硬擋：金額必須落在 [min, min(available, max)]
    if (
      check.amount < PAYOUT_MIN_WITHDRAWAL ||
      check.amount > PAYOUT_MAX_WITHDRAWAL ||
      check.amount > snapshot.available
    ) {
      return res.status(400).json({
        error: `超過可提領餘額 NT$${snapshot.available.toLocaleString()}`,
        title: "超過可提領餘額",
        detail: "系統已拒絕此超額申請。",
        snapshot,
      });
    }

    const payoutSnapshot = buildPayoutSnapshot(bank);
    const insertPayload = {
      partner_id: partnerId,
      amount: check.amount,
      fee_amount: check.fee,
      status: "pending",
      payout_snapshot: payoutSnapshot,
    };

    let { data: created, error } = await supabase
      .from("partner_withdrawal_requests")
      .insert(insertPayload)
      .select(
        "id, amount, fee_amount, status, requested_at, processed_at, remitted_at, admin_note, remittance_memo, payout_snapshot",
      )
      .single();

    if (error && /fee_amount|payout_snapshot/i.test(error.message || "")) {
      const slim = {
        partner_id: partnerId,
        amount: check.amount,
        status: "pending",
      };
      if (!/fee_amount/i.test(error.message || "")) {
        slim.fee_amount = check.fee;
      }
      ({ data: created, error } = await supabase
        .from("partner_withdrawal_requests")
        .insert(slim)
        .select(
          "id, amount, status, requested_at, processed_at, remitted_at, admin_note, remittance_memo",
        )
        .single());
      if (created) {
        created = {
          ...created,
          fee_amount: check.fee,
          payout_snapshot: payoutSnapshot,
        };
      }
    }

    if (error) {
      if (isUniquePendingViolation(error)) {
        return res.status(409).json({
          error: "尚有審核中的提領申請，請待處理完成後再送",
          title: "無法重複申請",
          detail: "同一時間僅能有一筆審核中的提領，請勿重複送出。",
        });
      }
      return res.status(500).json({ error: error.message });
    }

    // 寫入後再算一次帳本：若因併發導致超額保留，立即撤銷此筆
    const after = await loadOrdersAndRequests(supabase, partnerId);
    const afterSnap = computePayoutSnapshot({
      orders: after.orders,
      requests: after.requests,
    });

    if (!isWithdrawalLedgerConsistent(afterSnap)) {
      console.error(
        "[partner/withdrawals] overdraw detected, rolling back",
        {
          partnerId,
          requestId: created?.id,
          amount: check.amount,
          earnedFrozen: afterSnap.earnedFrozen,
          reserved: afterSnap.reserved,
          available: afterSnap.available,
        },
      );
      if (created?.id) {
        await supabase
          .from("partner_withdrawal_requests")
          .delete()
          .eq("id", created.id)
          .eq("partner_id", partnerId)
          .eq("status", "pending");
      }
      return res.status(409).json({
        error: "可提領餘額不足或發生併發衝突，已取消本次申請",
        title: "申請已取消（防超額）",
        detail:
          "系統偵測到提領後保留金額會超過可結算分潤，已自動撤銷本次申請，不會超額出金。請重新整理後再試。",
        snapshot: computePayoutSnapshot({
          orders: after.orders,
          requests: (after.requests || []).filter((r) => r.id !== created?.id),
        }),
      });
    }

    return res.status(200).json({
      ok: true,
      request: mapRequest(created),
      snapshot: afterSnap,
    });
  } catch (err) {
    console.error("[partner/withdrawals]", err);
    return res.status(500).json({ error: err.message || "伺服器錯誤" });
  }
}
