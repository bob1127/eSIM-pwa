"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useUser } from "@/components/context/UserContext";
import { isAdminEmail } from "@/lib/productAdminConfig";

/**
 * 商品頁內容編輯器 — 管理者狀態（與 /api/admin/verify 同步）
 */
export function useProductAdmin() {
  const { token, user } = useUser();
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  // 僅作樂觀 UI 顯示用；真正權限一律以 /api/admin/verify 的伺服器判斷為準。
  // 不可信任 user_metadata.role（使用者可透過 auth.updateUser 自行改寫）。
  const optimisticAdmin = useMemo(() => {
    const email = user?.email || session?.user?.email;
    if (email && isAdminEmail(email)) return true;
    if (user?.app_metadata?.role === "admin") return true;
    return false;
  }, [user, session?.user?.email]);

  /** @type {Record<string, string>} */
  const authHeaders = useMemo(() => {
    /** @type {Record<string, string>} */
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/verify", {
          credentials: "include",
          headers: authHeaders,
        });
        const data = res.ok ? await res.json() : { isAdmin: false };
        if (!cancelled) setIsAdmin(!!data.isAdmin);
      } catch {
        if (!cancelled) setIsAdmin(optimisticAdmin);
      } finally {
        if (!cancelled) setAdminChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHeaders, token, session?.user?.email, user?.email, optimisticAdmin]);

  return {
    isAdmin: adminChecked ? isAdmin : optimisticAdmin,
    adminChecked,
    authHeaders,
  };
}
