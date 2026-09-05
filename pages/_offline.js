// pages/_offline.js
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

export default function OfflinePage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>目前離線中 | Jeko eSIM</title>
        <meta name="robots" content="noindex" />
      </Head>
      
      {/* 全螢幕置中容器，背景使用淺灰色 */}
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        
        {/* 白色卡片區塊 */}
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 animate-fadeIn">
          
          {/* 大圖示 */}
          <div className="text-[28px] mb-6 animate-bounce-slow">✈️</div>
          
          {/* 主標題 */}
          <h1 className="text-[24px] md:text-[28px] font-bold text-slate-800 mb-4">
            您目前處於離線狀態
          </h1>
          
          {/* 說明文字 */}
          <p className="text-slate-500 mb-8 leading-relaxed">
            別擔心！您的網路連線似乎中斷了。<br/>
            您仍然可以查看之前已經開啟過的頁面（例如您的 QR Code 憑證）。
          </p>

          {/* 按鈕區塊 */}
          <div className="space-y-4">
            {/* 按鈕 1: 嘗試重新整理 (會檢查網路) */}
            <button 
              onClick={() => router.reload()} 
              className="w-full bg-[#147AD7] text-white font-bold py-3.5 rounded-xl hover:bg-blue-600 transition-all shadow-md shadow-blue-100 active:scale-95"
            >
              🔄 重新連線
            </button>
            
            {/* 按鈕 2: 回上一頁 */}
            <button 
              onClick={() => router.back()} 
              className="w-full bg-white text-slate-700 border-2 border-slate-200 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
            >
              ⬅️ 回上一頁
            </button>

             {/* 連結: 回首頁 */}
             <Link href="/" className="block mt-4 text-sm text-[#147AD7] font-medium hover:underline">
                回到 Jeko eSIM 首頁
             </Link>
          </div>
        </div>
        
        <p className="text-slate-400 text-xs mt-8">
          請檢查您的 Wi-Fi 或行動網路設定
        </p>
      </div>

      {/* 增加一點簡單的動畫效果 */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite ease-in-out;
        }
      `}</style>
    </>
  );
}