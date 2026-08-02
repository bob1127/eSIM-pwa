/**
 * 夥伴分潤提領規則（折衷）
 * - 主流程：成交月 → 次月 15 結算對帳單
 * - 匯款：夥伴申請提領後，平台於 10 個工作天內匯款
 *
 * 規則：
 * - 最低提領 NT$3,000
 * - 台北曆月第 1 次免手續費；第 2 次起每次扣 NT$15（銀行轉帳成本）
 * - 不限制每月次數（僅需無審核中申請）
 * - 僅計入「已完成且未退款」且建立時間已滿凍結天數的分潤
 */

import { monthBoundsIso } from "./partnerReferral";
import { isPayableSettlementOrder } from "./partnerSettlementStatement";

export const PAYOUT_MIN_WITHDRAWAL = 3000;
/** 單次申請提領金額上限（對齊人工匯款操作上限） */
export const PAYOUT_MAX_WITHDRAWAL = 20000;
/** @deprecated 改為每月首次免手續費，不再硬性限次 */
export const PAYOUT_MAX_REQUESTS_PER_MONTH = Infinity;
/** 訂單建立後需滿此天數才可計入「可提前提領」餘額（日曆天） */
export const PAYOUT_FREEZE_DAYS = 10;
/** 申請提領（核准）後，平台目標匯款工作天數 */
export const PAYOUT_REMITTANCE_WORKING_DAYS = 10;
/** 當月第 2 次起每次銀行轉帳手續費（由提領金額內扣） */
export const PAYOUT_EXTRA_WITHDRAWAL_FEE = 15;
/** 每月免手續費次數 */
export const PAYOUT_FREE_WITHDRAWALS_PER_MONTH = 1;

export const WITHDRAWAL_STATUS_LABEL = {
  pending: "審核中",
  approved: "已核准待匯",
  rejected: "已拒絕",
  remitted: "已匯款",
  cancelled: "已取消",
};

const OPEN_STATUSES = new Set(["pending", "approved", "remitted"]);

export function freezeCutoffIso(when = new Date(), freezeDays = PAYOUT_FREEZE_DAYS) {
  const d = new Date(when.getTime() - Math.max(0, freezeDays) * 86400000);
  return d.toISOString();
}

export function sumPayableProfit(orders, { beforeIso } = {}) {
  let sum = 0;
  const beforeMs = beforeIso ? new Date(beforeIso).getTime() : null;
  for (const o of orders || []) {
    if (!isPayableSettlementOrder(o)) continue;
    if (beforeMs != null) {
      const t = new Date(o.created_at).getTime();
      if (!(t <= beforeMs)) continue;
    }
    sum += Math.round(Number(o.partner_profit) || 0);
  }
  return Math.max(0, sum);
}

export function sumWithdrawalReserved(requests) {
  let sum = 0;
  for (const r of requests || []) {
    if (!OPEN_STATUSES.has(String(r.status || "").toLowerCase())) continue;
    sum += Math.round(Number(r.amount) || 0);
  }
  return Math.max(0, sum);
}

/** 本月已佔用「免手續費／計次」的有效申請數（不含拒絕、取消） */
export function countRequestsThisMonth(requests, when = new Date()) {
  const { start, end } = monthBoundsIso(when);
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return (requests || []).filter((r) => {
    const s = String(r.status || "").toLowerCase();
    if (!OPEN_STATUSES.has(s)) return false;
    const t = new Date(r.requested_at || r.created_at).getTime();
    return t >= startMs && t <= endMs;
  }).length;
}

export function feeForNextWithdrawal(
  requestsThisMonth,
  {
    freePerMonth = PAYOUT_FREE_WITHDRAWALS_PER_MONTH,
    extraFee = PAYOUT_EXTRA_WITHDRAWAL_FEE,
  } = {},
) {
  return requestsThisMonth >= freePerMonth ? extraFee : 0;
}

export function netRemitAmount(amount, fee) {
  const a = Math.round(Number(amount) || 0);
  const f = Math.max(0, Math.round(Number(fee) || 0));
  return Math.max(0, a - f);
}

export function hasOpenPendingRequest(requests) {
  return (requests || []).some(
    (r) => String(r.status || "").toLowerCase() === "pending",
  );
}

/**
 * @returns {{
 *   earnedFrozen: number,
 *   reserved: number,
 *   available: number,
 *   freezeDays: number,
 *   freezeCutoffIso: string,
 *   minWithdrawal: number,
 *   maxWithdrawal: number,
 *   requestsThisMonth: number,
 *   freeWithdrawalsPerMonth: number,
 *   nextFee: number,
 *   extraWithdrawalFee: number,
 *   canRequest: boolean,
 *   blockReason: string|null,
 * }}
 */
export function computePayoutSnapshot({
  orders = [],
  requests = [],
  when = new Date(),
  minWithdrawal = PAYOUT_MIN_WITHDRAWAL,
  maxWithdrawal = PAYOUT_MAX_WITHDRAWAL,
  freezeDays = PAYOUT_FREEZE_DAYS,
  freePerMonth = PAYOUT_FREE_WITHDRAWALS_PER_MONTH,
  extraFee = PAYOUT_EXTRA_WITHDRAWAL_FEE,
} = {}) {
  const cutoff = freezeCutoffIso(when, freezeDays);
  const earnedFrozen = sumPayableProfit(orders, { beforeIso: cutoff });
  const reserved = sumWithdrawalReserved(requests);
  const available = Math.max(0, earnedFrozen - reserved);
  const requestsThisMonth = countRequestsThisMonth(requests, when);
  const nextFee = feeForNextWithdrawal(requestsThisMonth, {
    freePerMonth,
    extraFee,
  });
  const pendingOpen = hasOpenPendingRequest(requests);

  let blockReason = null;
  if (pendingOpen) blockReason = "尚有審核中的提領申請，請待處理完成後再送";
  else if (available < minWithdrawal) {
    blockReason = `可提領餘額未達最低門檻 NT$${minWithdrawal.toLocaleString()}`;
  }

  return {
    earnedFrozen,
    reserved,
    available,
    freezeDays,
    freezeCutoffIso: cutoff,
    minWithdrawal,
    maxWithdrawal,
    requestsThisMonth,
    freeWithdrawalsPerMonth: freePerMonth,
    nextFee,
    extraWithdrawalFee: extraFee,
    canRequest: !blockReason && available >= minWithdrawal,
    blockReason,
  };
}

export function validateWithdrawalAmount(amount, snapshot) {
  const n = Math.round(Number(amount) || 0);
  const fee = Math.max(0, Math.round(Number(snapshot.nextFee) || 0));
  if (!(n > 0)) return { ok: false, error: "請輸入提領金額" };
  if (n < snapshot.minWithdrawal) {
    return {
      ok: false,
      error: `最低提領金額為 NT$${snapshot.minWithdrawal.toLocaleString()}`,
    };
  }
  const maxW = Number(snapshot.maxWithdrawal) || PAYOUT_MAX_WITHDRAWAL;
  if (n > maxW) {
    return {
      ok: false,
      error: `單次提領上限為 NT$${maxW.toLocaleString()}`,
    };
  }
  if (n > snapshot.available) {
    return {
      ok: false,
      error: `超過可提領餘額 NT$${snapshot.available.toLocaleString()}`,
    };
  }
  if (fee > 0 && n <= fee) {
    return {
      ok: false,
      error: `提領金額須大於手續費 NT$${fee.toLocaleString()}`,
    };
  }
  if (!snapshot.canRequest) {
    return { ok: false, error: snapshot.blockReason || "目前無法申請提領" };
  }
  return {
    ok: true,
    amount: n,
    fee,
    netAmount: netRemitAmount(n, fee),
  };
}

export function sanitizeBankPayload(body = {}) {
  const bank_name = String(body.bank_name || "").trim().slice(0, 80);
  const bank_code = String(body.bank_code || "").trim().slice(0, 20);
  const branch_name = String(body.branch_name || "").trim().slice(0, 80);
  const account_name = String(body.account_name || "").trim().slice(0, 80);
  const account_number = String(body.account_number || "")
    .replace(/\s+/g, "")
    .slice(0, 40);

  if (!bank_name || !account_name || !account_number) {
    return {
      ok: false,
      error: "請填寫銀行名稱、戶名與帳號",
    };
  }
  return {
    ok: true,
    value: {
      bank_name,
      bank_code,
      branch_name,
      account_name,
      account_number,
      updated_at: new Date().toISOString(),
    },
  };
}
