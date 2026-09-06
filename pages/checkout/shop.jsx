"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/context/CartContext";
import { useUser } from "@/components/context/UserContext";
import { buildLoginUrl } from "@/lib/authRedirect";
import {
  buildCheckoutAutofillPatches,
  mergeCheckoutForm,
  saveCheckoutProfile,
} from "@/lib/checkoutProfile";
import { isLineSyntheticEmail } from "@/lib/lineAuth";
import { ChevronRight, Tag, Shield, Truck, RotateCcw } from "lucide-react";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";
import { QuarterRing } from "@/components/ui/QuarterRing";
import { clientWarn, clientError } from "@/lib/clientLogger";
import {
  writePendingPayment,
  clearPendingPayment,
} from "@/lib/checkoutPendingPayment";

// ── 步驟指示器 ──────────────────────────────────────────────────
const STEPS = ["購物車", "資訊", "運送", "付款"];
const PAYMENT_METHODS = [
  {
    id: "linepay",
    title: "LINE Pay",
    desc: "以 LINE App 快速付款",
  },
  {
    id: "newebpay",
    title: "藍新金流",
    desc: "信用卡、超商代碼、虛擬帳號",
  },
];

function computeShopCheckoutTotals(items, discount = 0) {
  const physicalItems = (items || []).filter(
    (i) => !i.type || i.type === "physical",
  );
  const subtotal = physicalItems.reduce(
    (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1),
    0,
  );
  const shipping = subtotal >= 990 ? 0 : subtotal > 0 ? 60 : 0;
  const total = Math.max(0, subtotal + shipping - (Number(discount) || 0));
  return { physicalItems, subtotal, shipping, total };
}

function Breadcrumb({ current = 1 }) {
  return (
    <nav className="flex items-center gap-1 text-[12px] overflow-x-auto max-w-[70vw] sm:max-w-none">
      {STEPS.map((step, i) => (
        <span key={step} className="flex items-center gap-1 shrink-0">
          {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
          <span
            className={
              i === current
                ? "font-semibold text-slate-800"
                : i < current
                  ? "text-blue-600"
                  : "text-gray-400"
            }
          >
            {step}
          </span>
        </span>
      ))}
    </nav>
  );
}

// ── 右欄：訂單摘要 ──────────────────────────────────────────────
function OrderSummary({
  items,
  coupon,
  setCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  discount,
  appliedCode,
  isApplyingCoupon,
  couponMessage,
  needLineFriend,
  needLogin,
  lineOaUrl,
  welcomeHint,
  loginHref,
  mobileCollapsedDefault = true,
}) {
  const [mobileOpen, setMobileOpen] = useState(!mobileCollapsedDefault);
  const { physicalItems, subtotal, shipping, total } = computeShopCheckoutTotals(
    items,
    discount,
  );

  return (
    <div className="lg:sticky lg:top-8">
      {/* 手機：可收合訂單摘要 */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="lg:hidden w-full flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm"
        aria-expanded={mobileOpen}
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold text-blue-600">
          {mobileOpen ? "隱藏訂單摘要" : "顯示訂單摘要"}
          <ChevronRight
            className={`w-4 h-4 transition-transform ${mobileOpen ? "rotate-90" : ""}`}
          />
        </span>
        <span className="text-[15px] font-bold text-slate-900 tabular-nums">
          NT${total.toLocaleString()}
        </span>
      </button>

      <div
        className={`${
          mobileOpen ? "mt-4 block" : "hidden"
        } lg:mt-0 lg:block rounded-xl border border-gray-200 bg-white p-4 lg:border-0 lg:bg-transparent lg:p-0`}
      >
      {/* 商品清單 */}
      <div className="space-y-4 mb-6">
        {physicalItems.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            購物車沒有實體商品
          </p>
        ) : (
          physicalItems.map((item, idx) => {
            return (
              <div
                key={`${item.id}-${idx}`}
                className="flex gap-3 items-center"
              >
                <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <Image
                    src={item.image || "/images/default-image.jpg"}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                    onError={(e) => {
                      e.currentTarget.src = "/images/default-image.jpg";
                    }}
                  />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight line-clamp-2">
                    {item.name}
                  </p>
                  {item.specLabel && item.specLabel !== "未指定規格" && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.specLabel}
                    </p>
                  )}
                </div>
                <p className="text-[13px] font-semibold text-slate-800 shrink-0">
                  NT${(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* 分隔線 */}
      <hr className="border-gray-200 mb-4" />

      {/* 折扣碼 */}
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="折扣碼或禮品卡"
            disabled={Boolean(appliedCode)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
        <button
          type="button"
          onClick={appliedCode ? onRemoveCoupon : onApplyCoupon}
          disabled={isApplyingCoupon || (!appliedCode && !coupon.trim())}
          className="px-4 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApplyingCoupon ? (
            <span className="inline-flex items-center gap-2">
              <QuarterRing size="xs" className="text-white" />
              處理中…
            </span>
          ) : appliedCode ? (
            "移除"
          ) : (
            "套用"
          )}
        </button>
      </div>

      {needLogin && (
        <div className="mb-4 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3">
          <p className="text-[13px] font-bold text-slate-800 leading-snug">
            登入後才能套用折扣碼
          </p>
          <p className="mt-1 text-[12px] text-slate-600 leading-relaxed">
            已加入官方 LINE
            還不夠，請先登入／註冊會員後才能領取並套用新會員折扣。夥伴專屬折扣碼仍可直接輸入套用。
          </p>
          <div className="mt-2.5 flex flex-col gap-2">
            <Link
              href={loginHref || buildLoginUrl("/checkout/shop")}
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

      {needLineFriend && !needLogin && (
        <div className="mb-4 rounded-xl border border-[#067A38]/35 bg-[#067A38]/10 px-3.5 py-3">
          <p className="text-[13px] font-bold text-slate-800 leading-snug">
            還未加入官方 LINE？
          </p>
          <p className="mt-1 text-[12px] text-slate-600 leading-relaxed">
            加入官方 LINE 即可立即使用新會員 50 元優惠折扣
            {welcomeHint ? `（已入帳：${welcomeHint}）` : ""}
          </p>
          <a
            href={lineOaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#067A38] hover:bg-[#056B30] text-white text-[12px] font-bold px-4 py-2"
          >
            <LineIconSvg className="w-3.5 h-3.5" />
            加入官方 LINE 立即使用優惠折扣
          </a>
        </div>
      )}

      {couponMessage && (
        <p
          className={`mb-5 text-[12px] ${
            appliedCode
              ? "text-green-600"
              : needLogin || needLineFriend
                ? "text-amber-700"
                : "text-red-500"
          }`}
        >
          {couponMessage}
        </p>
      )}
      {!couponMessage && <div className="mb-5" />}
      {/* 金額明細 */}
      <div className="space-y-2 text-sm text-slate-700">
        <div className="flex justify-between">
          <span>小計</span>
          <span>NT${subtotal.toLocaleString()}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>折扣</span>
            <span>－NT${discount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>運費</span>
          <span>
            {shipping === 0 ? (
              <span className="text-green-600 font-medium">免費</span>
            ) : (
              `NT$${shipping}`
            )}
          </span>
        </div>
      </div>

      <hr className="border-gray-200 my-3" />

      <div className="flex justify-between items-baseline">
        <span className="text-base font-bold text-slate-800">總計</span>
        <div className="text-right">
          <span className="text-[11px] text-gray-400 mr-1">TWD</span>
          <span className="text-[24px] font-bold text-slate-900">
            NT${total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 滿額免運提示 */}
      {subtotal > 0 && subtotal < 990 && (
        <p className="mt-3 text-[11px] text-center text-blue-500 bg-blue-50 rounded-lg px-3 py-2">
          再買 NT${(990 - subtotal).toLocaleString()} 即可享免費運送
        </p>
      )}
      </div>
    </div>
  );
}

// ── 主元件 ──────────────────────────────────────────────────────
export default function ShopCheckoutPage() {
  const router = useRouter();
  const { cartId, physicalItems, physicalTotal, clearCart } = useCart();
  const { user, token } = useUser();
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();
  const isLoggedIn = Boolean(user || nextAuthSession?.user);
  const authReady = nextAuthStatus !== "loading";

  const [form, setForm] = useState({
    email: "",
    name: "",
    phone: "",
    address: "",
    city: "台中市",
    postalCode: "",
  });
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [needLineFriend, setNeedLineFriend] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [lineOaUrl, setLineOaUrl] = useState(
    process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn",
  );
  const [welcomeHint, setWelcomeHint] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("linepay");
  const [submittingMethod, setSubmittingMethod] = useState(null);

  // 社群 / Email 登入 + 本機儲存 → 自動帶入空白欄位
  useEffect(() => {
    if (!authReady) return;
    const { patches } = buildCheckoutAutofillPatches({
      supabaseUser: user,
      nextAuthUser: nextAuthSession?.user || null,
    });
    setForm((prev) => {
      const merged = mergeCheckoutForm(prev, patches);
      if (isLineSyntheticEmail(merged.email)) {
        return { ...merged, email: "" };
      }
      return merged;
    });
  }, [
    authReady,
    user?.email,
    user?.user_metadata?.full_name,
    user?.user_metadata?.phone,
    nextAuthSession?.user?.email,
    nextAuthSession?.user?.name,
  ]);

  // 訪客：折扣區提示需登入；會員：自動領歡迎禮
  useEffect(() => {
    if (!authReady) return undefined;
    if (!isLoggedIn) {
      setNeedLogin(true);
      setNeedLineFriend(false);
      return undefined;
    }
    setNeedLogin(false);
    if (!cartId || appliedCode) return undefined;
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
        if (cancelled || !res.ok || !data.success) return;

        if (data.line_oa_url) setLineOaUrl(data.line_oa_url);

        const welcomeCode = data.welcome_coupon?.code;
        if (welcomeCode) {
          setWelcomeHint(welcomeCode);
          setCoupon(welcomeCode);
        }

        if (data.need_line_for_welcome) {
          setNeedLineFriend(true);
          return;
        }

        if (data.can_use_welcome && welcomeCode) {
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
              if (applyData.line_oa_url) setLineOaUrl(applyData.line_oa_url);
              setCouponMessage("");
              return;
            }
            if (applyRes.ok && applyData.success) {
              setDiscount(applyData.discount_total || 0);
              setAppliedCode(applyData.code || welcomeCode);
              setCouponMessage(
                `已自動套用新會員折價券 ${applyData.code || welcomeCode}`,
              );
            }
          } finally {
            if (!cancelled) setIsApplyingCoupon(false);
          }
        }
      } catch (e) {
        clientWarn("[checkout] 歡迎禮自動套用略過:", e.message);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, isLoggedIn, token, cartId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = "請輸入 Email";
    else if (isLineSyntheticEmail(form.email))
      errs.email = "請填寫真實 Email，以便寄送訂單通知";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      errs.email = "Email 格式不正確";
    if (!form.name) errs.name = "請輸入姓名";
    if (!form.phone) errs.phone = "請輸入手機號碼";
    if (!form.address) errs.address = "請輸入地址";
    return errs;
  };

  const handleApplyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    if (!cartId) {
      setCouponMessage("購物車尚未初始化，請稍候再試");
      return;
    }

    setIsApplyingCoupon(true);
    setCouponMessage("");
    setNeedLineFriend(false);
    if (!isLoggedIn) setNeedLogin(true);
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
      const data = await res.json();

      if (data.need_login || res.status === 401) {
        setDiscount(0);
        setAppliedCode(null);
        setNeedLogin(true);
        setNeedLineFriend(false);
        setCouponMessage(data.error || "登入後才能套用折扣碼");
        return;
      }

      if (data.need_line_friend) {
        setDiscount(0);
        setAppliedCode(null);
        setNeedLineFriend(true);
        setNeedLogin(false);
        if (data.line_oa_url) setLineOaUrl(data.line_oa_url);
        setCouponMessage(
          data.error ||
            "尚未確認官方 LINE 好友。請加入後重新整理；若仍失敗請登出再以 LINE 重新登入。",
        );
        return;
      }

      if (!res.ok || !data.success) {
        setDiscount(0);
        setAppliedCode(null);
        setCouponMessage(data.error || "折扣碼無效");
        return;
      }

      setNeedLineFriend(false);
      if (isLoggedIn) setNeedLogin(false);
      setDiscount(data.discount_total || 0);
      setAppliedCode(data.code || code.toUpperCase());
      setCouponMessage(`已套用折扣碼 ${data.code || code.toUpperCase()}`);
    } catch (err) {
      setDiscount(0);
      setAppliedCode(null);
      setCouponMessage(err.message || "折扣碼套用失敗，請稍後再試");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (!cartId || !appliedCode) return;
    setIsApplyingCoupon(true);
    try {
      const res = await fetch("/api/checkout/promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, action: "remove" }),
      });
      const data = await res.json().catch(() => ({}));
      setDiscount(data?.discount_total || 0);
    } catch {
      setDiscount(0);
    } finally {
      setAppliedCode(null);
      setCoupon("");
      setCouponMessage("");
      setNeedLineFriend(false);
      setIsApplyingCoupon(false);
    }
  };

  const buildIdentity = () => ({
    supabaseUserId: user?.id || null,
    lineUserId: nextAuthSession?.user?.id || null,
    authProvider: user?.id
      ? "supabase"
      : nextAuthSession?.user
        ? "line"
        : "guest",
  });

  const startNewebPayCheckout = async () => {
    const identity = buildIdentity();
    const orderRes = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cartId,
        orderInfo: { ...form, customerId: user?.id || null, ...identity },
      }),
    });
    const orderResult = await orderRes.json();

    if (!orderResult.success) {
      if (orderResult.code === "CART_COMPLETED") {
        localStorage.removeItem("medusa_cart_id");
        alert(
          orderResult.message ||
            "購物車狀態已更新，請重新整理後再試一次結帳。",
        );
        window.location.reload();
        return;
      }
      throw new Error(orderResult.message || "建立訂單失敗");
    }

    const { orderId, amount } = orderResult;
    localStorage.removeItem("medusa_cart_id");

    writePendingPayment({
      method: "newebpay",
      medusaOrderId: orderId,
      amount,
      email: form.email,
      cartId,
      preserveLocalCart: true,
    });

    sessionStorage.setItem(
      "newebpay_checkout_payload",
      JSON.stringify({
        orderId,
        amount,
        orderInfo: {
          ...form,
          ...identity,
          methods: ["CREDIT", "VACC", "WEBATM"],
          payment_method: "CREDIT",
        },
      }),
    );

    await router.push("/checkout/payment/");
  };

  const startLinePayCheckout = async () => {
    clearPendingPayment();
    const identity = buildIdentity();

    const linepayRes = await fetch("/api/linepay/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cartId,
        orderInfo: {
          ...form,
          customerId: user?.id || null,
          ...identity,
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
            "購物車已結帳完成，請重新整理後再試一次。",
        );
        window.location.reload();
        return { redirecting: false };
      }
      throw new Error(linepayData?.message || "LINE Pay 建單失敗");
    }

    writePendingPayment({
      method: "linepay",
      deferredOrder: true,
      medusaOrderId: null,
      orderNo: linepayData.orderNo,
      amount: linepayData.amount,
      cartId,
      email: form.email,
    });

    window.location.href = linepayData.paymentUrl;
    return { redirecting: true };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (!physicalItems.length) {
      alert("購物車沒有實體商品");
      return;
    }
    if (!cartId) {
      alert("購物車尚未初始化，請稍候再試");
      return;
    }

    setIsSubmitting(true);
    setSubmittingMethod(paymentMethod);
    let redirecting = false;
    try {
      saveCheckoutProfile(form);

      if (paymentMethod === "linepay") {
        const result = await startLinePayCheckout();
        redirecting = Boolean(result?.redirecting);
        return;
      }

      await startNewebPayCheckout();
      redirecting = true;
    } catch (err) {
      clientError("結帳失敗:", err);
      alert(`發生錯誤：${err.message}`);
    } finally {
      if (!redirecting) {
        setIsSubmitting(false);
        setSubmittingMethod(null);
      }
    }
  };

  // ── 輸入欄 helper ─────────────────────────────────────────────
  const Field = ({ label, name, type = "text", placeholder, half }) => (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      <label className="block text-[12px] font-medium text-slate-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition ${
          errors[name]
            ? "border-red-400 bg-red-50"
            : "border-gray-300 focus:border-blue-400"
        }`}
      />
      {errors[name] && (
        <p className="text-[11px] text-red-500 mt-0.5">{errors[name]}</p>
      )}
    </div>
  );

  const { shipping, total } = computeShopCheckoutTotals(
    physicalItems,
    discount,
  );

  const payLabel =
    paymentMethod === "linepay" ? "LINE Pay 結帳" : "藍新金流結帳";
  const payBusyLabel =
    submittingMethod === "linepay"
      ? "正在前往 LINE Pay…"
      : "正在前往藍新金流…";

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-28 lg:pb-0">
      {/* ── Header ── */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href="/shop" className="shrink-0">
            <Image
              src="/images/Logo/logo-no-bg.png"
              alt="Jeko"
              width={80}
              height={28}
              className="h-7 w-auto object-contain"
            />
          </Link>
          <Breadcrumb current={3} />
        </div>
      </header>

      {/* ── 主體 ── */}
      <main className="max-w-5xl mx-auto px-4 py-6 lg:py-12">
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
          {/* ══ 手機先顯示訂單摘要；桌機在右欄 ══ */}
          <aside className="order-1 lg:order-2 mb-6 lg:mb-0 lg:border-l lg:border-gray-200 lg:pl-10">
            <OrderSummary
              items={physicalItems}
              coupon={coupon}
              setCoupon={setCoupon}
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={handleRemoveCoupon}
              discount={discount}
              appliedCode={appliedCode}
              isApplyingCoupon={isApplyingCoupon}
              couponMessage={couponMessage}
              needLineFriend={needLineFriend}
              needLogin={needLogin}
              lineOaUrl={lineOaUrl}
              welcomeHint={welcomeHint}
              loginHref={buildLoginUrl("/checkout/shop")}
            />
          </aside>

          {/* ══ 表單 ══ */}
          <form
            id="shop-checkout-form"
            onSubmit={handleSubmit}
            className="order-2 lg:order-1 space-y-7 lg:space-y-8"
          >
            {/* 聯絡資料 */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-800">聯絡資料</h2>
                <Link
                  href={buildLoginUrl(router.asPath || "/checkout/shop")}
                  className="text-[12px] text-blue-600 hover:underline"
                >
                  已有帳號？登入
                </Link>
              </div>
              <Field
                label="Email"
                name="email"
                type="email"
                placeholder="your@email.com"
              />
              {isLoggedIn && !form.email ? (
                <p className="mt-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                  LINE 登入不會提供真實 Email，請填寫可收件信箱（訂單通知會寄到這裡）
                </p>
              ) : null}
            </section>

            {/* 配送地址 */}
            <section>
              <h2 className="text-base font-bold text-slate-800 mb-4">
                配送地址
              </h2>
              <div className="space-y-3">
                <Field label="收件人姓名" name="name" placeholder="王小明" />
                <Field
                  label="手機號碼"
                  name="phone"
                  type="tel"
                  placeholder="09xxxxxxxx"
                />
                <Field
                  label="地址"
                  name="address"
                  placeholder="台中市西區民生路100號"
                />
                <div className="flex gap-3">
                  <Field label="城市" name="city" placeholder="台中市" half />
                  <Field
                    label="郵遞區號"
                    name="postalCode"
                    placeholder="400"
                    half
                  />
                </div>
              </div>
            </section>

            {/* 運送方式 */}
            <section>
              <h2 className="text-base font-bold text-slate-800 mb-4">
                運送方式
              </h2>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <label className="flex items-center justify-between px-4 py-3.5 bg-blue-50 border-l-2 border-blue-500 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      defaultChecked
                      className="accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        標準配送（3～7 個工作天）
                      </p>
                      <p className="text-[11px] text-slate-500">黑貓宅配到府</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    NT$60
                    <span className="ml-1 text-[11px] text-green-600 font-normal">
                      （滿 NT$990 免運）
                    </span>
                  </span>
                </label>
              </div>
            </section>

            {/* 付款方式 */}
            <section>
              <h2 className="text-base font-bold text-slate-800 mb-4">
                付款方式
              </h2>
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white">
                {PAYMENT_METHODS.map((method) => {
                  const selected = paymentMethod === method.id;
                  return (
                    <label
                      key={method.id}
                      className={`flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors ${
                        selected
                          ? "bg-blue-50 border-l-2 border-blue-500"
                          : "hover:bg-slate-50 border-l-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={selected}
                          onChange={() => setPaymentMethod(method.id)}
                          className="accent-blue-600 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            {method.id === "linepay" ? (
                              <LineIconSvg className="w-4 h-4 shrink-0" />
                            ) : (
                              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            {method.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {method.desc}
                          </p>
                        </div>
                      </div>
                      {method.id === "newebpay" ? (
                        <div className="flex gap-1.5 ml-3 shrink-0">
                          {["VISA", "MC", "JCB"].map((c) => (
                            <span
                              key={c}
                              className="text-[9px] font-bold border border-gray-200 rounded px-1.5 py-0.5 text-slate-500"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="ml-3 text-[10px] font-bold text-[#067A38] border border-[#067A38]/30 rounded px-1.5 py-0.5 shrink-0">
                          LINE
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </section>

            {/* 提交按鈕：桌機顯示；手機改用底部固定列 */}
            <button
              type="submit"
              disabled={isSubmitting || physicalItems.length === 0}
              className={`hidden lg:flex w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl transition-colors items-center justify-center gap-2 shadow-sm ${
                paymentMethod === "linepay"
                  ? "bg-[#067A38] hover:bg-[#056B30]"
                  : "bg-[#3B9EFF] hover:bg-[#2B8EEF]"
              }`}
            >
              {isSubmitting ? (
                <>
                  <QuarterRing size="sm" className="text-white" />
                  {payBusyLabel}
                </>
              ) : (
                payLabel
              )}
            </button>

            {/* 服務保障 */}
            <div className="grid grid-cols-3 gap-3 pt-2 pb-4 lg:pb-6">
              {[
                { icon: Shield, text: "安全加密付款" },
                { icon: Truck, text: "3～7 日送達" },
                { icon: RotateCcw, text: "30 天退換貨" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex flex-col items-center gap-1.5 text-center"
                >
                  <Icon className="w-5 h-5 text-slate-400" />
                  <span className="text-[11px] text-slate-500">{text}</span>
                </div>
              ))}
            </div>
          </form>

        </div>
      </main>

      {/* ── 手機底部固定結帳列 ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-slate-500">應付總額</p>
            <p className="text-[18px] font-bold text-slate-900 tabular-nums leading-tight">
              NT${total.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {shipping === 0 ? "含免運" : `含運費 NT$${shipping}`}
              {discount > 0 ? ` · 已折 NT$${discount}` : ""}
            </p>
          </div>
          <button
            type="submit"
            form="shop-checkout-form"
            disabled={isSubmitting || physicalItems.length === 0}
            className={`shrink-0 min-w-[148px] px-5 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[14px] rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm ${
              paymentMethod === "linepay"
                ? "bg-[#067A38] hover:bg-[#056B30]"
                : "bg-[#3B9EFF] hover:bg-[#2B8EEF]"
            }`}
          >
            {isSubmitting ? (
              <>
                <QuarterRing size="sm" className="text-white" />
                處理中…
              </>
            ) : (
              payLabel
            )}
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 mt-8 lg:mt-12 py-6 hidden lg:block">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap gap-4 justify-center text-[11px] text-gray-400">
          {["退款政策", "運送說明", "隱私政策", "服務條款", "取消規定"].map(
            (t) => (
              <a
                key={t}
                href="#"
                className="hover:text-gray-600 hover:underline"
              >
                {t}
              </a>
            ),
          )}
        </div>
      </footer>
    </div>
  );
}
