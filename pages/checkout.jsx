"use client";

import React, { useState, useEffect } from "react";
import { useCart } from "../components/context/CartContext";
import { motion } from "framer-motion";
import Layout from "./Layout.js"; // 注意路徑是否正確

const CheckoutPage = () => {
  const { cartItems, totalPrice } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    paymentMethod: "Credit",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setFormData((prev) => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
        }));
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🚀 藍新金流結帳邏輯 (除錯版)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      return alert("請填寫姓名、Email 與手機號碼");
    }

    const missingPlanId = cartItems.find((item) => !item.planId);
    if (missingPlanId) {
      return alert(
        `錯誤：商品 "${missingPlanId.name}" 缺少供應商代碼 (plan_id)`,
      );
    }

    setIsSubmitting(true);

    try {
      console.log("🚀 1. 開始呼叫 /api/orders/create...");

      const orderRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderInfo: formData,
          totalPrice: totalPrice,
          items: cartItems,
        }),
      });

      const orderResult = await orderRes.json();
      console.log("📦 2. 建立訂單結果:", orderResult); // <-- 這裡會印出到底有沒有成功

      if (!orderResult.success) {
        throw new Error(orderResult.message || "建立訂單失敗");
      }

      const orderId = orderResult.orderId;
      if (!orderId) {
        throw new Error("後端回傳成功，但沒有給 orderId！");
      }

      console.log("✅ 3. 拿到 Supabase UUID:", orderId, "準備呼叫藍新金流...");

      // 打開新視窗 (這裡才打開，避免卡死)
      const newWindow = window.open("about:blank");
      if (!newWindow) {
        setIsSubmitting(false);
        return alert("跳轉被瀏覽器攔截，請允許開啟彈出視窗");
      }
      newWindow.document.write("正在前往藍新金流，請稍候...");

      const res = await fetch("/api/newebpay-generate-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems,
          orderInfo: formData,
          customOrderId: orderId, // 傳入剛剛拿到的 ID
        }),
      });

      const html = await res.text();
      newWindow.document.write(html);
      newWindow.document.close();
    } catch (err) {
      console.error("❌ 結帳流程出錯:", err);
      alert(`發生錯誤：${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-slate-50 min-h-screen py-10"
      >
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8 text-slate-900">
            結帳資料填寫
          </h1>

          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  姓名 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例如：王小明"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  手機號碼 *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例如：0912345678"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Email (接收 eSIM QR Code) *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="務必填寫正確，否則無法收件"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xl font-bold text-slate-800">
              結帳總金額：
              <span className="text-blue-600">NT$ {totalPrice}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || cartItems.length === 0}
              className={`w-full md:w-auto px-8 py-4 font-bold rounded-xl transition-all shadow-lg ${
                isSubmitting || cartItems.length === 0
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
              }`}
            >
              {isSubmitting ? "處理中..." : "確認並前往付款"}
            </button>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default CheckoutPage;
