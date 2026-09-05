"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  mergeHomepageCms,
  HOMEPAGE_HERO_MAX_SLIDES,
} from "@/lib/partnerHomepageCms";
import {
  EditorField as Field,
  EditorImageField as ImageField,
} from "@/components/Shop/partnerHomepageEditorFields";
import {
  SaveButtonContent,
  SaveFeedbackAlert,
  useSaveFeedback,
} from "@/components/ui/save-feedback";

async function getBearer() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || "";
}

/**
 * 僅當「登入者 = 本店夥伴主帳號」時顯示編輯條與儲存。
 * 訪客／其他帳號完全看不到編輯 UI。
 */
export function usePartnerStoreOwner(store) {
  const [state, setState] = useState({
    checking: true,
    isOwner: false,
    token: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!store?.id) {
        if (!cancelled) setState({ checking: false, isOwner: false, token: "" });
        return;
      }
      try {
        const token = await getBearer();
        if (!token) {
          if (!cancelled)
            setState({ checking: false, isOwner: false, token: "" });
          return;
        }
        const res = await fetch("/api/partner/verify-access", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        const ok =
          res.ok &&
          data?.ok &&
          data?.store?.id != null &&
          String(data.store.id) === String(store.id);
        if (!cancelled) {
          setState({ checking: false, isOwner: !!ok, token: ok ? token : "" });
        }
      } catch {
        if (!cancelled)
          setState({ checking: false, isOwner: false, token: "" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store?.id]);

  return state;
}

/**
 * 浮動編輯面板：區塊選擇 → 欄位 → 儲存
 */
export default function PartnerHomepageEditor({
  store,
  cms,
  onCmsChange,
  token,
}) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState("hero");
  const [draft, setDraft] = useState(() => mergeHomepageCms(store, cms));
  const [uploading, setUploading] = useState(false);
  const { saving, setSaving, feedback, showSuccess, showError, clearFeedback } =
    useSaveFeedback();
  const [syncBrand, setSyncBrand] = useState(false);

  useEffect(() => {
    setDraft(mergeHomepageCms(store, cms));
  }, [store, cms]);

  const patchHero = (key, val) =>
    setDraft((d) => ({ ...d, hero: { ...d.hero, [key]: val } }));
  const patchSlide = (i, key, val) =>
    setDraft((d) => {
      const slides = (d.hero.slides || []).map((s, idx) =>
        idx === i ? { ...s, [key]: val } : s,
      );
      return { ...d, hero: { ...d.hero, slides } };
    });
  const addSlide = () =>
    setDraft((d) => {
      const slides = [...(d.hero.slides || [])];
      if (slides.length >= HOMEPAGE_HERO_MAX_SLIDES) return d;
      slides.push({
        image: "",
        title: "",
        subtitle: "",
        cta_label: "探索方案",
        href: "#plans",
      });
      return { ...d, hero: { ...d.hero, slides } };
    });
  const removeSlide = (i) =>
    setDraft((d) => {
      const slides = (d.hero.slides || []).filter((_, idx) => idx !== i);
      return {
        ...d,
        hero: {
          ...d.hero,
          slides:
            slides.length > 0
              ? slides
              : [
                  {
                    image: "",
                    title: "",
                    subtitle: "",
                    cta_label: "探索方案",
                    href: "#plans",
                  },
                ],
        },
      };
    });
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

  const isSlider = draft.hero?.layout === "slider";

  const save = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    clearFeedback();
    try {
      const res = await fetch("/api/partner/homepage-cms", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          store_id: store.id,
          homepage_cms: draft,
          sync_brand: syncBrand,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "儲存失敗");
      const next = data.homepage_cms || draft;
      onCmsChange?.(next);
      setDraft(next);
      showSuccess("儲存成功", "訪客重新整理後即可看到變更");
    } catch (err) {
      showError("儲存失敗", err.message || "請稍後再試");
    } finally {
      setSaving(false);
    }
  }, [
    token,
    store?.id,
    draft,
    syncBrand,
    onCmsChange,
    setSaving,
    showSuccess,
    showError,
    clearFeedback,
  ]);

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[9500] flex flex-col items-end gap-2">
        {open ? (
          <div className="w-[min(100vw-2rem,380px)] max-h-[min(80vh,640px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-800">首頁編輯模式</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                收合
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              僅本店夥伴主帳號可見。變更需按「儲存」才會套用給訪客。
            </p>
            <div className="flex gap-1 flex-wrap">
              {[
                ["hero", "主視覺"],
                ["promo", "雙欄卡片"],
                ["plans", "方案標題"],
                ["discover", "Discover"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg ${
                    section === id
                      ? "bg-[#1a56db] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {section === "hero" ? (
              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    版型
                  </span>
                  <div className="flex gap-1">
                    {[
                      ["classic", "經典主視覺"],
                      ["slider", "Slider Banner"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => patchHero("layout", id)}
                        className={`flex-1 text-[11px] font-bold px-2.5 py-2 rounded-lg ${
                          (draft.hero.layout || "classic") === id
                            ? "bg-[#0f172a] text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    {isSlider
                      ? "全幅輪播 Banner（可多張圖，無藍色遮罩）"
                      : "文字主視覺＋單張背景圖"}
                  </p>
                </div>

                {isSlider ? (
                  <>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={draft.hero.autoplay !== false}
                        onChange={(e) =>
                          patchHero("autoplay", e.target.checked)
                        }
                      />
                      自動輪播
                    </label>
                    {draft.hero.autoplay !== false ? (
                      <Field
                        label="輪播間隔（毫秒，2500–15000）"
                        value={String(draft.hero.autoplay_ms || 5000)}
                        onChange={(v) =>
                          patchHero("autoplay_ms", Number(v) || 5000)
                        }
                      />
                    ) : null}

                    {(draft.hero.slides || []).map((slide, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-bold text-slate-500">
                            投影片 {i + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeSlide(i)}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700"
                          >
                            移除
                          </button>
                        </div>
                        <ImageField
                          label="Banner 圖（必填）"
                          value={slide.image}
                          onChange={(v) => patchSlide(i, "image", v)}
                          storeId={store.id}
                          token={token}
                          busy={uploading}
                          setBusy={setUploading}
                          cropKind="hero"
                        />
                        <Field
                          label="標題（選填）"
                          value={slide.title}
                          onChange={(v) => patchSlide(i, "title", v)}
                        />
                        <Field
                          label="副標（選填）"
                          value={slide.subtitle}
                          onChange={(v) => patchSlide(i, "subtitle", v)}
                          multiline
                        />
                        <Field
                          label="按鈕文字（選填）"
                          value={slide.cta_label}
                          onChange={(v) => patchSlide(i, "cta_label", v)}
                        />
                        <Field
                          label="連結"
                          value={slide.href}
                          onChange={(v) => patchSlide(i, "href", v)}
                          placeholder="#plans"
                        />
                      </div>
                    ))}

                    {(draft.hero.slides || []).length <
                    HOMEPAGE_HERO_MAX_SLIDES ? (
                      <button
                        type="button"
                        onClick={addSlide}
                        className="w-full py-2 rounded-lg border border-dashed border-slate-300 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                      >
                        ＋ 新增投影片（最多 {HOMEPAGE_HERO_MAX_SLIDES} 張）
                      </button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Field
                      label="眉標"
                      value={draft.hero.eyebrow}
                      onChange={(v) => patchHero("eyebrow", v)}
                    />
                    <Field
                      label="主標題（空白＝用店名）"
                      value={draft.hero.title}
                      onChange={(v) => patchHero("title", v)}
                      placeholder={store.store_name}
                    />
                    <Field
                      label="副標（空白＝用商店描述）"
                      value={draft.hero.subtitle}
                      onChange={(v) => patchHero("subtitle", v)}
                      multiline
                      placeholder={store.description || "精選全球 eSIM…"}
                    />
                    <ImageField
                      label="背景圖（空白＝藍漸層，無藍色遮罩）"
                      value={draft.hero.background_image}
                      onChange={(v) => patchHero("background_image", v)}
                      storeId={store.id}
                      token={token}
                      busy={uploading}
                      setBusy={setUploading}
                      cropKind="hero"
                    />
                    <Field
                      label="按鈕1 文字"
                      value={draft.hero.cta1_label}
                      onChange={(v) => patchHero("cta1_label", v)}
                    />
                    <Field
                      label="按鈕1 連結"
                      value={draft.hero.cta1_href}
                      onChange={(v) => patchHero("cta1_href", v)}
                    />
                    <Field
                      label="按鈕2 文字"
                      value={draft.hero.cta2_label}
                      onChange={(v) => patchHero("cta2_label", v)}
                    />
                    <Field
                      label="按鈕2 連結"
                      value={draft.hero.cta2_href}
                      onChange={(v) => patchHero("cta2_href", v)}
                    />
                    <Field
                      label="按鈕3 文字"
                      value={draft.hero.cta3_label}
                      onChange={(v) => patchHero("cta3_label", v)}
                    />
                    <Field
                      label="按鈕3 連結"
                      value={draft.hero.cta3_href}
                      onChange={(v) => patchHero("cta3_href", v)}
                    />
                    <label className="flex items-center gap-2 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={syncBrand}
                        onChange={(e) => setSyncBrand(e.target.checked)}
                      />
                      儲存時同步更新店名／描述（若有填主標／副標）
                    </label>
                  </>
                )}
              </div>
            ) : null}

            {section === "promo" ? (
              <div className="space-y-4">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2"
                  >
                    <p className="text-[11px] font-bold text-slate-500">
                      卡片 {i + 1}
                    </p>
                    <Field
                      label="標題"
                      value={draft.promoCards[i]?.title}
                      onChange={(v) => patchCard(i, "title", v)}
                    />
                    <Field
                      label="副標"
                      value={draft.promoCards[i]?.subtitle}
                      onChange={(v) => patchCard(i, "subtitle", v)}
                    />
                    <Field
                      label="連結"
                      value={draft.promoCards[i]?.href}
                      onChange={(v) => patchCard(i, "href", v)}
                    />
                    <ImageField
                      label="背景圖"
                      value={draft.promoCards[i]?.image}
                      onChange={(v) => patchCard(i, "image", v)}
                      storeId={store.id}
                      token={token}
                      busy={uploading}
                      setBusy={setUploading}
                      cropKind="promo"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {section === "plans" ? (
              <div className="space-y-2.5">
                <Field
                  label="區塊主標題"
                  value={draft.plans?.title}
                  onChange={(v) => patchPlans("title", v)}
                />
                <Field
                  label="副標（商品數量自動顯示）"
                  value={draft.plans?.subtitle}
                  onChange={(v) => patchPlans("subtitle", v)}
                />
                <Field
                  label="右側連結文字"
                  value={draft.plans?.shop_link_label}
                  onChange={(v) => patchPlans("shop_link_label", v)}
                />
                <Field
                  label="右側連結網址"
                  value={draft.plans?.shop_link_href}
                  onChange={(v) => patchPlans("shop_link_href", v)}
                />
              </div>
            ) : null}

            {section === "discover" ? (
              <div className="space-y-2.5">
                <Field
                  label="區塊標題"
                  value={draft.discover.section_title}
                  onChange={(v) => patchDiscover("section_title", v)}
                />
                <Field
                  label="主標"
                  value={draft.discover.title}
                  onChange={(v) => patchDiscover("title", v)}
                />
                <Field
                  label="副標"
                  value={draft.discover.subtitle}
                  onChange={(v) => patchDiscover("subtitle", v)}
                  multiline
                />
                <Field
                  label="按鈕文字"
                  value={draft.discover.button_label}
                  onChange={(v) => patchDiscover("button_label", v)}
                />
                <Field
                  label="按鈕連結"
                  value={draft.discover.href}
                  onChange={(v) => patchDiscover("href", v)}
                />
                <ImageField
                  label="背景圖"
                  value={draft.discover.image}
                  onChange={(v) => patchDiscover("image", v)}
                  storeId={store.id}
                  token={token}
                  busy={uploading}
                  setBusy={setUploading}
                  cropKind="discover"
                />
              </div>
            ) : null}

            {feedback ? (
              <SaveFeedbackAlert
                feedback={feedback}
                onDismiss={clearFeedback}
                className="text-left"
              />
            ) : null}
            <button
              type="button"
              disabled={saving}
              aria-busy={saving}
              onClick={save}
              className="w-full py-2.5 rounded-xl bg-[#0f172a] text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
            >
              <SaveButtonContent saving={saving} savingLabel="儲存中…">
                儲存變更
              </SaveButtonContent>
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shadow-lg rounded-full bg-[#1a56db] hover:bg-[#1e40af] text-white text-sm font-bold px-5 py-3"
        >
          {open ? "關閉編輯" : "編輯首頁"}
        </button>
      </div>
    </>
  );
}
