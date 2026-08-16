"use client";

import { useEffect, useRef, useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import {
  galleryUrls,
  parseSocialPostUrls,
  safeHref,
  youtubeEmbed,
} from "@/lib/partnerBlogBlocks";
import { designControlStyle, designShellStyle, designHeightPx, gapCss, designCardStyle, photoWallFrameStyle } from "@/lib/partnerBlogDesign";
import PartnerShareButtons from "@/components/Shop/PartnerShareButtons";
import WpPhotoWall from "@/components/Blog/WpPhotoWall";
import CanvasEditable from "./CanvasEditable";
import ItsHoverIcon from "@/components/icons/ItsHoverIcon";

/** 文字／HTML 元件：Enter 成段時不要空一整行 */
const RICH_TEXT_PROSE =
  "min-h-[1.5em] leading-[1.7] " +
  "[&_p]:m-0 [&_p]:leading-[1.7] [&_p+p]:mt-1.5 " +
  "[&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0 " +
  "[&_a]:text-[#0A6CD0] " +
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:leading-snug [&_h1:first-child]:mt-0 " +
  "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:leading-snug [&_h2:first-child]:mt-0 " +
  "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:leading-snug [&_h3:first-child]:mt-0 " +
  "[&_h4]:text-base [&_h4]:font-bold [&_h4]:mt-2 [&_h4]:mb-1 [&_h4]:leading-snug [&_h4:first-child]:mt-0 " +
  "[&_h5]:text-sm [&_h5]:font-bold [&_h5]:mt-2 [&_h5]:mb-1 [&_h5:first-child]:mt-0 " +
  "[&_h6]:text-xs [&_h6]:font-bold [&_h6]:mt-2 [&_h6]:mb-1 [&_h6:first-child]:mt-0";

function Align({ value, children }) {
  const map = { left: "text-left", center: "text-center", right: "text-right" };
  return <div className={map[value] || "text-left"}>{children}</div>;
}

function carouselHeight(h) {
  return Math.min(720, Math.max(160, Number(h) || 320));
}

function CarouselPublic({
  urls = [],
  style = "slide",
  effect = "slide",
  visible = 1,
  autoplay = true,
  interval = 4,
  height = 320,
}) {
  const [i, setI] = useState(0);
  const n = urls.length;
  const shown = Math.min(6, Math.max(1, Number(visible) || 1), Math.max(1, n));
  const raw =
    effect ||
    (style === "fade" ? "fade" : style === "peek" ? "peek" : "slide");
  const mode =
    raw === "cube" ? "cards" : raw === "coverflow" ? "peek" : raw;
  const h = carouselHeight(height);

  useEffect(() => {
    if (!autoplay || n < 2 || mode === "marquee") return undefined;
    const t = window.setInterval(
      () => setI((x) => (x + 1) % n),
      Math.max(2, Number(interval) || 4) * 1000,
    );
    return () => window.clearInterval(t);
  }, [autoplay, interval, n, mode]);

  if (!n) {
    return (
      <div className="bg-slate-100 text-slate-400 text-sm py-12 text-center rounded">
        上傳圖片組成輪播
      </div>
    );
  }

  const prev = () => setI((x) => (x - 1 + n) % n);
  const next = () => setI((x) => (x + 1) % n);

  if (mode === "marquee") {
    const loop = [...urls, ...urls];
    const dur = Math.max(12, n * 4);
    const cardW = Math.max(140, Math.round((h * 16) / 10 / Math.min(shown, 3)));
    return (
      <div className="overflow-hidden rounded-xl bg-slate-100">
        <div
          className="flex w-max"
          style={{ animation: `jeko-marquee ${dur}s linear infinite` }}
        >
          {loop.map((src, idx) => (
            <div
              key={`${src}-${idx}`}
              className="shrink-0 pr-2"
              style={{ width: cardW }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full object-cover rounded-lg" style={{ height: h }} />
            </div>
          ))}
        </div>
        <style>{`
          @keyframes jeko-marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    );
  }

  if (mode === "fade" || mode === "zoom") {
    return (
      <div className="relative overflow-hidden rounded-xl bg-slate-900" style={{ height: h }}>
        {urls.map((src, idx) => (
          <div
            key={`${src}-${idx}`}
            className="absolute inset-0 transition-all duration-700 ease-out"
            style={{
              opacity: idx === i ? 1 : 0,
              transform:
                mode === "zoom"
                  ? idx === i
                    ? "scale(1)"
                    : "scale(1.12)"
                  : "none",
              zIndex: idx === i ? 1 : 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
        <CarouselNav n={n} i={i} prev={prev} next={next} setI={setI} />
      </div>
    );
  }

  if (mode === "cards") {
    return (
      <div
        className="relative overflow-hidden rounded-xl bg-slate-100"
        style={{ height: h, perspective: 900 }}
      >
        {urls.map((src, idx) => {
          const dist = idx - i;
          const abs = Math.abs(dist);
          return (
            <div
              key={`${src}-${idx}`}
              className="absolute left-1/2 top-0 -translate-x-1/2 w-[78%] max-w-full"
              style={{
                height: h,
                transform: `translateX(calc(-50% + ${dist * 36}px)) scale(${
                  1 - abs * 0.08
                }) rotateY(${dist * -22}deg)`,
                opacity: abs > 2 ? 0 : 1,
                zIndex: 20 - abs,
                transition: "transform 0.55s ease, opacity 0.4s ease",
                pointerEvents: abs === 0 ? "auto" : "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover rounded-xl shadow-lg"
              />
            </div>
          );
        })}
        <CarouselNav n={n} i={i} prev={prev} next={next} setI={setI} />
      </div>
    );
  }

  if (mode === "peek") {
    return (
      <div className="relative overflow-hidden rounded-xl bg-transparent py-2" style={{ height: h + 16 }}>
        <div
          className="flex items-center h-full transition-transform duration-700 ease-in-out"
          style={{
            transform: `translateX(calc(50% - ${(i + 0.5) * (100 / shown)}%))`,
          }}
        >
          {urls.map((src, idx) => {
            const on = idx === i;
            return (
              <div
                key={`${src}-${idx}`}
                className="shrink-0 px-1.5"
                style={{ width: `${100 / shown}%` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  onClick={() => setI(idx)}
                  className="w-full object-cover rounded-lg cursor-pointer transition-opacity duration-700"
                  style={{ height: h, opacity: on ? 1 : 0.4 }}
                />
              </div>
            );
          })}
        </div>
        <CarouselNav n={n} i={i} prev={prev} next={next} setI={setI} />
      </div>
    );
  }

  const maxStart = Math.max(0, n - shown);
  const start = Math.min(i, maxStart);
  const pct = 100 / shown;

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-100 py-1">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${start * pct}%)` }}
      >
        {urls.map((src, idx) => (
          <div
            key={`${src}-${idx}`}
            className="shrink-0 px-1"
            style={{ width: `${pct}%` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="w-full object-cover rounded-lg"
              style={{ height: h }}
            />
          </div>
        ))}
      </div>
      {n > shown ? (
        <CarouselNav
          n={n}
          i={start}
          prev={() => setI((x) => (x <= 0 ? maxStart : x - 1))}
          next={() => setI((x) => (x >= maxStart ? 0 : x + 1))}
          setI={(idx) => setI(Math.min(maxStart, idx))}
        />
      ) : null}
    </div>
  );
}

function CarouselNav({ n, i, prev, next, setI }) {
  if (n < 2) return null;
  return (
    <>
      <button
        type="button"
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-[2] w-8 h-8 rounded-full bg-black/40 text-white"
        aria-label="上一張"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-[2] w-8 h-8 rounded-full bg-black/40 text-white"
        aria-label="下一張"
      >
        ›
      </button>
      <div className="absolute bottom-2 left-0 right-0 z-[2] flex justify-center gap-1">
        {Array.from({ length: n }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setI(idx)}
            className={`h-1.5 rounded-full ${idx === i ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
          />
        ))}
      </div>
    </>
  );
}

function productGridClass(layout, n) {
  if (layout === "row") return "grid grid-cols-1 h-full";
  if (n <= 1) return "grid grid-cols-1 max-w-md h-full";
  if (n === 2) return "grid grid-cols-1 sm:grid-cols-2 h-full";
  if (layout === "cards") return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 h-full";
  return "grid grid-cols-2 lg:grid-cols-3 h-full";
}

function ProductCard({ it, editable, card }) {
  const style = designCardStyle(card || {});
  return (
    <a
      href={it.href || "#"}
      onClick={editable ? (e) => e.preventDefault() : undefined}
      className={`group flex flex-col h-full min-h-0 bg-white hover:shadow-md transition ${
        Number(card?.card_border_w) > 0 ? "" : "border border-slate-200"
      }`}
      style={style}
    >
      <div className="relative w-full flex-none bg-[#efeee9] overflow-hidden">
        <span className="block w-full" style={{ paddingTop: "75%" }} aria-hidden />
        {it.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={it.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : null}
      </div>
      <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-0">
        <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5em]">
          {it.name}
        </p>
        <div className="mt-auto pt-3">
          {it.price ? (
            <p className="text-[15px] font-black text-[#1E4AD1]">NT${it.price}</p>
          ) : (
            <p className="text-[12px] text-slate-400">查看方案</p>
          )}
          <span className="mt-2 inline-flex text-[11px] font-bold tracking-wide text-[#1E4AD1]">
            選購方案 →
          </span>
        </div>
      </div>
    </a>
  );
}

function ProductsPages({ items, perPage = 2, editable, card }) {
  const [page, setPage] = useState(0);
  const size = Math.min(4, Math.max(1, Number(perPage) || 2));
  const pages = Math.max(1, Math.ceil(items.length / size));
  const safe = Math.min(page, pages - 1);
  const slice = items.slice(safe * size, safe * size + size);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pages - 1)));
  }, [pages, items.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-2 mb-4">
        {Array.from({ length: pages }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPage(i)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition ${
              safe === i
                ? "bg-[#1E4AD1] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {size === 1 ? items[i]?.name?.slice(0, 10) || `分頁 ${i + 1}` : `分頁 ${i + 1}`}
          </button>
        ))}
      </div>
      <div className={`${productGridClass("cards", slice.length)} min-h-[220px]`}>
        {slice.map((it) => (
          <ProductCard
            key={it.handle || it.href}
            it={it}
            editable={editable}
            card={card}
          />
        ))}
      </div>
    </div>
  );
}

function ProductsCarousel({
  items,
  visible = 2,
  autoplay = true,
  interval = 4,
  editable,
  card,
}) {
  const [i, setI] = useState(0);
  const n = items.length;
  const shown = Math.min(6, Math.max(1, Number(visible) || 2), Math.max(1, n));
  const maxStart = Math.max(0, n - shown);
  const start = Math.min(i, maxStart);
  const pct = 100 / shown;

  useEffect(() => {
    if (editable || !autoplay || n <= shown) return undefined;
    const t = window.setInterval(
      () => setI((x) => (x >= maxStart ? 0 : x + 1)),
      Math.max(2, Number(interval) || 4) * 1000,
    );
    return () => window.clearInterval(t);
  }, [autoplay, interval, n, shown, maxStart, editable]);

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          className="flex items-stretch transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${start * pct}%)` }}
        >
          {items.map((it) => (
            <div
              key={it.handle || it.href}
              className="shrink-0 px-1.5 min-w-0"
              style={{ width: `${pct}%` }}
            >
              <div className="h-full min-w-0">
                <ProductCard it={it} editable={editable} card={card} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {n > shown ? (
        <>
          <button
            type="button"
            onClick={() => setI((x) => (x <= 0 ? maxStart : x - 1))}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-[2] w-8 h-8 rounded-full bg-white shadow border border-slate-200 text-slate-700"
            aria-label="上一組"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setI((x) => (x >= maxStart ? 0 : x + 1))}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-[2] w-8 h-8 rounded-full bg-white shadow border border-slate-200 text-slate-700"
            aria-label="下一組"
          >
            ›
          </button>
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: maxStart + 1 }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setI(idx)}
                className={`h-1.5 rounded-full transition ${
                  start === idx ? "w-5 bg-[#1E4AD1]" : "w-1.5 bg-slate-300"
                }`}
                aria-label={`第 ${idx + 1} 組`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ProductsPublic({
  title,
  layout,
  items,
  perPage,
  visible,
  autoplay,
  interval,
  gap,
  card,
  editable,
  onPatch,
}) {
  if (!items?.length) {
    return (
      <div className="bg-slate-100 text-slate-400 text-sm py-10 text-center rounded">
        從編輯框勾選賣場商品
      </div>
    );
  }
  return (
    <section className="h-full flex flex-col">
      {title || editable ? (
        <CanvasEditable
          enabled={editable}
          as="h3"
          className="text-[17px] font-black text-slate-900 leading-snug tracking-tight mt-0 mb-4 shrink-0"
          value={title || ""}
          singleLine
          placeholder="區塊標題"
          onChange={(v) => onPatch?.({ title: v })}
        />
      ) : null}
      {layout === "pages" ? (
        <ProductsPages items={items} perPage={perPage} editable={editable} card={card} />
      ) : layout === "carousel" ? (
        <ProductsCarousel
          items={items}
          visible={visible}
          autoplay={autoplay}
          interval={interval}
          editable={editable}
          card={card}
        />
      ) : (
        <div
          className={productGridClass(layout, items.length)}
          style={{ gap: gapCss(gap) }}
        >
          {items.map((it) => (
            <ProductCard key={it.handle || it.href} it={it} editable={editable} card={card} />
          ))}
        </div>
      )}
    </section>
  );
}

function SocialPublic({ props: p, editable, onPatch }) {
  const links = [
    { href: p.instagram, label: "Instagram", color: "from-[#f58529] to-[#dd2a7b]" },
    { href: p.facebook, label: "Facebook", color: "from-[#1877F2] to-[#1877F2]" },
    { href: p.line, label: "LINE", color: "from-[#06C755] to-[#06C755]" },
  ].filter((x) => x.href);
  const titleEl = (
    <CanvasEditable
      enabled={editable}
      as="h3"
      className={
        p.style === "banner"
          ? "text-lg font-black"
          : "text-[17px] font-black text-slate-900 leading-snug mt-0 mb-2"
      }
      value={p.title || ""}
      singleLine
      placeholder="追蹤我們"
      onChange={(v) => onPatch?.({ title: v })}
    />
  );
  const textEl =
    p.text || editable ? (
      <CanvasEditable
        enabled={editable}
        as="p"
        className={
          p.style === "banner"
            ? "text-sm text-white/70 mt-1"
            : "text-sm text-slate-500 mb-3"
        }
        value={p.text || ""}
        placeholder="說明文字"
        onChange={(v) => onPatch?.({ text: v })}
      />
    ) : null;

  if (p.style === "banner") {
    return (
      <div className="rounded-2xl bg-slate-900 text-white px-6 py-8 text-center">
        {titleEl}
        {textEl}
        <div className="flex justify-center gap-2 mt-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={editable ? undefined : l.href}
              onClick={editable ? (e) => e.preventDefault() : undefined}
              className={`px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${l.color}`}
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (p.style === "cards") {
    return (
      <div>
        {p.title || editable ? (
          <CanvasEditable
            enabled={editable}
            as="h3"
            className="text-[17px] font-black text-slate-900 leading-snug mt-0 mb-3"
            value={p.title || ""}
            singleLine
            placeholder="區塊標題"
            onChange={(v) => onPatch?.({ title: v })}
          />
        ) : null}
        <div className="grid sm:grid-cols-3 gap-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={editable ? undefined : l.href}
              onClick={editable ? (e) => e.preventDefault() : undefined}
              className={`rounded-xl p-4 text-white text-center font-bold bg-gradient-to-br ${l.color}`}
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {p.title || editable ? titleEl : null}
      {textEl}
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${l.color}`}
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function socialNativeSize(platform) {
  if (platform === "facebook") return { w: 500, h: 640 };
  return { w: 540, h: 720 };
}

const SOCIAL_CARD_MIN = 260;
const SOCIAL_CARD_MAX = 400;

function useElementWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const apply = () => setW(el.clientWidth);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** 整張 IG/FB 卡等比縮放：高度與寬度對齊 native 比例，不裁切、不留黑邊 */
function SocialEmbedCard({ post, slotW, maxH, cardStyle, blockIframe }) {
  const { w: nw, h: nh } = socialNativeSize(post.platform);
  const availW = Math.max(120, Number(slotW) || nw);
  const availH = Number(maxH) > 0 ? maxH : nh;
  const scale = Math.min(availW / nw, availH / nh, 1);
  const dw = Math.round(nw * scale);
  const dh = Math.round(nh * scale);
  const skin = designCardStyle(cardStyle || {});
  const hideDefaultShadow =
    cardStyle?.card_shadow === "none" ||
    cardStyle?.card_shadow === "sm" ||
    cardStyle?.card_shadow === "md";
  return (
    <div
      className={`relative mx-auto ${cardStyle?.card_bg ? "" : "bg-white"} ${
        hideDefaultShadow ? "" : "shadow-sm"
      }`}
      style={{
        width: dw,
        height: dh,
        ...skin,
      }}
    >
      <iframe
        title={post.label}
        src={post.embedSrc}
        className={blockIframe ? "pointer-events-none" : undefined}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: nw,
          height: nh,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        loading="lazy"
        scrolling="no"
        allow="encrypted-media; clipboard-write"
      />
      {blockIframe ? (
        <div className="absolute inset-0 z-[1] cursor-grab" aria-hidden />
      ) : null}
    </div>
  );
}

function fitSocialCount(boxW, gapPx, wanted, n) {
  const cap = Math.min(4, wanted, n);
  if (boxW <= 0) return Math.max(1, cap);
  const maxFit = Math.max(
    1,
    Math.floor((boxW + gapPx) / (SOCIAL_CARD_MIN + gapPx)),
  );
  return Math.min(4, n, wanted, maxFit);
}

function socialSlotWidth(boxW, gapPx, shown) {
  if (boxW <= 0 || shown <= 0) return SOCIAL_CARD_MAX;
  const raw = Math.floor((boxW - gapPx * (shown - 1)) / shown);
  return Math.min(SOCIAL_CARD_MAX, Math.max(SOCIAL_CARD_MIN, raw));
}

function useDragScroll(ref, enabled, dragFlagRef, onTapRef) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return undefined;
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let moved = 0;
    const down = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      moved = 0;
      if (dragFlagRef) dragFlagRef.current = true;
      el.style.cursor = "grabbing";
      el.style.scrollSnapType = "none";
    };
    const move = (e) => {
      if (!dragging) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      el.scrollLeft = startScroll - dx;
    };
    const up = (e) => {
      if (!dragging) return;
      dragging = false;
      if (dragFlagRef) dragFlagRef.current = false;
      el.style.cursor = "grab";
      el.style.scrollSnapType = "x mandatory";
      if (moved > 8) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        onTapRef?.current?.(e);
      }
    };
    el.addEventListener("pointerdown", down, { capture: true });
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down, { capture: true });
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("pointerup", up);
    };
  }, [enabled, dragFlagRef, onTapRef, ref]);
}

function SocialPostPublic({
  urls,
  layout = "carousel",
  gap = "md",
  visible = 4,
  autoplay = true,
  interval = 4,
  heightMode,
  minH,
  cardStyle,
  editable,
}) {
  const posts = parseSocialPostUrls(urls);
  const [boxRef, boxW] = useElementWidth();
  const scrollerRef = useRef(null);
  const draggingRef = useRef(false);
  const hoverRef = useRef(false);
  const onTapRef = useRef(null);
  const [page, setPage] = useState(0);
  const gapPx = gapCss(gap);
  const maxH = designHeightPx({ height_mode: heightMode, min_h: minH }) || 0;
  const n = posts.length;
  const wanted = Math.min(4, Math.max(1, Number(visible) || 4));
  const shown = fitSocialCount(boxW, gapPx, wanted, Math.max(1, n));
  const slotW = socialSlotWidth(boxW, gapPx, shown);
  const step = slotW + gapPx;
  const isCarousel = layout !== "stack" && n > 1;
  const loop = isCarousel && !editable ? [...posts, ...posts] : posts;

  onTapRef.current = (e) => {
    const node = e.target?.closest?.("[data-permalink]");
    const href = node?.getAttribute("data-permalink");
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  };
  useDragScroll(scrollerRef, isCarousel && !editable, draggingRef, onTapRef);

  useEffect(() => {
    if (!isCarousel || editable || autoplay === false || n < 2) return undefined;
    const el = scrollerRef.current;
    if (!el) return undefined;
    const ms = Math.max(2, Number(interval) || 4) * 1000;
    const t = window.setInterval(() => {
      if (draggingRef.current || hoverRef.current) return;
      if (n * step <= 0) return;
      el.scrollTo({ left: el.scrollLeft + step, behavior: "smooth" });
    }, ms);
    return () => window.clearInterval(t);
  }, [isCarousel, editable, autoplay, interval, n, step]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !isCarousel) return undefined;
    const onScroll = () => {
      const cycle = n * step;
      if (cycle > 0 && el.scrollLeft >= cycle - 1) {
        el.scrollLeft -= cycle;
      }
      if (step > 0) setPage(Math.round(el.scrollLeft / step) % n);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isCarousel, n, step]);

  if (!n) {
    return (
      <div className="bg-slate-100 text-slate-400 text-sm py-12 text-center rounded-xl border border-dashed border-slate-300">
        貼上 Instagram 或 Facebook 貼文網址
      </div>
    );
  }

  const card = (post, key) => (
    <SocialEmbedCard
      key={key}
      post={post}
      slotW={slotW}
      maxH={maxH}
      cardStyle={cardStyle}
      blockIframe={isCarousel && !editable}
    />
  );

  if (layout === "stack") {
    return (
      <div ref={boxRef} className="w-full flex flex-col items-center" style={{ gap: gapPx }}>
        {posts.map((post) => card(post, post.embedSrc))}
      </div>
    );
  }

  if (isCarousel) {
    return (
      <div
        ref={boxRef}
        className="relative w-full min-w-0"
        onMouseEnter={() => {
          hoverRef.current = true;
        }}
        onMouseLeave={() => {
          hoverRef.current = false;
        }}
      >
        <div
          ref={scrollerRef}
          className="flex overflow-x-auto pb-1 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            gap: gapPx,
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            cursor: editable ? "default" : "grab",
            touchAction: "pan-y",
          }}
        >
          {loop.map((post, idx) => (
            <div
              key={`${post.embedSrc}-${idx}`}
              data-permalink={post.permalink}
              className="shrink-0"
              style={{
                width: slotW,
                scrollSnapAlign: "start",
              }}
            >
              {card(post, `${post.embedSrc}-${idx}`)}
            </div>
          ))}
        </div>
        {!editable && n > 1 ? (
          <div className="flex justify-center gap-1.5 mt-3">
            {posts.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`第 ${i + 1} 則`}
                className={`h-1.5 rounded-full transition-all ${
                  i === page ? "w-5 bg-[#1E4AD1]" : "w-1.5 bg-slate-300"
                }`}
                onClick={() => {
                  const el = scrollerRef.current;
                  if (!el) return;
                  el.scrollTo({ left: i * step, behavior: "smooth" });
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className="w-full min-w-0"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${shown}, minmax(0, 1fr))`,
        gap: gapPx,
        alignItems: "start",
        justifyItems: "center",
      }}
    >
      {posts.map((post) => card(post, post.embedSrc))}
    </div>
  );
}

function patchItem(items, i, field, value) {
  return (items || []).map((it, idx) =>
    idx === i ? { ...it, [field]: value } : it,
  );
}

function AccordionPublic({ items, editable, onPatch }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
      {(items || []).map((it, i) => {
        const Head = editable ? "div" : "button";
        return (
          <div key={i}>
            <Head
              type={editable ? undefined : "button"}
              className="w-full text-left px-4 py-3 font-bold text-slate-800 flex items-center justify-between"
              onClick={
                editable
                  ? undefined
                  : () => setOpen(open === i ? -1 : i)
              }
            >
              <CanvasEditable
                enabled={editable}
                as="span"
                className="flex-1 pr-2"
                value={it.title || ""}
                singleLine
                placeholder="標題"
                onChange={(v) => onPatch?.({ items: patchItem(items, i, "title", v) })}
              />
              <MaterialIcon name={open === i || editable ? "expand_less" : "expand_more"} size={18} />
            </Head>
            {open === i || editable ? (
              <CanvasEditable
                enabled={editable}
                as="div"
                className="px-4 pb-4 text-slate-600 text-[15px] leading-relaxed whitespace-pre-line"
                value={it.body || ""}
                placeholder="內容"
                onChange={(v) => onPatch?.({ items: patchItem(items, i, "body", v) })}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function TabsPublic({ items, editable, onPatch }) {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {(items || []).map((it, i) => {
          const TabBtn = editable ? "div" : "button";
          return (
            <TabBtn
              key={i}
              type={editable ? undefined : "button"}
              onClick={() => setTab(i)}
              className={`px-3 py-2 text-sm font-bold cursor-pointer ${
                tab === i
                  ? "text-[#1E4AD1] border-b-2 border-[#1E4AD1]"
                  : "text-slate-500"
              }`}
            >
              <CanvasEditable
                enabled={editable}
                as="span"
                value={it.title || ""}
                singleLine
                placeholder="分頁"
                onChange={(v) => onPatch?.({ items: patchItem(items, i, "title", v) })}
              />
            </TabBtn>
          );
        })}
      </div>
      <CanvasEditable
        enabled={editable}
        as="p"
        className="text-slate-700 whitespace-pre-line"
        value={items?.[tab]?.body || ""}
        placeholder="分頁內容"
        onChange={(v) => onPatch?.({ items: patchItem(items, tab, "body", v) })}
      />
    </div>
  );
}

/** 標題與內文緊貼；標題前一段落才拉開 */
export function blockStackGapClass(type, nextType) {
  if (type === "heading") return "mb-2 last:mb-0";
  if (type === "text" && nextType === "heading") return "mb-8 last:mb-0";
  if (type === "text" || type === "divider") return "mb-4 last:mb-0";
  if (type === "spacer") return "mb-0";
  return "mb-6 last:mb-0";
}

export function PartnerBlogBlockView({
  block,
  renderBlocks,
  editable = false,
  onChangeProps,
  shareContext,
}) {
  const p = block.props || {};
  const stretch =
    block.type !== "social-post" &&
    Boolean(p.height_mode && p.height_mode !== "auto");
  return (
    <div
      style={designShellStyle(block.type, p)}
      className={`w-full min-w-0 ${stretch ? "h-full" : ""}`}
    >
      <div className={stretch ? "flex-1 min-h-0 flex flex-col w-full [&>*]:flex-1" : "w-full min-w-0"}>
        <PartnerBlogBlockBody
          block={block}
          renderBlocks={renderBlocks}
          editable={editable}
          onChangeProps={onChangeProps}
          shareContext={shareContext}
        />
      </div>
    </div>
  );
}

function PartnerBlogBlockBody({
  block,
  renderBlocks,
  editable = false,
  onChangeProps,
  shareContext,
}) {
  const p = block.props || {};
  const patch = (partial) => onChangeProps?.({ ...p, ...partial });
  switch (block.type) {
    case "heading": {
      const Tag = p.tag || "h2";
      const headingCls = {
        h1: "text-2xl font-bold text-slate-900 leading-snug mt-0 mb-0",
        h2: "text-xl font-bold text-slate-900 leading-snug mt-0 mb-0",
        h3: "text-lg font-bold text-slate-900 leading-snug mt-0 mb-0",
        h4: "text-base font-bold text-slate-900 leading-snug mt-0 mb-0",
      };
      return (
        <Align value={p.align}>
          <CanvasEditable
            enabled={editable}
            as={Tag}
            className={headingCls[Tag] || headingCls.h2}
            value={p.text || ""}
            singleLine
            placeholder="標題文字"
            onChange={(v) => patch({ text: v })}
          />
        </Align>
      );
    }
    case "text":
      return (
        <CanvasEditable
          enabled={editable}
          as="div"
          className={RICH_TEXT_PROSE}
          value={p.html || ""}
          html
          placeholder="在這裡撰寫段落"
          onChange={(v) => patch({ html: v })}
        />
      );
    case "image":
      if (!p.src) {
        return (
          <div className="bg-slate-100 text-slate-400 text-sm py-12 text-center rounded">
            尚未設定圖片網址
          </div>
        );
      }
      return (
        <figure className="w-full m-0 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.src}
            alt={p.alt || ""}
            className="block w-auto max-w-full h-auto max-h-[100dvh] object-contain bg-[#faf9f6]"
          />
          {p.caption || editable ? (
            <CanvasEditable
              enabled={editable}
              as="figcaption"
              className="text-center text-xs text-slate-500 mt-2"
              value={p.caption || ""}
              placeholder="圖片說明"
              onChange={(v) => patch({ caption: v })}
            />
          ) : null}
        </figure>
      );
    case "video": {
      const src = youtubeEmbed(p.url);
      if (src) {
        return (
          <div className="aspect-video bg-black">
            <iframe
              src={src}
              title="video"
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        );
      }
      if (p.fileUrl) {
        return (
          <video
            src={p.fileUrl}
            controls
            playsInline
            className="w-full rounded bg-black"
          />
        );
      }
      return (
        <div className="bg-slate-100 text-slate-400 text-sm py-10 text-center rounded">
          上傳影片或貼上 YouTube／Vimeo 網址
        </div>
      );
    }
    case "button": {
      const outline = p.style === "outline";
      return (
        <Align value={p.align}>
          <a
            href={editable ? undefined : safeHref(p.href, "#")}
            onClick={editable ? (e) => e.preventDefault() : undefined}
            className="font-bold text-sm"
            style={designControlStyle(p, { outline })}
          >
            <CanvasEditable
              enabled={editable}
              as="span"
              value={p.label || ""}
              singleLine
              placeholder="按鈕文字"
              onChange={(v) => patch({ label: v })}
            />
          </a>
        </Align>
      );
    }
    case "divider":
      return (
        <hr
          style={{
            borderStyle: p.style === "dashed" ? "dashed" : "solid",
            borderColor: p.fill || p.border || "#e2e8f0",
            borderWidth: 0,
            borderTopWidth: p.border_w || 1,
          }}
        />
      );
    case "spacer":
      return <div style={{ height: Number(p.height) || 32 }} />;
    case "html":
      return (
        <CanvasEditable
          enabled={editable}
          as="div"
          className={RICH_TEXT_PROSE}
          value={p.html || ""}
          html
          placeholder="HTML 內容"
          onChange={(v) => patch({ html: v })}
        />
      );
    case "columns":
    case "grid": {
      const colsN =
        block.type === "grid"
          ? Math.min(4, Number(p.cols) || 2)
          : Number(p.count) === 3
            ? 3
            : 2;
      const gap = gapCss(p.gap);
      return (
        <div
          className="w-full min-w-0"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${colsN}, minmax(0, 1fr))`,
            gap,
          }}
        >
          {(block.columns || []).map((col, i) => (
            <div key={i} className="min-w-0 w-full">
              {renderBlocks ? renderBlocks(col, `${block.id}-${i}`) : null}
            </div>
          ))}
        </div>
      );
    }
    case "table": {
      const cells = p.cells || [];
      const header = p.header !== false;
      const lineW = p.border_w == null ? 1 : Number(p.border_w);
      const lineColor = p.border || "#e2e8f0";
      const line = lineW > 0 ? `${lineW}px solid ${lineColor}` : "none";
      const headBg = p.fill || "#f8fafc";
      return (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {cells.map((row, ri) => (
                <tr key={ri}>
                  {(row || []).map((cell, ci) => {
                    const Tag = header && ri === 0 ? "th" : "td";
                    const isHead = header && ri === 0;
                    return (
                      <Tag
                        key={ci}
                        className={`px-3 py-2 text-left ${isHead ? "font-bold" : ""}`}
                        style={{
                          border: line,
                          background: isHead ? headBg : undefined,
                        }}
                      >
                        <CanvasEditable
                          enabled={editable}
                          as="span"
                          className="block min-h-[1.2em]"
                          value={cell || ""}
                          placeholder="…"
                          onChange={(v) => {
                            const next = cells.map((r) => [...r]);
                            next[ri][ci] = v;
                            patch({ cells: next });
                          }}
                        />
                      </Tag>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "gallery": {
      const urls = galleryUrls(p.urls);
      if (!urls.length) {
        return (
          <div className="bg-slate-100 text-slate-400 text-sm py-10 text-center rounded">
            上傳或貼上圖片網址
          </div>
        );
      }
      const gCols = Math.min(3, Math.max(1, urls.length));
      return (
        <div
          className="w-full min-w-0"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gCols}, minmax(0, 1fr))`,
            gap: gapCss(p.gap),
          }}
        >
          {urls.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className="block w-full h-40 sm:h-48 object-cover rounded"
            />
          ))}
        </div>
      );
    }
    case "photo-wall": {
      const urls = galleryUrls(p.urls, 24);
      if (!urls.length) {
        return (
          <div className="bg-slate-100 text-slate-400 text-sm py-10 text-center rounded">
            上傳多張圖片組成圖片牆
          </div>
        );
      }
      const wallBox = photoWallFrameStyle(p);
      return (
        <div
          className="min-w-0"
          style={wallBox.track}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="photo-wall-frame min-w-0" style={wallBox.frame}>
            <WpPhotoWall
              images={urls.map((src) => ({ src, href: src, alt: "" }))}
              isWide={p.wide === true}
              size={p.size || "md"}
              align={p.align || "left"}
              layout={p.layout === "square" ? "square" : "mosaic"}
            />
          </div>
        </div>
      );
    }
    case "icon": {
      const size = Math.min(96, Math.max(20, Number(p.size) || 48));
      const color = p.color || p.fill || "currentColor";
      const iconEl = (
        <ItsHoverIcon name={p.name || "airplane"} size={size} color={color} />
      );
      const caption =
        p.label || editable ? (
          <CanvasEditable
            enabled={editable}
            as="span"
            className="text-sm text-slate-600"
            value={p.label || ""}
            singleLine
            placeholder="說明文字"
            onChange={(v) => patch({ label: v })}
          />
        ) : null;
      const inner = (
        <span className="inline-flex flex-col items-center gap-1.5">
          {iconEl}
          {caption}
        </span>
      );
      if (p.href && !editable) {
        return (
          <Align value={p.align || "center"}>
            <a href={safeHref(p.href, "#")} className="inline-flex no-underline text-inherit">
              {inner}
            </a>
          </Align>
        );
      }
      return <Align value={p.align || "center"}>{inner}</Align>;
    }
    case "icon-box":
      return (
        <div className="text-center px-4 py-6 border border-slate-200 rounded-xl">
          <MaterialIcon name={p.icon || "travel_explore"} size={32} className="text-[#1E4AD1]" />
          <CanvasEditable
            enabled={editable}
            as="h3"
            className="mt-3 text-base font-bold text-slate-900 leading-snug"
            value={p.title || ""}
            singleLine
            placeholder="重點標題"
            onChange={(v) => patch({ title: v })}
          />
          <CanvasEditable
            enabled={editable}
            as="p"
            className="mt-1 text-sm text-slate-600"
            value={p.text || ""}
            placeholder="補充說明"
            onChange={(v) => patch({ text: v })}
          />
        </div>
      );
    case "icon-list": {
      const lines = String(p.items || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const show = lines.length ? lines : editable ? [""] : [];
      return (
        <ul className="space-y-2">
          {show.map((l, i) => (
            <li key={i} className="flex gap-2 text-slate-700">
              <MaterialIcon name="check_circle" size={18} className="text-[#1E4AD1] shrink-0 mt-0.5" />
              <CanvasEditable
                enabled={editable}
                as="span"
                className="flex-1"
                value={l}
                singleLine
                placeholder="清單項目"
                onChange={(v) => {
                  const next = [...show];
                  next[i] = v;
                  patch({ items: next.join("\n") });
                }}
              />
            </li>
          ))}
        </ul>
      );
    }
    case "accordion":
      return <AccordionPublic items={p.items} editable={editable} onPatch={patch} />;
    case "tabs":
      return <TabsPublic items={p.items} editable={editable} onPatch={patch} />;
    case "alert": {
      const tones = {
        info: "bg-sky-50 border-sky-200 text-sky-900",
        warning: "bg-amber-50 border-amber-200 text-amber-900",
        success: "bg-emerald-50 border-emerald-200 text-emerald-900",
      };
      const custom = p.bg || p.fill;
      return (
        <div
          className={`px-4 py-3 text-sm ${custom ? "" : `border rounded-lg ${tones[p.tone] || tones.info}`}`}
          style={
            custom
              ? {
                  background: p.bg || p.fill,
                  color: p.color || undefined,
                  borderRadius: p.radius ? Number(p.radius) : 8,
                  border: `${p.border_w || 1}px solid ${p.border || "transparent"}`,
                }
              : undefined
          }
        >
          <CanvasEditable
            enabled={editable}
            as="span"
            value={p.text || ""}
            placeholder="提示文字"
            onChange={(v) => patch({ text: v })}
          />
        </div>
      );
    }
    case "quote":
      return (
        <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-600">
          <CanvasEditable
            enabled={editable}
            as="span"
            value={p.text || ""}
            placeholder="引言"
            onChange={(v) => patch({ text: v })}
          />
          {p.cite || editable ? (
            <cite className="block not-italic text-xs mt-2">
              —{" "}
              <CanvasEditable
                enabled={editable}
                as="span"
                value={p.cite || ""}
                singleLine
                placeholder="出處"
                onChange={(v) => patch({ cite: v })}
              />
            </cite>
          ) : null}
        </blockquote>
      );
    case "testimonial":
      return (
        <div className="bg-[#f3f1eb] rounded-xl px-5 py-6">
          <p className="text-slate-700 leading-relaxed">
            「
            <CanvasEditable
              enabled={editable}
              as="span"
              value={p.text || ""}
              placeholder="推薦語"
              onChange={(v) => patch({ text: v })}
            />
            」
          </p>
          <p className="mt-3 text-sm font-bold text-slate-900">
            <CanvasEditable
              enabled={editable}
              as="span"
              value={p.name || ""}
              singleLine
              placeholder="姓名"
              onChange={(v) => patch({ name: v })}
            />
            {p.role || editable ? (
              <span className="font-normal text-slate-500">
                {" "}
                ·{" "}
                <CanvasEditable
                  enabled={editable}
                  as="span"
                  value={p.role || ""}
                  singleLine
                  placeholder="身分"
                  onChange={(v) => patch({ role: v })}
                />
              </span>
            ) : null}
          </p>
        </div>
      );
    case "cta":
      return (
        <div
          className="px-6 py-8 text-center"
          style={{
            background: p.fill || p.bg || "#1E4AD1",
            color: p.color || "#ffffff",
            borderRadius: p.radius ? (Number(p.radius) >= 999 ? 9999 : Number(p.radius)) : 16,
          }}
        >
          <CanvasEditable
            enabled={editable}
            as="h2"
            className="text-xl font-black"
            value={p.title || ""}
            singleLine
            placeholder="標題"
            onChange={(v) => patch({ title: v })}
          />
          <CanvasEditable
            enabled={editable}
            as="p"
            className="mt-2 text-sm opacity-90"
            value={p.text || ""}
            placeholder="說明"
            onChange={(v) => patch({ text: v })}
          />
          <a
            href={editable ? undefined : safeHref(p.href, "#")}
            onClick={editable ? (e) => e.preventDefault() : undefined}
            className="inline-flex mt-5"
            style={{
              ...designControlStyle(
                { ...p, fill: "#FADE2B", color: "#111827", radius: p.radius || "999" },
                { outline: false },
              ),
            }}
          >
            <CanvasEditable
              enabled={editable}
              as="span"
              value={p.button || ""}
              singleLine
              placeholder="按鈕"
              onChange={(v) => patch({ button: v })}
            />
          </a>
        </div>
      );
    case "counter":
      return (
        <div className="text-center py-4">
          <p className="text-4xl font-black text-[#1E4AD1]">
            <CanvasEditable
              enabled={editable}
              as="span"
              value={p.value || ""}
              singleLine
              placeholder="24"
              onChange={(v) => patch({ value: v })}
            />
            <CanvasEditable
              enabled={editable}
              as="span"
              className="text-xl"
              value={p.suffix || ""}
              singleLine
              placeholder="hr"
              onChange={(v) => patch({ suffix: v })}
            />
          </p>
          <CanvasEditable
            enabled={editable}
            as="p"
            className="text-sm text-slate-500 mt-1"
            value={p.label || ""}
            singleLine
            placeholder="標籤"
            onChange={(v) => patch({ label: v })}
          />
        </div>
      );
    case "progress":
      return (
        <div>
          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
            <CanvasEditable
              enabled={editable}
              as="span"
              value={p.label || ""}
              singleLine
              placeholder="項目"
              onChange={(v) => patch({ label: v })}
            />
            <span>{p.percent}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1E4AD1]"
              style={{ width: `${Number(p.percent) || 0}%` }}
            />
          </div>
        </div>
      );
    case "rating":
      return (
        <p className="text-amber-500 text-lg">
          {"★".repeat(Number(p.value) || 5)}
          {"☆".repeat(5 - (Number(p.value) || 5))}
          <CanvasEditable
            enabled={editable}
            as="span"
            className="ml-2 text-sm text-slate-500"
            value={p.label || ""}
            singleLine
            placeholder="標籤"
            onChange={(v) => patch({ label: v })}
          />
        </p>
      );
    case "social":
      return <SocialPublic props={p} editable={editable} onPatch={patch} />;
    case "share":
      return (
        <PartnerShareButtons
          store={shareContext?.store}
          title={shareContext?.title || ""}
          slug={shareContext?.slug || ""}
          shareUrl={shareContext?.shareUrl || ""}
          label={p.label || "分享"}
          showLabel={p.show_label !== false}
          items={p.items}
          look={p.look}
          shape={p.shape}
          size={p.size}
          align={p.align || "left"}
          disabled={editable}
        />
      );
    case "social-post":
      return (
        <SocialPostPublic
          urls={p.urls}
          layout={p.layout}
          gap={p.gap}
          visible={p.visible}
          autoplay={p.autoplay !== false}
          interval={p.interval}
          heightMode={p.height_mode}
          minH={p.min_h}
          cardStyle={p}
          editable={editable}
        />
      );
    case "map":
      if (!p.query) {
        return (
          <div className="bg-slate-100 text-slate-400 text-sm py-10 text-center rounded">
            輸入地點名稱
          </div>
        );
      }
      return (
        <iframe
          title="map"
          className="w-full h-64 rounded-lg border-0"
          loading="lazy"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(p.query)}&output=embed`}
        />
      );
    case "carousel":
      return (
        <CarouselPublic
          urls={galleryUrls(p.urls)}
          style={p.style}
          effect={p.effect}
          visible={p.visible}
          autoplay={p.autoplay !== false}
          interval={p.interval}
          height={p.height}
        />
      );
    case "products":
      return <ProductsPublic title={p.title} layout={p.layout} items={p.items || []} perPage={p.per_page} visible={p.visible} autoplay={p.autoplay} interval={p.interval} gap={p.gap} card={p} editable={editable} onPatch={patch} />;
    default:
      return null;
  }
}

export default function PartnerBlogBlocksRender({
  blocks = [],
  selectedId = null,
  onSelect,
  editing = false,
  nestPath = "",
  shareContext,
}) {
  const renderBlocks = (list, path) => (
    <PartnerBlogBlocksRender
      blocks={list}
      selectedId={selectedId}
      onSelect={onSelect}
      editing={editing}
      nestPath={path}
      shareContext={shareContext}
    />
  );

  if (!blocks?.length) {
    if (!editing) return null;
    return (
      <div className="border-2 border-dashed border-slate-300 rounded-lg py-16 text-center text-slate-400 text-sm">
        從左側點選元件加入文章
      </div>
    );
  }

  return (
    <div>
      {blocks.map((block, i) => {
        const selected = editing && selectedId === block.id;
        const inner = (
          <PartnerBlogBlockView
            block={block}
            renderBlocks={renderBlocks}
            shareContext={shareContext}
          />
        );
        const gap = blockStackGapClass(block.type, blocks[i + 1]?.type);
        if (!editing) {
          return (
            <div key={block.id} className={gap}>
              {inner}
            </div>
          );
        }
        return (
          <div
            key={block.id}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(block.id, nestPath);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSelect?.(block.id, nestPath);
            }}
            className={`relative rounded-md transition ${gap} ${
              selected
                ? "ring-2 ring-[#93003c] ring-offset-2"
                : "hover:ring-1 hover:ring-sky-400"
            }`}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
