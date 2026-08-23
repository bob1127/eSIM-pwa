"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import {
  consumeAuthRedirect,
  peekAuthRedirect,
  consumeJustRegistered,
  resolvePostAuthDestination,
} from "@/lib/authRedirect";
import { markWelcomeGiftPopup } from "@/lib/welcomeGiftPopup";

/**
 * Supabase OAuth 回傳時 URL hash 帶 access_token。
 * 確保 session 寫入、清除 hash，並導回原頁；首次註冊則進會員中心。
 */
export default function SupabaseOAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash || "";
    const hasOAuthHash =
      hash.includes("access_token") || hash.includes("error=");

    if (!hasOAuthHash) return;

    let cancelled = false;

    const finish = (session) => {
      if (cancelled) return;

      const path = window.location.pathname;
      const search = window.location.search;
      window.history.replaceState(null, "", `${path}${search}`);

      if (session && (path === "/" || path === "/login" || path === "/login/")) {
        const params = new URLSearchParams(search);
        const fromQuery = params.get("redirect") || params.get("callbackUrl");
        const justRegistered = consumeJustRegistered();
        const dest = resolvePostAuthDestination(
          fromQuery || peekAuthRedirect("/account"),
          {
            justRegistered,
            supabaseUser: session.user,
          },
        );
        if (justRegistered || dest === "/account") {
          if (justRegistered) markWelcomeGiftPopup();
        }
        consumeAuthRedirect(dest);
        if (dest !== path + search) {
          router.replace(dest);
        }
      } else if (!session && hash.includes("error=")) {
        router.replace("/login?error=oauth");
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        finish(session);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
