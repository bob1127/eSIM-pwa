"use client";

import { useState, useEffect, useCallback } from "react";
import { subscribeToPush as subscribeToPushApi } from "@/lib/pushSubscribe";
import {
  subscribeInstallPrompt,
  isPwaInstallAvailable,
  promptInstall,
} from "@/lib/pwaInstallPrompt";
import { isSafariBrowser, isChromiumBrowser } from "@/lib/deviceDetect";

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deviceType, setDeviceType] = useState("none");
  const [isStandalone, setIsStandalone] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isIpadOS = userAgent.includes("mac") && "ontouchend" in document;
    const isMacSafari =
      userAgent.includes("mac") &&
      !("ontouchend" in document) &&
      isSafariBrowser();

    const standaloneCheck =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    setIsStandalone(standaloneCheck);

    if (!standaloneCheck) {
      if (isIos || isIpadOS) {
        setDeviceType("ios");
      } else if (isMacSafari) {
        setDeviceType("mac");
      } else if (isChromiumBrowser()) {
        setDeviceType("android"); // Chrome／Edge／Android：可走 beforeinstallprompt
      }
    }

    const syncInstallable = (available) => {
      setIsInstallable(!!available);
      if (available) setDeviceType("none");
    };

    syncInstallable(isPwaInstallAvailable());
    const unsubscribe = subscribeInstallPrompt(syncInstallable);

    const onInstalled = () => {
      setIsInstallable(false);
      setDeviceType("none");
      setIsStandalone(true);
    };

    window.addEventListener("appinstalled", onInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  /**
   * Android／Chrome：直接跳出系統安裝視窗
   * @returns {Promise<'accepted'|'dismissed'|'unavailable'>}
   */
  const installPWA = useCallback(async () => {
    if (isStandalone) return "accepted";
    setInstalling(true);
    try {
      const { outcome } = await promptInstall();
      if (outcome === "accepted") {
        setIsStandalone(true);
        setIsInstallable(false);
      }
      return outcome;
    } finally {
      setInstalling(false);
    }
  }, [isStandalone]);

  const subscribeToPush = async ({ token, onStep } = {}) => {
    try {
      await subscribeToPushApi({ token, onStep });
      alert("🎉 推播已開啟！您將能第一時間接收專屬優惠與通知。");
    } catch (error) {
      alert(`訂閱過程中發生錯誤：\n${error.message}`);
      throw error;
    }
  };

  return {
    isInstallable,
    installPWA,
    installing,
    deviceType,
    isStandalone,
    subscribeToPush,
  };
}
