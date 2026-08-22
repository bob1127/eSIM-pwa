import { useEffect, useMemo, useState } from "react";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import MaterialIcon from "@/components/MaterialIcon";
import {
  ShopifyTabs,
  ShopifyDropdown,
} from "@/components/partner/ShopifyControls";
import { usePartnerSession } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import { PARTNER_UI } from "@/lib/partnerUi";
import { SHOPIFY_UI, SHOPIFY_BADGE } from "@/lib/shopifyUi";
import { resolveMedusaImageUrl } from "@/lib/resolveMedusaImageUrl";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

/** Shopify Polaris 風格的膠囊徽章：色塊 + 圓點 + 文字 */
function Badge({ tone = "neutral", children }) {
  const t = SHOPIFY_BADGE[tone] || SHOPIFY_BADGE.neutral;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums"
      style={{ backgroundColor: t.bg, color: t.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: t.dot }}
      />
      {children}
    </span>
  );
}

/** 獨立白卡統計（比照 Shopify Products 頁 Total Products / Revenue 卡片） */
function StatCard({ label, value, sub }) {
  return (
    <div
      className="flex-1 min-w-[140px] rounded-lg px-4 py-3.5"
      style={{ backgroundColor: SHOPIFY_UI.cardBg, border: `1px solid ${SHOPIFY_UI.cardBorder}` }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color: SHOPIFY_UI.textTertiary }}
      >
        {label}
      </p>
      <p
        className="text-xl sm:text-2xl font-black mt-1 tabular-nums"
        style={{ color: SHOPIFY_UI.textPrimary }}
      >
        {value}
      </p>
      {sub ? (
        <p className="text-[11px] mt-0.5" style={{ color: SHOPIFY_UI.textTertiary }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

const TABS = [
  { id: "all", label: "全部" },
  { id: "with_discount", label: "已開放折扣" },
  { id: "without_discount", label: "未開放折扣" },
];

function toCsvValue(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function PartnerRatesPage() {
  const { partner } = usePartnerSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [discountEnabled, setDiscountEnabled] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [sortDir, setSortDir] = useState("desc"); // 依平均分潤％排序
  const [selected, setSelected] = useState(() => new Set());
  const [toast, setToast] = useState("");

  const load = async () => {
    if (!partner) return;
    if (partner.cooperation_model !== "referral") {
      setLoading(false);
      setError("此頁面僅供專屬連結夥伴使用");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("請重新登入");

      const res = await fetch("/api/partner/product-terms", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "讀取失敗");
      setProducts(data.products || []);
      setDiscountEnabled(data.discount_enabled !== false);
      setSelected(new Set());
    } catch (err) {
      setError(err.message || "讀取失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const productAvgRate = (p) => {
    const vals = p.carriers
      .map((c) => c.partner_rate_percent)
      .filter((n) => n != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : -1;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter(
      (p) =>
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.carriers.some((c) => c.carrier?.toLowerCase().includes(q)),
    );
    if (tab === "with_discount") {
      list = list.filter((p) =>
        p.carriers.some((c) => c.referral_discount_percent != null),
      );
    } else if (tab === "without_discount") {
      list = list.filter((p) =>
        p.carriers.every((c) => c.referral_discount_percent == null),
      );
    }
    list = [...list].sort((a, b) => {
      const diff = productAvgRate(a) - productAvgRate(b);
      return sortDir === "desc" ? -diff : diff;
    });
    return list;
  }, [products, query, tab, sortDir]);

  const stats = useMemo(() => {
    const carrierRows = products.reduce((s, p) => s + p.carriers.length, 0);
    const rates = products.flatMap((p) =>
      p.carriers.map((c) => c.partner_rate_percent).filter((n) => n != null),
    );
    const discounts = products.flatMap((p) =>
      p.carriers
        .map((c) => c.referral_discount_percent)
        .filter((n) => n != null),
    );
    const avg = (arr) =>
      arr.length
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : null;
    return {
      productCount: products.length,
      carrierRows,
      avgRate: avg(rates),
      avgDiscount: avg(discounts),
    };
  }, [products]);

  const flatRows = useMemo(
    () =>
      filtered.flatMap((p) =>
        p.carriers.map((c) => ({
          key: `${p.id}::${c.carrier}`,
          product: p,
          carrier: c,
        })),
      ),
    [filtered],
  );

  const allChecked = flatRows.length > 0 && selected.size === flatRows.length;
  const someChecked = selected.size > 0 && !allChecked;

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(flatRows.map((r) => r.key)));
  };

  const toggleRow = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedRows = flatRows.filter((r) => selected.has(r.key));

  const exportCsv = (rows) => {
    const header = ["商品", "電信商", "分潤％", "旅客折扣％"];
    const body = rows.map((r) => [
      r.product.title,
      r.carrier.carrier,
      r.carrier.partner_rate_percent != null ? `${r.carrier.partner_rate_percent}%` : "",
      discountEnabled && r.carrier.referral_discount_percent != null
        ? `${r.carrier.referral_discount_percent}%`
        : "",
    ]);
    downloadCsv(`方案分潤_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body]);
    setToast(`已匯出 ${rows.length} 筆`);
  };

  const copySummary = async (rows) => {
    const text = rows
      .map(
        (r) =>
          `${r.product.title} - ${r.carrier.carrier}：分潤 ${
            r.carrier.partner_rate_percent != null ? `${r.carrier.partner_rate_percent}%` : "—"
          }／折扣 ${
            discountEnabled && r.carrier.referral_discount_percent != null
              ? `${r.carrier.referral_discount_percent}%`
              : "—"
          }`,
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setToast(`已複製 ${rows.length} 筆摘要`);
    } catch {
      setToast("複製失敗，請手動選取文字複製");
    }
  };

  const hasData = !loading && !error && products.length > 0;

  return (
    <PartnerAdminLayout title="方案分潤一覽">
      <div className={`${PARTNER_UI.pageFlush} flex flex-col flex-1 min-h-0`}>
        {/* 頁首：標題 + 說明 + 動作按鈕（比照 Shopify Products 頁頭） */}
        <div
          className="px-4 sm:px-6 pt-5 pb-4"
          style={{ backgroundColor: SHOPIFY_UI.cardBg, borderBottom: `1px solid ${SHOPIFY_UI.cardBorder}` }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1
                className="text-xl font-black tracking-tight"
                style={{ color: SHOPIFY_UI.textPrimary }}
              >
                方案分潤一覽
              </h1>
              <p
                className="text-xs sm:text-sm mt-1 leading-relaxed max-w-xl"
                style={{ color: SHOPIFY_UI.textSecondary }}
              >
                分潤％與旅客專屬折扣％依「商品 × 電信商」設定；旅客用您的專屬連結／折扣碼下單時，系統會依購物車商品自動套用對應趴數。
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ShopifyDropdown
                label="匯出"
                icon="download"
                disabled={!flatRows.length}
                items={[
                  {
                    id: "csv-all",
                    label: "匯出全部 CSV",
                    icon: "download",
                    disabled: !flatRows.length,
                    onClick: () => exportCsv(flatRows),
                  },
                  {
                    id: "csv-selected",
                    label: selected.size
                      ? `匯出所選 ${selected.size} 筆`
                      : "先勾選方案再匯出",
                    icon: "checklist",
                    disabled: !selected.size,
                    onClick: () => exportCsv(selectedRows),
                  },
                  { divider: true },
                  {
                    id: "copy",
                    label: selected.size
                      ? `複製所選摘要（${selected.size}）`
                      : "複製全部摘要",
                    icon: "content_copy",
                    disabled: !flatRows.length,
                    onClick: () =>
                      copySummary(selected.size ? selectedRows : flatRows),
                  },
                ]}
              />
              <ShopifyDropdown
                label="更多操作"
                items={[
                  {
                    id: "refresh",
                    label: loading ? "重新整理中…" : "重新整理",
                    icon: "refresh",
                    disabled: loading,
                    onClick: load,
                  },
                ]}
              />
            </div>
          </div>

          {!discountEnabled ? (
            <div
              className="mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs font-semibold"
              style={{ backgroundColor: SHOPIFY_BADGE.warning.bg, color: SHOPIFY_BADGE.warning.text }}
            >
              <MaterialIcon name="info" size={16} className="shrink-0 mt-0.5" />
              您的專屬折扣碼目前為關閉狀態：連結仍可歸因分潤，但旅客不會有折扣。
            </div>
          ) : null}
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 flex-1 overflow-auto space-y-4">
          {/* 統計卡片列 */}
          {hasData ? (
            <div className="flex flex-wrap sm:flex-nowrap gap-3">
              <StatCard label="已設定商品" value={stats.productCount} />
              <StatCard label="電信商方案數" value={stats.carrierRows} />
              <StatCard
                label="平均分潤％"
                value={stats.avgRate != null ? `${stats.avgRate}%` : "—"}
              />
              <StatCard
                label="平均旅客折扣％"
                value={
                  !discountEnabled
                    ? "未開放"
                    : stats.avgDiscount != null
                      ? `${stats.avgDiscount}%`
                      : "—"
                }
              />
            </div>
          ) : null}

          {/* 標籤列（比照 Shopify All / Active / Draft 分頁籤） */}
          {hasData ? (
            <ShopifyTabs tabs={TABS} value={tab} onChange={setTab} />
          ) : null}

          {/* 搜尋 + 排序列（比照 Shopify 搜尋／篩選／排序列） */}
          {hasData ? (
            <div
              className="flex items-center gap-2 rounded-lg px-3.5 py-2.5"
              style={{ backgroundColor: SHOPIFY_UI.cardBg, border: `1px solid ${SHOPIFY_UI.cardBorder}` }}
            >
              <MaterialIcon name="search" size={18} style={{ color: SHOPIFY_UI.textTertiary }} className="shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋商品名稱或電信商…"
                className="flex-1 text-sm outline-none min-w-0 bg-transparent"
                style={{ color: SHOPIFY_UI.textPrimary }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  style={{ color: SHOPIFY_UI.textTertiary }}
                  className="shrink-0"
                >
                  <MaterialIcon name="close" size={16} />
                </button>
              ) : null}
              <div className="w-px h-5 shrink-0" style={{ backgroundColor: SHOPIFY_UI.cardBorder }} />
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                className="inline-flex items-center gap-1 text-xs font-bold shrink-0 whitespace-nowrap"
                style={{ color: SHOPIFY_UI.textSecondary }}
                title="依平均分潤％排序"
              >
                <MaterialIcon
                  name={sortDir === "desc" ? "arrow_downward" : "arrow_upward"}
                  size={16}
                />
                分潤％
              </button>
            </div>
          ) : null}

          {/* 內容 */}
          {loading ? (
            <div
              className="rounded-lg py-16 flex items-center justify-center"
              style={{ backgroundColor: SHOPIFY_UI.cardBg, border: `1px solid ${SHOPIFY_UI.cardBorder}` }}
            >
              <LoadingIndicator layout="center" label="載入方案分潤中…" />
            </div>
          ) : error ? (
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{ backgroundColor: SHOPIFY_BADGE.critical.bg, color: SHOPIFY_BADGE.critical.text }}
            >
              {error}
            </div>
          ) : !products.length ? (
            <div
              className="rounded-lg px-4 py-14 text-center"
              style={{ backgroundColor: SHOPIFY_UI.cardBg, border: `1px solid ${SHOPIFY_UI.cardBorder}` }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: SHOPIFY_UI.canvasBg }}
              >
                <MaterialIcon name="percent" size={22} style={{ color: SHOPIFY_UI.textTertiary }} />
              </div>
              <p className="text-sm font-bold" style={{ color: SHOPIFY_UI.textSecondary }}>
                尚無已設定分潤／折扣的商品
              </p>
              <p className="text-xs mt-1" style={{ color: SHOPIFY_UI.textTertiary }}>
                請待總部於商品後台完成設定後再查看
              </p>
            </div>
          ) : !filtered.length ? (
            <div
              className="rounded-lg px-4 py-14 text-center text-sm"
              style={{ backgroundColor: SHOPIFY_UI.cardBg, border: `1px solid ${SHOPIFY_UI.cardBorder}`, color: SHOPIFY_UI.textTertiary }}
            >
              找不到符合條件的商品
            </div>
          ) : (
            <div
              className="rounded-lg overflow-hidden relative"
              style={{ backgroundColor: SHOPIFY_UI.cardBg, border: `1px solid ${SHOPIFY_UI.cardBorder}` }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr
                      className="text-[10px] uppercase tracking-wider"
                      style={{ backgroundColor: SHOPIFY_UI.canvasBg, borderBottom: `1px solid ${SHOPIFY_UI.cardBorder}`, color: SHOPIFY_UI.textTertiary }}
                    >
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-black cursor-pointer"
                          checked={allChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = someChecked;
                          }}
                          onChange={toggleAll}
                          aria-label="全選"
                        />
                      </th>
                      <th className="text-left font-bold px-4 py-3">商品</th>
                      <th className="text-left font-bold px-4 py-3">電信商</th>
                      <th className="text-right font-bold px-4 py-3">
                        您的分潤％
                      </th>
                      <th className="text-right font-bold px-4 py-3">
                        旅客折扣％
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) =>
                      p.carriers.map((c, idx) => {
                        const key = `${p.id}::${c.carrier}`;
                        const checked = selected.has(key);
                        return (
                          <tr
                            key={key}
                            className="transition"
                            style={{
                              borderBottom: `1px solid ${SHOPIFY_UI.divider}`,
                              backgroundColor: checked ? "#f6f6f7" : "transparent",
                            }}
                          >
                            <td className="px-4 py-3 align-top">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded accent-black cursor-pointer"
                                checked={checked}
                                onChange={() => toggleRow(key)}
                                aria-label={`選取 ${p.title} - ${c.carrier}`}
                              />
                            </td>
                            {idx === 0 ? (
                              <td
                                className="px-4 py-3 align-top"
                                rowSpan={p.carriers.length}
                              >
                                <div className="flex items-center gap-3">
                                  {p.thumbnail ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={
                                        resolveMedusaImageUrl(p.thumbnail) ||
                                        p.thumbnail
                                      }
                                      alt=""
                                      className="w-10 h-10 rounded-md object-cover shrink-0"
                                      style={{ backgroundColor: SHOPIFY_UI.canvasBg }}
                                    />
                                  ) : (
                                    <div
                                      className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                                      style={{ backgroundColor: SHOPIFY_UI.canvasBg }}
                                    >
                                      <MaterialIcon
                                        name="sim_card"
                                        size={18}
                                        style={{ color: SHOPIFY_UI.textTertiary }}
                                      />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p
                                      className="text-sm font-bold truncate max-w-[220px]"
                                      style={{ color: SHOPIFY_UI.textPrimary }}
                                    >
                                      {p.title}
                                    </p>
                                    {p.handle ? (
                                      <p
                                        className="text-[11px] font-mono truncate max-w-[220px]"
                                        style={{ color: SHOPIFY_UI.textTertiary }}
                                      >
                                        {p.handle}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                            ) : null}
                            <td
                              className="px-4 py-3 font-semibold"
                              style={{ color: SHOPIFY_UI.textSecondary }}
                            >
                              {c.carrier}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {c.partner_rate_percent != null ? (
                                <Badge tone="info">{c.partner_rate_percent}%</Badge>
                              ) : (
                                <span style={{ color: "#c9cccf" }}>—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {!discountEnabled ? (
                                <Badge tone="neutral">未開放</Badge>
                              ) : c.referral_discount_percent != null ? (
                                <Badge tone="success">
                                  {c.referral_discount_percent}%
                                </Badge>
                              ) : (
                                <span style={{ color: "#c9cccf" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      }),
                    )}
                  </tbody>
                </table>
              </div>

              {/* 浮動批次操作列（比照 Shopify 選取列後的底部工具列） */}
              {selectedRows.length > 0 ? (
                <div className="sticky bottom-0 inset-x-0 flex justify-center pb-3 pt-2 pointer-events-none">
                  <div
                    className="pointer-events-auto flex items-center gap-1 rounded-full shadow-lg px-2 py-1.5"
                    style={{ backgroundColor: SHOPIFY_UI.chromeBg }}
                  >
                    <span className="text-white text-xs font-bold px-2.5">
                      已選取 {selectedRows.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => copySummary(selectedRows)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold text-white hover:bg-white/10 transition"
                    >
                      <MaterialIcon name="content_copy" size={14} />
                      複製摘要
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCsv(selectedRows)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold text-white hover:bg-white/10 transition"
                    >
                      <MaterialIcon name="download" size={14} />
                      匯出 CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white hover:bg-white/10 transition"
                      title="取消選取"
                    >
                      <MaterialIcon name="close" size={16} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Toast 通知 */}
      {toast ? (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div
            className="rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg"
            style={{ backgroundColor: SHOPIFY_UI.chromeBg }}
          >
            {toast}
          </div>
        </div>
      ) : null}
    </PartnerAdminLayout>
  );
}
