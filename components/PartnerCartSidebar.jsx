"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback } from "react";
import { useCart } from "@/components/context/CartContext";
import {
  ShoppingBagIcon,
  TrashIcon,
  XMarkIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

function CartItem({ item, onRemove, onIncrease, onDecrease }) {
  const displayPrice = `NT$ ${(
    Number(item.price || 0) * Number(item.quantity || 1)
  ).toLocaleString()}`;
  const spec =
    item.specLabel && item.specLabel !== "未指定規格" ? item.specLabel : null;

  return (
    <div className="flex gap-3 py-4 border-b border-gray-100 last:border-0 group relative">
      <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
        <Image
          src={item.image || "/images/jeko-esim.png"}
          alt={item.name || "eSIM"}
          fill
          className="object-cover"
          sizes="64px"
          onError={(e) => {
            e.currentTarget.src = "/images/jeko-esim.png";
          }}
        />
      </div>

      <div className="flex-1 min-w-0 pr-6">
        <p className="text-[12px] font-semibold text-slate-800 leading-tight line-clamp-2">
          {item.name}
        </p>
        {spec ? (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{spec}</p>
        ) : null}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 border border-gray-200 rounded-full overflow-hidden">
            <button
              type="button"
              onClick={() => onDecrease(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="減少數量"
            >
              <MinusIcon className="w-3 h-3" />
            </button>
            <span className="text-[12px] font-medium text-slate-700 w-5 text-center">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onIncrease(item.id, item.quantity + 1)}
              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-gray-100 transition-colors"
              aria-label="增加數量"
            >
              <PlusIcon className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[13px] font-bold text-slate-800">{displayPrice}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="absolute top-4 right-0 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
        title="移除商品"
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** 夥伴賣場側欄：只顯示 eSIM（與主站 /shop 實體車分開） */
export default function PartnerCartSidebar({ storeDomain, storeId }) {
  const {
    esimItems,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
  } = useCart();

  const items = (() => {
    const all = esimItems || [];
    if (!storeId) return all;
    const sid = String(storeId);
    const matched = all.filter(
      (i) => !i.store_id || String(i.store_id) === sid,
    );
    return matched.length ? matched : all;
  })();
  const totalCount = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  const esimTotal = items.reduce(
    (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1),
    0,
  );
  const displayTotal = `NT$ ${esimTotal.toLocaleString()}`;
  const domain = String(storeDomain || "").trim();
  const cartHref = domain ? `/p/${domain}/cart/` : "/Cart";
  const continueHref = domain ? `/p/${domain}/` : "/";

  const handleClose = useCallback(() => setIsCartOpen(false), [setIsCartOpen]);

  return (
    <div
      className={`fixed inset-0 z-[9000] ${
        isCartOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-modal="true"
      role="dialog"
      aria-label="eSIM 購物車"
    >
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          isCartOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      <div
        className={`absolute top-0 right-0 h-full w-full max-w-[400px] bg-white shadow-2xl flex flex-col transform transition-transform duration-200 ease-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBagIcon className="w-5 h-5 text-[#3B9EFF]" />
            eSIM 購物車
            {totalCount > 0 && (
              <span className="ml-1 text-[11px] font-bold bg-[#3B9EFF] text-white rounded-full w-5 h-5 flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-slate-700 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="關閉購物車"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <ShoppingBagIcon className="w-16 h-16 text-gray-200 mb-3" />
              <p className="text-gray-400 font-medium text-sm mb-4">
                購物車是空的
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="text-[#3B9EFF] text-sm font-bold hover:underline"
              >
                繼續選購
              </button>
            </div>
          ) : (
            items.map((item, idx) => (
              <CartItem
                key={`${item.id}-${item.store_id || ""}-${idx}`}
                item={item}
                onRemove={removeFromCart}
                onIncrease={(id, qty) => updateQuantity(id, qty)}
                onDecrease={(id, qty) =>
                  qty >= 1 ? updateQuantity(id, qty) : removeFromCart(id)
                }
              />
            ))
          )}
        </div>

        {items.length > 0 ? (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">小計</span>
              <span className="text-base font-bold text-slate-800">
                {displayTotal}
              </span>
            </div>
            <Link
              href={cartHref}
              onClick={handleClose}
              className="block w-full py-3 text-center bg-[#3B9EFF] hover:bg-[#2B8EEF] text-white font-bold text-sm rounded-xl transition-colors"
            >
              前往結帳
            </Link>
            <Link
              href={continueHref}
              onClick={handleClose}
              className="block w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 py-1"
            >
              繼續選購
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
