import React, { useState } from "react";
import Layout from "./Layout";
import { useCart } from "../components/context/CartContext";
import Image from "next/image";

const CheckoutLinePay = () => {
  const { cartItems, totalPrice } = useCart();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone) {
      alert("請填寫所有欄位");
      return;
    }

    if (cartItems.length === 0) {
      alert("購物車為空");
      return;
    }

    try {
      const res = await fetch("/api/linepay/reserve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderInfo: formData,
          cartItems,
          totalPrice, // ✅ 傳入總金額
        }),
      });

      const json = await res.json();

      if (json?.info?.paymentUrl?.web) {
        window.location.href = json.info.paymentUrl.web;
      } else {
        console.error("LINE Pay API 錯誤回應", json);
        alert("串接失敗，請檢查 Console log");
      }
    } catch (err) {
      console.error("❌ 串接失敗", err);
      alert("送出失敗，請稍後再試");
    }
  };

  return (
    <Layout>
      <div className="pt-[200px] px-[30px] w-full mx-auto">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col lg:flex-row max-w-[1920px] w-[95%] mx-auto"
        >
          <div className="w-full lg:w-1/2 flex flex-col">
            <h2 className="text-xl font-bold mb-4">結帳資訊</h2>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="姓名"
              className="border p-2 rounded mb-2"
              required
            />
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              className="border p-2 rounded mb-2"
              required
            />
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="手機號碼"
              className="border p-2 rounded mb-2"
              required
            />
          </div>

          <div className="w-full lg:w-1/2 p-10">
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                購物車內容
              </h3>
              {cartItems.length === 0 ? (
                <p className="text-gray-500">購物車是空的</p>
              ) : (
                <ul className="space-y-4">
                  {cartItems.map((item, index) => (
                    <li
                      key={index}
                      className="bg-[#f8f8fa] p-8 border-gray-200 border-2 flex flex-row rounded-[20px] items-center gap-4 border-b pb-4"
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={80}
                        height={80}
                        className="rounded-xl max-w-[200px]"
                      />
                      <div className="flex flex-col w-full pl-5">
                        <span className="font-bold">{item.name}</span>
                        <span className="text-sm text-gray-600">
                          國家：{item.color} / 規格：{item.size}
                        </span>
                        <span className="text-sm font-medium mt-1">
                          數量：{item.quantity}
                        </span>
                        <span className="text-sm font-medium mt-1">
                          小計：${item.price * item.quantity}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-right font-bold mt-4">總金額：${totalPrice}</p>
            </div>

            <button
              type="submit"
              className="hover:bg-green-700 bg-green-600 text-white px-6 py-2 rounded-[10px] mt-4"
            >
              使用 LINE Pay 結帳
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CheckoutLinePay;
