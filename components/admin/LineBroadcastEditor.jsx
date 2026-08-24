"use client";

import { useEffect, useState } from "react";
import {
  cssAspectFromLine,
  defaultLineCardStyle,
  emptyLineCard,
  LINE_ASPECT_OPTIONS,
  LINE_BUBBLE_SIZE_OPTIONS,
  LINE_BUTTON_STYLE_OPTIONS,
} from "@/lib/lineBroadcastCard";

export const LINE_TEMPLATES = [
  { id: "text", label: "純文字卡片" },
  { id: "text_hero", label: "文字＋DM" },
  { id: "hero", label: "僅 DM" },
  { id: "text_carousel", label: "文字＋輪播" },
  { id: "carousel", label: "僅輪播" },
];

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#06C755]/30 text-sm";
const labelCls = "block text-xs font-bold text-stone-600 mb-1";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {hint ? (
          <span className="text-stone-400 font-normal"> {hint}</span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

function StyleEditor({ style, onChange }) {
  const set = (patch) => onChange({ ...style, ...patch });
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-3">
      <p className="text-xs font-black text-stone-700">卡片樣式</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="圖片比例">
          <select
            className={inputCls}
            value={style.aspectRatio}
            onChange={(e) => set({ aspectRatio: e.target.value })}
          >
            {LINE_ASPECT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="裁切">
          <select
            className={inputCls}
            value={style.aspectMode}
            onChange={(e) => set({ aspectMode: e.target.value })}
          >
            <option value="cover">填滿裁切</option>
            <option value="fit">完整顯示</option>
          </select>
        </Field>
        <Field label="卡片大小">
          <select
            className={inputCls}
            value={style.bubbleSize}
            onChange={(e) => set({ bubbleSize: e.target.value })}
          >
            {LINE_BUBBLE_SIZE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="按鈕樣式">
          <select
            className={inputCls}
            value={style.buttonStyle}
            onChange={(e) => set({ buttonStyle: e.target.value })}
          >
            {LINE_BUTTON_STYLE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ["titleColor", "標題色"],
          ["subtitleColor", "副標色"],
          ["bodyColor", "內文色"],
          ["buttonColor", "按鈕色"],
        ].map(([key, lab]) => (
          <Field key={key} label={lab}>
            <input
              type="color"
              value={style[key]}
              onChange={(e) => set({ [key]: e.target.value })}
              className="h-9 w-full rounded border border-stone-200 cursor-pointer"
            />
          </Field>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs font-bold text-stone-600">
        {[
          ["showHero", "顯示圖片"],
          ["showTitle", "顯示標題"],
          ["showSubtitle", "顯示副標"],
          ["showBody", "顯示內文"],
          ["showButton", "顯示按鈕"],
        ].map(([key, lab]) => (
          <label key={key} className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={style[key] !== false}
              onChange={(e) => set({ [key]: e.target.checked })}
            />
            {lab}
          </label>
        ))}
      </div>
    </div>
  );
}

function CardPreview({ card, style, compact }) {
  const aspect = cssAspectFromLine(style.aspectRatio);
  return (
    <div
      className={`rounded-xl border bg-white overflow-hidden ${compact ? "w-36 shrink-0" : ""}`}
      style={{ borderColor: `${style.buttonColor}55` }}
    >
      {style.showHero && card.imageUrl ? (
        <div
          className="bg-stone-100 overflow-hidden"
          style={{ aspectRatio: aspect }}
        >
          <img
            src={card.imageUrl}
            alt=""
            className={`w-full h-full ${style.aspectMode === "fit" ? "object-contain" : "object-cover"}`}
          />
        </div>
      ) : null}
      <div className={compact ? "p-2" : "p-3"}>
        {style.showTitle && card.title ? (
          <p
            className={`font-bold ${compact ? "text-[11px]" : "text-sm"}`}
            style={{ color: style.titleColor }}
          >
            {card.title}
          </p>
        ) : null}
        {style.showSubtitle && card.subtitle ? (
          <p
            className={`${compact ? "text-[10px]" : "text-sm"} mt-0.5 font-bold`}
            style={{ color: style.subtitleColor }}
          >
            {card.subtitle}
          </p>
        ) : null}
        {style.showBody && card.body ? (
          <p
            className={`${compact ? "text-[10px] line-clamp-2" : "text-sm"} mt-1`}
            style={{ color: style.bodyColor }}
          >
            {card.body}
          </p>
        ) : null}
        {style.showButton ? (
          <p
            className={`mt-2 text-center font-bold ${compact ? "text-[10px]" : "text-xs"}`}
            style={{ color: style.buttonColor }}
          >
            [ {card.buttonLabel || "查看詳情"} ]
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CardFields({ card, onChange, imagePresets }) {
  const set = (patch) => onChange({ ...card, ...patch });
  return (
    <div className="space-y-2">
      <Field label="圖片網址" hint="HTTPS 或 /images/…">
        <input
          className={inputCls}
          value={card.imageUrl}
          onChange={(e) => set({ imageUrl: e.target.value })}
          placeholder="/images/Hero-banner-01.png"
        />
      </Field>
      {imagePresets?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {imagePresets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                set({
                  imageUrl: p.image || p.fallbackImage,
                  url: card.url && card.url !== "/" ? card.url : p.url,
                  title: card.title || p.label,
                })
              }
              className="text-[11px] font-bold px-2 py-1 rounded-md border border-stone-200 bg-white hover:border-[#06C755]/50"
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
      <Field label="卡片標題">
        <input
          className={inputCls}
          value={card.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="卡片上顯示的標題"
        />
      </Field>
      <Field label="副標" hint="價格或短標語">
        <input
          className={inputCls}
          value={card.subtitle}
          onChange={(e) => set({ subtitle: e.target.value })}
          placeholder="例：NT$ 199 起"
        />
      </Field>
      <Field label="卡片內文">
        <textarea
          rows={2}
          className={`${inputCls} resize-none`}
          value={card.body}
          onChange={(e) => set({ body: e.target.value })}
          placeholder="卡片說明，可與上方前導文字不同"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="按鈕文字">
          <input
            className={inputCls}
            value={card.buttonLabel}
            onChange={(e) => set({ buttonLabel: e.target.value })}
            maxLength={20}
          />
        </Field>
        <Field label="點擊連結">
          <input
            className={inputCls}
            value={card.url}
            onChange={(e) => set({ url: e.target.value })}
            placeholder="/product/japan/"
          />
        </Field>
      </div>
    </div>
  );
}

export default function LineBroadcastEditor({
  template,
  onTemplateChange,
  lineUserId,
  onLineUserIdChange,
  title,
  body,
  onTitleChange,
  onBodyChange,
  card,
  onCardChange,
  cards,
  onCardsChange,
  cardStyle,
  onCardStyleChange,
  heroPresets,
  carouselPresets,
}) {
  const isHero = template === "hero" || template === "text_hero";
  const isCarousel = template === "carousel" || template === "text_carousel";
  const isLead = template === "text_hero" || template === "text_carousel";
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    onCardStyleChange(defaultLineCardStyle(isCarousel ? "carousel" : "hero"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCarousel]);

  const applyProductToCard = async (handle, index, baseList) => {
    setResolving(true);
    try {
      const res = await fetch(
        `/api/admin/line-broadcast/?resolveHandle=${encodeURIComponent(handle)}`,
      );
      const data = await res.json();
      const preset = carouselPresets.find((p) => p.handle === handle);
      const filled =
        data.card ||
        (preset
          ? emptyLineCard({
              title: preset.label,
              imageUrl: preset.fallbackImage,
              url: preset.url,
              buttonLabel: "查看商品",
            })
          : null);
      if (!filled) {
        alert(data.error || "找不到商品");
        return;
      }
      if (index == null) {
        onCardChange({ ...emptyLineCard(), ...filled });
        return;
      }
      const source = Array.isArray(baseList) ? baseList : cards;
      const next = source.map((c, i) =>
        i === index ? { ...emptyLineCard(), ...filled } : c,
      );
      onCardsChange(next);
    } finally {
      setResolving(false);
    }
  };

  const addBlankCard = () => {
    if (cards.length >= 12) return;
    onCardsChange([...cards, emptyLineCard({ buttonLabel: "查看商品" })]);
  };

  const addPresetCard = (preset) => {
    if (cards.length >= 12) return;
    const stub = emptyLineCard({
      title: preset.label,
      imageUrl: preset.fallbackImage,
      url: preset.url,
      buttonLabel: "查看商品",
    });
    const next = [...cards, stub];
    onCardsChange(next);
    applyProductToCard(preset.handle, next.length - 1, next);
  };

  const fillRecommend = () => {
    const next = carouselPresets.slice(0, 5).map((p) =>
      emptyLineCard({
        title: p.label,
        imageUrl: p.fallbackImage,
        url: p.url,
        buttonLabel: "查看商品",
      }),
    );
    onCardsChange(next);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-stone-700 mb-2">LINE 版型</p>
        <div className="flex flex-wrap gap-2">
          {LINE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTemplateChange(t.id)}
              className={`px-3 py-2 rounded-lg text-sm font-bold border transition-colors ${
                template === t.id
                  ? "bg-[#06C755]/10 border-[#06C755] text-[#058a3c]"
                  : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="測試用 LINE userId" hint="選填；空白＝全部好友">
        <input
          className={`${inputCls} font-mono`}
          value={lineUserId}
          onChange={(e) => onLineUserIdChange(e.target.value)}
          placeholder="Uxxxxxxxx…"
        />
      </Field>

      {isLead || template === "text" ? (
        <div className="space-y-3 rounded-xl border border-stone-200 p-3">
          <p className="text-xs font-black text-stone-700">
            {template === "text" ? "文字卡片內容" : "前導文字（先傳到聊天室）"}
          </p>
          <Field label="標題">
            <input
              className={inputCls}
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={isLead ? "例：本週精選方案來了" : "例：🎁 本週優惠碼 JEKO88"}
              required={template === "text" || isLead}
            />
          </Field>
          <Field label="內容">
            <textarea
              rows={3}
              className={`${inputCls} resize-none`}
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder="例：輸入折扣碼享全站 88 折"
              required={template === "text" || isLead}
            />
          </Field>
          {template === "text" ? (
            <Field label="點擊後跳轉" hint="文字卡片按鈕連結">
              <input
                className={inputCls}
                value={card.url}
                onChange={(e) => onCardChange({ ...card, url: e.target.value })}
                placeholder="/ 或 /promo/"
              />
            </Field>
          ) : null}
        </div>
      ) : null}

      {isHero ? (
        <div className="space-y-3 rounded-xl border border-[#06C755]/25 p-3">
          <p className="text-xs font-black text-stone-700">DM 卡片（可自由編輯）</p>
          <StyleEditor style={cardStyle} onChange={onCardStyleChange} />
          <CardFields card={card} onChange={onCardChange} imagePresets={heroPresets} />
          <CardPreview card={card} style={cardStyle} />
        </div>
      ) : null}

      {isCarousel ? (
        <div className="space-y-3 rounded-xl border border-[#06C755]/25 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black text-stone-700">
              輪播卡片（{cards.length}/12，每張可自訂）
            </p>
            <button
              type="button"
              onClick={addBlankCard}
              className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-stone-200"
            >
              ＋空白卡片
            </button>
          </div>
          <StyleEditor style={cardStyle} onChange={onCardStyleChange} />
          {carouselPresets.length ? (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={fillRecommend}
                className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-[#06C755]/15 border border-[#06C755]/40 text-[#058a3c]"
              >
                一鍵帶入精選 5 品
              </button>
              {carouselPresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addPresetCard(p)}
                  disabled={resolving}
                  className="text-[11px] font-bold px-2 py-1 rounded-md border border-stone-200 bg-white"
                >
                  + {p.label}
                </button>
              ))}
            </div>
          ) : null}

          {cards.map((c, i) => (
            <div key={`card-${i}`} className="rounded-lg border border-stone-200 p-3 space-y-2 bg-white">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-stone-500">卡片 {i + 1}</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...cards];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      onCardsChange(next);
                    }}
                    className="text-[11px] px-2 py-1 rounded border disabled:opacity-30"
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    disabled={i === cards.length - 1}
                    onClick={() => {
                      const next = [...cards];
                      [next[i], next[i + 1]] = [next[i + 1], next[i]];
                      onCardsChange(next);
                    }}
                    className="text-[11px] px-2 py-1 rounded border disabled:opacity-30"
                  >
                    下移
                  </button>
                  <button
                    type="button"
                    onClick={() => onCardsChange(cards.filter((_, j) => j !== i))}
                    className="text-[11px] px-2 py-1 rounded border border-red-200 text-red-600"
                  >
                    刪除
                  </button>
                </div>
              </div>
              <CardFields
                card={c}
                onChange={(next) => {
                  const copy = [...cards];
                  copy[i] = next;
                  onCardsChange(copy);
                }}
                imagePresets={heroPresets}
              />
              <Field label="從商品 handle 帶入後再改">
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="japan-unlimited-esim"
                    id={`line-card-handle-${i}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const v = e.currentTarget.value.trim();
                        if (v) applyProductToCard(v, i);
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={resolving}
                    onClick={() => {
                      const input = document.getElementById(`line-card-handle-${i}`);
                      const v = input?.value?.trim();
                      if (v) applyProductToCard(v, i);
                    }}
                    className="shrink-0 text-xs font-bold px-3 rounded-lg border border-stone-200"
                  >
                    帶入
                  </button>
                </div>
              </Field>
            </div>
          ))}

          {cards.length ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {cards.map((c, i) => (
                <CardPreview key={`pv-${i}`} card={c} style={cardStyle} compact />
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-500">請新增卡片，或從精選方案帶入後再改圖／文。</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
