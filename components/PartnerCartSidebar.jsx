import Link from "next/link";
import { useCart } from "@/components/context/CartContext";
import {
  ShoppingBagIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function PartnerCartSidebar({ storeDomain }) {
  // 從 Context 取得購物車狀態與操作函式（夥伴站只賣 eSIM）
  const {
    esimItems,
    esimCount,
    esimTotal,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
  } = useCart();

  const cartItems = esimItems || [];
  const cartItemCount = esimCount || 0;
  const cartTotal = esimTotal || 0;

  return (
    <div
      className={`fixed inset-0 z-[200] transition-opacity duration-300 ${
        isCartOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* 🌟 背景灰黑遮罩 (點擊可關閉側邊欄) */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      {/* 🌟 右側滑出面板 */}
      <div
        className={`absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* --- Header 頂部區塊 --- */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ShoppingBagIcon className="w-6 h-6 text-[#0064e0]" />
            購物車 ({cartItemCount})
          </h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-gray-400 hover:text-slate-800 transition bg-gray-50 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* --- Cart Items 購物車商品列表 --- */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {cartItems?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center mt-20">
              <ShoppingBagIcon className="w-20 h-20 text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium mb-4">
                您的購物車目前是空的
              </p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-[#0064e0] font-bold hover:underline px-6 py-2 bg-blue-50 rounded-full"
              >
                繼續選購商品
              </button>
            </div>
          ) : (
            cartItems?.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="flex gap-4 border-b border-gray-50 pb-5 last:border-0 last:pb-0 relative group"
              >
                {/* 移除按鈕 */}
                <button
                  onClick={() => removeFromCart(item.id, item.color, item.size)}
                  className="absolute -top-1 -right-1 p-1.5 bg-white text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shadow-sm opacity-0 group-hover:opacity-100 border border-gray-100"
                  title="移除商品"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>

                <img
                  src={
                    item.image ||
                    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800"
                  }
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-xl border border-gray-100"
                />

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 leading-tight pr-6">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-1.5 font-medium bg-gray-50 inline-block px-2 py-0.5 rounded">
                      {item.color} / {item.size}
                    </p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-[15px] font-black text-[#0064e0]">
                      NT$ {item.price}
                    </span>
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                      數量: {item.quantity}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- Footer & Checkout 底部結帳區塊 --- */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/80">
          <div className="flex justify-between items-end mb-5">
            <span className="font-bold text-gray-500 text-sm">小計金額</span>
            <span className="text-2xl font-black text-slate-800">
              <span className="text-sm text-gray-400 mr-1">NT$</span>
              {cartTotal}
            </span>
          </div>

          <Link
            href={`/p/${storeDomain}/cart`}
            onClick={() => setIsCartOpen(false)}
            className={`block w-full text-center text-white font-bold py-4 rounded-xl transition shadow-md ${
              cartItems?.length === 0
                ? "bg-gray-300 pointer-events-none"
                : "bg-[#0064e0] hover:bg-[#0054bd]"
            }`}
          >
            前往結帳頁面
          </Link>
        </div>
      </div>
    </div>
  );
}
