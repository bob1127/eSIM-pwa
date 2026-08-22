import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import {
  fmt,
  prevMonthRange,
  thisMonthRange,
} from "@/components/partner/DobermanWidgets";
import MaterialIcon from "@/components/MaterialIcon";
import {
  usePartnerSession,
  fetchPartnerStats,
  SITE_URL,
} from "@/lib/partnerAuth";
import { buildReferralShareUrl } from "@/lib/partnerReferral";
import { displayReferralCouponCode } from "@/lib/partnerReferralDiscount";
import { isSettledOrderStatus } from "@/lib/refundPolicy";
import { paymentMethodLabel, buyerDisplayName } from "@/lib/orderDisplay";
import { SHOPIFY_BADGE } from "@/lib/shopifyUi";
import StatusIconBadge from "@/components/partner/StatusIconBadge";
import {
  filterByRange,
  sumTotals,
  productBreakdown,
  previousPeriodTotals,
  growthPercent,
} from "@/lib/partnerAnalytics";
import { PARTNER_UI } from "@/lib/partnerUi";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import OrderDetailModal from "@/components/partner/OrderDetailModal";
import {
  isStorePublicLive,
  isStoreSetupPending,
} from "@/lib/partnerStoreLifecycle";

/** 儀表板：小圓角 + 深灰／淺灰／白；狀態／成長徽章維持特殊色 */
const UI = {
  dark: "#2d2d2d",
  mid: "#5c5c5c",
  soft: "#8a8a8a",
  border: "#e5e5e5",
  light: "#f0f0f0",
  wash: "#f6f6f6",
  white: "#ffffff",
  radius: "0.5rem",
  radiusSm: "0.375rem",
};

const DashboardDonut = dynamic(
  () => import("@/components/partner/PartnerDashboardDonut"),
  {
    ssr: false,
    loading: () => (
      <div className="h-36 flex items-center justify-center">
        <LoadingIndicator layout="center" label="載入圖表..." size="sm" />
      </div>
    ),
  },
);

const STATUS_BADGE = {
  completed: "success",
  pending: "warning",
  cancelled: "neutral",
  failed: "critical",
  refunded: "neutral",
  refund_pending: "warning",
};
const STATUS_LABEL = {
  completed: "已付款",
  pending: "待付款",
  cancelled: "已取消",
  failed: "付款失敗",
  refunded: "已退款",
  refund_pending: "退款審核中",
};

function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: UI.white,
        border: `1px solid ${UI.border}`,
        borderRadius: UI.radius,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, growth, growthGood, loading, sub, icon, iconBg }) {
  const hasGrowth = growth != null && !loading;
  const positive = growthGood ?? growth >= 0;
  return (
    <Card className="flex-1 min-w-[150px] px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: UI.soft }}
        >
          {label}
        </p>
        {icon ? (
          <div
            className="w-8 h-8 flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg, borderRadius: UI.radiusSm }}
          >
            <MaterialIcon name={icon} size={16} className="text-white" />
          </div>
        ) : null}
      </div>
      <p
        className="text-xl sm:text-2xl font-black mt-2 tabular-nums"
        style={{ color: UI.dark }}
      >
        {loading ? "…" : value}
      </p>
      {hasGrowth ? (
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="text-[11px] font-bold inline-flex items-center gap-0.5"
            style={{
              color: positive
                ? SHOPIFY_BADGE.success.dot
                : SHOPIFY_BADGE.critical.dot,
            }}
          >
            <MaterialIcon
              name={positive ? "arrow_upward" : "arrow_downward"}
              size={12}
            />
            {Math.abs(growth)}%
          </span>
          <span className="text-[10px]" style={{ color: UI.soft }}>
            較上期
          </span>
        </div>
      ) : sub ? (
        <p className="text-[10px] mt-1" style={{ color: UI.soft }}>
          {sub}
        </p>
      ) : null}
    </Card>
  );
}

function ActionCard({ icon, iconBg, title, desc, ctaLabel, onClick, href }) {
  const Cta = href ? Link : "button";
  return (
    <Card className="flex items-center gap-3 px-4 py-3.5">
      <div
        className="w-10 h-10 flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg, borderRadius: UI.radiusSm }}
      >
        <MaterialIcon name={icon} size={20} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold" style={{ color: UI.dark }}>
          {title}
        </p>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: UI.soft }}>
          {desc}
        </p>
      </div>
      <Cta
        {...(href ? { href } : { type: "button", onClick })}
        className="shrink-0 h-8 px-3.5 text-xs font-bold text-white transition"
        style={{
          backgroundColor: UI.dark,
          borderRadius: UI.radiusSm,
        }}
      >
        {ctaLabel}
      </Cta>
    </Card>
  );
}

export default function PartnerDashboard() {
  const { partner, store } = usePartnerSession();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState(null);
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
  const validAll = useMemo(
    () => (stats?.orders || []).filter((o) => isSettledOrderStatus(o.status)),
    [stats?.orders],
  );

  const totals = useMemo(() => sumTotals(valid), [valid]);
  const prevTotals = useMemo(
    () => previousPeriodTotals(validAll, rangeStart, rangeEnd),
    [validAll, rangeStart, rangeEnd],
  );

  const growth = useMemo(
    () => ({
      profit: growthPercent(totals.profit, prevTotals.profit),
      revenue: growthPercent(totals.revenue, prevTotals.revenue),
      count: growthPercent(totals.count, prevTotals.count),
      rate: totals.rate - prevTotals.rate,
    }),
    [totals, prevTotals],
  );

  const share = useMemo(
    () => productBreakdown(valid).map((p) => [p.name, p.profit]),
    [valid],
  );

  const storeUrl = isStorePublicLive(store)
    ? `${SITE_URL}/p/${store.domain}`
    : null;
  const isReferral = partner?.cooperation_model === "referral";
  const referralUrl =
    isReferral && (partner.referral_code || partner.slug)
      ? buildReferralShareUrl(SITE_URL, partner.referral_code || partner.slug)
      : null;
  const referralDiscountOn =
    isReferral && partner?.referral_discount_enabled !== false;
  const referralCouponCode = referralDiscountOn
    ? displayReferralCouponCode(partner.referral_code || partner.slug)
    : "";
  const isGood = !loading && totals.count > 0 && totals.profit > 0;

  const copyReferral = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      alert(
        referralDiscountOn ? "已複製專屬折扣碼連結" : "已複製專屬推薦連結",
      );
    } catch {
      prompt("請手動複製連結：", referralUrl);
    }
  };

  const copyStoreUrl = async () => {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(storeUrl);
      alert("連結已複製！");
    } catch {
      prompt("請手動複製連結：", storeUrl);
    }
  };

  const dateInputStyle = {
    border: `1px solid ${UI.border}`,
    color: UI.dark,
    backgroundColor: UI.white,
    borderRadius: UI.radiusSm,
  };

  return (
    <PartnerAdminLayout
      title="儀表板"
      footerNotice={
        referralUrl
          ? `推薦連結：${referralUrl}`
          : storeUrl
            ? `賣場連結：${storeUrl} — 系統運作正常。`
            : store?.status === "deleted"
              ? "賣場已關閉 — 請至商店設定重新開啟。"
              : isStoreSetupPending(store)
                ? "商店建立中 — 完成智慧開店後才會上線。"
                : undefined
      }
    >
      <div
        className={`${PARTNER_UI.pageFlush} flex flex-col flex-1 min-h-0`}
        style={{ backgroundColor: UI.wash }}
      >
        <div className="px-4 sm:px-6 pt-5 pb-24 md:pb-6 space-y-5">
          {/* 頁首 + 期間切換 */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1
                className="text-xl font-black tracking-tight"
                style={{ color: UI.dark }}
              >
                儀表板
              </h1>
              <p
                className="text-xs sm:text-sm mt-1"
                style={{ color: UI.mid }}
              >
                {loading
                  ? "正在讀取分潤數據…"
                  : totals.count > 0
                    ? `期間內 ${totals.count} 筆訂單・累計分潤 ${fmt(totals.profit)}${isGood ? "・表現良好" : ""}`
                    : isReferral
                      ? "尚無訂單，複製下方專屬連結開始賺取分潤。"
                      : "您的專屬賣場已開通，前往選品管理加入方案即可開始推廣。"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="h-9 text-xs px-2.5 outline-none"
                  style={dateInputStyle}
                />
                <span style={{ color: UI.soft }}>→</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="h-9 text-xs px-2.5 outline-none"
                  style={dateInputStyle}
                />
              </div>
              <div
                className="inline-flex items-center p-0.5"
                style={{
                  backgroundColor: UI.light,
                  borderRadius: UI.radius,
                }}
              >
                {[
                  { id: "prevMonth", label: "前月" },
                  { id: "thisMonth", label: "當月" },
                ].map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleQuickRange(q.id)}
                    className="px-2.5 py-1.5 text-xs font-bold transition"
                    style={{
                      color: UI.mid,
                      borderRadius: UI.radiusSm,
                    }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 專屬連結／折扣碼橫幅 */}
          {referralUrl && (
            <Card className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className="text-[11px] font-bold uppercase tracking-wide mb-1"
                  style={{ color: UI.mid }}
                >
                  {referralDiscountOn
                    ? "您的專屬折扣碼連結（貼社群會顯示行銷圖）"
                    : "您的專屬推薦連結（貼社群會顯示行銷圖）"}
                </p>
                <p
                  className="text-sm font-mono font-bold break-all"
                  style={{ color: UI.dark }}
                >
                  {referralUrl}
                </p>
                {referralDiscountOn && referralCouponCode ? (
                  <p
                    className="text-[11px] mt-1.5"
                    style={{ color: UI.mid }}
                  >
                    折扣碼{" "}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(referralCouponCode);
                        alert(`已複製折扣碼 ${referralCouponCode}`);
                      }}
                      className="font-mono font-black underline-offset-2 hover:underline"
                      style={{ color: UI.dark }}
                    >
                      {referralCouponCode}
                    </button>
                    <span style={{ color: UI.soft }}>
                      {" "}
                      · 折扣％依商品電信商而定 · 點連結自動帶碼 · Cookie 30
                      天內下單計入業績
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] mt-1" style={{ color: UI.soft }}>
                    售價與官網相同 · Cookie 30 天內下單計入業績 ·
                    分潤見「分潤分析」
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={copyReferral}
                className="shrink-0 h-9 px-4 text-white text-sm font-bold transition"
                style={{
                  backgroundColor: UI.dark,
                  borderRadius: UI.radiusSm,
                }}
              >
                複製連結
              </button>
            </Card>
          )}

          {/* 統計卡片列 */}
          <div className="flex flex-wrap gap-3">
            <StatCard
              label="累計分潤"
              value={fmt(totals.profit)}
              growth={loading ? null : growth.profit}
              loading={loading}
              icon="payments"
              iconBg="#008060"
            />
            <StatCard
              label={isReferral ? "推廣訂單金額" : "店鋪營收"}
              value={fmt(totals.revenue)}
              growth={loading ? null : growth.revenue}
              loading={loading}
              icon="storefront"
              iconBg="#2c6ecb"
            />
            <StatCard
              label="有效訂單"
              value={totals.count}
              growth={loading ? null : growth.count}
              loading={loading}
              icon="receipt_long"
              iconBg="#eec200"
            />
            <StatCard
              label="分潤占營收"
              value={`${totals.rate}%`}
              growth={loading ? null : growth.rate}
              growthGood={growth.rate >= 0}
              loading={loading}
              sub={
                loading
                  ? undefined
                  : `較上期 ${growth.rate >= 0 ? "+" : ""}${growth.rate} 百分點`
              }
              icon="percent"
              iconBg="#8a8a8a"
            />
          </div>

          {/* 商品分潤占比 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MaterialIcon
                name="donut_large"
                size={18}
                style={{ color: UI.mid }}
              />
              <h2 className="text-sm font-black" style={{ color: UI.dark }}>
                商品分潤占比
              </h2>
            </div>
            <DashboardDonut
              share={share}
              totalProfit={totals.profit}
              loading={loading}
            />
          </Card>

          {/* 最近訂單 */}
          <Card className="overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: `1px solid ${UI.border}` }}
            >
              <h2 className="text-sm font-black" style={{ color: UI.dark }}>
                最近訂單
              </h2>
              <Link
                href="/partner/orders"
                className="text-xs font-bold hover:underline flex items-center gap-1"
                style={{ color: UI.dark }}
              >
                查看全部
                <MaterialIcon name="chevron_right" size={14} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr
                    className="text-[10px] uppercase tracking-wider"
                    style={{ backgroundColor: UI.light, color: UI.soft }}
                  >
                    <th className="px-4 py-2.5 text-left font-bold">
                      訂單 / 日期
                    </th>
                    <th className="px-4 py-2.5 text-left font-bold">買家</th>
                    <th className="px-4 py-2.5 text-left font-bold">付款方式</th>
                    <th className="px-4 py-2.5 text-right font-bold">金額</th>
                    <th className="px-4 py-2.5 text-right font-bold">分潤</th>
                    <th className="px-4 py-2.5 text-left font-bold">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <LoadingIndicator layout="center" label="載入中..." size="sm" />
                      </td>
                    </tr>
                  ) : (stats?.orders || []).slice(0, 5).length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-10 text-sm"
                        style={{ color: UI.soft }}
                      >
                        {isReferral
                          ? "尚無推廣訂單，複製上方專屬連結開始賺取分潤"
                          : "尚無推廣訂單，分享賣場連結開始賺取分潤"}
                      </td>
                    </tr>
                  ) : (
                    (stats?.orders || []).slice(0, 5).map((order) => (
                      <tr
                        key={order.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetailOrder(order)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setDetailOrder(order);
                          }
                        }}
                        className="cursor-pointer transition-colors hover:bg-[#fafafa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2c6ecb]"
                        style={{ borderTop: `1px solid ${UI.border}` }}
                        aria-label={`查看訂單 ${String(order.id).substring(0, 8).toUpperCase()} 詳情`}
                      >
                        <td className="px-4 py-3">
                          <p
                            className="font-mono font-bold text-xs"
                            style={{ color: UI.dark }}
                          >
                            {String(order.id).substring(0, 8).toUpperCase()}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: UI.soft }}
                          >
                            {new Date(order.created_at).toLocaleDateString(
                              "zh-TW",
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p
                            className="text-xs font-bold truncate max-w-[140px]"
                            style={{ color: UI.dark }}
                          >
                            {buyerDisplayName(order)}
                          </p>
                          <p
                            className="text-[11px] truncate max-w-[140px]"
                            style={{ color: UI.soft }}
                          >
                            {order.customer_email || "—"}
                          </p>
                        </td>
                        <td
                          className="px-4 py-3 text-xs font-medium"
                          style={{ color: UI.mid }}
                        >
                          {paymentMethodLabel(order)}
                        </td>
                        <td
                          className="px-4 py-3 text-right font-bold"
                          style={{ color: UI.dark }}
                        >
                          {fmt(order.total_amount)}
                        </td>
                        <td
                          className="px-4 py-3 text-right font-black"
                          style={{ color: UI.dark }}
                        >
                          +{fmt(order.partner_profit)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusIconBadge
                            tone={STATUS_BADGE[order.status] || "neutral"}
                            label={STATUS_LABEL[order.status] || order.status}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 推廣提升 */}
          <div>
            <h2
              className="text-sm font-black mb-2"
              style={{ color: UI.dark }}
            >
              推廣提升
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isReferral ? (
                <>
                  <ActionCard
                    icon="content_copy"
                    iconBg="#2c6ecb"
                    title="分享您的專屬連結"
                    desc="複製連結分享給旅客，下單即計入您的分潤"
                    ctaLabel="複製連結"
                    onClick={copyReferral}
                  />
                  <ActionCard
                    icon="insights"
                    iconBg="#008060"
                    title="查看分潤分析"
                    desc="掌握商品分潤排行與近期趨勢"
                    ctaLabel="前往查看"
                    href="/partner/analytics"
                  />
                </>
              ) : (
                <>
                  <ActionCard
                    icon="add_shopping_cart"
                    iconBg="#2c6ecb"
                    title="選品上架"
                    desc="從商品池加入方案，豐富您的賣場"
                    ctaLabel="前往選品"
                    href="/partner/catalog"
                  />
                  {storeUrl ? (
                    <ActionCard
                      icon="link"
                      iconBg="#008060"
                      title="分享您的專屬賣場"
                      desc={storeUrl}
                      ctaLabel="複製連結"
                      onClick={copyStoreUrl}
                    />
                  ) : isStoreSetupPending(store) ? (
                    <ActionCard
                      icon="store"
                      iconBg="#1E4AD1"
                      title="商店建立中"
                      desc="完成智慧選品後才會正式上線"
                      ctaLabel="繼續建立"
                      href="/partner/settings"
                    />
                  ) : store?.status === "deleted" ? (
                    <ActionCard
                      icon="store"
                      iconBg="#b45309"
                      title="賣場已關閉"
                      desc="前台已下線，可至商店設定重新開啟"
                      ctaLabel="商店設定"
                      href="/partner/settings"
                    />
                  ) : (
                    <ActionCard
                      icon="link"
                      iconBg="#008060"
                      title="分享您的專屬賣場"
                      desc="尚未設定賣場網址"
                      ctaLabel="複製連結"
                      onClick={copyStoreUrl}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <OrderDetailModal
        open={!!detailOrder}
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
      />
    </PartnerAdminLayout>
  );
}
