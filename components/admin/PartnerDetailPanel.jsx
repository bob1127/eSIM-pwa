"use client";

import { useEffect, useState } from "react";
import { ACCOUNT_UI } from "@/lib/accountUi";
import {
  parsePartnerType,
  parseDescriptionField,
} from "@/lib/partnerDescriptionParse";
import { bossFetch, bossFetchBlob } from "@/lib/bossAdminClient";

function defaultSettlementMonth() {
  const now = new Date();
  const taipei = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }),
  );
  const d = new Date(taipei.getFullYear(), taipei.getMonth() - 1, 1);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
  };
}

function SettlementStatementBlock({ partner }) {
  const defaults = defaultSettlementMonth();
  const [year, setYear] = useState(defaults.year);
  const [month, setMonth] = useState(defaults.month);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const openStatement = async () => {
    setBusy(true);
    setMessage("");
    try {
      const qs = new URLSearchParams({
        partner_id: String(partner.id),
        year: String(year),
        month: String(month),
        format: "html",
      });
      const { blob, filename } = await bossFetchBlob(
        `/api/admin/partner-settlement-statement?${qs}`,
      );
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || `JEKO-對帳單-${year}${String(month).padStart(2, "0")}.html`;
        a.click();
        setMessage("已下載電子對帳單（可開啟後「列印 → 儲存為 PDF」）");
      } else {
        setMessage("已開啟對帳單：按「列印／另存 PDF」即可給夥伴電子檔");
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setMessage(err.message || "產製失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-sm border border-slate-200 bg-slate-50/80 p-4 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb]">
          分潤對帳單
        </p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          選擇「成交月」產製電子對帳單，匯款前寄給夥伴確認；開啟後可列印／另存
          PDF。若夥伴曾加速提領並已匯款，對帳單會自動扣減避免重複給付。備註格式由平台匯款時填寫：
          <span className="font-mono font-bold text-slate-700">
            {" "}
            JEKO-YYYYMM-代碼
          </span>
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          <span className="block text-slate-400 font-bold mb-1">年</span>
          <input
            type="number"
            min={2024}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 border border-slate-200 rounded-sm px-2 py-1.5 text-sm font-bold"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-400 font-bold mb-1">月</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-20 border border-slate-200 rounded-sm px-2 py-1.5 text-sm font-bold"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={openStatement}
          className="text-xs font-bold bg-[#0f172a] text-white px-3 py-2 rounded-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "產製中…" : "開啟／下載對帳單"}
        </button>
      </div>
      {message && <p className="text-xs text-slate-500">{message}</p>}
    </div>
  );
}

function ReferralDiscountSettings({ partner, onUpdated }) {
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setEnabled(partner.referral_discount_enabled !== false);
    setMessage("");
  }, [partner.id]);

  const couponCode = String(
    partner.referral_code || partner.slug || "",
  ).toUpperCase();

  // 內部 Medusa 折扣碼是高熵亂數，僅供你比對／除錯用，故意只顯示片段，
  // 不建議也不需要完整顯示或外傳——旅客與夥伴看到的一律是上面的折扣碼。
  const internalCodePreview = partner.referral_medusa_code
    ? `${partner.referral_medusa_code.slice(0, 14)}…`
    : null;

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const data = await bossFetch("/api/admin/partners", {
        method: "PATCH",
        body: JSON.stringify({
          id: partner.id,
          referral_discount_enabled: enabled,
        }),
      });
      setMessage(data.warning || "已儲存，立即生效");
      onUpdated?.(data.partner);
    } catch (err) {
      setMessage(err.message || "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async () => {
    if (
      !window.confirm(
        "確定要重新產生此夥伴的內部折扣碼？\n舊碼會立即失效（若曾外流也無法再使用），旅客看到的專屬連結／折扣碼不會改變。",
      )
    ) {
      return;
    }
    setRotating(true);
    setMessage("");
    try {
      const data = await bossFetch("/api/admin/partners", {
        method: "PATCH",
        body: JSON.stringify({ id: partner.id, regenerate_discount_code: true }),
      });
      setMessage(data.warning || "已產生新的內部折扣碼，舊碼已停用");
      onUpdated?.(data.partner);
    } catch (err) {
      setMessage(err.message || "重新產生失敗");
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="border border-blue-100 bg-blue-50/40 rounded-sm p-4 space-y-3">
      <p className="text-[10px] text-slate-400 font-bold uppercase">
        專屬折扣碼開關
      </p>
      <p className="text-xs text-slate-600 leading-relaxed">
        分潤％與旅客折扣％已改為在各商品頁（依電信商）設定並寫入 Medusa。
        此處只負責開／關此夥伴的專屬折扣碼。夥伴可在後台「方案分潤一覽」查看各產品趴數。
      </p>

      <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        開啟專屬折扣碼（關閉則連結僅用於歸因分潤，旅客不會有折扣）
      </label>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        旅客／夥伴看到的折扣碼：
        <span className="font-mono font-bold text-slate-700">
          {couponCode || "—"}
        </span>
        <br />
        內部 Medusa 碼（自動建立，不對外顯示）：
        <span className="font-mono">{internalCodePreview || "尚未建立"}</span>
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-xs font-bold bg-[#0071EB] text-white px-3 py-1.5 rounded-sm hover:bg-[#1E4AD1] disabled:opacity-50"
        >
          {saving ? "儲存中…" : "儲存設定"}
        </button>
        <button
          type="button"
          onClick={handleRotate}
          disabled={rotating}
          className="text-xs font-bold bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-sm hover:bg-red-50 disabled:opacity-50"
        >
          {rotating ? "處理中…" : "重新產生折扣碼（懷疑外流時使用）"}
        </button>
        {message && <span className="text-xs text-slate-500">{message}</span>}
      </div>
    </div>
  );
}

function WithdrawalAdminBlock({ partner }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [bank, setBank] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await bossFetch(
        `/api/admin/partner-withdrawals?partner_id=${partner.id}`,
      );
      setRows(data.requests || []);
      setBank(
        data.bank ||
          data.requests?.find((r) => r.bank)?.bank ||
          null,
      );
    } catch (err) {
      setMessage(err.message || "載入提領失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner.id]);

  const patchStatus = async (id, status) => {
    setBusyId(id);
    setMessage("");
    try {
      await bossFetch("/api/admin/partner-withdrawals", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      setMessage(
        status === "remitted"
          ? "已標記匯款完成"
          : status === "approved"
            ? "已核准"
            : status === "rejected"
              ? "已拒絕"
              : "已更新",
      );
      await load();
    } catch (err) {
      setMessage(err.message || "更新失敗");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-sm border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          提領申請（加速通道）
        </p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          月結對帳單供核對金額。夥伴申請提領後請於 10
          個工作天內匯款（實匯＝申請金額−手續費），再標記已匯款。每月第 1
          次免手續費，之後每次 NT$15。
        </p>
      </div>
      {bank ? (
        <p className="text-[11px] text-slate-600 bg-white border border-slate-100 rounded-sm px-2 py-1.5">
          帳戶：{bank.bank_name} {bank.branch_name}／{bank.account_name}／
          {bank.account_number}
        </p>
      ) : (
        <p className="text-[11px] text-amber-700">夥伴尚未儲存收款帳戶</p>
      )}
      {loading ? (
        <p className="text-xs text-slate-400">載入中…</p>
      ) : !rows.length ? (
        <p className="text-xs text-slate-400">尚無提領申請</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 8).map((r) => (
            <li
              key={r.id}
              className="bg-white border border-slate-100 rounded-sm px-3 py-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-black text-[#1E4AD1]">
                  申請 NT${Number(r.amount || 0).toLocaleString()}
                  {r.fee_amount > 0
                    ? `（手續費 ${Number(r.fee_amount).toLocaleString()} → 實匯 ${Number(r.net_amount || r.amount - r.fee_amount).toLocaleString()}）`
                    : "（免手續費）"}
                </span>
                <span className="font-bold text-slate-700">
                  {r.status_label || r.status}
                </span>
              </div>
              <p className="text-slate-400 mt-0.5">
                {r.requested_at
                  ? new Date(r.requested_at).toLocaleString("zh-TW", {
                      timeZone: "Asia/Taipei",
                    })
                  : ""}
                {r.remittance_memo ? ` · ${r.remittance_memo}` : ""}
              </p>
              {r.status === "pending" ? (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => patchStatus(r.id, "approved")}
                    className="text-[11px] font-bold px-2 py-1 rounded-sm bg-emerald-600 text-white disabled:opacity-50"
                  >
                    核准
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => patchStatus(r.id, "rejected")}
                    className="text-[11px] font-bold px-2 py-1 rounded-sm bg-white border border-red-200 text-red-600 disabled:opacity-50"
                  >
                    拒絕
                  </button>
                </div>
              ) : null}
              {r.status === "approved" ? (
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => patchStatus(r.id, "remitted")}
                  className="mt-2 text-[11px] font-bold px-2 py-1 rounded-sm bg-[#1E4AD1] text-white disabled:opacity-50"
                >
                  標記已匯款
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {message ? <p className="text-[11px] text-slate-500">{message}</p> : null}
    </div>
  );
}

export default function PartnerDetailPanel({ partner, onClose, onUpdated }) {
  if (!partner) return null;

  const lines = (partner.description || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const isReferral = partner.cooperation_model === "referral";

  return (
    <div className={ACCOUNT_UI.modalOverlayBottom}>
      <div className="bg-white rounded-sm shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-[#2563eb] uppercase">申請詳情</p>
            <h3 className="text-lg font-black text-slate-900">{partner.name}</h3>
            <p className="text-sm text-slate-500">{partner.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2"
          >
            ×
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-sm p-3">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">合作類型</p>
              <p className="font-bold text-slate-800">{parsePartnerType(partner.description)}</p>
            </div>
            <div className="bg-slate-50 rounded-sm p-3">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">專屬網址</p>
              <p className="font-mono text-[#2563eb] font-bold text-xs">
                {isReferral
                  ? `/r/${partner.referral_code || partner.slug}`
                  : `/p/${partner.slug}`}
              </p>
            </div>
            {parseDescriptionField(partner.description, "聯絡人") && (
              <div className="bg-slate-50 rounded-sm p-3">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">聯絡人</p>
                <p className="font-bold text-slate-800">
                  {parseDescriptionField(partner.description, "聯絡人")}
                </p>
              </div>
            )}
            {parseDescriptionField(partner.description, "聯絡電話") && (
              <div className="bg-slate-50 rounded-sm p-3">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">電話</p>
                <p className="font-bold text-slate-800">
                  {parseDescriptionField(partner.description, "聯絡電話")}
                </p>
              </div>
            )}
            {parseDescriptionField(partner.description, "LINE ID") && (
              <div className="bg-slate-50 rounded-sm p-3 col-span-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">LINE ID</p>
                <p className="font-bold text-slate-800">
                  {parseDescriptionField(partner.description, "LINE ID")}
                </p>
              </div>
            )}
          </div>

          {isReferral && partner.status === "active" && (
            <ReferralDiscountSettings partner={partner} onUpdated={onUpdated} />
          )}

          <SettlementStatementBlock partner={partner} />

          {partner.status === "active" && (
            <WithdrawalAdminBlock partner={partner} />
          )}

          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">完整申請內容</p>
            <div className="bg-blue-50/50 border border-blue-100 rounded-sm p-4 text-xs text-slate-600 leading-relaxed space-y-1">
              {lines.length ? lines.map((line) => <p key={line}>{line}</p>) : "（無）"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
