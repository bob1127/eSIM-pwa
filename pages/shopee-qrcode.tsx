import { useState } from "react";
import Layout from "./Layout.js";

export default function ShopeeQRCodePage() {
  const [orderNo, setOrderNo] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:3000/api/shopee-to-esim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopee_order_no: orderNo, email }),
      });

      const data = await res.json();

      if (data?.alreadyRedeemed) {
        setMessage("⚠️ 此訂單已完成兌換，無需再次提交。如有問題請聯絡我們");
      } else if (data?.success) {
        setMessage("✅ 已成功產生 QRCode 並寄送至您的信箱！");
      } else {
        setMessage(
          `❌ 發生錯誤：${data?.error || data?.message || "請稍後再試或洽客服"}`
        );
      }
    } catch (error) {
      setMessage("❌ 系統錯誤，請稍後再試。");
    }

    setLoading(false);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1C82E0] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row gap-8 text-white">
          {/* 左側：表單區 */}
          <div className="flex-1 rounded-3xl bg-white/5 hover:bg-white/15 duration-300 border border-white/20 shadow-xl px-6 py-8 md:px-10 md:py-10 backdrop-blur-sm">
            {/* 標題 */}
            <div className="mb-8 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-wide">
                eSIM 蝦皮訂單兌換
              </h1>
              <p className="mt-2 text-xs md:text-sm text-white/70">
                輸入蝦皮訂單編號，我們將為您產生 eSIM QR Code 並寄送到信箱
              </p>
            </div>

            {/* 表單 */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-white/70">
                  蝦皮訂單編號
                </label>
                <input
                  type="text"
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  className="mt-1 block w-full bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-0"
                  placeholder="例如：SP123456789"
                  required
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-white/70">
                  收件信箱（選填）
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full bg-transparent border-0 border-b border-white/70 py-2 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-0"
                  placeholder="若留空則使用蝦皮訂單信箱"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`mt-4 w-full rounded-full bg-white/95 py-2.5 text-sm font-semibold text-[#1C82E0] tracking-wide shadow-sm transition hover:bg-white ${
                  loading ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "處理中…" : "產生 QRCode 並寄送"}
              </button>
            </form>

            {/* 訊息顯示 */}
            {message && (
              <div className="mt-6 rounded-2xl bg-black/10 px-4 py-3 text-center text-xs md:text-sm text-white/90 whitespace-pre-wrap">
                {message}
              </div>
            )}

            {/* 備註 */}
            <div className="mt-8 text-center md:text-left">
              <p className="text-[11px] leading-relaxed text-white/60">
                每筆訂單僅能兌換一次。若系統偵測此訂單已產生過 QRCode，
                <br className="hidden md:block" />
                將不會重複處理與寄信。如有疑問請聯絡客服協助處理。
              </p>
            </div>
          </div>

          {/* 右側：說明區 */}
          <div className="w-full lg:w-5/12 rounded-3xl border border-white/20 hover:bg-white/15 duration-300 bg-white/10 px-6 py-8 md:px-8 md:py-10 backdrop-blur-sm text-sm leading-relaxed text-white/85">
            <h2 className="text-base md:text-lg font-semibold tracking-wide mb-4">
              INFO
            </h2>

            <p className="text-xs md:text-sm mb-4">
              提供蝦皮訂單購買的 eSIM
              商品進行兌換使用。請輸入您的蝦皮訂單編號與有效的收件信箱，我們將會產生對應的
              eSIM QRCode 並寄送至您的信箱。
            </p>

            <ul className="list-disc pl-5 space-y-3 text-xs md:text-sm">
              <li>
                <span className="font-semibold">蝦皮訂單編號：</span>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>請填寫完整訂單編號（例如：SP123456789）。</li>
                  <li>可在蝦皮訂單詳情頁面中查詢。</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">收件信箱：</span>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>請填寫您方便接收 QRCode 的電子郵件。</li>
                  <li>若留空，系統將使用您下單時提供的信箱（若有）。</li>
                </ul>
              </li>
            </ul>

            <div className="mt-5 text-[11px] md:text-xs text-white/70">
              <p>
                每筆訂單僅能兌換一次。若系統偵測該訂單已完成兌換，
                <br className="hidden md:block" />
                將顯示「已兌換」提示，不會重複產生 QRCode 與寄信。
              </p>
              <p className="mt-2">
                如遇到訂單查無資料、信箱填寫錯誤或其他問題，
                <br className="hidden md:block" />
                歡迎將訂單截圖與問題描述寄至客服信箱與我們聯繫。
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
