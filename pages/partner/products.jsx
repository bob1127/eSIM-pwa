import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import { usePartnerSession, fetchPartnerStats } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import MaterialIcon from "@/components/MaterialIcon";
import { prevMonthRange, thisMonthRange } from "@/components/partner/DobermanWidgets";
import {
  MARKUP_MODE_FIXED,
  MARKUP_MODE_PERCENT,
  applyMarkupStrategy,
  normalizeMarkupMode,
  resolveMarkupStrategy,
  resolvePartnerVariantBasePrice,
} from "@/lib/partnerPricing";
import { isHotSaleTelecom } from "@/lib/productHotSale";
import {
  CSV_EXPORT_OPTIONS,
  exportPartnerCsv,
  buildMonthlyRows,
} from "@/lib/partnerCsvExport";
import { isSettledOrderStatus } from "@/lib/refundPolicy";

const PartnerProductAnalytics = dynamic(
  () => import("@/components/partner/PartnerProductAnalytics"),
  {
    ssr: false,
    loading: () => (
      <div className="py-16 text-center text-slate-400 text-sm animate-pulse">
        載入圖表中...
      </div>
    ),
  },
);

const fmt = (n) => `NT$${Math.round(Number(n) || 0).toLocaleString()}`;
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "—";

const TABS = [
  { id: "analytics", label: "收益分析", icon: "bar_chart" },
  { id: "products", label: "商品列表", icon: "inventory_2" },
  { id: "pricing", label: "定價管理", icon: "price_change" },
  { id: "report", label: "月次報告", icon: "description" },
];

const PAGE_SIZE = 10;
const STATUS_STORAGE_KEY = "jeko_partner_product_status_v1";

function loadLocalStatusMap(storeId) {
  if (typeof window === "undefined" || !storeId) return {};
  try {
    const raw = JSON.parse(localStorage.getItem(STATUS_STORAGE_KEY) || "{}");
    return raw[String(storeId)] || {};
  } catch {
    return {};
  }
}

function saveLocalStatusMap(storeId, map) {
  if (typeof window === "undefined" || !storeId) return;
  try {
    const raw = JSON.parse(localStorage.getItem(STATUS_STORAGE_KEY) || "{}");
    raw[String(storeId)] = map;
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(raw));
  } catch {
    /* ignore */
  }
}

async function getAccessToken() {
  const session = await supabase.auth.getSession();
  return session.data.session?.access_token || "";
}

function orderStatsByName(orders = []) {
  const map = {};
  for (const o of orders) {
    if (o.status !== "completed" && o.status !== "pending") continue;
    const items = (() => {
      try {
        return Array.isArray(o.item_details)
          ? o.item_details
          : JSON.parse(o.item_details || "[]");
      } catch {
        return [];
      }
    })();
    const name = items[0]?.name;
    if (!name) continue;
    if (!map[name]) {
      map[name] = { totalSales: 0, totalProfit: 0 };
    }
    map[name].totalSales += 1;
    map[name].totalProfit += Number(o.partner_profit) || 0;
  }
  return map;
}

/* ──────────────────────────────────────────────────────────
   商品列表
────────────────────────────────────────────────────────── */
function ProductsTab({
  products,
  loading,
  onRefresh,
  onGoPricing,
  onStatusChange,
  onRemove,
}) {
  const [filterMode, setFilterMode] = useState("all");
  const [sortKey, setSortKey] = useState("profit_desc");
  const [openMenu, setOpenMenu] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [showConfirm, setShowConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [filterMode, sortKey, searchQ, products.length]);

  const displayed = useMemo(() => {
    let r = products;
    if (filterMode === "active") r = r.filter((p) => p.status === "active");
    if (filterMode === "paused") r = r.filter((p) => p.status === "paused");
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      r = r.filter((p) => String(p.name || "").toLowerCase().includes(q));
    }
    const sorted = [...r];
    if (sortKey === "profit_desc")
      sorted.sort((a, b) => b.totalProfit - a.totalProfit);
    if (sortKey === "sales_desc")
      sorted.sort((a, b) => b.totalSales - a.totalSales);
    if (sortKey === "price_asc") sorted.sort((a, b) => a.sellPrice - b.sellPrice);
    if (sortKey === "name_asc")
      sorted.sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));
    return sorted;
  }, [products, filterMode, sortKey, searchQ]);

  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = displayed.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const toggleStatus = async (product, nextStatus) => {
    if (busyId || product.status === nextStatus) return;
    setBusyId(product.id);
    try {
      await onStatusChange(product, nextStatus);
    } finally {
      setBusyId(null);
      setOpenMenu(null);
    }
  };

  const confirmRemove = async () => {
    if (!showConfirm) return;
    setBusyId(showConfirm.id);
    try {
      await onRemove(showConfirm);
      setShowConfirm(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-white border border-slate-200 rounded-xl sm:rounded-sm shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 shrink-0">
        <div>
          <h2 className="text-base font-black text-slate-800">商品列表</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            共 {displayed.length} 件
            {filterMode !== "all" ? `（篩選後）／全部 ${products.length} 件` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 min-h-10 border border-slate-300 text-slate-600 text-sm font-bold px-3 py-2 rounded-lg hover:bg-slate-50 transition"
          >
            <MaterialIcon name="refresh" size={16} />
            重新整理
          </button>
          <Link
            href="/partner/catalog"
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 min-h-10 bg-[#1E4AD1] hover:bg-[#0071EB] text-white text-sm font-bold px-4 py-2 rounded-lg transition shadow-sm"
          >
            <MaterialIcon name="add" size={18} /> 新增商品
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-500 font-bold shrink-0">顯示</span>
          {[
            ["all", "全部"],
            ["active", "已上架"],
            ["paused", "已停用"],
          ].map(([v, l]) => (
            <label key={v} className="flex items-center gap-1.5 cursor-pointer min-h-9">
              <input
                type="radio"
                name="prod_filter"
                value={v}
                checked={filterMode === v}
                onChange={() => setFilterMode(v)}
                className="accent-[#1E4AD1] w-3.5 h-3.5"
              />
              <span className="text-xs text-slate-700">{l}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <MaterialIcon
              name="search"
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="搜尋商品名稱..."
              className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-[#1E4AD1] outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MaterialIcon name="swap_vert" size={14} />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="flex-1 sm:flex-none text-sm border border-slate-300 rounded-lg px-2.5 py-2.5 focus:outline-none focus:border-[#1E4AD1] min-h-10"
            >
              <option value="profit_desc">分潤（高到低）</option>
              <option value="sales_desc">銷量（高到低）</option>
              <option value="price_asc">售價（低到高）</option>
              <option value="name_asc">名稱 A→Z</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {/* 手機卡片 */}
        <div className="md:hidden p-3 space-y-3 bg-slate-50/40">
          {loading && (
            <p className="py-10 text-center text-slate-400 text-sm">載入商品中...</p>
          )}
          {!loading && pageItems.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-sm">
              <p className="mb-3">目前沒有符合條件的商品</p>
              <Link
                href="/partner/catalog"
                className="inline-flex items-center gap-1 text-[#1E4AD1] font-bold"
              >
                <MaterialIcon name="add" size={16} />
                前往選品管理上架
              </Link>
            </div>
          )}
          {!loading &&
            pageItems.map((p) => (
              <article
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-800 leading-snug break-words">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {p.handle || "eSIM 方案"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-md ${
                      p.status === "active"
                        ? "bg-[#e0f2fe] text-[#0369a1]"
                        : "bg-[#fef3c7] text-[#92400e]"
                    }`}
                  >
                    {p.status === "active" ? "已上架" : "已停用"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 px-2 py-2">
                    <p className="text-[10px] text-slate-400 font-bold">售價</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {fmt(p.sellPrice)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2 py-2">
                    <p className="text-[10px] text-slate-400 font-bold">銷量</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {p.totalSales}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 px-2 py-2">
                    <p className="text-[10px] text-slate-400 font-bold">分潤</p>
                    <p className="text-xs font-black text-[#1E4AD1] mt-0.5">
                      {fmt(p.totalProfit)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onGoPricing(p)}
                    className="flex-1 min-h-11 text-sm font-bold rounded-lg border border-slate-200 text-slate-700"
                  >
                    編輯定價
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onStatusChange(
                        p,
                        p.status === "active" ? "paused" : "active",
                      )
                    }
                    className="min-h-11 px-3 text-sm font-bold rounded-lg border border-slate-200 text-slate-600"
                  >
                    {p.status === "active" ? "停用" : "啟用"}
                  </button>
                </div>
              </article>
            ))}
        </div>

        <table className="hidden md:table w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-slate-500 text-xs sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3 text-left font-bold">商品名</th>
              <th className="px-5 py-3 text-center font-bold">方案數</th>
              <th className="px-5 py-3 text-right font-bold">最低售價</th>
              <th className="px-5 py-3 text-right font-bold">累計銷量</th>
              <th className="px-5 py-3 text-right font-bold">累計分潤</th>
              <th className="px-5 py-3 text-center font-bold">
                上架
                <br />
                狀態
              </th>
              <th className="px-5 py-3 text-center font-bold">啟用/停用</th>
              <th className="px-5 py-3 text-center font-bold">
                定價
                <br />
                管理
              </th>
              <th className="px-5 py-3 text-center font-bold">更多</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400 text-sm">
                  載入商品中...
                </td>
              </tr>
            )}
            {!loading && pageItems.length === 0 && (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400 text-sm">
                  <p className="mb-3">目前沒有符合條件的商品</p>
                  <Link
                    href="/partner/catalog"
                    className="inline-flex items-center gap-1 text-[#1E4AD1] font-bold hover:underline"
                  >
                    <MaterialIcon name="add" size={16} />
                    前往選品管理上架
                  </Link>
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((p) => {
                const isOpen = openMenu === p.id;
                const busy = busyId === p.id;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {p.handle || "eSIM 方案"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-slate-700 font-bold">{p.plans}</span>
                    </td>
                    <td className="px-5 py-4 text-right text-slate-700">
                      {fmt(p.sellPrice)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-slate-800">
                        {p.totalSales.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 ml-0.5">張</span>
                    </td>
                    <td className="px-5 py-4 text-right font-black text-[#1E4AD1]">
                      {fmt(p.totalProfit)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-sm ${
                          p.status === "active"
                            ? "bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]"
                            : "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                        }`}
                      >
                        {p.status === "active" ? "已上架" : "已停用"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex rounded-sm overflow-hidden border border-slate-200 text-xs font-bold">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleStatus(p, "active")}
                          className={`px-3 py-1 transition ${
                            p.status === "active"
                              ? "bg-[#1E4AD1] text-white"
                              : "bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          啟用
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleStatus(p, "paused")}
                          className={`px-3 py-1 border-l border-slate-200 transition ${
                            p.status === "paused"
                              ? "bg-slate-600 text-white"
                              : "bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          停用
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => onGoPricing(p)}
                        className="text-xs border border-slate-300 rounded-sm px-3 py-1 text-slate-600 hover:border-[#1E4AD1] hover:text-[#1E4AD1] transition font-bold"
                      >
                        編輯定價
                      </button>
                    </td>
                    <td className="px-5 py-4 text-center relative">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setOpenMenu(isOpen ? null : p.id)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                        >
                          <MaterialIcon name="more_vert" size={18} />
                        </button>
                        {isOpen && (
                          <div className="absolute right-0 top-8 z-30 w-44 bg-white border border-slate-200 shadow-lg rounded-sm py-1 text-xs text-left">
                            <button
                              type="button"
                              onClick={() => {
                                onGoPricing(p);
                                setOpenMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-bold"
                            >
                              重新定價
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                toggleStatus(
                                  p,
                                  p.status === "active" ? "paused" : "active",
                                )
                              }
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-bold"
                            >
                              {p.status === "active" ? "暫停上架" : "重新啟用"}
                            </button>
                            <Link
                              href="/partner/catalog?tab=listed"
                              className="block w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-bold"
                              onClick={() => setOpenMenu(null)}
                            >
                              前往選品管理
                            </Link>
                            <hr className="my-1 border-slate-100" />
                            <button
                              type="button"
                              onClick={() => {
                                setShowConfirm(p);
                                setOpenMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-bold flex items-center gap-2"
                            >
                              <MaterialIcon name="warning" size={14} />
                              刪除商品
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 border-t border-slate-200 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <p className="text-xs text-slate-500">
          第 {safePage} / {totalPages} 頁｜本頁 {pageItems.length} 件｜每頁{" "}
          {PAGE_SIZE} 件
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-sm disabled:opacity-40 hover:bg-slate-50"
          >
            上一頁
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((n) => {
              if (totalPages <= 7) return true;
              return (
                n === 1 ||
                n === totalPages ||
                Math.abs(n - safePage) <= 1
              );
            })
            .reduce((acc, n, idx, arr) => {
              if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…");
              acc.push(n);
              return acc;
            }, [])
            .map((n, idx) =>
              n === "…" ? (
                <span key={`e-${idx}`} className="px-1 text-slate-400 text-xs">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`min-w-[32px] px-2 py-1.5 text-xs font-bold rounded-sm border transition ${
                    n === safePage
                      ? "bg-[#1E4AD1] text-white border-[#1E4AD1]"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {n}
                </button>
              ),
            )}
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-sm disabled:opacity-40 hover:bg-slate-50"
          >
            下一頁
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 sm:p-6">
            <p className="text-sm text-slate-600 mb-1">
              移除後，此商品將從您的賣場下架，相關銷售紀錄仍會保留。
            </p>
            <p className="text-sm font-bold text-slate-800 mb-5">
              確定刪除「{showConfirm.name}」嗎？
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(null)}
                className="px-5 py-2 text-sm text-slate-600 border border-slate-300 rounded-sm hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!!busyId}
                onClick={confirmRemove}
                className="px-5 py-2 text-sm font-bold text-white bg-[#1E4AD1] rounded-sm hover:bg-[#0071EB] disabled:opacity-50"
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   定價管理
────────────────────────────────────────────────────────── */
const COL_OPTS = [
  "商品名",
  "底價成本",
  "目前售價",
  "預估分潤",
  "方案數",
  "更新日",
];

const PRICING_MODE_INHERIT = "inherit";

// 定義在元件外層，避免每次父層 re-render 都產生新的函式參考，
// 否則 React 會整包 remount 這段 UI，輸入框打字會一直跳掉焦點。
function PricingModeSelector({
  p,
  mode,
  draftMarkups,
  draftFixedMarkups,
  globalMode,
  globalMarkup,
  globalFixed,
  onApply,
}) {
  const modeBtn = (key, label) => (
    <button
      key={key}
      type="button"
      onClick={() =>
        onApply(
          p,
          key,
          key === MARKUP_MODE_PERCENT
            ? draftMarkups[p.id]
            : key === MARKUP_MODE_FIXED
              ? draftFixedMarkups[p.id]
              : undefined,
        )
      }
      className={`text-xs font-bold px-2.5 py-1.5 rounded-sm border transition ${
        mode === key
          ? "bg-[#1E4AD1] text-white border-[#1E4AD1]"
          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {modeBtn(PRICING_MODE_INHERIT, "跟隨商店設定")}
        {modeBtn(MARKUP_MODE_PERCENT, "比例加價")}
        {modeBtn(MARKUP_MODE_FIXED, "固定加價")}
      </div>
      {mode === PRICING_MODE_INHERIT && (
        <p className="text-xs text-slate-400">
          套用商店預設：
          {globalMode === MARKUP_MODE_FIXED
            ? `底價 + NT$${Number(globalFixed) || 0}`
            : `底價 × (1 + ${Number(globalMarkup) || 0}%)`}
        </p>
      )}
      {mode === MARKUP_MODE_PERCENT && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="500"
            value={draftMarkups[p.id] ?? ""}
            onChange={(e) => onApply(p, MARKUP_MODE_PERCENT, e.target.value)}
            className="w-24 border border-slate-300 rounded-sm px-2 py-1.5 text-sm font-bold outline-none focus:border-[#1E4AD1]"
          />
          <span className="text-xs text-slate-500">
            % 加價（此商品專用，覆蓋商店設定）
          </span>
        </div>
      )}
      {mode === MARKUP_MODE_FIXED && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="10000"
            value={draftFixedMarkups[p.id] ?? ""}
            onChange={(e) => onApply(p, MARKUP_MODE_FIXED, e.target.value)}
            className="w-24 border border-slate-300 rounded-sm px-2 py-1.5 text-sm font-bold outline-none focus:border-[#1E4AD1]"
          />
          <span className="text-xs text-slate-500">
            元固定加價（此商品專用，覆蓋商店設定）
          </span>
        </div>
      )}
    </div>
  );
}

// 方案售價表：唯一可個別改價的地方；改動後與公式價不同會標示「已手動」
function PricingVariantTable({
  p,
  drafts,
  setDrafts,
  strategy,
  draftVariantPrices,
  setDraftVariantPrices,
  estimateProfit,
  onResetVariant,
  onDirty,
}) {
  const variants = p.variants || [];
  if (!variants.length) {
    const draft = drafts[p.id] ?? p.sellPrice;
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-slate-500">單一售價 (NT$)</label>
        <input
          type="number"
          value={draft}
          onChange={(e) => {
            onDirty?.(p.id);
            setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }));
          }}
          className="w-28 border border-slate-300 rounded-sm px-2 py-1.5 text-sm font-bold outline-none focus:border-[#1E4AD1]"
        />
        <span className="text-xs text-slate-400">
          此商品尚無方案明細，直接設定單一售價
        </span>
      </div>
    );
  }
  return (
    <div className="border border-slate-200 rounded-sm overflow-hidden bg-white max-h-72 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-slate-500 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left font-bold">方案</th>
            <th className="px-3 py-2 text-right font-bold">底價</th>
            <th className="px-3 py-2 text-right font-bold">售價</th>
            <th className="px-3 py-2 text-right font-bold">預估分潤</th>
            <th className="w-8 px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {variants.map((v) => {
            const key = v.price_key;
            const auto = applyMarkupStrategy(v.cost, strategy);
            const sellRaw = draftVariantPrices[p.id]?.[key];
            const sell = Number(sellRaw ?? v.cost);
            const isOverridden =
              Math.round(sell) !== Math.round(auto) &&
              sellRaw !== "" &&
              sellRaw != null;
            const vProfit = estimateProfit(v.cost, sell);
            return (
              <tr key={key} className={isOverridden ? "bg-amber-50/60" : ""}>
                <td className="px-3 py-2 text-slate-700">
                  <p
                    className="font-bold flex items-center gap-1.5 flex-wrap"
                    title={v.sku || undefined}
                  >
                    {v.label}
                    {(v.is_hot_sale ||
                      isHotSaleTelecom(
                        p.hotSaleTelecoms || p.hot_sale_telecoms,
                        v.telecom || v.attributes?.telecom,
                      )) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src="/images/hot-sale-tag.png"
                        alt="熱銷推薦"
                        className="h-5 w-auto inline-block shrink-0"
                        title="官網熱銷推薦電信商"
                      />
                    )}
                    {isOverridden && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-sm">
                        已手動
                      </span>
                    )}
                  </p>
                </td>
                <td className="px-3 py-2 text-right text-slate-600">
                  {fmt(v.cost)}
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    value={sellRaw ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      onDirty?.(p.id);
                      setDraftVariantPrices((prev) => ({
                        ...prev,
                        [p.id]: { ...(prev[p.id] || {}), [key]: val },
                      }));
                    }}
                    className={`w-20 text-right border rounded-sm px-1.5 py-1 text-xs outline-none focus:border-[#1E4AD1] ${
                      isOverridden ? "border-amber-300" : "border-slate-300"
                    }`}
                  />
                </td>
                <td className="px-3 py-2 text-right font-bold text-[#1E4AD1]">
                  {fmt(vProfit)}
                </td>
                <td className="px-1 py-2 text-center">
                  {isOverridden && (
                    <button
                      type="button"
                      title="重設此方案為公式價"
                      onClick={() => onResetVariant(p, v)}
                      className="text-slate-400 hover:text-[#1E4AD1]"
                    >
                      <MaterialIcon name="refresh" size={14} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PricingTab({
  products,
  loading,
  focusId,
  onSaved,
  markupRate,
  store,
  setStore,
}) {
  const [visibleCols, setVisibleCols] = useState(
    Object.fromEntries(COL_OPTS.map((c) => [c, true])),
  );
  const [expanded, setExpanded] = useState({});
  const [drafts, setDrafts] = useState({});
  const [draftMarkups, setDraftMarkups] = useState({});
  const [draftFixedMarkups, setDraftFixedMarkups] = useState({});
  const [draftVariantPrices, setDraftVariantPrices] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState(null); // { text, type: "success" | "error" }
  const toastTimerRef = useRef(null);
  const showToast = (text, type = "success") => {
    setToast({ text, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };
  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [globalMode, setGlobalMode] = useState(
    normalizeMarkupMode(store?.markup_mode),
  );
  const [globalMarkup, setGlobalMarkup] = useState(markupRate);
  const [globalFixed, setGlobalFixed] = useState(
    Number(store?.markup_fixed) || 50,
  );
  const [savingMarkup, setSavingMarkup] = useState(false);
  // 追蹤「使用者已編輯但尚未儲存」的商品，避免背景重新整理商品清單時
  // （例如切分頁、狀態更新觸發 loadProducts 重跑）把使用者正在改的售價蓋回公式值。
  const dirtyRef = useRef(new Set());
  const markDirty = (id) => dirtyRef.current.add(String(id));
  const clearDirty = (id) => dirtyRef.current.delete(String(id));

  useEffect(() => {
    setGlobalMarkup(markupRate);
    setGlobalMode(normalizeMarkupMode(store?.markup_mode));
    setGlobalFixed(Number(store?.markup_fixed) || 50);
  }, [markupRate, store?.markup_mode, store?.markup_fixed]);

  useEffect(() => {
    const computed = {};
    for (const p of products) {
      const vMap = {};
      for (const v of p.variants || []) {
        const key = v.price_key;
        const custom = p.customPrices?.[key];
        if (custom != null && custom !== "") {
          vMap[key] = Number(custom);
        } else {
          vMap[key] = resolvePartnerVariantBasePrice({
            b2bCost: v.cost,
            markupRate: Number(store?.markup_rate) || 0,
            markupMode: store?.markup_mode,
            markupFixed: Number(store?.markup_fixed) || 0,
            customPrices: p.customPrices || {},
            variantId: key,
            altVariantIds: [v.id, v.medusa_variant_id, v.sku].filter(Boolean),
          });
        }
      }
      computed[p.id] = {
        markup:
          p.customPrices?._markup != null ? Number(p.customPrices._markup) : "",
        fixed:
          p.customPrices?._markup_fixed != null
            ? Number(p.customPrices._markup_fixed)
            : "",
        variantMap: vMap,
        hasSingle: !(p.variants || []).length,
        single: p.customSell ?? p.sellPrice,
      };
    }
    // 只更新「未被使用者手動編輯」的商品，已在編輯中的商品維持目前畫面上的值，
    // 等使用者按下保存（或捨棄）後才會被下一次載入的資料覆蓋。
    setDraftMarkups((prev) => {
      const next = { ...prev };
      for (const p of products) {
        if (!dirtyRef.current.has(String(p.id))) next[p.id] = computed[p.id].markup;
      }
      return next;
    });
    setDraftFixedMarkups((prev) => {
      const next = { ...prev };
      for (const p of products) {
        if (!dirtyRef.current.has(String(p.id))) next[p.id] = computed[p.id].fixed;
      }
      return next;
    });
    setDraftVariantPrices((prev) => {
      const next = { ...prev };
      for (const p of products) {
        if (!dirtyRef.current.has(String(p.id)))
          next[p.id] = computed[p.id].variantMap;
      }
      return next;
    });
    setDrafts((prev) => {
      const next = { ...prev };
      for (const p of products) {
        if (computed[p.id].hasSingle && !dirtyRef.current.has(String(p.id))) {
          next[p.id] = computed[p.id].single;
        }
      }
      return next;
    });
  }, [products, store?.markup_rate, store?.markup_mode, store?.markup_fixed]);

  useEffect(() => {
    if (focusId) {
      setExpanded((prev) => ({ ...prev, [focusId]: true }));
      const el = document.getElementById(`pricing-row-${focusId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId, products]);

  const filtered = useMemo(() => {
    if (!searchQ.trim()) return products;
    const q = searchQ.trim().toLowerCase();
    return products.filter((p) => String(p.name || "").toLowerCase().includes(q));
  }, [products, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => setPage(1), [searchQ, products.length]);

  const toggleCol = (c) =>
    setVisibleCols((prev) => ({ ...prev, [c]: !prev[c] }));
  const toggleRow = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const estimateProfit = (cost, sell) => {
    const c = Number(cost) || 0;
    const price = Number(sell) || 0;
    const fee = price * 0.028;
    return Math.max(0, Math.round(price - c - fee));
  };

  // 商品目前套用的定價方式：跟隨商店設定／比例加價／固定加價（三選一，互斥）
  const pricingMode = (p) => {
    const f = draftFixedMarkups[p.id];
    const m = draftMarkups[p.id];
    if (f !== "" && f != null && Number.isFinite(Number(f))) {
      return MARKUP_MODE_FIXED;
    }
    if (m !== "" && m != null && Number.isFinite(Number(m))) {
      return MARKUP_MODE_PERCENT;
    }
    return PRICING_MODE_INHERIT;
  };

  const productStrategy = (p) => {
    const customs = { ...(p.customPrices || {}) };
    const m = draftMarkups[p.id];
    const f = draftFixedMarkups[p.id];
    if (m !== "" && m != null && Number.isFinite(Number(m))) {
      customs._markup = Number(m);
      delete customs._markup_fixed;
    } else if (f !== "" && f != null && Number.isFinite(Number(f))) {
      customs._markup_fixed = Number(f);
      delete customs._markup;
    } else {
      delete customs._markup;
      delete customs._markup_fixed;
    }
    return resolveMarkupStrategy({
      storeMarkupRate: Number(globalMarkup) || 0,
      storeMarkupMode: globalMode,
      storeMarkupFixed: Number(globalFixed) || 0,
      customPrices: customs,
    });
  };

  const previewSell = (p) => {
    const cost = Number(p.cost) || 0;
    if (!(cost > 0)) return Number(p.baseSell) || 0;
    return applyMarkupStrategy(cost, productStrategy(p));
  };

  // 套用「跟隨商店設定 / 比例加價 / 固定加價」到單一商品：
  // 一次搞定商品層級覆寫 + 全部方案重算，是這個分頁唯一的編輯入口
  const applyModeToProduct = (p, mode, rawValue) => {
    markDirty(p.id);
    const variants = p.variants || [];
    let customs = {};
    if (mode === MARKUP_MODE_PERCENT) {
      const rate =
        rawValue !== "" && rawValue != null && Number.isFinite(Number(rawValue))
          ? Number(rawValue)
          : Number(globalMarkup) || 0;
      customs = { _markup: rate };
      setDraftMarkups((prev) => ({ ...prev, [p.id]: rate }));
      setDraftFixedMarkups((prev) => ({ ...prev, [p.id]: "" }));
    } else if (mode === MARKUP_MODE_FIXED) {
      const fixed =
        rawValue !== "" && rawValue != null && Number.isFinite(Number(rawValue))
          ? Math.round(Number(rawValue))
          : Number(globalFixed) || 0;
      customs = { _markup_fixed: fixed };
      setDraftFixedMarkups((prev) => ({ ...prev, [p.id]: fixed }));
      setDraftMarkups((prev) => ({ ...prev, [p.id]: "" }));
    } else {
      setDraftMarkups((prev) => ({ ...prev, [p.id]: "" }));
      setDraftFixedMarkups((prev) => ({ ...prev, [p.id]: "" }));
    }
    const strategy = resolveMarkupStrategy({
      storeMarkupRate: Number(globalMarkup) || 0,
      storeMarkupMode: globalMode,
      storeMarkupFixed: Number(globalFixed) || 0,
      customPrices: customs,
    });
    if (variants.length > 0) {
      const vMap = {};
      for (const v of variants) {
        vMap[v.price_key] = applyMarkupStrategy(v.cost, strategy);
      }
      setDraftVariantPrices((prev) => ({ ...prev, [p.id]: vMap }));
    } else {
      const cost = Number(p.cost) || 0;
      if (cost > 0) {
        setDrafts((prev) => ({
          ...prev,
          [p.id]: applyMarkupStrategy(cost, strategy),
        }));
      }
    }
  };

  // 重設單一方案售價為公式計算值
  const resetVariantPrice = (p, v) => {
    markDirty(p.id);
    const strategy = productStrategy(p);
    const auto = applyMarkupStrategy(v.cost, strategy);
    setDraftVariantPrices((prev) => ({
      ...prev,
      [p.id]: { ...(prev[p.id] || {}), [v.price_key]: auto },
    }));
  };

  // 商品目前起價（顯示用）：有方案表就取方案售價最小值，否則用單一售價欄位
  const rowSell = (p) => {
    const variants = p.variants || [];
    if (variants.length > 0) {
      const vMap = draftVariantPrices[p.id] || {};
      const vals = variants
        .map((v) => Number(vMap[v.price_key]))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (vals.length) return Math.min(...vals);
    }
    const d = Number(drafts[p.id]);
    return Number.isFinite(d) && d > 0 ? d : previewSell(p);
  };

  const costRange = (p) => {
    const variants = p.variants || [];
    if (variants.length > 1) {
      const costs = variants.map((v) => Number(v.cost) || 0).filter((n) => n > 0);
      if (costs.length) {
        const min = Math.min(...costs);
        const max = Math.max(...costs);
        return min === max ? fmt(min) : `${fmt(min)} ~ ${fmt(max)}`;
      }
    }
    return fmt(p.cost);
  };

  const saveMarkup = async () => {
    if (!store?.id) return;
    const mode = normalizeMarkupMode(globalMode);
    const rate = Math.min(500, Math.max(0, Number(globalMarkup) || 0));
    const fixed = Math.min(
      10000,
      Math.max(0, Math.round(Number(globalFixed) || 0)),
    );
    setSavingMarkup(true);
    setMessage("");
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/partner/store-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          markup_mode: mode,
          markup_rate: rate,
          markup_fixed: fixed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "加價設定儲存失敗");
      setStore?.(data.store);
      setGlobalMode(normalizeMarkupMode(data.store?.markup_mode || mode));
      setGlobalMarkup(Number(data.store?.markup_rate) || rate);
      setGlobalFixed(Number(data.store?.markup_fixed) || fixed);

      // 跟隨商店設定的商品：用新全局加價重算方案售價，並清掉舊的單方案覆寫
      // （否則 custom_prices 鎖死舊售價，畫面上／賣場都不會動）
      const inheritStrategy = resolveMarkupStrategy({
        storeMarkupRate: Number(data.store?.markup_rate) || rate,
        storeMarkupMode: data.store?.markup_mode || mode,
        storeMarkupFixed: Number(data.store?.markup_fixed) || fixed,
        customPrices: {},
      });
      const inheritProducts = [];
      const nextVariantMaps = {};
      const nextSingles = {};
      for (const p of products) {
        const ownPercent =
          (draftMarkups[p.id] !== "" &&
            draftMarkups[p.id] != null &&
            Number.isFinite(Number(draftMarkups[p.id]))) ||
          (p.customPrices?._markup != null && p.customPrices?._markup !== "");
        const ownFixed =
          (draftFixedMarkups[p.id] !== "" &&
            draftFixedMarkups[p.id] != null &&
            Number.isFinite(Number(draftFixedMarkups[p.id]))) ||
          (p.customPrices?._markup_fixed != null &&
            p.customPrices?._markup_fixed !== "");
        if (ownPercent || ownFixed) continue;

        clearDirty(p.id);
        inheritProducts.push(p);
        const variants = p.variants || [];
        if (variants.length > 0) {
          const vMap = {};
          for (const v of variants) {
            vMap[v.price_key] = applyMarkupStrategy(v.cost, inheritStrategy);
          }
          nextVariantMaps[p.id] = vMap;
        } else {
          const cost = Number(p.cost) || 0;
          if (cost > 0) {
            nextSingles[p.id] = applyMarkupStrategy(cost, inheritStrategy);
          }
        }
      }

      if (Object.keys(nextVariantMaps).length) {
        setDraftVariantPrices((prev) => ({ ...prev, ...nextVariantMaps }));
      }
      if (Object.keys(nextSingles).length) {
        setDrafts((prev) => ({ ...prev, ...nextSingles }));
      }
      setDraftMarkups((prev) => {
        const next = { ...prev };
        for (const p of inheritProducts) next[p.id] = "";
        return next;
      });
      setDraftFixedMarkups((prev) => {
        const next = { ...prev };
        for (const p of inheritProducts) next[p.id] = "";
        return next;
      });

      // 寫回 DB：跟隨商店的商品清掉單方案／_sell 覆寫，賣場才會跟新加價
      let cleared = 0;
      for (const p of inheritProducts) {
        const prevCustom = p.customPrices || {};
        const hasVariantOverrides = Object.keys(prevCustom).some(
          (k) => k !== "_markup" && k !== "_markup_fixed",
        );
        if (!hasVariantOverrides) continue;
        // eslint-disable-next-line no-await-in-loop
        const clearRes = await fetch("/api/partner/store-listings", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            medusa_product_id: p.medusaProductId,
            product_id: p.productId,
            custom_prices: {},
          }),
        });
        if (clearRes.ok) cleared += 1;
      }

      setMessage(
        mode === MARKUP_MODE_FIXED
          ? `已改為固定加價 NT$${fixed}，已重算 ${inheritProducts.length} 項跟隨商店的商品`
          : `全局加價率已更新為 ${rate}%，已重算 ${inheritProducts.length} 項跟隨商店的商品` +
              (cleared ? `（清除 ${cleared} 項舊售價覆寫）` : ""),
      );
      showToast("加價已套用，方案售價已更新", "success");
      await onSaved?.();
    } catch (err) {
      setMessage(err.message || "加價設定儲存失敗");
      showToast(err.message || "加價設定儲存失敗", "error");
    } finally {
      setSavingMarkup(false);
    }
  };

  // 只以「商品加價規則（_markup / _markup_fixed）」＋「個別方案覆寫」兩層儲存，
  // 不再使用舊的 _sell 整體倍率（會跟方案覆寫互相疊加造成價格不直覺），
  // 單一售價欄位（無方案明細的商品）才用 _sell 當唯一覆寫。
  const buildCustomPricesPayload = (p) => {
    const custom_prices = { ...(p.customPrices || {}) };
    for (const key of Object.keys(custom_prices)) {
      if (key === "_markup" || key === "_markup_fixed") continue;
      if (key === "_sell" && !(p.variants || []).length) continue;
      delete custom_prices[key];
    }

    const m = draftMarkups[p.id];
    const f = draftFixedMarkups[p.id];
    delete custom_prices._markup;
    delete custom_prices._markup_fixed;
    if (m !== "" && m != null && Number.isFinite(Number(m))) {
      custom_prices._markup = Number(m);
    } else if (f !== "" && f != null && Number.isFinite(Number(f))) {
      custom_prices._markup_fixed = Number(f);
    }

    if (!(p.variants || []).length) {
      const defaultSell = previewSell(p);
      const sell = Math.round(Number(drafts[p.id]) || 0);
      if (sell > 0 && sell !== defaultSell) {
        custom_prices._sell = sell;
      } else {
        delete custom_prices._sell;
      }
      return custom_prices;
    }

    const strategy = productStrategy(p);
    const vDrafts = draftVariantPrices[p.id] || {};
    for (const v of p.variants || []) {
      const key = v.price_key;
      const draft = Math.round(Number(vDrafts[key]) || 0);
      const auto = applyMarkupStrategy(v.cost, strategy);
      if (draft > 0 && draft !== auto) {
        // 同時寫入 medusa id / 本地 id / sku，確保前台（Medusa id）與後台都能對到
        const aliases = [key, v.id, v.medusa_variant_id, v.sku]
          .filter((k) => k != null && String(k).trim() !== "")
          .map(String);
        for (const a of [...new Set(aliases)]) {
          custom_prices[a] = draft;
        }
      }
    }
    return custom_prices;
  };

  const saveOne = async (p, { silent = false } = {}) => {
    const variants = p.variants || [];
    const sell = Math.round(rowSell(p));
    if (sell <= 0) {
      setMessage(`「${p.name}」售價需大於 0`);
      return;
    }
    if (variants.length > 0) {
      const vDrafts = draftVariantPrices[p.id] || {};
      const invalid = variants.find((v) => {
        const val = Math.round(Number(vDrafts[v.price_key]) || 0);
        return val > 0 && v.cost > 0 && val < v.cost;
      });
      if (invalid) {
        setMessage(
          `「${p.name}」方案「${invalid.label}」售價不可低於底價 ${fmt(
            invalid.cost,
          )}`,
        );
        return;
      }
    } else if (p.cost > 0 && sell < p.cost) {
      setMessage(`「${p.name}」售價不可低於底價 ${fmt(p.cost)}`);
      return;
    }
    setSavingId(p.id);
    setMessage("");
    try {
      const token = await getAccessToken();
      const custom_prices = buildCustomPricesPayload(p);
      const res = await fetch("/api/partner/store-listings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          medusa_product_id: p.medusaProductId,
          product_id: p.productId,
          custom_prices,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "儲存失敗");
      clearDirty(p.id);
      setMessage(`已更新「${p.name}」定價`);
      if (!silent) showToast(`「${p.name}」儲存成功`, "success");
      await onSaved?.();
    } catch (err) {
      setMessage(err.message || "儲存失敗");
      if (!silent) showToast(err.message || "儲存失敗", "error");
    } finally {
      setSavingId(null);
    }
  };

  const saveAll = async () => {
    for (const p of filtered) {
      // eslint-disable-next-line no-await-in-loop
      await saveOne(p, { silent: true });
    }
    showToast(`已儲存全部 ${filtered.length} 項商品定價`, "success");
  };

  const resetToDefault = (p) => {
    applyModeToProduct(p, PRICING_MODE_INHERIT);
    setMessage(`「${p.name}」已改回跟隨商店設定（記得按儲存）`);
  };

  // 定價方式切換：跟隨商店設定 / 比例加價 / 固定加價，三選一，是每個商品唯一的編輯入口
  const totals = useMemo(
    () => ({
      cost: filtered.reduce((s, p) => s + (Number(p.cost) || 0), 0),
      profit: filtered.reduce((s, p) => s + estimateProfit(p.cost, rowSell(p)), 0),
      count: filtered.length,
    }),
    [filtered, draftVariantPrices, drafts],
  );

  const exampleCost = 100;
  const exampleSell =
    globalMode === MARKUP_MODE_FIXED
      ? Math.round(exampleCost + (Number(globalFixed) || 0))
      : Math.round(exampleCost * (1 + (Number(globalMarkup) || 0) / 100));

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 rounded-sm shadow-lg text-sm font-bold text-white transition-opacity ${
            toast.type === "error" ? "bg-red-500" : "bg-emerald-500"
          }`}
        >
          <MaterialIcon
            name={toast.type === "error" ? "error" : "check_circle"}
            size={18}
          />
          {toast.text}
        </div>
      )}
      {/* 全局加價設定區塊 */}
      <div className="shrink-0 bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 bg-gradient-to-br from-[#F7F9FB] to-white border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#1E4AD1]/10 flex items-center justify-center shrink-0">
              <MaterialIcon name="percent" size={22} className="text-[#1E4AD1]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-slate-800">商店加價設定</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                可選「比例加價」或「固定加價」。按「套用加價設定」後，
                <strong className="text-slate-700">跟隨商店設定</strong>
                的商品會自動重算下方方案售價；已改成「比例／固定加價」或手動改過單方案售價的商品不受影響。
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-5 py-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGlobalMode(MARKUP_MODE_PERCENT)}
              className={`text-xs font-bold px-3 py-1.5 rounded-sm border transition ${
                globalMode === MARKUP_MODE_PERCENT
                  ? "bg-[#1E4AD1] text-white border-[#1E4AD1]"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              比例加價 %
            </button>
            <button
              type="button"
              onClick={() => setGlobalMode(MARKUP_MODE_FIXED)}
              className={`text-xs font-bold px-3 py-1.5 rounded-sm border transition ${
                globalMode === MARKUP_MODE_FIXED
                  ? "bg-[#1E4AD1] text-white border-[#1E4AD1]"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              固定加價 NT$
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {globalMode === MARKUP_MODE_FIXED
                  ? "全局固定加價（NT$）"
                  : "全局加價比例 (%)"}
              </label>
              <div className="flex items-center gap-2">
                {globalMode === MARKUP_MODE_FIXED ? (
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={globalFixed}
                    onChange={(e) => setGlobalFixed(e.target.value)}
                    className="w-28 px-3 py-2.5 border border-slate-300 rounded-sm text-sm font-black text-slate-800 focus:border-[#1E4AD1] outline-none"
                  />
                ) : (
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={globalMarkup}
                    onChange={(e) => setGlobalMarkup(e.target.value)}
                    className="w-28 px-3 py-2.5 border border-slate-300 rounded-sm text-sm font-black text-slate-800 focus:border-[#1E4AD1] outline-none"
                  />
                )}
                <span className="text-sm font-bold text-slate-600">
                  {globalMode === MARKUP_MODE_FIXED ? "元" : "%"}
                </span>
                <button
                  type="button"
                  disabled={savingMarkup}
                  onClick={saveMarkup}
                  className="text-sm bg-[#1E4AD1] text-white font-bold px-4 py-2.5 rounded-sm hover:bg-[#0071EB] transition disabled:opacity-50"
                >
                  {savingMarkup ? "儲存中…" : "套用加價設定"}
                </button>
              </div>
            </div>
            <div className="flex-1 rounded-sm bg-slate-50 border border-slate-100 px-4 py-3 text-xs text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-700 mb-1">試算</p>
              <p>
                底價 NT${exampleCost} → 售價{" "}
                <span className="font-black text-[#1E4AD1]">NT${exampleSell}</span>
                ，預估分潤約 NT$
                {Math.max(
                  0,
                  Math.round(exampleSell - exampleCost - exampleSell * 0.028),
                )}
                （已扣 2.8% 金流）
                {globalMode === MARKUP_MODE_FIXED
                  ? ` · 公式：底價 + ${Number(globalFixed) || 0}`
                  : ` · 公式：底價 × (1 + ${Number(globalMarkup) || 0}%)`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-4 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-800">商品自訂售價</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              點商品列展開，選擇「跟隨商店設定／比例加價／固定加價」，或直接改單一方案售價。
            </p>
          </div>
          <div className="flex items-center gap-2 flex-1 sm:justify-end">
            <div className="relative flex-1 sm:max-w-xs">
              <MaterialIcon
                name="search"
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="搜尋商品..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-sm focus:border-[#1E4AD1] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={saveAll}
              disabled={loading || filtered.length === 0}
              className="text-sm bg-[#1E4AD1] text-white font-bold px-3 sm:px-4 py-1.5 rounded-sm hover:bg-[#0071EB] transition disabled:opacity-50 whitespace-nowrap"
            >
              儲存全部
            </button>
          </div>
        </div>

        {message && (
          <div className="px-4 sm:px-5 py-2 text-xs font-bold text-[#1E4AD1] bg-blue-50 border-b border-blue-100 shrink-0">
            {message}
          </div>
        )}

        <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 bg-slate-50/70 hidden md:flex flex-wrap items-center gap-x-4 gap-y-1.5 shrink-0">
          <span className="text-xs font-bold text-slate-500">顯示欄位</span>
          {COL_OPTS.map((c) => (
            <label
              key={c}
              className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700"
            >
              <input
                type="checkbox"
                checked={!!visibleCols[c]}
                onChange={() => toggleCol(c)}
                className="accent-[#1E4AD1] w-3.5 h-3.5"
              />
              {c}
            </label>
          ))}
        </div>

        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex gap-6 sm:gap-8 text-sm flex-wrap">
            <div>
              <span className="text-slate-500 text-xs">底價成本合計</span>
              <span className="ml-2 font-black text-slate-800">{fmt(totals.cost)}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs">預估分潤合計</span>
              <span className="ml-2 font-black text-[#1E4AD1]">{fmt(totals.profit)}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs">商品數</span>
              <span className="ml-2 font-black text-slate-800">{totals.count}</span>
            </div>
          </div>
        </div>

        {/* 手機卡片 */}
        <div className="md:hidden flex-1 min-h-0 overflow-auto divide-y divide-slate-100">
          {loading && (
            <p className="py-14 text-center text-slate-400 text-sm">載入中...</p>
          )}
          {!loading && pageItems.length === 0 && (
            <p className="py-14 text-center text-slate-400 text-sm px-4">
              尚無上架商品，請先至選品管理加入方案
            </p>
          )}
          {!loading &&
            pageItems.map((p) => {
              const sell = rowSell(p);
              const profit = estimateProfit(p.cost, sell);
              const isOpen = !!expanded[p.id];
              const customActive = pricingMode(p) !== PRICING_MODE_INHERIT;
              return (
                <div
                  key={p.id}
                  id={`pricing-row-${p.id}`}
                  className={`p-4 space-y-3 ${
                    focusId === p.id ? "bg-blue-50/70" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleRow(p.id)}
                    className="w-full text-left flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 leading-snug flex items-center gap-1.5">
                        {p.name}
                        {customActive && (
                          <span className="text-[9px] font-bold text-[#1E4AD1] bg-blue-50 px-1.5 py-0.5 rounded-sm shrink-0">
                            自訂
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        底價 {costRange(p)} · 起價 {fmt(sell)} · {p.plans} 方案
                      </p>
                    </div>
                    <MaterialIcon
                      name={isOpen ? "expand_less" : "expand_more"}
                      size={18}
                      className="text-slate-400 shrink-0 mt-0.5"
                    />
                  </button>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#1E4AD1] font-black">
                      預估分潤 {fmt(profit)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => resetToDefault(p)}
                        className="text-xs border border-slate-300 rounded-sm px-3 py-1.5 font-bold text-slate-600"
                      >
                        重置
                      </button>
                      <button
                        type="button"
                        disabled={savingId === p.id}
                        onClick={() => saveOne(p)}
                        className="text-xs bg-[#1E4AD1] text-white px-3 py-1.5 rounded-sm font-bold disabled:opacity-50"
                      >
                        {savingId === p.id ? "…" : "保存"}
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <PricingModeSelector
                        p={p}
                        mode={pricingMode(p)}
                        draftMarkups={draftMarkups}
                        draftFixedMarkups={draftFixedMarkups}
                        globalMode={globalMode}
                        globalMarkup={globalMarkup}
                        globalFixed={globalFixed}
                        onApply={applyModeToProduct}
                      />
                      <PricingVariantTable
                        p={p}
                        drafts={drafts}
                        setDrafts={setDrafts}
                        strategy={productStrategy(p)}
                        draftVariantPrices={draftVariantPrices}
                        setDraftVariantPrices={setDraftVariantPrices}
                        estimateProfit={estimateProfit}
                        onResetVariant={resetVariantPrice}
                        onDirty={markDirty}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* 桌面表格 */}
        <div className="hidden md:block flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-slate-200 text-slate-500 text-xs sticky top-0 z-10">
              <tr>
                <th className="w-8 px-3 py-3" />
                {visibleCols["商品名"] && (
                  <th className="px-5 py-3 text-left font-bold">商品名</th>
                )}
                {visibleCols["底價成本"] && (
                  <th className="px-5 py-3 text-right font-bold">底價成本</th>
                )}
                {visibleCols["目前售價"] && (
                  <th className="px-5 py-3 text-right font-bold">目前售價</th>
                )}
                {visibleCols["預估分潤"] && (
                  <th className="px-5 py-3 text-right font-bold">預估分潤</th>
                )}
                {visibleCols["方案數"] && (
                  <th className="px-5 py-3 text-center font-bold">方案數</th>
                )}
                {visibleCols["更新日"] && (
                  <th className="px-5 py-3 text-left font-bold">更新日</th>
                )}
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    載入中...
                  </td>
                </tr>
              )}
              {!loading && pageItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    尚無上架商品，請先至選品管理加入方案
                  </td>
                </tr>
              )}
              {!loading &&
                pageItems.map((p) => {
                  const isOpen = !!expanded[p.id];
                  const sell = rowSell(p);
                  const profit = estimateProfit(p.cost, sell);
                  const focused = focusId && focusId === p.id;
                  const customActive = pricingMode(p) !== PRICING_MODE_INHERIT;
                  return (
                    <Fragment key={p.id}>
                      <tr
                        id={`pricing-row-${p.id}`}
                        className={`hover:bg-slate-50/60 transition ${
                          focused ? "bg-blue-50/70" : ""
                        }`}
                      >
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            onClick={() => toggleRow(p.id)}
                            className="text-slate-400 hover:text-[#1E4AD1]"
                          >
                            <MaterialIcon
                              name={isOpen ? "expand_less" : "expand_more"}
                              size={18}
                            />
                          </button>
                        </td>
                        {visibleCols["商品名"] && (
                          <td className="px-5 py-4 font-bold text-slate-800">
                            <span className="flex items-center gap-1.5">
                              {p.name}
                              {customActive && (
                                <span className="text-[9px] font-bold text-[#1E4AD1] bg-blue-50 px-1.5 py-0.5 rounded-sm">
                                  自訂
                                </span>
                              )}
                            </span>
                          </td>
                        )}
                        {visibleCols["底價成本"] && (
                          <td className="px-5 py-4 text-right text-slate-600">
                            {costRange(p)}
                          </td>
                        )}
                        {visibleCols["目前售價"] && (
                          <td className="px-5 py-4 text-right text-slate-800 font-bold">
                            {fmt(sell)}
                          </td>
                        )}
                        {visibleCols["預估分潤"] && (
                          <td className="px-5 py-4 text-right font-black text-[#1E4AD1]">
                            {fmt(profit)}
                          </td>
                        )}
                        {visibleCols["方案數"] && (
                          <td className="px-5 py-4 text-center text-slate-600">
                            {p.plans}
                          </td>
                        )}
                        {visibleCols["更新日"] && (
                          <td className="px-5 py-4 text-xs text-slate-400">
                            {fmtDate(p.updated)}
                          </td>
                        )}
                        <td className="px-3 py-4">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => toggleRow(p.id)}
                              className="text-xs border border-slate-300 text-slate-600 px-2.5 py-1 rounded-sm font-bold hover:bg-slate-50"
                            >
                              編輯定價
                            </button>
                            <button
                              type="button"
                              disabled={savingId === p.id}
                              onClick={() => saveOne(p)}
                              className="text-xs bg-[#1E4AD1] text-white px-3 py-1 rounded-sm font-bold hover:bg-[#0071EB] transition disabled:opacity-50"
                            >
                              {savingId === p.id ? "儲存中" : "保存"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-blue-50/40">
                          <td />
                          <td colSpan={7} className="px-5 py-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-slate-500 font-bold mb-2">
                                    此商品定價方式
                                  </p>
                                  <PricingModeSelector
                                    p={p}
                                    mode={pricingMode(p)}
                                    draftMarkups={draftMarkups}
                                    draftFixedMarkups={draftFixedMarkups}
                                    globalMode={globalMode}
                                    globalMarkup={globalMarkup}
                                    globalFixed={globalFixed}
                                    onApply={applyModeToProduct}
                                  />
                                </div>
                                <div className="flex flex-col justify-end">
                                  <div className="rounded-sm bg-white border border-slate-200 px-4 py-3 text-xs text-slate-600">
                                    <p>售價 − 底價 − 2.8% 金流 = 您的分潤</p>
                                    <p className="text-[#1E4AD1] font-black mt-1 text-sm">
                                      以最低方案起價估算：{fmt(profit)}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => resetToDefault(p)}
                                    className="mt-2 self-start text-xs font-bold text-slate-500 hover:text-[#1E4AD1]"
                                  >
                                    重設全部方案為公式價
                                  </button>
                                </div>
                              </div>

                              <div>
                                <p className="text-xs text-slate-500 font-bold mb-2">
                                  方案售價（可個別調整，改動後標示「已手動」）
                                </p>
                                <PricingVariantTable
                                  p={p}
                                  drafts={drafts}
                                  setDrafts={setDrafts}
                                  strategy={productStrategy(p)}
                                  draftVariantPrices={draftVariantPrices}
                                  setDraftVariantPrices={setDraftVariantPrices}
                                  estimateProfit={estimateProfit}
                                  onResetVariant={resetVariantPrice}
                                  onDirty={markDirty}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 border-t border-slate-200 px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            第 {safePage} / {totalPages} 頁
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-sm disabled:opacity-40"
            >
              上一頁
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-sm disabled:opacity-40"
            >
              下一頁
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   月次報告
────────────────────────────────────────────────────────── */
function ReportTab({ stats, partner, store, onGoTab }) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    if (!exportOpen) return;
    const onDoc = (e) => {
      if (!exportMenuRef.current?.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportOpen]);

  const monthly = useMemo(
    () => buildMonthlyRows(stats?.orders || []),
    [stats],
  );

  const totals = useMemo(
    () => ({
      revenue: monthly.reduce((s, r) => s + r.revenue, 0),
      profit: monthly.reduce((s, r) => s + r.profit, 0),
      cost: monthly.reduce((s, r) => s + r.cost, 0),
      count: monthly.reduce((s, r) => s + r.count, 0),
    }),
    [monthly],
  );

  const recent = useMemo(
    () =>
      (stats?.orders || [])
        .filter((o) => isSettledOrderStatus(o.status))
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
    [stats],
  );

  const runExport = (type) => {
    exportPartnerCsv({
      type,
      orders: stats?.orders || [],
      store,
      partner,
    });
    setExportOpen(false);
  };

  const ExportMenu = ({ align = "right" }) => (
    <div className="relative" ref={exportMenuRef}>
      <button
        type="button"
        onClick={() => setExportOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs border border-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-sm hover:bg-slate-50 hover:border-[#1E4AD1] hover:text-[#1E4AD1] transition"
      >
        <MaterialIcon name="download" size={16} />
        匯出 CSV
        <MaterialIcon name={exportOpen ? "expand_less" : "expand_more"} size={16} />
      </button>
      {exportOpen ? (
        <div
          className={`absolute z-40 mt-1.5 w-72 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
            <p className="text-[11px] font-black text-slate-600">選擇匯出內容</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Excel／Numbers 可直接開啟（UTF-8）
            </p>
          </div>
          <ul className="py-1">
            {CSV_EXPORT_OPTIONS.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => runExport(opt.id)}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 transition"
                >
                  <MaterialIcon
                    name={opt.icon}
                    size={18}
                    className="text-[#1E4AD1] mt-0.5 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-black text-slate-800">
                      {opt.label}
                      {opt.id === "full" ? (
                        <span className="ml-1.5 text-[10px] font-bold text-[#1E4AD1] bg-blue-50 px-1.5 py-0.5 rounded">
                          建議
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">
                      {opt.sub}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );

  const TOP_CARDS = [
    {
      icon: "📋",
      label: "月次報告",
      sub: "查看各月份分潤明細",
      onClick: () =>
        document.getElementById("monthly-report-table")?.scrollIntoView({
          behavior: "smooth",
        }),
    },
    {
      icon: "📊",
      label: "收益趨勢",
      sub: "掌握每月收益變化",
      onClick: () => onGoTab("analytics"),
    },
    {
      icon: "📁",
      label: "CSV 匯出",
      sub: "商品明細／訂單／完整報表",
      onClick: () => {
        setExportOpen(true);
        document.getElementById("monthly-report-table")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      },
    },
    {
      icon: "⚙️",
      label: "商店設定",
      sub: "分潤率與店鋪資訊設定",
      href: "/partner/settings",
    },
  ];

  return (
    <div className="space-y-5 h-full overflow-y-auto pb-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TOP_CARDS.map((c) =>
          c.href ? (
            <Link
              key={c.label}
              href={c.href}
              className="bg-white border border-slate-200 rounded-sm shadow-sm p-5 flex flex-col items-center gap-2 hover:border-[#1E4AD1] hover:shadow-md transition group text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#1E4AD1] text-white flex items-center justify-center text-2xl shadow">
                {c.icon}
              </div>
              <p className="text-sm font-black text-slate-800">{c.label}</p>
              <p className="text-xs text-slate-400">{c.sub}</p>
            </Link>
          ) : (
            <button
              key={c.label}
              type="button"
              onClick={c.onClick}
              className="bg-white border border-slate-200 rounded-sm shadow-sm p-5 flex flex-col items-center gap-2 hover:border-[#1E4AD1] hover:shadow-md transition group text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#1E4AD1] text-white flex items-center justify-center text-2xl shadow">
                {c.icon}
              </div>
              <p className="text-sm font-black text-slate-800">{c.label}</p>
              <p className="text-xs text-slate-400">{c.sub}</p>
            </button>
          ),
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 space-y-4">
          <div
            id="monthly-report-table"
            className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-visible"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-slate-800">月次分潤報告</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  匯出可含商品明細、訂單逐筆與各項 KPI
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <ExportMenu />
                <button
                  type="button"
                  onClick={() => onGoTab("analytics")}
                  className="text-xs border border-[#1E4AD1] text-[#1E4AD1] font-bold px-4 py-1.5 rounded-sm hover:bg-blue-50 transition"
                >
                  收益分析
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold">月份</th>
                    <th className="px-5 py-3 text-right font-bold">店鋪營收</th>
                    <th className="px-5 py-3 text-right font-bold">底價成本</th>
                    <th className="px-5 py-3 text-right font-bold">我的分潤</th>
                    <th className="px-5 py-3 text-center font-bold">訂單數</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthly.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-slate-400 text-sm"
                      >
                        目前尚無報告資料
                      </td>
                    </tr>
                  )}
                  {monthly.map((r) => (
                    <tr key={r.month} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5">
                        <span className="text-xs bg-[#1E4AD1] text-white font-bold px-2 py-0.5 rounded-sm mr-2">
                          {r.month}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600">
                        {fmt(r.revenue)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-500">
                        {fmt(r.cost)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-[#1E4AD1]">
                        +{fmt(r.profit)}
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-700">
                        {r.count}
                      </td>
                    </tr>
                  ))}
                  {monthly.length > 0 && (
                    <tr className="bg-slate-100 font-black">
                      <td className="px-5 py-3 text-slate-700 text-xs">合計</td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {fmt(totals.revenue)}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500">
                        {fmt(totals.cost)}
                      </td>
                      <td className="px-5 py-3 text-right text-[#1E4AD1]">
                        +{fmt(totals.profit)}
                      </td>
                      <td className="px-5 py-3 text-center text-slate-700">
                        {totals.count}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-800">最近訂單</h3>
              <Link
                href="/partner/orders"
                className="text-xs border border-[#1E4AD1] text-[#1E4AD1] font-bold px-4 py-1.5 rounded-sm hover:bg-blue-50 transition"
              >
                查看全部
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recent.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  尚無訂單
                </div>
              ) : (
                recent.map((o) => (
                  <Link
                    key={o.id}
                    href="/partner/orders"
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 group transition"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-sm ${
                          o.status === "completed"
                            ? "bg-[#d1fae5] text-[#065f46]"
                            : o.status === "pending"
                              ? "bg-[#fef3c7] text-[#92400e]"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {o.status === "completed"
                          ? "已付款"
                          : o.status === "pending"
                            ? "待付款"
                            : "其他"}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          {o.customer_email || "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {fmtDate(o.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-[#1E4AD1]">
                        +{fmt(o.partner_profit)}
                      </span>
                      <MaterialIcon
                        name="chevron_right"
                        size={18}
                        className="text-slate-300 group-hover:text-slate-500"
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-72 space-y-4 shrink-0">
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800">店鋪資訊</h3>
              <Link
                href="/partner/settings"
                className="text-xs border border-slate-300 text-slate-600 px-3 py-1 rounded-sm hover:bg-slate-50 font-bold"
              >
                編輯
              </Link>
            </div>
            <dl className="space-y-2.5 text-xs">
              {[
                ["店鋪名稱", store?.store_name || partner?.name || "—"],
                ["E-mail", partner?.email || "—"],
                ["分潤方式", "依訂單自動結算"],
                ["加價率", `${store?.markup_rate ?? 20}%`],
              ].map(([l, v]) => (
                <div key={l} className="flex gap-2">
                  <dt className="text-slate-400 w-16 shrink-0">{l}</dt>
                  <dd className="text-slate-700 font-bold break-all">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-5">
            <h3 className="text-sm font-black text-slate-800 mb-3">分潤說明</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <MaterialIcon
                  name="check_circle"
                  size={14}
                  className="text-[#1E4AD1] shrink-0 mt-0.5"
                  filled
                />
                <span>依各方案設定分潤率計算</span>
              </li>
              <li className="flex items-start gap-2">
                <MaterialIcon
                  name="check_circle"
                  size={14}
                  className="text-[#1E4AD1] shrink-0 mt-0.5"
                  filled
                />
                <span>扣除 2.8% 金流手續費</span>
              </li>
              <li className="flex items-start gap-2">
                <MaterialIcon
                  name="check_circle"
                  size={14}
                  className="text-[#1E4AD1] shrink-0 mt-0.5"
                  filled
                />
                <span>次月 15 對帳單；申請提領後 10 工作天匯款（每月第 1 次免手續費，之後 NT$15）</span>
              </li>
              <li className="flex items-start gap-2">
                <MaterialIcon
                  name="check_circle"
                  size={14}
                  className="text-[#1E4AD1] shrink-0 mt-0.5"
                  filled
                />
                <span>訂單取消不計入分潤</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-5">
            <h3 className="text-sm font-black text-slate-800 mb-3">累計 KPI</h3>
            <dl className="space-y-2.5 text-xs">
              {[
                ["累計分潤", fmt(totals.profit)],
                ["累計營收", fmt(totals.revenue)],
                ["有效訂單", `${totals.count} 筆`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <dt className="text-slate-400">{l}</dt>
                  <dd className="font-black text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   主頁面
────────────────────────────────────────────────────────── */
export default function PartnerProductsPage() {
  const router = useRouter();
  const { partner, store, setStore } = usePartnerSession();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [rangeStart, setRangeStart] = useState(() => thisMonthRange().start);
  const [rangeEnd, setRangeEnd] = useState(() => thisMonthRange().end);

  const tabFromQuery = String(router.query.tab || "");
  const activeTab = TABS.some((t) => t.id === tabFromQuery)
    ? tabFromQuery
    : "products";
  const focusId = router.query.focus ? String(router.query.focus) : null;

  const setActiveTab = useCallback(
    (id, extra = {}) => {
      router.replace(
        {
          pathname: "/partner/products",
          query: { tab: id, ...extra },
        },
        undefined,
        { shallow: true },
      );
    },
    [router],
  );

  const handleQuickRange = (type) => {
    if (type === "prevMonth") {
      const r = prevMonthRange();
      setRangeStart(r.start);
      setRangeEnd(r.end);
      return;
    }
    const r = thisMonthRange();
    setRangeStart(r.start);
    setRangeEnd(r.end);
  };

  const loadProducts = useCallback(async () => {
    if (!store?.id) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }
    setLoadingProducts(true);
    try {
      const token = await getAccessToken();
      const markup = Number(store.markup_rate) || 20;
      const markupMode = normalizeMarkupMode(store.markup_mode);
      const markupFixed = Number(store.markup_fixed) || 50;
      // 只打「已上架商品」這支輕量 API；不再打整包 Medusa 商品池
      // （product-pool 會抓全店數百個商品並逐一查即時報價，非常慢，
      // 且此頁只需要「本店已上架」的商品，資料已同步在 Supabase 本地表）
      const listRes = await fetch("/api/partner/store-listings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listData = listRes.ok ? await listRes.json() : { listings: [] };
      const localStatus = loadLocalStatusMap(store.id);
      const salesMap = orderStatsByName(stats?.orders || []);

      const rows = [];
      for (const row of listData.listings || []) {
        const medusaId = row.medusa_product_id || null;
        const name =
          row.product_name || `商品 #${row.product_id || medusaId || "?"}`;
        const cost = Number(row.min_b2b) || 0;
        const strategy = resolveMarkupStrategy({
          storeMarkupRate: markup,
          storeMarkupMode: markupMode,
          storeMarkupFixed: markupFixed,
          customPrices: row.custom_prices || {},
        });
        const baseSell = cost > 0 ? applyMarkupStrategy(cost, strategy) : 0;
        const customSell =
          row.custom_prices?._sell != null
            ? Number(row.custom_prices._sell)
            : null;
        const sellPrice = customSell > 0 ? customSell : baseSell;
        const sales = salesMap[name] || { totalSales: 0, totalProfit: 0 };
        const id = String(medusaId || `legacy_${row.product_id}`);
        const statusFromDb =
          row.status === "paused" || row.status === "active"
            ? row.status
            : null;
        const status =
          statusFromDb || localStatus[id] || "active";

        rows.push({
          id,
          listingId: row.id,
          medusaProductId: medusaId || null,
          productId: row.product_id || null,
          handle: row.product_handle || null,
          name,
          plans: row.plan_count || 1,
          cost,
          baseSell,
          sellPrice,
          customSell,
          customPrices: row.custom_prices || {},
          variants: row.variants || [],
          hotSaleTelecoms: row.hot_sale_telecoms || [],
          totalSales: sales.totalSales,
          totalProfit: sales.totalProfit,
          status,
          updated: row.created_at || null,
        });
      }

      setProducts(rows);
    } catch (err) {
      console.error("[PartnerProductsPage] loadProducts", err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [store, stats?.orders]);

  useEffect(() => {
    if (!partner) return;
    setLoadingStats(true);
    fetchPartnerStats(partner.id, store?.id).then((s) => {
      setStats(s);
      setLoadingStats(false);
    });
  }, [partner, store]);

  useEffect(() => {
    if (!loadingStats) loadProducts();
  }, [loadingStats, loadProducts]);

  const handleStatusChange = async (product, nextStatus) => {
    const token = await getAccessToken();
    const res = await fetch("/api/partner/store-listings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        medusa_product_id: product.medusaProductId,
        product_id: product.productId,
        status: nextStatus,
      }),
    });
    const data = await res.json().catch(() => ({}));
    // 即使 DB 無 status 欄，也以 localStorage 維護啟用／停用
    if (store?.id) {
      const map = loadLocalStatusMap(store.id);
      map[product.id] = nextStatus;
      saveLocalStatusMap(store.id, map);
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p)),
    );
    if (!res.ok && !data.statusLocalOnly) {
      // 非 status 錯誤才提示
      if (!/status|does not exist/i.test(data.error || "")) {
        alert(data.error || "狀態更新失敗");
      }
    }
  };

  const handleRemove = async (product) => {
    const token = await getAccessToken();
    const res = await fetch("/api/partner/store-listings", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        medusa_product_id: product.medusaProductId,
        product_id: product.productId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "刪除失敗");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  };

  return (
    <PartnerAdminLayout title="商品管理">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex bg-white border-b border-slate-200 overflow-x-auto shrink-0 scrollbar-none">
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition min-h-12 ${
                  isActive
                    ? "border-[#1E4AD1] text-[#1E4AD1] bg-blue-50/30"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <MaterialIcon name={t.icon} size={18} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {activeTab === "analytics" && (
            <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
              <PartnerProductAnalytics
                stats={stats}
                loading={loadingStats}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onRangeStartChange={setRangeStart}
                onRangeEndChange={setRangeEnd}
                onQuickRange={handleQuickRange}
              />
            </div>
          )}

          {activeTab === "products" && (
            <div className="flex-1 min-h-0 p-3 sm:p-5 pb-24 md:pb-5">
              <ProductsTab
                products={products}
                loading={loadingProducts}
                onRefresh={loadProducts}
                onGoPricing={(p) => setActiveTab("pricing", { focus: p.id })}
                onStatusChange={handleStatusChange}
                onRemove={handleRemove}
              />
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="flex-1 min-h-0 p-3 sm:p-5 pb-24 md:pb-5">
              <PricingTab
                products={products}
                loading={loadingProducts}
                focusId={focusId}
                markupRate={Number(store?.markup_rate) || 20}
                store={store}
                setStore={setStore}
                onSaved={loadProducts}
              />
            </div>
          )}

          {activeTab === "report" && (
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 pb-24 md:pb-5">
              <ReportTab
                stats={stats}
                partner={partner}
                store={store}
                onGoTab={setActiveTab}
              />
            </div>
          )}
        </div>
      </div>
    </PartnerAdminLayout>
  );
}
