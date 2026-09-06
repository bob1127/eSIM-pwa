"use client";

import { useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useCart } from "@/components/context/CartContext";
import {
  ShoppingBagIcon,
  TrashIcon,
  XMarkIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

function CartItem({ item, onRemove, onIncrease, onDecrease }) {
  const displayPrice = `NT$ ${(item.price * item.quantity).toLocaleString()}`;

  return (
    <div className="flex gap-3 py-4 border-b border-gray-100 last:border-0">
      <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
        <Image
          src={item.image || "/images/default-image.jpg"}
          alt={item.name}
          fill
          className="object-cover"
          sizes="64px"
          onError={(e) => {
            e.currentTarget.src = "/images/default-image.jpg";
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-[12px] font-semibold text-slate-800 leading-tight line-clamp-2">
            {item.name}
          </p>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="shrink-0 inline-flex items-center justify-center p-1 text-slate-400 transition-colors hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 rounded"
            title="移除商品"
            aria-label={`移除 ${item.name}`}
          >
            <TrashIcon className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
        {item.specLabel && item.specLabel !== "未指定規格" && (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate pr-9">
            {item.specLabel}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 border border-gray-200 rounded-full overflow-hidden">
            <button
              type="button"
              onClick={() => onDecrease(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
            >
              <PlusIcon className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[13px] font-bold text-slate-800">{displayPrice}</p>
        </div>
      </div>
    </div>
  );
}

/** 商城側欄：只顯示實體商品 */
export default function ShopCartSidebar() {
  const {
    physicalItems,
    physicalTotal,
    physicalCount,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
  } = useCart();
  const router = useRouter();

  const items = physicalItems || [];
  const totalCount = physicalCount || 0;
  const displayTotal = `NT$ ${(physicalTotal || 0).toLocaleString()}`;

  const handleCheckout = useCallback(() => {
    setIsCartOpen(false);
    router.push("/checkout/shop");
  }, [router, setIsCartOpen]);

  return (
    <div
      className={`fixed inset-0 z-[9000] ${isCartOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-modal="true"
      role="dialog"
      aria-label="購物車"
    >
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          isCartOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      <div
        className={`absolute top-0 right-0 h-full w-full max-w-[400px] bg-white shadow-2xl flex flex-col transform transition-transform duration-200 ease-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBagIcon className="w-5 h-5 text-[#3B9EFF]" />
            購物車
            {totalCount > 0 && (
              <span className="ml-1 text-[11px] font-bold bg-[#3B9EFF] text-white rounded-full w-5 h-5 flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 text-gray-400 hover:text-slate-700 hover:bg-gray-100 rounded-full transition-colors"
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
                onClick={() => setIsCartOpen(false)}
                className="text-[#3B9EFF] text-sm font-bold hover:underline"
              >
                繼續選購
              </button>
            </div>
          ) : (
            items.map((item, idx) => (
              <CartItem
                key={`${item.id}-${idx}`}
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

        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">小計</span>
              <span className="text-base font-bold text-slate-800">
                {displayTotal}
              </span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full py-3 bg-[#3B9EFF] hover:bg-[#2B8EEF] text-white font-bold text-sm rounded-xl transition-colors"
            >
              前往結帳
            </button>
            <p className="text-[11px] text-center text-slate-400">
              運費、折扣碼於結帳頁計算（不含 eSIM）
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
