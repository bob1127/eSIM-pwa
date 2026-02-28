// ✅ ThankYouPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useCart } from "@/components/context/CartContext";

/* ---------- 型別 ---------- */
interface QrcodeInfo {
  name: string;
  src: string;
}
interface OrderInfo {
  status: string | null;
  message?: string | null;
  MerchantOrderNo?: string;
  PaymentType?: string;
  PayTime?: string;
  TradeNo?: string;
}
interface OffsiteInfo {
  PaymentType?: string;
  BankCode?: string;
  CodeNo?: string;
  PaymentNo?: string;
  StoreType?: string;
  ExpireDate?: string;
  TradeNo?: string;
  Amt?: number | string;
}

/* ---------- 元件 ---------- */
export default function ThankYouPage() {
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [offsiteInfo, setOffsiteInfo] = useState<OffsiteInfo | null>(null);
  const [qrcodes, setQrcodes] = useState<QrcodeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const { clearCart } = useCart();

  // ✅ 只取一次：URL > 近 15 分鐘內的 lastOrderNoPayload > 最後才 fallback lastOrderNo
  const orderNo = useMemo<string>(() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search);
    const fromUrl = p.get("orderNo") || "";
    const hasStatusOnly = !!p.get("status") && !fromUrl;

    if (fromUrl) {
      try {
        localStorage.setItem("lastOrderNo", fromUrl);
        localStorage.setItem(
          "lastOrderNoPayload",
          JSON.stringify({ orderNo: fromUrl, ts: Date.now() })
        );
      } catch {}
      return fromUrl;
    }

    if (hasStatusOnly) {
      try {
        const raw = localStorage.getItem("lastOrderNoPayload");
        if (raw) {
          const { orderNo: recentNo, ts } = JSON.parse(raw || "{}");
          if (
            recentNo &&
            typeof ts === "number" &&
            Date.now() - ts <= 15 * 60 * 1000
          ) {
            return String(recentNo);
          }
        }
      } catch {}
      return "";
    }

    try {
      return localStorage.getItem("lastOrderNo") || "";
    } catch {
      return "";
    }
  }, []);

  const pendingHref = useMemo(
    () =>
      orderNo ? `/pending?orderNo=${encodeURIComponent(orderNo)}` : "/account",
    [orderNo]
  );

  const clearedOnceRef = useRef(false);

  const isPaid = (status?: string | null) => {
    if (!status) return false;
    const s = String(status).toLowerCase();
    return (
      s === "success" ||
      s === "paid" ||
      s === "successpaid" ||
      s === "success_paid"
    );
  };

  const copyText = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert("已複製到剪貼簿");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        alert("已複製到剪貼簿");
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const fetchOrderOnce = useCallback(async () => {
    if (!orderNo) return { ok: false };
    try {
      const res = await axios.get("/api/fetch-order", { params: { orderNo } });
      const { qrcodes, orderInfo, offsiteInfo } = res.data ?? {};
      setOrderInfo(orderInfo || null);
      setOffsiteInfo(offsiteInfo || null);
      setQrcodes(Array.isArray(qrcodes) ? qrcodes : []);

      if (!clearedOnceRef.current && isPaid(orderInfo?.status)) {
        clearedOnceRef.current = true;
        clearCart();
      }
      return {
        ok: true,
        paid: isPaid(orderInfo?.status),
        hasQR: Array.isArray(qrcodes) && qrcodes.length > 0,
      };
    } catch (err) {
      console.error("❌ 抓取訂單資料失敗", err);
      return { ok: false };
    }
  }, [orderNo, clearCart]);

  const triesRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTries = 18;

  const startPolling = useCallback(() => {
    if (timerRef.current || !orderNo) return;
    timerRef.current = setInterval(async () => {
      triesRef.current += 1;
      const r = await fetchOrderOnce();
      if ((r.paid && r.hasQR) || triesRef.current >= maxTries) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 5000);
  }, [orderNo, fetchOrderOnce]);

  useEffect(() => {
    (async () => {
      if (!orderNo) {
        setLoading(false);
        return;
      }
      await fetchOrderOnce();
      setLoading(false);
      startPolling();
    })();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [orderNo, fetchOrderOnce, startPolling]);

  const showOffsiteCard =
    !!offsiteInfo && !!orderInfo && !isPaid(orderInfo.status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold mb-4">感謝您的訂購</h1>

      {!orderNo && (
        <div className="bg-red-50 border border-red-100 rounded p-4 mb-6 text-red-700">
          找不到訂單編號。請返回「我的帳戶 &gt; QR Code 訂單」查詢。
        </div>
      )}

      {orderInfo ? (
        <div className="bg-gray-100 p-6 rounded space-y-2">
          <p>付款狀態：{orderInfo.status}</p>
          {orderInfo.MerchantOrderNo && (
            <>
              <p>訂單編號：{orderInfo.MerchantOrderNo}</p>
              <p>付款方式：{orderInfo.PaymentType || "—"}</p>
              <p>付款時間：{orderInfo.PayTime || "—"}</p>
              <p>交易序號：{orderInfo.TradeNo || "—"}</p>
            </>
          )}
        </div>
      ) : (
        <p>正在解析交易資訊...</p>
      )}

      {showOffsiteCard && (
        <div className="mt-6 p-5 rounded-lg border border-yellow-200 bg-yellow-50">
          <h3 className="font-semibold text-yellow-900 mb-3">
            匯款 / 代碼繳費資訊
          </h3>
          {(offsiteInfo?.PaymentType === "VACC" ||
            offsiteInfo?.PaymentType === "WEBATM") && (
            <div className="space-y-2">
              <p>
                銀行代碼：
                <span className="font-mono">
                  {offsiteInfo.BankCode || "—"}
                </span>{" "}
                <button
                  className="ml-2 text-sm underline text-blue-700"
                  onClick={() => copyText(offsiteInfo.BankCode)}
                >
                  複製
                </button>
              </p>
              <p>
                虛擬帳號：
                <span className="font-mono break-all">
                  {offsiteInfo.CodeNo || "—"}
                </span>{" "}
                <button
                  className="ml-2 text-sm underline text-blue-700"
                  onClick={() => copyText(offsiteInfo.CodeNo)}
                >
                  複製
                </button>
              </p>
              <p>繳費期限：{offsiteInfo.ExpireDate || "—"}</p>
              {offsiteInfo.Amt && <p>應繳金額：${offsiteInfo.Amt}</p>}
            </div>
          )}

          {offsiteInfo?.PaymentType === "CVS" && (
            <div className="space-y-2">
              <p>超商別：{offsiteInfo.StoreType || "—"}</p>
              <p>
                繳費代碼：
                <span className="font-mono break-all">
                  {offsiteInfo.PaymentNo || offsiteInfo.CodeNo || "—"}
                </span>{" "}
                <button
                  className="ml-2 text-sm underline text-blue-700"
                  onClick={() =>
                    copyText(offsiteInfo.PaymentNo || offsiteInfo.CodeNo)
                  }
                >
                  複製
                </button>
              </p>
              <p>繳費期限：{offsiteInfo.ExpireDate || "—"}</p>
              {offsiteInfo.Amt && <p>應繳金額：${offsiteInfo.Amt}</p>}
            </div>
          )}

          {!["VACC", "WEBATM", "CVS"].includes(
            String(offsiteInfo?.PaymentType || "")
          ) && (
            <div className="space-y-2">
              <p>付款方式：{offsiteInfo?.PaymentType || "—"}</p>
              {offsiteInfo?.CodeNo && (
                <p>
                  代碼：
                  <span className="font-mono break-all">
                    {offsiteInfo.CodeNo}
                  </span>{" "}
                  <button
                    className="ml-2 text-sm underline text-blue-700"
                    onClick={() => copyText(offsiteInfo.CodeNo)}
                  >
                    複製
                  </button>
                </p>
              )}
              {offsiteInfo?.ExpireDate && (
                <p>繳費期限：{offsiteInfo.ExpireDate}</p>
              )}
              {offsiteInfo?.Amt && <p>應繳金額：${offsiteInfo.Amt}</p>}
            </div>
          )}
        </div>
      )}

      <div className="mt-10 space-y-4">
        {loading && <p>正在載入 QRCode...</p>}

        {!loading && isPaid(orderInfo?.status) && qrcodes.length === 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded p-4 text-blue-800">
            付款完成，正在產生 eSIM 與發票，請稍候…（系統會自動更新）
            <div className="mt-3 flex gap-2">
              <a
                href={pendingHref}
                className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
              >
                前往訂單追蹤
              </a>
              <button
                onClick={() => location.reload()}
                className="px-3 py-1.5 rounded border text-sm"
              >
                重新整理
              </button>
            </div>
          </div>
        )}

        {!loading && qrcodes.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">請掃描下方 QRCode 啟用 eSIM</h2>
            {qrcodes.map((q, i) => (
              <div key={i} className="text-center">
                <p className="font-semibold mb-2">{q.name}</p>
                <img
                  src={q.src}
                  alt={`eSIM QRCode ${i + 1}`}
                  className="w-64 h-64 mx-auto"
                />
              </div>
            ))}
            <p className="text-sm text-gray-600">
              我們也已將 QRCode 寄到您的信箱；若未收到，請檢查垃圾郵件匣。
            </p>
          </div>
        )}

        {!loading && qrcodes.length === 0 && !isPaid(orderInfo?.status) && (
          <div className="text-gray-700">
            目前尚未取得 QRCode。若您剛完成付款，請稍候片刻或
            <a href={pendingHref} className="underline ml-1">
              前往訂單追蹤
            </a>{" "}
            查看。
          </div>
        )}
      </div>
    </div>
  );
}
