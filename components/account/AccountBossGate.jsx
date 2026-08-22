"use client";

import { useEffect, useState } from "react";
import AccountIcon from "@/components/account/AccountIcon";
import {
  getBossToken,
  clearBossSession,
  getBossEmail,
} from "@/lib/bossAdminClient";
import BossInlineLogin from "./BossInlineLogin";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

/** 包裹需 Medusa Token 的總部功能 */
export default function AccountBossGate({ children, onAuthChange }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  const verifySession = async () => {
    const token = getBossToken();
    if (!token) {
      setAuthenticated(false);
      setAdminUser(null);
      onAuthChange?.(false, null);
      return false;
    }
    try {
      const res = await fetch("/api/admin/session", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.authenticated) {
        setAuthenticated(true);
        setAdminUser(data.user);
        onAuthChange?.(true, data.user);
        return true;
      }
      clearBossSession();
      setAuthenticated(false);
      onAuthChange?.(false, null);
      return false;
    } catch {
      clearBossSession();
      setAuthenticated(false);
      onAuthChange?.(false, null);
      return false;
    }
  };

  useEffect(() => {
    verifySession().finally(() => setChecking(false));
  }, []);

  const handleLogin = (user) => {
    setAdminUser(user);
    setAuthenticated(true);
    onAuthChange?.(true, user);
  };

  const handleLogout = () => {
    clearBossSession();
    setAuthenticated(false);
    setAdminUser(null);
    onAuthChange?.(false, null);
  };

  if (checking) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
        <LoadingIndicator layout="center" label="驗證總部權限…" size="md" />
      </div>
    );
  }

  if (!authenticated) {
    return <BossInlineLogin onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-sm px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <AccountIcon name="verified_user" size={20} className="text-emerald-600" />
          <span className="text-slate-600">
            已登入：
            <strong className="text-[#1E4AD1] ml-1">
              {adminUser?.first_name || getBossEmail() || "管理員"}
            </strong>
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs font-bold text-slate-500 border border-slate-200 px-3 py-1.5 rounded-sm hover:bg-slate-50"
        >
          登出總部帳號
        </button>
      </div>
      {typeof children === "function" ? children({ adminUser, refreshAuth: verifySession }) : children}
    </div>
  );
}
