"use client";

import { useState, useEffect } from "react";
import { bossFetch } from "@/lib/bossAdminClient";
import { ACCOUNT_UI } from "@/lib/accountUi";
import {
  REFUND_REASONS_FULL,
  REFUND_REASONS_DISPUTE,
  orderItemSummary,
} from "@/lib/refundPolicy";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

const ALL_REASONS = [...REFUND_REASONS_FULL, ...REFUND_REASONS_DISPUTE];

function reasonLabel(value) {
  return ALL_REASONS.find((r) => r.value === value)?.label || value;
}

function formatNTD(val) {
  return Math.round(Number(val) || 0).toLocaleString("zh-TW");
}

export default function AdminRefundsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionId, setActionId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [activationStatus, setActivationStatus] = useState("unknown");
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await bossFetch(`/api/admin/refunds?status=${filter}`);
      setRequests(data.requests || []);
    } catch (err) {
      setToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleReview = async (action) => {
    if (!detail) return;
    const label = action === "approve" ? "核准退款" : "駁回";
    if (!window.confirm(`確定要${label}此申請？`)) return;

    setActionId(detail.id);
    try {
      await bossFetch("/api/admin/refunds", {
        method: "PATCH",
        body: JSON.stringify({
          id: detail.id,
          action,
          admin_note: adminNote,
          esim_activation_status: activationStatus,
        }),
      });
      setToast(action === "approve" ? "已核准退款" : "已駁回申請");
      setDetail(null);
      setAdminNote("");
      load();
    } catch (err) {
      setToast(err.message);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="bg-slate-800 text-white text-sm font-bold px-4 py-3 rounded-xl flex justify-between">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast("")} className="opacity-70 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { id: "pending", label: "待審核" },
          { id: "approved", label: "已核准" },
          { id: "rejected", label: "已駁回" },
          { id: "all", label: "全部" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              filter === tab.id
                ? "bg-[#1a56db] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? (
          <LoadingIndicator layout="center" label="載入中…" className="p-8" />
        ) : !requests.length ? (
          <p className="p-8 text-center text-slate-400">目前沒有退款申請</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">申請時間</th>
                  <th className="px-4 py-3">訂單</th>
                  <th className="px-4 py-3">類型</th>
                  <th className="px-4 py-3">原因</th>
                  <th className="px-4 py-3">金額</th>
                  <th className="px-4 py-3">狀態</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("zh-TW")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">#{r.order_id}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[160px]">
                        {r.customer_email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {r.request_type === "full_refund" ? "未開通退款" : "售後爭議"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{reasonLabel(r.reason_type)}</td>
                    <td className="px-4 py-3 font-mono">
                      NT$ {formatNTD(r.order?.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          r.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : r.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {r.status === "pending"
                          ? "待審核"
                          : r.status === "approved"
                            ? "已核准"
                            : "已駁回"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDetail(r);
                          setAdminNote(r.admin_note || "");
                          setActivationStatus(r.esim_activation_status || "unknown");
                        }}
                        className="text-[#1a56db] font-bold hover:underline"
                      >
                        審核
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <div className={ACCOUNT_UI.modalOverlayBottom}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex justify-between">
              <div>
                <p className="text-xs font-bold text-[#1a56db] uppercase">退款審核</p>
                <h3 className="text-lg font-black">訂單 #{detail.order_id}</h3>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="text-2xl text-slate-400 px-2">
                ×
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">申請類型</p>
                  <p className="font-bold">
                    {detail.request_type === "full_refund" ? "未開通全額退款" : "售後爭議"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">開通聲明</p>
                  <p className="font-bold">
                    {detail.activation_claim === "activated" ? "已開通" : "未開通"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">方案</p>
                  <p className="font-bold">{orderItemSummary(detail.order || {})}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">原因</p>
                  <p>{reasonLabel(detail.reason_type)}</p>
                  {detail.reason_note && (
                    <p className="mt-2 text-slate-600 whitespace-pre-wrap">{detail.reason_note}</p>
                  )}
                </div>
                {detail.device_model && (
                  <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">手機型號</p>
                    <p className="font-bold">{detail.device_model}</p>
                  </div>
                )}
              </div>

              {Array.isArray(detail.image_urls) && detail.image_urls.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">舉證截圖</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.image_urls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-24 h-24 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 ring-[#1a56db]"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  API 查詢 eSIM 狀態
                </label>
                <select
                  value={activationStatus}
                  onChange={(e) => setActivationStatus(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2"
                >
                  <option value="unknown">尚未查詢</option>
                  <option value="not_activated">未啟用／未掃描</option>
                  <option value="activated">已啟用</option>
                  <option value="used">已有流量使用</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  審核備註（駁回時必填說明）
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 resize-none"
                  placeholder="例：經 API 查詢已啟用且有流量，不符合未開通退款條件"
                />
              </div>

              {detail.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={actionId === detail.id}
                    onClick={() => handleReview("reject")}
                    className="flex-1 py-3 border border-red-200 text-red-700 font-bold rounded-xl hover:bg-red-50 disabled:opacity-50"
                  >
                    駁回
                  </button>
                  <button
                    type="button"
                    disabled={actionId === detail.id}
                    onClick={() => handleReview("approve")}
                    className="flex-1 py-3 bg-[#1a56db] text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                  >
                    核准退款
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
