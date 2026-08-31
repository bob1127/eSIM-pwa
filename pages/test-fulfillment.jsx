import React, { useState } from "react";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

export default function TestFulfillmentPage() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleTriggerFulfillment = async () => {
    if (!orderId.trim()) {
      setError("請先輸入 Supabase 訂單的 UUID");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/fulfillment/send-esim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: orderId.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "發貨 API 回傳錯誤");
      }

      setResult(data);
    } catch (err) {
      console.error("❌ 測試發貨出錯:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-20 px-4 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          🚀 eSIM 發貨與寄信測試面板
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          請到 Supabase 的 orders 資料表，複製一筆擁有 items (購物車內容) 的訂單
          UUID 貼在下方。
        </p>

        <div className="flex flex-col gap-4 mb-8">
          <label className="text-sm font-bold text-slate-700">
            Supabase Order ID (UUID)
          </label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="例如：550e8400-e29b-41d4-a716-446655440000"
            className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <button
            onClick={handleTriggerFulfillment}
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold transition-all ${
              loading
                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
            }`}
          >
            {loading ? (
              <LoadingIndicator
                layout="inline"
                size="sm"
                label="連線供應商並寄信中，請稍候..."
              />
            ) : (
              "⚡ 立即執行發貨程式"
            )}
          </button>
        </div>

        {/* 錯誤訊息顯示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            <strong>發生錯誤：</strong> {error}
          </div>
        )}

        {/* 成功結果顯示 */}
        {result && (
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
            <h3 className="text-green-800 font-bold mb-4 flex items-center gap-2">
              ✅ 發貨流程執行成功！
            </h3>

            {/* 渲染拿到的 QR Code */}
            {result.codes && result.codes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.codes.map((code, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded border border-green-100 shadow-sm flex flex-col items-center text-center"
                  >
                    <p className="font-bold text-slate-700 text-sm mb-2">
                      {code.productName}
                    </p>
                    <img
                      src={code.qrcodeUrl}
                      alt="QR Code"
                      className="w-32 h-32 object-contain mb-2"
                    />
                    <p className="text-xs text-slate-400 font-mono">
                      Topup ID: {code.topupId}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-700">
                API 回傳成功，但沒有偵測到 QR Code 圖片資料。
              </p>
            )}

            <div className="mt-6 pt-4 border-t border-green-200">
              <p className="text-sm text-green-800 font-medium mb-2">
                請去檢查這筆訂單填寫的 Email 信箱，看看有沒有收到信！
              </p>
              <details className="text-xs text-slate-500 cursor-pointer">
                <summary>查看完整 API 回傳 JSON</summary>
                <pre className="mt-2 bg-slate-800 text-green-400 p-4 rounded overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
