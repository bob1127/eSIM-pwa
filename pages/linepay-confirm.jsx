// /pages/linepay-confirm.jsx  或 /pages/linepay-confirm.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function LinePayConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState("確認付款中...");
  const [processing, setProcessing] = useState(false);

  const confirmPayment = async (transactionId, orderNo) => {
    if (processing) return;
    setProcessing(true);
    setStatus("✅ 已發送付款確認請求...");

    try {
      const res = await fetch("/api/linepay/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, orderNo }),
      });

      const result = await res.json();
      console.log("✅ LINE Pay confirm 回傳結果:", result);

      if (result.success) {
        setStatus("🎉 付款成功，前往完成頁...");
        router.replace(
          result.redirectUrl ||
            `/thank-you?status=success&method=linepay&tx=${encodeURIComponent(transactionId)}`
        );
      } else {
        setStatus(`❌ 付款失敗：${result.message || "未知錯誤"}`);
      }
    } catch (error) {
      console.error("❌ 發生錯誤:", error);
      setStatus("❌ 付款確認失敗：" + (error?.message || String(error)));
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (!router.isReady || processing) return;

    const { transactionId, orderNo } = router.query;
    const tid = Array.isArray(transactionId) ? transactionId[0] : transactionId;
    const ono = Array.isArray(orderNo) ? orderNo[0] : orderNo;

    if (!tid || !ono) {
      setStatus("❌ 缺少付款資訊（可能是 LINE Pay redirect URL 錯誤）");
      return;
    }

    confirmPayment(tid, ono || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, processing]);

  return (
    <div className="p-10 text-center text-xl whitespace-pre-line">{status}</div>
  );
}
