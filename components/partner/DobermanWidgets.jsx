import { useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import { PARTNER_UI } from "@/lib/partnerUi";

export const fmt = (n) => `NT$${Math.round(Number(n) || 0).toLocaleString()}`;

/** 各指標說明文案（繁體中文） */
export const METRIC_HELP = {
  totalProfit: {
    title: "累計分潤（淨收益）",
    body: "在所選報表期間內，透過您的專屬推薦連結或專屬賣場成交之有效訂單，合計歸屬於您的分潤金額。",
    bullets: [
      "統計範圍：狀態為「已付款」或「待付款」的訂單",
      "專屬連結：依約定成本加成點數計算分潤",
      "專屬商店：客戶實付 − 底價等成本後之夥伴分潤",
      "已取消、已退款訂單不計入",
      "此為預估淨收益；實際以次月 15 日結算對帳單為準，匯款為申請提領後 10 個工作天內（最低額／凍結天數；每月第 1 次免手續費，之後每次 NT$15）。",
    ],
  },
  storeRevenue: {
    title: "店鋪營收報表",
    body: "顯示報表期間內，經由您賣場產生之訂單金流概況。",
    bullets: [
      "受取合計：客戶實際付款總額（含所有有效訂單）",
      "底價成本：您需支付給平台的 API / 批發成本合計",
      "營收 − 底價 = 毛分潤（尚未扣除金流手續費）",
    ],
  },
  referralVolume: {
    title: "推廣訂單金額",
    body: "經您的專屬推薦連結成交之訂單金流概況（售價與官網相同，您不需訂價）。",
    bullets: [
      "旅客付款合計：客戶在官網實際付款總額",
      "方案成本合計：對應方案的供應成本合計",
      "您的分潤依「成本 × 約定趴數」計算，詳見儀表板上方說明",
    ],
  },
  profitRate: {
    title: "分潤占營收",
    body: "反映報表期間內，您的分潤占店鋪營收的比例（不是商店加價趴數）。",
    bullets: [
      "計算：累計分潤 ÷ 店鋪營收 × 100%",
      "白話：客人每付 NT$100，約有多少元是您的分潤",
      "≠ 商店「加價 %」、≠ 平台底價兩成、≠ 專屬連結約 15%",
      "會因各商品定價、折扣、金流手續費而浮動",
      "有效訂單：已付款 + 待付款，不含取消／退款",
    ],
  },
  productShare: {
    title: "商品分潤報表",
    body: "以圓餅圖呈現各 eSIM 商品方案的分潤占比，協助您了解哪些商品貢獻最多收益。",
    bullets: [
      "依各商品「分潤金額」占總分潤的百分比計算",
      "最多顯示前 6 名商品，其餘合併為其他",
      "僅統計報表期間內的有效訂單",
    ],
  },
  topProduct: {
    title: "熱銷商品 Top",
    body: "報表期間內，銷售張數（訂單筆數）最高的 eSIM 商品方案。",
    bullets: [
      "以訂單數量排序，非以分潤金額排序",
      "同一商品多筆訂單會累計計算",
      "尚無訂單時顯示「尚無資料」",
    ],
  },
  productCategory: {
    title: "商品分類",
    body: "統計報表期間內，有產生分潤的商品種類數量，以及分潤最高的分類。",
    bullets: [
      "分類依商品名稱或地區代碼自動判斷（如 JP、韓國、美國）",
      "「種」代表有分潤紀錄的不同商品數",
    ],
  },
  revenueTrend: {
    title: "收益趨勢",
    body: "折線圖依「日／月／季／年」顯示分潤、店鋪營收與底價成本變化。",
    bullets: [
      "藍線：我的分潤（淨收益）",
      "綠色虛線：店鋪營收（客戶付款總額）",
      "灰線：底價成本合計",
      "時間以台北時區、訂單建立日期歸桶",
      "可於報表列切換日／月／季／年視角",
    ],
  },
  orderVolume: {
    title: "訂單量分析",
    body: "柱狀圖依所選時間粒度顯示有效推廣訂單數量。",
    bullets: [
      "僅計入已付款與待付款訂單",
      "粒度與上方「日／月／季／年」同步",
      "可用於觀察推廣成效與季節性變化",
    ],
  },
  cumulativeProfit: {
    title: "累計分潤",
    body: "所有有效訂單（含待結算）的分潤合計，不限報表期間篩選。",
    bullets: ["含已付款與待付款訂單", "為歷史累計總額，非單月數據"],
  },
  validOrders: {
    title: "有效訂單",
    body: "透過您的賣場或推薦連結產生、且尚未取消的有效訂單總筆數。",
    bullets: [
      "已付款：客戶已完成付款／結帳（狀態：已完成）",
      "待付款：客戶已下單但尚未完成付款",
      "詳情列表會清楚標示以上兩種狀態",
    ],
  },
  storeRevenueAll: {
    title: "店鋪營收",
    body: "所有有效訂單中，客戶實際付款金額的合計。",
    bullets: [
      "為客戶端看到的結帳金額總和",
      "不等於您的分潤，需扣除底價與手續費",
    ],
  },
};

/** 說明 Popup — 直角、無圓角 */
export function MetricHelpPopup({ open, onClose, title, body, bullets = [] }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white border-2 border-slate-800 shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="metric-help-title"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-slate-200 bg-[#f8fafc]">
          <div className="flex items-center gap-2 min-w-0">
            <MaterialIcon
              name="info"
              size={22}
              className="text-[#1E4AD1] shrink-0"
            />
            <h2
              id="metric-help-title"
              className="text-sm font-black text-slate-800 truncate"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition shrink-0"
            aria-label="關閉"
          >
            <MaterialIcon name="close" size={22} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {body && (
            <p className="text-sm text-slate-700 leading-relaxed">{body}</p>
          )}
          {bullets.length > 0 && (
            <ul className="space-y-2 border-t border-slate-200 pt-3">
              {bullets.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed"
                >
                  <MaterialIcon
                    name="arrow_right"
                    size={14}
                    className="text-[#1E4AD1] shrink-0 mt-0.5"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-5 py-3 border-t-2 border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-white hover:brightness-110 border transition"
            style={{
              backgroundColor: PARTNER_UI.navy,
              borderColor: PARTNER_UI.navy,
            }}
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}

/** 可點擊的指標標題列 */
export function MetricPanelHeader({ icon, title, help, href }) {
  const [showHelp, setShowHelp] = useState(false);
  const clickable = !!help && !href;

  const inner = (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <MaterialIcon
          name={icon}
          size={20}
          className="text-[#1E4AD1] shrink-0"
        />
        <span
          className={`text-sm font-bold text-slate-800 truncate ${
            clickable
              ? "underline decoration-dotted decoration-slate-400 underline-offset-2"
              : ""
          }`}
        >
          {title}
        </span>
        {clickable && (
          <MaterialIcon
            name="help_outline"
            size={16}
            className="text-slate-400 shrink-0"
          />
        )}
      </div>
      <MaterialIcon
        name={clickable ? "chevron_right" : "chevron_right"}
        size={20}
        className={`shrink-0 ${clickable ? "text-[#1E4AD1]" : "text-slate-400"}`}
      />
    </>
  );

  const headerClass =
    "relative flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-[#F7F9FB]";

  return (
    <>
      {href ? (
        <a href={href} className={headerClass}>
          <span
            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
            style={{ backgroundColor: PARTNER_UI.yellow }}
          />
          {inner}
        </a>
      ) : clickable ? (
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className={`${headerClass} w-full text-left cursor-pointer hover:bg-[#eef2f7] transition`}
        >
          <span
            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
            style={{ backgroundColor: PARTNER_UI.yellow }}
          />
          {inner}
        </button>
      ) : (
        <div className={headerClass}>
          <span
            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
            style={{ backgroundColor: PARTNER_UI.yellow }}
          />
          {inner}
        </div>
      )}
      {help && (
        <MetricHelpPopup
          open={showHelp}
          onClose={() => setShowHelp(false)}
          title={help.title || title}
          body={help.body}
          bullets={help.bullets}
        />
      )}
    </>
  );
}

function taipeiTodayYmd() {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function ymdParts(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return { y, m, d };
}

function addCalendarDays(ymd, n) {
  const { y, m, d } = ymdParts(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function prevMonthRange() {
  const now = new Date();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${last}`;
  return { start, end };
}

export function thisMonthRange() {
  const end = taipeiTodayYmd();
  const { y, m } = ymdParts(end);
  return {
    start: `${y}-${String(m).padStart(2, "0")}-01`,
    end,
  };
}

export function lastNDaysRange(n = 14) {
  const end = taipeiTodayYmd();
  const start = addCalendarDays(end, -(Math.max(1, n) - 1));
  return { start, end };
}

export function lastNMonthsRange(n = 6) {
  const end = taipeiTodayYmd();
  const { y, m } = ymdParts(end);
  const total = y * 12 + (m - 1) - (Math.max(1, n) - 1);
  const sy = Math.floor(total / 12);
  const sm = (total % 12) + 1;
  return { start: `${sy}-${String(sm).padStart(2, "0")}-01`, end };
}

export function thisQuarterRange() {
  const end = taipeiTodayYmd();
  const { y, m } = ymdParts(end);
  const qStart = Math.floor((m - 1) / 3) * 3 + 1;
  return { start: `${y}-${String(qStart).padStart(2, "0")}-01`, end };
}

export function lastNQuartersRange(n = 4) {
  const end = taipeiTodayYmd();
  const { y, m } = ymdParts(end);
  const q = Math.ceil(m / 3);
  let ty = y;
  let tq = q - (Math.max(1, n) - 1);
  while (tq <= 0) {
    tq += 4;
    ty -= 1;
  }
  const sm = (tq - 1) * 3 + 1;
  return { start: `${ty}-${String(sm).padStart(2, "0")}-01`, end };
}

export function thisYearRange() {
  const end = taipeiTodayYmd();
  const { y } = ymdParts(end);
  return { start: `${y}-01-01`, end };
}

export function lastNYearsRange(n = 3) {
  const end = taipeiTodayYmd();
  const { y } = ymdParts(end);
  const sy = y - (Math.max(1, n) - 1);
  return { start: `${sy}-01-01`, end };
}

const DEFAULT_GRANULARITIES = [
  { id: "day", label: "日" },
  { id: "month", label: "月" },
  { id: "quarter", label: "季" },
  { id: "year", label: "年" },
];

export function ReportPeriodBar({
  rangeStart,
  rangeEnd,
  onRangeStartChange,
  onRangeEndChange,
  onQuickRange,
  onExport,
  granularity,
  onGranularityChange,
  granularities = DEFAULT_GRANULARITIES,
}) {
  const analyticsMode = typeof onGranularityChange === "function";
  const quickLinks = !analyticsMode
    ? [
        { id: "prevMonth", label: "前月" },
        { id: "thisMonth", label: "當月" },
      ]
    : granularity === "day"
      ? [
          { id: "last7d", label: "近 7 日" },
          { id: "last14d", label: "近 14 日" },
          { id: "thisMonth", label: "當月" },
        ]
      : granularity === "quarter"
        ? [
            { id: "thisQuarter", label: "本季" },
            { id: "last4q", label: "近 4 季" },
            { id: "thisYear", label: "今年" },
          ]
        : granularity === "year"
          ? [
              { id: "thisYear", label: "今年" },
              { id: "last3y", label: "近 3 年" },
            ]
          : [
              { id: "prevMonth", label: "前月" },
              { id: "thisMonth", label: "當月" },
              { id: "last6m", label: "近 6 月" },
            ];

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-5 flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 sm:flex-wrap min-w-0">
          <span className="text-xs sm:text-sm font-black text-slate-800 border border-slate-300 px-3 py-2 sm:px-4 sm:py-1.5 bg-white rounded-lg sm:rounded-none w-fit">
            報表期間
          </span>
          {analyticsMode ? (
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg w-fit">
              {granularities.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onGranularityChange(g.id)}
                  className={`min-w-[2.5rem] px-3 py-1.5 text-xs font-black rounded-md transition ${
                    granularity === g.id
                      ? "bg-[#1E4AD1] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => onRangeStartChange(e.target.value)}
              className="flex-1 sm:flex-none text-sm border border-slate-300 rounded-lg sm:rounded-none px-3 py-2.5 sm:py-1.5 focus:border-[#1E4AD1] outline-none min-w-0"
            />
            <span className="text-slate-400 shrink-0">→</span>
            <input
              type="date"
              value={rangeEnd}
              onChange={(e) => onRangeEndChange(e.target.value)}
              className="flex-1 sm:flex-none text-sm border border-slate-300 rounded-lg sm:rounded-none px-3 py-2.5 sm:py-1.5 focus:border-[#1E4AD1] outline-none min-w-0"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-sm flex-wrap">
            {quickLinks.map((q, i) => (
              <span key={q.id} className="inline-flex items-center gap-2 sm:gap-3">
                {i > 0 ? <span className="text-slate-300">｜</span> : null}
                <button
                  type="button"
                  onClick={() => onQuickRange(q.id)}
                  className="font-bold text-slate-700 hover:text-[#1E4AD1] py-1"
                >
                  {q.label}
                </button>
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onExport || (() => window.print())}
          className="inline-flex items-center justify-center gap-2 font-black text-sm px-4 py-2.5 sm:px-5 sm:py-2 shadow-sm transition shrink-0 text-[#111] hover:brightness-95 rounded-lg sm:rounded-none w-full sm:w-auto lg:w-auto"
          style={{ backgroundColor: PARTNER_UI.yellow }}
        >
          <MaterialIcon name="download" size={18} />
          匯出 PDF
        </button>
      </div>
    </div>
  );
}

export function DobermanStatusBanner({ title, message, loading }) {
  return (
    <div
      className="px-4 py-3.5 sm:px-6 sm:py-4 flex items-center gap-3 sm:gap-5 relative overflow-hidden"
      style={{ backgroundColor: PARTNER_UI.navy }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px]"
        style={{ backgroundColor: PARTNER_UI.yellow }}
      />
      <div className="w-11 h-11 sm:w-16 sm:h-16 bg-white/15 flex items-center justify-center shrink-0 border-2 border-white/30 rounded-lg sm:rounded-none">
        <MaterialIcon
          name="verified_user"
          size={28}
          className="text-white sm:hidden"
          filled
        />
        <MaterialIcon
          name="verified_user"
          size={36}
          className="text-white hidden sm:block"
          filled
        />
      </div>
      <div className="min-w-0">
        <p className="text-lg sm:text-2xl font-black text-white tracking-wide leading-snug">
          {loading ? "載入中..." : title}
        </p>
        <p className="text-xs sm:text-sm text-blue-100 mt-1 leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
}

export function DobermanPanel({ icon, title, rows, children, href, help }) {
  return (
    <div className="bg-white border border-slate-200 overflow-hidden h-full">
      <MetricPanelHeader icon={icon} title={title} help={help} href={href} />
      <div className="px-4 py-3 sm:py-4">
        {rows?.map((row) => (
          <div
            key={row.label}
            className="flex justify-between items-center gap-3 py-2"
          >
            <span className="text-xs text-slate-500 flex items-center gap-1.5 min-w-0">
              {row.arrow && (
                <MaterialIcon
                  name={row.arrow === "up" ? "arrow_upward" : "arrow_downward"}
                  size={16}
                  className={
                    row.arrow === "up" ? "text-[#1E4AD1]" : "text-red-400"
                  }
                />
              )}
              <span className="truncate">{row.label}</span>
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#1E4AD1] tabular-nums shrink-0">
              {row.value}
              {row.unit && (
                <span className="text-xs font-bold text-slate-500 ml-1">
                  {row.unit}
                </span>
              )}
            </span>
          </div>
        ))}
        {children}
      </div>
    </div>
  );
}

export function DobermanTopCard({
  icon,
  title,
  topLabel,
  count,
  countUnit = "筆",
  help,
}) {
  return (
    <div className="bg-white border border-slate-200 overflow-hidden">
      <MetricPanelHeader icon={icon} title={title} help={help} />
      <div className="px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400 font-bold uppercase mb-1">Top</p>
          <p className="text-sm font-bold text-slate-700 truncate leading-snug">
            {topLabel}
          </p>
        </div>
        <p className="text-xl sm:text-2xl font-black text-[#1E4AD1] tabular-nums shrink-0">
          {count}
          <span className="text-xs font-bold text-slate-500 ml-0.5">
            {countUnit}
          </span>
        </p>
      </div>
    </div>
  );
}

export function DobermanFooter({ notice }) {
  const today = new Date().toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <footer
      className="text-white min-h-10 flex items-center px-4 gap-3 shrink-0 text-xs relative py-2"
      style={{ backgroundColor: PARTNER_UI.navy }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: PARTNER_UI.yellow }}
      />
      <span className="font-mono text-blue-100 shrink-0">{today}</span>
      <div className="flex-1 border border-white/20 px-3 py-1.5 text-blue-50 truncate rounded-sm">
        {notice || "系統運作正常，分潤資料即時更新中。"}
      </div>
    </footer>
  );
}
