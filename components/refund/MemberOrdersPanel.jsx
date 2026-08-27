"use client";

import { useState } from "react";
import Link from "next/link";
import RefundRequestModal from "./RefundRequestModal";
import RefundBlockedModal, {
  refundBlockedFromApi,
} from "./RefundBlockedModal";
import {
  getRefundEligibility,
  refundStatusLabel,
  orderItemSummary,
} from "@/lib/refundPolicy";
import {
  runRefundPrecheck,
  enrichOrderFromPrecheck,
} from "@/lib/refundPrecheckClient";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

function getEsimQRCodes(order) {
  if (!order?.qrcode_data) return [];
  let data = order.qrcode_data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  if (data && typeof data === "object" && !Array.isArray(data)) data = [data];
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const cleanSrc = String(item.qrcodeUrl || item.src || "")
        .split(",")[0]
        .trim();
      return {
        name: item.productName || item.name || "eSIM 方案",
        src: cleanSrc,
        topupId: item.topupId || item.topup_id || "—",
      };
    })
    .filter((item) => item.src);
}

function orderStatusBadge(status) {
  const s = String(status || "").toLowerCase();
  const map = {
    completed: {
      label: "已發貨",
      cls: "bg-[#E8EEFC] text-[#1E4AD1] border-[#C5D2F7]",
    },
    pending: {
      label: "尚未付款",
      cls: "bg-[#FFF6C8] text-[#1E4AD1] border-[#FADE2B]",
    },
    cancelled: {
      label: "已取消",
      cls: "bg-[#F1F3F7] text-[#5B6570] border-[#E3E7EE]",
    },
    failed: {
      label: "付款失敗",
      cls: "bg-[#FFF0D6] text-[#1E4AD1] border-[#F2CC40]",
    },
    refund_pending: {
      label: "退款審核中",
      cls: "bg-[#FFF6C8] text-[#1E4AD1] border-[#FADE2B]",
    },
    refunded: {
      label: "已退款",
      cls: "bg-[#F1F3F7] text-[#5B6570] border-[#E3E7EE]",
    },
  };
  return (
    map[s] || {
      label: status,
      cls: "bg-[#F1F3F7] text-[#5B6570] border-[#E3E7EE]",
    }
  );
}

function formatNTD(val) {
  if (val == null) return "0";
  return Math.round(Number(val)).toLocaleString("zh-TW");
}

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OrderCard({ order, onRefresh, getAuthHeaders }) {
  const [expanded, setExpanded] = useState(false);
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundPrecheck, setRefundPrecheck] = useState(null);
  const [refundBlocked, setRefundBlocked] = useState(null);
  const [refundChecking, setRefundChecking] = useState(false);
  const qrs = getEsimQRCodes(order);
  const eligibility = getRefundEligibility(order);
  const refundBadge = refundStatusLabel(order);
  const status = orderStatusBadge(order.status);
  const latest = order.refund_requests?.[0];

  const beginRefund = async () => {
    if (refundChecking) return;
    setRefundChecking(true);
    try {
      const data = await runRefundPrecheck(order, getAuthHeaders);
      if (!data.ok) {
        setRefundBlocked(refundBlockedFromApi(data));
        return;
      }
      setRefundPrecheck(data);
      setRefundOrder(enrichOrderFromPrecheck(order, data));
    } catch (e) {
      setRefundBlocked({
        title: "無法檢查退款資格",
        message: e.message || "請稍後再試",
      });
    } finally {
      setRefundChecking(false);
    }
  };

  const handleRefundSuccess = () => {
    onRefresh?.();
  };

  const showRefundBtn =
    eligibility.canApply || eligibility.code === "NATIVE_ESIM";

  return (
    <>
      <div className="bg-white border border-[#e1e3e5] rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-400">#{order.id}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${status.cls}`}>
                {status.label}
              </span>
              {refundBadge && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${refundBadge.color}`}>
                  {refundBadge.label}
                </span>
              )}
            </div>
            <h3 className="font-black text-slate-800 truncate">{orderItemSummary(order)}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{formatDate(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <p className="text-lg font-black text-slate-900">
              NT$ {formatNTD(order.total_amount)}
            </p>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-sm font-bold text-sky-600 hover:text-sky-700 px-3 py-2 rounded-xl border border-sky-100 hover:bg-sky-50"
            >
              {expanded ? "收合" : "詳情"}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50/50">
            {qrs.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {qrs.map((qr) => (
                  <div
                    key={qr.src}
                    className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col items-center"
                  >
                    <p className="text-sm font-bold text-slate-700 mb-2 text-center">{qr.name}</p>
                    <img
                      src={qr.src}
                      alt="eSIM QR Code"
                      className="w-36 h-36 object-contain border border-slate-100 rounded-lg bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-2 font-mono">單號：{qr.topupId}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {order.status === "completed"
                  ? "QR Code 處理中，請稍後刷新或查收 Email。"
                  : "付款完成後將顯示 QR Code。"}
              </p>
            )}

            {latest?.status === "rejected" && latest.admin_note && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
                <p className="font-bold mb-1">退款未通過</p>
                <p>{latest.admin_note}</p>
              </div>
            )}

            {latest?.status === "pending" && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                退款申請審核中，約 1～3 個工作天回覆。詳見{" "}
                <Link href="/refund-policy" className="font-bold underline">
                  退換貨政策
                </Link>
                。
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {showRefundBtn && (
                <button
                  type="button"
                  onClick={beginRefund}
                  disabled={refundChecking}
                  className="px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50"
                >
                  {refundChecking
                    ? "檢查中…"
                    : eligibility.code === "NATIVE_ESIM"
                      ? "申請退款"
                      : eligibility.label}
                </button>
              )}
              {!eligibility.canApply && eligibility.code === "EXPIRED" && (
                <p className="text-xs text-slate-400 self-center">
                  已超過申請期限。如需協助請{" "}
                  <Link href="/contact" className="text-sky-600 font-bold hover:underline">
                    聯絡客服
                  </Link>
                  。
                </p>
              )}
              <Link
                href="/refund-policy"
                className="px-4 py-2.5 border border-slate-200 text-sm font-bold text-slate-600 rounded-xl hover:bg-white"
              >
                退換貨政策
              </Link>
            </div>
          </div>
        )}
      </div>

      {refundBlocked && (
        <RefundBlockedModal
          title={refundBlocked.title}
          message={refundBlocked.message}
          footnote={refundBlocked.footnote}
          showLineCta={refundBlocked.showLineCta}
          lineUrl={refundBlocked.lineUrl}
          onClose={() => setRefundBlocked(null)}
        />
      )}
      {refundOrder && (
        <RefundRequestModal
          order={refundOrder}
          precheck={refundPrecheck}
          onClose={() => {
            setRefundOrder(null);
            setRefundPrecheck(null);
          }}
          onSuccess={handleRefundSuccess}
          onBlocked={(payload) => {
            setRefundOrder(null);
            setRefundPrecheck(null);
            setRefundBlocked(payload);
          }}
          getAuthHeaders={getAuthHeaders}
        />
      )}
    </>
  );
}

export default function MemberOrdersPanel({
  orders,
  loading,
  onRefresh,
  getAuthHeaders,
}) {
  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <LoadingIndicator
          layout="center"
          label="載入訂單中…"
          labelClassName="text-slate-400 font-medium"
        />
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-10 text-center">
        <p className="text-slate-500 font-medium mb-2">尚無訂單紀錄</p>
        <Link
          href="/"
          className="inline-block mt-2 text-sky-600 font-bold hover:underline"
        >
          前往選購 eSIM →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 leading-relaxed">
        非原生／漫遊：未安裝或已安裝未激活可全額退款；已激活不予退款。原生
        eSIM：售出後概不退款或換貨。詳見{" "}
        <Link href="/refund-policy" className="text-sky-600 font-bold hover:underline">
          退換貨政策
        </Link>
        。
      </p>
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onRefresh={onRefresh}
          getAuthHeaders={getAuthHeaders}
        />
      ))}
    </div>
  );
}
