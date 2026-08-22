import MaterialIcon from "@/components/MaterialIcon";
import { fmt } from "@/components/partner/DobermanWidgets";
import PartnerDialog from "@/components/partner/ui/PartnerDialog";
import PartnerButton from "@/components/partner/ui/PartnerButton";
import {
  paymentMethodLabel,
  buyerDisplayName,
  buyerEmail,
} from "@/lib/orderDisplay";
import { parseItemDetails } from "@/lib/partnerAnalytics";
import { buildOrderLinePricing } from "@/lib/adminOrderLinePricing";
import StatusIconBadge from "@/components/partner/StatusIconBadge";

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


function Field({ label, children }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}

/**
 * 訂單詳情彈窗（比照 Shopify 鉛筆編輯／檢視）
 * 顯示訂單資訊與客戶姓名、Email（僅檢視，不含敏感繳費代碼）
 */
export default function OrderDetailModal({ open, order, onClose, bossView = false }) {
  if (!open || !order) return null;

  const email = buyerEmail(order);
  const name = buyerDisplayName(order);
  const items = parseItemDetails(order);
  const linePricing = bossView ? buildOrderLinePricing(order) : null;
  const platformProfit =
    bossView &&
    (order.platform_profit != null
      ? Math.round(Number(order.platform_profit) || 0)
      : linePricing?.totals?.platformProfit);
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
    <PartnerDialog
      open={open && !!order}
      onClose={onClose}
      title={`#${code}`}
      description={formatDateTime(order.created_at)}
      icon="receipt_long"
      bodyClassName="space-y-4"
      footer={
        <PartnerButton type="button" variant="secondary" onClick={onClose}>
          關閉
        </PartnerButton>
      }
    >
      <div className="flex flex-wrap items-center gap-2 -mt-1 mb-1">
        <StatusIconBadge
          tone={tone}
          label={STATUS_LABEL[order.status] || order.status}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MaterialIcon name="person" size={18} className="text-slate-500" />
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                客戶資訊
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="客戶姓名">{name || "—"}</Field>
              <Field label="Email">
                {email ? (
                  <a
                    href={mailto}
                    className="break-all text-[#1E4AD1] hover:underline"
                  >
                    {email}
                  </a>
                ) : (
                  <span className="text-slate-400">無 Email</span>
                )}
              </Field>
            </div>
            {email ? (
              <PartnerButton asChild variant="secondary" size="sm">
                <a href={mailto}>
                  <MaterialIcon name="mail" size={16} />
                  {isPending ? "寄送付款提醒" : "寄信給客戶"}
                </a>
              </PartnerButton>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-600">
              金額與分潤
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="訂單金額">{fmt(order.total_amount)}</Field>
              <Field label="底價成本">{fmt(order.b2b_cost)}</Field>
              <Field label={bossView ? "夥伴分潤" : "您的分潤"}>
                <span className="font-black text-[#1E4AD1]">
                  +{fmt(order.partner_profit)}
                </span>
              </Field>
              <Field label="付款方式">
                {paymentMethodLabel(order) || "—"}
              </Field>
              {bossView && platformProfit != null ? (
                <Field label="平台利潤">
                  <span className="font-black text-emerald-700">
                    {fmt(platformProfit)}
                  </span>
                </Field>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-600">
              商品明細
            </p>
            {bossView && linePricing?.lines?.length ? (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs min-w-[520px]">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-2 pr-2 text-left font-bold">商品</th>
                      <th className="py-2 px-2 text-center font-bold">數量</th>
                      <th className="py-2 px-2 text-right font-bold">底價</th>
                      <th className="py-2 px-2 text-right font-bold">夥伴售價</th>
                      <th className="py-2 pl-2 text-right font-bold">分潤</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linePricing.lines.map((line, i) => (
                      <tr key={`${line.sku}-${i}`}>
                        <td className="py-2.5 pr-2">
                          <p className="font-bold text-slate-900">{line.name}</p>
                          {line.sku ? (
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {line.sku}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-2 text-center tabular-nums">
                          {line.qty}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-slate-500">
                          {fmt(line.b2bUnit)}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-bold">
                          {fmt(line.sellUnit)}
                        </td>
                        <td className="py-2.5 pl-2 text-right tabular-nums font-black text-[#1E4AD1]">
                          +{fmt(line.lineProfit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : items.length === 0 ? (
              <p className="text-xs text-slate-400">尚無商品明細</p>
            ) : (
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className={`flex items-start justify-between gap-3 py-2 text-sm ${
                      i ? "border-t border-slate-100" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">
                        {item.name || item.title || "方案"}
                      </p>
                      {(item.quantity || item.qty) ? (
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          數量 ×{item.quantity || item.qty}
                        </p>
                      ) : null}
                    </div>
                    {item.price != null || item.unit_price != null ? (
                      <span className="shrink-0 text-xs font-bold tabular-nums text-slate-600">
                        {fmt(item.price ?? item.unit_price)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-slate-400">
            僅顯示姓名與 Email，方便針對「尚未付款」禮貌提醒。請勿濫發或用於分潤以外用途；繳費代碼等敏感資料不會提供。
          </p>
    </PartnerDialog>
  );
}
