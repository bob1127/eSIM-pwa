import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import {
  ReportPeriodBar,
  DobermanStatusBanner,
  DobermanPanel,
  DobermanTopCard,
  fmt,
  METRIC_HELP,
  MetricPanelHeader,
  prevMonthRange,
  thisMonthRange,
} from "@/components/partner/DobermanWidgets";
import MaterialIcon from "@/components/MaterialIcon";
import { usePartnerSession, fetchPartnerStats, SITE_URL } from "@/lib/partnerAuth";
import {
  buildReferralShareUrl,
  DEFAULT_REFERRAL_RATE,
  REFERRAL_BONUS_RATE,
  REFERRAL_BONUS_ORDER_THRESHOLD,
  referralRateForMonthCount,
  monthBoundsIso,
} from "@/lib/partnerReferral";
import { isSettledOrderStatus } from "@/lib/refundPolicy";
import { paymentMethodLabel, buyerDisplayName } from "@/lib/orderDisplay";

const DashboardDonut = dynamic(() => import("@/components/partner/PartnerDashboardDonut"), {
  ssr: false,
  loading: () => (
    <div className="h-36 flex items-center justify-center text-slate-400 text-xs animate-pulse">
      載入圖表...
    </div>
  ),
});

function filterByRange(orders = [], start, end) {
  const s = start ? new Date(start).getTime() : 0;
  const e = end ? new Date(end + "T23:59:59").getTime() : Infinity;
  return orders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t >= s && t <= e;
  });
}

function productShare(orders) {
  const map = {};
  for (const o of orders) {
    const items = (() => {
      try {
        return Array.isArray(o.item_details) ? o.item_details : JSON.parse(o.item_details || "[]");
      } catch {
        return [];
      }
    })();
    const key = items[0]?.name || "其他方案";
    map[key] = (map[key] || 0) + (Number(o.partner_profit) || 0);
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

function topProduct(orders) {
  const map = {};
  for (const o of orders) {
    const items = (() => {
      try {
        return Array.isArray(o.item_details) ? o.item_details : JSON.parse(o.item_details || "[]");
      } catch {
        return [];
      }
    })();
    const key = items[0]?.name || "其他方案";
    map[key] = (map[key] || 0) + 1;
  }
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return sorted[0] || ["尚無資料", 0];
}

export default function PartnerDashboard() {
  const { partner, store } = usePartnerSession();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeStart, setRangeStart] = useState(() => thisMonthRange().start);
  const [rangeEnd, setRangeEnd] = useState(() => thisMonthRange().end);

  useEffect(() => {
    if (!partner) return;
    setLoading(true);
    fetchPartnerStats(partner.id, store?.id).then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, [partner, store]);

  const handleQuickRange = (type) => {
    const r = type === "prevMonth" ? prevMonthRange() : thisMonthRange();
    setRangeStart(r.start);
    setRangeEnd(r.end);
  };

  const filtered = useMemo(
    () => filterByRange(stats?.orders, rangeStart, rangeEnd),
    [stats?.orders, rangeStart, rangeEnd],
  );

  const valid = useMemo(
    () => filtered.filter((o) => isSettledOrderStatus(o.status)),
    [filtered],
  );

  const totals = useMemo(() => {
    const revenue = valid.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const profit = valid.reduce((s, o) => s + (Number(o.partner_profit) || 0), 0);
    const cost = valid.reduce((s, o) => s + (Number(o.b2b_cost) || 0), 0);
    const rate = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    return { revenue, profit, cost, count: valid.length, rate };
  }, [valid]);

  const share = useMemo(() => productShare(valid), [valid]);
  const [topName, topCount] = useMemo(() => topProduct(valid), [valid]);

  const storeUrl = store ? `${SITE_URL}/p/${store.domain}` : null;
  const isReferral = partner?.cooperation_model === "referral";
  const referralUrl =
    isReferral && (partner.referral_code || partner.slug)
      ? buildReferralShareUrl(
          SITE_URL,
          partner.referral_code || partner.slug,
        )
      : null;
  const isGood = !loading && totals.count > 0 && totals.profit > 0;

  /** 本月有效單量 → 決定目前分潤趴數（25% / 30%） */
  const monthTier = useMemo(() => {
    const { start, end } = monthBoundsIso();
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const monthOrders = (stats?.orders || []).filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= startMs && t <= endMs && isSettledOrderStatus(o.status);
    });
    const count = monthOrders.length;
    const effectiveRate = referralRateForMonthCount(partner, count);
    const threshold = REFERRAL_BONUS_ORDER_THRESHOLD;
    const remain = Math.max(0, threshold - count);
    return {
      count,
      threshold,
      remain,
      effectiveRate,
      baseRate: DEFAULT_REFERRAL_RATE,
      bonusRate: REFERRAL_BONUS_RATE,
      hit: count >= threshold,
    };
  }, [stats?.orders, partner]);

  const copyReferral = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      alert("已複製專屬推薦連結");
    } catch {
      prompt("請手動複製連結：", referralUrl);
    }
  };

  return (
    <PartnerAdminLayout
      title="儀表板"
      footerNotice={
        referralUrl
          ? `推薦連結：${referralUrl}`
          : storeUrl
            ? `賣場連結：${storeUrl} — 系統運作正常。`
            : undefined
      }
    >
      {referralUrl && (
        <div className="mx-5 mt-4 mb-2 space-y-3">
          <div className="rounded-xl border border-[#1a56db]/25 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-[#1a56db] uppercase tracking-wide mb-1">
                您的專屬推薦連結（貼社群會顯示行銷圖）
              </p>
              <p className="text-sm font-mono font-bold text-slate-800 break-all">
                {referralUrl}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                售價與官網相同 · Cookie 30 天內下單計入業績 · 分潤計算見下方說明
              </p>
            </div>
            <button
              type="button"
              onClick={copyReferral}
              className="shrink-0 h-10 px-4 rounded-full bg-[#1a56db] text-white text-sm font-bold hover:bg-[#1344b5]"
            >
              複製連結
            </button>
          </div>

          {/* 敏感：分潤怎麼算（僅夥伴後台） */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-[13px] text-slate-700 leading-relaxed">
            <p className="text-[12px] font-black text-slate-900 mb-2 tracking-wide">
              分潤說明
            </p>
            <div className="mb-3 rounded-lg border border-[#1a56db]/20 bg-white px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
                <p className="text-[12px] font-bold text-slate-800">
                  本月進度
                  <span className="ml-2 text-[#1a56db]">
                    {loading ? "…" : `${monthTier.count} / ${monthTier.threshold}`}
                  </span>
                  <span className="ml-1 font-medium text-slate-500">有效訂單</span>
                </p>
                <p className="text-[12px] font-black text-[#1a56db]">
                  本月分潤 {loading ? "…" : `${monthTier.effectiveRate}%`}
                </p>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1a56db] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (monthTier.count / monthTier.threshold) * 100,
                      ),
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {monthTier.hit
                  ? `已達標：本月有效單皆以成本 × ${monthTier.bonusRate}% 結算；次月重新計算。`
                  : `再 ${monthTier.remain} 筆達標，本月改為成本 × ${monthTier.bonusRate}%（達標後本月先前訂單一併調升）。`}
              </p>
            </div>
            <ul className="list-disc pl-5 space-y-1.5 mb-3">
              <li>
                分潤依
                <strong className="text-[#1a56db]">產品成本價</strong>
                計算：基本{" "}
                <strong className="text-[#1a56db]">
                  {monthTier.baseRate}%
                </strong>
                ；當月有效訂單達 {monthTier.threshold} 筆 →{" "}
                <strong className="text-[#1a56db]">
                  {monthTier.bonusRate}%
                </strong>
                ；次月重算，未達標回到基本。
              </li>
              <li>
                旅客付官網售價，您
                <strong>不用自己訂價</strong>。
              </li>
              <li>
                旅客點您的連結後
                <strong> 30 天內</strong>
                在官網下單，分潤都算您的。
              </li>
            </ul>
            <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-[12px]">
              <p className="font-bold text-slate-800 mb-1">舉例</p>
              <p>
                方案成本 NT$300 → 基本約拿{" "}
                <strong className="text-[#1a56db]">
                  NT${Math.round((300 * monthTier.baseRate) / 100)}
                </strong>
                ；達標月約拿{" "}
                <strong className="text-[#1a56db]">
                  NT${Math.round((300 * monthTier.bonusRate) / 100)}
                </strong>
              </p>
              <p className="text-slate-500 mt-1">
                實際金額以訂單結算為準，可在「訂單分潤」查看每筆明細。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 與下方區塊同寬：報表期間 + 橫幅 + 指標 + 訂單 */}
      <div className="px-5 pb-5">
        {/* ── レポート期間バー ── */}
        <ReportPeriodBar
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onRangeStartChange={setRangeStart}
          onRangeEndChange={setRangeEnd}
          onQuickRange={handleQuickRange}
        />

        {/* ── 良好バナー ── */}
        <DobermanStatusBanner
          loading={loading}
          title={isGood ? "良好" : totals.count > 0 ? "推廣進行中" : "準備就緒"}
          message={
            loading
              ? "正在讀取分潤數據..."
              : totals.count > 0
                ? `期間內 ${totals.count} 筆訂單・累計分潤 ${fmt(totals.profit)}・分潤率 ${totals.rate}%`
                : isReferral
                  ? "複製上方專屬推薦連結，分享給旅客即可開始累積分潤。"
                  : "您的專屬賣場已開通，前往選品管理加入 eSIM 方案後即可開始推廣。"
          }
        />

        {/* ── 2×2 メトリクスグリッド ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 border-x border-b border-slate-200">
          <div className="border-b lg:border-r border-slate-200">
            <DobermanPanel
              icon="payments"
              title="累計分潤（淨收益）"
              help={METRIC_HELP.totalProfit}
              rows={[{ label: "分潤合計", value: loading ? "..." : fmt(totals.profit) }]}
            />
          </div>
          <div className="border-b border-slate-200">
            <DobermanPanel
              icon="language"
              title={isReferral ? "推廣訂單金額" : "店鋪營收報表"}
              help={isReferral ? METRIC_HELP.referralVolume : METRIC_HELP.storeRevenue}
              rows={[
                {
                  label: isReferral ? "旅客付款合計" : "受取合計",
                  arrow: "up",
                  value: loading ? "..." : fmt(totals.revenue),
                },
                {
                  label: isReferral ? "方案成本合計" : "底價成本",
                  arrow: "down",
                  value: loading ? "..." : fmt(totals.cost),
                },
              ]}
            />
          </div>
          <div className="lg:border-r border-b lg:border-b-0 border-slate-200">
            <DobermanPanel
              icon="filter_alt"
              title="分潤率分析"
              help={METRIC_HELP.profitRate}
              rows={[
                { label: "分潤率", value: loading ? "..." : totals.rate, unit: "%" },
                { label: "有效訂單", value: loading ? "..." : totals.count, unit: "筆" },
              ]}
            />
          </div>
          <div>
            <div className="bg-white border-0 overflow-hidden h-full">
              <MetricPanelHeader
                icon="donut_large"
                title="商品分潤報表"
                help={METRIC_HELP.productShare}
              />
              <div className="px-4 py-3">
                <DashboardDonut
                  share={share}
                  totalProfit={totals.profit}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── トップランキング行 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-x border-b border-slate-200 mt-0">
          <div className="border-b md:border-b-0 md:border-r border-slate-200">
            <DobermanTopCard
              icon="filter_list"
              title="熱銷商品 Top"
              help={METRIC_HELP.topProduct}
              topLabel={topName}
              count={topCount}
              countUnit="張"
            />
          </div>
          <DobermanTopCard
            icon="category"
            title={isReferral ? "推廣方案種類" : "商品分類"}
            help={METRIC_HELP.productCategory}
            topLabel={share[0]?.[0] || "—"}
            count={share.length}
            countUnit="種"
          />
        </div>

        {/* ── 最近注文 + クイック操作 ── */}
        <div className="pt-4 space-y-4">
        {/* 商店模式才顯示選品／定價／商店設定；專屬連結只保留訂單 */}
        <div
          className={`grid gap-3 ${
            isReferral
              ? "grid-cols-1 sm:grid-cols-2 max-w-xl"
              : "grid-cols-2 md:grid-cols-4"
          }`}
        >
          {(isReferral
            ? [
                {
                  href: "/partner/orders",
                  icon: "receipt",
                  label: "訂單分潤",
                  sub: "查看每筆推薦分潤",
                },
                {
                  href: "#copy-referral",
                  icon: "content_copy",
                  label: "複製推薦連結",
                  sub: "分享官網同價連結",
                  onClick: copyReferral,
                },
              ]
            : [
                {
                  href: "/partner/catalog",
                  icon: "add_shopping_cart",
                  label: "選品上架",
                  sub: "從商品池加入方案",
                },
                {
                  href: "/partner/products",
                  icon: "price_change",
                  label: "定價管理",
                  sub: "設定各方案售價",
                },
                {
                  href: "/partner/orders",
                  icon: "receipt",
                  label: "訂單列表",
                  sub: "查看分潤明細",
                },
                {
                  href: "/partner/settings",
                  icon: "store",
                  label: "商店設定",
                  sub: "編輯品牌資訊",
                },
              ]
          ).map((item) =>
            item.onClick ? (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="bg-white border border-slate-200 rounded-sm p-4 flex flex-col items-center gap-2 hover:border-[#1a56db] hover:shadow-md transition group text-center"
              >
                <div className="w-11 h-11 rounded-full bg-[#1a3a6b] group-hover:bg-[#1a56db] text-white flex items-center justify-center transition">
                  <MaterialIcon name={item.icon} size={22} />
                </div>
                <p className="text-sm font-black text-slate-800">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.sub}</p>
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white border border-slate-200 rounded-sm p-4 flex flex-col items-center gap-2 hover:border-[#1a56db] hover:shadow-md transition group text-center"
              >
                <div className="w-11 h-11 rounded-full bg-[#1a3a6b] group-hover:bg-[#1a56db] text-white flex items-center justify-center transition">
                  <MaterialIcon name={item.icon} size={22} />
                </div>
                <p className="text-sm font-black text-slate-800">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.sub}</p>
              </Link>
            ),
          )}
        </div>

        {/* 最近注文テーブル */}
        <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-[#f8fafc]">
            <div className="flex items-center gap-2">
              <MaterialIcon name="history" size={20} className="text-[#1a56db]" />
              <h2 className="text-sm font-black text-slate-800">最近訂單</h2>
            </div>
            <Link
              href="/partner/orders"
              className="text-xs text-[#1a56db] font-bold hover:underline flex items-center gap-1"
            >
              查看全部
              <MaterialIcon name="chevron_right" size={16} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white text-slate-500 text-xs border-b border-slate-100">
                <tr>
                  <th className="px-5 py-2.5 text-left font-bold">訂單 / 日期</th>
                  <th className="px-5 py-2.5 text-left font-bold">買家</th>
                  <th className="px-5 py-2.5 text-left font-bold">付款方式</th>
                  <th className="px-5 py-2.5 text-left font-bold">金額</th>
                  <th className="px-5 py-2.5 text-left font-bold">分潤</th>
                  <th className="px-5 py-2.5 text-left font-bold">付款狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                      載入中...
                    </td>
                  </tr>
                ) : (stats?.orders || []).slice(0, 5).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                      {isReferral
                        ? "尚無推廣訂單，複製上方專屬連結開始賺取分潤"
                        : "尚無推廣訂單，分享賣場連結開始賺取分潤"}
                    </td>
                  </tr>
                ) : (
                  (stats?.orders || []).slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <p className="font-mono font-bold text-slate-700 text-xs">
                          {String(order.id).substring(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(order.created_at).toLocaleDateString("zh-TW")}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                          {buyerDisplayName(order)}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {order.customer_email || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600 font-medium">
                        {paymentMethodLabel(order)}
                      </td>
                      <td className="px-5 py-3 font-bold text-slate-800">
                        {fmt(order.total_amount)}
                      </td>
                      <td className="px-5 py-3 font-black text-[#1a56db]">
                        +{fmt(order.partner_profit)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-sm ${
                            order.status === "completed"
                              ? "bg-[#d1fae5] text-[#065f46]"
                              : order.status === "pending"
                                ? "bg-[#fef3c7] text-[#92400e]"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {order.status === "completed"
                            ? "已付款"
                            : order.status === "pending"
                              ? "待付款"
                              : order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 賣場連結 */}
        {storeUrl && (
          <div className="bg-white border border-slate-200 rounded-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <MaterialIcon name="link" size={22} className="text-[#1a56db] shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">專屬賣場連結</p>
                <p className="font-mono text-sm text-[#1a56db] font-bold truncate">{storeUrl}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(storeUrl);
                alert("連結已複製！");
              }}
              className="inline-flex items-center gap-2 bg-[#1a3a6b] text-white text-sm font-bold px-4 py-2 rounded-sm hover:bg-[#1a56db] transition shrink-0"
            >
              <MaterialIcon name="content_copy" size={16} />
              複製
            </button>
          </div>
        )}
      </div>
      </div>
    </PartnerAdminLayout>
  );
}
