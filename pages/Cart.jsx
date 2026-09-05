"use client";

import { useCart } from "../components/context/CartContext";
import Layout from "./Layout";
import Link from "next/link";
import CartRelatedEsimCarousel from "../components/SwiperCarousel/AnotherProduct";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import CheckoutForm from "../components/CheckoutForm";
import EsimRefundDisclosure from "../components/legal/EsimRefundDisclosure";
import StepLabel from "@mui/material/StepLabel";
import Box from "@mui/material/Box";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/components/context/UserContext";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";
import { PENDING_COUPON_KEY } from "@/lib/partnerReferralDiscount";
import { useLineBind } from "@/hooks/useLineBind";
import { clientWarn } from "@/lib/clientLogger";
import { maybeMarkWelcomeGiftOnFirstClaim } from "@/lib/welcomeGiftPopup";
import { buildLoginUrl } from "@/lib/authRedirect";
import {
  consumeWelcomeVerifyPendingFlag,
  getLineIdTokenForWelcomeCheckout,
  isWelcomeCouponCode,
} from "@/lib/lineWelcomeCheckoutClient";
import JekoPillButton from "@/components/ui/JekoPillButton";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {
  readPendingPayment,
  clearPendingPayment,
  isPendingPaymentActive,
} from "@/lib/checkoutPendingPayment";

const CART_STEP_KEY = "jeko_cart_active_step";

function clampCartStep(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(2, Math.trunc(v)));
}

/** 折扣券卡片顯示名（中文短標，不暴露完整碼） */
function couponCardLabel(coupon) {
  if (!coupon) return "折扣券";
  const amount = Number(coupon.amount) || 0;
  const source = String(coupon.source || "");
  const raw = String(coupon.label || "").trim();
  const code = String(coupon.code || "");

  if (
    source === "welcome" ||
    isWelcomeCouponCode(code) ||
    /新會員|welcome/i.test(raw)
  ) {
    return amount > 0 ? `新會員折${amount}` : "新會員折價券";
  }
  if (source === "lottery" || /^JEKO-LOT-/i.test(code)) {
    return amount > 0 ? `抽獎折${amount}` : raw || "抽獎折價券";
  }
  if (raw) return raw.length > 20 ? `${raw.slice(0, 20)}…` : raw;
  if (amount > 0) return `折${amount}`;
  return "折扣券";
}

function normalizePromoCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function isSameCouponCard(coupon, appliedSourceCode, appliedCode) {
  const card = normalizePromoCode(coupon?.code);
  if (!card) return false;
  const source = normalizePromoCode(appliedSourceCode);
  const applied = normalizePromoCode(appliedCode);
  if (source && source === card) return true;
  if (applied && applied === card) return true;
  return false;
}

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
      : "w-[88px] h-[88px] md:w-[150px] md:h-[150px] shrink-0 rounded-lg";
  const img = (
    <div
      className={`${box} flex-shrink-0 overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center`}
    >
      <img
        src={src}
        alt={item?.name || "商品"}
        className="h-full w-full object-contain p-1.5 md:p-2"
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
  const { updateQuantity, removeFromCart, cartId, esimItems, esimTotal, rebuildMedusaCartFromLocal } =
    useCart();
  const displayItems = esimItems || [];
  const displayTotal = esimTotal || 0;
  const { user, token } = useUser();
  const router = useRouter();
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();
  const isLoggedIn = Boolean(user || nextAuthSession?.user);
  const authReady = nextAuthStatus !== "loading";

  const [activeStep, setActiveStep] = useState(0);
  const [stepReady, setStepReady] = useState(false);
  // 🌟 已修正：移除 <number | null> 型別標註
  const [removingIndex, setRemovingIndex] = useState(null);

  const [promoOpen, setPromoOpen] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState(null);
  /** 會員個人碼（JEKO-WELCOME-…），與 Medusa 內部碼可能不同 */
  const [appliedSourceCode, setAppliedSourceCode] = useState(null);
  const [appliedLabel, setAppliedLabel] = useState("");
  const [memberCoupons, setMemberCoupons] = useState([]);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [needLineFriend, setNeedLineFriend] = useState(false);
  const [needLineVerify, setNeedLineVerify] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const couponApplyLockRef = useRef(false);
  const [lineOaUrl, setLineOaUrl] = useState(
    process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn",
  );
  const [welcomeHint, setWelcomeHint] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(null); // null | "linepay" | "newebpay"
  const [pendingPayment, setPendingPayment] = useState(null);
  const [linePayCancelNotice, setLinePayCancelNotice] = useState(false);
  const [pendingBusy, setPendingBusy] = useState(false);
  /** 首單券未套用卻按結帳：白底警示 */
  const [welcomeFirstOrderWarn, setWelcomeFirstOrderWarn] = useState(null); // null | { method }
  const checkoutPreparedCartRef = useRef(null);

  const payableTotal = Math.max(0, Number(displayTotal || 0) - Number(discount || 0));
  // LINE Pay 已改為「付款成功才建單」：未付款返回不阻擋結帳、不顯示等待付款橫幅。
  // 藍新 ATM／匯款仍會先建單，不走這段 linepay pending UI。
  const linePayPendingActive = false;
  const checkoutBlocked = Boolean(paymentBusy || pendingBusy);

  const pendingWelcomeCoupon = useMemo(() => {
    return (
      memberCoupons.find(
        (c) =>
          c &&
          c.status === "available" &&
          (c.source === "welcome" || isWelcomeCouponCode(c.code)),
      ) || null
    );
  }, [memberCoupons]);

  const welcomeCouponApplied = Boolean(
    pendingWelcomeCoupon &&
      isSameCouponCard(pendingWelcomeCoupon, appliedSourceCode, appliedCode) &&
      discount > 0,
  );

  const requestCheckoutPayment = useCallback((method) => {
    if (method !== "linepay" && method !== "newebpay") return;
    if (
      pendingWelcomeCoupon &&
      !welcomeCouponApplied &&
      !checkoutBlocked &&
      termsAccepted
    ) {
      setWelcomeFirstOrderWarn({ method });
      return;
    }
    window.dispatchEvent(
      new CustomEvent(
        method === "linepay"
          ? "esim-checkout-linepay"
          : "esim-checkout-newebpay",
      ),
    );
  }, [
    pendingWelcomeCoupon,
    welcomeCouponApplied,
    checkoutBlocked,
    termsAccepted,
  ]);

  const confirmCheckoutWithoutWelcome = useCallback(() => {
    const method = welcomeFirstOrderWarn?.method;
    setWelcomeFirstOrderWarn(null);
    if (!method) return;
    window.dispatchEvent(
      new CustomEvent(
        method === "linepay"
          ? "esim-checkout-linepay"
          : "esim-checkout-newebpay",
      ),
    );
  }, [welcomeFirstOrderWarn]);


  useEffect(() => {
    setPendingPayment(readPendingPayment());
  }, []);

  // 進入「填寫資料」步驟時預先套用免運 + 暖方案快取（按 LINE Pay 時少 1～2 次 Medusa 往返）
  useEffect(() => {
    if (activeStep !== 1 || !cartId) return;
    if (checkoutPreparedCartRef.current === cartId) return;
    checkoutPreparedCartRef.current = cartId;

    const ctrl = new AbortController();
    fetch("/api/checkout/prepare-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartId }),
      signal: ctrl.signal,
    }).catch(() => {});

    return () => ctrl.abort();
  }, [activeStep, cartId]);

  const handleDismissPendingPayment = async () => {
    setPendingBusy(true);
    try {
      clearPendingPayment();
      await rebuildMedusaCartFromLocal();
      setPendingPayment(null);
      setLinePayCancelNotice(false);
    } finally {
      setPendingBusy(false);
    }
  };

  const handleViewPendingOrder = () => {
    const no = pendingPayment?.orderNo || pendingPayment?.medusaOrderId;
    if (!no) return;
    router.push(`/thank-you?orderNo=${encodeURIComponent(no)}`);
  };

  useEffect(() => {
    const onBusy = (e) => {
      const detail = e?.detail || {};
      if (detail.active) {
        setPaymentBusy(detail.method === "newebpay" ? "newebpay" : "linepay");
      } else {
        setPaymentBusy(null);
      }
    };
    window.addEventListener("esim-checkout-busy", onBusy);
    return () => window.removeEventListener("esim-checkout-busy", onBusy);
  }, []);

  // 三步驟都在同一 /Cart：用 URL ?step= 與 sessionStorage 記住進度
  // （LINE 授權重載頁面後才能回到「填寫資料」）
  const goToStep = useCallback(
    (step) => {
      const next = clampCartStep(step);
      setActiveStep(next);
      try {
        sessionStorage.setItem(CART_STEP_KEY, String(next));
      } catch {
        /* ignore */
      }
      if (!router.isReady) return;
      const q = { ...router.query };
      if (next <= 0) delete q.step;
      else q.step = String(next);
      router.replace({ pathname: router.pathname, query: q }, undefined, {
        shallow: true,
      });
    },
    [router],
  );

  useEffect(() => {
    if (router.query.linepay !== "cancel") return;
    // 未付款取消／上一頁：保留本機商品，僅清暫存並確保 Medusa cart 可用
    clearPendingPayment();
    setPendingPayment(null);
    setLinePayCancelNotice(false);
    rebuildMedusaCartFromLocal().catch(() => {});
    goToStep(1);
    const q = { ...router.query };
    delete q.linepay;
    q.step = "1";
    router.replace({ pathname: router.pathname, query: q }, undefined, {
      shallow: true,
    });
  }, [router.query.linepay, goToStep, router, rebuildMedusaCartFromLocal]);

  // 藍新／LINE Pay 未完成付款就返回購物車：保留本機商品，重建可用的 Medusa cart
  useEffect(() => {
    let cancelled = false;
    const recoverAbandonedCheckout = async () => {
      try {
        const pending = readPendingPayment();
        if (!pending) return;
        // LINE Pay 未建單：商品本來就在；藍新已 complete cart：必須重建
        if (
          pending.method === "newebpay" ||
          pending.preserveLocalCart ||
          pending.method === "linepay"
        ) {
          if (!cancelled) {
            await rebuildMedusaCartFromLocal();
          }
        }
        if (!cancelled) {
          clearPendingPayment();
          setPendingPayment(null);
        }
      } catch {
        /* ignore */
      }
    };

    recoverAbandonedCheckout();
    const onPageShow = (e) => {
      if (e?.persisted) recoverAbandonedCheckout();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [rebuildMedusaCartFromLocal]);

  useEffect(() => {
    if (!router.isReady) return;
    let next = 0;
    if (router.query.step != null) {
      next = clampCartStep(router.query.step);
    } else {
      try {
        next = clampCartStep(sessionStorage.getItem(CART_STEP_KEY));
      } catch {
        next = 0;
      }
    }
    // 有 line_bind 回呼時，強制至少在結帳步驟
    if (router.query.line_bind && next < 1) next = 1;
    setActiveStep(next);
    setStepReady(true);
    try {
      sessionStorage.setItem(CART_STEP_KEY, String(next));
    } catch {
      /* ignore */
    }
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!stepReady) return;
    try {
      sessionStorage.setItem(CART_STEP_KEY, String(activeStep));
    } catch {
      /* ignore */
    }
  }, [activeStep, stepReady]);

  const recheckWelcomeAfterLineBind = useCallback(async () => {
    setIsApplyingCoupon(true);
    setCouponMessage("");
    try {
      const res = await fetch("/api/promo/member-coupons", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (data.line_oa_url) setLineOaUrl(data.line_oa_url);

      const available = (Array.isArray(data.coupons) ? data.coupons : [])
        .filter((c) => c && c.status === "available" && c.code)
        .slice(0, 20);
      setMemberCoupons(available);

      const code = data.welcome_coupon?.code || coupon.trim();
      if (code) {
        setCoupon(code);
        setWelcomeHint(code);
      }

      if (data.need_line_for_welcome) {
        setNeedLineFriend(true);
        setCouponMessage(
          data.line_friend
            ? "已綁定 LINE，但尚未確認官方帳號好友。請先加入官方 LINE 後再按「套用」。"
            : "請先連結 LINE，並加入官方帳號後才能使用折扣。",
        );
        return;
      }

      setNeedLineFriend(false);
      if (!data.can_use_welcome || !code || !cartId) {
        setCouponMessage("已連結 LINE，請點「套用」使用折扣碼。");
        return;
      }

      const applyRes = await fetch("/api/checkout/promotion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ cartId, code, action: "apply" }),
      });
      const applyData = await applyRes.json().catch(() => ({}));
      if (applyData.need_line_friend) {
        setNeedLineFriend(true);
        if (applyData.line_oa_url) setLineOaUrl(applyData.line_oa_url);
        setCouponMessage(
          applyData.error ||
            "尚未確認官方 LINE 好友。請加入後再試，或到會員中心按「連結 LINE 並啟用優惠」。",
        );
        return;
      }
      if (applyRes.ok && applyData.success) {
        const raw = Number(applyData.discount_total || 0);
        const asYen = raw >= 1000 ? Math.round(raw / 100) : raw;
        const label = couponCardLabel(
          data.welcome_coupon || {
            code,
            amount: 50,
            source: "welcome",
          },
        );
        setDiscount(asYen);
        setAppliedCode(applyData.code || code);
        setAppliedSourceCode(code);
        setAppliedLabel(label);
        setCouponMessage(`已自動套用${label}`);
      } else {
        setCouponMessage(
          applyData.error || "已連結 LINE，請點擊折扣券卡片或按「套用」。",
        );
      }
    } catch (e) {
      setCouponMessage(e.message || "重新檢查失敗");
    } finally {
      setIsApplyingCoupon(false);
    }
  }, [token, coupon, cartId]);

  const {
    status: lineBindStatus,
    message: lineBindMessage,
    bind: bindLine,
  } = useLineBind({
    onSuccess: () => {
      // OAuth 回來後務必回到結帳步驟（填寫資料），不要掉回購物車列表
      goToStep(1);
      recheckWelcomeAfterLineBind();
    },
  });

  const handleNext = () => goToStep(activeStep + 1);
  const handleBack = () => goToStep(activeStep - 1);

  // LINE「前往結帳」?code= 或 ?coupon= → 寫入 pending，交由下方自動套用
  useEffect(() => {
    if (!router.isReady) return;
    const raw =
      (typeof router.query.code === "string" && router.query.code) ||
      (typeof router.query.coupon === "string" && router.query.coupon) ||
      "";
    const normalized = String(raw || "").trim().toUpperCase();
    if (!normalized) return;

    try {
      sessionStorage.setItem(PENDING_COUPON_KEY, normalized);
      sessionStorage.removeItem(`${PENDING_COUPON_KEY}_failed`);
    } catch {
      /* ignore */
    }
    setCoupon(normalized);
    setPromoOpen(true);

    const q = { ...router.query };
    delete q.code;
    delete q.coupon;
    router.replace({ pathname: router.pathname, query: q }, undefined, {
      shallow: true,
    });
  }, [router.isReady, router.query.code, router.query.coupon]); // eslint-disable-line react-hooks/exhaustive-deps

  // 專屬折扣碼連結：從 sessionStorage 自動套用（優先於歡迎禮）
  useEffect(() => {
    if (!cartId || appliedCode || isApplyingCoupon) return undefined;
    let pending = "";
    try {
      pending = sessionStorage.getItem(PENDING_COUPON_KEY) || "";
    } catch {
      return undefined;
    }
    if (!pending) return undefined;

    // 同一碼剛自動套用失敗 → 不要無限重試（使用者仍可手動按套用）
    try {
      if (sessionStorage.getItem(`${PENDING_COUPON_KEY}_failed`) === pending) {
        setCoupon(pending);
        setPromoOpen(true);
        return undefined;
      }
    } catch {
      /* ignore */
    }

    let cancelled = false;
    (async () => {
      setIsApplyingCoupon(true);
      setPromoOpen(true);
      setCoupon(pending);
      try {
        const res = await fetch("/api/checkout/promotion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ cartId, code: pending, action: "apply" }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.success) {
          try {
            sessionStorage.removeItem(PENDING_COUPON_KEY);
            sessionStorage.removeItem(`${PENDING_COUPON_KEY}_failed`);
          } catch {
            /* ignore */
          }
          const raw = Number(data.discount_total || 0);
          const asYen = raw >= 1000 ? Math.round(raw / 100) : raw;
          setDiscount(asYen);
          setAppliedCode(data.code || pending);
          setCouponMessage(
            data.partner_discount_percent
              ? `已自動套用專屬折扣碼 ${data.code || pending}（${data.partner_discount_percent}% off）`
              : `已自動套用折扣碼 ${data.code || pending}`,
          );
        } else if (data.error) {
          try {
            sessionStorage.setItem(`${PENDING_COUPON_KEY}_failed`, pending);
          } catch {
            /* ignore */
          }
          setCouponMessage(data.error);
        }
      } catch (e) {
        if (!cancelled) {
          try {
            sessionStorage.setItem(`${PENDING_COUPON_KEY}_failed`, pending);
          } catch {
            /* ignore */
          }
          setCouponMessage(e.message || "折扣碼套用失敗");
        }
      } finally {
        if (!cancelled) setIsApplyingCoupon(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId, appliedCode, token]);

  // 登入會員：自動領歡迎禮；未加 LINE 顯示引導；已加則自動套用
  // 訪客：折扣區提示「登入後才能套用折扣碼」（加官方 LINE 後仍須登入領券）
  // 注意：即使尚無 Medusa cartId，也要先顯示優惠券／加 LINE 引導
  useEffect(() => {
    if (activeStep !== 1) return undefined;
    if (!authReady) return undefined;

    if (!isLoggedIn) {
      setNeedLogin(true);
      setNeedLineFriend(false);
      setPromoOpen(true);
      setMemberCoupons([]);
      return undefined;
    }

    setNeedLogin(false);
    if (appliedCode) return undefined;
    try {
      if (sessionStorage.getItem(PENDING_COUPON_KEY)) return undefined;
    } catch {
      /* ignore */
    }
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
        if (data.welcome) maybeMarkWelcomeGiftOnFirstClaim(data.welcome);

        const available = (Array.isArray(data.coupons) ? data.coupons : [])
          .filter((c) => c && c.status === "available" && c.code)
          .slice(0, 20);
        setMemberCoupons(available);
        if (available.length > 0) setPromoOpen(true);

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
              setAppliedSourceCode(welcomeCode);
              setAppliedLabel(couponCardLabel(data.welcome_coupon || { code: welcomeCode, amount: 50, source: "welcome" }));
              setCouponMessage(
                `已自動套用${couponCardLabel(data.welcome_coupon || { amount: 50, source: "welcome" })}`,
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
        clientWarn("[Cart] 歡迎禮自動套用略過:", e.message);
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

  const handleApplyCoupon = async ({
    lineIdToken: lineIdTokenOverride,
    code: codeOverride,
    label: labelOverride,
  } = {}) => {
    if (couponApplyLockRef.current) return;
    const code = String(codeOverride ?? coupon).trim();
    if (!code) return;
    if (!cartId) {
      setCouponMessage("購物車尚未與伺服器連線，請稍候再試");
      setPromoOpen(true);
      return;
    }
    couponApplyLockRef.current = true;
    setIsApplyingCoupon(true);
    setCouponMessage("");
    setNeedLineFriend(false);
    setNeedLineVerify(false);
    setCoupon(code);

    const isWelcome = isWelcomeCouponCode(code);
    let lineIdToken = lineIdTokenOverride || null;

    if (!isLoggedIn && isWelcome && !lineIdToken) {
      setNeedLogin(false);
      const lineResult = await getLineIdTokenForWelcomeCheckout();
      if (lineResult.pending) {
        couponApplyLockRef.current = false;
        setIsApplyingCoupon(false);
        return;
      }
      if (!lineResult.ok) {
        setNeedLineVerify(true);
        setPromoOpen(true);
        setCouponMessage(
          lineResult.error ||
            "請先以 LINE 驗證身分（不需註冊會員），才能套用新會員折扣碼",
        );
        couponApplyLockRef.current = false;
        setIsApplyingCoupon(false);
        return;
      }
      lineIdToken = lineResult.idToken;
    }

    if (!isLoggedIn && !isWelcome) {
      setNeedLogin(true);
    }

    try {
      const res = await fetch("/api/checkout/promotion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          cartId,
          code,
          action: "apply",
          ...(lineIdToken ? { lineIdToken } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.need_line_verify) {
        setDiscount(0);
        setAppliedCode(null);
        setAppliedSourceCode(null);
        setAppliedLabel("");
        setNeedLineVerify(true);
        setNeedLogin(false);
        setNeedLineFriend(false);
        setPromoOpen(true);
        if (data.line_oa_url) setLineOaUrl(data.line_oa_url);
        setCouponMessage(
          data.error ||
            "請先以 LINE 驗證身分後才能套用新會員 50 元折扣碼（不需註冊會員）",
        );
        return;
      }
      if (data.need_login || res.status === 401) {
        if (isWelcome) {
          setNeedLineVerify(true);
          setNeedLogin(false);
          setCouponMessage(
            data.error ||
              "請按「用 LINE 驗證並套用」確認身分（不需註冊會員）",
          );
        } else {
          setDiscount(0);
          setAppliedCode(null);
          setAppliedSourceCode(null);
          setAppliedLabel("");
          setNeedLogin(true);
          setNeedLineFriend(false);
          setPromoOpen(true);
          setCouponMessage(data.error || "登入後才能套用折扣碼");
        }
        return;
      }
      if (data.need_line_friend) {
        setDiscount(0);
        setAppliedCode(null);
        setAppliedSourceCode(null);
        setAppliedLabel("");
        setNeedLineFriend(true);
        setNeedLogin(false);
        setPromoOpen(true);
        if (data.line_oa_url) setLineOaUrl(data.line_oa_url);
        setCouponMessage(
          data.error ||
            "尚未確認官方 LINE 好友。請先按「連結 LINE 並啟用優惠」，並確認已加官方帳號後再試。",
        );
        return;
      }
      if (!res.ok || !data.success) {
        setDiscount(0);
        setAppliedCode(null);
        setAppliedSourceCode(null);
        setAppliedLabel("");
        setCouponMessage(data.error || "折扣碼無效");
        if (data.code === "WELCOME_FIRST_ORDER_ONLY") {
          setMemberCoupons((prev) =>
            (prev || []).filter(
              (c) =>
                !(
                  c?.source === "welcome" ||
                  isWelcomeCouponCode(c?.code)
                ),
            ),
          );
        }
        return;
      }
      const raw = Number(data.discount_total || 0);
      const asYen = raw >= 1000 ? Math.round(raw / 100) : raw;
      setNeedLineFriend(false);
      setNeedLineVerify(false);
      if (isLoggedIn) setNeedLogin(false);
      setDiscount(asYen);
      setAppliedCode(data.code || code.toUpperCase());
      setAppliedSourceCode(code.toUpperCase());
      const matched = memberCoupons.find(
        (c) => normalizePromoCode(c.code) === normalizePromoCode(code),
      );
      const label =
        labelOverride ||
        couponCardLabel(matched || { code, amount: asYen, source: isWelcome ? "welcome" : "" });
      setAppliedLabel(label);
      setCouponMessage(`已套用${label}`);
      try {
        sessionStorage.removeItem(PENDING_COUPON_KEY);
        sessionStorage.removeItem(`${PENDING_COUPON_KEY}_failed`);
      } catch {
        /* ignore */
      }
    } catch (err) {
      setDiscount(0);
      setAppliedCode(null);
      setAppliedSourceCode(null);
      setAppliedLabel("");
      setCouponMessage(err.message || "折扣碼套用失敗");
    } finally {
      couponApplyLockRef.current = false;
      setIsApplyingCoupon(false);
    }
  };

  const handleCouponCardClick = async (card) => {
    if (!card?.code || isApplyingCoupon || couponApplyLockRef.current) return;
    setPromoOpen(true);

    if (isSameCouponCard(card, appliedSourceCode, appliedCode)) {
      await handleRemoveCoupon();
      return;
    }

    if (!cartId) {
      setCouponMessage("購物車尚未與伺服器連線，請稍候再試或重新整理頁面");
      return;
    }

    await handleApplyCoupon({
      code: card.code,
      label: couponCardLabel(card),
    });
  };

  // LINE OAuth 訪客驗證回到購物車後自動重試套用
  useEffect(() => {
    if (!router.isReady) return;
    const welcomed = router.query.line_welcome;
    if (welcomed === "0" && router.query.line_welcome_msg) {
      setPromoOpen(true);
      setCouponMessage(String(router.query.line_welcome_msg));
      setNeedLineVerify(true);
      return;
    }
    if (welcomed === "1" || consumeWelcomeVerifyPendingFlag()) {
      setPromoOpen(true);
      setNeedLineVerify(false);
      const code = coupon.trim();
      if (code && cartId && !appliedCode) {
        handleApplyCoupon();
      } else if (code) {
        setCouponMessage("LINE 已驗證，請按「套用」使用折扣碼");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.line_welcome, cartId]);

  const handleRemoveCoupon = async () => {
    if (couponApplyLockRef.current) return;
    if (!cartId || !appliedCode) {
      setDiscount(0);
      setAppliedCode(null);
      setAppliedSourceCode(null);
      setAppliedLabel("");
      setCouponMessage("");
      return;
    }
    couponApplyLockRef.current = true;
    setIsApplyingCoupon(true);
    try {
      const res = await fetch("/api/checkout/promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cartId, action: "remove" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCouponMessage(data.error || "移除折扣失敗，請稍後再試");
      } else {
        setCouponMessage("已解除套用折扣券");
      }
    } catch {
      setCouponMessage("移除折扣時發生網路錯誤，金額已先還原，請確認後再結帳");
    } finally {
      setDiscount(0);
      setAppliedCode(null);
      setAppliedSourceCode(null);
      setAppliedLabel("");
      setNeedLineFriend(false);
      setNeedLineVerify(false);
      couponApplyLockRef.current = false;
      setIsApplyingCoupon(false);
    }
  };

  // 🌟 已修正：移除參數的 :number, :string 等型別標註
  const handleRemoveWithAnimation = (index, id) => {
    setRemovingIndex(index);
    setTimeout(() => {
      removeFromCart(id);
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
        className="bg-[#f9f9f9] pb-4"
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-4 md:pt-10">
          {/* Stepper 區塊 */}
          <Box
            sx={{
              width: "100%",
              mb: { xs: "1.25rem", md: "3rem" },
              "& .MuiStepLabel-label": {
                fontSize: { xs: "0.75rem", md: "0.875rem" },
              },
              "& .MuiStepIcon-root": {
                fontSize: { xs: "1.25rem", md: "1.5rem" },
              },
            }}
          >
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
                className="w-full bg-white p-4 md:p-8 rounded-2xl shadow-sm"
              >
                <div className="mb-4 md:mb-8">
                  <h1 className="text-[22px] md:text-[28px] font-bold text-black leading-[1.35]">
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
                    <div className="w-full lg:w-[65%] space-y-4 md:space-y-8">
                      {displayItems.map((item, index) => (
                        <motion.div
                          key={`${item.id}-${item.color}-${item.size}`}
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`flex flex-row items-start gap-3 border border-slate-200/90 bg-white p-3 md:gap-6 md:border-0 md:border-b md:border-gray-200 md:bg-transparent md:p-0 md:pb-8 ${
                            removingIndex === index ? "opacity-50" : ""
                          }`}
                        >
                          {/* 圖片區塊 — 手機橫條左側小圖 */}
                          <CartItemThumb item={item} size="md" />

                          {/* 商品資訊區 */}
                          <div className="min-w-0 flex-grow">
                            <div className="flex justify-between items-start gap-2 mb-1 md:mb-2">
                              <h2 className="text-[13px] md:text-lg font-bold text-gray-900 leading-snug line-clamp-2">
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
                              <p className="shrink-0 text-[15px] md:text-lg font-bold text-[#0071EB] tabular-nums">
                                ${item.price}
                              </p>
                            </div>

                            <p className="text-[11px] md:text-sm text-[#1E4AD1] font-medium mb-2 md:mb-4 line-clamp-2">
                              {item.specLabel || item.options || item.color}
                            </p>

                            <div className="hidden md:block bg-[#f5f6f7] rounded-md p-4 mb-4">
                              <div className="flex items-start text-sm text-gray-800">
                                <TruckIcon />
                                <span>
                                  結帳完成後，預計5分鐘內將QRcode寄至您的信箱
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap justify-between items-center gap-2 mt-2 md:mt-4 md:items-end">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-stone-900">
                                  數量：
                                </span>
                                <div className="flex items-center border border-gray-300 rounded-md">
                                  <button
                                    type="button"
                                    className="px-3 py-1 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                    onClick={() =>
                                      updateQuantity(
                                        item.variant_id || item.id,
                                        item.quantity - 1,
                                      )
                                    }
                                    disabled={item.quantity <= 1}
                                    aria-label="減少數量"
                                  >
                                    -
                                  </button>
                                  <span className="px-3 text-sm min-w-[2rem] text-center">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    className="px-3 py-1 hover:bg-gray-100"
                                    onClick={() =>
                                      updateQuantity(
                                        item.variant_id || item.id,
                                        item.quantity + 1,
                                      )
                                    }
                                    aria-label="增加數量"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="text-red-500 text-sm font-medium hover:underline"
                                onClick={() =>
                                  handleRemoveWithAnimation(
                                    index,
                                    item.variant_id || item.id,
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
                            <span className="text-[24px] font-bold text-gray-900">
                              ${displayTotal}
                            </span>
                          </div>

                          <JekoPillButton
                            type="button"
                            variant="primary"
                            onClick={handleNext}
                          >
                            前往結帳
                          </JekoPillButton>
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
                    <h2 className="text-[28px] font-bold text-gray-900">
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
                    <CheckoutForm
                      onBack={handleBack}
                      hideSubmitButton={true}
                      requireTerms
                      termsAccepted={termsAccepted}
                      onCartNeedsRebuild={rebuildMedusaCartFromLocal}
                    />
                  </div>
                </div>

                {/* 🌟 右側：固定明細卡片 (Bluehost 風格) */}
                <div className="w-full lg:w-[35%]">
                  <div className="sticky top-24">
                    <h3 className="text-[24px] font-bold mb-4 text-gray-900">
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
                            <span>
                              折扣
                              {appliedLabel
                                ? `（${appliedLabel}）`
                                : appliedCode
                                  ? `（${appliedCode}）`
                                  : ""}
                            </span>
                            <span className="font-medium">－${discount}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center mb-6 pt-4 border-t border-gray-200">
                          <span className="text-base font-bold text-gray-900">
                            應付總額
                          </span>
                          <span className="text-[24px] font-bold text-gray-900">
                            ${payableTotal}
                          </span>
                        </div>

                        <div className="mb-6">
                          {!promoOpen && memberCoupons.length === 0 ? (
                            <button
                              type="button"
                              onClick={() => setPromoOpen(true)}
                              className="text-sm text-blue-600 font-medium hover:underline"
                            >
                              使用折扣碼
                            </button>
                          ) : (
                            <div className="space-y-3">
                              {memberCoupons.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-[11px] font-semibold text-gray-600 tracking-wide">
                                    可用折扣券
                                  </p>
                                  <ul
                                    className="flex flex-wrap gap-1.5"
                                    role="list"
                                  >
                                    {memberCoupons.map((card) => {
                                      const selected = isSameCouponCard(
                                        card,
                                        appliedSourceCode,
                                        appliedCode,
                                      );
                                      const label = couponCardLabel(card);
                                      return (
                                        <li key={card.id || card.code}>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleCouponCardClick(card)
                                            }
                                            disabled={
                                              isApplyingCoupon ||
                                              checkoutBlocked
                                            }
                                            aria-pressed={selected}
                                            aria-label={
                                              selected
                                                ? `解除套用 ${label}`
                                                : `套用 ${label}`
                                            }
                                            className={`inline-flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1.5 text-left transition disabled:opacity-55 disabled:cursor-not-allowed ${
                                              selected
                                                ? "border-gray-400 ring-1 ring-gray-300"
                                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                            }`}
                                          >
                                            <span className="text-[12px] font-semibold text-gray-800 leading-none">
                                              {label}
                                            </span>
                                            {Number(card.amount) > 0 && (
                                              <span className="text-[10px] text-gray-400 leading-none">
                                                −${Number(card.amount)}
                                              </span>
                                            )}
                                            <span
                                              className={`text-[10px] leading-none ${
                                                selected
                                                  ? "text-gray-700"
                                                  : "text-gray-400"
                                              }`}
                                            >
                                              {isApplyingCoupon && selected
                                                ? "…"
                                                : selected
                                                  ? "解除"
                                                  : "套用"}
                                            </span>
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={coupon}
                                  onChange={(e) => setCoupon(e.target.value)}
                                  placeholder="或手動輸入折扣碼"
                                  disabled={Boolean(appliedCode) || isApplyingCoupon}
                                  className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                                  autoComplete="off"
                                  spellCheck={false}
                                />
                                <button
                                  type="button"
                                  onClick={
                                    appliedCode
                                      ? handleRemoveCoupon
                                      : () => handleApplyCoupon()
                                  }
                                  disabled={
                                    isApplyingCoupon ||
                                    checkoutBlocked ||
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

                              {needLineVerify && !isLoggedIn && isWelcomeCouponCode(coupon) && (
                                <div className="rounded-xl border border-[#067A38]/40 bg-emerald-50/80 px-3.5 py-3">
                                  <p className="text-[13px] font-bold text-slate-800 leading-snug">
                                    新會員 50 元：請用 LINE 驗證
                                  </p>
                                  <p className="mt-1 text-[12px] text-slate-600 leading-relaxed">
                                    不需註冊會員。請確認已加入官方 LINE，並按下方按鈕驗證
                                    LINE 身分後套用（防止他人盜用您的折扣碼）。
                                  </p>
                                  <div className="mt-2.5 flex flex-col gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleApplyCoupon()}
                                      disabled={isApplyingCoupon}
                                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#067A38] hover:bg-[#056B30] text-white text-[12px] font-bold px-4 py-2 disabled:opacity-60"
                                    >
                                      <LineIconSvg className="w-3.5 h-3.5" />
                                      {isApplyingCoupon
                                        ? "驗證中…"
                                        : "用 LINE 驗證並套用"}
                                    </button>
                                    <a
                                      href={lineOaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#067A38] bg-white text-[#067A38] text-[12px] font-bold px-4 py-2"
                                    >
                                      尚未加好友？加入官方 LINE
                                    </a>
                                  </div>
                                </div>
                              )}

                              {needLogin && !isLoggedIn && !isWelcomeCouponCode(coupon) && (
                                <div className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3">
                                  <p className="text-[13px] font-bold text-slate-800 leading-snug">
                                    登入後才能套用折扣碼
                                  </p>
                                  <p className="mt-1 text-[12px] text-slate-600 leading-relaxed">
                                    已加入官方 LINE
                                    還不夠，請先登入／註冊會員後才能領取並套用新會員折扣。夥伴專屬折扣碼仍可直接輸入套用。
                                  </p>
                                  <div className="mt-2.5 flex flex-col gap-2">
                                    <Link
                                      href={buildLoginUrl("/Cart?step=1")}
                                      className="inline-flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-white text-[12px] font-bold px-4 py-2"
                                    >
                                      登入／註冊以使用折扣
                                    </Link>
                                    <a
                                      href={lineOaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#067A38] bg-white text-[#067A38] text-[12px] font-bold px-4 py-2"
                                    >
                                      <LineIconSvg className="w-3.5 h-3.5" />
                                      尚未加好友？點此加入官方 LINE
                                    </a>
                                  </div>
                                </div>
                              )}

                              {needLineFriend && isLoggedIn && (
                                <div className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3">
                                  <p className="text-[13px] font-bold text-slate-800 leading-snug">
                                    需連結 LINE 才能使用折扣
                                  </p>
                                  <p className="mt-1 text-[12px] text-slate-600 leading-relaxed">
                                    您目前是 Google／Email
                                    登入。僅「加好友」還不夠，請先按下方按鈕連結
                                    LINE（不會登出目前帳號），並確認已加入官方帳號。
                                    {welcomeHint
                                      ? `（已入帳：${welcomeHint}）`
                                      : ""}
                                  </p>
                                  <div className="mt-2.5 flex flex-col gap-2">
                                    <button
                                      type="button"
                                      onClick={bindLine}
                                      disabled={
                                        lineBindStatus === "loading" ||
                                        isApplyingCoupon
                                      }
                                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-[12px] font-bold px-4 py-2 disabled:opacity-60"
                                    >
                                      <LineIconSvg className="w-3.5 h-3.5" />
                                      {lineBindStatus === "loading"
                                        ? "連結中…"
                                        : "連結 LINE 並啟用優惠"}
                                    </button>
                                    <a
                                      href={lineOaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-400 bg-white text-slate-700 text-[12px] font-bold px-4 py-2 hover:bg-slate-100"
                                    >
                                      尚未加好友？點此加入官方 LINE
                                    </a>
                                    <button
                                      type="button"
                                      onClick={recheckWelcomeAfterLineBind}
                                      disabled={
                                        isApplyingCoupon ||
                                        lineBindStatus === "loading"
                                      }
                                      className="text-[12px] font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 disabled:opacity-50"
                                    >
                                      我已連結／已加好友，重新檢查
                                    </button>
                                  </div>
                                  {lineBindMessage && (
                                    <p
                                      className={`mt-2 text-[12px] font-medium leading-relaxed ${
                                        lineBindStatus === "error"
                                          ? "text-red-600"
                                          : "text-emerald-700"
                                      }`}
                                    >
                                      {lineBindMessage}
                                    </p>
                                  )}
                                </div>
                              )}

                              {couponMessage && (
                                <p
                                  className={`leading-relaxed ${
                                    appliedCode
                                      ? "text-[11px] text-slate-400"
                                      : needLogin && !isLoggedIn && !isWelcomeCouponCode(coupon)
                                        ? "text-[12px] text-amber-700"
                                        : needLineVerify || needLineFriend
                                          ? "text-[12px] text-amber-700"
                                          : "text-[12px] text-red-500"
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
                            id="checkout-terms"
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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

                        {/* 付款方式：LINE Pay / 藍新金流
                            LINE Pay：未付款返回不顯示等待橫幅（付款成功才建單）
                            藍新 ATM／匯款：仍先建單，走 thank-you／pending 頁顯示轉帳資訊 */}
                        <p className="text-xs text-center text-gray-500 mb-3">
                          選擇付款方式
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <JekoPillButton
                            type="button"
                            variant="primary"
                            tone="line"
                            disabled={checkoutBlocked || !termsAccepted}
                            onClick={() => requestCheckoutPayment("linepay")}
                          >
                            {paymentBusy === "linepay"
                              ? "正在前往 LINE Pay…"
                              : "LINE Pay 結帳"}
                          </JekoPillButton>
                          <JekoPillButton
                            type="button"
                            variant="primary"
                            disabled={checkoutBlocked || !termsAccepted}
                            onClick={() => requestCheckoutPayment("newebpay")}
                          >
                            {paymentBusy === "newebpay"
                              ? "正在前往藍新金流…"
                              : "藍新金流結帳"}
                          </JekoPillButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {welcomeFirstOrderWarn ? (
              <div
                className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center px-5"
                role="dialog"
                aria-modal="true"
                aria-labelledby="welcome-first-order-title"
              >
                <div className="w-full max-w-sm rounded-xl bg-white border border-gray-200 px-5 py-5 shadow-lg">
                  <h2
                    id="welcome-first-order-title"
                    className="text-[15px] font-bold text-black mb-2"
                  >
                    尚未使用新會員折扣
                  </h2>
                  <p className="text-[13px] leading-relaxed text-black mb-5">
                    您有「
                    {couponCardLabel(pendingWelcomeCoupon)}
                    」尚未套用。若完成本次購買，此折扣券將失效且無法再使用。
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[13px] font-bold text-black hover:bg-gray-50"
                      onClick={() => {
                        const card = pendingWelcomeCoupon;
                        setWelcomeFirstOrderWarn(null);
                        if (card) void handleCouponCardClick(card);
                      }}
                    >
                      先套用折扣
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-lg bg-black px-3 py-2.5 text-[13px] font-bold text-white hover:bg-gray-900"
                      onClick={confirmCheckoutWithoutWelcome}
                    >
                      不用，繼續結帳
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-[12px] text-gray-600 hover:text-black"
                      onClick={() => setWelcomeFirstOrderWarn(null)}
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {paymentBusy ? (
              <div
                className="fixed inset-0 z-[100] bg-slate-900/35 backdrop-blur-[1px] flex items-center justify-center px-6"
                role="alertdialog"
                aria-busy="true"
                aria-live="assertive"
              >
                <div className="bg-white rounded-xl shadow-xl px-6 py-5 max-w-sm w-full text-center">
                  <LoadingIndicator
                    layout="center"
                    size="lg"
                    label={
                      paymentBusy === "linepay"
                        ? "正在連線 LINE Pay"
                        : "正在連線藍新金流"
                    }
                    className="mb-3"
                    labelClassName="text-base font-bold text-slate-900"
                  />
                  <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                    訂單處理中，請稍候，勿關閉或重新整理此頁面
                  </p>
                </div>
              </div>
            ) : null}

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
                <h2 className="text-[24px] font-bold text-gray-900 mb-2">
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

        {activeStep === 0 && displayItems.length > 0 ? (
          <section
            className="mt-6 border-t border-slate-200 bg-white py-8 md:py-10"
            aria-label="購物車推薦方案"
          >
            <div className="mx-auto max-w-[1400px] px-4 md:px-8">
              <CartRelatedEsimCarousel cartItems={displayItems} />
            </div>
          </section>
        ) : null}
      </motion.div>
    </Layout>
  );
};

export default CartPage;
