"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
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
import PartnerInfoTimeline from "@/components/partner/PartnerInfoTimeline";
import WalletIcon from "@/components/icons/wallet-icon";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import ClockIcon from "@/components/icons/clock-icon";
import CreditCardIcon from "@/components/icons/credit-card-icon";
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
  validateWithdrawalAmount,
  isPayoutAccountComplete,
  WITHDRAWAL_STATUS_LABEL,
  feeForNextWithdrawal,
  netRemitAmount,
  sumWithdrawalReserved,
  freezeCutoffIso,
} from "@/lib/partnerPayout";
import PartnerDialog from "@/components/partner/ui/PartnerDialog";
import PartnerButton from "@/components/partner/ui/PartnerButton";

/**
 * 結算頁 UI 假資料預覽（不寫資料庫）。
 * 試完改 false；或網址加 ?demo=0 關閉、?demo=1 強制開啟。
 */
const FORCE_SETTLEMENT_DEMO = true;

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

function daysAgoIso(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 30, 0, 0);
  return d.toISOString();
}

function mapDemoRequest(r) {
  const fee = Math.round(Number(r.fee_amount) || 0);
  const amount = Math.round(Number(r.amount) || 0);
  return {
    ...r,
    fee_amount: fee,
    net_amount: netRemitAmount(amount, fee),
    status_label: WITHDRAWAL_STATUS_LABEL[r.status] || r.status || "未知",
  };
}

/** 假資料：多筆狀態＋足夠可提領，方便測匯出／分頁／申請流程（僅前端） */
function buildSettlementDemo() {
  const raw = [
    {
      id: "demo-w-01",
      amount: 5000,
      fee_amount: 0,
      status: "remitted",
      requested_at: daysAgoIso(48),
      remitted_at: daysAgoIso(42),
      remittance_memo: "已匯至玉山銀行（假資料）",
    },
    {
      id: "demo-w-02",
      amount: 8000,
      fee_amount: 15,
      status: "remitted",
      requested_at: daysAgoIso(40),
      remitted_at: daysAgoIso(35),
      remittance_memo: "本月第 2 次提領手續費",
    },
    {
      id: "demo-w-03",
      amount: 12000,
      fee_amount: 0,
      status: "remitted",
      requested_at: daysAgoIso(32),
      remitted_at: daysAgoIso(28),
      remittance_memo: "",
    },
    {
      id: "demo-w-04",
      amount: 4500,
      fee_amount: 0,
      status: "approved",
      requested_at: daysAgoIso(12),
      processed_at: daysAgoIso(10),
      admin_note: "已核准，待財務排匯",
    },
    {
      id: "demo-w-05",
      amount: 6000,
      fee_amount: 0,
      status: "rejected",
      requested_at: daysAgoIso(20),
      processed_at: daysAgoIso(19),
      admin_note: "帳戶資料不符，請更新後再申請（假資料）",
    },
    {
      id: "demo-w-06",
      amount: 3500,
      fee_amount: 0,
      status: "remitted",
      requested_at: daysAgoIso(55),
      remitted_at: daysAgoIso(50),
    },
    {
      id: "demo-w-07",
      amount: 7000,
      fee_amount: 15,
      status: "remitted",
      requested_at: daysAgoIso(60),
      remitted_at: daysAgoIso(55),
    },
    {
      id: "demo-w-08",
      amount: 4000,
      fee_amount: 0,
      status: "remitted",
      requested_at: daysAgoIso(70),
      remitted_at: daysAgoIso(65),
    },
    {
      id: "demo-w-09",
      amount: 9000,
      fee_amount: 0,
      status: "cancelled",
      requested_at: daysAgoIso(25),
      admin_note: "夥伴自行取消（假資料）",
    },
    {
      id: "demo-w-10",
      amount: 10000,
      fee_amount: 0,
      status: "remitted",
      requested_at: daysAgoIso(85),
      remitted_at: daysAgoIso(80),
    },
  ];
  const requests = raw.map(mapDemoRequest);
  const reserved = sumWithdrawalReserved(requests);
  const available = 12800;
  const heldInFreeze = 4200;
  const earnedFrozen = available + reserved;
  const totalEarned = earnedFrozen + heldInFreeze;
  const requestsThisMonth = 0;
  const nextFee = feeForNextWithdrawal(requestsThisMonth);

  return {
    scheduleHint: "【假資料】示範月結：上月對帳單已產製，本期應匯已扣已匯提領。",
    bank: {
      payout_method: "tw_bank",
      bank_name: "玉山銀行",
      bank_code: "808",
      branch_name: "敦南分行",
      account_name: "示範夥伴",
      account_number: "123456789012",
      payout_note: "",
    },
    requests,
    snapshot: {
      totalEarned,
      earnedFrozen,
      heldInFreeze,
      reserved,
      available,
      freezeDays: PAYOUT_FREEZE_DAYS,
      freezeCutoffIso: freezeCutoffIso(new Date(), PAYOUT_FREEZE_DAYS),
      minWithdrawal: PAYOUT_MIN_WITHDRAWAL,
      maxWithdrawal: PAYOUT_MAX_WITHDRAWAL,
      requestsThisMonth,
      freeWithdrawalsPerMonth: PAYOUT_FREE_WITHDRAWALS_PER_MONTH,
      nextFee,
      extraWithdrawalFee: PAYOUT_EXTRA_WITHDRAWAL_FEE,
      canRequest: true,
      blockReason: null,
    },
  };
}

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
        className="text-xl sm:text-[24px] font-bold mt-2 tabular-nums"
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
              className="text-sm font-bold"
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
                    className={`text-xs ${r.emphasize ? "font-bold" : "font-bold"}`}
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
                    r.emphasize ? "font-bold" : "font-bold"
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
            <p className="text-sm font-bold" style={{ color: UI.dark }}>
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
  const router = useRouter();
  const { partner } = usePartnerSession();
  const demoMode = useMemo(() => {
    if (!router.isReady) return FORCE_SETTLEMENT_DEMO;
    const q = router.query.demo;
    if (q === "0" || q === "false") return false;
    if (q === "1" || q === "true") return true;
    return FORCE_SETTLEMENT_DEMO;
  }, [router.isReady, router.query.demo]);

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
  const [guardDialog, setGuardDialog] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const submitLockRef = useRef(false);

  const applyDemoData = useCallback(() => {
    const demo = buildSettlementDemo();
    setSnapshot(demo.snapshot);
    setRequests(demo.requests);
    setScheduleHint(demo.scheduleHint);
    setBank(demo.bank);
    const avail = Math.round(Number(demo.snapshot.available) || 0);
    const maxW = Math.round(
      Number(demo.snapshot.maxWithdrawal) || PAYOUT_MAX_WITHDRAWAL,
    );
    setAmount(String(Math.min(avail, maxW)));
    setError("");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (demoMode) {
        applyDemoData();
        return;
      }
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
  }, [demoMode, applyDemoData]);

  useEffect(() => {
    if (!partner?.id || !router.isReady) return;
    load();
  }, [partner?.id, router.isReady, load]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const saveBank = async () => {
    setSavingBank(true);
    setMessage("");
    setError("");
    try {
      if (demoMode) {
        setMessage("【假資料】收款帳戶已更新（未寫入資料庫）");
        return;
      }
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

  const showGuard = (title, detail) => {
    setGuardDialog({
      title: title || "無法申請提領",
      detail: detail || "目前無法申請提領。",
    });
  };

  const availableAmt = Math.max(0, Math.round(Number(snapshot?.available) || 0));
  const inputMax = Math.max(
    0,
    Math.min(availableAmt, PAYOUT_MAX_WITHDRAWAL),
  );

  const onAmountChange = (raw) => {
    const digits = String(raw || "").replace(/[^\d]/g, "");
    if (!digits) {
      setAmount("");
      return;
    }
    let n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n < 0) {
      setAmount("");
      return;
    }
    if (inputMax > 0 && n > inputMax) n = inputMax;
    setAmount(String(n));
  };

  const amountHint = useMemo(() => {
    if (!snapshot || amount === "" || amount == null) return "";
    const check = validateWithdrawalAmount(amount, snapshot);
    if (check.ok) {
      const fee = check.fee || 0;
      return fee > 0
        ? `可送出。手續費 ${fmt(fee)}，實匯約 ${fmt(check.netAmount)}。`
        : `可送出。本月首次免手續費，實匯 ${fmt(check.netAmount)}。`;
    }
    return check.error || "";
  }, [amount, snapshot]);

  const executeWithdrawal = async (safeAmount) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setMessage("");
    setError("");
    setConfirmDialog(null);
    try {
      if (demoMode) {
        const fee = Math.round(Number(snapshot?.nextFee) || 0);
        const amountN = Math.round(Number(safeAmount) || 0);
        const newReq = mapDemoRequest({
          id: `demo-w-local-${Date.now()}`,
          amount: amountN,
          fee_amount: fee,
          status: "pending",
          requested_at: new Date().toISOString(),
          admin_note: "假資料本地申請（未寫入資料庫）",
        });
        const nextRequests = [newReq, ...requests];
        const reserved = sumWithdrawalReserved(nextRequests);
        const earnedFrozen = Math.round(Number(snapshot?.earnedFrozen) || 0);
        const available = Math.max(0, earnedFrozen - reserved);
        const requestsThisMonth =
          Math.round(Number(snapshot?.requestsThisMonth) || 0) + 1;
        setRequests(nextRequests);
        setSnapshot({
          ...snapshot,
          reserved,
          available,
          requestsThisMonth,
          nextFee: feeForNextWithdrawal(requestsThisMonth),
          canRequest: false,
          blockReason: "尚有審核中的提領申請，請待處理完成後再送",
        });
        setMessage(
          fee > 0
            ? `【假資料】已送出提領 ${fmt(amountN)}（手續費 ${fmt(fee)}，實匯 ${fmt(netRemitAmount(amountN, fee))}）`
            : `【假資料】已送出提領申請 ${fmt(amountN)}（本月首次免手續費）`,
        );
        setAmount("");
        setTab("pending");
        return;
      }
      const token = await getToken();
      const res = await fetch("/api/partner/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: safeAmount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.snapshot) setSnapshot(data.snapshot);
        throw new Error(data.detail || data.error || "申請失敗");
      }
      setMessage(
        data.request?.fee_amount > 0
          ? `已送出提領 ${fmt(data.request?.amount)}（手續費 ${fmt(data.request.fee_amount)}，實匯 ${fmt(data.request.net_amount)}）`
          : `已送出提領申請 ${fmt(data.request?.amount)}（本月首次免手續費）`,
      );
      setSnapshot(data.snapshot);
      setAmount("");
      await load();
    } catch (err) {
      showGuard("申請失敗", err.message || "申請失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const submitWithdrawal = () => {
    setMessage("");
    setError("");

    if (submitting || submitLockRef.current) return;

    if (!isPayoutAccountComplete(bank)) {
      showGuard(
        "請先完成收款帳戶",
        "申請提領前須完整儲存收款帳戶資料（銀行／戶名／帳號等）。請於右側「收款帳戶」填寫並儲存後再申請。",
      );
      return;
    }

    const check = validateWithdrawalAmount(amount, snapshot);
    if (!check.ok) {
      showGuard(check.title, check.detail || check.error);
      return;
    }

    // 前端再擋一次：絕不允許 > 可提領
    if (check.amount > availableAmt) {
      showGuard(
        "超過可提領餘額",
        `可提領餘額為 ${fmt(availableAmt)}，無法申請 ${fmt(check.amount)}。系統不會允許超額提領。`,
      );
      return;
    }

    setConfirmDialog({
      amount: check.amount,
      fee: check.fee,
      net: check.netAmount,
      available: availableAmt,
    });
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
        {demoMode ? (
          <div
            className="px-3 py-2.5 text-xs sm:text-sm font-semibold leading-relaxed"
            style={{
              backgroundColor: "#fff8e6",
              border: "1px solid #e8d9a8",
              borderRadius: UI.radius,
              color: UI.dark,
            }}
          >
            目前為<strong>假資料預覽</strong>
            ：可提領餘額、提領紀錄、匯出／申請提領皆在本機模擬，不會寫入資料庫。
            試完把程式裡 <code>FORCE_SETTLEMENT_DEMO</code> 改{" "}
            <code>false</code>，或網址加 <code>?demo=0</code>。
          </div>
        ) : null}

        {/* 頁首 */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1
              className="text-xl font-bold tracking-tight"
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

        <PartnerInfoTimeline
          items={[
            {
              variant: "primary",
              title: "提領規則",
              tag: "規則",
              href: "#partner-withdraw-form",
              icons: [WalletIcon, ClockIcon, CreditCardIcon],
              body: (
                <>
                  訂單需滿 {PAYOUT_FREEZE_DAYS} 天、單次{" "}
                  {fmt(PAYOUT_MIN_WITHDRAWAL)}～{fmt(PAYOUT_MAX_WITHDRAWAL)}
                  ；每月第 {PAYOUT_FREE_WITHDRAWALS_PER_MONTH}{" "}
                  次免手續費，之後每次扣 {fmt(PAYOUT_EXTRA_WITHDRAWAL_FEE)}。
                  {scheduleHint ? ` ${scheduleHint}` : ""}
                </>
              ),
            },
            {
              variant: "notice",
              title: snapshot?.blockReason ? "提領提醒" : "申請提醒",
              tag: snapshot?.blockReason ? "注意" : "說明",
              footerHref: "#partner-withdraw-form",
              footerLabel: snapshot?.blockReason ? "查看申請條件" : "前往申請提領",
              body: snapshot?.blockReason ? (
                snapshot.blockReason
              ) : (
                <>
                  達門檻後可一鍵申請。審核通過後目標{" "}
                  {PAYOUT_REMITTANCE_WORKING_DAYS} 個工作天內匯款。
                </>
              ),
            },
          ]}
        />

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
          <Card id="partner-withdraw-form" className="lg:col-span-3 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 flex items-center justify-center"
                style={{ backgroundColor: "#008060", borderRadius: UI.radiusSm }}
              >
                <MaterialIcon name="payments" size={16} className="text-white" />
              </div>
              <h3 className="text-sm font-bold" style={{ color: UI.dark }}>
                申請提領
              </h3>
            </div>

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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={amount}
                  onChange={(e) => onAmountChange(e.target.value)}
                  className={inputClass}
                  style={{ ...inputStyle, width: "10rem" }}
                  aria-invalid={
                    !!amount &&
                    !!snapshot &&
                    !validateWithdrawalAmount(amount, snapshot).ok
                  }
                  placeholder={`${PAYOUT_MIN_WITHDRAWAL}`}
                />
              </label>
              <PartnerButton
                type="button"
                disabled={submitting || loading}
                onClick={submitWithdrawal}
              >
                {submitting ? "送出中…" : "一鍵申請提領"}
              </PartnerButton>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: UI.mid }}>
              目前可提領 {fmt(availableAmt)}
              {inputMax > 0
                ? ` · 本次最多可填 ${fmt(inputMax)}（取可提領與單次上限 ${fmt(PAYOUT_MAX_WITHDRAWAL)} 較小值）`
                : ` · 未達最低門檻 ${fmt(PAYOUT_MIN_WITHDRAWAL)}`}
            </p>
            {amountHint ? (
              <p
                className="text-[12px] leading-relaxed whitespace-pre-line"
                style={{ color: UI.dark }}
              >
                {amountHint}
              </p>
            ) : null}
            <p className="text-[11px] leading-relaxed" style={{ color: UI.soft }}>
              送出後狀態為「審核中」；核准後目標於{" "}
              {PAYOUT_REMITTANCE_WORKING_DAYS}{" "}
              個工作天內匯款（遇金融機構非營業日得順延）。最低{" "}
              {fmt(PAYOUT_MIN_WITHDRAWAL)}、單次上限 {fmt(PAYOUT_MAX_WITHDRAWAL)}。
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
                <h3 className="text-sm font-bold" style={{ color: UI.dark }}>
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
            <PartnerButton
              type="button"
              disabled={savingBank}
              onClick={saveBank}
              className="w-full sm:w-auto"
            >
              {savingBank ? "儲存中…" : "儲存帳戶"}
            </PartnerButton>
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
            <LoadingIndicator
              layout="center"
              label="載入中…"
              className="px-4 py-10"
            />
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
                        className="px-4 py-3 text-right font-bold tabular-nums"
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
      <PartnerDialog
        open={!!guardDialog}
        onClose={() => setGuardDialog(null)}
        title={guardDialog?.title || "無法申請提領"}
        maxWidth="max-w-md"
        footer={
          <PartnerButton
            type="button"
            variant="secondary"
            onClick={() => setGuardDialog(null)}
          >
            知道了
          </PartnerButton>
        }
      >
        <p
          className="text-sm leading-relaxed whitespace-pre-line"
          style={{ color: "#1a1a1a" }}
        >
          {guardDialog?.detail}
        </p>
      </PartnerDialog>

      <PartnerDialog
        open={!!confirmDialog}
        onClose={() => !submitting && setConfirmDialog(null)}
        title="確認提領申請"
        maxWidth="max-w-md"
        footer={
          <>
            <PartnerButton
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setConfirmDialog(null)}
            >
              取消
            </PartnerButton>
            <PartnerButton
              type="button"
              disabled={submitting}
              onClick={() =>
                confirmDialog && executeWithdrawal(confirmDialog.amount)
              }
            >
              {submitting ? "送出中…" : "確認送出"}
            </PartnerButton>
          </>
        }
      >
        {confirmDialog ? (
          <div className="space-y-2 text-sm leading-relaxed" style={{ color: "#1a1a1a" }}>
            <p>請確認以下金額後再送出。送出後進入審核，無法自行取消超額申請。</p>
            <ul className="space-y-1.5 border border-slate-200 rounded-md p-3 bg-slate-50">
              <li className="flex justify-between gap-3">
                <span>目前可提領</span>
                <span className="font-bold tabular-nums">
                  {fmt(confirmDialog.available)}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span>申請金額</span>
                <span className="font-bold tabular-nums">
                  {fmt(confirmDialog.amount)}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span>手續費</span>
                <span className="font-bold tabular-nums">
                  {confirmDialog.fee > 0 ? fmt(confirmDialog.fee) : "免"}
                </span>
              </li>
              <li className="flex justify-between gap-3 border-t border-slate-200 pt-1.5">
                <span>預估實匯</span>
                <span className="font-bold tabular-nums">
                  {fmt(confirmDialog.net)}
                </span>
              </li>
            </ul>
            <p className="text-[12px] text-slate-600">
              申請金額不可超過可提領餘額；伺服器會再次核對，超額會自動拒絕。
            </p>
          </div>
        ) : null}
      </PartnerDialog>
    </PartnerAdminLayout>
  );
}
