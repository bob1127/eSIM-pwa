"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import MaterialIcon from "@/components/MaterialIcon";
import { useUser } from "@/components/context/UserContext";
import {
  LOTTERY_BODY_IMG,
  LOTTERY_LEVER_IMG,
  LOTTERY_TEST_UNLIMITED,
  prizeToDigits,
} from "@/lib/promoLottery";

const SPIN_MS = 2800;

/** 數字貼在金筒上 */
function DigitReel({ value, spinning }) {
  const display = spinning
    ? String(Math.floor(Math.random() * 10))
    : String(value ?? "0");

  return (
    <div className="relative flex-1 h-full min-w-0 flex items-center justify-center">
      <span
        className={`font-black select-none leading-none ${
          spinning ? "blur-[1.5px] opacity-90" : ""
        }`}
        style={{
          fontSize: "clamp(1.9rem, 7.5vw, 3.5rem)",
          color: "#6b0008",
          textShadow:
            "0 1px 0 rgba(255,255,255,0.55), 0 2px 4px rgba(0,0,0,0.25)",
        }}
      >
        {display}
      </span>
    </div>
  );
}

/**
 * 拉霸機：僅機身 +「拉一下！」；中獎寫入會員優惠券（需登入）
 */
export default function PromoLotteryMachine({ className = "" }) {
  const { token, user: supabaseUser, loading: supabaseLoading } = useUser();
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();

  const isLoggedIn = Boolean(supabaseUser || nextAuthSession?.user);
  const authReady = !supabaseLoading && nextAuthStatus !== "loading";

  const [digits, setDigits] = useState(["0", "0", "0", "0"]);
  const [spinning, setSpinning] = useState(false);
  const [leverPull, setLeverPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [savedCoupon, setSavedCoupon] = useState(null);
  const [message, setMessage] = useState("");
  const dragRef = useRef({ active: false, startY: 0, pull: 0 });
  const tickRef = useRef(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const authHeaders = useCallback(() => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const runSpin = useCallback(async () => {
    if (spinning) return;
    if (!isLoggedIn) {
      setMessage("請先登入會員才能參加拉霸。");
      return;
    }

    setSpinning(true);
    setResult(null);
    setSavedCoupon(null);
    setMessage("");
    setLeverPull(1);

    tickRef.current = setInterval(() => {
      setDigits([
        String(Math.floor(Math.random() * 10)),
        String(Math.floor(Math.random() * 10)),
        String(Math.floor(Math.random() * 10)),
        String(Math.floor(Math.random() * 10)),
      ]);
    }, 45);

    window.setTimeout(() => setLeverPull(0.4), 200);

    const spinStarted = Date.now();
    let apiResult = null;
    let apiError = null;

    try {
      const res = await fetch("/api/promo/lottery-spin", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        apiError = data.error || "抽獎失敗";
      } else {
        apiResult = data;
      }
    } catch (e) {
      apiError = e.message || "網路錯誤";
    }

    const wait = Math.max(0, SPIN_MS - (Date.now() - spinStarted));
    window.setTimeout(() => {
      if (tickRef.current) clearInterval(tickRef.current);
      setSpinning(false);
      setLeverPull(0);

      if (apiError || !apiResult) {
        setDigits(["0", "0", "0", "0"]);
        setResult(null);
        setMessage(apiError || "抽獎失敗，請稍後再試");
        return;
      }

      const prize = apiResult.prize;
      setResult(prize);

      if (prize.amount > 0) {
        setDigits(prizeToDigits(prize).split(""));
        setSavedCoupon(apiResult.coupon || null);
        setMessage(
          apiResult.coupon?.code
            ? `恭喜獲得「${prize.label}」！折扣碼 ${apiResult.coupon.code}`
            : `恭喜獲得「${prize.label}」！`,
        );
      } else {
        setDigits(["0", "0", "0", "0"]);
        setSavedCoupon(null);
        setMessage(
          LOTTERY_TEST_UNLIMITED
            ? "下次加油！"
            : "下次加油！明天再來。",
        );
      }
    }, wait);
  }, [spinning, isLoggedIn, authHeaders]);

  const onPointerDown = (e) => {
    if (spinning || !isLoggedIn) return;
    dragRef.current = { active: true, startY: e.clientY, pull: 0 };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.active || spinning) return;
    const delta = e.clientY - dragRef.current.startY;
    const pull = Math.min(1, Math.max(0, delta / 110));
    dragRef.current.pull = pull;
    setLeverPull(pull);
  };

  const onPointerUp = () => {
    if (!dragRef.current.active) return;
    const shouldSpin = dragRef.current.pull >= 0.5;
    dragRef.current.active = false;
    setDragging(false);
    if (shouldSpin) runSpin();
    else setLeverPull(0);
  };

  const won = result?.amount > 0;
  const showMissOnReels = !spinning && result && result.amount <= 0;

  return (
    <section
      className={`w-full overflow-visible py-9 sm:py-12 ${className}`}
      style={{ backgroundColor: "#f11816" }}
    >
      <div className="relative mx-auto w-full max-w-[640px] md:max-w-[700px] px-3 sm:px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOTTERY_BODY_IMG}
          alt="抽獎機機身"
          className="relative z-0 w-full h-auto select-none pointer-events-none"
          draggable={false}
        />

        <div
          className="absolute z-[1] flex items-stretch pointer-events-none"
          style={{
            left: "21.5%",
            width: "56.3%",
            top: "29.2%",
            height: "15.5%",
          }}
        >
          {showMissOnReels ? (
            <div className="w-full h-full flex items-center justify-center px-1">
              <span
                className="font-black select-none leading-none tracking-wider whitespace-nowrap"
                style={{
                  fontSize: "clamp(1.15rem, 4.9vw, 2.1rem)",
                  color: "#6b0008",
                  textShadow:
                    "0 1px 0 rgba(255,255,255,0.55), 0 2px 4px rgba(0,0,0,0.25)",
                }}
              >
                下次加油
              </span>
            </div>
          ) : (
            digits.map((d, i) => (
              <DigitReel key={i} value={d} spinning={spinning} />
            ))
          )}
        </div>

        <div
          className="absolute z-[2] pointer-events-none"
          style={{
            left: "78.5%",
            top: "0%",
            width: "17.4%",
            height: "100%",
            transformOrigin: "14.5% 61.2%",
            transform: `rotate(${leverPull * 58}deg)`,
            transition: dragging
              ? "none"
              : "transform 0.38s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOTTERY_LEVER_IMG}
            alt=""
            className="w-full h-full object-fill select-none"
            draggable={false}
            aria-hidden
          />
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label="下拉拉桿開始抽獎"
          aria-disabled={spinning || !isLoggedIn}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              runSpin();
            }
          }}
          className={`absolute z-[3] touch-none outline-none ${
            !isLoggedIn || spinning
              ? "cursor-not-allowed"
              : "cursor-grab active:cursor-grabbing"
          }`}
          style={{
            left: "78%",
            top: "28%",
            width: "20%",
            height: "40%",
          }}
        >
          <span className="sr-only">拉桿</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        {!isLoggedIn && authReady ? (
          <Link
            href="/login?redirect=/promo"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-[#5c1a00] font-black text-sm sm:text-base px-9 py-3 shadow-lg hover:brightness-105"
          >
            拉一下！
          </Link>
        ) : (
          <button
            type="button"
            disabled={spinning || !isLoggedIn}
            onClick={runSpin}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-[#5c1a00] font-black text-sm sm:text-base px-9 py-3 shadow-lg disabled:opacity-45 disabled:cursor-not-allowed hover:brightness-105"
          >
            {spinning ? "…" : "拉一下！"}
          </button>
        )}

        {message && (
          <p
            className={`text-center text-sm font-bold max-w-md px-2 ${
              won ? "text-white" : "text-white/90"
            }`}
          >
            {message}
            {savedCoupon?.code && (
              <span className="block mt-1 text-xs font-mono tracking-wide text-amber-100 break-all">
                {savedCoupon.code}
              </span>
            )}
            {won && (
              <Link
                href="/account#dashboard"
                className="mt-1 inline-flex items-center gap-1 text-xs text-white underline underline-offset-2"
              >
                會員中心
                <MaterialIcon name="arrow_forward" size={14} />
              </Link>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
