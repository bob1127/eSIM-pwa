"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PartnerDialog from "@/components/partner/ui/PartnerDialog";
import PartnerButton from "@/components/partner/ui/PartnerButton";
import { mergeHomepageCms } from "@/lib/partnerHomepageCms";
import { applyPartnerCountryNavOrder } from "@/lib/partnerNavCountries";
import {
  homepageSaveMinDelay,
  savePartnerHomepageCms,
} from "@/lib/partnerHomepageSave";
import {
  EditorField,
  EditorImageField,
} from "@/components/Shop/partnerHomepageEditorFields";
import {
  SaveButtonContent,
  SaveFeedbackAlert,
  SaveFeedbackToast,
  useSaveFeedback,
} from "@/components/ui/save-feedback";
import { ChevronDown, ChevronUp } from "lucide-react";

const BLOCK_META = {
  promo: {
    title: "編輯雙欄卡片",
    description: "調整兩張促銷卡的圖片、標題、副標與連結。",
    icon: "view_agenda",
  },
  discover: {
    title: "編輯 Discover 橫幅",
    description: "調整區塊標題、橫幅圖片、文案與按鈕連結。",
    icon: "image",
  },
  plans: {
    title: "編輯方案區塊",
    description: "調整商品列表標題、副標、商城連結與分類 Tab 順序。",
    icon: "inventory_2",
  },
};

/**
 * 夥伴首頁區塊編輯 — promo / discover / plans
 */
export default function PartnerHomepageBlockEditorDialog({
  open,
  onClose,
  block,
  store,
  cms,
  onCmsChange,
  token,
  navCountries = [],
}) {
  const meta = BLOCK_META[block] || BLOCK_META.promo;
  const [draft, setDraft] = useState(() => mergeHomepageCms(store, cms));
  const [uploading, setUploading] = useState(false);
  const { saving, setSaving, feedback, showSuccess, showError, clearFeedback } =
    useSaveFeedback();

  useEffect(() => {
    if (!open) return;
    setDraft(mergeHomepageCms(store, cms));
    clearFeedback();
  }, [open, store, cms, block, clearFeedback]);

  const patchCard = (i, key, val) =>
    setDraft((d) => {
      const promoCards = d.promoCards.map((c, idx) =>
        idx === i ? { ...c, [key]: val } : c,
      );
      return { ...d, promoCards };
    });

  const patchDiscover = (key, val) =>
    setDraft((d) => ({ ...d, discover: { ...d.discover, [key]: val } }));

  const patchPlans = (key, val) =>
    setDraft((d) => ({ ...d, plans: { ...d.plans, [key]: val } }));

  const categoryList = useMemo(
    () =>
      applyPartnerCountryNavOrder(
        navCountries,
        draft.plans?.category_order,
      ),
    [navCountries, draft.plans?.category_order],
  );

  const moveCategory = (index, delta) => {
    const keys = categoryList.map((c) => c.key);
    const to = index + delta;
    if (to < 0 || to >= keys.length) return;
    [keys[index], keys[to]] = [keys[to], keys[index]];
    patchPlans("category_order", keys);
  };

  const save = useCallback(async () => {
    if (!token || !store?.id) return;
    setSaving(true);
    clearFeedback();
    const minDelay = homepageSaveMinDelay();

    try {
      const next = await savePartnerHomepageCms({
        token,
        storeId: store.id,
        homepageCms: draft,
      });
      await minDelay;
      onCmsChange?.(next);
      setDraft(next);
      showSuccess(
        "儲存成功",
        "變更已儲存，訪客重新整理頁面後即可看到新內容。",
      );
    } catch (err) {
      await minDelay;
      showError("儲存失敗", err.message || "請稍後再試");
    } finally {
      setSaving(false);
    }
  }, [
    token,
    store?.id,
    draft,
    onCmsChange,
    setSaving,
    showSuccess,
    showError,
    clearFeedback,
  ]);

  return (
    <>
      <SaveFeedbackToast feedback={feedback} onDismiss={clearFeedback} />

      <PartnerDialog
        open={open}
        onClose={onClose}
        title={meta.title}
        description={meta.description}
        icon={meta.icon}
        maxWidth="max-w-lg"
        footer={
          <>
            <PartnerButton type="button" variant="secondary" onClick={onClose}>
              取消
            </PartnerButton>
            <PartnerButton
              type="button"
              onClick={save}
              disabled={saving || uploading}
              aria-busy={saving}
              className="min-w-[7rem]"
            >
              <SaveButtonContent saving={saving} savingLabel="儲存中…">
                儲存變更
              </SaveButtonContent>
            </PartnerButton>
          </>
        }
      >
        <div className="space-y-4">
          {feedback?.status === "error" ? (
            <SaveFeedbackAlert feedback={feedback} onDismiss={clearFeedback} />
          ) : null}

          {block === "promo" ? (
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                >
                  <p className="text-sm font-semibold text-slate-800">
                    卡片 {i + 1}
                  </p>
                  <EditorImageField
                    label="背景圖"
                    value={draft.promoCards[i]?.image}
                    onChange={(v) => patchCard(i, "image", v)}
                    storeId={store.id}
                    token={token}
                    busy={uploading}
                    setBusy={setUploading}
                    cropKind="promo"
                  />
                  <EditorField
                    label="標題"
                    value={draft.promoCards[i]?.title}
                    onChange={(v) => patchCard(i, "title", v)}
                  />
                  <EditorField
                    label="副標"
                    value={draft.promoCards[i]?.subtitle}
                    onChange={(v) => patchCard(i, "subtitle", v)}
                    multiline
                  />
                  <EditorField
                    label="連結"
                    value={draft.promoCards[i]?.href}
                    onChange={(v) => patchCard(i, "href", v)}
                    placeholder="#plans"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {block === "discover" ? (
            <div className="space-y-3">
              <EditorField
                label="區塊標題"
                value={draft.discover.section_title}
                onChange={(v) => patchDiscover("section_title", v)}
              />
              <EditorImageField
                label="橫幅圖片"
                value={draft.discover.image}
                onChange={(v) => patchDiscover("image", v)}
                storeId={store.id}
                token={token}
                busy={uploading}
                setBusy={setUploading}
                cropKind="discover"
              />
              <EditorField
                label="主標"
                value={draft.discover.title}
                onChange={(v) => patchDiscover("title", v)}
              />
              <EditorField
                label="副標"
                value={draft.discover.subtitle}
                onChange={(v) => patchDiscover("subtitle", v)}
                multiline
              />
              <EditorField
                label="按鈕文字"
                value={draft.discover.button_label}
                onChange={(v) => patchDiscover("button_label", v)}
              />
              <EditorField
                label="按鈕連結"
                value={draft.discover.href}
                onChange={(v) => patchDiscover("href", v)}
                placeholder="/shop/"
              />
            </div>
          ) : null}

          {block === "plans" ? (
            <div className="space-y-3">
              <EditorField
                label="區塊主標題"
                value={draft.plans.title}
                onChange={(v) => patchPlans("title", v)}
                placeholder="Must-Have eSIM Selections"
              />
              <EditorField
                label="副標（商品數量會自動顯示在後方）"
                value={draft.plans.subtitle}
                onChange={(v) => patchPlans("subtitle", v)}
                placeholder="本賣場精選方案"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                預覽：{draft.plans.subtitle || "本賣場精選方案"} · 共 N 款
              </p>
              <EditorField
                label="右側連結文字"
                value={draft.plans.shop_link_label}
                onChange={(v) => patchPlans("shop_link_label", v)}
              />
              <EditorField
                label="右側連結網址"
                value={draft.plans.shop_link_href}
                onChange={(v) => patchPlans("shop_link_href", v)}
                placeholder="/shop/"
              />
              <div className="pt-2 border-t border-slate-200">
                <p className="text-sm font-semibold text-slate-800 mb-1">
                  分類 Tab 順序
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  「全部」固定在最左。以下僅調整各國家分類的排列順序。
                </p>
                {categoryList.length ? (
                  <ul className="space-y-2">
                    {categoryList.map((cat, i) => (
                      <li
                        key={cat.key}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <span className="flex-1 min-w-0 text-sm font-medium text-slate-800">
                          {cat.label}
                          <span className="ml-2 text-[11px] font-semibold text-slate-400 tabular-nums">
                            {cat.count || 0}
                          </span>
                        </span>
                        <div className="flex shrink-0 gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveCategory(i, -1)}
                            disabled={i === 0}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                            aria-label={`${cat.label} 上移`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCategory(i, 1)}
                            disabled={i === categoryList.length - 1}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                            aria-label={`${cat.label} 下移`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-slate-400 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center">
                    上架商品後會自動出現分類
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </PartnerDialog>
    </>
  );
}
