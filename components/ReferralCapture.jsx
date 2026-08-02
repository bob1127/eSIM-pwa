"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import {
  normalizeReferralCode,
  writeReferralCookie,
  REFERRAL_COOKIE_DAYS,
} from "@/lib/partnerReferral";
import { PENDING_COUPON_KEY } from "@/lib/partnerReferralDiscount";

/**
 * 捕捉官網 ?ref= / ?partner=，記錄點擊，並請伺服器簽發歸因用 Cookie。
 * 若帶 ?coupon=，寫入 sessionStorage，結帳時自動套用折扣碼。
 *
 * 這裡仍會順手寫一顆非 HttpOnly 的 `jeko_ref`（見 lib/partnerReferral.js），
 * 但那只是即時、非權威的顯示用途；真正計算分潤時，後端只信任
 * /api/referral/hit 簽發、含時間戳與 HMAC 簽章的 HttpOnly Cookie
 * （見 lib/referralSignature.js），使用者無法在瀏覽器端竄改代碼或延長效期。
 */
export default function ReferralCapture() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const couponRaw =
      typeof router.query.coupon === "string" ? router.query.coupon : "";
    if (couponRaw && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          PENDING_COUPON_KEY,
          couponRaw.trim().toUpperCase(),
        );
      } catch {
        /* ignore */
      }
    }

    const raw =
      (typeof router.query.ref === "string" && router.query.ref) ||
      (typeof router.query.partner === "string" && router.query.partner) ||
      (couponRaw ? normalizeReferralCode(couponRaw) : "") ||
      "";
    const code = normalizeReferralCode(raw);
    if (!code) return;

    writeReferralCookie(code, REFERRAL_COOKIE_DAYS);

    const landing =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "";

    fetch("/api/referral/hit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, landing_path: landing }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (!data?.pending_coupon || typeof window === "undefined") return;
        try {
          // URL 已帶 coupon 時優先保留；否則用 hit API 確認可折扣後再排隊
          const existing = sessionStorage.getItem(PENDING_COUPON_KEY);
          if (!existing) {
            sessionStorage.setItem(
              PENDING_COUPON_KEY,
              String(data.pending_coupon).toUpperCase(),
            );
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
  }, [
    router.isReady,
    router.query.ref,
    router.query.partner,
    router.query.coupon,
  ]);

  return null;
}
