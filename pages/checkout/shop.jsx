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
import { ChevronRight, Tag, Shield, Truck, RotateCcw } from "lucide-react";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";

// ── 步驟指示器 ──────────────────────────────────────────────────
const STEPS = ["購物車", "資訊", "運送", "付款"];

function Breadcrumb({ current = 1 }) {
  return (
    <nav className="flex items-center gap-1 text-[12px]">
      {STEPS.map((step, i) => (
        <span key={step} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
          <span
            className={
              i === current
                ? "font-semibold text-slate-800"
                : i < current
                  ? "text-blue-600 cursor-pointer hover:underline"
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
}) {
  const physicalItems = items.filter((i) => !i.type || i.type === "physical");

  const subtotal = physicalItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 990 ? 0 : 60;
  const total = subtotal + shipping - (discount || 0);

  return (
    <div className="lg:sticky lg:top-8">
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
          {isApplyingCoupon ? "處理中…" : appliedCode ? "移除" : "套用"}
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
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#06C755] bg-white text-[#06C755] text-[12px] font-bold px-4 py-2"
            >
              <LineIconSvg className="w-3.5 h-3.5" />
              尚未加好友？點此加入官方 LINE
            </a>
          </div>
        </div>
      )}

      {needLineFriend && !needLogin && (
        <div className="mb-4 rounded-xl border border-[#06C755]/35 bg-[#06C755]/10 px-3.5 py-3">
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
            className="mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white text-[12px] font-bold px-4 py-2"
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
              `NT${shipping}`
            )}
          </span>
        </div>
      </div>

      <hr className="border-gray-200 my-3" />

      <div className="flex justify-between items-baseline">
        <span className="text-base font-bold text-slate-800">總計</span>
        <div className="text-right">
          <span className="text-[11px] text-gray-400 mr-1">TWD</span>
          <span className="text-2xl font-black text-slate-900">
            NT${total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 滿額免運提示 */}
      {subtotal < 990 && (
        <p className="mt-3 text-[11px] text-center text-blue-500 bg-blue-50 rounded-lg px-3 py-2">
          再買 NT${(990 - subtotal).toLocaleString()} 即可享免費運送
        </p>
      )}
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
    process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@391huuts",
  );
  const [welcomeHint, setWelcomeHint] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // 社群 / Email 登入 + 本機儲存 → 自動帶入空白欄位
  useEffect(() => {
    if (!authReady) return;
    const { patches } = buildCheckoutAutofillPatches({
      supabaseUser: user,
      nextAuthUser: nextAuthSession?.user || null,
    });
    setForm((prev) => mergeCheckoutForm(prev, patches));
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
        console.warn("[checkout] 歡迎禮自動套用略過:", e.message);
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
    try {
      saveCheckoutProfile(form);

      // Step 1: 建立 Medusa 訂單
      const orderRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, orderInfo: form }),
      });
      const orderResult = await orderRes.json();

      if (!orderResult.success) {
        throw new Error(orderResult.message || "建立訂單失敗");
      }

      const { orderId, amount } = orderResult;

      // Step 2: 取得藍新付款表單並送出
      const formRes = await fetch("/api/newebpay-generate-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalPrice: amount || physicalTotal,
          orderInfo: form,
          customOrderId: orderId,
        }),
      });

      if (!formRes.ok) {
        const errText = await formRes.text();
        throw new Error(errText || "無法建立付款表單");
      }

      const html = await formRes.text();
      document.open();
      document.write(html);
      document.close();
    } catch (err) {
      console.error("結帳失敗:", err);
      alert(`發生錯誤：${err.message}`);
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* ── Header ── */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/shop">
            <Image
              src="/images/Logo/logo-no-bg.png"
              alt="Jeko"
              width={80}
              height={28}
              className="h-7 w-auto object-contain"
            />
          </Link>
          <Breadcrumb current={1} />
        </div>
      </header>

      {/* ── 主體 ── */}
      <main className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
          {/* ══ 左欄：表單 ══ */}
          <form onSubmit={handleSubmit} className="space-y-8">
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
              <div className="border border-gray-200 rounded-xl px-4 py-4 flex items-center gap-3 bg-white">
                <Shield className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    藍新金流安全付款
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    支援信用卡、超商代碼、虛擬帳號、LINE Pay
                  </p>
                </div>
                <div className="flex gap-1.5 ml-auto">
                  {["VISA", "MC", "JCB"].map((c) => (
                    <span
                      key={c}
                      className="text-[9px] font-black border border-gray-200 rounded px-1.5 py-0.5 text-slate-500"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* 提交按鈕 */}
            <button
              type="submit"
              disabled={isSubmitting || physicalItems.length === 0}
              className="w-full py-4 bg-[#3B9EFF] hover:bg-[#2B8EEF] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  處理中…
                </>
              ) : (
                "立即付款"
              )}
            </button>

            {/* 服務保障 */}
            <div className="grid grid-cols-3 gap-3 pt-2 pb-6">
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

          {/* ══ 右欄：訂單摘要 ══ */}
          <aside className="mt-8 lg:mt-0 lg:border-l lg:border-gray-200 lg:pl-10">
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
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 mt-12 py-6">
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
