"use client";

import { useCallback, useEffect, useState } from "react";
import PartnerDialog from "@/components/partner/ui/PartnerDialog";
import PartnerButton from "@/components/partner/ui/PartnerButton";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  mergeHomepageCms,
  HOMEPAGE_HERO_MAX_SLIDES,
} from "@/lib/partnerHomepageCms";

const saveMinDelay = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 1000 + Math.floor(Math.random() * 1000));
  });

/**
 * 夥伴首頁輪播 — 彈窗編輯（UIAble Dialog 風格）
 */
export default function PartnerHeroCarouselEditorDialog({
  open,
  onClose,
  store,
  cms,
  onCmsChange,
  token,
}) {
  const [draft, setDraft] = useState(() => mergeHomepageCms(store, cms));
  const [activeSlide, setActiveSlide] = useState(0);
  const [uploading, setUploading] = useState(false);
  const { saving, setSaving, feedback, showSuccess, showError, clearFeedback } =
    useSaveFeedback();

  useEffect(() => {
    if (!open) return;
    const merged = mergeHomepageCms(store, cms);
    setDraft({
      ...merged,
      hero: {
        ...merged.hero,
        layout: "slider",
      },
    });
    setActiveSlide(0);
    clearFeedback();
  }, [open, store, cms, clearFeedback]);

  const slides = draft.hero?.slides || [];

  const patchHero = (key, val) =>
    setDraft((d) => ({ ...d, hero: { ...d.hero, [key]: val } }));

  const patchSlide = (i, key, val) =>
    setDraft((d) => {
      const nextSlides = (d.hero.slides || []).map((s, idx) =>
        idx === i ? { ...s, [key]: val } : s,
      );
      return { ...d, hero: { ...d.hero, slides: nextSlides } };
    });

  const addSlide = () =>
    setDraft((d) => {
      const nextSlides = [...(d.hero.slides || [])];
      if (nextSlides.length >= HOMEPAGE_HERO_MAX_SLIDES) return d;
      nextSlides.push({
        image: "",
        title: "",
        subtitle: "",
        cta_label: "探索方案",
        href: "#plans",
      });
      return { ...d, hero: { ...d.hero, slides: nextSlides } };
    });

  const removeSlide = (i) =>
    setDraft((d) => {
      const nextSlides = (d.hero.slides || []).filter((_, idx) => idx !== i);
      return {
        ...d,
        hero: {
          ...d.hero,
          slides:
            nextSlides.length > 0
              ? nextSlides
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

  const moveSlide = (index, delta) => {
    const to = index + delta;
    if (to < 0 || to >= slides.length) return;
    setDraft((d) => {
      const nextSlides = [...(d.hero.slides || [])];
      [nextSlides[index], nextSlides[to]] = [nextSlides[to], nextSlides[index]];
      return { ...d, hero: { ...d.hero, slides: nextSlides } };
    });
    setActiveSlide((cur) => {
      if (cur === index) return to;
      if (cur === to) return index;
      return cur;
    });
  };

  const save = useCallback(async () => {
    if (!token || !store?.id) return;
    setSaving(true);
    clearFeedback();
    const minDelay = saveMinDelay();

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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "儲存失敗");
      await minDelay;
      const next = data.homepage_cms || draft;
      onCmsChange?.(next);
      setDraft(next);
      showSuccess(
        "儲存成功",
        "輪播已更新，訪客重新整理頁面後即可看到新內容。",
      );
    } catch (err) {
      await minDelay;
      showError("儲存失敗", err.message || "請稍後再試");
    } finally {
      setSaving(false);
    }
  }, [token, store?.id, draft, onCmsChange, setSaving, showSuccess, showError, clearFeedback]);

  const slide = slides[activeSlide] || slides[0];

  return (
    <>
      <SaveFeedbackToast feedback={feedback} onDismiss={clearFeedback} />

      <PartnerDialog
      open={open}
      onClose={onClose}
      title="編輯輪播 Banner"
      description="調整每張投影片的圖片、標題、按鈕與連結。儲存後訪客重新整理即可看到。"
      icon="view_carousel"
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

        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.hero.autoplay !== false}
              onChange={(e) => patchHero("autoplay", e.target.checked)}
              className="rounded border-slate-300"
            />
            自動輪播
          </label>
          {draft.hero.autoplay !== false ? (
            <label className="block text-xs text-slate-500">
              輪播間隔（毫秒，2500–15000）
              <input
                type="number"
                min={2500}
                max={15000}
                step={500}
                value={draft.hero.autoplay_ms || 5000}
                onChange={(e) =>
                  patchHero("autoplay_ms", Number(e.target.value) || 5000)
                }
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800"
              />
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveSlide(i)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeSlide === i
                  ? "bg-[#1E4AD1] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              第 {i + 1} 張
            </button>
          ))}
          {slides.length < HOMEPAGE_HERO_MAX_SLIDES ? (
            <button
              type="button"
              onClick={() => {
                addSlide();
                setActiveSlide(slides.length);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              ＋ 新增
            </button>
          ) : null}
        </div>

        {slides.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-medium text-slate-500">
              調整「第 {activeSlide + 1} 張」順序
            </span>
            <button
              type="button"
              onClick={() => moveSlide(activeSlide, -1)}
              disabled={activeSlide === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="size-3.5" />
              前移
            </button>
            <button
              type="button"
              onClick={() => moveSlide(activeSlide, 1)}
              disabled={activeSlide >= slides.length - 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              後移
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        ) : null}

        {slide ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                投影片 {activeSlide + 1}
              </p>
              {slides.length > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    removeSlide(activeSlide);
                    setActiveSlide((i) => Math.max(0, i - 1));
                  }}
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  移除此張
                </button>
              ) : null}
            </div>

            <EditorImageField
              label="Banner 圖片"
              value={slide.image}
              onChange={(v) => patchSlide(activeSlide, "image", v)}
              storeId={store.id}
              token={token}
              busy={uploading}
              setBusy={setUploading}
              cropKind="hero"
            />
            <EditorField
              label="標題（選填）"
              value={slide.title}
              onChange={(v) => patchSlide(activeSlide, "title", v)}
            />
            <EditorField
              label="副標（選填）"
              value={slide.subtitle}
              onChange={(v) => patchSlide(activeSlide, "subtitle", v)}
              multiline
            />
            <EditorField
              label="按鈕文字（選填）"
              value={slide.cta_label}
              onChange={(v) => patchSlide(activeSlide, "cta_label", v)}
            />
            <EditorField
              label="連結"
              value={slide.href}
              onChange={(v) => patchSlide(activeSlide, "href", v)}
              placeholder="#plans"
            />
          </div>
        ) : null}
      </div>
    </PartnerDialog>
    </>
  );
}
