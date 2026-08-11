"use client";

import { useEffect, useState } from "react";
import { ACCOUNT_UI } from "@/lib/accountUi";
import {
  parsePartnerType,
  parseDescriptionField,
} from "@/lib/partnerDescriptionParse";
import { bossFetch, bossFetchBlob } from "@/lib/bossAdminClient";
import { WITHDRAWAL_STATUS_LABEL, getPayoutMethodLabel, formatPayoutAccountSummary } from "@/lib/partnerPayout";

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
  const [previewBusy, setPreviewBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);

  const loadPreview = async (y = year, m = month) => {
    if (!partner?.id) return;
    setPreviewBusy(true);
    try {
      const qs = new URLSearchParams({
        partner_id: String(partner.id),
        year: String(y),
        month: String(m),
        format: "json",
      });
      const data = await bossFetch(
        `/api/admin/partner-settlement-statement?${qs}`,
      );
      setPreview(data.statement || null);
    } catch (err) {
      setPreview(null);
      setMessage(err.message || "無法預覽對帳單金額");
    } finally {
      setPreviewBusy(false);
    }
  };

  useEffect(() => {
    loadPreview(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner.id, year, month]);

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
        a.download =
          filename ||
          `JEKO-對帳單-${year}${String(month).padStart(2, "0")}.html`;
        a.click();
        setMessage("已下載電子對帳單（可開啟後「列印 → 儲存為 PDF」）");
      } else {
        setMessage("已開啟對帳單：按「列印／另存 PDF」即可給夥伴電子檔");
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      await loadPreview(year, month);
    } catch (err) {
      setMessage(err.message || "產製失敗");
    } finally {
      setBusy(false);
    }
  };

  const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("zh-TW");
  const t = preview?.totals;

  return (
    <div className="rounded-sm border border-slate-200 bg-slate-50/80 p-4 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb]">
          分潤對帳單
        </p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          選擇「成交月」產製電子對帳單，匯款前寄給夥伴確認。已匯加速提領以
          FIFO 對沖較早成交月（每筆只扣一次），與下方提領審核同一帳本。網銀備註：
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

      {previewBusy && !t ? (
        <p className="text-[11px] text-slate-400">計算本期應匯…</p>
      ) : t ? (
        <div className="bg-white border border-slate-100 rounded-sm px-3 py-2.5 space-y-1.5 text-[11px]">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-slate-500">本期分潤</span>
            <span className="font-bold">NT$ {fmt(t.profit)}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-slate-500">已匯提領對沖</span>
            <span className="font-bold text-slate-700">
              − NT$ {fmt(t.withdrawnPaid)}
            </span>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-1.5">
            <span className="font-black text-[#1a56db]">本期應匯（對帳）</span>
            <span className="font-black text-[#1a56db] text-sm">
              NT$ {fmt(t.netPayable)}
            </span>
          </div>
          {Number(t.openReservedPeriod) > 0 ? (
            <>
              <div className="flex flex-wrap justify-between gap-2 text-amber-800">
                <span>待審／待匯將再對沖</span>
                <span className="font-bold">− NT$ {fmt(t.openReservedPeriod)}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-amber-900 bg-amber-50 rounded-sm px-2 py-1">
                <span className="font-black">建議實匯上限（防雙付）</span>
                <span className="font-black">NT$ {fmt(t.opsSafePayable)}</span>
              </div>
            </>
          ) : null}
          {preview?.remittanceMemo ? (
            <p className="text-slate-400 pt-1">
              月結網銀備註{" "}
              <span className="font-mono font-bold text-slate-700">
                {preview.remittanceMemo}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

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
  const [store, setStore] = useState(null);
  const [noteById, setNoteById] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await bossFetch(
        `/api/admin/partner-withdrawals?partner_id=${partner.id}&status=all`,
      );
      setRows(data.requests || []);
      setBank(
        data.bank || data.requests?.find((r) => r.bank)?.bank || null,
      );
      setStore(
        data.store || data.requests?.find((r) => r.store)?.store || null,
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

  const patchAction = async (id, action) => {
    const note = String(noteById[id] || "").trim();
    if (action === "reject" && !note) {
      setMessage("駁回時請填寫審核備註");
      return;
    }
    const labels = {
      approve: "核准提領",
      reject: "駁回此申請",
      remit: "標記已匯款",
    };
    if (!window.confirm(`確定要${labels[action] || "更新"}？`)) return;

    setBusyId(id);
    setMessage("");
    try {
      const data = await bossFetch("/api/admin/partner-withdrawals", {
        method: "PATCH",
        body: JSON.stringify({
          id,
          action,
          admin_note: note,
        }),
      });
      setMessage(
        action === "remit"
          ? `已標記匯款完成${
              data?.request?.remittance_memo
                ? ` · 備註 ${data.request.remittance_memo}`
                : ""
            }`
          : action === "approve"
            ? "已核准，請於 10 個工作天內匯款"
            : "已駁回申請",
      );
      await load();
    } catch (err) {
      setMessage(err.message || "更新失敗");
    } finally {
      setBusyId(null);
    }
  };

  const statusBadge = (status) => {
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
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cls}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="rounded-sm border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          分潤匯款審核
        </p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          夥伴申請提領後請審核帳戶與金額；核准後於 10
          個工作天內匯款（實匯＝申請金額−手續費），再標記已匯款。提領金額會以
          FIFO 對沖對帳單「本期應匯」，標記已匯時網銀備註會對準對沖成交月（JEKO-YYYYMM）。
          月結請以上方對帳單「本期應匯／建議實匯上限」為準，勿與未結案提領重複匯出。
        </p>
      </div>
      {store?.store_name ? (
        <p className="text-[11px] font-bold text-[#1a56db]">
          目前店鋪名稱：{store.store_name}
        </p>
      ) : null}
      {bank ? (
        <div className="text-[11px] text-slate-700 bg-white border border-slate-100 rounded-sm px-3 py-2 space-y-0.5">
          <p className="font-black text-[#1a56db]">
            目前帳戶 · {getPayoutMethodLabel(bank.payout_method)}
          </p>
          <p className="font-bold text-slate-800">
            {formatPayoutAccountSummary(bank)}
          </p>
          {bank.updated_at ? (
            <p className="text-slate-400">
              更新於{" "}
              {new Date(bank.updated_at).toLocaleString("zh-TW", {
                timeZone: "Asia/Taipei",
              })}
            </p>
          ) : null}
          {bank.payout_note ? (
            <p className="text-slate-500 pt-1 whitespace-pre-wrap">
              說明：{bank.payout_note}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-[11px] text-amber-700 font-bold">
          夥伴尚未儲存收款帳戶 — 請請其至結算頁補齊後再核准
        </p>
      )}
      {loading ? (
        <p className="text-xs text-slate-400">載入中…</p>
      ) : !rows.length ? (
        <p className="text-xs text-slate-400">尚無提領申請</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 12).map((r) => {
            const fee = Math.round(Number(r.fee_amount) || 0);
            const net = Math.round(
              Number(r.net_amount) ||
                Math.max(0, Number(r.amount || 0) - fee),
            );
            return (
              <li
                key={r.id}
                className="bg-white border border-slate-100 rounded-sm px-3 py-2.5 text-xs space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-[#1E4AD1]">
                    申請 NT${Number(r.amount || 0).toLocaleString()}
                    {fee > 0
                      ? `（手續費 ${fee.toLocaleString()} → 實匯 ${net.toLocaleString()}）`
                      : "（免手續費）"}
                  </span>
                  {statusBadge(r.status)}
                </div>
                <p className="text-slate-400">
                  {r.requested_at
                    ? new Date(r.requested_at).toLocaleString("zh-TW", {
                        timeZone: "Asia/Taipei",
                      })
                    : ""}
                  {r.remittance_memo ? ` · ${r.remittance_memo}` : ""}
                </p>
                {r.bank_changed_since_request ? (
                  <p className="text-amber-700 font-bold bg-amber-50 border border-amber-100 rounded-sm px-2 py-1">
                    申請後帳戶已變更 — 匯款請以上方「目前帳戶」為準
                    {r.payout_snapshot
                      ? `（申請時：${formatPayoutAccountSummary(r.payout_snapshot)}）`
                      : ""}
                  </p>
                ) : null}
                {r.admin_note ? (
                  <p className="text-slate-600 bg-slate-50 rounded-sm px-2 py-1">
                    備註：{r.admin_note}
                  </p>
                ) : null}

                {(r.status === "pending" || r.status === "approved") && (
                  <textarea
                    value={noteById[r.id] || ""}
                    onChange={(e) =>
                      setNoteById((prev) => ({
                        ...prev,
                        [r.id]: e.target.value,
                      }))
                    }
                    rows={2}
                    className="w-full border border-slate-200 rounded-sm px-2 py-1.5 text-[11px] resize-none"
                    placeholder={
                      r.status === "pending"
                        ? "審核備註（駁回時必填）"
                        : "匯款備註（選填，會一併存檔）"
                    }
                  />
                )}

                {r.status === "pending" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === r.id || !bank}
                      onClick={() => patchAction(r.id, "approve")}
                      className="text-[11px] font-bold px-2.5 py-1.5 rounded-sm bg-[#1a56db] text-white disabled:opacity-50"
                      title={!bank ? "尚未設定收款帳戶" : undefined}
                    >
                      核准提領
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => patchAction(r.id, "reject")}
                      className="text-[11px] font-bold px-2.5 py-1.5 rounded-sm bg-white border border-red-200 text-red-600 disabled:opacity-50"
                    >
                      駁回
                    </button>
                  </div>
                ) : null}

                {r.status === "approved" ? (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => patchAction(r.id, "remit")}
                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-sm bg-emerald-600 text-white disabled:opacity-50"
                  >
                    標記已匯款
                  </button>
                ) : null}

                {r.status === "remitted" ? (
                  <p className="text-emerald-700 font-bold">
                    已完成匯款
                    {r.remitted_at
                      ? ` · ${new Date(r.remitted_at).toLocaleString("zh-TW", {
                          timeZone: "Asia/Taipei",
                        })}`
                      : ""}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {message ? (
        <p className="text-[11px] font-bold text-slate-600">{message}</p>
      ) : null}
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
