"use client";

import { useEffect, useState } from "react";
import { useCart } from "./context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const Sidebar = () => {
  const {
    cartItems,
    totalPrice,
    removeFromCart,
    updateQuantity,
    isOpen,
    setIsOpen,
  } = useCart();

  const [checkingOut, setCheckingOut] = useState(false);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleCheckout = () => {
    if (checkingOut) return;
    setCheckingOut(true);
    setIsOpen(false);
    window.location.href = "/Cart";
    setTimeout(() => setCheckingOut(false), 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="sidebar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999999]"
        >
          <div
            className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"
            onClick={toggleSidebar}
          />

          <motion.div
            className="absolute right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-2xl border-l border-gray-200 z-[9999999] flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold">購物車</h2>
              <button onClick={toggleSidebar} aria-label="關閉購物車">
                <svg className="w-6 h-6 text-gray-600 hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {cartItems.length === 0 ? (
                <p className="p-5 text-center text-gray-500">您的購物車是空的</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {cartItems.map((item, index) => (
                    <li key={item.id || index} className="flex px-4 py-4 gap-4">
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <Image
                          src={item.image || "/default-image.jpg"}
                          alt={item.name}
                          fill
                          className="object-cover rounded"
                        />
                      </div>

                      <div className="flex flex-col justify-between flex-1 text-sm text-right">
                        <div className="space-y-1">
                          <p className="font-semibold break-words text-left">{item.name}</p>
                          {/* 移除了舊的 color 和 size */}
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-bold text-slate-800">NT${item.price}</p>
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-2 border rounded text-gray-600"
                            >
                              -
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-2 border rounded text-gray-600"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-xs text-red-500 hover:underline mt-2 block w-full text-right"
                          >
                            刪除
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4">
              <p className="text-right text-base font-semibold mb-4 text-slate-900">總計: NT${totalPrice}</p>
              <button
                onClick={handleCheckout}
                disabled={cartItems.length === 0 || checkingOut}
                className={`block w-full text-center py-3 font-bold rounded-xl transition ${
                  cartItems.length === 0 || checkingOut
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {checkingOut ? "處理中…" : "前往結帳"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;