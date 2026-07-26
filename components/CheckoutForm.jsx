"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useCart } from "./context/CartContext";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { buildLoginUrl } from "@/lib/authRedirect";
import {
  buildCheckoutAutofillPatches,
  mergeCheckoutForm,
  saveCheckoutProfile,
} from "@/lib/checkoutProfile";
import { supabase } from "@/lib/supabaseClient";

// --- Component: 浮動標籤輸入框 (Shopify 風格核心) ---
const FloatingInput = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  readOnly = false,
}) => (
  <div className="relative w-full">
    <input
      type={type}
      name={name}
      id={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`peer w-full border border-gray-300 rounded-md px-3 pt-5 pb-2 text-gray-900 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow ${
        readOnly ? "bg-slate-50 text-slate-700" : ""
      }`}
      required={required}
    />
    <label
      htmlFor={name}
      className="absolute left-3 top-1 text-xs text-gray-500 transition-all 
                 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 
                 peer-focus:top-1 peer-focus:text-xs peer-focus:text-blue-600 pointer-events-none"
    >
      {label}
    </label>
  </div>
);

// 🔥 終極防連點鎖（放在元件外部，確保全域絕對唯一，攔截零點幾秒內的雙重觸發）
let isSubmittingLock = false;

// 🌟 新增 hideSubmitButton 屬性
const CheckoutForm = ({ onBack, onNext, hideSubmitButton = false }) => {
  const router = useRouter();
  const { esimItems, cartId } = useCart();
  const cartItems = esimItems || [];
  const { user: supabaseUser, session, authReady, isLoggedIn } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autofillNote, setAutofillNote] = useState("");
  const touchedRef = useRef({});

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "Taiwan",
    city: "",
    address: "",
    postalCode: "",
    saveInfo: true,
    newsOffers: true,
  });

  const [memberInfo, setMemberInfo] = useState(null);

  // --- Effect: 社群 / Email 登入 + 本機儲存 → 自動帶入空白欄位 ---
  useEffect(() => {
    if (!authReady || typeof window === "undefined") return;

    let legacyLocalUser = null;
    try {
      const raw = localStorage.getItem("user");
      if (raw) legacyLocalUser = JSON.parse(raw);
    } catch {
      /* ignore */
    }

    const { identity, patches } = buildCheckoutAutofillPatches({
      supabaseUser,
      nextAuthUser: session?.user || null,
      legacyLocalUser,
    });

    if (identity?.id || identity?.email) {
      setMemberInfo({
        id: identity.id,
        name: identity.name,
        email: identity.email,
        phone: identity.phone,
        image: identity.image,
        source: identity.source,
      });
    } else if (!isLoggedIn) {
      setMemberInfo(null);
    }

    setFormData((prev) => {
      const safePatches = patches.map((patch) => {
        if (!patch) return patch;
        const next = { ...patch };
        for (const key of Object.keys(next)) {
          if (touchedRef.current[key]) delete next[key];
        }
        return next;
      });
      const merged = mergeCheckoutForm(prev, safePatches);
      if (merged !== prev) {
        const filled = ["email", "name", "phone", "address", "city"].filter(
          (k) => !String(prev[k] || "").trim() && String(merged[k] || "").trim(),
        );
        if (filled.length) {
          const via =
            identity.source === "nextauth"
              ? "LINE／社群登入"
              : identity.source === "supabase"
                ? "會員帳號"
                : "先前儲存資料";
          setAutofillNote(`已自動帶入${via}資料，可直接修改`);
        }
      }
      return merged;
    });
  }, [
    authReady,
    isLoggedIn,
    supabaseUser,
    session?.user?.email,
    session?.user?.name,
    session?.user?.id,
  ]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    touchedRef.current[name] = true;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const persistProfileIfNeeded = async () => {
    if (formData.saveInfo) {
      saveCheckoutProfile(formData);
    }
    if (supabaseUser && (formData.name || formData.phone)) {
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: formData.name || undefined,
            phone: formData.phone || undefined,
            checkout_city: formData.city || undefined,
            checkout_address: formData.address || undefined,
            checkout_postal_code: formData.postalCode || undefined,
          },
        });
      } catch (err) {
        console.warn("[checkout] 同步會員資料略過:", err?.message || err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.address
    ) {
      alert("請填寫所有必填欄位 (含地址)");
      return;
    }

    if (!cartId || cartItems.length === 0) {
      alert("購物車為空或尚未與伺服器連線");
      return;
    }

    if (isSubmittingLock) {
      console.log("⏳ 系統處理中，已攔截重複點擊！");
      return;
    }

    isSubmittingLock = true;
    setIsSubmitting(true);

    try {
      await persistProfileIfNeeded();
      console.log("🚀 1. 開始呼叫 Next.js 中間層 API...");

      let referralCode = "";
      try {
        const { readReferralCookie } = await import("../lib/partnerReferral");
        referralCode = readReferralCookie() || "";
      } catch {
        /* ignore */
      }

      const orderRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: cartId,
          orderInfo: {
            ...formData,
            customerId: memberInfo?.id || supabaseUser?.id || null,
            referral_code: referralCode || undefined,
          },
        }),
      });

      const orderResult = await orderRes.json();
      console.log("📦 2. Next.js 建立訂單結果:", orderResult);

      if (!orderResult.success) {
        if (orderResult.code === "CART_COMPLETED") {
          localStorage.removeItem("medusa_cart_id");
          alert(
            orderResult.message ||
              "購物車已結帳完成，請重新整理頁面後再加入商品並結帳。",
          );
          window.location.reload();
          return;
        }
        throw new Error(orderResult.message || "建立訂單失敗");
      }

      const { orderId, amount } = orderResult;
      console.log("✅ 3. 拿到 Medusa Order ID:", orderId, "準備跳轉藍新金流…");

      localStorage.removeItem("medusa_cart_id");

      sessionStorage.setItem(
        "checkout_pending_payment",
        JSON.stringify({
          medusaOrderId: orderId,
          amount,
          email: formData.email,
          startedAt: Date.now(),
        }),
      );

      sessionStorage.setItem(
        "newebpay_checkout_payload",
        JSON.stringify({
          orderId,
          amount,
          orderInfo: formData,
        }),
      );

      await router.push("/checkout/payment/");
      return;
    } catch (err) {
      console.error("❌ 結帳流程出錯:", err);
      alert(`發生錯誤：${err.message}`);
    } finally {
      isSubmittingLock = false;
      setIsSubmitting(false);
    }
  };

  const handleLinePaySubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      alert("請填寫所有必填欄位（姓名、Email、手機）");
      return;
    }
    alert("目前 LINE Pay 尚未完全對接 Medusa，請先使用藍新金流結帳");
  };

  useEffect(() => {
    const onLinePay = () => {
      handleLinePaySubmit();
    };
    window.addEventListener("esim-checkout-linepay", onLinePay);
    return () =>
      window.removeEventListener("esim-checkout-linepay", onLinePay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.name, formData.email, formData.phone]);

  const loginHref = buildLoginUrl(
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/Cart",
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="font-sans w-full"
    >
      <form id="checkout-form" onSubmit={handleSubmit}>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">聯絡資訊</h2>
            {isLoggedIn || memberInfo?.email ? (
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                已登入
                {memberInfo?.name ? ` · ${memberInfo.name}` : ""}
              </span>
            ) : (
              <Link
                href={loginHref}
                className="text-sm text-blue-600 hover:underline"
              >
                登入
              </Link>
            )}
          </div>
          {autofillNote ? (
            <p className="mb-3 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
              {autofillNote}
            </p>
          ) : null}
          <FloatingInput
            label="電子郵件 (Email)"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="電子郵件"
            required
          />
          <div className="mt-3 flex items-center">
            <input
              id="newsOffers"
              name="newsOffers"
              type="checkbox"
              checked={formData.newsOffers}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor="newsOffers"
              className="ml-2 block text-sm text-gray-600 cursor-pointer"
            >
              訂閱最新優惠與消息
            </label>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">運送地址</h2>
          <div className="space-y-3">
            <div className="relative">
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 pt-5 pb-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none"
              >
                <option value="Taiwan">台灣 (Taiwan)</option>
              </select>
              <label className="absolute left-3 top-1 text-xs text-gray-500 pointer-events-none">
                國家/地區
              </label>
            </div>

            <FloatingInput
              label="收件人姓名"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="收件人姓名"
              required
            />
            <FloatingInput
              label="地址 (路段、街、號)"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="地址"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <FloatingInput
                label="城市 / 縣市"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="城市"
              />
              <FloatingInput
                label="郵遞區號"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="郵遞區號"
              />
            </div>

            <FloatingInput
              label="手機號碼"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="手機號碼"
              required
            />

            <div className="mt-3 flex items-center">
              <input
                id="saveInfo"
                name="saveInfo"
                type="checkbox"
                checked={formData.saveInfo}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="saveInfo"
                className="ml-2 block text-sm text-gray-600 cursor-pointer"
              >
                儲存資料以便下次快速結帳
              </label>
            </div>
          </div>
        </div>

        {!hideSubmitButton && (
          <div className="mt-10 space-y-3">
            <p className="text-xs text-center text-gray-500">選擇付款方式</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleLinePaySubmit}
                disabled={isSubmitting}
                className={`bg-[#00C300] text-white py-3.5 rounded-md font-bold text-base flex justify-center items-center transition-colors shadow-sm ${
                  isSubmitting
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-[#009f00]"
                }`}
              >
                LINE Pay 結帳
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`bg-[#1e40af] text-white py-3.5 rounded-md font-bold text-base flex justify-center items-center shadow-md transition-all ${
                  isSubmitting
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-[#1e3a8a]"
                }`}
              >
                {isSubmitting ? "正在前往藍新金流…" : "藍新金流結帳"}
              </button>
            </div>
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className={`text-sm flex items-center gap-1 transition-colors ${
                isSubmitting
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-600 hover:text-blue-800"
              }`}
            >
              <span>&lt;</span> 返回購物車
            </button>
          </div>
        )}
      </form>
    </motion.div>
  );
};

export default CheckoutForm;
