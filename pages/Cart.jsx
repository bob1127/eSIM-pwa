"use client";

import { useCart } from "../components/context/CartContext";
import Layout from "./Layout";
import Link from "next/link";
import SwiperCard from "../components/SwiperCarousel/AnotherProduct";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import CheckoutForm from "../components/CheckoutForm";
import EsimRefundDisclosure from "../components/legal/EsimRefundDisclosure";
import StepLabel from "@mui/material/StepLabel";
import Box from "@mui/material/Box";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/components/context/UserContext";

// --- Icons ---
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

const steps = ["購物車", "填寫資料", "付款完成"];

function getCartItemHref(item) {
  if (item?.href) return item.href;
  if (item?.categorySlug && item?.slug) {
    return `/product/${item.categorySlug}/${item.slug}`;
  }
  if (item?.slug) return `/product/${item.slug}`;
  return null;
}

function CartItemThumb({ item, size = "md" }) {
  const href = getCartItemHref(item);
  const src = item?.image || "/images/jeko-esim.png";
  const box =
    size === "sm"
      ? "w-14 h-14 rounded-lg"
      : "w-full md:w-[150px] rounded-lg";
  const img = (
    <div
      className={`${box} flex-shrink-0 overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center`}
    >
      <img
        src={src}
        alt={item?.name || "商品"}
        className="w-full h-full object-contain p-1"
      />
    </div>
  );
  if (!href) return img;
  return (
    <Link
      href={href}
      className="block hover:opacity-80 transition-opacity"
      title="返回商品頁"
    >
      {img}
    </Link>
  );
}

const CartPage = () => {
  const { updateQuantity, removeFromCart, cartId, esimItems, esimTotal } =
    useCart();
  const displayItems = esimItems || [];
  const displayTotal = esimTotal || 0;
  const { user, token } = useUser();
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();
  const isLoggedIn = Boolean(user || nextAuthSession?.user);
  const authReady = nextAuthStatus !== "loading";

  const [activeStep, setActiveStep] = useState(0);
  // 🌟 已修正：移除 <number | null> 型別標註
  const [removingIndex, setRemovingIndex] = useState(null);

  const [promoOpen, setPromoOpen] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [needLineFriend, setNeedLineFriend] = useState(false);
  const [lineOaUrl, setLineOaUrl] = useState(
    process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@391huuts",
  );
  const [welcomeHint, setWelcomeHint] = useState("");

  const payableTotal = Math.max(0, Number(displayTotal || 0) - Number(discount || 0));

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  // 登入會員：自動領歡迎禮；未加 LINE 顯示引導；已加則自動套用
  // 注意：即使尚無 Medusa cartId，也要先顯示優惠券／加 LINE 引導
  useEffect(() => {
    if (activeStep !== 1) return undefined;
    if (!authReady || !isLoggedIn || appliedCode) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/promo/member-coupons", {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || !data.success) {
          setPromoOpen(true);
          setCouponMessage(
            data.error ||
              "無法讀取會員優惠券，請確認資料表已建立後重新整理",
          );
          return;
        }

        if (data.line_oa_url) setLineOaUrl(data.line_oa_url);

        const welcomeCode = data.welcome_coupon?.code;
        if (welcomeCode) {
          setWelcomeHint(welcomeCode);
          setCoupon(welcomeCode);
          setPromoOpen(true);
        }

        if (data.need_line_for_welcome) {
          setNeedLineFriend(true);
          setPromoOpen(true);
          setCouponMessage("");
          return;
        }

        // 尚無券也打開區塊，方便手動輸入
        if (!welcomeCode) {
          setPromoOpen(true);
        }

        if (data.can_use_welcome && welcomeCode && cartId) {
          setNeedLineFriend(false);
          setIsApplyingCoupon(true);
          try {
            const applyRes = await fetch("/api/checkout/promotion", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              credentials: "include",
              body: JSON.stringify({
                cartId,
                code: welcomeCode,
                action: "apply",
              }),
            });
            const applyData = await applyRes.json().catch(() => ({}));
            if (cancelled) return;
            if (applyData.need_line_friend) {
              setNeedLineFriend(true);
              setPromoOpen(true);
              if (applyData.line_oa_url) setLineOaUrl(applyData.line_oa_url);
              return;
            }
            if (applyRes.ok && applyData.success) {
              const raw = Number(applyData.discount_total || 0);
              const asYen = raw >= 1000 ? Math.round(raw / 100) : raw;
              setDiscount(asYen);
              setAppliedCode(applyData.code || welcomeCode);
              setCouponMessage(
                `已自動套用新會員折價券 ${applyData.code || welcomeCode}`,
              );
              setPromoOpen(true);
            } else if (applyData.error) {
              setCouponMessage(applyData.error);
              setPromoOpen(true);
            }
          } finally {
            if (!cancelled) setIsApplyingCoupon(false);
          }
        } else if (data.can_use_welcome && welcomeCode && !cartId) {
          setPromoOpen(true);
          setCouponMessage(
            `已領取折價券 ${welcomeCode}，購物車連線後可自動套用`,
          );
        }
      } catch (e) {
        console.warn("[Cart] 歡迎禮自動套用略過:", e.message);
        if (!cancelled) {
          setPromoOpen(true);
          setCouponMessage(e.message || "優惠券載入失敗");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, authReady, isLoggedIn, token, cartId]);

  const handleApplyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    if (!cartId) {
      setCouponMessage("購物車尚未與伺服器連線，請稍候再試");
      setPromoOpen(true);
      return;
    }
    setIsApplyingCoupon(true);
    setCouponMessage("");
    setNeedLineFriend(false);
    try {
      const res = await fetch("/api/checkout/promotion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ cartId, code, action: "apply" }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.need_line_friend) {
        setDiscount(0);
        setAppliedCode(null);
        setNeedLineFriend(true);
        setPromoOpen(true);
        if (data.line_oa_url) setLineOaUrl(data.line_oa_url);
        setCouponMessage(
          data.error ||
            "尚未確認官方 LINE 好友。請加入後點「我已加入，重新檢查」；若仍失敗請登出再以 LINE 重新登入。",
        );
        return;
      }
      if (!res.ok || !data.success) {
        setDiscount(0);
        setAppliedCode(null);
        setCouponMessage(data.error || "折扣碼無效");
        return;
      }
      const raw = Number(data.discount_total || 0);
      const asYen = raw >= 1000 ? Math.round(raw / 100) : raw;
      setNeedLineFriend(false);
      setDiscount(asYen);
      setAppliedCode(data.code || code.toUpperCase());
      setCouponMessage(`已套用折扣碼 ${data.code || code.toUpperCase()}`);
    } catch (err) {
      setDiscount(0);
      setAppliedCode(null);
      setCouponMessage(err.message || "折扣碼套用失敗");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (!cartId || !appliedCode) return;
    setIsApplyingCoupon(true);
    try {
      await fetch("/api/checkout/promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cartId, action: "remove" }),
      });
    } catch {
      /* ignore */
    } finally {
      setDiscount(0);
      setAppliedCode(null);
      setCoupon("");
      setCouponMessage("");
      setNeedLineFriend(false);
      setIsApplyingCoupon(false);
    }
  };

  // 🌟 已修正：移除參數的 :number, :string 等型別標註
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
        className="bg-[#f9f9f9] min-h-screen pb-20"
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          {/* Stepper 區塊 */}
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
            {/* ========================================== */}
            {/* STEP 0: 購物車列表 */}
            {/* ========================================== */}
            {activeStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full bg-white p-8 rounded-2xl shadow-sm"
              >
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900">
                    購物車 ({displayItems.length})
                  </h1>
                </div>

                {displayItems.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-xl text-gray-600 mb-4">
                      您的購物車是空的
                    </p>
                    <Link href="/" className="text-blue-600 hover:underline">
                      繼續選購商品
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-12">
                    {/* 左側：商品列表 */}
                    <div className="w-full lg:w-[65%] space-y-8">
                      {displayItems.map((item, index) => (
                        <motion.div
                          key={`${item.id}-${item.color}-${item.size}`}
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`flex flex-col md:flex-row gap-6 border-b border-gray-200 pb-8 ${
                            removingIndex === index ? "opacity-50" : ""
                          }`}
                        >
                          {/* 圖片區塊 */}
                          <CartItemThumb item={item} size="md" />

                          {/* 商品資訊區 */}
                          <div className="flex-grow">
                            <div className="flex justify-between items-start mb-2">
                              <h2 className="text-lg font-bold text-gray-900">
                                {getCartItemHref(item) ? (
                                  <Link
                                    href={getCartItemHref(item)}
                                    className="hover:text-blue-600 transition-colors"
                                  >
                                    {item.name}
                                  </Link>
                                ) : (
                                  item.name
                                )}
                              </h2>
                              <p className="text-lg font-bold text-gray-900">
                                ${item.price}
                              </p>
                            </div>

                            <p className="text-gray-500 text-sm mb-4">
                              {item.specLabel || item.options || item.color}
                            </p>

                            <div className="bg-[#f5f6f7] rounded-md p-4 mb-4">
                              <div className="flex items-start text-sm text-gray-800">
                                <TruckIcon />
                                <span>
                                  結帳完成後，預計5分鐘內將QRcode寄至您的信箱
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-between items-end mt-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-stone-900">
                                  數量：
                                </span>
                                <div className="flex items-center border border-gray-300 rounded-md">
                                  <button
                                    className="px-3 py-1 hover:bg-gray-100"
                                    onClick={() =>
                                      updateQuantity(
                                        item.id,
                                        item.color,
                                        item.size,
                                        item.quantity - 1,
                                      )
                                    }
                                    disabled={item.quantity <= 1}
                                  >
                                    -
                                  </button>
                                  <span className="px-3 text-sm">
                                    {item.quantity}
                                  </span>
                                  <button
                                    className="px-3 py-1 hover:bg-gray-100"
                                    onClick={() =>
                                      updateQuantity(
                                        item.id,
                                        item.color,
                                        item.size,
                                        item.quantity + 1,
                                      )
                                    }
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              <button
                                className="text-red-500 text-sm font-medium hover:underline"
                                onClick={() =>
                                  handleRemoveWithAnimation(
                                    index,
                                    item.id,
                                    item.color,
                                    item.size,
                                  )
                                }
                              >
                                移除
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* 右側：訂單摘要 (Step 0) */}
                    <div className="w-full lg:w-[35%]">
                      <div className="sticky top-24 border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
                        <h3 className="text-xl font-bold mb-6 text-gray-900">
                          訂單摘要
                        </h3>

                        <div className="space-y-4 mb-6 text-sm">
                          <div className="flex justify-between text-gray-600">
                            <span>商品小計</span>
                            <span className="font-medium text-gray-900">
                              ${displayTotal}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>運費</span>
                            <span className="text-green-600 font-medium">
                              免運費
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 my-4 pt-4">
                          <div className="flex justify-between items-center mb-6">
                            <span className="text-lg font-bold text-gray-900">
                              總計
                            </span>
                            <span className="text-2xl font-bold text-gray-900">
                              ${displayTotal}
                            </span>
                          </div>

                          <button
                            onClick={handleNext}
                            className="w-full bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-bold py-3.5 px-6 rounded-lg transition-colors text-lg"
                          >
                            前往結帳
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ========================================== */}
            {/* STEP 1: 填寫資料 (Bluehost 風格雙欄設計) */}
            {/* ========================================== */}
            {activeStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full flex flex-col lg:flex-row gap-8"
              >
                {/* 🌟 左側：結帳表單 (CheckoutForm) */}
                <div className="w-full lg:w-[65%]">
                  <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-gray-900">
                      結帳
                    </h2>
                    <button
                      onClick={handleBack}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      &larr; 返回修改購物車
                    </button>
                  </div>

                  <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
                    <CheckoutForm onBack={handleBack} hideSubmitButton={true} />
                  </div>
                </div>

                {/* 🌟 右側：固定明細卡片 (Bluehost 風格) */}
                <div className="w-full lg:w-[35%]">
                  <div className="sticky top-24">
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">
                      購物明細
                    </h3>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      {/* 購物車商品明細 */}
                      <div className="p-6 space-y-6">
                        {displayItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-start border-b border-gray-100 pb-4 last:border-0 last:pb-0 gap-3"
                          >
                            <div className="flex gap-3 min-w-0 flex-1 pr-2">
                              <CartItemThumb item={item} size="sm" />
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-gray-900 leading-tight mb-1">
                                  {getCartItemHref(item) ? (
                                    <Link
                                      href={getCartItemHref(item)}
                                      className="hover:text-blue-600 transition-colors"
                                    >
                                      {item.name}
                                    </Link>
                                  ) : (
                                    item.name
                                  )}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  規格:{" "}
                                  {item.specLabel || item.options || item.color}
                                  <br />
                                  數量: {item.quantity}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-bold text-gray-900">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 金額加總區塊 (灰底) */}
                      <div className="bg-gray-50 p-6 border-t border-gray-200">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>商品小計</span>
                          <span className="font-medium text-gray-900">
                            ${displayTotal}
                          </span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-sm text-emerald-600 mb-2">
                            <span>折扣{appliedCode ? `（${appliedCode}）` : ""}</span>
                            <span className="font-medium">－${discount}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm text-gray-600 mb-4 pb-4 border-b border-gray-200">
                          <span>稅金</span>
                          <span className="font-medium text-gray-900">
                            $0.00
                          </span>
                        </div>

                        <div className="flex justify-between items-center mb-6">
                          <span className="text-base font-bold text-gray-900">
                            應付總額
                          </span>
                          <span className="text-2xl font-bold text-gray-900">
                            ${payableTotal}
                          </span>
                        </div>

                        <div className="mb-6">
                          {!promoOpen ? (
                            <button
                              type="button"
                              onClick={() => setPromoOpen(true)}
                              className="text-sm text-blue-600 font-medium hover:underline"
                            >
                              使用折扣碼
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={coupon}
                                  onChange={(e) => setCoupon(e.target.value)}
                                  placeholder="輸入折扣碼"
                                  disabled={Boolean(appliedCode)}
                                  className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                                />
                                <button
                                  type="button"
                                  onClick={
                                    appliedCode
                                      ? handleRemoveCoupon
                                      : handleApplyCoupon
                                  }
                                  disabled={
                                    isApplyingCoupon ||
                                    (!appliedCode && !coupon.trim())
                                  }
                                  className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                  {isApplyingCoupon
                                    ? "…"
                                    : appliedCode
                                      ? "移除"
                                      : "套用"}
                                </button>
                              </div>

                              {needLineFriend && (
                                <div className="rounded-xl border border-[#06C755]/35 bg-[#06C755]/10 px-3.5 py-3">
                                  <p className="text-[13px] font-bold text-slate-800 leading-snug">
                                    還未加入官方 LINE？
                                  </p>
                                  <p className="mt-1 text-[12px] text-slate-600 leading-relaxed">
                                    加入官方 LINE 即可立即使用新會員 50
                                    元優惠折扣
                                    {welcomeHint
                                      ? `（已入帳：${welcomeHint}）`
                                      : ""}
                                  </p>
                                  <div className="mt-2.5 flex flex-col gap-2">
                                    <a
                                      href={lineOaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white text-[12px] font-bold px-4 py-2"
                                    >
                                      加入官方 LINE 立即使用優惠折扣
                                    </a>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        setIsApplyingCoupon(true);
                                        setCouponMessage("");
                                        try {
                                          const res = await fetch(
                                            "/api/promo/member-coupons",
                                            {
                                              headers: {
                                                ...(token
                                                  ? {
                                                      Authorization: `Bearer ${token}`,
                                                    }
                                                  : {}),
                                              },
                                              credentials: "include",
                                            },
                                          );
                                          const data = await res
                                            .json()
                                            .catch(() => ({}));
                                          if (data.line_oa_url) {
                                            setLineOaUrl(data.line_oa_url);
                                          }
                                          if (data.need_line_for_welcome) {
                                            setNeedLineFriend(true);
                                            setCouponMessage(
                                              data.line_check_reason ===
                                                "no_login_bot_linked"
                                                ? "系統無法驗證好友：LINE Login 頻道尚未在 Developers 後台連結官方帳號。請到 LINE Developers → LINE Login → Linked LINE Official Account 連結同一個官方帳號後再試。"
                                                : "尚未偵測到官方 LINE 好友。請確認已加好友，並以 LINE 登入本站後再試。",
                                            );
                                            return;
                                          }
                                          setNeedLineFriend(false);
                                          const code =
                                            data.welcome_coupon?.code ||
                                            coupon.trim();
                                          if (code) {
                                            setCoupon(code);
                                            setWelcomeHint(code);
                                          }
                                          if (
                                            data.can_use_welcome &&
                                            code &&
                                            cartId
                                          ) {
                                            const applyRes = await fetch(
                                              "/api/checkout/promotion",
                                              {
                                                method: "POST",
                                                headers: {
                                                  "Content-Type":
                                                    "application/json",
                                                  ...(token
                                                    ? {
                                                        Authorization: `Bearer ${token}`,
                                                      }
                                                    : {}),
                                                },
                                                credentials: "include",
                                                body: JSON.stringify({
                                                  cartId,
                                                  code,
                                                  action: "apply",
                                                }),
                                              },
                                            );
                                            const applyData = await applyRes
                                              .json()
                                              .catch(() => ({}));
                                            if (applyData.need_line_friend) {
                                              setNeedLineFriend(true);
                                              if (applyData.line_oa_url) {
                                                setLineOaUrl(
                                                  applyData.line_oa_url,
                                                );
                                              }
                                              setCouponMessage(
                                                "尚未偵測到官方 LINE 好友。請確認已加好友，並以 LINE 登入本站後再試。",
                                              );
                                              return;
                                            }
                                            if (
                                              applyRes.ok &&
                                              applyData.success
                                            ) {
                                              const raw = Number(
                                                applyData.discount_total || 0,
                                              );
                                              const asYen =
                                                raw >= 1000
                                                  ? Math.round(raw / 100)
                                                  : raw;
                                              setDiscount(asYen);
                                              setAppliedCode(
                                                applyData.code || code,
                                              );
                                              setCouponMessage(
                                                `已自動套用新會員折價券 ${applyData.code || code}`,
                                              );
                                            } else {
                                              setCouponMessage(
                                                applyData.error ||
                                                  "已確認為官方 LINE 好友，請點「套用」使用折扣碼。",
                                              );
                                            }
                                          } else {
                                            setCouponMessage(
                                              "已確認為官方 LINE 好友，請點「套用」使用折扣碼。",
                                            );
                                          }
                                        } catch (e) {
                                          setCouponMessage(
                                            e.message || "重新檢查失敗",
                                          );
                                        } finally {
                                          setIsApplyingCoupon(false);
                                        }
                                      }}
                                      disabled={isApplyingCoupon}
                                      className="text-[12px] font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 disabled:opacity-50"
                                    >
                                      我已加入，重新檢查
                                    </button>
                                  </div>
                                </div>
                              )}

                              {couponMessage && (
                                <p
                                  className={`text-[12px] ${
                                    appliedCode
                                      ? "text-emerald-600"
                                      : needLineFriend
                                        ? "text-amber-700"
                                        : "text-red-500"
                                  }`}
                                >
                                  {couponMessage}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mb-4">
                          <EsimRefundDisclosure compact />
                        </div>

                        {/* 同意條款 Checkbox */}
                        <label className="flex items-start gap-2 mb-6 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            required
                          />
                          <span className="text-xs text-gray-600 leading-tight">
                            我同意{" "}
                            <Link
                              href="/terms"
                              className="text-blue-600 hover:underline"
                              target="_blank"
                            >
                              服務條款
                            </Link>
                            、
                            <Link
                              href="/refund-policy"
                              className="text-blue-600 hover:underline"
                              target="_blank"
                            >
                              退換貨政策
                            </Link>
                            ，並確認 eSIM
                            為數位商品，掃描開通後即無法退款（除政策例外）。
                          </span>
                        </label>

                        {/* 付款方式：LINE Pay / 藍新金流 */}
                        <p className="text-xs text-center text-gray-500 mb-3">
                          選擇付款方式
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              window.dispatchEvent(
                                new CustomEvent("esim-checkout-linepay"),
                              );
                            }}
                            className="w-full bg-[#00C300] hover:bg-[#009f00] text-white font-bold py-3.5 px-4 rounded-md transition-colors text-base"
                          >
                            LINE Pay 結帳
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const formElement =
                                document.getElementById("checkout-form");
                              if (
                                formElement &&
                                typeof formElement.requestSubmit === "function"
                              ) {
                                formElement.requestSubmit();
                              } else {
                                alert("無法送出表單，請重新整理頁面後再試");
                              }
                            }}
                            className="w-full bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-bold py-3.5 px-4 rounded-md transition-colors text-base"
                          >
                            藍新金流結帳
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================== */}
            {/* STEP 2: 完成訂單 */}
            {/* ========================================== */}
            {activeStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-white rounded-2xl shadow-sm"
              >
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  付款完成！
                </h2>
                <p className="text-gray-600 mb-8">
                  感謝您的購買。eSIM 相關資訊將寄至您的
                  Email，亦可至會員中心查詢訂單。
                </p>
                <Link
                  href="/"
                  className="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition"
                >
                  回到首頁
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="max-w-[1400px] mx-auto mt-20 pt-10 border-t border-gray-200 px-4 md:px-8">
          <SwiperCard />
        </div>
      </motion.div>
    </Layout>
  );
};

export default CartPage;
