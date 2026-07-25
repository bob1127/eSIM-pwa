"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { useCart } from "@/components/context/CartContext";

function formatPrice(n) {
  return `NT$${Number(n || 0).toLocaleString()}`;
}

function toCartItem(product, qty = 1) {
  return {
    id: product.id || product.href || product.title,
    variant_id: product.id || product.href || product.title,
    name: product.title,
    title: product.title,
    price: product.price,
    quantity: qty,
    image: product.img,
    type: "physical",
  };
}

function ShopQuickView({ product, onClose }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  const gallery = useMemo(() => {
    const raw =
      product.images?.length > 0
        ? product.images
        : [product.img, product.img].filter(Boolean);
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
    setImgIdx(0);
    setQty(1);
  }, [product?.id]);

  useEffect(() => {
    if (gallery.length <= 1) return undefined;
    const t = setInterval(() => {
      setImgIdx((i) => (i + 1) % gallery.length);
    }, 2800);
    return () => clearInterval(t);
  }, [gallery.length, product?.id]);

  if (!product) return null;

  const save = product.original ? product.original - product.price : 0;

  const modal = (
    <div
      className="fixed inset-0 z-[2147483646] flex items-center justify-center p-4"
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

        <div className="relative aspect-square bg-[#F5F5F5]">
          {gallery.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className={`absolute inset-0 transition-opacity duration-500 ${
                i === imgIdx ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${product.title} ${i + 1}`}
                className="absolute inset-0 h-full w-full object-contain p-10"
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
            <span className="text-2xl font-bold text-slate-900">
              {formatPrice(product.price)}
            </span>
            {product.original ? (
              <del className="text-[13px] text-slate-400">
                {formatPrice(product.original)}
              </del>
            ) : null}
            {save > 0 ? (
              <span className="text-[11px] font-bold text-orange-600">
                省 {formatPrice(save)}
              </span>
            ) : null}
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
                addToCart(toCartItem(product, qty));
                onClose?.();
              }}
              className="py-3 text-center text-[13px] font-bold bg-[#E5E7EB] text-slate-800 hover:bg-[#D1D5DB] transition-colors"
            >
              加入購物車
            </button>
            <button
              type="button"
              onClick={() => {
                addToCart(toCartItem(product, qty), { open: false });
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

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

function ShopMiniCard({ product, onDetail }) {
  const router = useRouter();
  const { addToCart } = useCart();

  const handleBuyNow = (e) => {
    e.stopPropagation();
    addToCart(toCartItem(product, 1), { open: false });
    router.push("/checkout/shop");
  };

  return (
    <div className="bg-white flex flex-col h-full w-[176px] shrink-0 border border-slate-100 shadow-sm">
      <button
        type="button"
        onClick={() => onDetail?.(product)}
        className="relative aspect-square bg-white overflow-hidden block w-full text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.img}
          alt={product.title}
          className="absolute inset-0 h-full w-full object-contain p-4"
        />
      </button>
      <div className="px-2.5 pb-2.5 flex flex-col flex-1">
        <button
          type="button"
          onClick={() => onDetail?.(product)}
          className="text-left"
        >
          <h3 className="text-[12px] font-bold text-slate-900 leading-snug line-clamp-2 min-h-[36px]">
            {product.title}
          </h3>
        </button>
        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
          {product.desc}
        </p>
        <div className="flex items-baseline gap-1.5 mt-1.5 mb-2">
          <span className="text-[12px] font-bold text-slate-900">
            {formatPrice(product.price)}
          </span>
          {product.original ? (
            <del className="text-[10px] text-slate-400">
              {formatPrice(product.original)}
            </del>
          ) : null}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={handleBuyNow}
            className="text-center text-[10px] font-semibold bg-[#3B9EFF] text-white py-2 hover:bg-[#2B8EEF] transition-colors"
          >
            立即購買
          </button>
          <button
            type="button"
            onClick={() => onDetail?.(product)}
            className="text-center text-[10px] font-semibold bg-[#E5E7EB] text-slate-800 py-2 hover:bg-[#D1D5DB] transition-colors"
          >
            商品詳情
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShopChatOffers({ items }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(null);
  const list = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!list.length) return null;

  const scroll = (dir) => {
    trackRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <div className="mt-2 -mx-0.5">
      <p className="text-[10px] text-slate-400 mb-1.5">Jeko 商城推薦</p>
      <div className="relative">
        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => scroll(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 border border-slate-200 rounded-full p-0.5 shadow-sm"
              aria-label="上一張"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 border border-slate-200 rounded-full p-0.5 shadow-sm"
              aria-label="下一張"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </>
        )}
        <div
          ref={trackRef}
          className="flex gap-2 overflow-x-auto scroll-smooth pb-1 px-0.5"
          style={{ scrollbarWidth: "none" }}
        >
          {list.map((p) => (
            <ShopMiniCard
              key={p.id || p.title}
              product={p}
              onDetail={setActive}
            />
          ))}
        </div>
      </div>
      {active ? (
        <ShopQuickView product={active} onClose={() => setActive(null)} />
      ) : null}
    </div>
  );
}
