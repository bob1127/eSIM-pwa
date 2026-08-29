"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { motion, AnimatePresence } from "framer-motion";
import MaterialIcon from "@/components/MaterialIcon";
import {
  ensureThreadsEmbeds,
  normalizeThreadsPermalink,
} from "@/lib/threadsEmbed";
import { decodeHtmlEntities } from "@/lib/instagramOg";
import "swiper/css";

const LB_STYLE = `
  .social-posts-lb.swiper {
    width: 100%;
    height: 100%;
  }
  .social-posts-lb .swiper-slide {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    overflow: hidden;
  }
`;

function profileHref(post, media) {
  if (media?.profileUrl) return media.profileUrl;
  if (post?.profileUrl) return post.profileUrl;
  return post?.permalink || "#";
}

function parseIgOgTitle(title) {
  const raw = decodeHtmlEntities(String(title || "")).trim();
  if (!raw) return { username: "", caption: "" };
  const m = raw.match(
    /^(.+?)\s+on\s+Instagram\s*[:：]\s*[“"'「]?([\s\S]*?)\s*$/i,
  );
  if (m) {
    const caption = m[2].trim().replace(/[”"'」]+$/u, "").trim();
    return {
      username: m[1].replace(/^@/, "").trim(),
      caption,
    };
  }
  return { username: "", caption: raw };
}

function useIgMedia(permalink, enabled) {
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !permalink) return undefined;
    let cancelled = false;
    setLoading(true);
    const q = encodeURIComponent(permalink);
    fetch(`/api/social/ig-media?url=${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMedia(data);
      })
      .catch(() => {
        if (!cancelled) setMedia({ ok: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [permalink, enabled]);

  return { media, loading };
}

function LocalVideoPlayer({ src, poster, autoPlay = true }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return undefined;
    el.muted = true;
    el.playsInline = true;
    if (autoPlay) {
      const p = el.play();
      if (p?.catch) p.catch(() => {});
    }
    return undefined;
  }, [src, autoPlay]);

  return (
    <video
      ref={ref}
      key={src}
      src={src}
      poster={poster || undefined}
      controls
      playsInline
      muted
      autoPlay={autoPlay}
      loop
      className="h-full w-full bg-black object-contain"
    />
  );
}

/** 左欄媒體：h = 可見高度；iframe 實際高度 = h + cropBottom（裁掉新增留言） */
function igEmbedNativeSize(post) {
  if (post?.kind === "reel" || post?.kind === "tv") {
    return { w: 540, h: 980, cropBottom: 72 };
  }
  return { w: 540, h: 720, cropBottom: 72 };
}

function useIgLightboxFit(nativeW, nativeH, enabled) {
  const [fit, setFit] = useState(() => ({
    scale: 1,
    dw: nativeW,
    dh: nativeH,
    sidebarW: 340,
    showSidebar: true,
  }));

  useEffect(() => {
    if (!enabled) return undefined;
    const update = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const showSidebar = vw >= 768;
      const sidebarW = showSidebar ? Math.min(360, Math.round(vw * 0.34)) : 0;
      const maxH = Math.max(360, Math.min(vh * 0.9, 900));
      const padX = showSidebar ? 100 : 40;
      const maxLeftW = Math.max(
        220,
        Math.min(nativeW, vw - sidebarW - padX),
      );
      const scale = Math.min(1, maxLeftW / nativeW, maxH / nativeH);
      setFit({
        scale,
        dw: Math.round(nativeW * scale),
        dh: Math.round(nativeH * scale),
        sidebarW,
        showSidebar,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [enabled, nativeW, nativeH]);

  return fit;
}

/** 右側留言／文案欄（即時留言需到 IG；此處呈現貼文說明＋入口） */
function IgSidebar({ post, media, loading }) {
  const { username, caption } = parseIgOgTitle(media?.title);
  const handle = (
    username ||
    (post.profileUrl || "").match(/instagram\.com\/([^/?#]+)/i)?.[1] ||
    "Instagram"
  ).replace(/^@/, "");
  const profile = profileHref(post, media);
  const permalink = post.permalink || "#";
  const initial = (handle.slice(0, 1) || "I").toUpperCase();

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-white text-[#262626]">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#efefef] px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f0f0f0] text-[11px] font-bold text-[#8e8e8e]">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={profile}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm font-semibold hover:opacity-70"
          >
            {handle}
          </a>
        </div>
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-[#0095f6] px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1877f2]"
        >
          查看個人檔案
        </a>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-sm text-[#8e8e8e]">載入中…</p>
        ) : (
          <>
            {caption ? (
              <div className="mb-5 flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f0f0f0] text-[11px] font-bold text-[#8e8e8e]">
                  {initial}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  <a
                    href={profile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold hover:opacity-70"
                  >
                    {handle}
                  </a>{" "}
                  {caption}
                </p>
              </div>
            ) : null}
            <div className="rounded-xl border border-[#efefef] bg-[#fafafa] px-3 py-4 text-center">
              <p className="text-[13px] leading-relaxed text-[#8e8e8e]">
                Instagram 留言無法直接嵌在本站，請到 Instagram 查看與回覆。
              </p>
              <a
                href={permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-[13px] font-semibold text-[#0095f6] hover:underline"
              >
                開啟留言區 →
              </a>
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-[#efefef] px-4 py-3">
        <div className="mb-1 flex items-center gap-4 text-[#262626]">
          <MaterialIcon name="favorite" size={24} />
          <MaterialIcon name="chat_bubble" size={24} />
          <MaterialIcon name="send" size={24} />
          <span className="ml-auto">
            <MaterialIcon name="bookmark" size={24} />
          </span>
        </div>
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex text-[12px] font-semibold text-[#0095f6] hover:underline"
        >
          在 Instagram 查看完整貼文
        </a>
      </div>
    </aside>
  );
}

function InstagramSlide({ post, active }) {
  const videoUrl = post.videoUrl || "";
  const { media, loading } = useIgMedia(post.permalink, active);
  const { w: nw, h: visibleH, cropBottom = 72 } = igEmbedNativeSize(post);
  const iframeH = visibleH + cropBottom;
  const fit = useIgLightboxFit(nw, visibleH, active);

  if (!active) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-white/40">
        載入中…
      </div>
    );
  }

  const src =
    post.embedSrc ||
    (post.permalink
      ? `${post.permalink.replace(/\/?$/, "/")}embed/`
      : "");
  if (!videoUrl && !src) {
    return <div className="text-sm text-white/60">無法載入貼文</div>;
  }

  const cleanSrc = src
    ? src.replace(/\/embed\/captioned\/?/i, "/embed/")
    : "";
  const playSrc = cleanSrc;

  return (
    <div
      className="mx-auto flex overflow-hidden rounded-sm bg-black shadow-2xl"
      style={{
        width: fit.showSidebar ? fit.dw + fit.sidebarW : fit.dw,
        height: fit.dh,
        maxWidth: "min(96vw, 1100px)",
      }}
    >
      <div
        className="relative shrink-0 overflow-hidden bg-black"
        style={{ width: fit.dw, height: fit.dh }}
      >
        {videoUrl ? (
          <div
            className="absolute left-0 top-0"
            style={{
              width: nw,
              height: visibleH,
              transform: `scale(${fit.scale})`,
              transformOrigin: "top left",
            }}
          >
            <LocalVideoPlayer
              src={videoUrl}
              poster={media?.thumbnail || ""}
              autoPlay
            />
          </div>
        ) : (
          <iframe
            title={post.label || "Instagram"}
            src={playSrc}
            className="border-0 bg-black"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: nw,
              height: iframeH,
              transform: `scale(${fit.scale})`,
              transformOrigin: "top left",
            }}
            allow="autoplay; encrypted-media; clipboard-write; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            scrolling="no"
          />
        )}
      </div>
      {fit.showSidebar ? (
        <div
          className="shrink-0 overflow-hidden border-l border-[#dbdbdb] bg-white"
          style={{ width: fit.sidebarW, height: fit.dh }}
        >
          <IgSidebar post={post} media={media} loading={loading} />
        </div>
      ) : null}
    </div>
  );
}

function FacebookSlide({ post, active }) {
  if (!active) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-white/40">
        載入中…
      </div>
    );
  }
  const nw = 500;
  const nh = 720;
  const maxW = Math.min(
    500,
    typeof window !== "undefined" ? window.innerWidth * 0.92 : 500,
  );
  const maxH =
    typeof window !== "undefined"
      ? Math.min(window.innerHeight * 0.85, 780)
      : 720;
  const scale = Math.min(1, maxW / nw, maxH / nh);
  const dw = Math.round(nw * scale);
  const dh = Math.round(nh * scale);
  const src =
    post.embedSrc?.replace(/([?&])width=\d+/i, `$1width=${nw}`) ||
    post.embedSrc;

  return (
    <div
      className="relative mx-auto overflow-hidden bg-white shadow-2xl"
      style={{
        width: dw,
        height: dh,
        borderRadius: 4,
      }}
    >
      <iframe
        title={post.label || "Facebook"}
        src={src}
        className="border-0 bg-white"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: nw,
          height: nh,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        allow="autoplay; encrypted-media; clipboard-write; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        scrolling="no"
      />
    </div>
  );
}

function ThreadsSlide({ post, active }) {
  const wrapRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const permalink =
    normalizeThreadsPermalink(post.permalink) || post.permalink || "";

  useEffect(() => {
    if (!active || !permalink) return undefined;
    let cancelled = false;
    setFailed(false);
    setReady(false);

    const markReady = () => {
      if (cancelled) return;
      if (wrapRef.current?.querySelector("iframe")) setReady(true);
    };
    const mo = new MutationObserver(markReady);
    const startMo = () => {
      if (wrapRef.current) {
        mo.observe(wrapRef.current, { childList: true, subtree: true });
      }
    };

    (async () => {
      await new Promise((r) => requestAnimationFrame(() => r()));
      startMo();
      const ok = await ensureThreadsEmbeds(wrapRef.current, {
        retries: 8,
        gapMs: 300,
      });
      if (cancelled) return;
      markReady();
      window.setTimeout(() => {
        if (cancelled) return;
        if (wrapRef.current?.querySelector("iframe")) setReady(true);
        else setFailed(true);
      }, 5000);
      if (!ok) {
        window.setTimeout(() => {
          if (!cancelled && !wrapRef.current?.querySelector("iframe")) {
            setFailed(true);
          }
        }, 800);
      }
    })();
    return () => {
      cancelled = true;
      mo.disconnect();
    };
  }, [active, permalink]);

  if (!active) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-white/40">
        載入中…
      </div>
    );
  }

  if (!permalink) {
    return <div className="text-sm text-white/60">無法載入 Threads 貼文</div>;
  }

  return (
    <div
      ref={wrapRef}
      key={permalink}
      className="relative mx-auto overflow-auto bg-white shadow-2xl"
      style={{
        width: "min(540px, 92vw)",
        maxHeight: "min(85vh, 780px)",
        borderRadius: 4,
      }}
    >
      {!ready && !failed ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center bg-white/90 py-3 text-sm text-slate-500">
          Threads 貼文載入中…
        </div>
      ) : null}
      {failed && !ready ? (
        <div className="p-8 text-center">
          <a
            href={permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[#0095f6] underline"
          >
            載入失敗，點此在 Threads 開啟
          </a>
        </div>
      ) : null}
      <blockquote
        className="text-post-media"
        data-text-post-permalink={permalink}
        data-text-post-version="0"
        style={{
          margin: 0,
          minWidth: "100%",
          width: "100%",
          background: "#fff",
        }}
      >
        <a href={permalink} style={{ display: "none" }} aria-hidden="true">
          Threads
        </a>
      </blockquote>
    </div>
  );
}

function EmbedSlide({ post, active }) {
  if (post.platform === "threads" || post.embedMode === "threads") {
    return <ThreadsSlide post={post} active={active} />;
  }
  if (post.platform === "facebook") {
    return <FacebookSlide post={post} active={active} />;
  }
  return <InstagramSlide post={post} active={active} />;
}

/**
 * 社群貼文全螢幕幻燈片 — 本站左右切換（不跳 IG）
 */
export default function SocialPostsLightbox({
  isOpen,
  onClose,
  posts = [],
  initialIndex = 0,
  title = "",
}) {
  const [lbIndex, setLbIndex] = useState(initialIndex);
  const [lbSwiper, setLbSwiper] = useState(null);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [portalRoot, setPortalRoot] = useState(null);
  const current = posts[lbIndex] || posts[0];
  const multi = posts.length > 1;
  const { media: currentMedia } = useIgMedia(
    current?.platform === "instagram" ? current?.permalink : "",
    isOpen && current?.platform === "instagram",
  );

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    setLbIndex(initialIndex);
    setIsAutoplay(false);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialIndex]);

  const handleClose = useCallback(() => {
    onClose?.(lbIndex);
  }, [onClose, lbIndex]);

  const goPrev = useCallback(() => {
    if (!multi) return;
    if (lbSwiper) {
      lbSwiper.slidePrev();
      return;
    }
    setLbIndex((i) => (i - 1 + posts.length) % posts.length);
  }, [lbSwiper, multi, posts.length]);

  const goNext = useCallback(() => {
    if (!multi) return;
    if (lbSwiper) {
      lbSwiper.slideNext();
      return;
    }
    setLbIndex((i) => (i + 1) % posts.length);
  }, [lbSwiper, multi, posts.length]);

  const goTo = useCallback(
    (idx) => {
      const safe = Math.max(0, Math.min(posts.length - 1, idx));
      setLbIndex(safe);
      if (!lbSwiper) return;
      if (multi) {
        lbSwiper.slideToLoop?.(safe) ?? lbSwiper.slideTo(safe);
      } else {
        lbSwiper.slideTo(0);
      }
    },
    [lbSwiper, multi, posts.length],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
      if (!isOpen || !multi) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose, goPrev, goNext, multi]);

  useEffect(() => {
    if (!isOpen || !isAutoplay || !multi) return undefined;
    const id = setInterval(() => goNext(), 4500);
    return () => clearInterval(id);
  }, [isOpen, isAutoplay, goNext, multi]);

  if (!portalRoot || posts.length === 0) return null;

  const profile = profileHref(current, currentMedia);
  const isIg = current?.platform === "instagram";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[10050] flex flex-col"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
          role="dialog"
          aria-modal="true"
          aria-label="社群貼文檢視"
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 z-40 p-2 text-white hover:opacity-80 sm:right-5 sm:top-4"
            aria-label="關閉"
          >
            <MaterialIcon name="close" size={28} />
          </button>

          <div className="absolute left-3 top-3 z-40 flex items-center gap-2 text-white sm:left-5 sm:top-4">
            <span className="text-sm tabular-nums font-semibold">
              {lbIndex + 1} / {posts.length}
            </span>
            {title ? (
              <span className="hidden max-w-[36vw] truncate text-sm text-white/70 sm:inline">
                {title}
              </span>
            ) : null}
            {multi ? (
              <span className="hidden text-[11px] text-white/45 md:inline">
                鍵盤 ← → 可切換（留在本站）
              </span>
            ) : null}
          </div>

          <div className="absolute right-14 top-3 z-40 flex items-center gap-1 sm:right-16 sm:top-4">
            <a
              href={profile}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center rounded-full bg-[#0095f6] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#1877f2] sm:inline-flex"
            >
              查看個人檔案
            </a>
            {multi && (
              <button
                type="button"
                onClick={() => setIsAutoplay((v) => !v)}
                className="p-2 text-white/70 hover:text-white"
                aria-label={isAutoplay ? "暫停輪播" : "自動輪播"}
              >
                {isAutoplay ? (
                  <MaterialIcon name="pause" size={20} />
                ) : (
                  <MaterialIcon name="play_arrow" size={20} />
                )}
              </button>
            )}
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pt-12 pb-16 sm:px-4">
            {multi && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/75 sm:left-4 sm:h-14 sm:w-14 lg:left-6"
                  aria-label="上一則貼文"
                >
                  <MaterialIcon name="chevron_left" size={36} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/75 sm:right-4 sm:h-14 sm:w-14 lg:right-6"
                  aria-label="下一則貼文"
                >
                  <MaterialIcon name="chevron_right" size={36} />
                </button>
              </>
            )}

            <Swiper
              onSwiper={(swiper) => {
                setLbSwiper(swiper);
                setLbIndex(initialIndex);
                if (multi) {
                  swiper.slideToLoop?.(initialIndex, 0) ??
                    swiper.slideTo(initialIndex, 0);
                }
              }}
              initialSlide={initialIndex}
              loop={multi}
              slidesPerView={1}
              spaceBetween={0}
              allowTouchMove={multi}
              onSlideChange={(s) => setLbIndex(s.realIndex)}
              className="social-posts-lb h-full w-full max-w-[min(96vw,1180px)] px-14 sm:px-20 lg:px-24"
            >
              {posts.map((post, idx) => {
                // 預載相鄰張，切換時不必每次從「載入中」重來
                const warm =
                  idx === lbIndex ||
                  idx === (lbIndex + 1) % posts.length ||
                  idx === (lbIndex - 1 + posts.length) % posts.length;
                return (
                  <SwiperSlide key={post.permalink || idx}>
                    <div className="flex h-full w-full items-center justify-center">
                      <EmbedSlide post={post} active={warm} />
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>

          {multi ? (
            <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3 py-2 backdrop-blur-sm">
              {posts.map((post, idx) => (
                <button
                  key={post.permalink || idx}
                  type="button"
                  onClick={() => goTo(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    lbIndex === idx
                      ? "w-6 bg-white"
                      : "w-2.5 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`第 ${idx + 1} 則`}
                  aria-current={lbIndex === idx ? "true" : undefined}
                />
              ))}
            </div>
          ) : null}

          {isIg && !multi ? (
            <a
              href={current?.permalink || profile}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-5 left-1/2 z-40 inline-flex -translate-x-1/2 items-center rounded-full bg-[#0095f6] px-4 py-2 text-[13px] font-bold text-white md:hidden"
            >
              查看留言
            </a>
          ) : null}

          <style dangerouslySetInnerHTML={{ __html: LB_STYLE }} />
        </motion.div>
      )}
    </AnimatePresence>,
    portalRoot,
  );
}
