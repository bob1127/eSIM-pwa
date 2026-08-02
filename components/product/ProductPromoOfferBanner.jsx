"use client";

import { useEffect, useState } from "react";
import MaterialIcon from "../MaterialIcon";
import {
  formatPromoOfferText,
  normalizePromoOffer,
  resolvePromoOffer,
} from "../../lib/productPromoOffer";

const ANKER_BLUE = "#00befa";

/**
 * 商品頁優惠碼區塊 — 讀取 Medusa metadata.promo_offer_by_carrier
 * 管理者可直接在前台新增／編輯該電信商優惠碼
 */
export default function ProductPromoOfferBanner({
  product,
  carrierName,
  isAdmin = false,
  adminChecked = false,
  authHeaders = {},
  onSaved,
  /** 經專屬折扣碼連結進入時隱藏前台優惠（與夥伴碼互斥、不可疊加） */
  suppressCustomerBanner = false,
}) {
  const resolved = resolvePromoOffer(product, carrierName);
  const displayText = formatPromoOfferText(resolved);
  const discountCode = resolved?.code || "";

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState(() =>
    normalizePromoOffer(resolved || { enabled: true, discount_type: "percent", discount_value: 5 }),
  );

  useEffect(() => {
    if (!isEditing) {
      setDraft(
        normalizePromoOffer(
          resolved || {
            enabled: true,
            discount_type: "percent",
            discount_value: 5,
          },
        ),
      );
    }
  }, [resolved, carrierName, isEditing]);

  const handleCopy = async () => {
    if (!discountCode) return;
    try {
      await navigator.clipboard.writeText(discountCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleSave = async () => {
    if (!product?.id) {
      alert("找不到商品 ID");
      return;
    }
    if (!carrierName || carrierName === "default") {
      alert("請先選擇電信商，再設定該電信商的優惠碼");
      return;
    }
    const code = String(draft.code || "").trim();
    if (draft.enabled && !code) {
      alert("啟用優惠時請填寫折扣碼");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/product-promo-offer", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          productId: product.id,
          carrier: carrierName,
          enabled: Boolean(draft.enabled),
          code,
          discount_type: draft.discount_type === "fixed" ? "fixed" : "percent",
          discount_value: Number(draft.discount_value) || 0,
          message: String(draft.message || "").trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "儲存失敗");
        return;
      }
      onSaved?.(data.promo_offer_by_carrier || {});
      setIsEditing(false);
    } catch (e) {
      alert(e.message || "儲存失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const showBanner =
    Boolean(displayText && discountCode) && !suppressCustomerBanner;
  const showAdminEmpty =
    adminChecked && isAdmin && !showBanner && !isEditing && !suppressCustomerBanner;
  const showPartnerMuteHint =
    adminChecked && isAdmin && suppressCustomerBanner && !isEditing;

  if (!showBanner && !showAdminEmpty && !isEditing && !showPartnerMuteHint) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      {showBanner && !isEditing && (
        <div className="flex items-stretch rounded-xl border border-dashed overflow-hidden border-cyan-100 bg-cyan-50">
          <div
            className="text-white px-5 py-4 flex flex-col items-center justify-center font-bold shrink-0 min-w-[88px] border-r border-dashed border-white/30"
            style={{ background: ANKER_BLUE }}
          >
            <span className="text-lg leading-none">優惠</span>
          </div>
          <div className="flex-1 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-slate-800">
            <span className="font-medium leading-relaxed">{displayText}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 text-sm font-bold hover:underline w-fit"
              style={{ color: ANKER_BLUE }}
            >
              {copied ? "已複製！" : "複製折扣碼"}
            </button>
          </div>
        </div>
      )}

      {adminChecked && isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              優惠碼設定（Medusa）
              {carrierName && carrierName !== "default"
                ? ` · ${carrierName}`
                : ""}
            </p>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-[#0A6CD0]"
              >
                <MaterialIcon name="edit" size={14} />
                {showBanner ? "編輯優惠" : "新增優惠碼"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-bold text-red-500"
              >
                取消
              </button>
            )}
          </div>

          {showPartnerMuteHint && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
              此訪客經專屬折扣碼連結進入，前台商品優惠已隱藏（與夥伴碼互斥）。管理者仍可編輯設定。
            </p>
          )}

          {isEditing ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(draft.enabled)}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, enabled: e.target.checked }))
                  }
                  className="rounded border-slate-300"
                />
                啟用並在前台顯示此優惠
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-slate-500 text-xs font-bold">
                    折扣碼
                  </span>
                  <input
                    type="text"
                    value={draft.code}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="例如 Hello26"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold tracking-wide"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-slate-500 text-xs font-bold">
                    折扣類型
                  </span>
                  <select
                    value={draft.discount_type}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        discount_type: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="percent">百分比折扣 (%)</option>
                    <option value="fixed">固定金額 (NT$)</option>
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="text-slate-500 text-xs font-bold">
                    折扣數值
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft.discount_value}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        discount_value: Number(e.target.value) || 0,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span className="text-slate-500 text-xs font-bold">
                    顯示文案（選填，空白則自動產生）
                  </span>
                  <input
                    type="text"
                    value={draft.message}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, message: e.target.value }))
                    }
                    placeholder="這款 eSIM 加碼 5% 折扣！使用折扣碼：Hello26"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A6CD0] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  <MaterialIcon name="save" size={16} />
                  {isSaving ? "儲存中…" : "儲存至 Medusa"}
                </button>
                <p className="text-[11px] text-slate-400">
                  請先在 Medusa Admin → Promotions 建立同名優惠碼，結帳才能真正折抵。
                </p>
              </div>
            </div>
          ) : showAdminEmpty ? (
            <p className="text-sm text-slate-400">
              此電信商尚未設定優惠碼。點「新增優惠碼」後，前台會顯示優惠區塊。
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              前台顯示代碼：{discountCode}
              {resolved?.discount_type === "fixed"
                ? ` · 折 NT$${Math.round(resolved.discount_value || 0)}`
                : ` · ${resolved?.discount_value || 0}%`}
              {resolved?.enabled ? " · 已啟用" : " · 已停用"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
