import MaterialIcon from "@/components/MaterialIcon";
import { SHOPIFY_UI, SHOPIFY_BADGE } from "@/lib/shopifyUi";
import { fmt } from "@/components/partner/DobermanWidgets";
import {
  paymentMethodLabel,
  buyerDisplayName,
  buyerEmail,
} from "@/lib/orderDisplay";
import { parseItemDetails } from "@/lib/partnerAnalytics";

const STATUS_LABEL = {
  completed: "已完成",
  pending: "尚未付款",
  cancelled: "已取消",
  failed: "付款失敗",
  refunded: "已退款",
  refund_pending: "退款審核中",
};

const STATUS_TONE = {
  completed: "success",
  pending: "warning",
  cancelled: "neutral",
  failed: "critical",
  refunded: "neutral",
  refund_pending: "warning",
};

function formatDateTime(d) {
  return new Date(d).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Badge({ tone = "neutral", children }) {
  const t = SHOPIFY_BADGE[tone] || SHOPIFY_BADGE.neutral;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold"
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

function Field({ label, children }) {
  return (
    <div>
      <p
        className="text-[10px] font-bold uppercase tracking-wide mb-1"
        style={{ color: SHOPIFY_UI.textTertiary }}
      >
        {label}
      </p>
      <div className="text-sm font-semibold" style={{ color: SHOPIFY_UI.textPrimary }}>
        {children}
      </div>
    </div>
  );
}

/**
 * 訂單詳情彈窗（比照 Shopify 鉛筆編輯／檢視）
 * 顯示訂單資訊與客戶姓名、Email（僅檢視，不含敏感繳費代碼）
 */
export default function OrderDetailModal({ open, order, onClose }) {
  if (!open || !order) return null;

  const email = buyerEmail(order);
  const name = buyerDisplayName(order);
  const items = parseItemDetails(order);
  const isPending = order.status === "pending";
  const code = String(order.id).substring(0, 8).toUpperCase();
  const tone = STATUS_TONE[order.status] || "neutral";

  const mailto =
    email
      ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
          isPending
            ? `【Jeko eSIM】訂單付款提醒 #${code}`
            : `【Jeko eSIM】關於您的訂單 #${code}`,
        )}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4">
      <div
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-lg max-h-[88vh] rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: SHOPIFY_UI.cardBg }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
      >
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${SHOPIFY_UI.cardBorder}` }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="order-detail-title"
                className="text-sm font-black font-mono"
                style={{ color: SHOPIFY_UI.textPrimary }}
              >
                #{code}
              </h2>
              <Badge tone={tone}>
                {STATUS_LABEL[order.status] || order.status}
              </Badge>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: SHOPIFY_UI.textTertiary }}>
              {formatDateTime(order.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-black/5 transition shrink-0"
            aria-label="關閉"
          >
            <MaterialIcon
              name="close"
              size={18}
              style={{ color: SHOPIFY_UI.textSecondary }}
            />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 客戶資訊 */}
          <div
            className="rounded-lg p-4 space-y-3"
            style={{
              backgroundColor: SHOPIFY_UI.canvasBg,
              border: `1px solid ${SHOPIFY_UI.cardBorder}`,
            }}
          >
            <div className="flex items-center gap-2">
              <MaterialIcon
                name="person"
                size={18}
                style={{ color: SHOPIFY_UI.textSecondary }}
              />
              <p
                className="text-xs font-black uppercase tracking-wide"
                style={{ color: SHOPIFY_UI.textSecondary }}
              >
                客戶資訊
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="客戶姓名">{name || "—"}</Field>
              <Field label="Email">
                {email ? (
                  <a
                    href={mailto}
                    className="break-all hover:underline"
                    style={{ color: SHOPIFY_UI.link }}
                  >
                    {email}
                  </a>
                ) : (
                  <span style={{ color: SHOPIFY_UI.textTertiary }}>無 Email</span>
                )}
              </Field>
            </div>
            {email ? (
              <a
                href={mailto}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-bold transition"
                style={{
                  backgroundColor: "#f1f1f1",
                  border: `1px solid ${SHOPIFY_UI.secondaryBorder}`,
                  color: SHOPIFY_UI.textPrimary,
                }}
              >
                <MaterialIcon name="mail" size={16} />
                {isPending ? "寄送付款提醒" : "寄信給客戶"}
              </a>
            ) : null}
          </div>

          {/* 訂單金額 */}
          <div
            className="rounded-lg p-4"
            style={{ border: `1px solid ${SHOPIFY_UI.cardBorder}` }}
          >
            <p
              className="text-xs font-black uppercase tracking-wide mb-3"
              style={{ color: SHOPIFY_UI.textSecondary }}
            >
              金額與分潤
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="訂單金額">{fmt(order.total_amount)}</Field>
              <Field label="底價成本">{fmt(order.b2b_cost)}</Field>
              <Field label="您的分潤">
                <span style={{ color: SHOPIFY_UI.link }} className="font-black">
                  +{fmt(order.partner_profit)}
                </span>
              </Field>
              <Field label="付款方式">
                {paymentMethodLabel(order) || "—"}
              </Field>
            </div>
          </div>

          {/* 商品明細 */}
          <div
            className="rounded-lg p-4"
            style={{ border: `1px solid ${SHOPIFY_UI.cardBorder}` }}
          >
            <p
              className="text-xs font-black uppercase tracking-wide mb-3"
              style={{ color: SHOPIFY_UI.textSecondary }}
            >
              商品明細
            </p>
            {items.length === 0 ? (
              <p className="text-xs" style={{ color: SHOPIFY_UI.textTertiary }}>
                尚無商品明細
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 text-sm py-2"
                    style={{
                      borderTop: i ? `1px solid ${SHOPIFY_UI.divider}` : "none",
                    }}
                  >
                    <div className="min-w-0">
                      <p className="font-bold" style={{ color: SHOPIFY_UI.textPrimary }}>
                        {item.name || item.title || "方案"}
                      </p>
                      {(item.quantity || item.qty) ? (
                        <p
                          className="text-[11px] mt-0.5"
                          style={{ color: SHOPIFY_UI.textTertiary }}
                        >
                          數量 ×{item.quantity || item.qty}
                        </p>
                      ) : null}
                    </div>
                    {item.price != null || item.unit_price != null ? (
                      <span
                        className="text-xs font-bold tabular-nums shrink-0"
                        style={{ color: SHOPIFY_UI.textSecondary }}
                      >
                        {fmt(item.price ?? item.unit_price)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-[11px] leading-relaxed" style={{ color: SHOPIFY_UI.textTertiary }}>
            僅顯示姓名與 Email，方便針對「尚未付款」禮貌提醒。請勿濫發或用於分潤以外用途；繳費代碼等敏感資料不會提供。
          </p>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-4 py-3 shrink-0"
          style={{ borderTop: `1px solid ${SHOPIFY_UI.cardBorder}` }}
        >
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md text-xs font-bold transition"
            style={{
              border: `1px solid ${SHOPIFY_UI.secondaryBorder}`,
              color: SHOPIFY_UI.textPrimary,
              backgroundColor: "#f1f1f1",
            }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
