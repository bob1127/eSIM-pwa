"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false); // 確保客戶端讀取完畢

  useEffect(() => {
    // 1. 初始化檢查 Session
    const initSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
      setIsHydrated(true);
    };

    initSession();

    // 2. 監聽全站登入狀態 (登入、登出、Token 刷新)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setIsHydrated(true);
    });

    // 3. 修正瀏覽器「上一頁」造成的登入狀態不同步：
    //    從商品頁跳去 /login 是整頁換頁，登入完成後用 router.replace()
    //    導回會員頁，此時原本的商品頁會被瀏覽器凍結進 bfcache。
    //    按上一頁回到該頁時，瀏覽器可能直接還原凍結當下（登入前）的畫面，
    //    不會重新執行任何 effect，因此需要監聽 pageshow / 分頁重新可見
    //    時主動重新讀取 session，讓畫面立即反映最新登入狀態。
    const resyncSession = () => {
      initSession();
    };
    const handlePageShow = (event) => {
      if (event.persisted) resyncSession();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") resyncSession();
    };
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", resyncSession);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", resyncSession);
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // Supabase access_token 供需要 Bearer Auth 的 API 使用
  const token = session?.access_token ?? null;

  return (
    <UserContext.Provider value={{ user, session, token, loading, isHydrated, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};