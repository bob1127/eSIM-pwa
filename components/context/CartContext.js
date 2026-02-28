"use client";

import { createContext, useState, useContext, useEffect, useMemo } from "react";

const CartContext = createContext();

const LS_KEY = "cartItems";

// 安全讀取 localStorage
const readCartFromStorage = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// 安全寫入 localStorage
const writeCartToStorage = (items) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items ?? []));
  } catch {}
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => readCartFromStorage());
  const [isOpen, setIsOpen] = useState(false);

  // 依據 cartItems 計算總價
  const totalPrice = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return acc + price * qty;
    }, 0);
  }, [cartItems]);

  // 寫回 localStorage
  useEffect(() => {
    writeCartToStorage(cartItems);
  }, [cartItems]);

  // 跨分頁同步購物車
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_KEY) {
        setCartItems(readCartFromStorage());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // 🚀 加入購物車 (已適配 Supabase 資料結構)
  const addToCart = (product) => {
    const qtyToAdd = Number(product.quantity) || 1;

    // 建立標準化的購物車物件
    const newItem = {
      id: product.id,              // Supabase 的變體或產品 ID
      parentId: product.parentId,  // 關聯的主產品 ID (如果有)
      name: product.name,          // 組合好的名稱 (包含規格)
      price: product.price,
      sku: product.sku,            // 你的內部貨號
      planId: product.planId,      // 🚀 關鍵：直接儲存供應商的 API 代碼
      slug: product.slug || "",
      image: typeof product.image === 'string' ? product.image : "/default-image.jpg", 
      quantity: qtyToAdd,
    };

    setCartItems((prevItems) => {
      // 比對邏輯：如果是同一個 ID (同一個規格變體)，就增加數量
      const idx = prevItems.findIndex((item) => item.id === newItem.id);

      if (idx >= 0) {
        const copy = [...prevItems];
        const old = copy[idx];
        copy[idx] = { ...old, quantity: (Number(old.quantity) || 0) + qtyToAdd };
        return copy;
      }
      
      return [...prevItems, newItem];
    });

    setIsOpen(true);
  };

  // 移除品項
  const removeFromCart = (productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  };

  // 更新數量
  const updateQuantity = (productId, newQuantity) => {
    const next = Math.max(1, Number(newQuantity) || 1);
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity: next } : item
      )
    );
  };

  // 清空購物車
  const clearCart = () => {
    setCartItems([]);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    setIsOpen(false);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        totalPrice,
        isOpen,
        setIsOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);