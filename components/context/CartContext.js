"use client";

import { createContext, useState, useContext, useEffect, useMemo, useCallback } from "react";

const CartContext = createContext();

// ── localStorage keys ──────────────────────────────────────────
const LOCAL_CART_KEY  = "local_cart_items";
const CART_ID_KEY     = "medusa_cart_id";
const PUBLISHABLE_KEY_ENV = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const MEDUSA_URL_ENV  = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

// ── localStorage helpers ───────────────────────────────────────
const readLocal = () => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LOCAL_CART_KEY) || "[]"); }
  catch { return []; }
};

const writeLocal = (items) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
};

// ── normalise incoming product into a cart item ────────────────
const normalizeItem = (product) => {
  const variantId =
    product.variant_id || product.variantId || product.id || String(Date.now());
  const specLabel =
    product.specLabel ||
    product.options ||
    [product.telecom, product.days, product.data_amount].filter(Boolean).join(" · ") ||
    "";
  return {
    id:         variantId,
    variant_id: variantId,
    name:       product.name || product.title || "商品",
    price:      Number(product.price) || 0,
    quantity:   Math.max(1, Number(product.quantity) || 1),
    image:      product.image || product.thumbnail || "/images/default-image.jpg",
    specLabel:  specLabel || "未指定規格",
    options:    specLabel,
    color:      specLabel,
    size:       "",
    type:       product.type || "physical",
  };
};

// ── Medusa helpers (silent – never block UI) ───────────────────
const medusaHeaders = () => ({
  "Content-Type": "application/json",
  ...(PUBLISHABLE_KEY_ENV && { "x-publishable-api-key": PUBLISHABLE_KEY_ENV }),
});

const tryMedusaAddItem = async (cartId, variantId, qty, specLabel, itemType) => {
  try {
    await fetch(`${MEDUSA_URL_ENV}/store/carts/${cartId}/line-items`, {
      method: "POST",
      headers: medusaHeaders(),
      body: JSON.stringify({
        variant_id: variantId,
        quantity: qty,
        metadata: { spec_label: specLabel, options: specLabel, type: itemType },
      }),
    });
  } catch { /* silent */ }
};

const tryMedusaRemoveItem = async (cartId, lineItemId) => {
  try {
    await fetch(`${MEDUSA_URL_ENV}/store/carts/${cartId}/line-items/${lineItemId}`, {
      method: "DELETE",
      headers: medusaHeaders(),
    });
  } catch { /* silent */ }
};

const tryMedusaUpdateQty = async (cartId, lineItemId, qty) => {
  try {
    await fetch(`${MEDUSA_URL_ENV}/store/carts/${cartId}/line-items/${lineItemId}`, {
      method: "POST",
      headers: medusaHeaders(),
      body: JSON.stringify({ quantity: qty }),
    });
  } catch { /* silent */ }
};

// ── Provider ───────────────────────────────────────────────────
export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems]   = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartId, setCartId]         = useState(null);   // Medusa cart id (optional)
  const [hydrated, setHydrated]     = useState(false);

  // ① Hydrate from localStorage on mount
  useEffect(() => {
    const saved = readLocal();
    if (saved.length) setCartItems(saved);
    setHydrated(true);

    // Try to init Medusa cart in background (don't block)
    const initMedusa = async () => {
      const storedId = localStorage.getItem(CART_ID_KEY);
      if (storedId) {
        try {
          const res = await fetch(
            `${MEDUSA_URL_ENV}/store/carts/${storedId}`,
            { headers: medusaHeaders() },
          );
          if (res.ok) {
            const { cart } = await res.json();
            if (!cart?.completed_at) {
              setCartId(storedId);
              return;
            }
          }
        } catch { /* Medusa offline – that's ok */ }
        localStorage.removeItem(CART_ID_KEY);
      }
      // Try create a new cart silently
      try {
        const res = await fetch(`${MEDUSA_URL_ENV}/store/carts`, {
          method: "POST",
          headers: medusaHeaders(),
        });
        if (res.ok) {
          const { cart } = await res.json();
          setCartId(cart.id);
          localStorage.setItem(CART_ID_KEY, cart.id);
        }
      } catch { /* Medusa offline – ignore */ }
    };
    initMedusa();
  }, []);

  // ② Persist to localStorage whenever items change (after hydration)
  useEffect(() => {
    if (hydrated) writeLocal(cartItems);
  }, [cartItems, hydrated]);

  // ── totalPrice ─────────────────────────────────────────────
  const totalPrice = useMemo(
    () => cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
    [cartItems],
  );

  // ── addToCart (LOCAL FIRST)
  // options.open === false → 不開側邊欄（給「立即購買」導向結帳用）
  const addToCart = useCallback((product, options = {}) => {
    const item = normalizeItem(product);

    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.variant_id === item.variant_id);
      let next;
      if (idx >= 0) {
        next = prev.map((i, n) =>
          n === idx ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      } else {
        next = [...prev, item];
      }
      return next;
    });

    if (options.open !== false) {
      setIsCartOpen(true);
    }

    // Background Medusa sync
    if (cartId) {
      tryMedusaAddItem(cartId, item.variant_id, item.quantity, item.specLabel, item.type);
    }
  }, [cartId]);

  // ── removeFromCart (LOCAL FIRST) ──────────────────────────
  const removeFromCart = useCallback((idOrVariantId) => {
    setCartItems((prev) => {
      const next = prev.filter(
        (i) => i.id !== idOrVariantId && i.variant_id !== idOrVariantId,
      );
      return next;
    });

    // Background Medusa sync
    if (cartId) {
      tryMedusaRemoveItem(cartId, idOrVariantId);
    }
  }, [cartId]);

  // ── updateQuantity (LOCAL FIRST) ─────────────────────────
  const updateQuantity = useCallback((idOrVariantId, newQty) => {
    const qty = Math.max(1, Number(newQty) || 1);
    setCartItems((prev) =>
      prev.map((i) =>
        i.id === idOrVariantId || i.variant_id === idOrVariantId
          ? { ...i, quantity: qty }
          : i,
      ),
    );

    // Background Medusa sync
    if (cartId) {
      tryMedusaUpdateQty(cartId, idOrVariantId, qty);
    }
  }, [cartId]);

  // ── clearCart ─────────────────────────────────────────────
  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem(LOCAL_CART_KEY);
    localStorage.removeItem(CART_ID_KEY);
    setCartId(null);
    setIsCartOpen(false);
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartId,
        cartItems,
        totalPrice,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        isOpen: isCartOpen,
        setIsOpen: setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
