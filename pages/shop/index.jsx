import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X, Minus, Plus } from "lucide-react";
import ShopNavbar from "../../components/Shop/ShopNavbar";
import ShopCartSidebar from "../../components/Shop/ShopCartSidebar";
import Footer from "../../components/ui/footer.jsx";
import SeoHead from "../../components/SeoHead";
import { useCart } from "../../components/context/CartContext";
import { useRouter } from "next/router";
import {
  PRODUCT_PDP,
  SHOP_TRAVEL_GEAR as TRAVEL_GEAR,
} from "../../data/shop/catalog";
import { fetchShopMustHaveSelections } from "../../lib/shopSelections";
import { buildShopIndexSeo } from "../../lib/seo.config";
import { resolveMedusaImageUrl } from "../../lib/resolveMedusaImageUrl";

const CONTAINER = "max-w-[1680px] mx-auto px-6 lg:px-10";
const PLACEHOLDER_IMG = "/images/shop/01/p1.avif";
/** ISR：約 2 分鐘刷新商城列表 */
const SHOP_REVALIDATE_SEC = 120;

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
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 p-6 sm:p-8 flex flex-col items-start gap-2">
        <h3 className="text-white text-xl sm:text-[24px] font-bold leading-tight">
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
  const router = useRouter();
  const { addToCart } = useCart();
  const rawImg = product.img || PLACEHOLDER_IMG;
  const [imgSrc, setImgSrc] = useState(
    () => resolveMedusaImageUrl(rawImg) || rawImg || PLACEHOLDER_IMG,
  );
  const pdpHref = product.href || PRODUCT_PDP;

  useEffect(() => {
    const next = resolveMedusaImageUrl(product.img) || product.img || PLACEHOLDER_IMG;
    setImgSrc(next);
  }, [product.img]);

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(
      {
        id: product.variant_id || product.id || product.href || product.title,
        variant_id:
          product.variant_id || product.id || product.href || product.title,
        name: product.title,
        title: product.title,
        price: product.price,
        quantity: 1,
        image: imgSrc,
        type: "physical",
        href: pdpHref,
      },
      { open: false },
    );
    router.push("/checkout/shop");
  };

  return (
    <div className="bg-white flex flex-col h-full">
      <Link
        href={pdpHref}
        className="relative aspect-square bg-[#F3F4F6] overflow-hidden block w-full text-left"
      >
        <span className="absolute inset-5 sm:inset-6">
          <Image
            src={imgSrc}
            alt={product.title}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 50vw, 25vw"
            unoptimized
            onError={() => setImgSrc(PLACEHOLDER_IMG)}
          />
        </span>
      </Link>
      <div className="px-4 pt-3 pb-5 sm:pb-6 flex flex-col flex-1">
        <Link href={pdpHref} className="text-left">
          <h3 className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2 min-h-[40px]">
            {product.title}
          </h3>
        </Link>
        <p className="text-[12px] text-slate-500 mt-1 line-clamp-1 min-h-[18px]">
          {product.desc || "\u00A0"}
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
        <div className="mt-auto grid grid-cols-2 gap-2 pb-0.5">
          <button
            type="button"
            onClick={handleBuyNow}
            className="text-center text-[12px] font-semibold bg-[#3B9EFF] text-white py-2.5 hover:bg-[#2B8EEF] transition-colors"
          >
            立即購買
          </button>
          <Link
            href={pdpHref}
            className="text-center text-[12px] font-semibold bg-[#E5E7EB] text-slate-800 py-2.5 hover:bg-[#D1D5DB] transition-colors"
          >
            商品詳情
          </Link>
        </div>
      </div>
    </div>
  );
}

/** 單純商品詳情 Popup + 商品圖輪播（無第二張則重複同一張） */
function ProductQuickView({ product, onClose }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  const gallery = useMemo(() => {
    const raw =
      product.images?.length > 0
        ? product.images
        : [product.img, product.img].filter(Boolean);
    // 至少兩張以便輪播；只有一張就複製同一張
    if (raw.length === 1) return [raw[0], raw[0]];
    return raw;
  }, [product]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    const t = setInterval(() => {
      setImgIdx((i) => (i + 1) % gallery.length);
    }, 2800);
    return () => clearInterval(t);
  }, [gallery.length]);

  if (!product) return null;

  const save = product.original ? product.original - product.price : 0;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="關閉"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[520px] max-h-[90vh] overflow-y-auto bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center bg-white/90 border border-slate-200 text-slate-700 hover:bg-slate-100"
          aria-label="關閉"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        {/* 商品圖輪播 */}
        <div className="relative aspect-square bg-slate-100">
          {gallery.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className={`absolute inset-0 transition-opacity duration-500 ${
                i === imgIdx ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={src}
                alt={`${product.title} ${i + 1}`}
                fill
                className="object-cover"
                sizes="520px"
                priority={i === 0}
                unoptimized={/^https?:\/\//i.test(src)}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setImgIdx((i) => (i - 1 + gallery.length) % gallery.length)
            }
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 border border-slate-200 flex items-center justify-center hover:bg-white"
            aria-label="上一張"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setImgIdx((i) => (i + 1) % gallery.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 border border-slate-200 flex items-center justify-center hover:bg-white"
            aria-label="下一張"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {gallery.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setImgIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === imgIdx ? "bg-[#3B9EFF]" : "bg-slate-300"
                }`}
                aria-label={`第 ${i + 1} 張`}
              />
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6 flex flex-col gap-3">
          <h2 className="text-lg font-bold text-slate-900 leading-snug pr-8">
            {product.title}
          </h2>
          <p className="text-[13px] text-slate-600">{product.desc}</p>

          <div className="flex items-baseline gap-2">
            <span className="text-[24px] font-bold text-slate-900">
              NT${product.price.toLocaleString()}
            </span>
            {product.original && (
              <del className="text-[13px] text-slate-400">
                NT${product.original.toLocaleString()}
              </del>
            )}
            {save > 0 && (
              <span className="text-[11px] font-bold text-orange-600">
                省 NT${save.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[13px] text-slate-700">數量</span>
            <div className="inline-flex items-center border border-slate-200">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center hover:bg-slate-50"
                aria-label="減少"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center text-[14px] font-semibold">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                className="w-9 h-9 flex items-center justify-center hover:bg-slate-50"
                aria-label="增加"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                addToCart({
                  id: product.href || product.title,
                  variant_id: product.href || product.title,
                  name: product.title,
                  title: product.title,
                  price: product.price,
                  quantity: qty,
                  image: product.img,
                  type: "physical",
                });
                onClose?.();
              }}
              className="py-3 text-center text-[13px] font-bold bg-[#E5E7EB] text-slate-800 hover:bg-[#D1D5DB] transition-colors"
            >
              加入購物車
            </button>
            <button
              type="button"
              onClick={() => {
                addToCart(
                  {
                    id: product.href || product.title,
                    variant_id: product.href || product.title,
                    name: product.title,
                    title: product.title,
                    price: product.price,
                    quantity: qty,
                    image: product.img,
                    type: "physical",
                  },
                  { open: false },
                );
                onClose?.();
                router.push("/checkout/shop");
              }}
              className="py-3 text-center text-[13px] font-bold bg-[#3B9EFF] text-white hover:bg-[#2B8EEF] transition-colors"
            >
              立即購買
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 往左自動無限輪播（transform 無縫，不會倒轉） */
function ProductCarousel({ products }) {
  const viewportRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [paused, setPaused] = useState(false);
  const [cardW, setCardW] = useState(0);
  const [cols, setCols] = useState(2);
  const gap = 16;
  const n = products.length;
  // 商品數 ≤ 可見欄數時不要複製 slides，否則會看起來「同一商品出現兩次」
  const loop = n > cols;

  const slides = useMemo(() => {
    if (!n) return [];
    const list = loop ? [...products, ...products] : products;
    return list.map((p, i) => ({
      ...p,
      _key: `${p.id || p.href || p.title}-${i}`,
    }));
  }, [products, n, loop]);

  const measure = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const w = vp.clientWidth;
    let nextCols = 2;
    if (w >= 1024) nextCols = 4;
    else if (w >= 640) nextCols = 3;
    setCols(nextCols);
    // 維持原本 2／3／4 欄卡片寬，不因商品少而拉滿
    setCardW((w - gap * (nextCols - 1)) / nextCols);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => {
    setIndex(0);
    setAnimating(false);
    requestAnimationFrame(() => setAnimating(true));
  }, [products]);

  const go = useCallback(
    (dir) => {
      if (!n) return;
      if (!loop) {
        setAnimating(true);
        setIndex((i) => Math.min(Math.max(i + dir, 0), Math.max(n - 1, 0)));
        return;
      }
      setAnimating(true);
      setIndex((i) => i + dir);
    },
    [n, loop],
  );

  // 滑完一輪後無動畫重置（僅無限輪播）
  useEffect(() => {
    if (!loop || index < n) return;
    const t = window.setTimeout(() => {
      setAnimating(false);
      setIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    }, 480);
    return () => clearTimeout(t);
  }, [index, n, loop]);

  // 往左自動（商品夠多才自動播）
  useEffect(() => {
    if (paused || !loop || !cardW) return;
    const t = setInterval(() => go(1), 3200);
    return () => clearInterval(t);
  }, [paused, loop, cardW, go]);

  const step = cardW + gap;
  const btnClass =
    "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-slate-300 text-slate-800 flex items-center justify-center hover:bg-[#3B9EFF] hover:text-white hover:border-[#3B9EFF] transition-colors shadow-sm";

  if (!n) {
    return (
      <p className="text-sm text-slate-500 py-8 text-center">
        尚無實體商品，請於 Medusa 建立並設為「實體」類型／分類後重新整理。
      </p>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {loop ? (
        <>
          <button
            type="button"
            onClick={() => {
              if (index === 0) {
                setAnimating(false);
                setIndex(n);
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    setAnimating(true);
                    setIndex(n - 1);
                  });
                });
              } else {
                go(-1);
              }
            }}
            aria-label="上一頁"
            className={`${btnClass} left-0 -translate-x-3`}
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={() => go(1)}
            aria-label="下一頁"
            className={`${btnClass} right-0 translate-x-3`}
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2} />
          </button>
        </>
      ) : null}

      <div ref={viewportRef} className="overflow-hidden">
        <div
          className="flex"
          style={{
            gap,
            transform: cardW ? `translateX(-${index * step}px)` : undefined,
            transition: animating
              ? "transform 0.45s cubic-bezier(0.25, 0.1, 0.25, 1)"
              : "none",
          }}
        >
          {slides.map((p) => (
            <div
              key={p._key}
              className="shrink-0"
              style={{ width: cardW || "calc(50% - 8px)" }}
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage({
  mustHaveNew = null,
  mustHaveBestsellers = null,
}) {
  const [tab, setTab] = useState("new");
  const [liveTabs, setLiveTabs] = useState(() => ({
    new: Array.isArray(mustHaveNew) ? mustHaveNew : [],
    bestsellers: Array.isArray(mustHaveBestsellers)
      ? mustHaveBestsellers
      : [],
  }));

  // ISR 已帶入資料；背景輕量更新，不覆蓋成空陣列
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/shop/selections?limit=24");
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok || !data.success) return;
        setLiveTabs((prev) => ({
          new:
            Array.isArray(data.new) && data.new.length ? data.new : prev.new,
          bestsellers:
            Array.isArray(data.bestsellers) && data.bestsellers.length
              ? data.bestsellers
              : prev.bestsellers,
        }));
      } catch {
        /* 保留 ISR 資料 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const products = liveTabs[tab] || [];
  const seoProducts =
    (liveTabs.new?.length ? liveTabs.new : liveTabs.bestsellers) || [];
  const seo = buildShopIndexSeo(seoProducts);

  return (
    <>
      <SeoHead {...seo} />

      <ShopNavbar utilityNav={[]} utilityEnd={null} />

      <main className="bg-[#DFE0E5]">
        {/* ── Hero：單圖滿屏，點擊進入商品內頁 ── */}
        <section className="relative w-full h-[100vh] overflow-hidden bg-slate-100">
          <Link href={PRODUCT_PDP} className="absolute inset-0 block">
            <Image
              src="/images/shop/shop-hero-banner.png"
              alt="Jeko 商城 — 旅行配件與出國必備"
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
          <h1 className="text-[24px] sm:text-[28px] font-bold text-slate-900 mb-5">
            Must-Have Jeko Selections
          </h1>

          <div className="flex items-center gap-2 mb-6" role="tablist" aria-label="精選商品分類">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "new"}
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
              role="tab"
              aria-selected={tab === "bestsellers"}
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

        {/* ── Section 2b：Travel Gear 精選輪播 ── */}
        <section className={`${CONTAINER} pb-10 sm:pb-14`}>
          <h2 className="text-[24px] sm:text-[28px] font-bold text-slate-900 mb-5">
            Travel Gear Essentials
          </h2>
          <ProductCarousel products={TRAVEL_GEAR} />
        </section>

        {/* ── Section 3：Discover More Banner ── */}
        <section className={`${CONTAINER} pb-14 sm:pb-20`}>
          <h2 className="text-[24px] sm:text-[28px] font-bold text-slate-900 mb-6">
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
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center items-start px-8 sm:px-14 gap-2">
              <h3 className="text-white text-[24px] sm:text-[28px] font-bold leading-tight">
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

      <ShopCartSidebar />
    </>
  );
}

export async function getStaticProps() {
  try {
    const selections = await fetchShopMustHaveSelections({ limit: 24 });
    return {
      props: {
        mustHaveNew: selections.new || [],
        mustHaveBestsellers: selections.bestsellers || [],
      },
      revalidate: SHOP_REVALIDATE_SEC,
    };
  } catch (err) {
    console.error("[shop] Must-Have Medusa fetch:", err?.message || err);
    return {
      props: {
        mustHaveNew: [],
        mustHaveBestsellers: [],
      },
      revalidate: 60,
    };
  }
}

