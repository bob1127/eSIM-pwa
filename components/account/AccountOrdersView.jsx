"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import MaterialIcon from "@/components/MaterialIcon";
import RefundRequestModal from "@/components/refund/RefundRequestModal";
import OrderRefundDetailModal from "@/components/refund/OrderRefundDetailModal";
import { ACCOUNT_UI } from "@/lib/accountUi";
import {
  getRefundEligibility,
  getRefundUiState,
  refundColumnLabel,
  orderItemSummary,
} from "@/lib/refundPolicy";
import { AccountPageWrap } from "./AccountShell";

const PAGE_SIZE = 10;

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
      const cleanSrc = String(item.qrcodeUrl || item.src || "").split(",")[0].trim();
      return {
        name: item.productName || item.name || "eSIM 方案",
        src: cleanSrc,
        topupId: item.topupId || item.topup_id || "—",
      };
    })
    .filter((item) => item.src);
}

function getEsimIccids(order) {
  if (!order?.qrcode_data) return [];
  let data = order.qrcode_data;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { return []; }
  }
  if (data && typeof data === "object" && !Array.isArray(data)) data = [data];
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => ({
      name: item.productName || item.name || "eSIM 方案",
      iccid: item.iccid || item.ICCID || null,
      topupId: item.topupId || item.topup_id || null,
    }))
    .filter((item) => item.iccid || item.topupId);
}

function statusMeta(status) {
  const s = String(status || "").toLowerCase();
  const map = {
    completed: {
      label: "已發貨",
      pill: "bg-teal-50 text-teal-700 border-teal-200",
      icon: "check_circle",
      iconColor: "text-teal-500",
      flag: false,
    },
    pending: {
      label: "待付款",
      pill: "bg-slate-100 text-slate-600 border-slate-200",
      icon: "schedule",
      iconColor: "text-slate-400",
      flag: true,
    },
    refund_pending: {
      label: "退款審核",
      pill: "bg-red-50 text-red-700 border-red-200",
      icon: "error",
      iconColor: "text-red-500",
      flag: true,
    },
    refunded: {
      label: "已退款",
      pill: "bg-slate-100 text-slate-500 border-slate-200",
      icon: "undo",
      iconColor: "text-slate-400",
      flag: false,
    },
    cancelled: {
      label: "已取消",
      pill: "bg-slate-100 text-slate-500 border-slate-200",
      icon: "cancel",
      iconColor: "text-slate-400",
      flag: false,
    },
    failed: {
      label: "失敗",
      pill: "bg-red-50 text-red-700 border-red-200",
      icon: "error",
      iconColor: "text-red-500",
      flag: true,
    },
  };
  return map[s] || {
    label: status,
    pill: "bg-slate-100 text-slate-600 border-slate-200",
    icon: "help",
    iconColor: "text-slate-400",
    flag: false,
  };
}

function formatNTD(val) {
  return Math.round(Number(val) || 0).toLocaleString("zh-TW");
}

function formatDateFull(d) {
  if (!d) return "—";
  const dt = new Date(d);
  const wd = ["日", "一", "二", "三", "四", "五", "六"][dt.getDay()];
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}（${wd}）`;
}

function monthKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}`;
}

function parsePaymentInfo(order) {
  let info = order?.payment_info;
  if (!info && Array.isArray(order?.item_details)) {
    const demo = order.item_details.find((i) => i?._payment_demo)?._payment_demo;
    if (demo && typeof demo === "object") info = demo;
  }
  if (!info) return null;
  if (typeof info === "string") {
    try {
      info = JSON.parse(info);
    } catch {
      return null;
    }
  }
  return info && typeof info === "object" ? info : null;
}

function paymentLabel(info) {
  if (!info) return "";
  if (info.payment_method_label) return info.payment_method_label;
  const t = String(info.payment_type || "").toUpperCase();
  if (t === "CVS") return "超商代碼繳費";
  if (t === "VACC") return "ATM 轉帳";
  if (t === "BARCODE") return "超商條碼繳費";
  return info.payment_type || "待付款";
}

function PendingPaymentModal({ order, onClose }) {
  const pay = parsePaymentInfo(order);
  const code = pay?.code_no || pay?.payment_no || "";
  const isCvs = String(pay?.payment_type || "").toUpperCase() === "CVS";

  const copyCode = () => {
    if (code && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
  };

  return (
    <div className={ACCOUNT_UI.modalOverlay}>
      <div className="bg-white rounded-sm shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase">待付款</p>
            <h3 className="font-black text-[#1E4AD1]">訂單 #{order.id}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-2xl text-slate-400 px-2">
            ×
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            {orderItemSummary(order)} · NT$ {formatNTD(order.total_amount)}
          </p>

          {pay ? (
            <>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-sm space-y-3">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="store" size={22} className="text-amber-700" />
                  <span className="font-bold text-amber-900">{paymentLabel(pay)}</span>
                </div>
                {isCvs && pay.store_type && (
                  <p className="text-sm text-slate-700">
                    <span className="text-slate-400">超商別：</span>
                    {pay.store_type}
                  </p>
                )}
                {code && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">繳費代碼</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-lg font-black tracking-wider bg-white border border-amber-200 rounded-sm px-3 py-2 text-[#1E4AD1]">
                        {code}
                      </code>
                      <button
                        type="button"
                        onClick={copyCode}
                        className="shrink-0 px-3 py-2 text-xs font-bold border border-[#0071EB] text-[#0071EB] rounded-sm hover:bg-blue-50"
                      >
                        複製
                      </button>
                    </div>
                  </div>
                )}
                {pay.expire_date && (
                  <p className="text-sm text-red-600 font-medium">
                    繳費期限：{pay.expire_date}
                  </p>
                )}
                {pay.trade_no && (
                  <p className="text-xs text-slate-400">交易序號：{pay.trade_no}</p>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                請至指定超商多媒體機台輸入代碼完成繳費。付款成功後 eSIM QR Code 將自動發送至您的 Email，並於此頁更新為「已發貨」。
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">
              尚未取得繳費代碼，請聯絡客服或重新下單。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function QrModal({ order, onClose }) {
  const qrs = getEsimQRCodes(order);
  return (
    <div className={ACCOUNT_UI.modalOverlay}>
      <div className="bg-white rounded-sm shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-[#1E4AD1]">訂單 #{order.id} · QR Code</h3>
          <button type="button" onClick={onClose} className="text-2xl text-slate-400 px-2">
            ×
          </button>
        </div>
        <div className="p-5 space-y-4">
          {qrs.length ? (
            qrs.map((qr) => (
              <div key={qr.src} className="text-center border border-slate-100 rounded-sm p-4">
                <p className="text-sm font-bold text-slate-700 mb-3">{qr.name}</p>
                <img
                  src={qr.src}
                  alt="eSIM QR Code"
                  className="w-52 h-52 mx-auto object-contain border border-slate-200 rounded select-none"
                  draggable={false}
                />
                <p className="text-[10px] text-slate-400 mt-2 font-mono">{qr.topupId}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">QR Code 處理中，稍後請重新整理</p>
          )}
          <div className="bg-blue-50 border border-blue-100 rounded-sm p-3 text-xs text-slate-600 leading-relaxed space-y-1.5">
            <p className="font-bold text-[#0071EB]">安裝方式</p>
            <p>iPhone / iPad：長按上方 QR Code 圖片 → 選擇「加入 eSIM」或「加入行動方案」即可安裝。</p>
            <p>或使用相機 App 對準此 QR Code 掃描。</p>
            <p>Android：截圖後至「設定 → SIM 卡 → 下載 SIM 卡」掃描截圖中的 QR Code。</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 單筆訂單明細頁 */
function OrderDetailView({ order, onBack, onRefresh, getAuthHeaders, onTabChange }) {
  const meta = statusMeta(order.status);
  const qrs = getEsimQRCodes(order);
  const eligibility = getRefundEligibility(order);
  const refundUi = getRefundUiState(order);
  const payInfo = parsePaymentInfo(order);
  const isPending = String(order.status).toLowerCase() === "pending";

  const [refundOrder, setRefundOrder] = useState(null);
  const [refundDetailOrder, setRefundDetailOrder] = useState(null);

  let items = order?.item_details;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  if (!Array.isArray(items)) items = [];

  const iccidList = getEsimIccids(order);

  return (
    <AccountPageWrap>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-bold text-[#0071EB] mb-4 hover:underline"
      >
        <MaterialIcon name="arrow_back" size={18} />
        返回訂單列表
      </button>

      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        {/* 標題列 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <MaterialIcon name={meta.icon} size={24} className={meta.iconColor} />
            <div>
              <h2 className="text-lg font-black text-[#1E4AD1]">訂單 #{order.id}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{formatDateFull(order.created_at)}</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${meta.pill}`}>
            {meta.label}
          </span>
        </div>

        {/* 訂單方案 */}
        <div className="px-5 py-5 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">方案內容</h3>
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 rounded-sm border border-slate-100">
                  <div className="w-10 h-10 rounded-sm bg-[#1E4AD1]/10 flex items-center justify-center shrink-0">
                    <MaterialIcon name="sim_card" size={22} className="text-[#1E4AD1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#1E4AD1]">{item.name || item.productName || "eSIM 方案"}</p>
                    {item.quantity && item.quantity > 1 && (
                      <p className="text-xs text-slate-500">x{item.quantity}</p>
                    )}
                  </div>
                  <p className="font-black text-sm text-[#1E4AD1]">
                    NT$ {formatNTD(item.unit_price || item.price || order.total_amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-sm border border-slate-100">
              <MaterialIcon name="sim_card" size={22} className="text-[#1E4AD1]" />
              <p className="font-bold text-sm text-[#1E4AD1]">{orderItemSummary(order)}</p>
            </div>
          )}
        </div>

        {/* 金額與付款 */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">訂單總額</span>
            <span className="text-lg font-black text-[#1E4AD1]">NT$ {formatNTD(order.total_amount)}</span>
          </div>
          {payInfo && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-slate-600">付款方式</span>
              <span className="text-sm font-bold text-slate-700">{paymentLabel(payInfo)}</span>
            </div>
          )}
          {order.customer_email && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-slate-600">Email</span>
              <span className="text-sm text-slate-700">{order.customer_email}</span>
            </div>
          )}
        </div>

        {/* 待付款資訊 */}
        {isPending && payInfo && (
          <div className="px-5 py-4 border-b border-slate-100 bg-amber-50/50">
            <h3 className="text-xs font-bold text-amber-700 uppercase mb-2">繳費資訊</h3>
            {(payInfo.code_no || payInfo.payment_no) && (
              <div className="flex items-center gap-3">
                <code className="flex-1 text-base font-black tracking-wider bg-white border border-amber-200 rounded-sm px-3 py-2 text-[#1E4AD1]">
                  {payInfo.code_no || payInfo.payment_no}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(payInfo.code_no || payInfo.payment_no)}
                  className="px-3 py-2 text-xs font-bold border border-[#0071EB] text-[#0071EB] rounded-sm hover:bg-blue-50"
                >
                  複製
                </button>
              </div>
            )}
            {payInfo.expire_date && (
              <p className="text-sm text-red-600 font-medium mt-2">繳費期限：{payInfo.expire_date}</p>
            )}
          </div>
        )}

        {/* QR Code 區塊 */}
        {qrs.length > 0 && (
          <div className="px-5 py-5 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">eSIM QR Code</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {qrs.map((qr) => (
                <div key={qr.src} className="text-center border border-slate-100 rounded-sm p-4 bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-700 mb-3">{qr.name}</p>
                  <img
                    src={qr.src}
                    alt="eSIM QR Code"
                    className="w-52 h-52 mx-auto object-contain border border-slate-200 rounded select-none"
                    draggable={false}
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-mono">{qr.topupId}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-sm p-3 text-xs text-slate-600 leading-relaxed space-y-1.5">
              <p className="font-bold text-[#0071EB]">安裝方式</p>
              <p>iPhone / iPad：長按上方 QR Code 圖片 → 選擇「加入 eSIM」或「加入行動方案」即可安裝。</p>
              <p>或使用相機 App 對準此 QR Code 掃描。</p>
              <p>Android：截圖後至「設定 → SIM 卡 → 下載 SIM 卡」掃描截圖中的 QR Code。</p>
            </div>
          </div>
        )}

        {/* ICCID 與流量通知 */}
        {(iccidList.length > 0 || qrs.length > 0) && (
          <div className="px-5 py-5 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">eSIM 識別碼 & 流量通知</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* ICCID 卡片 */}
              <div className="flex flex-col items-center text-center p-4 bg-slate-50 border border-slate-100 rounded-sm">
                <div className="w-12 h-12 rounded-full bg-[#0071EB]/10 flex items-center justify-center mb-3">
                  <MaterialIcon name="sim_card" size={24} className="text-[#0071EB]" />
                </div>
                <p className="text-sm font-bold text-[#1E4AD1] mb-1">ICCID</p>
                <p className="text-xs text-slate-500 mb-3">eSIM 唯一識別碼，用於綁定流量監控</p>
                {iccidList.length > 0 ? (
                  <div className="w-full space-y-1.5">
                    {iccidList.map((item, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded px-2.5 py-1.5">
                        <p className="text-[10px] text-slate-400 truncate">{item.name}</p>
                        <p className="text-xs font-mono font-bold text-[#1E4AD1] break-all">
                          {item.iccid || `Topup: ${item.topupId}`}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">系統將在綁定後顯示</p>
                )}
              </div>

              {/* 綁定流量通知 */}
              <div className="flex flex-col items-center text-center p-4 bg-slate-50 border border-slate-100 rounded-sm">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <MaterialIcon name="notifications_active" size={24} className="text-emerald-700" />
                </div>
                <p className="text-sm font-bold text-[#1E4AD1] mb-1">流量提醒</p>
                <p className="text-xs text-slate-500 mb-3">綁定 ICCID 後，流量偏低時自動推播通知您</p>
                <button
                  type="button"
                  onClick={() => onTabChange?.("traffic")}
                  className="mt-auto inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071EB] text-white text-xs font-bold rounded-sm hover:bg-[#1E4AD1] transition"
                >
                  開啟流量通知
                  <MaterialIcon name="arrow_forward" size={14} />
                </button>
              </div>

              {/* 查詢流量 */}
              <div className="flex flex-col items-center text-center p-4 bg-slate-50 border border-slate-100 rounded-sm">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                  <MaterialIcon name="speed" size={24} className="text-amber-700" />
                </div>
                <p className="text-sm font-bold text-[#1E4AD1] mb-1">查詢流量</p>
                <p className="text-xs text-slate-500 mb-3">隨時查看剩餘流量及使用狀態</p>
                <button
                  type="button"
                  onClick={() => onTabChange?.("traffic")}
                  className="mt-auto inline-flex items-center gap-1.5 px-4 py-2 border border-[#0071EB] text-[#0071EB] text-xs font-bold rounded-sm hover:bg-blue-50 transition"
                >
                  前往查詢
                  <MaterialIcon name="arrow_forward" size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 退款狀態 */}
        {refundUi.badge && (
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">退款狀態</h3>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${refundUi.badge.color}`}>
                {refundUi.badge.label}
              </span>
              <button
                type="button"
                onClick={() => setRefundDetailOrder(order)}
                className="text-xs font-bold text-[#0071EB] hover:underline"
              >
                查看退款詳情
              </button>
            </div>
          </div>
        )}

        {/* 操作列 */}
        <div className="px-5 py-4 flex flex-wrap gap-2">
          {eligibility.canApply && (
            <button
              type="button"
              onClick={() => setRefundOrder(order)}
              className="flex items-center gap-1 px-4 py-2.5 border border-red-200 text-red-700 text-sm font-bold rounded-sm hover:bg-red-50"
            >
              <MaterialIcon name="undo" size={16} />
              申請退款
            </button>
          )}
          <Link
            href="/"
            className="flex items-center gap-1 px-4 py-2.5 bg-[#0071EB] text-white text-sm font-bold rounded-sm hover:bg-[#1E4AD1]"
          >
            <MaterialIcon name="add" size={16} />
            再次購買
          </Link>
        </div>
      </div>

      {refundDetailOrder && (
        <OrderRefundDetailModal
          order={refundDetailOrder}
          onClose={() => setRefundDetailOrder(null)}
          onReapply={(o) => setRefundOrder(o)}
        />
      )}
      {refundOrder && (
        <RefundRequestModal
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          onSuccess={() => {
            setRefundOrder(null);
            onRefresh?.();
          }}
          getAuthHeaders={getAuthHeaders}
        />
      )}
    </AccountPageWrap>
  );
}

/** 圖 2 + 3：従業員レポート + 案件一覧 */
export default function AccountOrdersView({
  orders,
  loading,
  onRefresh,
  getAuthHeaders,
  onTabChange,
  initialDetailOrder,
}) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [qrOrder, setQrOrder] = useState(null);
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundDetailOrder, setRefundDetailOrder] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [detailOrder, setDetailOrder] = useState(initialDetailOrder || null);

  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const filtered = useMemo(() => {
    let list = [...(orders || [])];
    const q = search.trim().toLowerCase();

    if (tab === "completed") list = list.filter((o) => o.status === "completed");
    else if (tab === "pending") list = list.filter((o) => o.status === "pending");
    else if (tab === "refund") {
      list = list.filter((o) =>
        ["refund_pending", "refunded"].includes(String(o.status).toLowerCase()),
      );
    }

    if (statusFilter) list = list.filter((o) => o.status === statusFilter);

    if (monthFilter === "this") {
      list = list.filter((o) => monthKey(o.created_at) === thisMonth);
    } else if (monthFilter === "last") {
      list = list.filter((o) => monthKey(o.created_at) === lastMonth);
    }

    if (q) {
      list = list.filter(
        (o) =>
          String(o.id).includes(q) ||
          orderItemSummary(o).toLowerCase().includes(q) ||
          (o.customer_email || "").toLowerCase().includes(q),
      );
    }

    if (sort === "newest") {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === "amount") {
      list.sort((a, b) => (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0));
    }
    return list;
  }, [orders, tab, search, statusFilter, monthFilter, sort, thisMonth, lastMonth]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((o) => o.id)));
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setMonthFilter("all");
    setTab("all");
    setPage(1);
  };

  const exportCsv = () => {
    const rows = [
      ["訂單編號", "方案", "Email", "金額", "狀態", "購買日"],
      ...filtered.map((o) => [
        o.id,
        orderItemSummary(o),
        o.customer_email || "",
        o.total_amount,
        o.status,
        o.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "esim-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (detailOrder) {
    return (
      <OrderDetailView
        order={detailOrder}
        onBack={() => setDetailOrder(null)}
        onRefresh={onRefresh}
        getAuthHeaders={getAuthHeaders}
        onTabChange={onTabChange}
      />
    );
  }

  return (
    <AccountPageWrap>
      {/* 工具列 */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0071EB] text-white text-sm font-bold rounded-sm hover:bg-[#1E4AD1] shrink-0"
        >
          <MaterialIcon name="download" size={18} />
          匯出訂單 (.csv)
        </button>
      </div>

      {/* 圖 2 圖例列 */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mb-4 px-1">
        <span className="flex items-center gap-1">
          <MaterialIcon name="error" size={16} className="text-red-500" />
          需處理
        </span>
        <span className="flex items-center gap-1">
          <MaterialIcon name="flag" size={16} className="text-[#0071EB]" />
          追蹤中
        </span>
        <span className="flex items-center gap-1">
          <MaterialIcon name="check_circle" size={16} className="text-teal-500" />
          已發貨
        </span>
      </div>

      {/* 搜尋列 — 圖 2 */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="flex-1 relative">
          <MaterialIcon
            name="search"
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="關鍵字搜尋（訂單編號、方案、Email）"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0071EB]/30"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1 text-sm font-bold text-[#0071EB] px-3 py-2 whitespace-nowrap"
        >
          <MaterialIcon name={showAdvanced ? "remove" : "add"} size={18} />
          條件指定搜尋
        </button>
      </div>

      {/* 圖 3 頂部分頁 tab */}
      <div className="flex gap-6 border-b border-slate-200 mb-0 overflow-x-auto">
        {[
          { id: "all", label: "全部" },
          { id: "completed", label: "已發貨" },
          { id: "pending", label: "待付款" },
          { id: "refund", label: "退款相關" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
            className={`pb-3 text-sm font-bold whitespace-nowrap border-b-2 -mb-px transition ${
              tab === t.id
                ? "border-[#0071EB] text-[#0071EB]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 圖 3 篩選面板 */}
      {showAdvanced && (
        <div className="border border-slate-200 border-t-0 bg-slate-50/80 p-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">狀態</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="text-sm border border-slate-200 rounded-sm px-3 py-2 bg-white min-w-[140px]"
              >
                <option value="">全部狀態</option>
                <option value="completed">已發貨</option>
                <option value="pending">待付款</option>
                <option value="refund_pending">退款審核中</option>
                <option value="refunded">已退款</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">排序</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="text-sm border border-slate-200 rounded-sm px-3 py-2 bg-white"
              >
                <option value="newest">購買日（新→舊）</option>
                <option value="amount">金額（高→低）</option>
              </select>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-slate-500 hover:text-[#0071EB] font-bold ml-auto"
            >
              清除搜尋條件
            </button>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-500 mb-2">購買月份</p>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "all", label: "全部" },
                { id: "last", label: "上個月" },
                { id: "this", label: "本月" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMonthFilter(m.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded border transition ${
                    monthFilter === m.id
                      ? "bg-[#1E4AD1] text-white border-[#1E4AD1]"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#0071EB]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 批量操作列 — 圖 3 */}
      <div className="bg-white border border-slate-200 border-t-0 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {selected.size > 0 ? (
            <>
              已選 <strong>{selected.size}</strong> 筆。
              <button
                type="button"
                onClick={() => setSelected(new Set(paged.map((o) => o.id)))}
                className="text-[#0071EB] font-bold ml-1 hover:underline"
              >
                全選本頁 {paged.length} 筆
              </button>
            </>
          ) : (
            <>共 {filtered.length} 筆訂單</>
          )}
        </p>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => onTabChange?.("traffic")}
              className="flex items-center gap-1 px-4 py-2 bg-[#1E4AD1] text-white text-xs font-bold rounded-sm"
            >
              <MaterialIcon name="speed" size={16} />
              查詢所選流量
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-2 border border-slate-200 text-xs font-bold rounded-sm hover:bg-slate-50"
          >
            重新整理
          </button>
          <Link
            href="/"
            className="px-3 py-2 bg-[#0071EB] text-white text-xs font-bold rounded-sm"
          >
            + 選購 eSIM
          </Link>
        </div>
      </div>

      {/* 表格 — 圖 2 豐富列 + 圖 3 狀態 pill */}
      <div className="bg-white border border-slate-200 border-t-0 rounded-b-sm overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-[960px]">
          <thead>
            <tr className="text-[11px] text-slate-500 border-b border-slate-200 bg-slate-50/80">
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={paged.length > 0 && selected.size === paged.length}
                  onChange={toggleAll}
                  className="accent-[#0071EB]"
                />
              </th>
              <th className="px-3 py-3 font-bold text-left w-12">狀態</th>
              <th className="px-3 py-3 font-bold text-left">訂單 / 方案</th>
              <th className="px-3 py-3 font-bold text-left">方案摘要</th>
              <th className="px-3 py-3 font-bold text-left">備註</th>
              <th className="px-3 py-3 font-bold text-left">購買日</th>
              <th className="px-3 py-3 font-bold text-right w-28">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  載入訂單中…
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  尚無符合條件的訂單
                  <Link href="/" className="block mt-2 text-[#0071EB] font-bold">
                    前往選購 →
                  </Link>
                </td>
              </tr>
            ) : (
              paged.map((order) => {
                const meta = statusMeta(order.status);
                const hasQr = getEsimQRCodes(order).length > 0;
                const eligibility = getRefundEligibility(order);
                const refundUi = getRefundUiState(order);
                const payInfo = parsePaymentInfo(order);
                const isPending = String(order.status).toLowerCase() === "pending";

                return (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/60 align-top">
                    <td className="px-3 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="accent-[#0071EB]"
                      />
                    </td>
                    <td className="px-3 py-4">
                      <MaterialIcon name={meta.icon} size={20} className={meta.iconColor} />
                    </td>
                    <td className="px-3 py-4 min-w-[160px]">
                      <p className="font-mono text-xs text-slate-400">#{order.id}</p>
                      <button
                        type="button"
                        onClick={() => setDetailOrder(order)}
                        className="font-bold text-[#0071EB] hover:underline text-left mt-0.5"
                      >
                        {orderItemSummary(order)}
                      </button>
                      <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[180px]">
                        {order.customer_email || "—"}
                      </p>
                      <span
                        className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.pill}`}
                      >
                        {meta.label}
                      </span>
                      {refundUi.badge && (
                        <span
                          className={`inline-block mt-1 ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${refundUi.badge.color}`}
                        >
                          {refundUi.badge.label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex gap-1">
                        {[
                          { label: "金額", val: `NT$${formatNTD(order.total_amount)}` },
                          {
                            label: "QR",
                            val: hasQr ? "有" : "—",
                            isQr: true,
                            clickable: hasQr,
                          },
                          { label: "退款", val: refundColumnLabel(order) },
                        ].map((box) => (
                          <div
                            key={box.label}
                            className={`w-16 text-center border border-slate-200 rounded py-1.5 bg-slate-50/50 ${box.clickable ? "cursor-pointer hover:border-[#0071EB] hover:bg-blue-50/50 transition-colors" : ""}`}
                            onClick={box.clickable ? () => setQrOrder(order) : undefined}
                            role={box.clickable ? "button" : undefined}
                            tabIndex={box.clickable ? 0 : undefined}
                            aria-label={box.clickable ? "檢視 QR Code" : undefined}
                          >
                            <p className="text-[9px] text-slate-400">{box.label}</p>
                            {box.isQr && hasQr ? (
                              <MaterialIcon name="qr_code_2" size={18} className="text-[#0071EB] mx-auto mt-0.5" />
                            ) : (
                              <p className="text-xs font-black text-[#1E4AD1] mt-0.5">{box.val}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center">
                      {isPending && payInfo ? (
                        <button
                          type="button"
                          onClick={() => setPendingOrder(order)}
                          className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-sm hover:bg-amber-100"
                        >
                          {paymentLabel(payInfo)}
                        </button>
                      ) : refundUi.badge ? (
                        <button
                          type="button"
                          onClick={() => setRefundDetailOrder(order)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-sm border max-w-[100px] leading-tight ${refundUi.badge.color} hover:opacity-90`}
                        >
                          {refundUi.badge.label}
                        </button>
                      ) : meta.flag ? (
                        <MaterialIcon name="chat_bubble_outline" size={18} className="text-slate-300" />
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateFull(order.created_at)}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {hasQr && (
                          <button
                            type="button"
                            onClick={() => setQrOrder(order)}
                            title="QR Code"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400"
                          >
                            <MaterialIcon name="qr_code_2" size={18} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onTabChange?.("traffic")}
                          title="查流量"
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400"
                        >
                          <MaterialIcon name="speed" size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailOrder(order)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1E4AD1] text-white text-[11px] font-bold rounded hover:bg-[#163aab]"
                        >
                          <MaterialIcon name="visibility" size={14} />
                          明細
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* 分頁 — 圖 3 */}
        <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-40"
            >
              <MaterialIcon name="chevron_left" size={20} />
            </button>
            <span className="text-sm font-bold text-[#0071EB] px-2">{page}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-40"
            >
              <MaterialIcon name="chevron_right" size={20} />
            </button>
          </div>
          <p className="text-xs text-slate-400">
            {PAGE_SIZE} 筆 / 頁 · 共 {filtered.length} 筆
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-3 px-1">
        未開通方案可於 7 日內申請全額退款。{" "}
        <Link href="/refund-policy" className="text-[#0071EB] font-bold hover:underline">
          退換貨政策
        </Link>
      </p>

      {qrOrder && <QrModal order={qrOrder} onClose={() => setQrOrder(null)} />}
      {pendingOrder && (
        <PendingPaymentModal order={pendingOrder} onClose={() => setPendingOrder(null)} />
      )}
      {refundDetailOrder && (
        <OrderRefundDetailModal
          order={refundDetailOrder}
          onClose={() => setRefundDetailOrder(null)}
          onReapply={(o) => setRefundOrder(o)}
        />
      )}
      {refundOrder && (
        <RefundRequestModal
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          onSuccess={() => {
            setRefundOrder(null);
            onRefresh?.();
          }}
          getAuthHeaders={getAuthHeaders}
        />
      )}
    </AccountPageWrap>
  );
}
