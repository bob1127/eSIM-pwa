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

/** 收款方式（夥伴可依需求選擇） */
export const PAYOUT_METHODS = [
  {
    id: "tw_bank",
    label: "台灣銀行帳戶",
    short: "台灣銀行",
    desc: "國內匯款（最常見）",
  },
  {
    id: "overseas_bank",
    label: "海外銀行／SWIFT",
    short: "海外銀行",
    desc: "國際匯款，需 SWIFT／IBAN",
  },
  {
    id: "line_pay",
    label: "LINE Pay",
    short: "LINE Pay",
    desc: "以綁定手機或 LINE 帳號收款",
  },
  {
    id: "paypal",
    label: "PayPal",
    short: "PayPal",
    desc: "以 PayPal Email 收款",
  },
  {
    id: "other",
    label: "其他方式",
    short: "其他",
    desc: "請詳填說明，由平台人工確認後匯款",
  },
];

export const PAYOUT_METHOD_IDS = new Set(PAYOUT_METHODS.map((m) => m.id));

export function normalizePayoutMethod(method) {
  const m = String(method || "tw_bank").trim().toLowerCase();
  return PAYOUT_METHOD_IDS.has(m) ? m : "tw_bank";
}

export function getPayoutMethodLabel(method) {
  const id = normalizePayoutMethod(method);
  return PAYOUT_METHODS.find((m) => m.id === id)?.label || "台灣銀行帳戶";
}

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
    // 僅加正分潤，避免髒資料負數影響可提領計算
    const profit = Math.round(Number(o.partner_profit) || 0);
    if (profit > 0) sum += profit;
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
 *   totalEarned: number,
 *   earnedFrozen: number,
 *   heldInFreeze: number,
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
  const totalEarned = sumPayableProfit(orders);
  const earnedFrozen = sumPayableProfit(orders, { beforeIso: cutoff });
  const heldInFreeze = Math.max(0, totalEarned - earnedFrozen);
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
    totalEarned,
    earnedFrozen,
    heldInFreeze,
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

/**
 * 嚴格解析提領金額：僅允許正整數字串（防小數、科學記號、字串注入）。
 */
export function parseWithdrawalAmountInput(raw) {
  if (raw == null || raw === "") {
    return {
      ok: false,
      error: "請輸入提領金額",
      title: "請輸入提領金額",
      detail: "請填寫本次要提領的金額（正整數）。",
    };
  }
  const s = String(raw).trim().replace(/,/g, "");
  if (!/^\d+$/.test(s)) {
    return {
      ok: false,
      error: "提領金額須為正整數",
      title: "金額格式錯誤",
      detail: "提領金額僅能輸入正整數（不可含小數、符號或空白）。",
    };
  }
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n <= 0) {
    return {
      ok: false,
      error: "提領金額無效",
      title: "金額無效",
      detail: "請輸入有效的正整數金額後再試。",
    };
  }
  return { ok: true, amount: n };
}

export function validateWithdrawalAmount(amount, snapshot) {
  const parsed = parseWithdrawalAmountInput(amount);
  if (!parsed.ok) return parsed;

  const n = parsed.amount;
  const fee = Math.max(0, Math.round(Number(snapshot?.nextFee) || 0));
  const minW = Math.round(
    Number(snapshot?.minWithdrawal) || PAYOUT_MIN_WITHDRAWAL,
  );
  const maxW = Math.round(
    Number(snapshot?.maxWithdrawal) || PAYOUT_MAX_WITHDRAWAL,
  );
  const available = Math.max(
    0,
    Math.round(Number(snapshot?.available) || 0),
  );
  // 硬上限：不可超過「可提領餘額」與「單次上限」的較小值
  const hardCap = Math.min(available, maxW);

  if (!snapshot?.canRequest) {
    const reason =
      snapshot?.blockReason ||
      (available < minW
        ? `可提領餘額未達最低門檻 NT$${minW.toLocaleString()}`
        : "目前無法申請提領");
    return {
      ok: false,
      error: reason,
      title: "無法申請提領",
      detail:
        available < minW
          ? `目前可提領餘額為 NT$${available.toLocaleString()}，尚未達到最低提領門檻 NT$${minW.toLocaleString()}。\n\n訂單需自成立日起滿 ${PAYOUT_FREEZE_DAYS} 天後才會計入可提領；請待餘額達標後再申請。`
          : `${reason}。`,
    };
  }

  if (n < minW) {
    return {
      ok: false,
      error: `最低提領金額為 NT$${minW.toLocaleString()}`,
      title: "金額低於最低門檻",
      detail: `單次提領須至少 NT$${minW.toLocaleString()}。\n您目前輸入 NT$${n.toLocaleString()}，尚差 NT$${Math.max(0, minW - n).toLocaleString()}。\n\n請調整金額後再送出。`,
    };
  }
  if (n > maxW) {
    return {
      ok: false,
      error: `單次提領上限為 NT$${maxW.toLocaleString()}`,
      title: "超過單次上限",
      detail: `單次提領上限為 NT$${maxW.toLocaleString()}。\n您目前輸入 NT$${n.toLocaleString()}，請改為較小金額後再申請。`,
    };
  }
  if (n > available || n > hardCap) {
    return {
      ok: false,
      error: `超過可提領餘額 NT$${available.toLocaleString()}`,
      title: "超過可提領餘額",
      detail: `可提領餘額為 NT$${available.toLocaleString()}，無法申請 NT$${n.toLocaleString()}。\n系統不會允許超額提領。\n請調降金額，或待更多訂單滿 ${PAYOUT_FREEZE_DAYS} 天後再申請。`,
    };
  }
  if (fee > 0 && n <= fee) {
    return {
      ok: false,
      error: `提領金額須大於手續費 NT$${fee.toLocaleString()}`,
      title: "金額須大於手續費",
      detail: `本次將扣除手續費 NT$${fee.toLocaleString()}，提領金額須大於手續費才有實匯金額。`,
    };
  }
  if (netRemitAmount(n, fee) <= 0) {
    return {
      ok: false,
      error: "實匯金額必須大於 0",
      title: "實匯金額無效",
      detail: "扣除手續費後實匯須大於 0，請提高提領金額。",
    };
  }
  return {
    ok: true,
    amount: n,
    fee,
    netAmount: netRemitAmount(n, fee),
    available,
    hardCap,
  };
}

/** 申請成功後複核：保留金額不可超過已解凍可結算分潤 */
export function isWithdrawalLedgerConsistent(snapshot) {
  const earned = Math.round(Number(snapshot?.earnedFrozen) || 0);
  const reserved = Math.round(Number(snapshot?.reserved) || 0);
  const available = Math.round(Number(snapshot?.available) || 0);
  if (reserved > earned) return false;
  if (available < 0) return false;
  if (Math.max(0, earned - reserved) !== available) return false;
  return true;
}

export function sanitizeBankPayload(body = {}) {
  const method = normalizePayoutMethod(body.payout_method);
  const payout_note = String(body.payout_note || "").trim().slice(0, 500);
  const bank_code = String(body.bank_code || "").trim().slice(0, 40);
  const branch_name = String(body.branch_name || "").trim().slice(0, 80);
  let bank_name = String(body.bank_name || "").trim().slice(0, 80);
  let account_name = String(body.account_name || "").trim().slice(0, 80);
  let account_number = String(body.account_number || "")
    .replace(/\s+/g, "")
    .slice(0, 80);

  if (method === "tw_bank") {
    if (!bank_name || !account_name || !account_number) {
      return { ok: false, error: "請填寫銀行名稱、戶名與帳號" };
    }
  } else if (method === "overseas_bank") {
    if (!bank_name || !account_name || !account_number) {
      return {
        ok: false,
        error: "請填寫銀行名稱、戶名與帳號／IBAN",
      };
    }
    if (!bank_code) {
      return { ok: false, error: "海外匯款請填寫 SWIFT／BIC 代碼" };
    }
  } else if (method === "line_pay") {
    bank_name = bank_name || "LINE Pay";
    if (!account_name || !account_number) {
      return {
        ok: false,
        error: "請填寫收款人姓名與 LINE Pay 手機／帳號",
      };
    }
  } else if (method === "paypal") {
    bank_name = bank_name || "PayPal";
    if (!account_name || !account_number) {
      return { ok: false, error: "請填寫收款人姓名與 PayPal Email" };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account_number)) {
      return { ok: false, error: "PayPal Email 格式不正確" };
    }
  } else if (method === "other") {
    bank_name = bank_name || "其他收款方式";
    if (!account_name) {
      return { ok: false, error: "請填寫收款人／聯絡姓名" };
    }
    if (!payout_note || payout_note.length < 8) {
      return {
        ok: false,
        error: "請在「其他說明」詳填收款方式（至少 8 字）",
      };
    }
    if (!account_number) account_number = "SEE_NOTE";
  }

  return {
    ok: true,
    value: {
      payout_method: method,
      bank_name,
      bank_code,
      branch_name,
      account_name,
      account_number,
      payout_note,
      updated_at: new Date().toISOString(),
    },
  };
}

/** 是否已足夠供平台匯款審核 */
export function isPayoutAccountComplete(bank) {
  if (!bank) return false;
  const method = normalizePayoutMethod(bank.payout_method);
  const name = String(bank.account_name || "").trim();
  const number = String(bank.account_number || "").trim();
  const bankName = String(bank.bank_name || "").trim();
  const note = String(bank.payout_note || "").trim();
  if (!name) return false;
  if (method === "other") return note.length >= 8;
  if (method === "overseas_bank") {
    return !!(bankName && number && String(bank.bank_code || "").trim());
  }
  return !!(bankName && number);
}

export function formatPayoutAccountSummary(bank) {
  if (!bank) return "尚未設定";
  const method = normalizePayoutMethod(bank.payout_method);
  const label = getPayoutMethodLabel(method);
  if (method === "tw_bank" || method === "overseas_bank") {
    return `${label}｜${bank.bank_name || ""} ${bank.branch_name || ""}／${bank.account_name || ""}／${bank.account_number || ""}`;
  }
  if (method === "line_pay") {
    return `${label}｜${bank.account_name || ""}／${bank.account_number || ""}`;
  }
  if (method === "paypal") {
    return `${label}｜${bank.account_name || ""}／${bank.account_number || ""}`;
  }
  return `${label}｜${bank.account_name || ""}｜${bank.payout_note || ""}`;
}

/** 提領申請當下帳戶快照（供審核對照；匯款以目前帳戶為準並提示差異） */
export function buildPayoutSnapshot(bank) {
  if (!bank) return null;
  return {
    payout_method: normalizePayoutMethod(bank.payout_method),
    bank_name: String(bank.bank_name || "").trim(),
    bank_code: String(bank.bank_code || "").trim(),
    branch_name: String(bank.branch_name || "").trim(),
    account_name: String(bank.account_name || "").trim(),
    account_number: String(bank.account_number || "").trim(),
    payout_note: String(bank.payout_note || "").trim(),
    captured_at: new Date().toISOString(),
  };
}

const PAYOUT_COMPARE_KEYS = [
  "payout_method",
  "bank_name",
  "bank_code",
  "branch_name",
  "account_name",
  "account_number",
  "payout_note",
];

export function payoutAccountsEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return PAYOUT_COMPARE_KEYS.every(
    (k) => String(a[k] || "").trim() === String(b[k] || "").trim(),
  );
}
