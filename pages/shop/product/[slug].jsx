import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
  Lock,
  Play,
  FileText,
  Check,
  Minus,
  Plus,
  Info,
} from "lucide-react";
import ShopNavbar from "../../../components/Shop/ShopNavbar";
import ShopCartSidebar from "../../../components/Shop/ShopCartSidebar";
import { useCart } from "../../../components/context/CartContext";
import Footer from "../../../components/ui/footer.jsx";
import SeoHead from "../../../components/SeoHead";
import MediaGalleryLightbox from "../../../components/MediaGalleryLightbox";
import MaterialIcon from "../../../components/MaterialIcon";
import { buildLoginUrl } from "../../../lib/authRedirect";
import {
  fetchShopProductByHandle,
  listShopProductHandles,
} from "../../../lib/shopSelections";
import { buildShopProductSeo } from "../../../lib/seo.config";
import { resolveMedusaImageUrl } from "../../../lib/resolveMedusaImageUrl";

const CONTAINER = "max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10";
/** ISR：約 5 分鐘刷新商品頁 */
const SHOP_PRODUCT_REVALIDATE_SEC = 300;

/** Demo 商品圖（handle=usb-c-cable-240w 時使用） */
const DEMO_GALLERY = [
  {
    type: "image",
    src: "https://cdn.shopify.com/s/files/1/0493/9834/9974/files/A88E2011_Richimage_nocopy_2000x2000px_29105b88-b02b-4db3-8bc7-a1922c1dc75f.png?v=1768183217",
    alt: "USB-C 編織充電線主圖",
  },
  {
    type: "image",
    src: "https://cdn.shopify.com/s/files/1/0493/9834/9974/files/3ft-02_979db4a3-15c0-445d-b860-62f43ecff243.jpg?v=1776673562",
    alt: "240W 超高速充電",
  },
  {
    type: "image",
    src: "https://cdn.shopify.com/s/files/1/0493/9834/9974/files/3ft-03_7700aa4d-1f9b-4f5c-a622-f0fcc4191ac0.jpg?v=1776673562",
    alt: "30 萬次彎折耐久",
  },
  {
    type: "image",
    src: "https://cdn.shopify.com/s/files/1/0493/9834/9974/files/3ft-04_7e93ba83-b3db-41c5-9533-b00f02f7e383.jpg?v=1776673562",
    alt: "極端溫差耐候",
  },
  {
    type: "image",
    src: "https://cdn.shopify.com/s/files/1/0493/9834/9974/files/3ft-05_d8d18d5d-6afa-4431-bb61-17418bda82ce.jpg?v=1776673562",
    alt: "永續再生材料",
  },
  {
    type: "image",
    src: "https://cdn.shopify.com/s/files/1/0493/9834/9974/files/3ft-06_c21cd3d8-4741-405e-9c06-ed72adae6c5c.jpg?v=1776673562",
    alt: "USB-IF 認證安全快充",
  },
];

const DEMO_PRODUCT = {
  slug: "usb-c-cable-240w",
  badge: "熱銷",
  title: "Jeko Prime USB-C to USB-C 編織充電線（240W・再生尼龍）",
  rating: 4.9,
  reviewCount: 197,
  price: 980,
  originalPrice: 1230,
  saveAmount: 250,
  discountLabel: "折 NT$250",
  promoCode: "JEKO250",
  features: [
    "240W 超高速充電",
    "彎折耐久超過 30 萬次",
    "極端溫度耐候（-40°C～80°C）",
    "永續再生尼龍編織",
  ],
  styles: [
    { id: "3ft", label: "0.9 公尺" },
    { id: "6ft", label: "1.8 公尺" },
  ],
  stockText: "有現貨 — 預計 3～7 個工作天送達",
  bulkNote: "大量優惠：10 件以上每件 NT$620，結帳自動套用",
};

const RECOMMENDED = [
  {
    id: "none",
    title: "暫不加購",
    sub: "先購買本商品即可",
    price: null,
  },
  {
    id: "gan-65w",
    title: "65W 氮化鎵旅行充電器",
    sub: "與本線材絕配 · 筆電手機同充",
    price: "NT$680",
    strike: "NT$890",
    href: "/shop/product/gan-65w-charger",
  },
  {
    id: "powerbank",
    title: "10000mAh USB-C 行動電源",
    sub: "出國補電必備 · 輕巧好攜帶",
    price: "NT$790",
    strike: "NT$990",
    href: "/shop/product/powerbank-10000",
  },
];

const SECTIONS = [
  { id: "purchase", label: "購買" },
  { id: "overview", label: "產品說明" },
  { id: "reviews", label: "評價" },
];

function isGalleryVideo(item) {
  if (!item) return false;
  if (item.type === "video") return true;
  return /\.(mp4|webm|mov|m4v|avi|mkv|qt)(\?|#|$)/i.test(
    String(item.src || "").split("?")[0],
  );
}

/** 同支影片切換 focus 時記住進度，回來從暫停處繼續 */
const galleryVideoResumeAt = new Map();

/** 影片：第一幀預覽 + player 鈕；主圖 hover 觸發播放；離焦暫停、回焦續播 */
function GalleryVideo({
  src,
  fillClassName,
  isThumb = false,
  hoverPlay = false,
}) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const hasSeekedRef = useRef(false);

  const restoreOrFirstFrame = () => {
    const v = videoRef.current;
    if (!v) return;
    const saved = galleryVideoResumeAt.get(src);
    try {
      if (typeof saved === "number" && saved > 0.05) {
        v.currentTime = saved;
      } else if (!hasSeekedRef.current) {
        // 首次載入才跳第一幀；避免黑畫面
        if (Number.isFinite(v.duration) && v.duration > 0) {
          v.currentTime = Math.min(0.12, v.duration * 0.01);
        } else {
          v.currentTime = 0.01;
        }
      }
      hasSeekedRef.current = true;
    } catch {
      /* ignore seek errors */
    }
  };

  const playVideo = () => {
    if (!hoverPlay) return;
    const v = videoRef.current;
    if (!v || !v.paused) return;
    const saved = galleryVideoResumeAt.get(src);
    if (typeof saved === "number" && saved > 0.05) {
      try {
        v.currentTime = saved;
      } catch {
        /* ignore */
      }
    }
    v.muted = true;
    const p = v.play();
    if (p && typeof p.then === "function") {
      p.then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      setPlaying(true);
    }
  };

  const pauseKeepPosition = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!v.paused) {
      galleryVideoResumeAt.set(src, v.currentTime || 0);
    } else if (v.currentTime > 0.05) {
      galleryVideoResumeAt.set(src, v.currentTime);
    }
    v.pause();
    setPlaying(false);
  };

  // 離開主圖：暫停並記住進度；回到主圖：從該處繼續播
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!hoverPlay) {
      pauseKeepPosition();
      return;
    }
    const saved = galleryVideoResumeAt.get(src);
    if (typeof saved === "number" && saved > 0.05) {
      try {
        v.currentTime = saved;
      } catch {
        /* ignore */
      }
      v.muted = true;
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.then(() => setPlaying(true)).catch(() => setPlaying(false));
      } else {
        setPlaying(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverPlay, src]);

  useEffect(() => {
    hasSeekedRef.current = false;
  }, [src]);

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={hoverPlay ? playVideo : undefined}
      onFocus={hoverPlay ? playVideo : undefined}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        loop
        preload="auto"
        onLoadedMetadata={restoreOrFirstFrame}
        onLoadedData={restoreOrFirstFrame}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v || v.paused) return;
          galleryVideoResumeAt.set(src, v.currentTime);
        }}
        className={
          isThumb
            ? "absolute inset-0 w-full h-full object-cover pointer-events-none bg-black"
            : "absolute inset-0 w-full h-full object-cover object-center pointer-events-none bg-black"
        }
        aria-hidden
      />
      {!playing ? (
        <span
          className={`absolute inset-0 flex items-center justify-center pointer-events-none ${
            isThumb ? "bg-black/30" : "bg-black/15"
          }`}
        >
          <span
            className={`rounded-full bg-white/95 shadow-md flex items-center justify-center ${
              isThumb ? "w-8 h-8" : "w-14 h-14"
            }`}
          >
            <Play
              className={`text-slate-900 fill-slate-900 ${
                isThumb ? "w-4 h-4 ml-0.5" : "w-6 h-6 ml-0.5"
              }`}
            />
          </span>
        </span>
      ) : null}
    </div>
  );
}

/** 影片／圖片統一出口：主圖 cover 充滿 */
function GalleryMedia({
  item,
  fillClassName,
  priority = false,
  sizes,
  isThumb = false,
  hoverPlay = false,
}) {
  const src = item?.src || "";
  if (isGalleryVideo(item)) {
    return (
      <GalleryVideo
        src={src}
        fillClassName={fillClassName}
        isThumb={isThumb}
        hoverPlay={hoverPlay}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={item?.alt || ""}
      fill
      priority={priority}
      className={`${
        fillClassName ||
        "absolute inset-0 w-full h-full object-cover object-center"
      } pointer-events-none`}
      sizes={sizes}
      unoptimized
    />
  );
}

function Gallery({
  images,
  badge,
  productName,
  activeIndex = 0,
  onActiveIndexChange,
}) {
  const [idx, setIdx] = useState(activeIndex);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [vw, setVw] = useState(0);
  const [tx, setTx] = useState(0);
  const [animate, setAnimate] = useState(false);
  /** lg 以上才左右 peek；手機主圖滿版 */
  const [isDesktop, setIsDesktop] = useState(false);
  const viewportRef = useRef(null);
  const lockedRef = useRef(false);
  const pendingDirRef = useRef(0);
  const skipNotifyRef = useRef(false);
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startTx: 0,
    pointerId: null,
    suppressClick: false,
  });
  const len = images.length;

  const PEEK_RATIO = isDesktop ? 0.11 : 0;
  const MAIN_RATIO = isDesktop ? 0.78 : 1;
  const peek = vw * PEEK_RATIO;
  const main = vw * MAIN_RATIO;
  // 靜止時：桌機 peek 對齊中央；手機滿版需先偏左一個主圖寬，才顯示中間張
  const restTx = isDesktop ? peek - main : -main;

  const commitIndex = (next) => {
    const safe = ((next % len) + len) % len;
    setIdx(safe);
    if (!skipNotifyRef.current) onActiveIndexChange?.(safe);
    skipNotifyRef.current = false;
  };

  // 外部（選規格）驅動圖庫切換
  useEffect(() => {
    if (typeof activeIndex !== "number" || len <= 0) return;
    const safe = ((activeIndex % len) + len) % len;
    if (safe === idx) return;
    skipNotifyRef.current = true;
    setAnimate(false);
    setIdx(safe);
    setTx(restTx);
    lockedRef.current = false;
    pendingDirRef.current = 0;
  }, [activeIndex, len]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setVw(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 寬度就緒後對齊靜止位置
  useEffect(() => {
    if (vw > 0 && !lockedRef.current && !dragRef.current.active) setTx(restTx);
  }, [vw, restTx]);

  const openLightbox = (i) => {
    setLightboxIndex(i ?? idx);
    setLightboxOpen(true);
  };

  const finishSlide = () => {
    const dir = pendingDirRef.current;
    if (!dir) return;
    pendingDirRef.current = 0;
    setAnimate(false);
    setIdx((p) => {
      const next = (p + dir + len) % len;
      if (!skipNotifyRef.current) {
        queueMicrotask(() => onActiveIndexChange?.(next));
      }
      skipNotifyRef.current = false;
      return next;
    });
    setTx(restTx);
    lockedRef.current = false;
  };

  const go = (dir) => {
    if (lockedRef.current || len <= 1 || vw <= 0) return;
    lockedRef.current = true;
    pendingDirRef.current = dir;
    setAnimate(true);
    // ease-in：由慢到快；位移一個主圖寬度
    setTx(restTx - dir * main);
  };

  const goTo = (target) => {
    if (target === idx || lockedRef.current) return;
    const forward = (target - idx + len) % len;
    const backward = (idx - target + len) % len;
    if (forward === 1) go(1);
    else if (backward === 1) go(-1);
    else commitIndex(target);
  };

  const onPointerDown = (e) => {
    if (lockedRef.current || len <= 1 || vw <= 0) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest?.("[data-gallery-chrome]")) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startTx: restTx,
      pointerId: e.pointerId,
      suppressClick: false,
    };
    setAnimate(false);
    try {
      viewportRef.current?.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 8) d.moved = true;
    if (d.moved) {
      e.preventDefault();
      setTx(d.startTx + dx);
    }
  };

  const endDrag = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    try {
      viewportRef.current?.releasePointerCapture?.(d.pointerId);
    } catch {
      /* ignore */
    }
    const dx = (e?.clientX ?? d.startX) - d.startX;
    if (!d.moved) {
      setTx(restTx);
      return;
    }
    d.suppressClick = true;
    const threshold = Math.max(48, main * 0.18);
    if (Math.abs(dx) >= threshold) {
      go(dx < 0 ? 1 : -1);
    } else {
      setAnimate(true);
      setTx(restTx);
    }
  };

  // 軌道上三張：上一張 / 目前 / 下一張
  const slideIndexes = [(idx - 1 + len) % len, idx, (idx + 1) % len];

  return (
    <div className="w-full min-w-0 max-lg:-mx-4 max-lg:w-[calc(100%+2rem)] sm:max-lg:-mx-6 sm:max-lg:w-[calc(100%+3rem)] lg:mx-0 lg:w-full lg:sticky lg:top-[136px] self-start">
      {/* 手機：主圖＋縮圖剛好塞進剩餘視窗 */}
      <div className="max-lg:flex max-lg:flex-col max-lg:h-[calc(100dvh-10rem)]">
      <div
        ref={viewportRef}
        className="group relative w-full overflow-hidden max-lg:flex-1 max-lg:min-h-[240px] h-[70vh] lg:h-[calc(100dvh-10.5rem)] lg:min-h-[520px] lg:max-h-[920px] bg-[#111] touch-pan-y cursor-grab active:cursor-grabbing select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* 折扣旗標 */}
        {badge ? (
          <div
            className="absolute top-0 z-30 pointer-events-none"
            style={{ left: isDesktop ? `${PEEK_RATIO * 100}%` : 0 }}
          >
            <div className="bg-[#3B9EFF] text-white text-[11px] font-bold px-3 py-1.5 relative">
              {badge}
              <span className="absolute -right-2 top-0 w-0 h-0 border-t-[12px] border-t-[#3B9EFF] border-r-[8px] border-r-transparent border-b-[12px] border-b-[#3B9EFF]" />
            </div>
          </div>
        ) : null}

        {/* 滑動軌道：桌機左右 peek；手機滿版 */}
        <div
          className="absolute inset-y-0 left-0 flex h-full will-change-transform"
          style={{
            transform: `translate3d(${tx}px, 0, 0)`,
            transition: animate
              ? "transform 600ms cubic-bezier(0.55, 0, 0.15, 1)"
              : "none",
          }}
          onTransitionEnd={(e) => {
            if (e.propertyName !== "transform") return;
            if (pendingDirRef.current) finishSlide();
            else setAnimate(false);
          }}
        >
          {slideIndexes.map((imageIndex, i) => {
            const isCenter = i === 1;
            return (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  if (dragRef.current.suppressClick) {
                    e.preventDefault();
                    dragRef.current.suppressClick = false;
                    return;
                  }
                  if (isCenter) openLightbox(imageIndex);
                  else go(i === 0 ? -1 : 1);
                }}
                className={`relative h-full shrink-0 overflow-hidden focus:outline-none ${
                  isCenter ? "cursor-zoom-in" : "cursor-pointer"
                }`}
                style={{ width: main || (isDesktop ? "78%" : "100%") }}
                aria-label={
                  isCenter
                    ? isGalleryVideo(images[imageIndex])
                      ? `播放第 ${imageIndex + 1} 個影片`
                      : `放大檢視第 ${imageIndex + 1} 張圖片`
                    : i === 0
                      ? "上一張"
                      : "下一張"
                }
              >
                <GalleryMedia
                  item={images[imageIndex]}
                  fillClassName="absolute inset-0 w-full h-full object-cover object-center"
                  priority={isCenter}
                  sizes={isDesktop ? "(max-width: 1024px) 80vw, 50vw" : "100vw"}
                  hoverPlay={isCenter}
                />
                {!isCenter && isDesktop && (
                  <span className="absolute inset-0 bg-black/70 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>

        {/* 左右箭頭 */}
        {len > 1 && (
          <>
            <button
              type="button"
              data-gallery-chrome
              onClick={() => go(-1)}
              aria-label="上一張"
              className={
                isDesktop
                  ? "absolute left-0 top-0 bottom-0 z-20 flex items-center justify-center"
                  : "absolute left-2 top-1/2 -translate-y-1/2 z-20"
              }
              style={isDesktop ? { width: `${PEEK_RATIO * 100}%` } : undefined}
            >
              <span className="w-9 h-9 bg-white/95 border border-slate-200 flex items-center justify-center shadow-sm pointer-events-none">
                <ChevronLeft className="w-5 h-5 text-slate-900" />
              </span>
            </button>
            <button
              type="button"
              data-gallery-chrome
              onClick={() => go(1)}
              aria-label="下一張"
              className={
                isDesktop
                  ? "absolute right-0 top-0 bottom-0 z-20 flex items-center justify-center"
                  : "absolute right-2 top-1/2 -translate-y-1/2 z-20"
              }
              style={isDesktop ? { width: `${PEEK_RATIO * 100}%` } : undefined}
            >
              <span className="w-9 h-9 bg-white/95 border border-slate-200 flex items-center justify-center shadow-sm pointer-events-none">
                <ChevronRight className="w-5 h-5 text-slate-900" />
              </span>
            </button>
          </>
        )}

        {/* 全螢幕 */}
        <button
          type="button"
          data-gallery-chrome
          onClick={() => openLightbox(idx)}
          className="absolute top-3 z-30 w-9 h-9 rounded-full bg-white/90 border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100"
          style={
            isDesktop
              ? { right: `calc(${PEEK_RATIO * 100}% + 0.75rem)` }
              : { right: "0.75rem" }
          }
          aria-label="放大檢視"
        >
          <MaterialIcon name="fullscreen" size={16} />
        </button>

        {/* 計數 */}
        <span
          className="absolute bottom-3 z-30 text-[12px] text-white bg-black/45 px-2 py-0.5 rounded pointer-events-none"
          style={
            isDesktop
              ? { right: `calc(${PEEK_RATIO * 100}% + 1rem)` }
              : { right: "1rem" }
          }
        >
          {idx + 1}/{len}
        </span>
      </div>

      {/* 縮圖列 — 手機與主圖同屏可見 */}
      <div className="flex gap-2.5 mt-2.5 max-lg:mt-2 max-lg:px-4 sm:max-lg:px-6 lg:px-0 min-w-0 max-w-full overflow-x-auto pb-1 max-lg:shrink-0">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            onDoubleClick={() => openLightbox(i)}
            className={`relative shrink-0 w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 bg-[#f5f5f5] overflow-hidden border-2 transition-colors ${
              i === idx
                ? "border-slate-800"
                : "border-transparent hover:border-slate-300"
            }`}
            aria-label={
              isGalleryVideo(img)
                ? `切換至影片 ${i + 1}`
                : `切換至第 ${i + 1} 張`
            }
          >
            <GalleryMedia
              item={img}
              fillClassName="absolute inset-0 w-full h-full object-cover"
              sizes="96px"
              isThumb
            />
          </button>
        ))}
      </div>
      </div>

      {/* Overview / Video */}
      <div className="flex items-center gap-2 mt-3 max-lg:px-4 sm:max-lg:px-6 lg:px-0">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-slate-800 text-white"
        >
          <FileText className="w-3.5 h-3.5" />
          產品說明
        </button>
        <button
          type="button"
          onClick={() => {
            const vi = images.findIndex((img) => isGalleryVideo(img));
            if (vi >= 0) goTo(vi);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-slate-800 hover:text-slate-900"
        >
          <Play className="w-3.5 h-3.5" />
          影片
        </button>
      </div>

      <MediaGalleryLightbox
        isOpen={lightboxOpen}
        onClose={(closedIdx) => {
          setLightboxOpen(false);
          if (typeof closedIdx === "number") commitIndex(closedIdx);
        }}
        images={images}
        productName={productName}
        initialIndex={lightboxIndex}
        ariaLabel="商品圖片檢視"
      />
    </div>
  );
}

function resolveGalleryItem(item) {
  if (!item?.src) return item;
  const src = resolveMedusaImageUrl(item.src) || item.src;
  return src === item.src ? item : { ...item, src };
}

export default function ShopProductPage({
  product: productProp = null,
  gallery: galleryProp = null,
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const PRODUCT = productProp || DEMO_PRODUCT;
  const ALL_GALLERY = (
    Array.isArray(galleryProp) && galleryProp.length
      ? galleryProp
      : DEMO_GALLERY
  ).map(resolveGalleryItem);
  const seo = buildShopProductSeo(PRODUCT, ALL_GALLERY, {
    handle: PRODUCT.slug,
  });
  const [activeTab, setActiveTab] = useState("purchase");
  // null = 未選規格，左圖顯示全部商品圖
  const [styleId, setStyleId] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [featuresOpen, setFeaturesOpen] = useState(true);
  const [recommendOpt, setRecommendOpt] = useState("none");
  const [copied, setCopied] = useState(false);
  const stickyRef = useRef(null);
  const [showSticky, setShowSticky] = useState(false);

  const selectedStyle = styleId
    ? PRODUCT.styles?.find((s) => s.id === styleId) || null
    : null;

  /** 有選規格 → 只顯示該變體圖；未選 → 全部商品圖 */
  const GALLERY = (() => {
    if (!selectedStyle) return ALL_GALLERY;
    const urls = (
      selectedStyle.galleryUrls?.length
        ? selectedStyle.galleryUrls
        : selectedStyle.imageUrls?.length
          ? selectedStyle.imageUrls
          : selectedStyle.thumbnail
            ? [selectedStyle.thumbnail]
            : []
    ).filter(Boolean);
    if (!urls.length) return ALL_GALLERY;
    return urls.map((src, i) => {
      const fromAll = ALL_GALLERY.find((g) => g?.src === src);
      return (
        fromAll || {
          type: isGalleryVideo({ src }) ? "video" : "image",
          src,
          alt: `${PRODUCT.title} ${selectedStyle.label || ""} ${i + 1}`.trim(),
        }
      );
    });
  })();

  const selectStyle = (id) => {
    // 再點同一規格 → 取消選取
    setStyleId((prev) => (prev === id ? null : id));
    setGalleryIndex(0);
  };

  const clearStyle = () => {
    setStyleId(null);
    setGalleryIndex(0);
  };

  useEffect(() => {
    setStyleId(null);
    setGalleryIndex(0);
  }, [PRODUCT.slug]);

  const styleLabel = selectedStyle?.label || "請選擇";
  const displayPrice =
    selectedStyle?.price != null ? selectedStyle.price : PRODUCT.price;
  const galleryThumb =
    selectedStyle?.thumbnail ||
    GALLERY[galleryIndex]?.src ||
    GALLERY.find((g) => !isGalleryVideo(g))?.src ||
    GALLERY[0]?.src ||
    "/images/shop/shop-promo-01.png";

  const buildCartProduct = () => {
    const style =
      selectedStyle || PRODUCT.styles?.[0] || null;
    const vid = style?.id || `${PRODUCT.slug}-default`;
    return {
      id: vid,
      variant_id: vid,
      title: PRODUCT.title,
      name: PRODUCT.title,
      price: style?.price != null ? style.price : displayPrice,
      quantity: qty,
      image: style?.thumbnail || galleryThumb,
      specLabel: style?.label || styleLabel,
      options: style?.label || styleLabel,
      type: "physical",
      href: `/shop/product/${PRODUCT.slug}`,
    };
  };

  const handleAddToCart = () => {
    if (!selectedStyle) {
      window.alert("請先選擇規格");
      return;
    }
    addToCart(buildCartProduct());
  };

  const handleBuyNow = () => {
    if (!selectedStyle) {
      window.alert("請先選擇規格");
      return;
    }
    addToCart(buildCartProduct(), { open: false });
    router.push("/checkout/shop");
  };

  useEffect(() => {
    const update = () => {
      const el = document.getElementById("overview");
      if (!el) {
        setShowSticky(false);
        return;
      }
      // 滾到產品說明較下方才出現（約視窗 40% 高度），避免買區還在畫面就跳出
      setShowSticky(el.getBoundingClientRect().top <= window.innerHeight * 0.4);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [PRODUCT.slug]);

  const copyCode = async () => {
    if (!PRODUCT.promoCode) return;
    try {
      await navigator.clipboard.writeText(PRODUCT.promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <SeoHead {...seo} />

      <ShopNavbar compact utilityNav={[]} utilityEnd={null} />

      {/* ── 商品次導覽列（緊貼 navbar：藍促銷 h-9 + 主列 h-14 = 92px） ── */}
      <div className="sticky top-[92px] z-[7000] bg-white border-b border-slate-200">
        <div
          className={`${CONTAINER} h-11 flex items-center justify-between gap-4`}
        >
          <p className="text-[13px] text-slate-900 font-medium truncate flex-1 min-w-0">
            {PRODUCT.title}
          </p>
          <nav className="hidden sm:flex items-center gap-6 shrink-0 h-full">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveTab(s.id);
                  document
                    .getElementById(s.id)
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`relative h-full text-[13px] font-medium transition-colors ${
                  activeTab === s.id
                    ? "text-slate-900"
                    : "text-slate-700 hover:text-slate-950"
                }`}
              >
                {s.label}
                {activeTab === s.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3B9EFF]" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="bg-[#DFE0E5] ">
        {/* ── Purchase 主區塊 ── */}
        <section id="purchase" className={`${CONTAINER} pt-6 lg:pt-8`}>
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 lg:gap-12">
            {/* 左：圖庫 — min-w-0 避免縮圖列撐爆 grid、擠扁右欄 */}
            <div className="min-w-0">
              <Gallery
                key={styleId || "all"}
                images={GALLERY}
                badge={PRODUCT.discountLabel}
                productName={PRODUCT.title}
                activeIndex={galleryIndex}
                onActiveIndexChange={setGalleryIndex}
              />
            </div>

            {/* 右：購買資訊 */}
            <div className="min-w-0 flex flex-col gap-4 lg:pt-1">
              <span className="text-[12px] font-bold text-orange-500">
                {PRODUCT.badge}
              </span>

              <h1 className="text-xl sm:text-[24px] font-bold text-slate-900 leading-snug -mt-2">
                {PRODUCT.title}
              </h1>

              {/* 評分 */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(PRODUCT.rating)
                        ? "fill-orange-400 text-orange-400"
                        : "text-slate-500"
                    }`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("reviews")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="text-[13px] text-[#0A6CD0] hover:underline ml-1"
                >
                  {PRODUCT.rating}（{PRODUCT.reviewCount} 則評價）
                </button>
              </div>

              {/* 價格 */}
              <div className="flex items-center gap-2.5">
                <span className="text-[24px] font-bold text-slate-900">
                  NT${displayPrice.toLocaleString()}
                </span>
                {PRODUCT.saveAmount > 0 ? (
                  <>
                    <span className="text-[11px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                      省 NT${PRODUCT.saveAmount}
                    </span>
                    <del className="text-[13px] text-slate-600">
                      NT${PRODUCT.originalPrice.toLocaleString()}
                    </del>
                  </>
                ) : null}
              </div>

              {/* 優惠碼框 */}
              {PRODUCT.promoCode && PRODUCT.saveAmount > 0 ? (
              <div className="flex items-stretch border border-[#B8D9FF] bg-[#E8F3FF] overflow-hidden">
                <div className="flex items-center justify-center px-4 bg-[#3B9EFF] text-white text-lg font-bold shrink-0 border-r border-dashed border-white/50">
                  ${Math.round(PRODUCT.saveAmount / 30)}
                </div>
                <div className="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
                  <p className="text-[12px] text-slate-900">
                    使用優惠碼再折 NT${PRODUCT.saveAmount}
                  </p>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="text-[12px] font-bold text-[#0A6CD0] hover:underline whitespace-nowrap"
                  >
                    {copied ? "已複製" : "複製優惠碼"}
                  </button>
                </div>
              </div>
              ) : null}

              {/* 登入提示 */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#f5f5f5] text-[12px] text-slate-800">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">登入享安心購保障與會員積分回饋</span>
                <Link
                  href={buildLoginUrl(router.asPath)}
                  className="text-[#0A6CD0] font-semibold hover:underline shrink-0"
                >
                  立即登入 &gt;
                </Link>
              </div>

              {/* 重點特色 */}
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setFeaturesOpen((v) => !v)}
                  className="w-full flex items-center justify-between text-[14px] font-bold text-slate-900"
                >
                  重點特色
                  <ChevronDown
                    className={`w-4 h-4 text-slate-600 transition-transform ${featuresOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {featuresOpen && (
                  <ul className="mt-2 space-y-1.5">
                    {PRODUCT.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-[13px] text-slate-900"
                      >
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 規格／樣式：點空白取消選取 → 顯示全部商品圖 */}
              <div
                onClick={(e) => {
                  if (e.target.closest("[data-style-option]")) return;
                  clearStyle();
                }}
              >
                <p className="text-[13px] text-slate-900 mb-2">
                  規格：
                  <span className="font-semibold">{styleLabel}</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT.styles.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      data-style-option
                      onClick={() => selectStyle(s.id)}
                      className={`py-3 px-3 text-[13px] font-medium border-2 transition-colors text-left break-words leading-snug ${
                        styleId === s.id
                          ? "border-[#3B9EFF] bg-[#3B9EFF] text-white"
                          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 數量 */}
              <div>
                <p className="text-[13px] text-slate-900 mb-2">數量</p>
                <div className="inline-flex items-center border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-50"
                    aria-label="減少"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-[14px] font-semibold">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(99, q + 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-50"
                    aria-label="增加"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bulk Discount */}
              <div className="bg-[#E8F3FF] px-4 py-3 text-[12px] text-slate-900 flex flex-wrap items-center justify-between gap-2">
                <span>{PRODUCT.bulkNote}</span>
                <Link
                  href="/shop/support"
                  className="text-[#0A6CD0] font-semibold hover:underline"
                >
                  需要協助？聯絡客服 &gt;
                </Link>
              </div>

              {/* 其他推薦商品 */}
              <div className="border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[14px] font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="text-amber-500">⚡</span>
                    其他推薦商品
                  </p>
                  <Link
                    href="/shop"
                    className="text-[12px] text-[#0A6CD0] hover:underline"
                  >
                    查看更多
                  </Link>
                </div>
                <ul className="text-[12px] text-slate-800 space-y-1 mb-3">
                  <li className="flex gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    與本商品高度搭配
                  </li>
                  <li className="flex gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    旅行充電熱銷組合
                  </li>
                  <li className="flex gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    加購再享組合優惠
                  </li>
                </ul>
                {RECOMMENDED.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRecommendOpt(opt.id)}
                    className={`w-full text-left px-3 py-2.5 mb-2 last:mb-0 border-2 transition-colors ${
                      recommendOpt === opt.id
                        ? "border-[#3B9EFF] bg-[#F0F7FF]"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-950 flex items-center gap-1.5">
                          {recommendOpt === opt.id && (
                            <span className="w-4 h-4 rounded-full bg-[#3B9EFF] text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" strokeWidth={3} />
                            </span>
                          )}
                          {opt.title}
                        </p>
                        <p
                          className={`text-[11px] text-slate-700 mt-0.5 ${
                            recommendOpt === opt.id ? "ml-5" : "ml-0"
                          }`}
                        >
                          {opt.sub}
                        </p>
                      </div>
                      {opt.price && (
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-bold text-slate-950">
                            {opt.price}
                          </p>
                          {opt.strike && (
                            <del className="text-[11px] text-slate-600">
                              {opt.strike}
                            </del>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Review Selections */}
              <div className="bg-[#f7f7f7] p-4">
                <p className="text-[14px] font-bold text-slate-900 mb-3">
                  Review Your Selections
                </p>
                <div className="flex gap-3">
                  <div className="relative w-16 h-16 bg-white shrink-0 overflow-hidden">
                    <Image
                      src={GALLERY[0].src}
                      alt=""
                      fill
                      className="object-contain p-1"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-950 font-medium line-clamp-2">
                      {PRODUCT.title}
                    </p>
                    <p className="text-[12px] text-slate-700 mt-1">
                      {styleLabel} · ×{qty}
                    </p>
                    <p className="text-[12px] text-[#0A8F6E] mt-1">
                      {PRODUCT.stockText}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xl font-bold">
                    NT${displayPrice.toLocaleString()}
                  </span>
                  {PRODUCT.saveAmount > 0 ? (
                    <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5">
                      省 NT${PRODUCT.saveAmount}
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="py-3 text-[13px] font-bold border-2 border-[#3B9EFF] text-[#0A6CD0] hover:bg-[#F0F7FF] transition-colors"
                  >
                    加入購物車
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="py-3 text-[13px] font-bold bg-[#3B9EFF] text-white hover:bg-[#2B8EEF] transition-colors"
                  >
                    立即購買
                  </button>
                </div>
              </div>

              {/* Services */}
              <div>
                <p className="text-[14px] font-bold text-slate-900 mb-2">
                  Services and Benefits
                </p>
                <ul className="space-y-2">
                  {[
                    "快速免運配送",
                    "30 天鑑賞期退貨",
                    "安心保固服務",
                    "終身客服支援",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-[13px] text-slate-900"
                    >
                      <Check className="w-4 h-4 text-slate-700" />
                      {item}
                      <Info className="w-3.5 h-3.5 text-slate-500 ml-auto" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Overview／產品說明 ── */}
        <section id="overview" className={`${CONTAINER} pt-16 pb-8`}>
          <h2 className="text-[24px] font-bold text-slate-900 mb-4">
            {PRODUCT.physicalDescription?.text
              ? "產品說明"
              : "體驗強大的 240W 充電效能"}
          </h2>
          {PRODUCT.physicalDescription?.text ? (
            <p className="text-[14px] text-slate-800 max-w-3xl leading-relaxed whitespace-pre-line">
              {PRODUCT.physicalDescription.text}
            </p>
          ) : (
            <p className="text-[14px] text-slate-800 max-w-3xl leading-relaxed">
              {PRODUCT.description ||
                "體驗 240W 超高速充電，採用消費後再生尼龍編織，兼具快速傳輸與極端溫度耐候（-40°C～80°C），通過 USB-IF 認證，保護裝置安全。彎折耐久超過 30 萬次，為旅行與日常打造可靠充電體驗。"}
            </p>
          )}
          {PRODUCT.physicalDescription?.images?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              {PRODUCT.physicalDescription.images.map((img, i) => (
                <div
                  key={`${img.url}-${i}`}
                  className="relative w-full overflow-hidden bg-[#f5f5f5]"
                  style={{
                    aspectRatio:
                      PRODUCT.physicalDescription.aspect === "3:4"
                        ? "3 / 4"
                        : "4 / 3",
                  }}
                >
                  <Image
                    src={img.url}
                    alt={img.alt || `${PRODUCT.title} 說明圖 ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                    unoptimized={/^https?:\/\//i.test(img.url || "")}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* ── Reviews ── */}
        <section id="reviews" className="bg-white border-t border-slate-200/80">
          <div className={`${CONTAINER} py-14`}>
            <h2 className="text-[24px] font-bold text-slate-900 mb-2">顧客評價</h2>
            <div className="flex items-center gap-2 mb-8">
              <span className="text-[28px] font-bold text-slate-900">
                {PRODUCT.rating}
              </span>
              <div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-orange-400 text-orange-400"
                    />
                  ))}
                </div>
                <p className="text-[12px] text-slate-600">
                  {PRODUCT.reviewCount} 則評價
                </p>
              </div>
            </div>
            <div className="space-y-0 divide-y divide-slate-100">
              {[
                {
                  name: "旅行達人小王",
                  text: "出國帶這條線超穩，筆電手機都能充，編織線很耐用。",
                  stars: 5,
                },
                {
                  name: "商務出差",
                  text: "240W 充電速度快，長度剛好，不會凌亂。",
                  stars: 5,
                },
                {
                  name: "日常使用",
                  text: "質感不錯，比一般線材硬挺很多，值得入手。",
                  stars: 4,
                },
              ].map((r) => (
                <div key={r.name} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[13px] font-semibold text-slate-900">
                      {r.name}
                    </span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < r.stars ? "fill-orange-400 text-orange-400" : "text-slate-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[13px] text-slate-700 leading-relaxed">
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Sticky 底部購買列 ── */}
      <div
        ref={stickyRef}
        className={`fixed bottom-0 left-0 right-0 z-[7500] bg-white border-t border-slate-200 transition-transform duration-300 ${
          showSticky ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div
          className={`${CONTAINER} py-3 flex items-center justify-between gap-3`}
        >
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-[13px] sm:text-[14px] font-semibold text-slate-900 truncate">
              {PRODUCT.title}
            </p>
            <p className="text-[11px] text-slate-600 truncate mt-0.5">
              規格：{styleLabel}
              <span className="mx-1.5 text-slate-300">·</span>
              數量：{qty}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold">
                NT${displayPrice.toLocaleString()}
              </span>
              {PRODUCT.saveAmount > 0 ? (
                <span className="hidden sm:inline text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5">
                  省 NT${PRODUCT.saveAmount}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="px-3 sm:px-5 py-2.5 text-[12px] sm:text-[13px] font-bold border-2 border-[#3B9EFF] text-[#0A6CD0] hover:bg-[#F0F7FF]"
            >
              加入購物車
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="px-3 sm:px-5 py-2.5 text-[12px] sm:text-[13px] font-bold bg-[#3B9EFF] text-white hover:bg-[#2B8EEF]"
            >
              立即購買
            </button>
          </div>
        </div>
      </div>

      <Footer forceShow />
      <ShopCartSidebar />
    </>
  );
}

export async function getStaticPaths() {
  try {
    const handles = await listShopProductHandles({ limit: 80 });
    const paths = [
      { params: { slug: "usb-c-cable-240w" } },
      ...handles
        .filter((h) => h && h !== "usb-c-cable-240w")
        .map((slug) => ({ params: { slug } })),
    ];
    return { paths, fallback: "blocking" };
  } catch (err) {
    console.error("[shop/product] getStaticPaths:", err?.message || err);
    return {
      paths: [{ params: { slug: "usb-c-cable-240w" } }],
      fallback: "blocking",
    };
  }
}

export async function getStaticProps({ params }) {
  const slug = String(params?.slug || "").trim();
  if (!slug) return { notFound: true, revalidate: 60 };

  // 既有 demo 頁
  if (slug === "usb-c-cable-240w") {
    return {
      props: { product: null, gallery: null },
      revalidate: SHOP_PRODUCT_REVALIDATE_SEC,
    };
  }

  try {
    const data = await fetchShopProductByHandle(slug);
    if (!data) return { notFound: true, revalidate: 60 };
    return {
      props: {
        product: data.product,
        gallery: data.gallery,
      },
      revalidate: SHOP_PRODUCT_REVALIDATE_SEC,
    };
  } catch (err) {
    console.error("[shop/product]", err?.message || err);
    // 暫時失敗勿永久 404
    return { notFound: true, revalidate: 60 };
  }
}
