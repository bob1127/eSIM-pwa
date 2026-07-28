"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import {
  normalizeReferralCode,
  writeReferralCookie,
  REFERRAL_COOKIE_DAYS,
} from "@/lib/partnerReferral";

/**
 * 捕捉官網 ?ref= / ?partner=，記錄點擊，並請伺服器簽發歸因用 Cookie。
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

    const raw =
      (typeof router.query.ref === "string" && router.query.ref) ||
      (typeof router.query.partner === "string" && router.query.partner) ||
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
    }).catch(() => {});
  }, [router.isReady, router.query.ref, router.query.partner]);

  return null;
}
