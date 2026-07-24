"use client";

import { useEffect } from "react";
import { getServiceWorkerUrl } from "@/lib/pushSw";
import { initInstallPromptCapture } from "@/lib/pwaInstallPrompt";

/**
 * 頁面載入即註冊 Service Worker，並攔截 beforeinstallprompt
 * 供「安裝 APP」按鈕直接呼叫系統安裝對話框（Android／Chrome）。
 */
export default function PWARegister() {
  useEffect(() => {
    initInstallPromptCapture();

    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register(getServiceWorkerUrl(), { scope: "/" })
      .catch((err) => {
        console.warn("[PWA] Service Worker 註冊失敗:", err);
      });
  }, []);

  return null;
}
