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

// ── 結帳路由邏輯 ──────────────────────────────────────────────────
// eSIM 虛擬商品 → /checkout
// 實體商品      → /checkout/shop（填資料 + 藍新金流）
// 混合          → 分別提示
const deriveCheckoutHref = (items) => {
  const types = new Set((items || []).map((i) => i.type || "physical"));
  if (types.size === 1) {
    return types.has("esim") ? "/checkout" : "/checkout/shop";
  }
  return null; // mixed
};

// ── 商品列 ──────────────────────────────────────────────────────
function CartItem({ item, onRemove, onIncrease, onDecrease }) {
  const isEsim = item.type === "esim";
  const displayPrice = `NT$ ${(item.price * item.quantity).toLocaleString()}`;

  return (
    <div className="flex gap-3 py-4 border-b border-gray-100 last:border-0 group relative">
      {/* 商品縮圖 */}
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

      {/* 商品資訊 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1 mb-0.5">
          {/* 商品類型標籤 */}

          <p className="text-[12px] font-semibold text-slate-800 leading-tight line-clamp-2">
            {item.name}
          </p>
        </div>
        {item.specLabel && item.specLabel !== "未指定規格" && (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {item.specLabel}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          {/* 數量控制 */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-full overflow-hidden">
            <button
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
              onClick={() => onIncrease(item.id, item.quantity + 1)}
              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-gray-100 transition-colors"
            >
              <PlusIcon className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[13px] font-bold text-slate-800">{displayPrice}</p>
        </div>
      </div>

      {/* 刪除按鈕 */}
      <button
        onClick={() => onRemove(item.id)}
        className="absolute top-4 right-0 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
        title="移除商品"
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── 主元件 ──────────────────────────────────────────────────────
export default function ShopCartSidebar() {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    totalPrice,
  } = useCart();
  const router = useRouter();

  const totalCount = (cartItems || []).reduce((s, i) => s + i.quantity, 0);

  const displayTotal = `NT$ ${totalPrice.toLocaleString()}`;

  const hasEsim = (cartItems || []).some((i) => i.type === "esim");
  const hasPhysical = (cartItems || []).some(
    (i) => !i.type || i.type === "physical",
  );
  const isMixed = hasEsim && hasPhysical;
  const checkoutHref = deriveCheckoutHref(cartItems);

  const handleCheckout = useCallback(
    (href) => {
      setIsCartOpen(false);
      router.push(href);
    },
    [router, setIsCartOpen],
  );

  return (
    <div
      className={`fixed inset-0 z-[9000] ${isCartOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-modal="true"
      role="dialog"
      aria-label="購物車"
    >
      {/* 背景遮罩：淡入淡出 */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          isCartOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      {/* 側邊面板：從右滑入，duration 縮短 */}
      <div
        className={`absolute top-0 right-0 h-full w-full max-w-[400px] bg-white shadow-2xl flex flex-col transform transition-transform duration-200 ease-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
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

        {/* 混合商品提示 */}
        {isMixed && (
          <div className="mx-5 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700 leading-relaxed">
            購物車中同時含有 <span className="font-bold">eSIM 虛擬商品</span> 與{" "}
            <span className="font-bold">實體商品</span>，請分開結帳。
          </div>
        )}

        {/* ── 商品列表 ── */}
        <div className="flex-1 overflow-y-auto px-5">
          {!cartItems || cartItems.length === 0 ? (
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
            cartItems.map((item, idx) => (
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

        {/* ── Footer ── */}
        {cartItems && cartItems.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-white">
            {/* 合計 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">小計</span>
              <span className="text-base font-black text-slate-800">
                {displayTotal}
              </span>
            </div>

            {/* 結帳按鈕 */}
            {!isMixed ? (
              <button
                onClick={() => handleCheckout(checkoutHref)}
                className="w-full py-3 bg-[#3B9EFF] hover:bg-[#2B8EEF] text-white font-bold text-sm rounded-xl transition-colors"
              >
                {hasEsim ? "前往 eSIM 結帳" : "前往結帳"}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleCheckout("/checkout")}
                  className="w-full py-2.5 bg-[#3B9EFF] hover:bg-[#2B8EEF] text-white font-bold text-sm rounded-xl transition-colors"
                >
                  eSIM 結帳
                </button>
                <button
                  onClick={() => handleCheckout("/checkout/payment")}
                  className="w-full py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors"
                >
                  實體商品結帳
                </button>
              </div>
            )}

            <p className="text-[11px] text-center text-slate-400">
              運費、折扣碼於結帳頁計算
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
