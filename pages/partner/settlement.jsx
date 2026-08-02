"use client";

import { useCallback, useEffect, useState } from "react";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import MaterialIcon from "@/components/MaterialIcon";
import { usePartnerSession } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import {
  PAYOUT_FREEZE_DAYS,
  PAYOUT_MIN_WITHDRAWAL,
  PAYOUT_MAX_WITHDRAWAL,
  PAYOUT_REMITTANCE_WORKING_DAYS,
  PAYOUT_EXTRA_WITHDRAWAL_FEE,
  PAYOUT_FREE_WITHDRAWALS_PER_MONTH,
} from "@/lib/partnerPayout";

const fmt = (n) => `NT$${Math.round(Number(n) || 0).toLocaleString()}`;

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

export default function PartnerSettlementPage() {
  const { partner } = usePartnerSession();
  const [loading, setLoading] = useState(true);
  const [savingBank, setSavingBank] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [requests, setRequests] = useState([]);
  const [scheduleHint, setScheduleHint] = useState("");
  const [bank, setBank] = useState({
    bank_name: "",
    bank_code: "",
    branch_name: "",
    account_name: "",
    account_number: "",
  });
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch("/api/partner/withdrawals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "載入失敗");
      setSnapshot(data.snapshot);
      setRequests(data.requests || []);
      setScheduleHint(data.scheduleHint || "");
      if (data.bank) {
        setBank({
          bank_name: data.bank.bank_name || "",
          bank_code: data.bank.bank_code || "",
          branch_name: data.bank.branch_name || "",
          account_name: data.bank.account_name || "",
          account_number: data.bank.account_number || "",
        });
      }
      if (data.snapshot?.available >= PAYOUT_MIN_WITHDRAWAL) {
        const avail = Math.round(Number(data.snapshot.available) || 0);
        const maxW = Math.round(
          Number(data.snapshot.maxWithdrawal) || PAYOUT_MAX_WITHDRAWAL,
        );
        setAmount(String(Math.min(avail, maxW)));
      }
    } catch (err) {
      setError(err.message || "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (partner?.id) load();
  }, [partner?.id, load]);

  const saveBank = async () => {
    setSavingBank(true);
    setMessage("");
    setError("");
    try {
      const token = await getToken();
      const res = await fetch("/api/partner/bank-account", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bank),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "儲存失敗");
      setMessage("收款帳戶已儲存");
      if (data.bank) setBank({ ...bank, ...data.bank });
    } catch (err) {
      setError(err.message || "儲存失敗");
    } finally {
      setSavingBank(false);
    }
  };

  const submitWithdrawal = async () => {
    setSubmitting(true);
    setMessage("");
    setError("");
    try {
      const token = await getToken();
      const res = await fetch("/api/partner/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "申請失敗");
      setMessage(
        data.request?.fee_amount > 0
          ? `已送出提領 ${fmt(data.request?.amount)}（手續費 ${fmt(data.request.fee_amount)}，實匯 ${fmt(data.request.net_amount)}）`
          : `已送出提領申請 ${fmt(data.request?.amount)}（本月首次免手續費）`,
      );
      setSnapshot(data.snapshot);
      await load();
    } catch (err) {
      setError(err.message || "申請失敗");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PartnerAdminLayout title="結算與提領">
      <div className="px-4 sm:px-5 py-5 space-y-4 max-w-4xl">
        <div className="rounded-sm border border-[#1E4AD1]/20 bg-[#F7F9FB] p-4">
          <h2 className="text-sm font-black text-slate-800 mb-2">月結對帳單＋申請提領</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            成交月之<strong>次月 15 日</strong>產製對帳單，供雙方核對金額。
          </p>
          <p className="text-xs text-slate-600 leading-relaxed mt-2">
            實際匯款：於後台<strong>申請提領</strong>後，目標{" "}
            <strong>{PAYOUT_REMITTANCE_WORKING_DAYS} 個工作天內</strong>
            匯款。條件：訂單需滿 {PAYOUT_FREEZE_DAYS} 天、單次{" "}
            {fmt(PAYOUT_MIN_WITHDRAWAL)}～{fmt(PAYOUT_MAX_WITHDRAWAL)}；每月第{" "}
            {PAYOUT_FREE_WITHDRAWALS_PER_MONTH}{" "}
            次免手續費，之後每次扣 {fmt(PAYOUT_EXTRA_WITHDRAWAL_FEE)}。
          </p>
          {scheduleHint ? (
            <p className="text-[11px] text-slate-500 mt-2">{scheduleHint}</p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-bold">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 font-bold">
            {message}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: "可提領餘額",
              value: loading ? "…" : fmt(snapshot?.available),
              hint: `已扣凍結 ${snapshot?.freezeDays ?? PAYOUT_FREEZE_DAYS} 天內訂單`,
            },
            {
              label: "已申請／已匯保留",
              value: loading ? "…" : fmt(snapshot?.reserved),
              hint: "含審核中、已核准、已匯款",
            },
            {
              label: "本次手續費",
              value: loading
                ? "…"
                : snapshot?.nextFee
                  ? fmt(snapshot.nextFee)
                  : "免手續費",
              hint: `本月已申請 ${snapshot?.requestsThisMonth ?? 0} 次；第 ${PAYOUT_FREE_WITHDRAWALS_PER_MONTH} 次後每次 ${fmt(PAYOUT_EXTRA_WITHDRAWAL_FEE)}`,
            },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-sm border border-slate-200 bg-white p-4"
            >
              <p className="text-[11px] font-bold text-slate-500">{c.label}</p>
              <p className="text-xl font-black text-[#1E4AD1] mt-1">{c.value}</p>
              <p className="text-[10px] text-slate-400 mt-1">{c.hint}</p>
            </div>
          ))}
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MaterialIcon name="account_balance" size={18} className="text-[#1E4AD1]" />
            <h3 className="text-sm font-black text-slate-800">收款帳戶</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ["bank_name", "銀行名稱 *"],
              ["bank_code", "銀行代碼"],
              ["branch_name", "分行"],
              ["account_name", "戶名 *"],
              ["account_number", "帳號 *"],
            ].map(([key, label]) => (
              <label key={key} className="block text-xs">
                <span className="font-bold text-slate-600">{label}</span>
                <input
                  value={bank[key] || ""}
                  onChange={(e) =>
                    setBank((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="mt-1 w-full border border-slate-200 rounded-sm px-2.5 py-2 text-sm font-bold outline-none focus:border-[#1E4AD1]"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={savingBank}
            onClick={saveBank}
            className="text-sm font-bold bg-[#1E4AD1] text-white px-4 py-2 rounded-sm hover:bg-[#1344b5] disabled:opacity-50"
          >
            {savingBank ? "儲存中…" : "儲存帳戶"}
          </button>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MaterialIcon name="payments" size={18} className="text-[#1E4AD1]" />
            <h3 className="text-sm font-black text-slate-800">申請提領</h3>
          </div>
          {snapshot?.blockReason ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-sm px-3 py-2">
              {snapshot.blockReason}
            </p>
          ) : null}
          {snapshot?.nextFee > 0 ? (
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-sm px-3 py-2">
              本次將扣除手續費 {fmt(snapshot.nextFee)}，實匯約{" "}
              {fmt(
                Math.max(
                  0,
                  Math.round(Number(amount) || 0) - Number(snapshot.nextFee),
                ),
              )}
              。
            </p>
          ) : (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-sm px-3 py-2">
              本月尚有免手續費提領名額。
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs">
              <span className="font-bold text-slate-600">提領金額（NT$）</span>
              <input
                type="number"
                min={PAYOUT_MIN_WITHDRAWAL}
                max={PAYOUT_MAX_WITHDRAWAL}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-40 border border-slate-200 rounded-sm px-2.5 py-2 text-sm font-black outline-none focus:border-[#1E4AD1]"
              />
            </label>
            <button
              type="button"
              disabled={submitting || !snapshot?.canRequest}
              onClick={submitWithdrawal}
              className="text-sm font-bold bg-emerald-600 text-white px-4 py-2 rounded-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "送出中…" : "一鍵申請提領"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            送出後狀態為「審核中」；核准後目標於{" "}
            {PAYOUT_REMITTANCE_WORKING_DAYS}{" "}
            個工作天內匯款（遇金融機構非營業日得順延）。
          </p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-800">提領紀錄</h3>
          </div>
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">載入中…</p>
          ) : !requests.length ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              尚無提領申請
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">申請時間</th>
                    <th className="px-3 py-2 text-right font-bold">申請金額</th>
                    <th className="px-3 py-2 text-right font-bold">手續費</th>
                    <th className="px-3 py-2 text-right font-bold">實匯</th>
                    <th className="px-3 py-2 text-left font-bold">狀態</th>
                    <th className="px-3 py-2 text-left font-bold">備註</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-slate-600">
                        {r.requested_at
                          ? new Date(r.requested_at).toLocaleString("zh-TW", {
                              timeZone: "Asia/Taipei",
                            })
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-[#1E4AD1]">
                        {fmt(r.amount)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {r.fee_amount > 0 ? fmt(r.fee_amount) : "免"}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-800">
                        {fmt(r.net_amount ?? Math.max(0, (r.amount || 0) - (r.fee_amount || 0)))}
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-700">
                        {r.status_label || r.status}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {r.remittance_memo || r.admin_note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PartnerAdminLayout>
  );
}
