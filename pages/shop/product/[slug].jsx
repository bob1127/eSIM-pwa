"use client";

import { useState, useEffect, useRef } from "react";
import Head from "next/head";
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
import MediaGalleryLightbox from "../../../components/MediaGalleryLightbox";
import MaterialIcon from "../../../components/MaterialIcon";

const CONTAINER = "max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10";

/** Anker A88E2 商品圖（暫用官方 CDN） */
const GALLERY = [
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

const PRODUCT = {
  slug: "usb-c-cable-240w",
  badge: "Hot",
  title: "Jeko Prime USB-C to USB-C Cable (240W, Upcycled-Braided)",
  rating: 4.9,
  reviewCount: 197,
  price: 980,
  originalPrice: 1230,
  saveAmount: 250,
  discountLabel: "NT$250 OFF",
  promoCode: "JEKO250",
  features: [
    "Ultra-Powerful 240W Charging",
    "100-Year Bend Durability",
    "Extreme Temperature Resilience",
    "Sustainably Made Cable",
  ],
  styles: [
    { id: "3ft", label: "3 ft / 0.9m" },
    { id: "6ft", label: "6 ft / 1.8m" },
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
  { id: "purchase", label: "Purchase" },
  { id: "overview", label: "Overview" },
  { id: "reviews", label: "Reviews" },
];

function Gallery({ images, badge, productName }) {
  const [idx, setIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [vw, setVw] = useState(0);
  const [tx, setTx] = useState(0);
  const [animate, setAnimate] = useState(false);
  const viewportRef = useRef(null);
  const lockedRef = useRef(false);
  const pendingDirRef = useRef(0);
  const len = images.length;

  const PEEK_RATIO = 0.11;
  const MAIN_RATIO = 0.78;
  const peek = vw * PEEK_RATIO;
  const main = vw * MAIN_RATIO;
  // 靜止時：三張各為 main 寬，translate 讓中間張對齊中間框
  const restTx = peek - main;

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
    if (vw > 0 && !lockedRef.current) setTx(restTx);
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
    setIdx((p) => (p + dir + len) % len);
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
    else setIdx(target);
  };

  // 軌道上三張：上一張 / 目前 / 下一張
  const slideIndexes = [(idx - 1 + len) % len, idx, (idx + 1) % len];

  return (
    <div className="w-full lg:sticky lg:top-[11rem] self-start">
      <div
        ref={viewportRef}
        className="group relative w-full overflow-hidden h-[70vh] lg:h-[calc(100dvh-10.5rem)] lg:min-h-[520px] lg:max-h-[920px] bg-[#111]"
      >
        {/* 折扣旗標 */}
        <div
          className="absolute top-0 z-30 pointer-events-none"
          style={{ left: `${PEEK_RATIO * 100}%` }}
        >
          <div className="bg-[#3B9EFF] text-white text-[11px] font-bold px-3 py-1.5 relative">
            {badge}
            <span className="absolute -right-2 top-0 w-0 h-0 border-t-[12px] border-t-[#3B9EFF] border-r-[8px] border-r-transparent border-b-[12px] border-b-[#3B9EFF]" />
          </div>
        </div>

        {/* 滑動軌道：左右 peek + 中央滿版 */}
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
            finishSlide();
          }}
        >
          {slideIndexes.map((imageIndex, i) => {
            const isCenter = i === 1;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (isCenter) openLightbox(imageIndex);
                  else go(i === 0 ? -1 : 1);
                }}
                className={`relative h-full shrink-0 overflow-hidden focus:outline-none ${
                  isCenter ? "cursor-zoom-in" : "cursor-pointer"
                }`}
                style={{ width: main || "78%" }}
                aria-label={
                  isCenter
                    ? `放大檢視第 ${imageIndex + 1} 張圖片`
                    : i === 0
                      ? "上一張"
                      : "下一張"
                }
              >
                <Image
                  src={images[imageIndex].src}
                  alt={isCenter ? images[imageIndex].alt : ""}
                  fill
                  priority={isCenter}
                  className="object-cover pointer-events-none"
                  sizes="(max-width: 1024px) 80vw, 50vw"
                />
                {!isCenter && (
                  <span className="absolute inset-0 bg-black/45 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>

        {/* 左右箭頭（固定在 peek 區） */}
        {len > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="上一張"
              className="absolute left-0 top-0 bottom-0 z-20 flex items-center justify-center"
              style={{ width: `${PEEK_RATIO * 100}%` }}
            >
              <span className="w-9 h-9 bg-white/95 border border-slate-200 flex items-center justify-center shadow-sm pointer-events-none">
                <ChevronLeft className="w-5 h-5 text-slate-900" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="下一張"
              className="absolute right-0 top-0 bottom-0 z-20 flex items-center justify-center"
              style={{ width: `${PEEK_RATIO * 100}%` }}
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
          onClick={() => openLightbox(idx)}
          className="absolute top-3 z-30 w-9 h-9 rounded-full bg-white/90 border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100"
          style={{ right: `calc(${PEEK_RATIO * 100}% + 0.75rem)` }}
          aria-label="放大檢視"
        >
          <MaterialIcon name="fullscreen" size={16} />
        </button>

        {/* 計數 */}
        <span
          className="absolute bottom-3 z-30 text-[12px] text-white bg-black/45 px-2 py-0.5 rounded pointer-events-none"
          style={{ right: `calc(${PEEK_RATIO * 100}% + 1rem)` }}
        >
          {idx + 1}/{len}
        </span>
      </div>

      {/* 縮圖列 */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            onDoubleClick={() => openLightbox(i)}
            className={`relative shrink-0 w-14 h-14 bg-[#f5f5f5] overflow-hidden border-2 transition-colors ${
              i === idx
                ? "border-slate-800"
                : "border-transparent hover:border-slate-300"
            }`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover"
              sizes="56px"
            />
          </button>
        ))}
      </div>

      {/* Overview / Video */}
      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-slate-800 text-white"
        >
          <FileText className="w-3.5 h-3.5" />
          Overview
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-slate-800 hover:text-slate-900"
        >
          <Play className="w-3.5 h-3.5" />
          Video
        </button>
      </div>

      <MediaGalleryLightbox
        isOpen={lightboxOpen}
        onClose={(closedIdx) => {
          setLightboxOpen(false);
          if (typeof closedIdx === "number") setIdx(closedIdx);
        }}
        images={images}
        productName={productName}
        initialIndex={lightboxIndex}
        ariaLabel="商品圖片檢視"
      />
    </div>
  );
}

export default function ShopProductPage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState("purchase");
  const [styleId, setStyleId] = useState("6ft");
  const [qty, setQty] = useState(1);
  const [featuresOpen, setFeaturesOpen] = useState(true);
  const [recommendOpt, setRecommendOpt] = useState("none");
  const [copied, setCopied] = useState(false);
  const stickyRef = useRef(null);
  const [showSticky, setShowSticky] = useState(false);

  const styleLabel =
    PRODUCT.styles.find((s) => s.id === styleId)?.label || styleId;

  const buildCartProduct = () => ({
    id: `${PRODUCT.slug}-${styleId}`,
    variant_id: `${PRODUCT.slug}-${styleId}`,
    title: PRODUCT.title,
    name: PRODUCT.title,
    price: PRODUCT.price,
    quantity: qty,
    image: GALLERY[0] || "/images/shop/shop-promo-01.png",
    specLabel: styleLabel,
    options: styleLabel,
    type: "physical",
  });

  const handleAddToCart = () => {
    addToCart(buildCartProduct());
  };

  const handleBuyNow = () => {
    addToCart(buildCartProduct(), { open: false });
    router.push("/checkout/shop");
  };

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const copyCode = async () => {
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
      <Head>
        <title>{PRODUCT.title} | Jeko Jeko 商城</title>
        <meta name="description" content={PRODUCT.title} />
      </Head>

      <ShopNavbar compact />

      {/* ── 商品次導覽列（單列 navbar 後高度約：黑32+藍36+白56 ≈ 124） ── */}
      <div className="sticky top-[124px] z-[7000] bg-white border-b border-slate-200">
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
            {/* 左：圖庫 */}
            <Gallery
              images={GALLERY}
              badge={PRODUCT.discountLabel}
              productName={PRODUCT.title}
            />

            {/* 右：購買資訊 */}
            <div className="flex flex-col gap-4 lg:pt-1">
              <span className="text-[12px] font-bold text-orange-500">
                {PRODUCT.badge}
              </span>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug -mt-2">
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
                <span className="text-2xl font-bold text-slate-900">
                  NT${PRODUCT.price.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                  省 NT${PRODUCT.saveAmount}
                </span>
                <del className="text-[13px] text-slate-600">
                  NT${PRODUCT.originalPrice.toLocaleString()}
                </del>
              </div>

              {/* 優惠碼框 */}
              <div className="flex items-stretch border border-[#B8D9FF] bg-[#E8F3FF] overflow-hidden">
                <div className="flex items-center justify-center px-4 bg-[#3B9EFF] text-white text-lg font-black shrink-0 border-r border-dashed border-white/50">
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
                    {copied ? "已複製" : "Copy Code"}
                  </button>
                </div>
              </div>

              {/* 登入提示 */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#f5f5f5] text-[12px] text-slate-800">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">登入享安心購保障與會員積分回饋</span>
                <Link
                  href="/login"
                  className="text-[#0A6CD0] font-semibold hover:underline shrink-0"
                >
                  Sign In &gt;
                </Link>
              </div>

              {/* Key Features */}
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setFeaturesOpen((v) => !v)}
                  className="w-full flex items-center justify-between text-[14px] font-bold text-slate-900"
                >
                  Key Features
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

              {/* Style */}
              <div>
                <p className="text-[13px] text-slate-900 mb-2">
                  Style: <span className="font-semibold">{styleLabel}</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT.styles.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStyleId(s.id)}
                      className={`py-3 px-3 text-[13px] font-medium border-2 transition-colors ${
                        styleId === s.id
                          ? "border-[#3B9EFF] bg-white text-slate-900"
                          : "border-slate-200 text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <p className="text-[13px] text-slate-900 mb-2">Quantity</p>
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
                  Need help? Contact us &gt;
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
                    NT${PRODUCT.price.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5">
                    省 NT${PRODUCT.saveAmount}
                  </span>
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

        {/* ── Overview ── */}
        <section id="overview" className={`${CONTAINER} pt-16 pb-8`}>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Unleash Mighty 240W Charging
          </h2>
          <p className="text-[14px] text-slate-800 max-w-3xl leading-relaxed">
            體驗 240W
            超高速充電，採用消費後再生尼龍編織，兼具快速傳輸與極端溫度耐候（-40°C～80°C），
            通過 USB-IF 認證，保護裝置安全。彎折耐久超過 30
            萬次，為旅行與日常打造可靠充電體驗。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            {GALLERY.slice(1).map((img) => (
              <div
                key={img.src}
                className="relative aspect-[16/10] bg-[#f5f5f5] overflow-hidden"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="50vw"
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── Reviews ── */}
        <section id="reviews" className="bg-white border-t border-slate-200/80">
          <div className={`${CONTAINER} py-14`}>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Reviews</h2>
            <div className="flex items-center gap-2 mb-8">
              <span className="text-3xl font-bold text-slate-900">
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
          className={`${CONTAINER} py-3 flex flex-wrap items-center justify-between gap-3`}
        >
          <p className="text-[12px] text-slate-700 hidden sm:block">
            {PRODUCT.stockText}
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                NT${PRODUCT.price.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5">
                省 NT${PRODUCT.saveAmount}
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="px-5 py-2.5 text-[13px] font-bold border-2 border-[#3B9EFF] text-[#0A6CD0] hover:bg-[#F0F7FF]"
            >
              加入購物車
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="px-5 py-2.5 text-[13px] font-bold bg-[#3B9EFF] text-white hover:bg-[#2B8EEF]"
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
