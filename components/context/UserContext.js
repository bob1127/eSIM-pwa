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

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <UserContext.Provider value={{ user, session, loading, isHydrated, logout }}>
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