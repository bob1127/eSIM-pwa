import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  fetchActiveStoreByDomain,
  fetchStoreProductsForStorefront,
} from "@/lib/partnerStorefront";
import { useCart } from "@/components/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Box from "@mui/material/Box";
import PartnerShopLayout from "@/components/Shop/PartnerShopLayout"; // 🌟 統一使用 /shop Navbar+Footer
import CheckoutForm from "@/components/CheckoutForm";
import EsimRefundDisclosure from "@/components/legal/EsimRefundDisclosure";
import { TrashIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import {
  readPendingPayment,
  clearPendingPayment,
} from "@/lib/checkoutPendingPayment";

const TruckIcon = () => (
  <svg
    className="w-5 h-5 mr-2"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
    />
  </svg>
);

const steps = ["購物車", "填寫資料 / 付款"];

export default function PartnerCart({ store }) {
  const router = useRouter();
  const { esimItems, updateQuantity, removeFromCart, rebuildMedusaCartFromLocal } = useCart();
  const cartItems = useMemo(() => {
    const all = esimItems || [];
    if (!store?.id) return all;
    const sid = String(store.id);
    // 只結本店商品；舊資料無 store_id 時仍顯示（相容）
    const matched = all.filter(
      (i) => !i.store_id || String(i.store_id) === sid,
    );
    return matched.length ? matched : all;
  }, [esimItems, store?.id]);
  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1),
        0,
      ),
    [cartItems],
  );

  const [activeStep, setActiveStep] = useState(0);
  const [removingIndex, setRemovingIndex] = useState(null);

  // 藍新／LINE Pay 未完成付款返回：保留本機商品並重建 Medusa cart
  useEffect(() => {
    let cancelled = false;
    const recover = async () => {
      try {
        const pending = readPendingPayment();
        if (!pending) return;
        if (
          pending.method === "newebpay" ||
          pending.preserveLocalCart ||
          pending.method === "linepay"
        ) {
          if (!cancelled) await rebuildMedusaCartFromLocal();
        }
        if (!cancelled) clearPendingPayment();
      } catch {
        /* ignore */
      }
    };
    recover();
    const onPageShow = (e) => {
      if (e?.persisted) recover();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [rebuildMedusaCartFromLocal]);

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleRemoveWithAnimation = (index, id, color, size) => {
    setRemovingIndex(index);
    setTimeout(() => {
      removeFromCart(id, color, size);
      setRemovingIndex(null);
    }, 300);
  };

  if (!store) return <div>找不到該店鋪</div>;

  return (
    // 🌟 使用 PartnerLayout 包裹，Navbar 與 Footer 全自動生成！
    <PartnerShopLayout store={store} title="結帳購物車">
      <div className="pt-12 max-w-[1400px] mx-auto px-4 md:px-8 py-20 w-full">
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
          {/* STEP 0: 購物車列表 */}
          {activeStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full bg-white p-8 rounded-2xl "
            >
              <div className="mb-8 flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="text-gray-400 hover:text-gray-800 transition"
                >
                  <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <h1 className="text-[28px] font-bold text-gray-900">
                  購物車 ({cartItems.length})
                </h1>
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-xl text-gray-600 mb-4">您的購物車是空的</p>
                  <Link
                    href={`/p/${store.domain}#shop`}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    繼續選購商品 &rarr;
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-12">
                  <div className="w-full lg:w-[65%] space-y-8">
                    {cartItems.map((item, index) => (
                      <motion.div
                        key={`${item.id}-${item.color}-${item.size}`}
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`flex flex-col md:flex-row gap-6 border-b border-gray-100 pb-8 ${removingIndex === index ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <div className="w-full md:w-[150px] flex-shrink-0 bg-gray-50 rounded-xl p-2 border border-gray-100">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-auto object-cover rounded-lg"
                          />
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start mb-2">
                            <h2 className="text-lg font-bold text-gray-900">
                              {item.name}
                            </h2>
                            <p className="text-lg font-bold text-blue-600">
                              NT$ {item.price}
                            </p>
                          </div>
                          <p className="text-gray-500 text-sm mb-4 font-medium">
                            規格: {item.color} / {item.size}
                          </p>

                          <div className="flex justify-between items-end mt-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-gray-500">
                                數量：
                              </span>
                              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  className="px-3 py-1 bg-gray-50 hover:bg-gray-100 transition text-gray-600 disabled:opacity-40"
                                  onClick={() =>
                                    updateQuantity(
                                      item.variant_id || item.id,
                                      item.quantity - 1,
                                    )
                                  }
                                  disabled={item.quantity <= 1}
                                >
                                  -
                                </button>
                                <span className="px-4 text-sm font-bold">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="px-3 py-1 bg-gray-50 hover:bg-gray-100 transition text-gray-600"
                                  onClick={() =>
                                    updateQuantity(
                                      item.variant_id || item.id,
                                      item.quantity + 1,
                                    )
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <button
                              className="text-red-500 text-sm font-bold hover:underline flex items-center gap-1"
                              onClick={() =>
                                handleRemoveWithAnimation(
                                  index,
                                  item.id,
                                  item.color,
                                  item.size,
                                )
                              }
                            >
                              <TrashIcon className="w-4 h-4" /> 移除
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="w-full lg:w-[35%]">
                    <div className="sticky top-24 border border-gray-100 rounded-3xl p-8 bg-white shadow-lg shadow-gray-200/50">
                      <h3 className="text-xl font-bold mb-6 text-gray-900">
                        訂單摘要
                      </h3>
                      <div className="space-y-4 mb-6 text-sm font-medium">
                        <div className="flex justify-between text-gray-500">
                          <span>商品小計</span>
                          <span className="text-gray-900">NT$ {cartTotal}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>處理手續費</span>
                          <span className="text-emerald-600 font-bold">
                            免手續費
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-gray-100 my-6 pt-6">
                        <div className="flex justify-between items-end mb-8">
                          <span className="text-base font-bold text-gray-500">
                            總計金額
                          </span>
                          <span className="text-[28px] font-bold text-gray-900">
                            NT$ {cartTotal}
                          </span>
                        </div>
                        <button
                          onClick={handleNext}
                          className="w-full bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md text-lg"
                        >
                          下一步：填寫資料
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 1: 填寫資料 + 付款（統一走主站 Medusa + 藍新／LINE Pay） */}
          {activeStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex flex-col lg:flex-row gap-8"
            >
              <div className="w-full lg:w-[60%]">
                <div className="mb-6 flex justify-between items-center px-2">
                  <h2 className="text-[24px] font-bold text-gray-900">
                    填寫接收資料
                  </h2>
                  <button
                    onClick={handleBack}
                    className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1"
                  >
                    <ArrowLeftIcon className="w-4 h-4" /> 返回購物車
                  </button>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                  {/* 統一結帳：帶 store_id → 伺服器端套用夥伴售價後走藍新／LINE Pay */}
                  <CheckoutForm
                    storeId={store.id}
                    onBack={handleBack}
                    onCartNeedsRebuild={rebuildMedusaCartFromLocal}
                  />
                </div>
              </div>

              <div className="w-full lg:w-[40%]">
                <div className="sticky top-24 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-6 bg-slate-900 text-white">
                    <h3 className="text-xl font-bold">訂單確認</h3>
                  </div>
                  <div className="p-6 space-y-5 max-h-[40vh] overflow-y-auto">
                    {cartItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-start border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                      >
                        <div className="pr-4">
                          <h4 className="text-sm font-bold text-gray-800 mb-1">
                            {item.name}
                          </h4>
                          <p className="text-xs text-gray-400 font-medium">
                            {item.color} / {item.size} × {item.quantity}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                          NT$ {item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-50 p-6 border-t border-gray-100">
                    <div className="flex justify-between items-end mb-6">
                      <span className="text-base font-bold text-gray-500">
                        應付總額
                      </span>
                      <span className="text-[28px] font-bold text-blue-600">
                        NT$ {cartTotal}
                      </span>
                    </div>
                    <EsimRefundDisclosure compact />
                    <p className="mt-4 text-xs text-gray-500 leading-relaxed">
                      付款前請確認 Email 無誤；eSIM QR 將寄至此信箱。掃描開通後即無法
                      退款（除政策例外）。詳見{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="text-blue-600 hover:underline"
                      >
                        服務條款
                      </Link>
                      、
                      <Link
                        href="/refund-policy"
                        target="_blank"
                        className="text-blue-600 hover:underline"
                      >
                        退換貨政策
                      </Link>
                      。
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PartnerShopLayout>
  );
}

export async function getServerSideProps(context) {
  const { partnerSlug } = context.params;
  const store = await fetchActiveStoreByDomain(partnerSlug);
  if (!store) return { notFound: true };
  const formattedProducts = await fetchStoreProductsForStorefront(store);
  return {
    props: {
      store,
      products: formattedProducts.map((p) => ({
        ...p,
        displayPrice: p.displayPrice === "0" ? "???" : p.displayPrice,
      })),
    },
  };
}
