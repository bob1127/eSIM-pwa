// pages/Cart.tsx
import { useCart } from "../components/context/CartContext";
import Layout from "./Layout";
import Link from "next/link"; // 確保有引入 Link
import SwiperCard from "../components/SwiperCarousel/AnotherProduct";
import { useState, useEffect } from "react";
import CheckoutPage from "./checkout";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import CheckoutForm from "../components/CheckoutForm";
import StepLabel from "@mui/material/StepLabel";
import Box from "@mui/material/Box";
import { motion, AnimatePresence } from "framer-motion";

// ... (Icon components 保持不變) ...
const TruckIcon = () => (
  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);
const SecurityIcon = () => (
  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const steps = ["購物車", "填寫資料", "完成訂單"];

const CartPage = () => {
  const { cartItems, totalPrice, updateQuantity, removeFromCart } = useCart();
  console.log("目前購物車內的資料:", cartItems);
  const [activeStep, setActiveStep] = useState(0);
  const [removingIndex, setRemovingIndex] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);

  // ... (handleNext, handleBack, useEffect, getDeliveryDate 等邏輯保持不變) ...

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleRemoveWithAnimation = (index, id, color, size) => {
    setRemovingIndex(index);
    setTimeout(() => {
      removeFromCart(id, color, size);
      setRemovingIndex(null);
    }, 300);
  };

  const getDeliveryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white min-h-screen"
      >
        <div className="pt-[120px] max-w-[1600px] mx-auto">
          {/* Stepper */}
          <Box sx={{ width: "100%", marginBottom: "3rem" }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          <AnimatePresence mode="wait">
            {activeStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <div className="mb-8">
                  <h1 className="text-3xl font-normal text-gray-900">
                    購物車物品數量：
                    <span className="font-bold">{cartItems.length}</span>
                  </h1>
                </div>

                {cartItems.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-xl text-gray-600 mb-4">您的購物車是空的</p>
                    <Link href="/" className="text-blue-600 hover:underline">
                      繼續選購商品
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-12">
                    {/* 左側：商品列表 */}
                    <div className="w-full lg:w-[65%] space-y-8">
                      {cartItems.map((item, index) => (
                        <motion.div
                          key={`${item.id}-${item.color}-${item.size}`}
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`flex flex-col md:flex-row gap-6 border-b border-gray-200 pb-8 ${
                            removingIndex === index ? "opacity-50" : ""
                          }`}
                        >
                          {/* --- 修改重點 1: 圖片加上連結 --- */}
                          <div className="w-full md:w-[150px] flex-shrink-0 flex items-start justify-center bg-[#ffffff] rounded-lg p-2">
                            {/* 假設你的 item 物件裡有 slug 屬性，如果沒有，請去 CartContext 補上 */}
                            <Link href={`/product/${item.slug || '#'}`} className="block w-full">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-auto object-contain mix-blend-multiply cursor-pointer hover:opacity-80 transition-opacity"
                                />
                            </Link>
                          </div>

                          {/* 商品資訊區 */}
                          <div className="flex-grow">
                            <div className="flex justify-between items-start mb-2">
                              {/* --- 修改重點 2: 標題加上連結 --- */}
                              <h2 className="text-xl font-bold text-gray-900">
                                <Link 
                                  href={`/product/${item.slug || '#'}`} 
                                  className="hover:text-blue-600 hover:underline transition-colors"
                                >
                                  {item.name}
                                </Link>
                              </h2>
                              <p className="text-lg font-bold text-gray-900">
                                ${item.price}
                              </p>
                            </div>

                            <p className="text-gray-500 text-sm mb-4">
                              {item.color} / {item.size}
                            </p>

                            <div className="bg-[#f5f6f7] rounded-md p-4 mb-4">
                              <div className="mb-2">
                                <span className="font-bold text-sm text-gray-900">可用性</span>
                                <p className="text-sm text-gray-600 mt-1">現貨供應</p>
                              </div>
                              <div className="flex items-start text-sm text-gray-800">
                                <TruckIcon />
                                <span>
                                  預計送達日期：
                                  <span className="font-bold">{getDeliveryDate()}</span>
                                </span>
                              </div>
                            </div>

                            {/* 數量與刪除控制區 (保持不變) */}
                            <div className="flex justify-between items-end mt-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-700">數量：</span>
                                <div className="flex items-center text-sm font-medium text-gray-900 cursor-pointer select-none">
                                  <button
                                    className="px-2 py-1 text-lg leading-none hover:bg-gray-100 rounded"
                                    onClick={() => updateQuantity(item.id, item.color, item.size, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                  >
                                    -
                                  </button>
                                  <span className="mx-2">{item.quantity}</span>
                                  <button
                                    className="px-2 py-1 text-lg leading-none hover:bg-gray-100 rounded"
                                    onClick={() => updateQuantity(item.id, item.color, item.size, item.quantity + 1)}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              <button
                                className="text-blue-600 text-sm font-medium hover:underline"
                                onClick={() => handleRemoveWithAnimation(index, item.id, item.color, item.size)}
                              >
                                刪除
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* 右側：訂單摘要 (保持不變) */}
                    <div className="w-full lg:w-[35%]">
                      <div className="sticky top-24 border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold mb-6 text-gray-900">訂單摘要</h3>
                        <div className="space-y-4 mb-6">
                           <div className="flex justify-between text-gray-600">
                            <span>小計</span>
                            <span className="font-medium text-gray-900">${totalPrice}</span>
                          </div>
                          {/* ...其他摘要內容... */}
                        </div>

                        <div className="border-t border-gray-200 my-4 pt-4">
                          <div className="flex justify-between items-center mb-6">
                            <span className="text-xl font-bold text-gray-900">總計</span>
                            <span className="text-xl font-bold text-gray-900">${totalPrice}元</span>
                          </div>

                          <button
                            onClick={handleNext}
                            className="w-full bg-[#0064e0] hover:bg-[#0052b5] text-white font-bold py-4 px-6 rounded-full transition-colors text-lg shadow-md"
                          >
                            結帳 (Checkout)
                          </button>
                        </div>
                         {/* ...icon 區塊... */}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Step 1 & 2 (保持不變) */}
            {activeStep === 1 && (
               <motion.div key="step-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[1600px] mx-auto py-10">
                <CheckoutForm onBack={handleBack} onNext={handleNext} />
              </motion.div>
            )}
            {activeStep === 2 && (
              // ... 你的完成訂單頁面 ...
              <div className="text-center">完成訂單內容</div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-gray-200 mt-20 pt-10">
          <SwiperCard />
        </div>
      </motion.div>
    </Layout>
  );
};

export default CartPage;