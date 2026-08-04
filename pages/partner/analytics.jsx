import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import { fmt } from "@/components/partner/DobermanWidgets";
import MaterialIcon from "@/components/MaterialIcon";
import { usePartnerSession, fetchPartnerStats } from "@/lib/partnerAuth";
import { isSettledOrderStatus } from "@/lib/refundPolicy";
import { SHOPIFY_BADGE } from "@/lib/shopifyUi";
import {
  filterByRange,
  sumTotals,
  productBreakdownWithTrend,
  topSellingProducts,
  monthlyProfitSeries,
  previousPeriodOrders,
  ordersInLastNDays,
  greetingByHour,
} from "@/lib/partnerAnalytics";
import { resolveMedusaImageUrl } from "@/lib/resolveMedusaImageUrl";

/** 分潤分析頁面：深灰／淺灰／白 + 較大圓角；圖表與狀態徽章維持原色 */
const AUI = {
  dark: "#2d2d2d",
  mid: "#5c5c5c",
  soft: "#8a8a8a",
  border: "#e5e5e5",
  light: "#f0f0f0",
  wash: "#f6f6f6",
  white: "#ffffff",
  radius: "1rem", // 16px
  radiusSm: "0.75rem", // 12px
};

const chartLoading = () => (
  <div className="h-28 flex items-center justify-center text-xs animate-pulse" style={{ color: AUI.soft }}>
    載入圖表...
  </div>
);
const RevenueSplitDonut = dynamic(
  () => import("@/components/partner/AnalyticsCharts").then((m) => m.RevenueSplitDonut),
  { ssr: false, loading: chartLoading },
);
const CountCircle = dynamic(
  () => import("@/components/partner/AnalyticsCharts").then((m) => m.CountCircle),
  { ssr: false, loading: chartLoading },
);
const MonthlyBarChart = dynamic(
  () => import("@/components/partner/AnalyticsCharts").then((m) => m.MonthlyBarChart),
  { ssr: false, loading: chartLoading },
);

const RANGE_OPTIONS = [
  { id: "7d", label: "近 7 天", days: 7 },
  { id: "30d", label: "近 30 天", days: 30 },
  { id: "90d", label: "近 90 天", days: 90 },
  { id: "all", label: "全部", days: null },
];

function rangeToStartEnd(id) {
  const opt = RANGE_OPTIONS.find((r) => r.id === id) || RANGE_OPTIONS[1];
  const end = new Date().toISOString().slice(0, 10);
  if (!opt.days) return { start: "2000-01-01", end };
  const start = new Date(Date.now() - (opt.days - 1) * 86400000)
    .toISOString()
    .slice(0, 10);
  return { start, end };
}

function Badge({ tone = "neutral", children }) {
  const t = SHOPIFY_BADGE[tone] || SHOPIFY_BADGE.neutral;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums whitespace-nowrap"
      style={{ backgroundColor: t.bg, color: t.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.dot }} />
      {children}
    </span>
  );
}

function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: AUI.white,
        border: `1px solid ${AUI.border}`,
        borderRadius: AUI.radius,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatPill({ icon, iconBg, label, value, sub }) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3.5 flex-1 min-w-[160px]">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <MaterialIcon name={icon} size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black tabular-nums leading-tight" style={{ color: AUI.dark }}>
          {value}
        </p>
        <p className="text-[11px] font-semibold truncate" style={{ color: AUI.soft }}>
          {label}
        </p>
        {sub ? (
          <p className="text-[10px] mt-0.5" style={{ color: AUI.soft }}>
            {sub}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

export default function PartnerAnalyticsPage() {
  const { partner, store } = usePartnerSession();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeId, setRangeId] = useState("30d");
  const [tableSort, setTableSort] = useState("profit");

  useEffect(() => {
    if (!partner) return;
    setLoading(true);
    fetchPartnerStats(partner.id, store?.id).then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, [partner, store]);

  const { start, end } = useMemo(() => rangeToStartEnd(rangeId), [rangeId]);

  const filtered = useMemo(
    () => filterByRange(stats?.orders, start, end),
    [stats?.orders, start, end],
  );
  const valid = useMemo(
    () => filtered.filter((o) => isSettledOrderStatus(o.status)),
    [filtered],
  );
  const validAll = useMemo(
    () => (stats?.orders || []).filter((o) => isSettledOrderStatus(o.status)),
    [stats?.orders],
  );

  const totals = useMemo(() => sumTotals(valid), [valid]);

  const prevOrders = useMemo(
    () => previousPeriodOrders(validAll, start, end),
    [validAll, start, end],
  );

  const breakdown = useMemo(
    () => productBreakdownWithTrend(valid, prevOrders),
    [valid, prevOrders],
  );

  const sortedBreakdown = useMemo(() => {
    const list = [...breakdown];
    if (tableSort === "orders") list.sort((a, b) => b.count - a.count);
    else list.sort((a, b) => b.profit - a.profit);
    return list;
  }, [breakdown, tableSort]);

  const monthlyBuckets = useMemo(
    () => monthlyProfitSeries(validAll, 6),
    [validAll],
  );

  const recent7d = useMemo(
    () => ordersInLastNDays(stats?.orders || [], 7),
    [stats?.orders],
  );

  const isReferral = partner?.cooperation_model === "referral";
  const displayName = isReferral
    ? partner?.name
    : store?.store_name || partner?.name || "";
  const greeting = greetingByHour();

  const isGood = !loading && totals.count > 0 && totals.profit > 0;

  const topSellers = useMemo(() => topSellingProducts(valid, 6), [valid]);

  const tableTotals = useMemo(() => {
    const profit = sortedBreakdown.reduce((s, r) => s + (r.profit || 0), 0);
    const count = sortedBreakdown.reduce((s, r) => s + (r.count || 0), 0);
    const avgProfit = count > 0 ? profit / count : 0;
    return { profit, count, avgProfit };
  }, [sortedBreakdown]);

  return (
    <PartnerAdminLayout title="分潤分析">
      <div
        className="px-4 sm:px-6 pt-5 pb-24 md:pb-6 space-y-5"
        style={{ backgroundColor: AUI.wash }}
      >
        {/* 頁首 + 期間切換 */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: AUI.dark }}>
              分潤分析
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: AUI.mid }}>
              以真實訂單紀錄統計，掌握分潤走勢與熱門商品表現
            </p>
          </div>
          <div
            className="inline-flex items-center p-1"
            style={{
              backgroundColor: AUI.white,
              border: `1px solid ${AUI.border}`,
              borderRadius: AUI.radius,
            }}
          >
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRangeId(r.id)}
                className="px-3 py-1.5 text-xs font-bold transition"
                style={{
                  borderRadius: AUI.radiusSm,
                  backgroundColor: rangeId === r.id ? AUI.dark : "transparent",
                  color: rangeId === r.id ? AUI.white : AUI.mid,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 歡迎橫幅 */}
        <Card className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-black" style={{ color: AUI.dark }}>
              {greeting}，{displayName || "夥伴"}！
            </p>
            <p className="text-xs mt-1" style={{ color: AUI.mid }}>
              {loading
                ? "正在讀取分潤數據…"
                : totals.count > 0
                  ? `所選期間已賺取 ${fmt(totals.profit)} 分潤，共 ${totals.count} 筆有效訂單${
                      isGood ? "，表現穩定" : ""
                    }。`
                  : "此期間尚無有效訂單，分享您的專屬連結開始賺取分潤。"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/partner/orders"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-bold transition"
              style={{
                border: `1px solid ${AUI.border}`,
                color: AUI.dark,
                backgroundColor: AUI.white,
                borderRadius: AUI.radiusSm,
              }}
            >
              <MaterialIcon name="receipt_long" size={16} />
              查看訂單
            </Link>
            <Link
              href="/partner/settlement"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-bold text-white transition"
              style={{ backgroundColor: AUI.dark, borderRadius: AUI.radiusSm }}
            >
              <MaterialIcon name="account_balance_wallet" size={16} />
              申請提領
            </Link>
          </div>
        </Card>

        {/* 統計膠囊列（圖示維持原色） */}
        <div className="flex flex-wrap gap-3">
          <StatPill
            icon="receipt_long"
            iconBg="#2c6ecb"
            label="有效訂單"
            value={loading ? "…" : totals.count}
          />
          <StatPill
            icon="percent"
            iconBg="#008060"
            label="分潤占營收"
            value={loading ? "…" : `${totals.rate}%`}
            sub={`每付 NT$100 約 NT$${loading ? "…" : totals.rate}`}
          />
          <StatPill
            icon="payments"
            iconBg="#eec200"
            label="平均客單分潤"
            value={loading ? "…" : fmt(totals.count ? totals.profit / totals.count : 0)}
          />
          <StatPill
            icon="inventory_2"
            iconBg="#8c9196"
            label="推廣商品數"
            value={loading ? "…" : breakdown.length}
          />
        </div>

        {/* 圖表列（圖表維持原色） */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="p-4">
            <p className="text-xs font-bold mb-3" style={{ color: AUI.mid }}>
              分潤 vs 底價成本
            </p>
            {loading ? (
              <div className="h-28 flex items-center justify-center text-xs" style={{ color: AUI.soft }}>
                載入中…
              </div>
            ) : (
              <RevenueSplitDonut profit={totals.profit} cost={totals.cost} />
            )}
          </Card>

          <Card className="p-4 flex items-center gap-4">
            {loading ? (
              <div className="h-20 w-full flex items-center justify-center text-xs" style={{ color: AUI.soft }}>
                載入中…
              </div>
            ) : (
              <>
                <CountCircle value={recent7d} color="#008060" />
                <div>
                  <p className="text-xs font-bold" style={{ color: AUI.mid }}>
                    近 7 天新增訂單
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: AUI.soft }}>
                    含所有狀態，供掌握近況熱度
                  </p>
                </div>
              </>
            )}
          </Card>

          <Card className="p-4">
            <p className="text-xs font-bold mb-2" style={{ color: AUI.mid }}>
              近 6 個月分潤趨勢
            </p>
            <div className="h-28">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs" style={{ color: AUI.soft }}>
                  載入中…
                </div>
              ) : (
                <MonthlyBarChart buckets={monthlyBuckets} />
              )}
            </div>
          </Card>
        </div>

        {/* 商品分潤排行 */}
        <Card className="overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${AUI.border}` }}
          >
            <h2 className="text-sm font-black" style={{ color: AUI.dark }}>
              商品分潤排行
            </h2>
            <div
              className="inline-flex items-center p-1"
              style={{ backgroundColor: AUI.light, borderRadius: AUI.radiusSm }}
            >
              {[
                { id: "profit", label: "依分潤" },
                { id: "orders", label: "依訂單數" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTableSort(t.id)}
                  className="px-2.5 py-1 text-[11px] font-bold transition"
                  style={{
                    borderRadius: "0.5rem",
                    backgroundColor: tableSort === t.id ? AUI.white : "transparent",
                    color: tableSort === t.id ? AUI.dark : AUI.soft,
                    boxShadow: tableSort === t.id ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm" style={{ color: AUI.soft }}>
              載入中…
            </div>
          ) : !sortedBreakdown.length ? (
            <div className="py-12 text-center text-sm" style={{ color: AUI.soft }}>
              此期間尚無資料
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr
                    className="text-[10px] uppercase tracking-wider"
                    style={{ backgroundColor: AUI.light, color: AUI.soft }}
                  >
                    <th className="px-4 py-2.5 text-left font-bold w-10">#</th>
                    <th className="px-4 py-2.5 text-left font-bold">商品</th>
                    <th className="px-4 py-2.5 text-right font-bold">分潤%</th>
                    <th className="px-4 py-2.5 text-right font-bold">訂單數</th>
                    <th className="px-4 py-2.5 text-right font-bold">單筆分潤金額</th>
                    <th className="px-4 py-2.5 text-right font-bold">分潤小計</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBreakdown.map((row, idx) => {
                    const shareTone =
                      row.sharePercent >= 20
                        ? "success"
                        : row.sharePercent >= 10
                          ? "info"
                          : "neutral";
                    return (
                      <tr
                        key={row.name}
                        style={{ borderTop: `1px solid ${AUI.border}` }}
                      >
                        <td className="px-4 py-2.5 font-bold" style={{ color: AUI.soft }}>
                          {idx + 1}
                        </td>
                        <td
                          className="px-4 py-2.5 font-semibold truncate max-w-[240px]"
                          style={{ color: AUI.dark }}
                        >
                          {row.name}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Badge tone={shareTone}>{row.sharePercent}%</Badge>
                        </td>
                        <td
                          className="px-4 py-2.5 text-right tabular-nums"
                          style={{ color: AUI.mid }}
                        >
                          {row.count}
                        </td>
                        <td
                          className="px-4 py-2.5 text-right font-bold tabular-nums"
                          style={{ color: AUI.dark }}
                        >
                          {fmt(row.avgProfit)}
                        </td>
                        <td
                          className="px-4 py-2.5 text-right font-black tabular-nums"
                          style={{ color: AUI.dark }}
                        >
                          {fmt(row.profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr
                    style={{
                      borderTop: `2px solid ${AUI.dark}`,
                      backgroundColor: AUI.light,
                    }}
                  >
                    <td
                      className="px-4 py-3 font-black"
                      colSpan={2}
                      style={{ color: AUI.dark }}
                    >
                      分潤總計
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone="success">100%</Badge>
                    </td>
                    <td
                      className="px-4 py-3 text-right font-bold tabular-nums"
                      style={{ color: AUI.dark }}
                    >
                      {tableTotals.count}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-bold tabular-nums"
                      style={{ color: AUI.dark }}
                    >
                      {fmt(tableTotals.avgProfit)}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-black tabular-nums"
                      style={{ color: AUI.dark }}
                    >
                      {fmt(tableTotals.profit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        {/* 熱銷商品 */}
        {!loading && topSellers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-black" style={{ color: AUI.dark }}>
                  熱銷商品
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: AUI.soft }}>
                  依所選期間訂單數排序，顯示您賣最多的前 {topSellers.length} 名商品
                </p>
              </div>
              <Link
                href="/partner/orders"
                className="text-xs font-bold hover:underline"
                style={{ color: AUI.mid }}
              >
                查看全部訂單
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topSellers.map((row, idx) => {
                const img =
                  resolveMedusaImageUrl(row.image) || row.image || null;
                return (
                  <Card key={row.name} className="p-4 flex gap-3">
                    <div className="relative shrink-0">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt=""
                          className="w-14 h-14 object-cover"
                          style={{
                            backgroundColor: AUI.light,
                            borderRadius: AUI.radiusSm,
                          }}
                        />
                      ) : (
                        <div
                          className="w-14 h-14 flex items-center justify-center"
                          style={{
                            backgroundColor: AUI.light,
                            borderRadius: AUI.radiusSm,
                          }}
                        >
                          <MaterialIcon
                            name="sim_card"
                            size={22}
                            style={{ color: AUI.soft }}
                          />
                        </div>
                      )}
                      <span
                        className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                        style={{ backgroundColor: AUI.dark }}
                      >
                        {idx + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-bold leading-snug line-clamp-2"
                        style={{ color: AUI.dark }}
                      >
                        {row.name}
                      </p>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <div>
                          <p
                            className="text-[10px] font-bold uppercase tracking-wide"
                            style={{ color: AUI.soft }}
                          >
                            訂單數
                          </p>
                          <p
                            className="text-sm font-black tabular-nums"
                            style={{ color: AUI.dark }}
                          >
                            {row.count} 筆
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className="text-[10px] font-bold uppercase tracking-wide"
                            style={{ color: AUI.soft }}
                          >
                            分潤金額
                          </p>
                          <p
                            className="text-sm font-black tabular-nums"
                            style={{ color: AUI.dark }}
                          >
                            {fmt(row.profit)}
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] mt-1.5" style={{ color: AUI.soft }}>
                        單筆約 {fmt(row.avgProfit)} · 占分潤 {row.sharePercent}%
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PartnerAdminLayout>
  );
}
