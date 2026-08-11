"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  mergeBlogCms,
  resolveIgEmbedSlides,
} from "@/lib/partnerBlogCms";

/**
 * 簡潔 IG 貼文自動輪播（iframe embed）
 */
export default function PartnerIgPostCarousel({
  blogCms,
  isOwner = false,
  onEditClick,
}) {
  const cms = mergeBlogCms(blogCms);
  const slides = resolveIgEmbedSlides(cms);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [slides.length, slides[0]?.shortcode]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return undefined;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, cms.ig_autoplay_ms || 6000);
    return () => window.clearInterval(t);
  }, [slides.length, cms.ig_autoplay_ms, paused]);

  if (!slides.length) {
    if (!isOwner) return null;
    return (
      <section className="mt-12 mb-2">
        <button
          type="button"
          onClick={onEditClick}
          className="w-full border border-dashed border-slate-300 bg-[#faf9f6] px-5 py-10 text-center hover:border-[#0A6CD0] hover:bg-sky-50/40 transition-colors"
        >
          <p className="text-[13px] font-bold text-slate-700">Instagram 貼文</p>
          <p className="mt-1.5 text-[12px] text-slate-500 leading-relaxed">
            尚未嵌入貼文。點此或右下角「編輯部落格」貼上 IG 網址。
          </p>
        </button>
      </section>
    );
  }

  const current = slides[index] || slides[0];

  return (
    <section
      className="mt-12 mb-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-[12px] font-bold text-slate-500">Instagram</p>
          <h2 className="text-[15px] font-black text-slate-900 mt-0.5">
            精選貼文
          </h2>
        </div>
        {slides.length > 1 ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="上一則"
              onClick={() =>
                setIndex((i) => (i - 1 + slides.length) % slides.length)
              }
              className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 inline-flex items-center justify-center hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="下一則"
              onClick={() => setIndex((i) => (i + 1) % slides.length)}
              className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 inline-flex items-center justify-center hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative overflow-hidden bg-[#faf9f6] border border-slate-200">
        <div className="relative w-full" style={{ paddingBottom: "120%" }}>
          {slides.map((slide, i) => (
            <iframe
              key={slide.shortcode}
              title={`Instagram ${slide.shortcode}`}
              src={slide.embedUrl}
              className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-500 ${
                i === index ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
              }`}
              loading={i === 0 ? "eager" : "lazy"}
              allow="encrypted-media; clipboard-write"
              scrolling="no"
            />
          ))}
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.shortcode}
              type="button"
              aria-label={`第 ${i + 1} 則`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-slate-800" : "w-1.5 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-center">
        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-bold text-slate-500 hover:text-[#0A6CD0]"
        >
          在 Instagram 開啟 →
        </a>
      </p>
    </section>
  );
}
