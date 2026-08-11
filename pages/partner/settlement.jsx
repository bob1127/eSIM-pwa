"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import MaterialIcon from "@/components/MaterialIcon";
import {
  ShopifyDropdown,
  ShopifyTabs,
  ShopifyPagination,
} from "@/components/partner/ShopifyControls";
import { usePartnerSession } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import StatusIconBadge from "@/components/partner/StatusIconBadge";
import {
  PAYOUT_FREEZE_DAYS,
  PAYOUT_MIN_WITHDRAWAL,
  PAYOUT_MAX_WITHDRAWAL,
  PAYOUT_REMITTANCE_WORKING_DAYS,
  PAYOUT_EXTRA_WITHDRAWAL_FEE,
  PAYOUT_FREE_WITHDRAWALS_PER_MONTH,
  PAYOUT_METHODS,
  normalizePayoutMethod,
  getPayoutMethodLabel,
} from "@/lib/partnerPayout";

/** 結算頁：深灰／淺灰／白 + 小圓角；狀態徽章用特殊色 */
const UI = {
  dark: "#2d2d2d",
  mid: "#5c5c5c",
  soft: "#8a8a8a",
  border: "#e5e5e5",
  light: "#f0f0f0",
  wash: "#f6f6f6",
  white: "#ffffff",
  radius: "0.5rem", // 8px 小圓角
  radiusSm: "0.375rem", // 6px
};

const PAGE_SIZE = 8;

const fmt = (n) => `NT$${Math.round(Number(n) || 0).toLocaleString()}`;

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "remitted") return "success";
  if (s === "approved") return "info";
  if (s === "pending") return "warning";
  if (s === "rejected" || s === "cancelled") return "critical";
  return "neutral";
}

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

function MetricCard({ label, value, hint, icon, iconBg, onHintClick }) {
  return (
    <Card className="px-4 py-3.5 flex-1 min-w-[140px]">
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
        {value}
      </p>
      {hint ? (
        onHintClick ? (
          <button
            type="button"
            onClick={onHintClick}
            className="mt-1 inline-flex items-center gap-0.5 text-[11px] leading-snug font-semibold hover:underline underline-offset-2 text-left"
            style={{ color: UI.mid }}
          >
            {hint}
            <MaterialIcon name="info" size={14} style={{ color: UI.soft }} />
          </button>
        ) : (
          <p className="text-[11px] mt-1 leading-snug" style={{ color: UI.soft }}>
            {hint}
          </p>
        )
      ) : null}
    </Card>
  );
}

/** 可提領餘額 — 凍結天數說明彈窗 */
function FreezeInfoModal({ open, snapshot, onClose }) {
  if (!open) return null;
  const days = snapshot?.freezeDays ?? PAYOUT_FREEZE_DAYS;
  const cutoff = snapshot?.freezeCutoffIso
    ? new Date(snapshot.freezeCutoffIso).toLocaleDateString("zh-TW", {
        timeZone: "Asia/Taipei",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : null;

  const rows = [
    {
      label: "累計可結算分潤",
      value: fmt(snapshot?.totalEarned),
      note: "已完成且未退款訂單之分潤加總",
    },
    {
      label: `${days} 天內尚未計入`,
      value: fmt(snapshot?.heldInFreeze),
      note: "保護期內訂單，暫不可提領",
    },
    {
      label: "已申請／已匯保留",
      value: fmt(snapshot?.reserved),
      note: "審核中、已核准或已匯款金額",
    },
    {
      label: "目前可提領餘額",
      value: fmt(snapshot?.available),
      note: "累計 − 保護期 − 已保留",
      emphasize: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-md max-h-[85vh] shadow-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: UI.white,
          borderRadius: UI.radius,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="freeze-info-title"
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${UI.border}` }}
        >
          <div>
            <p
              id="freeze-info-title"
              className="text-sm font-black"
              style={{ color: UI.dark }}
            >
              為什麼會扣除 {days} 天內訂單？
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: UI.soft }}>
              可提領餘額計算說明
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-black/5 transition"
            style={{ borderRadius: UI.radiusSm }}
            aria-label="關閉"
          >
            <MaterialIcon name="close" size={18} style={{ color: UI.mid }} />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <p className="text-xs leading-relaxed" style={{ color: UI.mid }}>
            為降低退款／爭議風險，訂單需自成立日起滿{" "}
            <strong style={{ color: UI.dark }}>{days} 個日曆天</strong>
            後，其分潤才會計入可提領餘額。保護期內的分潤仍會保留在您的帳戶，到期後自動釋出。
          </p>
          {cutoff ? (
            <p
              className="text-[11px] px-3 py-2"
              style={{
                borderRadius: UI.radiusSm,
                backgroundColor: UI.light,
                border: `1px solid ${UI.border}`,
                color: UI.soft,
              }}
            >
              目前計入截止日：{cutoff}（含）以前完成的訂單
            </p>
          ) : null}

          <div
            className="rounded-sm overflow-hidden"
            style={{ border: `1px solid ${UI.border}` }}
          >
            {rows.map((r, i) => (
              <div
                key={r.label}
                className="flex items-start justify-between gap-3 px-3 py-2.5"
                style={{
                  borderTop: i === 0 ? undefined : `1px solid ${UI.border}`,
                  backgroundColor: r.emphasize ? UI.light : UI.white,
                }}
              >
                <div>
                  <p
                    className={`text-xs ${r.emphasize ? "font-black" : "font-bold"}`}
                    style={{ color: UI.dark }}
                  >
                    {r.label}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: UI.soft }}>
                    {r.note}
                  </p>
                </div>
                <p
                  className={`text-sm tabular-nums shrink-0 ${
                    r.emphasize ? "font-black" : "font-bold"
                  }`}
                  style={{ color: r.emphasize ? "#008060" : UI.dark }}
                >
                  {r.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="px-4 py-3"
          style={{ borderTop: `1px solid ${UI.border}` }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full h-9 text-sm font-bold transition hover:opacity-90"
            style={{
              borderRadius: UI.radiusSm,
              backgroundColor: UI.dark,
              color: UI.white,
            }}
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}

function toCsvValue(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadWithdrawalsCsv(rows) {
  const header = ["申請時間", "申請金額", "手續費", "實匯", "狀態", "備註"];
  const body = rows.map((r) => [
    r.requested_at
      ? new Date(r.requested_at).toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
        })
      : "",
    Math.round(Number(r.amount) || 0),
    r.fee_amount > 0 ? Math.round(Number(r.fee_amount) || 0) : "免",
    Math.round(
      Number(r.net_amount) ||
        Math.max(0, (r.amount || 0) - (r.fee_amount || 0)),
    ),
    r.status_label || r.status || "",
    r.remittance_memo || r.admin_note || "",
  ]);
  const csv = [header, ...body]
    .map((row) => row.map(toCsvValue).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `提領紀錄_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 單筆提領詳情彈窗 */
function WithdrawalDetailModal({ open, row, onClose }) {
  if (!open || !row) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-md max-h-[85vh] shadow-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: UI.white,
          borderRadius: UI.radius,
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${UI.border}` }}
        >
          <div>
            <p className="text-sm font-black" style={{ color: UI.dark }}>
              提領詳情
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: UI.soft }}>
              {row.requested_at
                ? new Date(row.requested_at).toLocaleString("zh-TW", {
                    timeZone: "Asia/Taipei",
                  })
                : "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-black/5 transition"
            style={{ borderRadius: UI.radiusSm }}
          >
            <MaterialIcon name="close" size={18} style={{ color: UI.mid }} />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: UI.soft }}>
              狀態
            </span>
            <StatusIconBadge
              tone={statusTone(row.status)}
              label={row.status_label || row.status}
            />
          </div>
          {[
            ["申請金額", fmt(row.amount)],
            ["手續費", row.fee_amount > 0 ? fmt(row.fee_amount) : "免手續費"],
            [
              "實匯金額",
              fmt(
                row.net_amount ??
                  Math.max(0, (row.amount || 0) - (row.fee_amount || 0)),
              ),
            ],
            ["備註", row.remittance_memo || row.admin_note || "—"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-start justify-between gap-3 py-2"
              style={{ borderTop: `1px solid ${UI.border}` }}
            >
              <span className="text-xs font-bold shrink-0" style={{ color: UI.soft }}>
                {label}
              </span>
              <span
                className="text-sm font-bold text-right"
                style={{ color: UI.dark }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
        <div
          className="px-4 py-3 flex justify-end"
          style={{ borderTop: `1px solid ${UI.border}` }}
        >
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 text-xs font-bold"
            style={{
              borderRadius: UI.radiusSm,
              border: `1px solid ${UI.border}`,
              backgroundColor: UI.light,
              color: UI.dark,
            }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
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
    payout_method: "tw_bank",
    bank_name: "",
    bank_code: "",
    branch_name: "",
    account_name: "",
    account_number: "",
    payout_note: "",
  });
  const [amount, setAmount] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [detailRow, setDetailRow] = useState(null);
  const [freezeInfoOpen, setFreezeInfoOpen] = useState(false);

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
          payout_method: normalizePayoutMethod(data.bank.payout_method),
          bank_name: data.bank.bank_name || "",
          bank_code: data.bank.bank_code || "",
          branch_name: data.bank.branch_name || "",
          account_name: data.bank.account_name || "",
          account_number: data.bank.account_number || "",
          payout_note: data.bank.payout_note || "",
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

  useEffect(() => {
    setPage(1);
  }, [tab]);

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
      setMessage(data.warning || "收款帳戶已儲存");
      if (data.bank) {
        setBank((prev) => ({
          ...prev,
          ...data.bank,
          payout_method: normalizePayoutMethod(
            data.bank.payout_method || prev.payout_method,
          ),
          payout_note: data.bank.payout_note ?? prev.payout_note ?? "",
        }));
      }
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

  const filteredRequests = useMemo(() => {
    if (tab === "all") return requests;
    return requests.filter(
      (r) => String(r.status || "").toLowerCase() === tab,
    );
  }, [requests, tab]);

  const statusCounts = useMemo(() => {
    let pending = 0;
    let remitted = 0;
    for (const r of requests) {
      const s = String(r.status || "").toLowerCase();
      if (s === "pending") pending += 1;
      if (s === "remitted") remitted += 1;
    }
    return { all: requests.length, pending, remitted };
  }, [requests]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRequests.slice(start, start + PAGE_SIZE);
  }, [filteredRequests, safePage]);

  const tabs = [
    { id: "all", label: "全部", count: statusCounts.all },
    { id: "pending", label: "審核中", count: statusCounts.pending },
    { id: "remitted", label: "已匯款", count: statusCounts.remitted },
  ];

  const exportMenu = [
    {
      id: "csv",
      label: "匯出提領紀錄 CSV",
      icon: "download",
      disabled: !requests.length,
      onClick: () => downloadWithdrawalsCsv(requests),
    },
    {
      id: "csv-filtered",
      label: "匯出目前篩選",
      icon: "filter_list",
      disabled: !filteredRequests.length,
      onClick: () => downloadWithdrawalsCsv(filteredRequests),
    },
  ];

  const moreMenu = [
    {
      id: "refresh",
      label: loading ? "重新整理中…" : "重新整理",
      icon: "refresh",
      disabled: loading,
      onClick: load,
    },
  ];

  const inputClass =
    "mt-1 w-full px-2.5 py-2 text-sm font-bold outline-none transition";
  const inputStyle = {
    border: `1px solid ${UI.border}`,
    borderRadius: UI.radiusSm,
    color: UI.dark,
    backgroundColor: UI.white,
  };

  return (
    <PartnerAdminLayout title="結算與提領">
      <div
        className="px-4 sm:px-6 pt-5 pb-24 md:pb-6 space-y-4"
        style={{ backgroundColor: UI.wash }}
      >
        {/* 頁首 */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1
              className="text-xl font-black tracking-tight"
              style={{ color: UI.dark }}
            >
              結算與提領
            </h1>
            <p className="text-xs sm:text-sm mt-1 max-w-xl" style={{ color: UI.mid }}>
              月結對帳單＋申請提領。成交月之次月 15 日產製對帳單；申請後目標{" "}
              {PAYOUT_REMITTANCE_WORKING_DAYS}{" "}
              個工作天內匯款。已匯提領會自對帳單「本期應匯」扣減，不會重複給付。
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ShopifyDropdown
              label="匯出"
              icon="download"
              items={exportMenu}
            />
            <ShopifyDropdown label="更多操作" items={moreMenu} />
          </div>
        </div>

        {/* 規則說明（特殊色提示） */}
        <Card
          className="px-4 py-3.5 text-xs leading-relaxed"
          style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}
        >
          <p className="font-bold mb-1" style={{ color: "#92400e" }}>
            提領規則
          </p>
          <p style={{ color: "#78350f" }}>
            訂單需滿 {PAYOUT_FREEZE_DAYS} 天、單次{" "}
            {fmt(PAYOUT_MIN_WITHDRAWAL)}～{fmt(PAYOUT_MAX_WITHDRAWAL)}；每月第{" "}
            {PAYOUT_FREE_WITHDRAWALS_PER_MONTH} 次免手續費，之後每次扣{" "}
            {fmt(PAYOUT_EXTRA_WITHDRAWAL_FEE)}。
            {scheduleHint ? ` ${scheduleHint}` : ""}
          </p>
        </Card>

        {error ? (
          <div
            className="px-3 py-2 text-xs font-bold"
            style={{
              borderRadius: UI.radius,
              border: "1px solid #fecaca",
              backgroundColor: "#fef2f2",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        ) : null}
        {message ? (
          <div
            className="px-3 py-2 text-xs font-bold"
            style={{
              borderRadius: UI.radius,
              border: "1px solid #a7f3d0",
              backgroundColor: "#ecfdf5",
              color: "#047857",
            }}
          >
            {message}
          </div>
        ) : null}

        {/* KPI 卡片（圖示用特殊色） */}
        <div className="flex flex-wrap gap-3">
          <MetricCard
            label="可提領餘額"
            value={loading ? "…" : fmt(snapshot?.available)}
            hint={`已扣除 ${snapshot?.freezeDays ?? PAYOUT_FREEZE_DAYS} 天內訂單`}
            onHintClick={() => setFreezeInfoOpen(true)}
            icon="account_balance_wallet"
            iconBg="#008060"
          />
          <MetricCard
            label="已申請／已匯保留"
            value={loading ? "…" : fmt(snapshot?.reserved)}
            hint="含審核中、已核准、已匯款"
            icon="lock"
            iconBg="#2c6ecb"
          />
          <MetricCard
            label="本次手續費"
            value={
              loading
                ? "…"
                : snapshot?.nextFee
                  ? fmt(snapshot.nextFee)
                  : "免手續費"
            }
            hint={`本月已申請 ${snapshot?.requestsThisMonth ?? 0} 次；第 ${PAYOUT_FREE_WITHDRAWALS_PER_MONTH} 次後每次 ${fmt(PAYOUT_EXTRA_WITHDRAWAL_FEE)}`}
            icon="payments"
            iconBg="#eec200"
          />
        </div>

        {/* 兩欄：申請提領 + 收款帳戶（比照 Shopify 主欄／側欄） */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 flex items-center justify-center"
                style={{ backgroundColor: "#008060", borderRadius: UI.radiusSm }}
              >
                <MaterialIcon name="payments" size={16} className="text-white" />
              </div>
              <h3 className="text-sm font-black" style={{ color: UI.dark }}>
                申請提領
              </h3>
            </div>

            {snapshot?.blockReason ? (
              <p
                className="text-xs px-3 py-2"
                style={{
                  borderRadius: UI.radiusSm,
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                }}
              >
                {snapshot.blockReason}
              </p>
            ) : null}

            {snapshot?.nextFee > 0 ? (
              <p
                className="text-xs px-3 py-2"
                style={{
                  borderRadius: UI.radiusSm,
                  backgroundColor: UI.light,
                  border: `1px solid ${UI.border}`,
                  color: UI.mid,
                }}
              >
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
              <p
                className="text-xs px-3 py-2"
                style={{
                  borderRadius: UI.radiusSm,
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#047857",
                }}
              >
                本月尚有免手續費提領名額。
              </p>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs block">
                <span className="font-bold" style={{ color: UI.mid }}>
                  提領金額（NT$）
                </span>
                <input
                  type="number"
                  min={PAYOUT_MIN_WITHDRAWAL}
                  max={PAYOUT_MAX_WITHDRAWAL}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputClass}
                  style={{ ...inputStyle, width: "10rem" }}
                />
              </label>
              <button
                type="button"
                disabled={submitting || !snapshot?.canRequest}
                onClick={submitWithdrawal}
                className="h-9 px-4 text-xs font-bold text-white disabled:opacity-50 transition"
                style={{
                  backgroundColor: "#008060",
                  borderRadius: UI.radiusSm,
                }}
              >
                {submitting ? "送出中…" : "一鍵申請提領"}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: UI.soft }}>
              送出後狀態為「審核中」；核准後目標於{" "}
              {PAYOUT_REMITTANCE_WORKING_DAYS}{" "}
              個工作天內匯款（遇金融機構非營業日得順延）。
            </p>
          </Card>

          <Card className="lg:col-span-2 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 flex items-center justify-center"
                style={{ backgroundColor: UI.dark, borderRadius: UI.radiusSm }}
              >
                <MaterialIcon
                  name="account_balance"
                  size={16}
                  className="text-white"
                />
              </div>
              <div>
                <h3 className="text-sm font-black" style={{ color: UI.dark }}>
                  收款帳戶
                </h3>
                <p className="text-[10px]" style={{ color: UI.soft }}>
                  可依需求選擇匯款方式
                </p>
              </div>
            </div>

            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: UI.soft }}
              >
                收款方式
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PAYOUT_METHODS.map((m) => {
                  const active =
                    normalizePayoutMethod(bank.payout_method) === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setBank((prev) => ({
                          ...prev,
                          payout_method: m.id,
                          bank_name:
                            m.id === "line_pay"
                              ? prev.bank_name || "LINE Pay"
                              : m.id === "paypal"
                                ? prev.bank_name || "PayPal"
                                : m.id === "other"
                                  ? prev.bank_name || "其他收款方式"
                                  : prev.bank_name === "LINE Pay" ||
                                      prev.bank_name === "PayPal" ||
                                      prev.bank_name === "其他收款方式"
                                    ? ""
                                    : prev.bank_name,
                        }))
                      }
                      className="px-2.5 py-1.5 text-[11px] font-bold transition"
                      style={{
                        borderRadius: UI.radiusSm,
                        border: `1px solid ${active ? UI.dark : UI.border}`,
                        backgroundColor: active ? UI.dark : UI.white,
                        color: active ? UI.white : UI.mid,
                      }}
                      title={m.desc}
                    >
                      {m.short}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: UI.soft }}>
                {
                  PAYOUT_METHODS.find(
                    (m) => m.id === normalizePayoutMethod(bank.payout_method),
                  )?.desc
                }
              </p>
            </div>

            <div className="space-y-2.5">
              {(() => {
                const method = normalizePayoutMethod(bank.payout_method);
                const fields =
                  method === "tw_bank"
                    ? [
                        ["bank_name", "銀行名稱 *"],
                        ["bank_code", "銀行代碼"],
                        ["branch_name", "分行"],
                        ["account_name", "戶名 *"],
                        ["account_number", "帳號 *"],
                      ]
                    : method === "overseas_bank"
                      ? [
                          ["bank_name", "銀行名稱 *"],
                          ["bank_code", "SWIFT／BIC *"],
                          ["branch_name", "國家／地區"],
                          ["account_name", "戶名 *"],
                          ["account_number", "帳號／IBAN *"],
                        ]
                      : method === "line_pay"
                        ? [
                            ["account_name", "收款人姓名 *"],
                            ["account_number", "LINE Pay 手機／帳號 *"],
                          ]
                        : method === "paypal"
                          ? [
                              ["account_name", "收款人姓名 *"],
                              ["account_number", "PayPal Email *"],
                            ]
                          : [["account_name", "收款人／聯絡姓名 *"]];

                return (
                  <>
                    {fields.map(([key, label]) => (
                      <label key={key} className="block text-xs">
                        <span className="font-bold" style={{ color: UI.mid }}>
                          {label}
                        </span>
                        <input
                          value={bank[key] || ""}
                          onChange={(e) =>
                            setBank((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          className={inputClass}
                          style={inputStyle}
                          placeholder={
                            key === "account_number" && method === "paypal"
                              ? "name@example.com"
                              : undefined
                          }
                        />
                      </label>
                    ))}
                    {(method === "overseas_bank" ||
                      method === "other" ||
                      method === "line_pay") && (
                      <label className="block text-xs">
                        <span className="font-bold" style={{ color: UI.mid }}>
                          {method === "other"
                            ? "其他說明 *（匯款管道、帳號、注意事項）"
                            : "補充說明（選填）"}
                        </span>
                        <textarea
                          value={bank.payout_note || ""}
                          onChange={(e) =>
                            setBank((prev) => ({
                              ...prev,
                              payout_note: e.target.value,
                            }))
                          }
                          rows={method === "other" ? 4 : 2}
                          className={inputClass}
                          style={{ ...inputStyle, resize: "vertical" }}
                          placeholder={
                            method === "other"
                              ? "例：請匯至某某錢包／超商代碼，聯絡 LINE：xxx"
                              : method === "overseas_bank"
                                ? "例：中間行、地址、幣別需求"
                                : "例：收款備註"
                          }
                        />
                      </label>
                    )}
                  </>
                );
              })()}
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: UI.soft }}>
              目前選擇：
              <span className="font-bold" style={{ color: UI.dark }}>
                {getPayoutMethodLabel(bank.payout_method)}
              </span>
              。非台灣銀行匯款可能需較長作業時間，平台會與您確認後再匯。
            </p>
            <button
              type="button"
              disabled={savingBank}
              onClick={saveBank}
              className="h-9 px-4 text-xs font-bold text-white disabled:opacity-50 transition w-full sm:w-auto"
              style={{
                backgroundColor: UI.dark,
                borderRadius: UI.radiusSm,
              }}
            >
              {savingBank ? "儲存中…" : "儲存帳戶"}
            </button>
          </Card>
        </div>

        {/* 提領紀錄表 */}
        <Card className="overflow-hidden">
          <div
            className="flex items-center justify-between gap-3 px-3 sm:px-4 pt-1"
          >
            <div className="min-w-0 flex-1">
              <ShopifyTabs tabs={tabs} value={tab} onChange={setTab} />
            </div>
          </div>

          {loading ? (
            <p
              className="px-4 py-10 text-center text-sm"
              style={{ color: UI.soft }}
            >
              載入中…
            </p>
          ) : !paged.length ? (
            <p
              className="px-4 py-10 text-center text-sm"
              style={{ color: UI.soft }}
            >
              尚無提領申請
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr
                    className="text-[10px] uppercase tracking-wider"
                    style={{ backgroundColor: UI.light, color: UI.soft }}
                  >
                    <th className="px-4 py-2.5 text-left font-bold">申請時間</th>
                    <th className="px-4 py-2.5 text-right font-bold">申請金額</th>
                    <th className="px-4 py-2.5 text-right font-bold">手續費</th>
                    <th className="px-4 py-2.5 text-right font-bold">實匯</th>
                    <th className="px-4 py-2.5 text-left font-bold">狀態</th>
                    <th className="px-4 py-2.5 text-center font-bold w-14">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
                    <tr
                      key={r.id}
                      style={{ borderTop: `1px solid ${UI.border}` }}
                    >
                      <td className="px-4 py-3 text-xs" style={{ color: UI.mid }}>
                        {r.requested_at
                          ? new Date(r.requested_at).toLocaleString("zh-TW", {
                              timeZone: "Asia/Taipei",
                            })
                          : "—"}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-bold tabular-nums"
                        style={{ color: UI.dark }}
                      >
                        {fmt(r.amount)}
                      </td>
                      <td
                        className="px-4 py-3 text-right text-xs"
                        style={{ color: UI.mid }}
                      >
                        {r.fee_amount > 0 ? fmt(r.fee_amount) : "免"}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-black tabular-nums"
                        style={{ color: UI.dark }}
                      >
                        {fmt(
                          r.net_amount ??
                            Math.max(
                              0,
                              (r.amount || 0) - (r.fee_amount || 0),
                            ),
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusIconBadge
                          tone={statusTone(r.status)}
                          label={r.status_label || r.status}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setDetailRow(r)}
                          className="w-8 h-8 inline-flex items-center justify-center transition"
                          style={{
                            borderRadius: UI.radiusSm,
                            border: `1px solid ${UI.border}`,
                            backgroundColor: UI.light,
                            color: UI.dark,
                          }}
                          aria-label="查看提領詳情"
                          title="查看詳情"
                        >
                          <MaterialIcon name="edit" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredRequests.length > 0 ? (
            <ShopifyPagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={filteredRequests.length}
              onChange={setPage}
            />
          ) : null}
        </Card>
      </div>

      <WithdrawalDetailModal
        open={!!detailRow}
        row={detailRow}
        onClose={() => setDetailRow(null)}
      />
      <FreezeInfoModal
        open={freezeInfoOpen}
        snapshot={snapshot}
        onClose={() => setFreezeInfoOpen(false)}
      />
    </PartnerAdminLayout>
  );
}
