"use client";

import Link from "next/link";
import MaterialIcon from "@/components/MaterialIcon";
import { ACCOUNT_UI } from "@/lib/accountUi";
import {
  getRefundUiState,
  refundReasonLabel,
  orderItemSummary,
} from "@/lib/refundPolicy";

function formatWhen(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderRefundDetailModal({ order, onClose, onReapply }) {
  const { latest, badge, eligibility, canReapply } = getRefundUiState(order);
  const orderStatus = String(order?.status || "").toLowerCase();

  let title = "退款申請紀錄";
  let tone = "slate";
  if (orderStatus === "refunded" || latest?.status === "approved") {
    title = "退款已完成";
    tone = "emerald";
  } else if (latest?.status === "rejected") {
    title = "退款未通過";
    tone = "red";
  } else if (orderStatus === "refund_pending" || latest?.status === "pending") {
    title = "退款審核中";
    tone = "amber";
  }

  const toneBox = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-900",
    red: "bg-red-50 border-red-100 text-red-900",
    amber: "bg-amber-50 border-amber-100 text-amber-900",
    slate: "bg-slate-50 border-slate-100 text-slate-800",
  }[tone];

  return (
    <div className={ACCOUNT_UI.modalOverlay}>
      <div className="bg-white rounded-sm shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-black text-[#1e3a5f]">
              訂單 #{order.id} · {title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {orderItemSummary(order)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-slate-400 px-2"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          {badge && (
            <span
              className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${badge.color}`}
            >
              {badge.label}
            </span>
          )}

          {!latest ? (
            <p className="text-sm text-slate-500">尚無退款申請紀錄。</p>
          ) : (
            <div
              className={`rounded-sm border p-4 space-y-3 text-sm ${toneBox}`}
            >
              <div className="flex items-start gap-2">
                <MaterialIcon
                  name={
                    tone === "emerald"
                      ? "check_circle"
                      : tone === "red"
                        ? "cancel"
                        : "hourglass_top"
                  }
                  size={22}
                  className="shrink-0 mt-0.5"
                />
                <div className="min-w-0">
                  <p className="font-bold">{title}</p>
                  {latest.status === "pending" && (
                    <p className="text-xs mt-1 opacity-90 leading-relaxed">
                      我們已收到您的申請，約 1～3 個工作天內以 Email
                      回覆。審核通過後約 7～14 個工作天退至原付款方式。
                    </p>
                  )}
                  {latest.status === "approved" && (
                    <p className="text-xs mt-1 opacity-90">
                      退款已核准，款項將依原付款方式退回。
                    </p>
                  )}
                  {latest.status === "rejected" && (
                    <p className="text-xs mt-1 opacity-90">
                      本次申請未通過審核。若仍有疑問可聯絡客服，或在符合條件時再次申請。
                    </p>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-2 text-xs border-t border-black/5 pt-3">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">申請類型</dt>
                  <dd className="font-medium text-right">
                    {latest.request_type === "full_refund"
                      ? "未開通全額退款"
                      : "售後爭議"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">原因</dt>
                  <dd className="font-medium text-right">
                    {refundReasonLabel(latest.reason_type, latest.request_type)}
                  </dd>
                </div>
                {latest.reason_note && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">說明</dt>
                    <dd className="font-medium whitespace-pre-wrap">
                      {latest.reason_note}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">申請時間</dt>
                  <dd className="font-medium">
                    {formatWhen(latest.created_at)}
                  </dd>
                </div>
                {latest.reviewed_at && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500 shrink-0">審核時間</dt>
                    <dd className="font-medium">
                      {formatWhen(latest.reviewed_at)}
                    </dd>
                  </div>
                )}
              </dl>

              {latest.admin_note && (
                <div className="bg-white/70 rounded-sm p-3 border border-black/5">
                  <p className="text-[11px] font-bold text-slate-500 mb-1">
                    客服回覆
                  </p>
                  <p className="text-sm leading-relaxed">{latest.admin_note}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {canReapply && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReapply?.(order);
                }}
                className="flex-1 py-2.5 bg-[#2b579a] text-white text-sm font-bold rounded-sm hover:bg-[#1e4578]"
              >
                再次申請退款
              </button>
            )}
            <Link
              href="/contact?tab=refund"
              className="flex-1 py-2.5 border border-slate-200 text-center text-sm font-bold text-slate-600 rounded-sm hover:bg-slate-50"
            >
              聯絡客服
            </Link>
          </div>

          <Link
            href="/refund-policy"
            className="block text-center text-xs font-bold text-[#2563eb] hover:underline"
          >
            查看退換貨政策
          </Link>
        </div>
      </div>
    </div>
  );
}
