// /pages/linepay-confirm.jsx  或 /pages/linepay-confirm.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function LinePayConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState("確認付款中...");
  const [processing, setProcessing] = useState(false);

  const confirmPayment = async (transactionId, amount, orderId) => {
    if (processing) return;
    setProcessing(true);
    setStatus("✅ 已發送付款確認請求...");

    try {
      const res = await fetch("/api/linepay/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, amount }),
      });

      const result = await res.json();
      console.log("✅ LINE Pay confirm 回傳結果:", result);

      if (result.returnCode === "0000") {
        setStatus("🎉 付款成功，前往完成頁...");
        router.replace(
          `/thank-you?status=success&method=linepay&tx=${encodeURIComponent(
            transactionId
          )}&amount=${amount}${
            orderId ? `&oid=${encodeURIComponent(orderId)}` : ""
          }`
        );
      } else {
        setStatus(`❌ 付款失敗：${result.returnMessage || "未知錯誤"}`);
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

    const { transactionId, amount, orderId } = router.query;
    const tid = Array.isArray(transactionId) ? transactionId[0] : transactionId;
    const amtStr = Array.isArray(amount) ? amount[0] : amount;
    const oid = Array.isArray(orderId) ? orderId[0] : orderId;
    const amt = amtStr ? parseInt(amtStr, 10) : NaN;

    if (!tid || Number.isNaN(amt)) {
      setStatus("❌ 缺少付款資訊（可能是 LINE Pay redirect URL 錯誤）");
      return;
    }

    confirmPayment(tid, amt, oid || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, processing]);

  return (
    <div className="p-10 text-center text-xl whitespace-pre-line">{status}</div>
  );
}
