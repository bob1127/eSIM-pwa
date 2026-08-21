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
import { isLineSyntheticEmail } from "@/lib/lineAuth";
import { CONTACT_INFO } from "@/lib/contactUi";
import { supabase } from "@/lib/supabaseClient";
import JekoPillButton from "@/components/ui/JekoPillButton";

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
      let merged = mergeCheckoutForm(prev, safePatches);
      // 若欄位仍是 LINE 虛擬信箱（舊快取），清掉並改請使用者填真實 Email
      if (
        !touchedRef.current.email &&
        isLineSyntheticEmail(merged.email)
      ) {
        merged = { ...merged, email: "" };
      }
      if (merged !== prev) {
        const filled = ["email", "name", "phone", "address", "city"].filter(
          (k) =>
            !String(prev[k] || "").trim() && String(merged[k] || "").trim(),
        );
        if (filled.length) {
          const via =
            identity.source === "nextauth"
              ? "LINE／社群登入"
              : identity.source === "supabase"
                ? "會員帳號"
                : "先前儲存資料";
          setAutofillNote(`已自動帶入${via}資料，可直接修改`);
        } else if (
          isLineSyntheticEmail(prev.email) &&
          !String(merged.email || "").trim()
        ) {
          setAutofillNote(
            "LINE 登入不會提供真實 Email，請填寫可收件信箱（eSIM QR 會寄到這裡）",
          );
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

  /** 不阻塞結帳：本機儲存同步做，Supabase 背景寫 */
  const persistProfileInBackground = () => {
    if (formData.saveInfo) {
      saveCheckoutProfile(formData);
    }
    if (supabaseUser && (formData.name || formData.phone)) {
      void supabase.auth
        .updateUser({
          data: {
            full_name: formData.name || undefined,
            phone: formData.phone || undefined,
            checkout_city: formData.city || undefined,
            checkout_address: formData.address || undefined,
            checkout_postal_code: formData.postalCode || undefined,
          },
        })
        .catch((err) => {
          console.warn("[checkout] 同步會員資料略過:", err?.message || err);
        });
    }
  };

  const setCheckoutBusy = (active, method = "linepay") => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("esim-checkout-busy", {
        detail: { active: Boolean(active), method },
      }),
    );
  };

  // 結帳身分「蓋章」：把登入身分帶進訂單 metadata，讓會員中心可依
  // line_user_id / supabase_user_id 對回本人訂單（不必猜要用哪個帳號登入）。
  // 目前只有 LINE 一個 NextAuth provider，故 session.user.id 即 LINE user id。
  const buildCheckoutIdentity = () => {
    const lineUserId = session?.user?.id || null;
    const supabaseUserId = supabaseUser?.id || null;
    const authProvider = supabaseUserId
      ? "supabase"
      : lineUserId
        ? "line"
        : "guest";
    return { lineUserId, supabaseUserId, authProvider };
  };

  const startHostedCheckout = async ({ methods = [], paymentLabel = "藍新金流" } = {}) => {
    if (!formData.email || !formData.name || !formData.phone) {
      setCheckoutBusy(false, "newebpay");
      alert("請填寫 Email、姓名與手機號碼");
      return;
    }

    if (isLineSyntheticEmail(formData.email)) {
      setCheckoutBusy(false, "newebpay");
      alert("請填寫真實 Email，以便寄送 eSIM QR 與訂單通知");
      return;
    }

    if (!cartId || cartItems.length === 0) {
      setCheckoutBusy(false, "newebpay");
      alert("購物車為空或尚未與伺服器連線");
      return;
    }

    if (isSubmittingLock) {
      console.log("⏳ 系統處理中，已攔截重複點擊！");
      return;
    }

    isSubmittingLock = true;
    setIsSubmitting(true);
    setCheckoutBusy(true, "newebpay");

    try {
      await persistProfileIfNeeded();
      console.log("🚀 1. 開始呼叫 Next.js 中間層 API...");

      // 推薦歸因改由後端直接讀取伺服器簽章的 HttpOnly Cookie
      // （見 lib/referralSignature.js），瀏覽器端不再讀取／傳遞代碼，
      // 避免使用者於 DevTools 竄改代碼或延長 Cookie 效期。
      const orderRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: cartId,
          orderInfo: {
            ...formData,
            customerId: memberInfo?.id || supabaseUser?.id || null,
            ...buildCheckoutIdentity(),
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
        if (
          orderResult.code === "PLAN_DELISTED" ||
          orderResult.code === "PLAN_SUBSTITUTED" ||
          orderResult.code === "PLAN_UNAVAILABLE" ||
          orderResult.code === "PLAN_MISSING"
        ) {
          throw new Error("商品已完售");
        }
        throw new Error(orderResult.message || "建立訂單失敗");
      }

      const { orderId, amount } = orderResult;
      console.log(
        "✅ 3. 拿到 Medusa Order ID:",
        orderId,
        `準備跳轉 ${paymentLabel}…`,
      );

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
          orderInfo: {
            ...formData,
            ...buildCheckoutIdentity(),
            methods,
            payment_method: methods?.[0] || "CREDIT",
          },
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
      setCheckoutBusy(false, "newebpay");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await startHostedCheckout({
      methods: ["CREDIT", "VACC", "WEBATM"],
      paymentLabel: "藍新金流",
    });
  };

  const handleLinePaySubmit = async () => {
    if (!formData.email || !formData.name || !formData.phone) {
      setCheckoutBusy(false, "linepay");
      alert("請填寫 Email、姓名與手機號碼");
      return;
    }

    if (isLineSyntheticEmail(formData.email)) {
      setCheckoutBusy(false, "linepay");
      alert("請填寫真實 Email，以便寄送 eSIM QR 與訂單通知");
      return;
    }

    if (!cartId || cartItems.length === 0) {
      setCheckoutBusy(false, "linepay");
      alert("購物車為空或尚未與伺服器連線");
      return;
    }

    if (isSubmittingLock) {
      console.log("⏳ 系統處理中，已攔截重複點擊！");
      return;
    }

    isSubmittingLock = true;
    setIsSubmitting(true);
    setCheckoutBusy(true, "linepay");

    try {
      persistProfileInBackground();

      // 單一 API：準備地址／運費 + LINE Pay 建單（少一次瀏覽器往返）
      const linepayRes = await fetch("/api/linepay/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId,
          orderInfo: {
            ...formData,
            customerId: memberInfo?.id || supabaseUser?.id || null,
            ...buildCheckoutIdentity(),
            methods: ["LINEPAY"],
            payment_method: "LINEPAY",
          },
        }),
      });
      const linepayData = await linepayRes.json();
      if (!linepayRes.ok || !linepayData?.success || !linepayData?.paymentUrl) {
      if (linepayData?.code === "CART_COMPLETED") {
          localStorage.removeItem("medusa_cart_id");
          alert(
            linepayData.message ||
              "購物車已結帳完成，請重新整理後再試。",
          );
          window.location.reload();
          return;
        }
        if (
          linepayData?.code === "PLAN_DELISTED" ||
          linepayData?.code === "PLAN_SUBSTITUTED" ||
          linepayData?.code === "PLAN_UNAVAILABLE" ||
          linepayData?.code === "PLAN_MISSING"
        ) {
          throw new Error("商品已完售");
        }
        throw new Error(linepayData?.message || "LINE Pay 建單失敗");
      }

      localStorage.removeItem("medusa_cart_id");
      window.location.href = linepayData.paymentUrl;
      return;
    } catch (err) {
      console.error("❌ LINE Pay 結帳流程出錯:", err);
      alert(`LINE Pay 結帳失敗：${err.message}`);
      setCheckoutBusy(false, "linepay");
    } finally {
      isSubmittingLock = false;
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const onLinePay = () => {
      handleLinePaySubmit();
    };
    window.addEventListener("esim-checkout-linepay", onLinePay);
    return () => window.removeEventListener("esim-checkout-linepay", onLinePay);
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
              <span className="text-xs text-white bg-[#2e5fff] border border-emerald-100 px-2 py-1 rounded-full">
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
            label="電子郵件 (Email) *"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="請填寫可收件的 Email"
            required
          />
          {isLoggedIn && !formData.email ? (
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
              LINE 登入不會提供真實 Email，請填寫可收件信箱（eSIM QR 與訂單通知會寄到這裡）
            </p>
          ) : null}
          <a
            href={CONTACT_INFO.lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-sm text-gray-600 hover:text-gray-800"
          >
            加入官方 LINE，接收最新優惠與消息
          </a>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">聯絡人</h2>
          <p className="text-xs text-gray-500 mb-4">
            eSIM 以 Email 數位交付，無需填寫運送地址
          </p>
          <div className="space-y-3">
            <FloatingInput
              label="姓名 *"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="姓名"
              required
            />
            <FloatingInput
              label="手機號碼 *"
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
              <JekoPillButton
                type="button"
                variant="primary"
                tone="line"
                onClick={handleLinePaySubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "正在前往 LINE Pay…" : "LINE Pay 結帳"}
              </JekoPillButton>
              <JekoPillButton
                type="submit"
                variant="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "正在前往藍新金流…" : "藍新金流結帳"}
              </JekoPillButton>
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
