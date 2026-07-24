"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useCart } from "./context/CartContext"; // 確保路徑正確
import { motion } from "framer-motion";

// --- Component: 浮動標籤輸入框 (Shopify 風格核心) ---
const FloatingInput = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) => (
  <div className="relative w-full">
    <input
      type={type}
      name={name}
      id={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="peer w-full border border-gray-300 rounded-md px-3 pt-5 pb-2 text-gray-900 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
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

  // 🔥 用來控制按鈕外觀變成「處理中...」的狀態
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "Taiwan",
    city: "",
    address: "",
    postalCode: "",
    saveInfo: false,
    newsOffers: true,
  });

  const [memberInfo, setMemberInfo] = useState(null);

  // --- Effect: 載入預存資料 ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setMemberInfo(user);
        setFormData((prev) => ({
          ...prev,
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
        }));
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // --- Logic: 建立訂單 (Medusa ➔ Next.js API ➔ NewebPay) ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🛡️ 第 1 道防護：表單驗證 (放最前面，不符合就擋掉)
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

    // 🛡️ 第 2 道防護：攔截重複點擊！(如果鎖是關上的，直接踢掉這個請求)
    if (isSubmittingLock) {
      console.log("⏳ 系統處理中，已攔截重複點擊！");
      return;
    }

    // 🛡️ 檢查通過，立刻上鎖！(包含背景變數與 UI 狀態)
    isSubmittingLock = true;
    setIsSubmitting(true);

    try {
      console.log("🚀 1. 開始呼叫 Next.js 中間層 API...");

      // 只傳 cartId 和客人的地址資料給 Next.js API
      const orderRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: cartId,
          orderInfo: {
            ...formData,
            customerId: memberInfo?.id || null,
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

      // 購物車已在 Medusa 完成，清除本地 ID 避免重複結帳
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

      // 先 push 中繼頁再 POST 藍新，保留瀏覽紀錄：產品/購物車 → 中繼 → 藍新
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
      // 🛡️ 最終保險：不管結帳成功或失敗，最後一定要解開鎖定，讓客人有重試的機會
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

  // --- Render ---
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="font-sans w-full"
    >
      <form id="checkout-form" onSubmit={handleSubmit}>
        {/* Contact */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">聯絡資訊</h2>
            {!memberInfo && (
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
              >
                登入
              </button>
            )}
          </div>
          <FloatingInput
            label="電子郵件 (Email)"
            name="email"
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

        {/* Delivery */}
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
