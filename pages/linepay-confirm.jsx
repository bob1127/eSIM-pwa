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
                      body: JSON.stringify({
                        transactionId: String(tid),
                        orderNo: String(ono),
                      }),
                    });

                    const raw = await res.text();
                    let result = {};
                    try {
                      result = raw ? JSON.parse(raw) : {};
                    } catch {
                      setStatus(
                        `❌ 付款失敗：確認 API 回傳非 JSON（HTTP ${res.status}）\n${String(raw).slice(0, 180)}`,
                      );
                      return;
                    }

                    if (result.success) {
                      setStatus("🎉 付款成功，前往完成頁...");
                      router.replace(
                        result.redirectUrl ||
                          `/thank-you?status=success&method=linepay&tx=${encodeURIComponent(String(tid))}`,
                      );
                      return;
                    }

                    const detail =
                      typeof result.detail === "string"
                        ? result.detail
                        : result.detail?.returnMessage ||
                          result.detail?.returnCode ||
                          "";
                    const msg =
                      result.message ||
                      (raw
                        ? `HTTP ${res.status}（有內容但無 message）`
                        : `HTTP ${res.status}（空回應，多半是 Medusa URL 打錯或 backend 掛了）`);
                    setStatus(
                      `❌ 付款失敗：${[msg, detail].filter(Boolean).join("／")}`,
                    );
                  } catch (error) {
                    console.error("LINE Pay confirm 錯誤:", error);
                    setStatus(
                      "❌ 付款確認失敗：" +
                        (error?.message || String(error)),
                    );
                  }
                })();
  }, [router.isReady, router.query, router]);

  return (
    <div className="p-10 text-center text-xl whitespace-pre-line">{status}</div>
  );
}
