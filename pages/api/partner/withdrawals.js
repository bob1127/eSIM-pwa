import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import {
  computePayoutSnapshot,
  validateWithdrawalAmount,
  netRemitAmount,
  WITHDRAWAL_STATUS_LABEL,
  isPayoutAccountComplete,
  buildPayoutSnapshot,
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

    if (req.method === "GET") {
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

    // POST 申請
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
      return res.status(400).json({ error: "請先完整儲存收款帳戶資料" });
    }

    const check = validateWithdrawalAmount(req.body?.amount, snapshot);
    if (!check.ok) return res.status(400).json({ error: check.error });

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

    // 尚未跑 fee_amount / payout_snapshot migration 時降級
    if (
      error &&
      /fee_amount|payout_snapshot/i.test(error.message || "")
    ) {
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

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      ok: true,
      request: mapRequest(created),
      snapshot: computePayoutSnapshot({
        orders,
        requests: [created, ...requests],
      }),
    });
  } catch (err) {
    console.error("[partner/withdrawals]", err);
    return res.status(500).json({ error: err.message || "伺服器錯誤" });
  }
}
