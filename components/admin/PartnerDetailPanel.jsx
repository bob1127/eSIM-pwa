"use client";

import { useEffect, useState } from "react";
import { ACCOUNT_UI } from "@/lib/accountUi";
import {
  parsePartnerType,
  parseDescriptionField,
} from "@/lib/partnerDescriptionParse";
import { bossFetch } from "@/lib/bossAdminClient";
import {
  DEFAULT_REFERRAL_DISCOUNT_PERCENT,
  MIN_REFERRAL_DISCOUNT_PERCENT,
  MAX_REFERRAL_DISCOUNT_PERCENT,
} from "@/lib/partnerReferralDiscount";

function ReferralDiscountSettings({ partner, onUpdated }) {
  const [enabled, setEnabled] = useState(true);
  const [percent, setPercent] = useState(DEFAULT_REFERRAL_DISCOUNT_PERCENT);
  const [rate, setRate] = useState(25);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setEnabled(partner.referral_discount_enabled !== false);
    setPercent(
      Number(partner.referral_discount_percent) > 0
        ? Number(partner.referral_discount_percent)
        : DEFAULT_REFERRAL_DISCOUNT_PERCENT,
    );
    setRate(Number(partner.referral_rate) || 25);
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
          referral_rate: rate,
          referral_discount_enabled: enabled,
          referral_discount_percent: percent,
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
        分潤／折扣趴數（由您決定，可隨時調整）
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-bold text-slate-600">
            分潤趴數（成本 × %）
          </span>
          <input
            type="number"
            min={0}
            max={100}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="mt-1 w-full rounded-sm border border-slate-200 px-2 py-1.5 text-sm focus:border-[#0071EB] outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-600">
            旅客折扣（全單 %）
          </span>
          <input
            type="number"
            min={MIN_REFERRAL_DISCOUNT_PERCENT}
            max={MAX_REFERRAL_DISCOUNT_PERCENT}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            disabled={!enabled}
            className="mt-1 w-full rounded-sm border border-slate-200 px-2 py-1.5 text-sm focus:border-[#0071EB] outline-none disabled:bg-slate-100 disabled:text-slate-400"
          />
        </label>
      </div>

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
