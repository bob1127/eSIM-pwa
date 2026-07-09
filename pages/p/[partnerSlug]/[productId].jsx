import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSupabaseAdminServer } from "@/lib/supabaseAdminServer";
import {
  CheckCircleIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useCart } from "@/components/context/CartContext";
import PartnerLayout from "@/components/PartnerLayout";
import EsimRefundDisclosure from "@/components/legal/EsimRefundDisclosure";

export default function PartnerProductDetail({
  store,
  product,
  variations,
  customPrices,
}) {
  const { addToCart, setIsCartOpen } = useCart();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);

  // 🌟 新增數量選擇狀態 (參照參考圖設計)
  const [quantity, setQuantity] = useState(1);

  // ==========================================
  // 多維度變體篩選邏輯
  // ==========================================
  const availableTelecoms = useMemo(() => {
    const telecoms = variations
      .map((v) => v.attributes?.telecom || "預設電信")
      .filter(Boolean);
    return [...new Set(telecoms)];
  }, [variations]);

  const [selectedTelecom, setSelectedTelecom] = useState(
    availableTelecoms[0] || "",
  );
  const [selectedData, setSelectedData] = useState("");
  const [selectedDays, setSelectedDays] = useState("");

  const availableDataOptions = useMemo(() => {
    const filtered = variations.filter(
      (v) => (v.attributes?.telecom || "預設電信") === selectedTelecom,
    );
    return [
      ...new Set(
        filtered.map((v) => v.attributes?.data || "預設流量").filter(Boolean),
      ),
    ];
  }, [variations, selectedTelecom]);

  const availableDaysOptions = useMemo(() => {
    const filtered = variations.filter(
      (v) =>
        (v.attributes?.telecom || "預設電信") === selectedTelecom &&
        (v.attributes?.data || "預設流量") === selectedData,
    );
    return [
      ...new Set(filtered.map((v) => v.attributes?.days || "").filter(Boolean)),
    ].sort((a, b) => Number(a) - Number(b));
  }, [variations, selectedTelecom, selectedData]);

  useEffect(() => {
    if (
      availableDataOptions.length > 0 &&
      !availableDataOptions.includes(selectedData)
    )
      setSelectedData(availableDataOptions[0]);
  }, [availableDataOptions, selectedData]);

  useEffect(() => {
    if (
      availableDaysOptions.length > 0 &&
      !availableDaysOptions.includes(selectedDays)
    )
      setSelectedDays(availableDaysOptions[0]);
  }, [availableDaysOptions, selectedDays]);

  const currentVariant = useMemo(() => {
    return variations.find(
      (v) =>
        (v.attributes?.telecom || "預設電信") === selectedTelecom &&
        (v.attributes?.data || "預設流量") === selectedData &&
        (v.attributes?.days || "") === selectedDays,
    );
  }, [variations, selectedTelecom, selectedData, selectedDays]);

  // ==========================================
  // 定價與分潤計算邏輯
  // ==========================================
  const calculateBasePrice = (variant) => {
    if (!variant) return 0;
    if (customPrices && customPrices[variant.id] !== undefined)
      return parseInt(customPrices[variant.id]);
    const basePrice = variant.b2b_price || 0;
    const markup = store.markup_rate || 0;
    return Math.round(basePrice * (1 + markup / 100));
  };

  const originalPrice = currentVariant ? calculateBasePrice(currentVariant) : 0;
  const b2bCost = currentVariant?.b2b_price || 0;

  const finalData = useMemo(() => {
    let finalPrice = originalPrice;
    let discountAmount = 0;

    if (appliedCoupon && !appliedCoupon.error) {
      if (appliedCoupon.discount_type === "percent") {
        discountAmount = originalPrice * (appliedCoupon.discount_value / 100);
      } else if (appliedCoupon.discount_type === "fixed") {
        discountAmount = appliedCoupon.discount_value;
      }
      finalPrice = Math.max(0, originalPrice - discountAmount);
    }

    const partnerProfit = finalPrice - b2bCost;
    return { finalPrice, discountAmount, partnerProfit, b2bCost };
  }, [originalPrice, b2bCost, appliedCoupon]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsVerifyingCoupon(true);
    setAppliedCoupon(null);

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !coupon) {
      setAppliedCoupon({ error: "無效或已停用的折扣碼" });
    } else {
      setAppliedCoupon(coupon);
    }
    setIsVerifyingCoupon(false);
  };

  // ==========================================
  // 加入購物車邏輯
  // ==========================================
  const handleAddToCart = async () => {
    if (!currentVariant) return alert("請完整選擇方案規格");
    if (finalData.partnerProfit < 0) return alert("折扣設定錯誤，售價低於成本");

    setIsProcessing(true);

    const cartItem = {
      id: currentVariant.id,
      productId: product.id,
      name: product.name,
      price: finalData.finalPrice,
      originalPrice: originalPrice,
      color: selectedTelecom,
      size: `${selectedData} ${selectedDays}天`,
      quantity: quantity, // 🌟 帶入選擇的數量
      image:
        "https://images.unsplash.com/photo-1480796927426-f609979314bd?q=80&w=800&auto=format&fit=crop",
      slug: product.id,
      store_id: store.id,
      b2b_cost: finalData.b2bCost,
      partner_profit: finalData.partnerProfit,
      coupon_id:
        appliedCoupon && !appliedCoupon.error ? appliedCoupon.id : null,
      partner_id:
        appliedCoupon && !appliedCoupon.error ? appliedCoupon.partner_id : null,
    };

    addToCart(cartItem);

    setIsProcessing(false);
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      setIsCartOpen(true);
    }, 1500);
  };

  if (!product || variations.length === 0)
    return <div className="p-20 text-center">商品不存在或無變體</div>;

  return (
    <PartnerLayout
      store={store}
      title={product.name}
      description={product.description}
    >
      <div className="bg-white min-h-screen">
        {/* 🌟 核心排版重構：雙欄設計，左邊圖片固定，右邊表單 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 flex flex-col lg:flex-row gap-12 lg:items-start">
          {/* 🌟 左側：商品大圖 (Sticky 滾動跟隨) */}
          <div className="w-full lg:w-[55%] lg:sticky lg:top-28">
            <div className="aspect-[4/5] sm:aspect-square  flex items-center justify-center  relative overflow-hidden group">
              <img
                src="https://images.unsplash.com/photo-1480796927426-f609979314bd?q=80&w=800&auto=format&fit=crop"
                alt={product.name}
                className="w-full h-full object-cover  transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute top-6 left-6 bg-yellow-400 text-yellow-900 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                熱銷冠軍
              </div>
            </div>

            {/* 保障說明 (移至圖片下方，更符合歐美電商排版) */}
            <div className="mt-8 hidden lg:block">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />{" "}
                官方授權品質保證
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed font-light">
                本店所有 eSIM 方案皆由官方授權提供，訂單完成後 QR Code
                將立即發送至您的信箱。免除實體物流等待，隨買即用，享受無縫連接的高速上網體驗。支援
                24 小時專人線上客服。
              </p>
            </div>
          </div>

          {/* 🌟 右側：商品資訊與「外框整合型」選購表單 */}
          <div className="w-full lg:w-[45%] flex flex-col">
            {/* 標題與評價區 */}
            <div className="mb-6">
              <div className="flex items-center gap-1 text-yellow-400 mb-3">
                <span>★★★★★</span>
                <span className="text-sm text-gray-500 ml-2 font-medium underline cursor-pointer">
                  4.9 (5,488 評價)
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-black text-gray-900 leading-[1.1] tracking-tight mb-4">
                {product.name}
              </h1>
              <p className="text-[15px] text-gray-500 font-light leading-relaxed">
                {product.description ||
                  "提供最穩定、快速的高品質網路服務，為您的旅程帶來無縫連接。直接於手機設定，免拔原卡。"}
              </p>
            </div>

            {/* 🌟 核心選購卡片 (參照 Love Wellness / Dr. Squatch) */}
            <div className="border border-gray-200 rounded-[1.5rem] bg-white shadow-sm overflow-hidden mt-2">
              {/* 價格標頭 */}
              <div className="bg-[#222844] p-6 border-b border-gray-200 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-50 uppercase tracking-widest">
                  選擇方案
                </span>
                <div className="text-right">
                  {finalData.discountAmount > 0 && (
                    <span className="text-sm text-gray-400 line-through mr-2">
                      NT$ {originalPrice}
                    </span>
                  )}
                  <span className="text-2xl font-black text-gray-50">
                    NT$ {finalData.finalPrice}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* 1. 電信商 */}
                <div>
                  <h3 className="text-[13px] font-bold text-gray-900 mb-3 uppercase tracking-wider">
                    選擇電信商 <span className="text-red-500">*</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {availableTelecoms.map((tel) => (
                      <button
                        key={tel}
                        onClick={() => setSelectedTelecom(tel)}
                        className={`py-3 px-4 rounded-xl border text-sm font-bold text-left flex justify-between items-center transition-all ${
                          selectedTelecom === tel
                            ? "border-[#0064e0] bg-[#0064e0]/5 text-[#0064e0] ring-1 ring-[#0064e0]"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {tel}
                        {selectedTelecom === tel && (
                          <CheckCircleIcon className="w-5 h-5 text-[#0064e0]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. 數據流量 */}
                <div>
                  <h3 className="text-[13px] font-bold text-gray-900 mb-3 uppercase tracking-wider">
                    數據流量 <span className="text-red-500">*</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {availableDataOptions.map((data) => (
                      <button
                        key={data}
                        onClick={() => setSelectedData(data)}
                        className={`py-3 rounded-xl border text-sm font-bold text-center transition-all ${
                          selectedData === data
                            ? "border-[#0064e0] bg-[#0064e0]/5 text-[#0064e0] ring-1 ring-[#0064e0]"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {data}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. 服務天數 */}
                <div>
                  <h3 className="text-[13px] font-bold text-gray-900 mb-3 uppercase tracking-wider">
                    服務天數 <span className="text-red-500">*</span>
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {availableDaysOptions.map((days) => (
                      <button
                        key={days}
                        onClick={() => setSelectedDays(days)}
                        className={`py-3 rounded-xl border text-[15px] font-black text-center transition-all ${
                          selectedDays === days
                            ? "border-[#0064e0] bg-[#0064e0]/5 text-[#0064e0] ring-1 ring-[#0064e0]"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {days}
                        <span className="text-xs font-normal ml-0.5">天</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 優惠碼區塊 (內嵌設計) */}
              <div className="px-6 pb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-1 flex">
                  <input
                    type="text"
                    placeholder="輸入折扣碼 (選填)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="bg-transparent px-4 py-2 flex-grow focus:outline-none text-sm font-bold uppercase"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={isVerifyingCoupon || !couponCode}
                    className="bg-gray-200 text-stone-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-300 transition-colors"
                  >
                    {isVerifyingCoupon ? "..." : "套用"}
                  </button>
                </div>
                {appliedCoupon && appliedCoupon.error && (
                  <p className="text-red-500 text-xs font-bold mt-2 ml-2">
                    {appliedCoupon.error}
                  </p>
                )}
                {appliedCoupon && !appliedCoupon.error && (
                  <p className="text-emerald-600 text-xs font-bold mt-2 ml-2 flex items-center gap-1">
                    <CheckCircleIcon className="w-4 h-4" /> 折抵 NT${" "}
                    {Math.round(finalData.discountAmount)}
                  </p>
                )}
              </div>

              <div className="px-6 pb-2">
                <EsimRefundDisclosure compact />
              </div>

              {/* 🌟 數量與加入購物車 (底部固定區塊) */}
              <div className="p-6 border-t border-gray-200 bg-white flex flex-col sm:flex-row gap-4">
                {/* 數量選擇器 */}
                <div className="flex items-center justify-between border border-gray-300 rounded-xl px-3 py-3 sm:w-[120px] shrink-0">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="text-gray-400 hover:text-gray-900"
                  >
                    <MinusIcon className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-gray-900 select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="text-gray-400 hover:text-gray-900"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* 加入購物車按鈕 (全寬強烈色彩) */}
                <button
                  onClick={handleAddToCart}
                  disabled={isProcessing || isSuccess || !currentVariant}
                  className={`flex-grow py-4 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50
                    ${
                      isSuccess
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-[#0064e0] text-white hover:bg-[#0054bd]"
                    }
                  `}
                >
                  {isProcessing ? (
                    "處理中..."
                  ) : isSuccess ? (
                    <>
                      <CheckCircleIcon className="w-5 h-5" /> 已加入購物車
                    </>
                  ) : (
                    <>加入購物車 - NT$ {finalData.finalPrice * quantity}</>
                  )}
                </button>
              </div>
            </div>

            {/* 行動版保障說明 */}
            <div className="mt-8 block lg:hidden">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />{" "}
                官方品質保證
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed font-light">
                支援多數新型手機，付款後立即發送 QR Code，免等待物流。
              </p>
            </div>
          </div>
        </main>
      </div>
    </PartnerLayout>
  );
}

export async function getServerSideProps(context) {
  const { partnerSlug, productId } = context.params;
  const db = getSupabaseAdminServer();
  const { data: store } = await db
    .from("stores")
    .select("*")
    .eq("domain", partnerSlug)
    .eq("status", "active")
    .single();

  if (!store) return { notFound: true };

  const { data: storeProduct } = await db
    .from("store_products")
    .select(
      `
      custom_prices, 
      products ( id, name, description, product_variations ( id, sku, b2b_price, attributes ) )
    `,
    )
    .eq("store_id", store.id)
    .eq("product_id", productId)
    .single();

  if (!storeProduct) return { notFound: true };

  return {
    props: {
      store,
      product: {
        id: storeProduct.products.id,
        name: storeProduct.products.name,
        description: storeProduct.products.description,
      },
      variations: storeProduct.products.product_variations,
      customPrices: storeProduct.custom_prices || {},
    },
  };
}
