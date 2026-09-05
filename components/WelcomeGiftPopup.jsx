"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useUser } from "@/components/context/UserContext";
import {
  consumeWelcomeGiftPopupFlag,
  peekWelcomeGiftPopupFlag,
  WELCOME_GIFT_TRIGGER_ON_LOGIN,
} from "@/lib/welcomeGiftPopup";
import { CONTACT_INFO } from "@/lib/contactUi";

const LINE_OA = CONTACT_INFO.lineUrl;

/**
 * 新會員 50 歡迎禮彈窗（設計對齊圓角白卡 + 底部綠鈕）
 *
 * 觸發：
 * - sessionStorage 旗標（之後「註冊成功」用）
 * - TEMP：登入狀態由未登入→已登入時彈出（方便核對設計）
 */
export default function WelcomeGiftPopup() {
  const [open, setOpen] = useState(false);
  const { user, isHydrated } = useUser();
  const { status: navStatus } = useSession();
  const prevLoggedIn = useRef(null);
  const router = useRouter();

  const openPopup = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const tryOpenFromFlag = () => {
      if (!peekWelcomeGiftPopupFlag()) return;
      consumeWelcomeGiftPopupFlag();
      openPopup();
    };
    tryOpenFromFlag();
    router.events.on("routeChangeComplete", tryOpenFromFlag);
    return () => {
      router.events.off("routeChangeComplete", tryOpenFromFlag);
    };
  }, [router.events, openPopup]);

  useEffect(() => {
    if (!WELCOME_GIFT_TRIGGER_ON_LOGIN) return;
    if (!isHydrated || navStatus === "loading") return;

    const loggedIn = !!user || navStatus === "authenticated";
    if (prevLoggedIn.current === false && loggedIn) {
      openPopup();
    }
    prevLoggedIn.current = loggedIn;
  }, [user, isHydrated, navStatus, openPopup]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-gift-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 border-0 cursor-default"
        aria-label="關閉背景"
        onClick={close}
      />

      <div className="relative z-10 w-full max-w-[320px] flex flex-col items-center">
        <div className="w-full bg-white rounded-[20px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
          <div className="px-6 pt-8 pb-5 flex flex-col items-center text-center">
            <div className="relative w-[200px] h-[200px] mb-5">
              <Image
                src="/images/people.png"
                alt="為您贈上好禮"
                fill
                className="object-contain"
                sizes="200px"
                priority
              />
            </div>

            <h2
              id="welcome-gift-title"
              className="text-[22px] font-bold text-slate-900 leading-snug tracking-tight"
            >
              為您贈上好禮！
              <br />
              50元折扣金
            </h2>
          </div>

          <a
            href="/account"
            className="block w-full bg-[#3DCC6A] hover:bg-[#34b85e] transition-colors px-5 py-4 text-center"
            onClick={close}
          >
            <span className="text-[15px] font-bold text-white tracking-wide">
              查看詳情
            </span>
          </a>
        </div>

        <a
          href={LINE_OA}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex items-center justify-center gap-1.5 text-center px-2"
        >
          <span
            className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-white text-white text-[11px] leading-none"
            aria-hidden
          >
            ✓
          </span>
          <span className="text-[13px] font-medium text-white leading-snug">
            注意：必須還需加入官方Line 才能順利使用此折扣
          </span>
        </a>

        <button
          type="button"
          onClick={close}
          className="mt-3 inline-flex items-center justify-center rounded-full bg-white text-slate-700 text-sm font-bold px-10 py-2.5 shadow-md hover:bg-slate-50 transition"
        >
          關閉
        </button>
      </div>
    </div>
  );
}
