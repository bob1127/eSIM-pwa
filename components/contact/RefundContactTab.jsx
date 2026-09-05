"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabaseClient";
import ContactFormRow, { inputClass, selectClass, textareaClass } from "./ContactFormRow";
import RefundInlineForm from "./RefundInlineForm";
import MaterialIcon from "@/components/MaterialIcon";
import {
  REFUND_REASONS_FULL,
  REFUND_REASONS_DISPUTE,
  orderItemSummary,
} from "@/lib/refundPolicy";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

const REFUND_CONTACT_TYPES = [
  { value: "full_refund", label: "未開通全額退款" },
  { value: "dispute", label: "已開通／售後爭議" },
  { value: "exchange", label: "換貨／方案變更" },
  { value: "other", label: "其他退換款問題" },
];

function GuestRefundForm() {
  const [form, setForm] = useState({
    orderId: "",
    name: "",
    email: "",
    phone: "",
    requestType: "",
    reasonType: "",
    message: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const reasonOptions =
    form.requestType === "dispute"
      ? REFUND_REASONS_DISPUTE
      : form.requestType === "full_refund"
        ? REFUND_REASONS_FULL
        : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.orderId.trim()) return setError("請填寫訂單編號");
    if (!form.name.trim()) return setError("請填寫姓名");
    if (!form.email.trim()) return setError("請填寫 Email");
    if (!form.requestType) return setError("請選擇申請類型");
    if (form.message.trim().length < 10) return setError("請詳述問題（至少 10 字）");
    if (!agreed) return setError("請同意退換貨政策");

    const typeLabel = REFUND_CONTACT_TYPES.find((t) => t.value === form.requestType)?.label;
    const reasonLabel = reasonOptions.find((r) => r.value === form.reasonType)?.label;

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "refund",
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          order_id: form.orderId.trim(),
          subject: `退換款 — ${typeLabel}`,
          message: form.message.trim(),
          metadata: {
            request_type: form.requestType,
            request_type_label: typeLabel,
            reason_type: form.reasonType || null,
            reason_label: reasonLabel || null,
          },
          agreed_privacy: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失敗");
      setDone(true);
    } catch (err) {
      setError(err.message || "提交失敗");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="p-8 text-center bg-white border-t border-slate-200">
        <MaterialIcon name="mark_email_read" size={48} className="text-[#2b579a] mx-auto mb-4" />
        <h2 className="text-lg font-bold text-[#1e3a5f] mb-2">退換款聯繫已送出</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          客服將核對訂單後以 Email 回覆。若您有會員帳號，建議登入後至會員中心可更快追蹤進度。
        </p>
        <Link href="/login?callbackUrl=/contact" className="inline-block mt-4 text-sm font-bold text-[#2563eb] hover:underline">
          登入會員中心 →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="overflow-hidden border-t border-slate-200">
        <ContactFormRow label="訂單編號" required hint="可在訂單確認信或會員中心找到">
          <input
            type="text"
            value={form.orderId}
            onChange={(e) => set("orderId", e.target.value)}
            placeholder="例）12345"
            className={inputClass}
          />
        </ContactFormRow>
        <ContactFormRow label="姓名" required>
          <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
        </ContactFormRow>
        <ContactFormRow label="Email" required hint="須與下單時使用的信箱一致">
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
        </ContactFormRow>
        <ContactFormRow label="聯絡電話" optional>
          <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
        </ContactFormRow>
        <ContactFormRow label="申請類型" required>
          <select value={form.requestType} onChange={(e) => set("requestType", e.target.value)} className={selectClass}>
            <option value="">請選擇</option>
            {REFUND_CONTACT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </ContactFormRow>
        {reasonOptions.length > 0 && (
          <ContactFormRow label="原因" optional>
            <select value={form.reasonType} onChange={(e) => set("reasonType", e.target.value)} className={selectClass}>
              <option value="">請選擇（選填）</option>
              {reasonOptions.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </ContactFormRow>
        )}
        <ContactFormRow label="問題說明" required>
          <textarea
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            rows={5}
            placeholder="請說明 eSIM 使用狀況、是否已掃描 QR Code、錯誤訊息等"
            className={textareaClass}
          />
        </ContactFormRow>
      </div>
      <div className="px-4 sm:px-6 py-5 bg-white border-t border-slate-200 space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-sm text-xs text-slate-600 leading-relaxed">
          <p className="font-bold text-slate-700 mb-1">退換款政策摘要</p>
          <p>非原生／漫遊：未安裝或已安裝未激活可全額退款；已激活不予退款。原生 eSIM：售出後概不退款或換貨。</p>
          <Link href="/refund-policy" target="_blank" className="text-[#2563eb] font-bold hover:underline mt-1 inline-block">
            閱讀完整政策 →
          </Link>
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
          <span>我已閱讀並同意退換貨政策，且所填資料真實有效。</span>
        </label>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-sm px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto min-w-[240px] px-8 py-3.5 bg-[#2b579a] text-white text-sm font-bold rounded-sm disabled:opacity-50"
        >
          {submitting ? "送出中…" : "送出退換款聯繫"}
        </button>
      </div>
    </form>
  );
}

export default function RefundContactTab() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [refundDone, setRefundDone] = useState(false);

  const userEmail = session?.user?.email;

  const getAuthHeaders = useCallback(async () => {
    const headers = {};
    const {
      data: { session: supaSession },
    } = await supabase.auth.getSession();
    if (supaSession?.access_token) {
      headers.Authorization = `Bearer ${supaSession.access_token}`;
    }
    return headers;
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !userEmail) return;
    setLoading(true);
    getAuthHeaders()
      .then((headers) =>
        fetch(`/api/orders/user-orders?email=${encodeURIComponent(userEmail)}`, {
          headers,
          credentials: "include",
        }),
      )
      .then((r) => r.json())
      .then((data) => {
        const list = (data.orders || []).filter((o) =>
          ["completed", "refund_pending"].includes(String(o.status).toLowerCase()),
        );
        setOrders(list);
        if (list.length) setSelectedId(String(list[0].id));
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [status, userEmail, getAuthHeaders]);

  const selectedOrder = orders.find((o) => String(o.id) === selectedId);

  if (status === "loading") {
    return (
      <div className="p-12 text-center">
        <LoadingIndicator layout="center" label="載入中…" size="md" />
      </div>
    );
  }

  return (
    <div>
      {/* 會員快速通道 */}
      {status === "authenticated" && userEmail && (
        <div className="p-4 sm:p-6 bg-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-bold text-[#2563eb] uppercase tracking-wide">會員快速申請</p>
              <p className="text-sm text-slate-600 mt-0.5">
                已登入 {userEmail}，可選擇訂單直接提交線上退換款申請。
              </p>
            </div>
            <Link
              href="/account"
              className="text-xs font-bold text-[#2b579a] border border-[#2b579a] px-3 py-2 rounded-sm hover:bg-[#2b579a]/5 shrink-0"
            >
              會員中心訂單 →
            </Link>
          </div>

          {loading ? (
            <LoadingIndicator layout="inline" label="載入訂單中…" size="sm" />
          ) : orders.length === 0 ? (
            <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-sm border border-slate-100">
              找不到可申請的已完成訂單。若剛完成付款，請稍候或改用下方表單聯繫客服。
            </p>
          ) : refundDone ? (
            <div className="p-6 text-center bg-emerald-50 border border-emerald-100 rounded-sm">
              <MaterialIcon name="check_circle" size={40} className="text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-emerald-900">退換款申請已提交</p>
              <p className="text-sm text-emerald-700 mt-1">可至會員中心追蹤審核進度。</p>
              <button
                type="button"
                onClick={() => setRefundDone(false)}
                className="text-sm font-bold text-[#2563eb] mt-3 hover:underline"
              >
                再申請一筆
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">選擇訂單</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className={selectClass}
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.id} · {orderItemSummary(o)} · NT$ {Math.round(Number(o.total_amount) || 0).toLocaleString("zh-TW")}
                    </option>
                  ))}
                </select>
              </div>
              {selectedOrder && (
                <RefundInlineForm
                  order={selectedOrder}
                  getAuthHeaders={getAuthHeaders}
                  onSuccess={() => setRefundDone(true)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* 未登入提示 + 訪客表單 */}
      {status !== "authenticated" && (
        <div className="px-4 sm:px-6 py-4 bg-[#2563eb]/5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            <strong className="text-[#1e3a5f]">已有會員帳號？</strong>{" "}
            登入後可選擇訂單快速申請，審核進度也可在會員中心追蹤。
          </p>
          <Link
            href="/login?callbackUrl=/contact"
            className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-[#2563eb] text-white text-xs font-bold rounded-sm hover:bg-[#1d4ed8] shrink-0"
          >
            <MaterialIcon name="login" size={16} />
            登入會員
          </Link>
        </div>
      )}

      <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-white/80">
        <h3 className="text-sm font-bold text-[#1e3a5f]">
          {status === "authenticated" ? "或填寫表單由客服協助" : "退換款聯繫表單"}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          未登入、找不到訂單，或需人工協助時請填寫以下資料。
        </p>
      </div>

      <GuestRefundForm />
    </div>
  );
}
