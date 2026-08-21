// /pages/linepay-confirm.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

export default function LinePayConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState("確認付款中...");
  const startedRef = useRef(false);

  useEffect(() => {
    if (!router.isReady || startedRef.current) return;

    const { transactionId, orderNo } = router.query;
    const tid = Array.isArray(transactionId) ? transactionId[0] : transactionId;
    const ono = Array.isArray(orderNo) ? orderNo[0] : orderNo;

    if (!tid || !ono) {
      setStatus("❌ 缺少付款資訊（可能是 LINE Pay redirect URL 錯誤）");
      return;
    }

    // 只允許跑一次，避免失敗後 processing=false 觸發無限重試
    startedRef.current = true;
    setStatus("✅ 已發送付款確認請求...");

    (async () => {
      try {
        const res = await fetch("/api/linepay/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: tid, orderNo: ono }),
        });

        const result = await res.json();
        console.log("LINE Pay confirm 回傳結果:", result);

        if (result.success) {
          setStatus("🎉 付款成功，前往完成頁...");
          router.replace(
            result.redirectUrl ||
              `/thank-you?status=success&method=linepay&tx=${encodeURIComponent(String(tid))}`,
          );
        } else {
          setStatus(`❌ 付款失敗：${result.message || "未知錯誤"}`);
        }
      } catch (error) {
        console.error("LINE Pay confirm 錯誤:", error);
        setStatus("❌ 付款確認失敗：" + (error?.message || String(error)));
      }
    })();
  }, [router.isReady, router.query, router]);

  return (
    <div className="p-10 text-center text-xl whitespace-pre-line">{status}</div>
  );
}
