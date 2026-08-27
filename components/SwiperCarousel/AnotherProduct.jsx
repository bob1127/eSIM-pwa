"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

function formatPrice(amount) {
  if (amount == null || Number(amount) <= 0) return "—";
  return `NT$${Math.round(Number(amount)).toLocaleString("zh-TW")}起`;
}

/**
 * 購物車頁：相關 eSIM 自動輪播（獨立區塊）
 */
export default function CartRelatedEsimCarousel({ cartItems = [] }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const queryKey = useMemo(() => {
    const categories = [
      ...new Set(cartItems.map((i) => i.categorySlug).filter(Boolean)),
    ].join(",");
    const exclude = [
      ...new Set(cartItems.map((i) => i.slug).filter(Boolean)),
    ].join(",");
    return `${categories}|${exclude}`;
  }, [cartItems]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const categories = [
      ...new Set(cartItems.map((i) => i.categorySlug).filter(Boolean)),
    ].join(",");
    const exclude = [
      ...new Set(cartItems.map((i) => i.slug).filter(Boolean)),
    ].join(",");

    const params = new URLSearchParams();
    if (categories) params.set("categories", categories);
    if (exclude) params.set("exclude", exclude);

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
          依購物車目的地推薦相關 eSIM
        </p>
      </div>

      <Swiper
        modules={[Autoplay, Pagination]}
        spaceBetween={14}
        slidesPerView={1.35}
        loop={products.length > 2}
        autoplay={
          products.length > 1
            ? {
                delay: 3500,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }
            : false
        }
        pagination={{ clickable: true }}
        breakpoints={{
          480: { slidesPerView: 2, spaceBetween: 14 },
          768: { slidesPerView: 2.5, spaceBetween: 16 },
          1024: { slidesPerView: 3, spaceBetween: 18 },
          1280: { slidesPerView: 4, spaceBetween: 20 },
        }}
        className="cart-related-esim-swiper pb-10"
      >
        {products.map((p) => (
          <SwiperSlide key={p.id} className="!h-auto">
            <Link
              href={p.href}
              className="group flex h-[220px] flex-col border border-slate-200 bg-[#f7f8fa] transition hover:border-[#1E4AD1]/40 hover:bg-white"
            >
              <div className="flex h-[88px] shrink-0 items-center justify-center border-b border-slate-100 bg-white px-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image || "/images/jeko-esim.png"}
                  alt=""
                  className="h-14 w-14 object-contain"
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
                <p className="line-clamp-2 min-h-[2.5rem] text-[13px] font-bold leading-snug text-slate-900 group-hover:text-[#1E4AD1]">
                  {p.name}
                </p>
                <p className="mt-1 line-clamp-2 min-h-[2rem] text-[11px] leading-snug text-slate-500">
                  {p.subtitle || "\u00A0"}
                </p>
                <p className="mt-auto pt-2 text-[14px] font-black tabular-nums text-[#0071EB]">
                  {formatPrice(p.minPrice)}
                </p>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>

      <style jsx global>{`
        .cart-related-esim-swiper .swiper-pagination {
          bottom: 0 !important;
        }
        .cart-related-esim-swiper .swiper-pagination-bullet {
          background: #cbd5e1;
          opacity: 1;
        }
        .cart-related-esim-swiper .swiper-pagination-bullet-active {
          background: #1e4ad1;
        }
      `}</style>
    </div>
  );
}
