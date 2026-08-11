"use client";

import { useState, useEffect } from "react";
import { bossFetch } from "@/lib/bossAdminClient";
import { ACCOUNT_UI } from "@/lib/accountUi";
import {
  WITHDRAWAL_STATUS_LABEL,
  getPayoutMethodLabel,
  formatPayoutAccountSummary,
} from "@/lib/partnerPayout";
import { getPartnerCooperationLabel } from "@/lib/adminAnalytics";

function formatNTD(val) {
  return Math.round(Number(val) || 0).toLocaleString("zh-TW");
}

function BankBlock({ title, bank, tone = "slate" }) {
  if (!bank) {
    return (
      <p className="font-bold text-amber-700">尚未設定收款帳戶</p>
    );
  }
  const box =
    tone === "amber"
      ? "bg-amber-50 border-amber-200"
      : "bg-slate-50 border-slate-100";
  return (
    <div className={`rounded-xl border p-3 space-y-1 ${box}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <p className="font-black text-[#1a56db]">
        {getPayoutMethodLabel(bank.payout_method)}
      </p>
      <p className="text-sm font-medium text-slate-800">
        {formatPayoutAccountSummary(bank)}
      </p>
      {bank.updated_at || bank.captured_at ? (
        <p className="text-[10px] text-slate-400">
          {bank.updated_at
            ? `更新於 ${new Date(bank.updated_at).toLocaleString("zh-TW", {
                timeZone: "Asia/Taipei",
              })}`
            : `申請快照 ${new Date(bank.captured_at).toLocaleString("zh-TW", {
                timeZone: "Asia/Taipei",
              })}`}
        </p>
      ) : null}
    </div>
  );
}

function statusBadge(status) {
  const s = String(status || "").toLowerCase();
  const label = WITHDRAWAL_STATUS_LABEL[s] || status || "—";
  const cls =
    s === "pending"
      ? "bg-amber-100 text-amber-800"
      : s === "approved"
        ? "bg-sky-100 text-sky-800"
        : s === "remitted"
          ? "bg-emerald-100 text-emerald-700"
          : s === "rejected" || s === "cancelled"
            ? "bg-red-50 text-red-700"
            : "bg-slate-100 text-slate-600";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

export default function AdminWithdrawalsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionId, setActionId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [toast, setToast] = useState("");
  const [missingTable, setMissingTable] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await bossFetch(
        `/api/admin/partner-withdrawals?status=${filter}`,
      );
      setRequests(data.requests || []);
      setMissingTable(!!data.missingTable);
    } catch (err) {
      setToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleReview = async (action) => {
    if (!detail) return;
    const labels = {
      approve: "核准提領",
      reject: "駁回",
      remit: "標記已匯款",
    };
    const label = labels[action] || "更新";
    if (action === "reject" && !adminNote.trim()) {
      setToast("駁回時請填寫審核備註");
      return;
    }
    const remitHint =
      action === "remit"
        ? `\n\n實匯 NT$${formatNTD(detail.net_amount || detail.amount)}（申請 ${formatNTD(detail.amount)} − 手續費 ${formatNTD(detail.fee_amount)}）\n標記後會以 FIFO 對沖對帳單成交月，網銀備註對準 JEKO-YYYYMM。\n請確認未另外再匯同一筆「本期應匯」。`
        : "";
    if (!window.confirm(`確定要${label}此申請？${remitHint}`)) return;

    setActionId(detail.id);
    try {
      await bossFetch("/api/admin/partner-withdrawals", {
        method: "PATCH",
        body: JSON.stringify({
          id: detail.id,
          action,
          admin_note: adminNote,
        }),
      });
      setToast(
        action === "approve"
          ? "已核准，請於 10 個工作天內匯款後標記已匯款"
          : action === "remit"
            ? "已標記匯款完成"
            : "已駁回申請",
      );
      setDetail(null);
      setAdminNote("");
      load();
    } catch (err) {
      setToast(err.message);
    } finally {
      setActionId(null);
    }
  };

  const partner = detail?.partner;
  const bank = detail?.bank;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="bg-slate-800 text-white text-sm font-bold px-4 py-3 rounded-xl flex justify-between">
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast("")}
            className="opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { id: "pending", label: "待審核" },
          { id: "approved", label: "已核准待匯" },
          { id: "remitted", label: "已匯款" },
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
          <p className="p-8 text-center text-slate-400">載入中…</p>
        ) : missingTable ? (
          <p className="p-8 text-center text-slate-400">
            尚未建立提領資料表，請先完成 migration
          </p>
        ) : !requests.length ? (
          <p className="p-8 text-center text-slate-400">目前沒有提領申請</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[960px]">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">申請時間</th>
                  <th className="px-4 py-3">夥伴</th>
                  <th className="px-4 py-3">收款帳戶</th>
                  <th className="px-4 py-3">申請金額</th>
                  <th className="px-4 py-3">手續費</th>
                  <th className="px-4 py-3">實匯</th>
                  <th className="px-4 py-3">狀態</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {r.requested_at
                        ? new Date(r.requested_at).toLocaleString("zh-TW", {
                            timeZone: "Asia/Taipei",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">
                        {r.partner?.name || `夥伴 #${r.partner_id}`}
                      </p>
                      {r.store?.store_name ? (
                        <p className="text-xs text-[#1a56db] font-bold truncate max-w-[180px]">
                          店鋪：{r.store.store_name}
                        </p>
                      ) : null}
                      <p className="text-xs text-slate-400 truncate max-w-[180px]">
                        {r.partner?.email || "—"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {getPartnerCooperationLabel(
                          r.partner?.cooperation_model,
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[220px]">
                      {r.bank ? (
                        <>
                          <p className="font-bold text-slate-700">
                            {getPayoutMethodLabel(r.bank.payout_method)}
                          </p>
                          <p className="truncate">
                            {r.bank.bank_name} {r.bank.branch_name}
                          </p>
                          <p className="truncate">
                            {r.bank.account_name}／{r.bank.account_number}
                          </p>
                          {r.bank_changed_since_request ? (
                            <p className="text-amber-600 font-bold mt-1">
                              申請後已修改帳戶
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-amber-600 font-bold">未設定帳戶</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">
                      NT$ {formatNTD(r.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.fee_amount > 0 ? `NT$ ${formatNTD(r.fee_amount)}` : "免"}
                    </td>
                    <td className="px-4 py-3 font-mono font-black text-[#1a56db]">
                      NT$ {formatNTD(r.net_amount ?? r.amount - (r.fee_amount || 0))}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDetail(r);
                          setAdminNote(r.admin_note || "");
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
                <p className="text-xs font-bold text-[#1a56db] uppercase">
                  提領審核
                </p>
                <h3 className="text-lg font-black">
                  {partner?.name || `申請 #${detail.id}`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {partner?.email || ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="text-2xl text-slate-400 px-2"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    申請金額
                  </p>
                  <p className="font-black text-lg">NT$ {formatNTD(detail.amount)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    實匯金額
                  </p>
                  <p className="font-black text-lg text-[#1a56db]">
                    NT${" "}
                    {formatNTD(
                      detail.net_amount ??
                        detail.amount - (detail.fee_amount || 0),
                    )}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    手續費
                  </p>
                  <p className="font-bold">
                    {detail.fee_amount > 0
                      ? `NT$ ${formatNTD(detail.fee_amount)}`
                      : "免手續費"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    狀態
                  </p>
                  <div className="mt-0.5">{statusBadge(detail.status)}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    夥伴／店鋪
                  </p>
                  <p className="font-bold">
                    {getPartnerCooperationLabel(partner?.cooperation_model)}
                    {partner?.slug || partner?.referral_code
                      ? ` · ${partner?.referral_code || partner?.slug}`
                      : ""}
                  </p>
                  {detail.store?.store_name ? (
                    <p className="text-sm text-[#1a56db] font-bold mt-1">
                      店鋪名稱：{detail.store.store_name}
                    </p>
                  ) : null}
                </div>

                {detail.bank_changed_since_request ? (
                  <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 font-bold">
                    夥伴在申請後修改過收款帳戶。匯款請以「目前帳戶」為準，並人工核對差異。
                  </div>
                ) : null}

                <div className="col-span-2 space-y-2">
                  <BankBlock title="目前收款帳戶（匯款用）" bank={bank} />
                  {detail.payout_snapshot &&
                  Object.keys(detail.payout_snapshot || {}).length > 0 ? (
                    <BankBlock
                      title="申請當下帳戶快照"
                      bank={detail.payout_snapshot}
                      tone="amber"
                    />
                  ) : null}
                </div>
                {detail.remittance_memo ? (
                  <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                      匯款備註
                    </p>
                    <p className="font-mono text-xs">{detail.remittance_memo}</p>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  審核備註（駁回時必填）
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 resize-none"
                  placeholder="例：帳戶資料不完整，請夥伴更新後再申請"
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
                    disabled={actionId === detail.id || !bank}
                    onClick={() => handleReview("approve")}
                    className="flex-1 py-3 bg-[#1a56db] text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                    title={!bank ? "夥伴尚未設定收款帳戶" : undefined}
                  >
                    核准提領
                  </button>
                </div>
              )}

              {detail.status === "approved" && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs text-slate-500">
                    請確認已匯入夥伴帳戶後再標記；目標於核准後 10 個工作天內完成。
                  </p>
                  <button
                    type="button"
                    disabled={actionId === detail.id}
                    onClick={() => handleReview("remit")}
                    className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                  >
                    標記已匯款
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
