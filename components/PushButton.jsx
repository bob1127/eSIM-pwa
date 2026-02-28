"use client";
import { useState, useEffect } from "react";
// 🌟 引入你的 UserContext (請確認相對路徑是否正確)
import { useUser } from "./context/UserContext";

// Web Push 必備的 Base64 轉換工具
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushButton() {
  const { token } = useUser();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // 檢查瀏覽器是否支援 Service Worker 與 推播功能
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          if (sub) setIsSubscribed(true);
        });
      });
    }
  }, []);

  const subscribeUser = async () => {
    // 防呆檢查：確保用戶已經登入
    if (!token) {
      alert("請先登入會員，才能開啟專屬流量提醒喔！");
      return;
    }

    try {
      // 1. 請求通知權限
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("您拒絕了通知權限，若要接收流量提醒，請至瀏覽器設定開啟。");
        return;
      }

      // 🌟 2. 取得推播訂閱憑證 (注意這裡改成 let 了)
      let registration = await navigator.serviceWorker.getRegistration();

      // 防呆機制：如果沒有註冊 Service Worker，跳出警告並阻擋
      if (!registration) {
        alert(
          "找不到 Service Worker！\n\n這通常是因為您目前處於開發模式 (npm run dev)，或發生了 React 錯誤導致 SW 無法載入。\n\n如要測試推播，請使用指令：\nnpm run build && npm run start",
        );
        return;
      }

      // 🌟🌟🌟 終極修復：強制等待 Service Worker 狀態變成「完全準備就緒 (ready)」才往下走！
      registration = await navigator.serviceWorker.ready;

      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      // 注意這裡：已經幫你補上 /website_d17cf1ea 子目錄了！
      const res = await fetch(
        "https://inf.fjg.mybluehost.me/website_d17cf1ea/wp-json/jeko/v1/save-subscription",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subscription: subscription,
          }),
        },
      );

      if (res.ok) {
        setIsSubscribed(true);
        console.log("✅ 推播憑證已成功存入 WordPress 資料庫！");
      } else {
        const errorData = await res.json();
        console.error("儲存憑證到 WordPress 失敗:", errorData);
        alert(`設定失敗：${errorData.message || "伺服器錯誤"}`);
      }
    } catch (error) {
      console.error("訂閱過程發生錯誤:", error);
    }
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={subscribeUser}
      disabled={isSubscribed}
      className={`px-8 py-3 rounded-full font-bold text-white transition-all shadow-md active:scale-95 ${
        isSubscribed
          ? "bg-slate-400 cursor-not-allowed"
          : "bg-[#147AD7] hover:bg-blue-600"
      }`}
    >
      {isSubscribed ? "🔔 已開啟流量提醒通知" : "開啟流量提醒通知 ✈️"}
    </button>
  );
}
