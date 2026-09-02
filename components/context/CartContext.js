"use client";

import {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { checkPlanAvailableClient } from "../../lib/esim/checkPlanClient";

const CartContext = createContext();

export const CART_TYPE_ESIM = "esim";
export const CART_TYPE_PHYSICAL = "physical";

const LOCAL_CART_KEY = "local_cart_items";
const CART_ID_KEY = "medusa_cart_id";
const PUBLISHABLE_KEY_ENV = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const MEDUSA_URL_ENV =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

export function isEsimItem(item) {
  return String(item?.type || "") === CART_TYPE_ESIM;
}

export function isPhysicalItem(item) {
  if (isEsimItem(item)) return false;
  if (item?.planId || item?.plan_id) return false;
  return true;
}

function inferType(product) {
  if (product?.type === CART_TYPE_ESIM || product?.type === CART_TYPE_PHYSICAL) {
    return product.type;
  }
  if (product?.planId || product?.plan_id || product?.parentId) {
    return CART_TYPE_ESIM;
  }
  return CART_TYPE_PHYSICAL;
}

function migrateItemType(item) {
  if (item?.type === CART_TYPE_ESIM || item?.type === CART_TYPE_PHYSICAL) {
    return item;
  }
  return { ...item, type: inferType(item) };
}

const readLocal = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_CART_KEY) || "[]");
    return (Array.isArray(raw) ? raw : []).map(migrateItemType);
  } catch {
    return [];
  }
};

const writeLocal = (items) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
};

const normalizeItem = (product) => {
  const variantId =
    product.variant_id || product.variantId || product.id || String(Date.now());
  const specLabel =
    product.specLabel ||
    product.options ||
    [product.telecom, product.days, product.data_amount]
      .filter(Boolean)
      .join(" · ") ||
    "";
  const type = inferType(product);
  return {
    id: variantId,
    variant_id: variantId,
    name: product.name || product.title || "商品",
    price: Number(product.price) || 0,
    quantity: Math.max(1, Number(product.quantity) || 1),
    image: product.image || product.thumbnail || "/images/jeko-esim.png",
    slug: product.slug || product.handle || null,
    categorySlug: product.categorySlug || product.category || null,
    href:
      product.href ||
      (product.categorySlug && (product.slug || product.handle)
        ? `/product/${product.categorySlug}/${product.slug || product.handle}`
        : product.slug || product.handle
          ? `/product/${product.slug || product.handle}`
          : null),
    specLabel: specLabel || "未指定規格",
    options: specLabel,
    color: product.color || specLabel,
    size: product.size || "",
    type,
    planId: product.planId || product.plan_id || null,
    parentId: product.parentId || null,
    sku: product.sku || null,
    store_id: product.store_id || null,
  };
};

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
  } catch {
    /* silent */
  }
};

const tryMedusaRemoveItem = async (cartId, idOrVariantId) => {
  try {
    const lineItemId = await resolveMedusaLineItemId(cartId, idOrVariantId);
    if (!lineItemId) return;
    await fetch(
      `${MEDUSA_URL_ENV}/store/carts/${cartId}/line-items/${lineItemId}`,
      { method: "DELETE", headers: medusaHeaders() },
    );
  } catch {
    /* silent */
  }
};

const resolveMedusaLineItemId = async (cartId, idOrVariantId) => {
  const key = String(idOrVariantId || "");
  if (!key) return null;
  try {
    const res = await fetch(`${MEDUSA_URL_ENV}/store/carts/${cartId}`, {
      headers: medusaHeaders(),
    });
    if (!res.ok) return null;
    const { cart } = await res.json();
    const line = (cart?.items || []).find(
      (i) =>
        i.id === key ||
        i.variant_id === key ||
        i.variant?.id === key,
    );
    return line?.id || null;
  } catch {
    return null;
  }
};

const tryMedusaUpdateQty = async (cartId, idOrVariantId, qty) => {
  try {
    const lineItemId = await resolveMedusaLineItemId(cartId, idOrVariantId);
    if (!lineItemId) return;
    await fetch(
      `${MEDUSA_URL_ENV}/store/carts/${cartId}/line-items/${lineItemId}`,
      {
        method: "POST",
        headers: medusaHeaders(),
        body: JSON.stringify({ quantity: qty }),
      },
    );
  } catch {
    /* silent */
  }
};

function sumItems(items) {
  return (items || []).reduce((s, i) => s + i.price * i.quantity, 0);
}

function countItems(items) {
  return (items || []).reduce((s, i) => s + i.quantity, 0);
}

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartId, setCartId] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readLocal();
    if (saved.length) setCartItems(saved);
    setHydrated(true);

    const initMedusa = async () => {
      const storedId = localStorage.getItem(CART_ID_KEY);
      if (storedId) {
        try {
          const res = await fetch(`${MEDUSA_URL_ENV}/store/carts/${storedId}`, {
            headers: medusaHeaders(),
          });
          if (res.ok) {
            const { cart } = await res.json();
            if (!cart?.completed_at) {
              setCartId(storedId);
              return;
            }
          }
        } catch {
          /* offline */
        }
        localStorage.removeItem(CART_ID_KEY);
      }
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
      } catch {
        /* ignore */
      }
    };
    initMedusa();
  }, []);

  useEffect(() => {
    if (hydrated) writeLocal(cartItems);
  }, [cartItems, hydrated]);

  const esimItems = useMemo(
    () => (cartItems || []).filter(isEsimItem),
    [cartItems],
  );
  const physicalItems = useMemo(
    () => (cartItems || []).filter(isPhysicalItem),
    [cartItems],
  );

  const totalPrice = useMemo(() => sumItems(cartItems), [cartItems]);
  const esimTotal = useMemo(() => sumItems(esimItems), [esimItems]);
  const physicalTotal = useMemo(() => sumItems(physicalItems), [physicalItems]);
  const esimCount = useMemo(() => countItems(esimItems), [esimItems]);
  const physicalCount = useMemo(
    () => countItems(physicalItems),
    [physicalItems],
  );

  const addToCart = useCallback(async (product, options = {}) => {
    const item = normalizeItem(product);

    // 所有 eSIM：加入前一律對供應商目錄核對（幽靈／下架／家族錯位）
    if (isEsimItem(item)) {
      const check = await checkPlanAvailableClient({
        sku: item.sku,
        planId: item.planId,
        name: item.name,
      });
      if (!check.ok) {
        if (typeof window !== "undefined") {
          window.alert(check.message || "商品已完售");
        }
        return false;
      }
    }

    setCartItems((prev) => {
      const idx = prev.findIndex(
        (i) =>
          i.variant_id === item.variant_id &&
          i.type === item.type &&
          String(i.store_id || "") === String(item.store_id || ""),
      );
      if (idx >= 0) {
        return prev.map((i, n) =>
          n === idx ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      }
      return [...prev, item];
    });

    if (options.open !== false) setIsCartOpen(true);

    if (cartId) {
      tryMedusaAddItem(
        cartId,
        item.variant_id,
        item.quantity,
        item.specLabel,
        item.type,
      );
    }
    return true;
  }, [cartId]);

  const removeFromCart = useCallback(
    (idOrVariantId) => {
      setCartItems((prev) =>
        prev.filter(
          (i) => i.id !== idOrVariantId && i.variant_id !== idOrVariantId,
        ),
      );
      if (cartId) tryMedusaRemoveItem(cartId, idOrVariantId);
    },
    [cartId],
  );

  const updateQuantity = useCallback(
    (idOrVariantId, newQty) => {
      const qty = Math.max(1, Number(newQty) || 1);
      setCartItems((prev) =>
        prev.map((i) =>
          i.id === idOrVariantId || i.variant_id === idOrVariantId
            ? { ...i, quantity: qty }
            : i,
        ),
      );
      if (cartId) tryMedusaUpdateQty(cartId, idOrVariantId, qty);
    },
    [cartId],
  );

  /** @param {'esim'|'physical'|'all'} [scope='all'] */
  const clearCart = useCallback((scope = "all") => {
    if (scope === CART_TYPE_ESIM) {
      setCartItems((prev) => prev.filter(isPhysicalItem));
      return;
    }
    if (scope === CART_TYPE_PHYSICAL) {
      setCartItems((prev) => prev.filter(isEsimItem));
      return;
    }
    setCartItems([]);
    localStorage.removeItem(LOCAL_CART_KEY);
    localStorage.removeItem(CART_ID_KEY);
    setCartId(null);
    setIsCartOpen(false);
  }, []);

  /** LINE Pay 取消／幽靈 cart 後：建新 Medusa cart 並把本機 eSIM 品項同步上去 */
  const rebuildMedusaCartFromLocal = useCallback(async () => {
    localStorage.removeItem(CART_ID_KEY);
    setCartId(null);
    const localEsim = readLocal().filter(isEsimItem);
    try {
      const res = await fetch(`${MEDUSA_URL_ENV}/store/carts`, {
        method: "POST",
        headers: medusaHeaders(),
      });
      if (!res.ok) return false;
      const { cart } = await res.json();
      const newId = cart?.id;
      if (!newId) return false;
      localStorage.setItem(CART_ID_KEY, newId);
      setCartId(newId);
      for (const item of localEsim) {
        await tryMedusaAddItem(
          newId,
          item.variant_id,
          item.quantity,
          item.specLabel,
          item.type,
        );
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartId,
        cartItems,
        esimItems,
        physicalItems,
        totalPrice,
        esimTotal,
        physicalTotal,
        esimCount,
        physicalCount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        rebuildMedusaCartFromLocal,
        isCartOpen,
        setIsCartOpen,
        isOpen: isCartOpen,
        setIsOpen: setIsCartOpen,
        isEsimItem,
        isPhysicalItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
