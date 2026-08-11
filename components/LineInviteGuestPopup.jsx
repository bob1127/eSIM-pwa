"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useUser } from "@/components/context/UserContext";
import { CONTACT_INFO } from "@/lib/contactUi";
import {
  dismissLineInvitePopup,
  isLineInviteDismissed,
} from "@/lib/lineInvitePopup";

const LINE_OA = CONTACT_INFO.lineUrl;

/**
 * 未登入訪客首頁彈窗（情境 B 入口）
 * 設計對齊 WelcomeGiftPopup：people.png + 白卡 + 綠鈕
 *
 * - 僅首頁 `/`
 * - 僅未登入
 * - 關閉後 7 天內不再跳出
 * - 文案明確：加 LINE 後仍須加入會員才能領用 50 元
 */
export default function LineInviteGuestPopup() {
  const [open, setOpen] = useState(false);
  const { user, isHydrated } = useUser();
  const { status: navStatus } = useSession();
  const router = useRouter();

  const close = useCallback(() => {
    dismissLineInvitePopup();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!router.isReady || !isHydrated || navStatus === "loading") return;

    const onHome = router.pathname === "/";
    if (!onHome) {
      setOpen(false);
      return;
    }

    const loggedIn = !!user || navStatus === "authenticated";
    if (loggedIn) {
      setOpen(false);
      return;
    }

    if (isLineInviteDismissed()) {
      setOpen(false);
      return;
    }

    // 稍等再開，避免首屏搶戲過猛
    const t = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(t);
  }, [router.isReady, router.pathname, isHydrated, navStatus, user]);

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
      className="fixed inset-0 z-[99998] flex items-center justify-center px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="line-invite-title"
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
                alt="加入官方 LINE 享 50 元折扣"
                fill
                className="object-contain"
                sizes="200px"
                priority
              />
            </div>

            <h2
              id="line-invite-title"
              className="text-[22px] font-black text-slate-900 leading-snug tracking-tight"
            >
              加入官方 LINE
              <br />
              享 50 元折扣金
            </h2>
            <p className="mt-3 text-[13px] text-slate-500 leading-relaxed">
              先加好友、再註冊成為會員即可領用。
              <br />
              僅加 LINE 不會發券；終身限領一次。
            </p>
          </div>

          <a
            href={LINE_OA}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#06C755] hover:bg-[#05b34c] transition-colors px-5 py-4 text-center"
            onClick={close}
          >
            <span className="text-[15px] font-bold text-white tracking-wide">
              加入官方 LINE
            </span>
          </a>
        </div>

        <p className="mt-5 text-center px-2 text-[13px] font-medium text-white leading-snug">
          注意：仍須加入會員後才能領用 50 元折扣
        </p>

        <div className="mt-3 flex items-center gap-2">
          <a
            href="/login"
            onClick={close}
            className="inline-flex items-center justify-center rounded-full bg-white text-slate-700 text-sm font-bold px-6 py-2.5 shadow-md hover:bg-slate-50 transition"
          >
            去註冊／登入
          </a>
          <button
            type="button"
            onClick={close}
            className="inline-flex items-center justify-center rounded-full bg-white/90 text-slate-600 text-sm font-bold px-6 py-2.5 shadow-md hover:bg-white transition"
          >
            稍後再說
          </button>
        </div>
      </div>
    </div>
  );
}
