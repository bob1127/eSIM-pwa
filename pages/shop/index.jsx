"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ShopNavbar from "../../components/Shop/ShopNavbar";
import Footer from "../../components/ui/footer.jsx";

const CONTAINER = "max-w-[1680px] mx-auto px-6 lg:px-10";

// ── Section 1：雙欄促銷卡 ─────────────────────────────────────────
const PROMO_CARDS = [
  {
    title: "出國必備充電組",
    sub: "65W 氮化鎵充電器 + 行動電源",
    img: "/images/shop/shop-promo-01.png",
    href: "/shop/product/usb-c-cable-240w",
  },
  {
    title: "旅行收納一次搞定",
    sub: "輕量、防水、好收納",
    img: "https://www.bitplayinc.com/cdn/shop/files/Slider_s4_2000x.jpg?v=1740538574",
    href: "/shop/product/usb-c-cable-240w",
  },
];

const PRODUCT_PDP = "/shop/product/usb-c-cable-240w";

// ── Section 2：精選商品（Tab + 輪播）— 圖來自 /images/shop/01 去背圖 ──
const SHOP_01_IMGS = [
  "/images/shop/01/p1.avif",
  "/images/shop/01/p2.avif",
  "/images/shop/01/p3.avif",
  "/images/shop/01/p4.webp",
  "/images/shop/01/p5.webp",
];

const PRODUCT_TABS = {
  new: [
    {
      title: "65W 氮化鎵旅行充電器",
      desc: "折疊插頭 · 全球電壓適用",
      price: 680,
      original: 880,
      img: SHOP_01_IMGS[0],
      href: PRODUCT_PDP,
    },
    {
      title: "日本 5G eSIM 吃到飽（7天）",
      desc: "即買即用 · QR Code 啟用",
      price: 299,
      original: 399,
      img: SHOP_01_IMGS[1],
      href: PRODUCT_PDP,
    },
    {
      title: "全球通用轉接插座",
      desc: "150+ 國家適用",
      price: 350,
      original: null,
      img: SHOP_01_IMGS[2],
      href: PRODUCT_PDP,
    },
    {
      title: "ANC 降噪無線耳機",
      desc: "出差旅行必備",
      price: 1280,
      original: 1680,
      img: SHOP_01_IMGS[3],
      href: PRODUCT_PDP,
    },
    {
      title: "MagSafe 15W 無線充電板",
      desc: "磁吸對位 · 快速充電",
      price: 990,
      original: 1290,
      img: SHOP_01_IMGS[4],
      href: PRODUCT_PDP,
    },
    {
      title: "旅行盥洗收納包",
      desc: "防水材質 · 吊掛設計",
      price: 320,
      original: null,
      img: SHOP_01_IMGS[0],
      href: PRODUCT_PDP,
    },
  ],
  bestsellers: [
    {
      title: "10000mAh USB-C 行動電源",
      desc: "雙向快充 · 輕薄好攜帶",
      price: 790,
      original: 990,
      img: SHOP_01_IMGS[1],
      href: PRODUCT_PDP,
    },
    {
      title: "韓國 5G eSIM（5天）",
      desc: "不限速 · 即開即用",
      price: 199,
      original: 269,
      img: SHOP_01_IMGS[2],
      href: PRODUCT_PDP,
    },
    {
      title: "旅行收納整理包套組",
      desc: "分層收納 · 防水材質",
      price: 450,
      original: null,
      img: SHOP_01_IMGS[3],
      href: PRODUCT_PDP,
    },
    {
      title: "防窺螢幕保護貼 iPhone",
      desc: "防刮耐磨 · 完美貼合",
      price: 280,
      original: null,
      img: SHOP_01_IMGS[4],
      href: PRODUCT_PDP,
    },
    {
      title: "車用 PD 快充充電器",
      desc: "雙孔輸出 · 過熱保護",
      price: 480,
      original: 580,
      img: SHOP_01_IMGS[0],
      href: PRODUCT_PDP,
    },
    {
      title: "隱形腰包 防扒設計",
      desc: "貼身收納 · 出國安心",
      price: 390,
      original: null,
      img: SHOP_01_IMGS[1],
      href: PRODUCT_PDP,
    },
  ],
};

// ── Section 3：品牌探索 Banner ────────────────────────────────────
const DISCOVER_BANNER = {
  title: "探索更多旅行好物",
  sub: "eSIM · 充電配件 · 收納 · 包車服務",
  img: "/images/shop/shop-discover.png",
  href: "/shop/product/usb-c-cable-240w",
  cta: "立即選購",
};

function PromoCard({ card }) {
  return (
    <Link
      href={card.href}
      className="group relative block aspect-[16/9] md:aspect-[5/3] overflow-hidden bg-slate-200"
    >
      <Image
        src={card.img}
        alt={card.title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 p-6 sm:p-8 flex flex-col items-start gap-2">
        <h3 className="text-white text-xl sm:text-2xl font-bold leading-tight">
          {card.title}
        </h3>
        <p className="text-white/90 text-sm sm:text-[15px]">{card.sub}</p>
        <span className="mt-2 inline-block bg-white text-black text-[12px] font-bold tracking-wide px-5 py-2.5 hover:bg-slate-100 transition-colors">
          SHOP NOW
        </span>
      </div>
    </Link>
  );
}

function ProductCard({ product }) {
  return (
    <div className="bg-[#ffffff] flex flex-col h-full">
      {/* 去背商品圖：淺灰底 + object-contain */}
      <Link
        href={product.href}
        className="relative aspect-square bg-[#ffffff] overflow-hidden block"
      >
        <Image
          src={product.img}
          alt={product.title}
          fill
          className="object-contain p-8 hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </Link>
      <div className="px-4 pb-4 flex flex-col flex-1">
        <Link href={product.href}>
          <h3 className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2 min-h-[40px]">
            {product.title}
          </h3>
        </Link>
        <p className="text-[12px] text-slate-500 mt-1 line-clamp-1">
          {product.desc}
        </p>
        <div className="flex items-baseline gap-2 mt-2 mb-4">
          <span className="text-[15px] font-bold text-slate-900">
            NT${product.price.toLocaleString()}
          </span>
          {product.original && (
            <del className="text-[12px] text-slate-400">
              NT${product.original.toLocaleString()}
            </del>
          )}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <Link
            href={product.href}
            className="text-center text-[12px] font-semibold border border-black text-black py-2.5 hover:bg-slate-100 transition-colors"
          >
            Shop Now
          </Link>
          <Link
            href={product.href}
            className="text-center text-[12px] font-semibold bg-black text-white py-2.5 hover:bg-slate-800 transition-colors"
          >
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProductCarousel({ products }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  const scrollBy = useCallback((dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.75;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;

    if (dir > 0 && atEnd) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (dir < 0 && el.scrollLeft <= 8) {
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    } else {
      el.scrollBy({ left: dir * step, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [products, updateArrows]);

  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0 });
    updateArrows();
  }, [products, updateArrows]);

  // 自動輪播
  useEffect(() => {
    clearInterval(timerRef.current);
    if (paused || products.length <= 1) return;
    timerRef.current = setInterval(() => scrollBy(1), 3500);
    return () => clearInterval(timerRef.current);
  }, [paused, products, scrollBy]);

  const btnClass =
    "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none";

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="上一頁"
        disabled={!canPrev && !canNext}
        className={`${btnClass} left-0 -translate-x-3`}
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={2} />
      </button>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="下一頁"
        disabled={!canPrev && !canNext}
        className={`${btnClass} right-0 translate-x-3`}
      >
        <ChevronRight className="w-5 h-5" strokeWidth={2} />
      </button>

      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <div
            key={p.title}
            data-card
            className="snap-start shrink-0 w-[calc(50%-8px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)]"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShopPage() {
  const [tab, setTab] = useState("new");
  const products = PRODUCT_TABS[tab];

  return (
    <>
      <Head>
        <title>好物商城 | Jeko eSIM</title>
        <meta
          name="description"
          content="Jeko 好物商城 — eSIM、充電配件、旅行配件、3C周邊，出國必備一站購齊。"
        />
      </Head>

      <ShopNavbar />

      <main className="bg-[#DFE0E5]">
        {/* ── Hero：單圖滿屏，點擊進入商品內頁 ── */}
        <section className="relative w-full h-[100vh] overflow-hidden bg-slate-100">
          <Link href={PRODUCT_PDP} className="absolute inset-0 block">
            <Image
              src="/images/shop/shop-hero-banner.png"
              alt="Jeko 好物商城"
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          </Link>
        </section>

        {/* ── Section 1：雙欄促銷卡 ── */}
        <section className={`${CONTAINER} py-10 sm:py-14`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROMO_CARDS.map((card) => (
              <PromoCard key={card.href} card={card} />
            ))}
          </div>
        </section>

        {/* ── Section 2：Must-Have 精選商品（輪播） ── */}
        <section className={`${CONTAINER} pb-10 sm:pb-14`}>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-5">
            Must-Have Jeko Selections
          </h2>

          <div className="flex items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setTab("new")}
              className={`px-4 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                tab === "new"
                  ? "bg-white border border-black text-black"
                  : "bg-[#e8e8e8] text-slate-700 border border-transparent hover:bg-[#ddd]"
              }`}
            >
              New Arrivals
            </button>
            <button
              type="button"
              onClick={() => setTab("bestsellers")}
              className={`px-4 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                tab === "bestsellers"
                  ? "bg-white border border-black text-black"
                  : "bg-[#e8e8e8] text-slate-700 border border-transparent hover:bg-[#ddd]"
              }`}
            >
              Bestsellers
            </button>
          </div>

          <ProductCarousel products={products} />
        </section>

        {/* ── Section 3：Discover More Banner ── */}
        <section className={`${CONTAINER} pb-14 sm:pb-20`}>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
            Discover More from Jeko
          </h2>
          <Link
            href={DISCOVER_BANNER.href}
            className="group relative block w-full aspect-[21/9] min-h-[220px] overflow-hidden bg-slate-200"
          >
            <Image
              src={DISCOVER_BANNER.img}
              alt={DISCOVER_BANNER.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center items-start px-8 sm:px-14 gap-2">
              <h3 className="text-white text-2xl sm:text-3xl font-bold leading-tight">
                {DISCOVER_BANNER.title}
              </h3>
              <p className="text-white/90 text-sm sm:text-base">
                {DISCOVER_BANNER.sub}
              </p>
              <span className="mt-3 inline-block bg-white text-black text-[13px] font-bold px-6 py-2.5 hover:bg-slate-100 transition-colors">
                {DISCOVER_BANNER.cta}
              </span>
            </div>
          </Link>
        </section>
      </main>

      <Footer forceShow />
    </>
  );
}
