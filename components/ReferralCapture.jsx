"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import {
  normalizeReferralCode,
  writeReferralCookie,
  REFERRAL_COOKIE_DAYS,
} from "@/lib/partnerReferral";

/**
 * 捕捉官網 ?ref= / ?partner= ，寫入 Cookie，並記錄點擊。
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
