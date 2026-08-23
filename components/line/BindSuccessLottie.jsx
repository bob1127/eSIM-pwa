"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

/**
 * 綁定成功慶祝動畫。
 * 預設：public/Lottie/bind-success.json
 * 若要換成指定 LottieFiles 動畫，下載 JSON 覆蓋同路徑即可。
 */
export default function BindSuccessLottie({ className = "" }) {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/Lottie/bind-success.json");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAnimationData(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const box = className || "mx-auto h-28 w-28";

  if (!animationData) {
    return (
      <div className={`flex items-center justify-center ${box}`} aria-hidden>
        <span className="text-4xl">✓</span>
      </div>
    );
  }

  return (
    <div className={box} aria-hidden>
      <Lottie
        animationData={animationData}
        loop={false}
        autoplay
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
