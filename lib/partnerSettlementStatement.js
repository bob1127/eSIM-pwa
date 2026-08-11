/**
 * 合作夥伴月結對帳單：資料彙整 + A4 HTML（可另存／列印為 PDF）
 */

import { getOrderStatusLabel } from "./adminAnalytics";

/** 對帳單用：與後台狀態中文對齊；有退款時間視為已退款 */
export function statementOrderStatusLabel(orderOrStatus) {
  if (orderOrStatus && typeof orderOrStatus === "object") {
    const s = String(orderOrStatus.status || "").toLowerCase();
    if (orderOrStatus.refunded_at || s === "refunded") return "已退款";
    return getOrderStatusLabel(orderOrStatus.status);
  }
  return getOrderStatusLabel(orderOrStatus);
}

function orderItemsLabel(order) {
  let items = order?.item_details;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items) || !items.length) return "eSIM 方案";
  return items
    .map((it) => {
      const name = it?.name || it?.productName || "eSIM";
      const qty = Number(it?.quantity) || 1;
      const price = Number(it?.price);
      const pricePart = Number.isFinite(price) ? `（NT$${price}）` : "";
      return qty > 1 ? `${name} ×${qty}${pricePart}` : `${name}${pricePart}`;
    })
    .join("；");
}

/** Asia/Taipei 曆月邊界（含當月最後一秒） */
export function taipeiMonthBounds(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error("無效的結算年月");
  }
  const start = new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+08:00`);
  const endMonth = m === 12 ? 1 : m + 1;
  const endYear = m === 12 ? y + 1 : y;
  const end = new Date(
    `${endYear}-${String(endMonth).padStart(2, "0")}-01T00:00:00+08:00`,
  );
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { start, end, year: y, month: m };
}

/** @param {number} year @param {number} month 曆月 1–12 */
export function lastDayOfMonth(year, month) {
  const y = Number(year);
  const m = Number(month);
  // JS：new Date(y, m, 0) = 曆月 m 的最後一天（m 為 1–12）
  return new Date(y, m, 0).getDate();
}

/** 成交月 → 結算／匯款時程說明（匯款不以特定日曆日承諾） */
export function settlementScheduleLabel(year, month) {
  const nextM = month === 12 ? 1 : month + 1;
  const nextY = month === 12 ? year + 1 : year;
  const last = lastDayOfMonth(nextY, nextM);
  return {
    settleDate: `${nextY}-${String(nextM).padStart(2, "0")}-15`,
    /** 說明用：次月結算窗結束日（扣減改走 FIFO，不再依此區間） */
    payoutDate: `${nextY}-${String(nextM).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    settleLabel: `${nextY} 年 ${nextM} 月 15 日`,
    payoutLabel: "申請提領後 10 個工作天內",
  };
}

/** Asia/Taipei 年月（曆月 1–12） */
export function taipeiYearMonth(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (!Number.isFinite(d.getTime())) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const year = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
    }).format(d),
  );
  const month = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      month: "numeric",
    }).format(d),
  );
  return { year, month };
}

export function settlementMonthKey(year, month) {
  return `${Number(year)}-${String(Number(month)).padStart(2, "0")}`;
}

/**
 * 各成交月應付分潤（每筆訂單四捨五入後加總，與可提領餘額同一規則）
 * @returns {Map<string, { year: number, month: number, profit: number }>}
 */
export function buildMonthlyProfitLedger(orders) {
  const map = new Map();
  for (const o of orders || []) {
    if (!isPayableSettlementOrder(o)) continue;
    const { year, month } = taipeiYearMonth(o.created_at);
    const key = settlementMonthKey(year, month);
    const prev = map.get(key) || { year, month, profit: 0 };
    prev.profit += Math.round(Number(o.partner_profit) || 0);
    map.set(key, prev);
  }
  return map;
}

function withdrawalEventTime(w) {
  return new Date(
    w.remitted_at || w.processed_at || w.requested_at || w.created_at,
  ).getTime();
}

function sortWithdrawalsChronological(list) {
  return (list || []).slice().sort((a, b) => {
    const ta = withdrawalEventTime(a);
    const tb = withdrawalEventTime(b);
    if (ta !== tb) return ta - tb;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

/**
 * 已匯提領以 FIFO 對沖各成交月分潤：每一元只扣一次，相鄰月份對帳單不會重複扣減。
 * @returns {{
 *   byMonth: Map<string, Array<object>>,
 *   primaryMonthById: Map<number|string, string>,
 *   monthlyProfit: Map<string, { year: number, month: number, profit: number }>,
 *   remainingByMonth: Map<string, number>,
 * }}
 */
export function allocateRemittedWithdrawals(orders, withdrawals) {
  const monthlyProfit = buildMonthlyProfitLedger(orders);
  const remainingByMonth = new Map();
  for (const [key, v] of monthlyProfit) {
    remainingByMonth.set(key, v.profit);
  }
  const sortedMonths = [...remainingByMonth.keys()].sort();

  const remitted = sortWithdrawalsChronological(
    (withdrawals || []).filter(
      (w) => String(w.status || "").toLowerCase() === "remitted",
    ),
  );

  const byMonth = new Map();
  const primaryMonthById = new Map();

  const pushAlloc = (key, w, amount, overflow = false) => {
    if (!(amount > 0)) return;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push({
      id: w.id,
      amount: Math.round(Number(w.amount) || 0),
      allocatedAmount: amount,
      overflow: !!overflow,
      remitted_at: w.remitted_at || null,
      requested_at: w.requested_at || null,
      remittance_memo: w.remittance_memo || "",
      status: w.status,
    });
    if (!primaryMonthById.has(w.id)) primaryMonthById.set(w.id, key);
  };

  for (const w of remitted) {
    let left = Math.round(Number(w.amount) || 0);
    if (left <= 0) continue;
    for (const key of sortedMonths) {
      if (left <= 0) break;
      const avail = remainingByMonth.get(key) || 0;
      if (avail <= 0) continue;
      const take = Math.min(avail, left);
      remainingByMonth.set(key, avail - take);
      left -= take;
      pushAlloc(key, w, take, false);
    }
    if (left > 0) {
      // 超額（異常／資料缺口）：掛到申請所屬台北月，仍可稽核、不消失
      const { year, month } = taipeiYearMonth(
        w.requested_at || w.remitted_at || w.created_at,
      );
      pushAlloc(settlementMonthKey(year, month), w, left, true);
    }
  }

  return { byMonth, primaryMonthById, monthlyProfit, remainingByMonth };
}

/**
 * 預覽：若「審核中／已核准待匯」此刻標記已匯，會對沖到哪些成交月（供 Boss 防重複匯款）
 */
export function previewOpenWithdrawalAllocation(orders, allWithdrawals) {
  const remitted = (allWithdrawals || []).filter(
    (w) => String(w.status || "").toLowerCase() === "remitted",
  );
  const open = sortWithdrawalsChronological(
    (allWithdrawals || []).filter((w) => {
      const s = String(w.status || "").toLowerCase();
      return s === "pending" || s === "approved";
    }),
  );
  if (!open.length) {
    return { byMonth: new Map(), totalOpen: 0 };
  }
  const simulated = [
    ...remitted,
    ...open.map((w) => ({
      ...w,
      status: "remitted",
      remitted_at: w.remitted_at || new Date().toISOString(),
    })),
  ];
  const after = allocateRemittedWithdrawals(orders, simulated);
  const byMonth = new Map();
  let totalOpen = 0;
  for (const w of open) {
    totalOpen += Math.round(Number(w.amount) || 0);
    for (const [key, rows] of after.byMonth) {
      for (const row of rows) {
        if (row.id !== w.id) continue;
        if (!byMonth.has(key)) byMonth.set(key, []);
        byMonth.get(key).push(row);
      }
    }
  }
  return { byMonth, totalOpen };
}

/**
 * 匯款備註應對準「此筆提領主要對沖的成交月」（FIFO 首月），與對帳單 JEKO-YYYYMM 一致。
 */
export function remittanceMemoForWithdrawal(orders, withdrawals, withdrawal) {
  const asRemitted = {
    ...withdrawal,
    status: "remitted",
    remitted_at:
      withdrawal.remitted_at ||
      withdrawal.processed_at ||
      new Date().toISOString(),
  };
  const others = (withdrawals || []).filter((w) => w.id !== withdrawal.id);
  const { primaryMonthById } = allocateRemittedWithdrawals(orders, [
    ...others.filter((w) => String(w.status || "").toLowerCase() === "remitted"),
    asRemitted,
  ]);
  const key = primaryMonthById.get(withdrawal.id);
  if (key) {
    const [ys, ms] = key.split("-");
    return {
      year: Number(ys),
      month: Number(ms),
      memo: null, // caller fills with partner code
      monthKey: key,
    };
  }
  const { year, month } = taipeiYearMonth(
    withdrawal.requested_at || withdrawal.created_at,
  );
  return { year, month, memo: null, monthKey: settlementMonthKey(year, month) };
}

export function remittanceMemo(year, month, partnerCode) {
  const code = String(partnerCode || "PARTNER")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32);
  return `JEKO-${year}${String(month).padStart(2, "0")}-${code || "PARTNER"}`;
}

export function isPayableSettlementOrder(order) {
  const s = String(order?.status || "").toLowerCase();
  if (s !== "completed") return false;
  if (order?.refunded_at) return false;
  return true;
}

function isPayableOrder(order) {
  return isPayableSettlementOrder(order);
}

function fmtNtd(n) {
  const v = Math.round(Number(n) || 0);
  return `NT$ ${v.toLocaleString("zh-TW")}`;
}

function fmtDateTaipei(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(iso).slice(0, 16);
  }
}

/**
 * @deprecated 舊「時間窗」扣減會跨月重複；請改用 allocateRemittedWithdrawals（FIFO）。
 * 保留匯出以免外部引用炸掉。
 */
export function filterWithdrawalsForSettlementPeriod(
  withdrawals,
  { start, payoutEnd },
) {
  const startMs = start.getTime();
  const endMs = payoutEnd.getTime();
  return (withdrawals || []).filter((w) => {
    if (String(w.status || "").toLowerCase() !== "remitted") return false;
    const t = withdrawalEventTime(w);
    return Number.isFinite(t) && t >= startMs && t <= endMs;
  });
}

/**
 * @param {object} partner
 * @param {object[]} orders - already filtered or full list
 * @param {{ year: number, month: number }} period
 * @param {object[]} [withdrawals] - partner_withdrawal_requests rows（含 pending/approved/remitted 較佳）
 */
export function buildPartnerSettlementStatement(
  partner,
  orders,
  period,
  withdrawals = [],
) {
  const { start, end, year, month } = taipeiMonthBounds(
    period.year,
    period.month,
  );
  const schedule = settlementScheduleLabel(year, month);
  const code =
    partner.referral_code || partner.slug || String(partner.id || "");
  const memo = remittanceMemo(year, month, code);
  const periodKey = settlementMonthKey(year, month);

  const { byMonth } = allocateRemittedWithdrawals(orders, withdrawals);
  const deductedWithdrawals = byMonth.get(periodKey) || [];
  const withdrawnPaid = deductedWithdrawals.reduce(
    (s, w) => s + Math.round(Number(w.allocatedAmount ?? w.amount) || 0),
    0,
  );

  const openPreview = previewOpenWithdrawalAllocation(orders, withdrawals);
  const openAgainstPeriod = openPreview.byMonth.get(periodKey) || [];
  const openReservedPeriod = openAgainstPeriod.reduce(
    (s, w) => s + Math.round(Number(w.allocatedAmount ?? w.amount) || 0),
    0,
  );

  const inPeriod = (orders || []).filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });

  const payable = inPeriod.filter(isPayableOrder);
  const excluded = inPeriod.filter((o) => !isPayableOrder(o));

  const rows = payable.map((o) => ({
    id: o.id,
    created_at: o.created_at,
    status: o.status,
    summary: orderItemsLabel(o),
    total_amount: Math.round(Number(o.total_amount) || 0),
    b2b_cost: Math.round(Number(o.b2b_cost) || 0),
    partner_profit: Math.round(Number(o.partner_profit) || 0),
  }));

  const totalRevenue = rows.reduce((s, r) => s + r.total_amount, 0);
  const totalCost = rows.reduce((s, r) => s + r.b2b_cost, 0);
  const totalProfit = rows.reduce((s, r) => s + r.partner_profit, 0);
  /** 已匯對沖後，本期應再匯給夥伴的月結金額（對帳唯一真相） */
  const netPayable = Math.max(0, totalProfit - withdrawnPaid);
  /**
   * 若尚有審核中／待匯提領將對沖本期，月結實匯上限應再扣除，避免與提領雙重給付。
   * opsSafePayable = 建議實際可再匯出上限
   */
  const opsSafePayable = Math.max(0, netPayable - openReservedPeriod);

  return {
    partner: {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      code,
      cooperation_model: partner.cooperation_model,
    },
    period: {
      year,
      month,
      label: `${year} 年 ${month} 月`,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    },
    schedule,
    remittanceMemo: memo,
    counts: {
      payable: rows.length,
      excluded: excluded.length,
      withdrawalsDeducted: deductedWithdrawals.length,
      openAgainstPeriod: openAgainstPeriod.length,
    },
    totals: {
      revenue: totalRevenue,
      cost: totalCost,
      profit: totalProfit,
      withdrawnPaid,
      netPayable,
      openReservedPeriod,
      opsSafePayable,
    },
    withdrawalsDeducted: deductedWithdrawals.map((w) => ({
      id: w.id,
      amount: Math.round(Number(w.amount) || 0),
      allocatedAmount: Math.round(Number(w.allocatedAmount ?? w.amount) || 0),
      overflow: !!w.overflow,
      remitted_at: w.remitted_at || null,
      requested_at: w.requested_at || null,
      remittance_memo: w.remittance_memo || "",
    })),
    openWithdrawalsAgainstPeriod: openAgainstPeriod.map((w) => ({
      id: w.id,
      amount: Math.round(Number(w.amount) || 0),
      allocatedAmount: Math.round(Number(w.allocatedAmount ?? w.amount) || 0),
      requested_at: w.requested_at || null,
      status: w.status,
    })),
    rows,
    excluded: excluded.map((o) => ({
      id: o.id,
      created_at: o.created_at,
      status: o.status,
      refunded_at: o.refunded_at || null,
      partner_profit: Math.round(Number(o.partner_profit) || 0),
    })),
    generatedAt: new Date().toISOString(),
  };
}

export function settlementStatementFilename(statement) {
  const { year, month } = statement.period;
  const code = String(statement.partner.code || "PARTNER").toUpperCase();
  return `JEKO-對帳單-${year}${String(month).padStart(2, "0")}-${code}.html`;
}

/** 首頁表頭較多，後續頁可多放幾列 */
const ROWS_FIRST_PAGE = 12;
const ROWS_CONT_PAGE = 22;

function chunkRows(rows, firstSize, contSize) {
  if (!rows.length) return [[]];
  const pages = [];
  pages.push(rows.slice(0, firstSize));
  let i = firstSize;
  while (i < rows.length) {
    pages.push(rows.slice(i, i + contSize));
    i += contSize;
  }
  return pages;
}

function renderOrderRowsHtml(rows, startIndex) {
  if (!rows.length) {
    return `<tr><td colspan="6" class="empty">本月無應付分潤訂單</td></tr>`;
  }
  return rows
    .map((r, idx) => {
      const n = startIndex + idx + 1;
      return `
      <tr>
        <td class="num">${n}</td>
        <td class="mono">#${String(r.id).slice(0, 8)}</td>
        <td>${fmtDateTaipei(r.created_at)}</td>
        <td>${escapeHtml(r.summary)}<div class="muted">成本 ${fmtNtd(r.b2b_cost)}</div></td>
        <td class="right">${fmtNtd(r.total_amount)}</td>
        <td class="right profit">${fmtNtd(r.partner_profit)}</td>
      </tr>`;
    })
    .join("");
}

function tableBlock(rowsHtml, contLabel) {
  return `
    <h3 class="section-title">應付訂單明細（僅計已完成且未退款）${contLabel ? ` <span class="cont">${escapeHtml(contLabel)}</span>` : ""}</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>訂單</th>
          <th>時間</th>
          <th>品項</th>
          <th class="right">實付</th>
          <th class="right">夥伴分潤</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
}

/** 產生可另存／列印成 PDF 的 A4 多頁 HTML（螢幕也呈現分頁） */
export function renderSettlementStatementHtml(statement) {
  const p = statement.partner;
  const { label } = statement.period;
  const rowPages = chunkRows(statement.rows, ROWS_FIRST_PAGE, ROWS_CONT_PAGE);

  // 末頁若明細太滿，把合計／說明另開一頁
  const lastChunk = rowPages[rowPages.length - 1] || [];
  const needClosingPage = lastChunk.length > 14;
  if (needClosingPage) {
    rowPages.push([]); // closing-only page
  }

  const totalPages = rowPages.length;
  const excludedHtml = statement.excluded.length
    ? statement.excluded
        .slice(0, 40)
        .map((o) => {
          const statusZh = statementOrderStatusLabel(o);
          return `<li>#${String(o.id).slice(0, 8)} · <strong>${escapeHtml(statusZh)}</strong> · ${fmtDateTaipei(o.created_at)}</li>`;
        })
        .join("") +
      (statement.excluded.length > 40
        ? `<li>…其餘 ${statement.excluded.length - 40} 筆略</li>`
        : "")
    : "";

  let rowOffset = 0;
  const sheetsHtml = rowPages
    .map((chunk, pageIndex) => {
      const pageNo = pageIndex + 1;
      const isFirst = pageIndex === 0;
      const isLast = pageIndex === totalPages - 1;
      const isClosingOnly = isLast && chunk.length === 0 && needClosingPage;
      const contLabel =
        !isFirst && !isClosingOnly ? `（續 ${pageNo}/${totalPages}）` : "";

      const cover = isFirst
        ? `
    <div class="header">
      <div>
        <div class="brand-mark">Jeko eSIM</div>
        <p class="doc-title">合作夥伴分潤對帳單</p>
        <p class="sub">電子檔 · 匯款附件</p>
      </div>
      <div class="meta">
        <strong>結算期間 ${escapeHtml(label)}</strong>
        單號備註建議：<br/>
        <span class="mono-strong">${escapeHtml(statement.remittanceMemo)}</span><br/><br/>
        開立時間：${fmtDateTaipei(statement.generatedAt)}
      </div>
    </div>
    <div class="grid">
      <div class="card">
        <h3>夥伴資料</h3>
        <p><strong>${escapeHtml(p.name || "—")}</strong></p>
        <p>Email：${escapeHtml(p.email || "—")}</p>
        <p>夥伴代碼：${escapeHtml(String(p.code || "").toUpperCase())}</p>
        <p>合作模式：${p.cooperation_model === "referral" ? "專屬折扣碼連結" : "專屬商店／其他"}</p>
      </div>
      <div class="card">
        <h3>時程</h3>
        <p>訂單歸屬月：${escapeHtml(label)}</p>
        <p>結算日：${escapeHtml(statement.schedule.settleLabel)}</p>
        <p>匯款日：${escapeHtml(statement.schedule.payoutLabel)}</p>
        <p class="mt">本期分潤</p>
        <p class="big">${fmtNtd(statement.totals.profit)}</p>
        ${
          Number(statement.totals.withdrawnPaid) > 0
            ? `<p class="mt">已加速提領對沖 −${fmtNtd(statement.totals.withdrawnPaid)}</p>`
            : ""
        }
        <p class="mt">本期應匯</p>
        <p class="big">${fmtNtd(statement.totals.netPayable ?? statement.totals.profit)}</p>
        ${
          Number(statement.totals.openReservedPeriod) > 0
            ? `<p class="mt warn">尚有待審／待匯提領將對沖本期 −${fmtNtd(statement.totals.openReservedPeriod)}；建議實匯上限 ${fmtNtd(statement.totals.opsSafePayable)}</p>`
            : ""
        }
      </div>
    </div>
    <div class="memo">
      <div class="memo-label">平台匯款備註（由本公司於網銀填寫，請夥伴入帳時核對）</div>
      <code>${escapeHtml(statement.remittanceMemo)}</code>
      <div class="memo-hint">請於匯款前以 Email／LINE 確認帳戶資料與本對帳單金額；夥伴確認後始進行匯款。</div>
    </div>`
        : `
    <div class="header compact">
      <div>
        <div class="brand-mark sm">Jeko eSIM</div>
        <p class="doc-title sm">合作夥伴分潤對帳單${isClosingOnly ? " · 合計與簽核" : " · 明細續頁"}</p>
      </div>
      <div class="meta">
        <strong>${escapeHtml(label)} · ${escapeHtml(String(p.code || "").toUpperCase())}</strong>
        ${escapeHtml(statement.remittanceMemo)}
      </div>
    </div>`;

      let body = "";
      if (!isClosingOnly) {
        body += tableBlock(renderOrderRowsHtml(chunk, rowOffset), contLabel);
        rowOffset += chunk.length;
      }

      if (isLast) {
        body += `
    <div class="totals">
      <div class="totals-box">
        <div><span>應付筆數</span><span>${statement.counts.payable}</span></div>
        <div><span>訂單實付合計</span><span>${fmtNtd(statement.totals.revenue)}</span></div>
        <div><span>本期分潤</span><span>${fmtNtd(statement.totals.profit)}</span></div>
        <div><span>加速提領已匯（FIFO 對沖）</span><span>−${fmtNtd(statement.totals.withdrawnPaid || 0)}</span></div>
        <div><span>本期應匯</span><span>${fmtNtd(statement.totals.netPayable ?? statement.totals.profit)}</span></div>
        ${
          Number(statement.totals.openReservedPeriod) > 0
            ? `<div><span>待審／待匯將對沖本期</span><span>−${fmtNtd(statement.totals.openReservedPeriod)}</span></div>
        <div><span>建議實匯上限</span><span>${fmtNtd(statement.totals.opsSafePayable)}</span></div>`
            : ""
        }
      </div>
    </div>
    <div class="notes">
      <h4>說明</h4>
      <ul>
        <li>本對帳單依系統訂單紀錄產製，結算基準為訂單建立日所屬曆月（台北時間）。</li>
        <li>僅列入狀態為「已完成」且未退款之訂單；取消、退款或其他狀態不計入本期應付。</li>
        <li>分潤結算日為成交月之次月 15 日；實際匯款為夥伴申請提領後 10 個工作天內（遇金融機構非營業日得順延）。</li>
        <li>已匯加速提領以「先提領先對沖較早成交月」規則扣減（每筆金額只扣一次，不跨月重複），與提領審核／可提領餘額同一帳本。</li>
        <li>月結「本期應匯」為對帳金額；若尚有審核中或已核准待匯之提領，請先完成該流程或僅匯「建議實匯上限」，避免重複給付。</li>
        <li>網銀備註請填本單之 <code>${escapeHtml(statement.remittanceMemo)}</code>；加速提領之備註亦對應其對沖成交月。</li>
        <li>匯款前須經夥伴確認本對帳單金額與收款帳戶；確認後由平台匯入指定帳戶。</li>
        <li>本文件為電子檔；正式效力以雙方確認之版本與匯款憑證為準。</li>
      </ul>
      ${
        (statement.withdrawalsDeducted || []).length
          ? `<h4 class="mt">本期扣減之加速提領（${statement.counts.withdrawalsDeducted}）</h4><ul>${statement.withdrawalsDeducted
              .map(
                (w) =>
                  `<li>#${w.id} 申請 ${fmtNtd(w.amount)}／對沖本期 ${fmtNtd(w.allocatedAmount ?? w.amount)}${w.overflow ? "（超額掛帳）" : ""}${w.remittance_memo ? ` · ${escapeHtml(w.remittance_memo)}` : ""}</li>`,
              )
              .join("")}</ul>`
          : ""
      }
      ${
        (statement.openWithdrawalsAgainstPeriod || []).length
          ? `<h4 class="mt">尚待處理、將對沖本期之提領（${statement.counts.openAgainstPeriod || statement.openWithdrawalsAgainstPeriod.length}）</h4><ul>${statement.openWithdrawalsAgainstPeriod
              .map(
                (w) =>
                  `<li>#${w.id} 申請 ${fmtNtd(w.amount)}／預估對沖 ${fmtNtd(w.allocatedAmount ?? w.amount)}</li>`,
              )
              .join("")}</ul>`
          : ""
      }
      ${
        excludedHtml
          ? `<h4 class="mt">本期未計入（${statement.counts.excluded}）</h4><ul>${excludedHtml}</ul>`
          : ""
      }
    </div>
    <div class="sign">
      <div class="box">平台經辦／日期</div>
      <div class="box">夥伴確認（簽名或回覆「確認」）／日期</div>
    </div>`;
      }

      return `
  <section class="sheet" data-page="${pageNo}">
    <div class="page-badge">第 ${pageNo} / ${totalPages} 頁</div>
    ${cover}
    ${body}
    <div class="footer">
      <div>藍鏈數位企業社 · Jeko eSIM · support@jeko-esim.com.tw</div>
      <div>${escapeHtml(label)} · ${escapeHtml(statement.remittanceMemo)} · ${pageNo}/${totalPages}</div>
    </div>
  </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(settlementStatementFilename(statement))}</title>
<style>
  :root {
    --ink: #0f172a;
    --muted: #64748b;
    --line: #e2e8f0;
    --brand: #1a56db;
    --soft: #f1f5f9;
    --desk: #c5d0de;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
    color: var(--ink);
    background: var(--desk);
    font-size: 11.5px;
    line-height: 1.45;
  }
  .toolbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; gap: 10px; justify-content: space-between; align-items: center;
    padding: 12px 16px;
    background: rgba(15,23,42,.94);
    color: #fff;
  }
  .toolbar .left { color: #cbd5e1; font-size: 12px; }
  .toolbar button {
    border: 0; border-radius: 6px; padding: 8px 14px;
    font-weight: 700; cursor: pointer; font-size: 13px;
    background: #fff; color: var(--ink);
  }
  .sheet {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    margin: 18px auto;
    background: #fff;
    padding: 14mm 14mm 16mm;
    box-shadow: 0 10px 28px rgba(15,23,42,.18);
    border: 1px solid #94a3b8;
    display: flex;
    flex-direction: column;
    page-break-after: always;
    break-after: page;
  }
  .sheet:last-of-type {
    page-break-after: auto;
    break-after: auto;
    margin-bottom: 40px;
  }
  .page-badge {
    position: absolute; top: 8mm; right: 10mm;
    font-size: 10px; font-weight: 800; color: var(--brand);
    background: #eff6ff; border: 1px solid #bfdbfe;
    border-radius: 999px; padding: 3px 10px;
  }
  .header {
    display: flex; justify-content: space-between; gap: 16px;
    border-bottom: 3px solid var(--brand); padding-bottom: 12px; margin-bottom: 14px;
    padding-right: 70px;
  }
  .header.compact { border-bottom-width: 2px; margin-bottom: 10px; padding-bottom: 8px; }
  .brand-mark { font-size: 20px; font-weight: 900; letter-spacing: .04em; color: var(--brand); }
  .brand-mark.sm { font-size: 16px; }
  .doc-title { font-size: 17px; font-weight: 800; margin: 4px 0 0; }
  .doc-title.sm { font-size: 14px; }
  .sub { margin: 4px 0 0; color: var(--muted); }
  .meta { text-align: right; color: var(--muted); font-size: 11px; }
  .meta strong { color: var(--ink); display: block; font-size: 12px; margin-bottom: 2px; }
  .mono-strong { font-family: ui-monospace, Menlo, monospace; font-weight: 800; color: var(--ink); }
  .grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px; margin-bottom: 12px; }
  .card {
    background: var(--soft); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px;
  }
  .card h3 {
    margin: 0 0 6px; font-size: 10px; letter-spacing: .08em;
    text-transform: uppercase; color: var(--muted);
  }
  .card p { margin: 0 0 3px; }
  .card .big { font-size: 18px; font-weight: 900; color: var(--brand); }
  .mt { margin-top: 8px !important; }
  .warn { color: #b45309; font-weight: 700; font-size: 11px; }
  .memo {
    margin: 0 0 12px; padding: 10px 12px;
    border: 1px dashed var(--brand); border-radius: 10px; background: #eff6ff;
  }
  .memo-label, .memo-hint { font-size: 10px; color: var(--muted); }
  .memo-hint { margin-top: 4px; }
  .memo code {
    font-family: ui-monospace, Menlo, monospace;
    font-weight: 800; font-size: 13px; color: var(--brand);
  }
  .section-title { margin: 0 0 4px; font-size: 12px; }
  .section-title .cont { color: var(--brand); font-weight: 700; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th, td {
    border-bottom: 1px solid var(--line); padding: 6px 5px; text-align: left; vertical-align: top;
  }
  th {
    font-size: 9px; letter-spacing: .06em; text-transform: uppercase;
    color: var(--muted); background: #f8fafc;
  }
  td.right, th.right { text-align: right; }
  td.num { width: 28px; color: var(--muted); }
  td.mono { font-family: ui-monospace, Menlo, monospace; font-size: 10px; }
  td.profit { font-weight: 800; color: var(--brand); white-space: nowrap; }
  td .muted { color: var(--muted); font-size: 9px; margin-top: 1px; }
  td.empty { text-align: center; color: var(--muted); padding: 20px; }
  .totals { margin-top: 12px; display: flex; justify-content: flex-end; }
  .totals-box {
    min-width: 240px; border: 1px solid var(--line); border-radius: 10px; overflow: hidden;
  }
  .totals-box div {
    display: flex; justify-content: space-between; padding: 7px 12px; border-bottom: 1px solid var(--line);
  }
  .totals-box div:last-child {
    border-bottom: 0; background: var(--brand); color: #fff; font-weight: 900; font-size: 13px;
  }
  .notes { margin-top: 14px; color: var(--muted); font-size: 10px; }
  .notes h4 { margin: 0 0 4px; color: var(--ink); font-size: 11px; }
  .notes ul { margin: 0; padding-left: 16px; }
  .sign {
    margin-top: 22px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  }
  .sign .box {
    border-top: 1px solid #94a3b8; padding-top: 8px; min-height: 40px; color: var(--muted);
  }
  .footer {
    margin-top: auto;
    padding-top: 10px; border-top: 1px solid var(--line);
    display: flex; justify-content: space-between; gap: 16px; color: var(--muted); font-size: 9px;
  }
  @media print {
    body { background: #fff; }
    .toolbar { display: none !important; }
    .sheet {
      margin: 0; box-shadow: none; border: 0;
      width: auto; min-height: auto;
      padding: 10mm 12mm;
      page-break-after: always;
      break-after: page;
    }
    .sheet:last-of-type { page-break-after: auto; break-after: auto; }
    .page-badge { top: 4mm; right: 6mm; }
    tr { break-inside: avoid; page-break-inside: avoid; }
  }
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
  <div class="toolbar">
    <div class="left">A4 預覽 · 共 ${totalPages} 頁 · 建議「列印 → 儲存為 PDF」</div>
    <button type="button" onclick="window.print()">列印／另存 PDF</button>
  </div>
  ${sheetsHtml}
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
