"use client";
import { useState } from "react";
import Layout from "../Layout";
import { useUser } from "../../components/context/UserContext";
import { BellIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { PWA_LOGO } from "../../lib/pwaConfig";

const INTERNAL_SECRET = "jeko-push-secret-2026";

export default function AdminPushPage() {
  const { user } = useUser();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("/");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [result, setResult] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!confirm(`確定要發送廣播推播給所有訂閱用戶嗎？`)) return;

    setStatus("sending");
    setResult(null);

    try {
      const res = await fetch("/api/send-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: INTERNAL_SECRET,
          title,
          body,
          url: linkUrl,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setResult(data);
        setTitle("");
        setBody("");
        setLinkUrl("/");
      } else {
        setStatus("error");
        setResult({
          error: data.error || "未知錯誤",
          detail: data.detail,
          hint: data.hint,
        });
      }
    } catch (err) {
      console.error("推播發送失敗:", err);
      setStatus("error");
      setResult({ error: "連線失敗" });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-stone-50 pb-20">
        <div className="max-w-2xl mx-auto w-[92%]">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#0A6CD0] rounded-xl flex items-center justify-center">
                <BellIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-black text-stone-900">發送 PWA 推播通知</h1>
            </div>
            <p className="text-sm text-stone-500 mb-8 pl-13 border-l-4 border-orange-400 pl-4 ml-1 mt-2">
              廣播推播給所有已訂閱的用戶（已安裝 PWA 且開啟通知）
            </p>

            <form onSubmit={handleSend} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  推播標題 <span className="text-stone-400 font-normal">（建議 20 字內）</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例：⚡ Jeko eSIM 日本 5GB 限時特惠！"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#0A6CD0]/30 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  推播內容
                </label>
                <textarea
                  required
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="例：輸入折扣碼 JEKO88 享全站 88 折，活動截止 6/30！"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#0A6CD0]/30 transition-all text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  點擊後跳轉頁面 <span className="text-stone-400 font-normal">（相對路徑）</span>
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="/ 或 /product/ 或 /data-query/"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#0A6CD0]/30 transition-all text-sm"
                />
              </div>

              {/* 預覽 */}
              {title && (
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                  <p className="text-xs font-bold text-stone-400 mb-2 uppercase tracking-widest">
                    推播預覽
                  </p>
                  <div className="flex items-start gap-3">
                    <img
                      src={PWA_LOGO}
                      className="w-10 h-10 rounded-xl shrink-0"
                      alt="icon"
                    />
                    <div>
                      <p className="font-bold text-stone-900 text-sm">{title}</p>
                      <p className="text-stone-600 text-sm mt-0.5">{body}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all ${
                  status === "sending"
                    ? "bg-stone-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#0A6CD0] to-[#0851A8] hover:from-[#0851A8] hover:to-[#063d82] shadow-md"
                }`}
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                {status === "sending" ? "發送中..." : "立即廣播推播"}
              </button>
            </form>

            {/* 結果顯示 */}
            {result && (
              <div
                className={`mt-5 rounded-xl p-4 text-sm font-medium ${
                  status === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}
              >
                {status === "success" ? (
                  <>
                    ✅ 成功發送 <strong>{result.sent}</strong> 則 / 共{" "}
                    <strong>{result.total}</strong> 位訂閱者
                    {result.removed > 0 && (
                      <span className="ml-2 text-stone-500">
                        （清除 {result.removed} 筆失效訂閱）
                      </span>
                    )}
                  </>
                ) : (
                  <div className="space-y-1">
                    <p>❌ 發送失敗：{result.error}</p>
                    {result.detail && (
                      <p className="text-xs font-normal opacity-80">
                        詳細：{result.detail}
                      </p>
                    )}
                    {result.hint && (
                      <p className="text-xs font-normal opacity-80">
                        提示：{result.hint}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
