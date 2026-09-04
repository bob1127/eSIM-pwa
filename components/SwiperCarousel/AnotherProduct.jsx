"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

function formatPrice(amount) {
  if (amount == null || Number(amount) <= 0) return "—";
  return `NT$${Math.round(Number(amount)).toLocaleString("zh-TW")}起`;
}

/** 從購物車列推 category（欄位或缺則從 /product/{cat}/{slug} 解析） */
function resolveCartCategorySlug(item) {
  const direct = String(item?.categorySlug || item?.category || "").trim();
  if (direct) return direct;
  const href = String(item?.href || "");
  const m = href.match(/\/product\/([^/]+)\/([^/?#]+)/i);
  if (m?.[1] && m[1].toLowerCase() !== "product") return m[1];
  return "";
}

function resolveCartProductSlug(item) {
  const direct = String(item?.slug || item?.handle || "").trim();
  if (direct) return direct;
  const href = String(item?.href || "");
  const m = href.match(/\/product\/[^/]+\/([^/?#]+)/i);
  return m?.[1] || "";
}

/**
 * 購物車頁：同分類 eSIM 自動輪播（無 pagination）
 */
export default function CartRelatedEsimCarousel({ cartItems = [] }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const queryKey = useMemo(() => {
    const categories = [
      ...new Set(cartItems.map(resolveCartCategorySlug).filter(Boolean)),
    ].join(",");
    const exclude = [
      ...new Set(cartItems.map(resolveCartProductSlug).filter(Boolean)),
    ].join(",");
    return `${categories}|${exclude}`;
  }, [cartItems]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const categories = [
      ...new Set(cartItems.map(resolveCartCategorySlug).filter(Boolean)),
    ].join(",");
    const exclude = [
      ...new Set(cartItems.map(resolveCartProductSlug).filter(Boolean)),
    ].join(",");

    const params = new URLSearchParams();
    if (categories) params.set("categories", categories);
    if (exclude) params.set("exclude", exclude);
    params.set("sameCategoryOnly", "1");

    fetch(`/api/cart/related-esim?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryKey, cartItems]);

  if (loading) {
    return (
      <LoadingIndicator layout="center" label="載入推薦方案…" className="py-10" />
    );
  }

  if (!products.length) return null;

  return (
    <div aria-label="相關 eSIM 推薦">
      <div className="mb-5 md:mb-6">
        <h2 className="text-lg md:text-xl font-bold text-slate-900">
          其他推薦好商品
        </h2>
        <p className="mt-1 text-[12px] md:text-[13px] text-slate-500">
          依購物車商品種類推薦相同分類 eSIM
        </p>
      </div>

      <Swiper
        modules={[Autoplay]}
        spaceBetween={12}
        slidesPerView={2.15}
        loop={products.length > 3}
        autoplay={
          products.length > 1
            ? {
                delay: 3500,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }
            : false
        }
        breakpoints={{
          480: { slidesPerView: 2.4, spaceBetween: 12 },
          768: { slidesPerView: 3.2, spaceBetween: 14 },
          1024: { slidesPerView: 4, spaceBetween: 16 },
          1280: { slidesPerView: 5, spaceBetween: 16 },
        }}
        className="cart-related-esim-swiper"
      >
        {products.map((p) => (
          <SwiperSlide key={p.id}>
            <Link
              href={p.href}
              className="group flex aspect-square flex-col overflow-hidden border border-slate-200 bg-[#f7f8fa] transition hover:border-[#1E4AD1]/40 hover:bg-white"
            >
              <div className="relative min-h-0 flex-[1.15] border-b border-slate-100 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image || "/images/jeko-esim.png"}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain p-3 md:p-4"
                />
              </div>

              <div className="flex shrink-0 flex-col px-2.5 py-2.5 md:px-3 md:py-3">
                <p className="line-clamp-2 text-[12px] md:text-[13px] font-bold leading-snug text-slate-900 group-hover:text-[#1E4AD1]">
                  {p.name}
                </p>
                {p.subtitle ? (
                  <p className="mt-0.5 line-clamp-1 text-[10px] md:text-[11px] leading-snug text-slate-500">
                    {p.subtitle}
                  </p>
                ) : null}
                <p className="mt-1.5 text-[13px] md:text-[14px] font-black tabular-nums text-[#0071EB]">
                  {formatPrice(p.minPrice)}
                </p>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
