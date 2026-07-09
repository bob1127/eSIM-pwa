import { supabase } from "@/lib/supabaseClient";
import { getSupabaseAdminServer } from "@/lib/supabaseAdminServer";
import React from "react";
import Link from "next/link";
import PartnerLayout from "@/components/PartnerLayout";
import {
  ChevronRight,
  MessageCircle,
  Download,
  FileText,
  ArrowRight,
} from "lucide-react";

export default function PartnerStorefront({ store, products }) {
  // 🌟 核心修復：加入預設值防呆機制
  // 這樣即使你在開發時存檔觸發 Fast Refresh 導致 props 短暫消失，畫面也不會崩潰成「載入中」
  const currentStore = store || { store_name: "Jeko eSIM", domain: "default" };
  const currentProducts = products || [];
  const defaultDescription = "次世代的 eSIM 解決方案";

  return (
    <PartnerLayout
      store={currentStore}
      title="首頁"
      description={defaultDescription}
    >
      {/* =========================================
          Section 1: Studio.inc 風格沉浸式 Hero
          ========================================= */}
      <section className="relative w-full h-screen min-h-[700px] overflow-hidden bg-black text-white font-sans">
        {/* 背景影片層 */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-60"
          >
            <source
              src="https://studio.inc/assets/video/top/hero.mp4"
              type="video/mp4"
            />
          </video>
          {/* 漸層遮罩層 - 確保文字可讀性 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"></div>
        </div>

        {/* 內容層 */}
        <div className="relative z-10 max-w-[1600px] mx-auto h-full px-8 md:px-16 flex flex-col justify-end pb-24 md:pb-32">
          <div className="max-w-4xl">
            <p className="text-sm md:text-base font-bold tracking-[0.2em] mb-4 text-gray-300 uppercase">
              Mission
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-[84px] font-black leading-[1.1] mb-8 tracking-tighter">
              連線世界，
              <br />
              釋放無限可能。
            </h1>
            <p className="text-base md:text-xl text-gray-200 max-w-2xl leading-relaxed font-medium mb-12">
              Jeko eSIM 存在的意義是「連結」。
              <br />
              每一次開啟漫遊，都是一次全新的探索。我們不斷優化技術與體驗，
              <br />
              讓您的數位足跡跨越邊境，讓溝通不再受限。
              <br />
              準備好與我們一起改寫全球通訊的規則了嗎？
            </p>

            <div className="hidden md:block absolute bottom-12 left-16">
              <span className="text-[10px] tracking-[0.3em] font-bold text-gray-500 uppercase flex items-center gap-4">
                [ Scroll Down ]<div className="w-[1px] h-12 bg-gray-700"></div>
              </span>
            </div>
          </div>

          {/* 右下角按鈕區 */}
          <div className="absolute bottom-12 right-8 md:right-16 flex flex-col gap-3 w-full max-w-[380px]">
            <Link
              href="#plans"
              className="group bg-white text-black p-6 rounded-lg flex justify-between items-center transition-transform hover:-translate-y-1 shadow-2xl"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-widest text-gray-400 mb-1 uppercase italic">
                  Product
                </span>
                <span className="text-lg font-black tracking-tight flex items-center gap-2">
                  <ArrowRight size={18} className="transform -rotate-45" /> 探索
                  eSIM 全球方案
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 group-hover:text-black">
                Explore
              </span>
            </Link>

            <Link
              href="#contact"
              className="group bg-white/10 backdrop-blur-md border border-white/20 text-white p-6 rounded-lg flex justify-between items-center transition-all hover:bg-white/20"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-widest text-gray-400 mb-1 uppercase italic">
                  Partner
                </span>
                <span className="text-lg font-black tracking-tight flex items-center gap-2">
                  <ArrowRight size={18} className="transform -rotate-45" /> 成為
                  Jeko 推廣夥伴
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 group-hover:text-white">
                Join us
              </span>
            </Link>

            <div className="flex justify-between items-center px-2 mt-2">
              <span className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">
                Global Connectivity © 2026
              </span>
              <span className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">
                Taichung / Taiwan
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          上半部淺藍色背景區塊 (KAGAMI 風格痛點)
          ========================================= */}
      <div className="bg-[#eaf4ff] w-full font-sans text-[#1e293b] overflow-hidden pt-12">
        {/* Section 2: 產品列表 (放在痛點上方更直覺) */}
        <section className="relative max-w-7xl mx-auto px-6 py-24" id="plans">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full text-blue-600 font-bold text-sm mb-6 shadow-sm">
              <span className="text-blue-400">熱銷方案</span>{" "}
              <span className="text-gray-300">|</span>{" "}
              <span className="text-lg">eSIM</span>
            </div>
            <h2 className="text-4xl md:text-[42px] font-black leading-tight text-[#0f172a]">
              選擇您的旅行目的地
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentProducts.length > 0 ? (
              currentProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/p/${currentStore.domain}/${product.id}`}
                >
                  <div className="bg-white rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 flex flex-col h-full group hover:-translate-y-2 hover:shadow-[0_20px_50px_rgb(0,0,0,0.08)] transition duration-500 cursor-pointer overflow-hidden">
                    <div className="w-full aspect-[4/3] rounded-[1.5rem] mb-6 relative overflow-hidden bg-slate-100">
                      <img
                        src={
                          product.image ||
                          "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800"
                        }
                        alt={product.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                    <h3 className="font-bold text-2xl mb-3 text-[#0f172a] tracking-tight">
                      {product.name}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 flex-grow line-clamp-3 leading-relaxed font-medium">
                      {product.description ||
                        "隨買即用，享受無縫連接的高速上網體驗。"}
                    </p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-auto">
                      <div>
                        <span className="text-xs text-slate-400 font-bold block mb-1">
                          最低只要
                        </span>
                        <p className="font-black text-2xl text-blue-600 tracking-tight">
                          NT$ {product.displayPrice}{" "}
                          <span className="text-sm text-slate-400 font-bold">
                            起
                          </span>
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ArrowRight
                          size={20}
                          className="transform group-hover:translate-x-1"
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-20 bg-white rounded-[2rem] shadow-sm">
                <p className="text-slate-500 font-bold text-lg">
                  店鋪尚未上架任何方案
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: 痛點 1 */}
        <section className="relative max-w-7xl mx-auto px-6 py-24 flex flex-col-reverse md:flex-row items-center justify-between border-t border-blue-100">
          <div className="w-full md:w-6/12 mt-12 md:mt-0 relative">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[3rem] p-8 aspect-square shadow-2xl relative overflow-hidden text-white flex flex-col items-center justify-center border-[8px] border-blue-400/30">
              <div className="grid grid-cols-2 gap-4 w-full h-full">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex flex-col">
                  <div className="h-4 w-1/2 bg-white/30 rounded mb-2"></div>
                  <div className="flex-1 bg-white/20 rounded"></div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex flex-col">
                  <div className="h-4 w-1/2 bg-white/30 rounded mb-2"></div>
                  <div className="flex-1 bg-white/20 rounded"></div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex flex-col">
                  <div className="h-4 w-1/2 bg-white/30 rounded mb-2"></div>
                  <div className="flex-1 bg-white/20 rounded"></div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex flex-col">
                  <div className="h-4 w-1/2 bg-white/30 rounded mb-2"></div>
                  <div className="flex-1 bg-white/20 rounded flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-4 border-white/40"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full md:w-5/12">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full text-blue-600 font-bold text-sm mb-6 shadow-sm">
              <span className="text-blue-400">痛點</span>{" "}
              <span className="text-gray-300">|</span>{" "}
              <span className="text-lg">1</span>
            </div>
            <h2 className="text-4xl md:text-[42px] font-black leading-tight mb-8">
              解決高昂漫遊
              <br />
              與繁瑣的換卡
            </h2>
            <p className="text-slate-700 leading-loose mb-10 font-medium">
              出國旅遊總是為了網路煩惱嗎？傳統原機漫遊費用高昂，而購買當地實體
              SIM 卡又面臨語言不通、需要隨身攜帶退卡針，甚至弄丟原本 SIM
              卡的風險。eSIM 讓您免除這些煩惱。
            </p>
            <div className="bg-white p-8 rounded-3xl shadow-lg border-l-4 border-blue-500 relative">
              <h3 className="text-blue-600 font-bold text-xl mb-3 leading-snug">
                實體網卡的痛點一次解決
                <br />
                隨買即用零等待
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                購買 Jeko eSIM，無需再等待物流配送。訂單完成後立即發送 QR Code
                憑證，掃描即可啟用，讓您的每一趟旅程都從容不迫。
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: 痛點 2 */}
        <section className="relative max-w-7xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center justify-between">
          <div className="w-full md:w-5/12 mb-12 md:mb-0">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full text-blue-600 font-bold text-sm mb-6 shadow-sm">
              <span className="text-blue-400">痛點</span>{" "}
              <span className="text-gray-300">|</span>{" "}
              <span className="text-lg">2</span>
            </div>
            <h2 className="text-4xl md:text-[42px] font-black leading-tight mb-8">
              告別訊號死角
              <br />
              體驗穩定網速
            </h2>
            <p className="text-slate-700 leading-loose mb-10 font-medium">
              便宜的網卡往往伴隨著不穩定的連線品質，甚至在關鍵時刻被降速限流。Jeko
              eSIM 嚴選各國頂級 Tier-1
              電信商網路，拒絕次級路由與不透明的流量限制。
            </p>
          </div>
          <div className="w-full md:w-6/12 relative flex justify-end">
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-[3rem] w-full max-w-[500px] aspect-square shadow-2xl relative flex flex-col items-center justify-center text-white border-b-8 border-blue-700">
              <h3 className="text-3xl font-black mb-2 tracking-widest text-white drop-shadow-md">
                Jeko eSIM
              </h3>
              <p className="text-sm font-bold mb-8">
                每一趟旅程的
                <br />
                連線守護者
              </p>
              <div className="absolute inset-0 m-auto w-[75%] h-[75%] flex flex-col justify-between">
                <div className="flex justify-between w-full">
                  <div className="bg-white/20 backdrop-blur-md rounded-2xl w-[45%] p-4 text-center border border-white/30 shadow-lg">
                    <p className="font-bold text-sm">掃描即用</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md rounded-2xl w-[45%] p-4 text-center border border-white/30 shadow-lg flex items-center justify-center">
                    <p className="font-bold text-sm">頂級網速</p>
                  </div>
                </div>
                <div className="flex justify-between w-full">
                  <div className="bg-blue-600/50 backdrop-blur-md rounded-2xl w-[45%] p-4 text-center border border-white/20 shadow-lg flex items-center justify-center">
                    <p className="font-bold text-sm">流量透明</p>
                  </div>
                  <div className="bg-blue-600/50 backdrop-blur-md rounded-2xl w-[45%] p-4 text-center border border-white/20 shadow-lg flex items-center justify-center">
                    <p className="font-bold text-sm">24h 客服</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* =========================================
          Section 5: DYNATREK 風格 (極光漸層 + 玻璃擬物化)
          ========================================= */}
      <section className="relative w-full overflow-hidden py-32 bg-[#1a0b2e]">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-orange-500/40 rounded-full mix-blend-screen filter blur-[120px] opacity-80 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-teal-400/40 rounded-full mix-blend-screen filter blur-[100px] opacity-70"></div>
        <div className="absolute top-[20%] left-[30%] w-[40vw] h-[40vw] bg-purple-600/40 rounded-full mix-blend-screen filter blur-[150px] opacity-60"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between h-full">
          <div className="w-full lg:w-1/2 text-white mb-16 lg:mb-0">
            <h2 className="text-6xl md:text-[80px] font-black mb-6 tracking-tighter leading-[0.9] drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/60">
              NEXT
              <br />
              GLOBAL
              <br />
              CONNECTIVITY
            </h2>
            <p className="text-xl md:text-2xl font-bold mb-10 text-white/90 drop-shadow-md leading-relaxed">
              跨越國界的限制。
              <br />
              將網路連線推向全新境界。
              <br />
              <span className="text-base font-normal text-white/70 block mt-2">
                （打破實體 SIM 卡的束縛，迎接次世代的全球通訊解決方案）
              </span>
            </p>
            <div className="bg-white text-slate-900 px-6 py-4 rounded shadow-2xl inline-flex flex-col border-l-4 border-orange-500">
              <span className="text-orange-500 font-bold text-xs mb-1">
                For Global Traveler & Partner
              </span>
              <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition">
                <strong className="text-lg">專為全球旅客與企業夥伴打造</strong>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-5/12 relative">
            <div className="text-white/60 font-bold text-xs tracking-widest mb-4 uppercase">
              Jeko eSIM _ Solution
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.3)]">
              <div className="w-full h-64 bg-gradient-to-br from-teal-200/40 to-blue-300/40 rounded-2xl mb-8 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 backdrop-blur-sm"></div>
                <div className="w-32 h-32 bg-white/40 rounded-full shadow-2xl backdrop-blur-md"></div>
                <button className="absolute bottom-4 right-4 bg-[#1e293b] text-white px-6 py-3 rounded text-sm font-bold flex items-center gap-2 hover:bg-black transition shadow-lg">
                  <ArrowRight className="w-4 h-4" /> 了解連線方案
                </button>
              </div>
              <p className="text-white text-center font-bold text-lg leading-relaxed mb-6">
                結合頂尖電信技術與
                <br />
                直覺流暢的用戶體驗
                <br />
                為您帶來前所未有的上網方式
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="h-16 bg-white/10 rounded-lg border border-white/10 backdrop-blur-sm flex items-center justify-center text-white/50 text-xs font-bold">
                  5G Ready
                </div>
                <div className="h-16 bg-white/10 rounded-lg border border-white/10 backdrop-blur-sm flex items-center justify-center text-white/50 text-xs font-bold">
                  Low Latency
                </div>
                <div className="h-16 bg-white/10 rounded-lg border border-white/10 backdrop-blur-sm flex items-center justify-center text-white/50 text-xs font-bold">
                  Secure
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          Section 6: Nulab 頂部主視覺 (白底文字 + 滿版相片牆)
          ========================================= */}
      <section className="relative w-full h-[650px] md:h-[750px] bg-slate-50 overflow-hidden flex flex-col justify-center font-sans">
        <div className="absolute inset-0 flex gap-4 md:gap-6 p-4 md:p-6 opacity-60 md:opacity-90 transform scale-105 z-0 pointer-events-none min-w-max">
          <div className="flex flex-col gap-4 md:gap-6 w-[280px] md:w-[350px] transform -translate-y-10">
            <div
              className="w-full h-[250px] md:h-[350px] bg-slate-300 rounded-[2rem] bg-cover bg-center shadow-lg"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800)",
              }}
            ></div>
            <div
              className="w-full h-[300px] md:h-[400px] bg-slate-400 rounded-[2rem] bg-cover bg-center shadow-lg"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800)",
              }}
            ></div>
          </div>
          <div className="flex flex-col gap-4 md:gap-6 w-[280px] md:w-[350px] transform translate-y-8">
            <div
              className="w-full h-[300px] md:h-[400px] bg-slate-400 rounded-[2rem] bg-cover bg-center shadow-lg"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800)",
              }}
            ></div>
            <div
              className="w-full h-[250px] md:h-[350px] bg-slate-300 rounded-[2rem] bg-cover bg-center shadow-lg"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=800)",
              }}
            ></div>
          </div>
          <div className="flex flex-col gap-4 md:gap-6 w-[280px] md:w-[350px] transform -translate-y-20">
            <div
              className="w-full h-[250px] md:h-[350px] bg-slate-300 rounded-[2rem] bg-cover bg-center shadow-lg"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800)",
              }}
            ></div>
            <div
              className="w-full h-[400px] md:h-[500px] bg-slate-400 rounded-[2rem] bg-cover bg-center shadow-lg"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=800)",
              }}
            ></div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full mt-12 md:mt-0">
          <div className="inline-block">
            <h2 className="text-[32px] md:text-[56px] font-black leading-[1.3] md:leading-[1.4] tracking-tight mb-8">
              <span className="bg-white text-[#1e293b] px-5 py-2 md:py-3 inline-block rounded-xl mb-2 md:mb-3 shadow-sm">
                邀請您一同成為
              </span>
              <br />
              <span className="bg-white text-[#1e293b] px-5 py-2 md:py-3 inline-block rounded-xl shadow-sm">
                全球無縫漫遊者
              </span>
            </h2>
            <button className="bg-[#593bc1] hover:bg-[#4a2e9e] text-white px-8 py-4 rounded-full font-bold flex items-center gap-4 transition-transform shadow-xl text-lg hover:-translate-y-1">
              成為推廣合作夥伴
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#593bc1]">
                <ArrowRight size={14} className="stroke-[3]" />
              </div>
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 left-0 right-0 max-w-5xl mx-auto px-4 z-20">
          <div className="bg-[#f8f9fa] rounded-2xl md:rounded-full py-4 md:py-5 px-6 md:px-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-8 w-full md:w-auto overflow-hidden">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                  最新消息
                </span>
                <span className="text-sm text-slate-500 whitespace-nowrap font-medium">
                  2026.04.18
                </span>
              </div>
              <span className="text-sm md:text-base text-slate-800 font-bold truncate hover:text-blue-600 cursor-pointer transition-colors">
                Jeko eSIM 企業合作與 KOL
                分潤計畫正式啟動！邀請您將便利帶給更多人。
              </span>
            </div>
            <button className="flex items-center gap-2 text-xs font-bold bg-[#111827] text-white px-5 py-3 rounded-full whitespace-nowrap hover:bg-black transition-colors shrink-0 w-full md:w-auto justify-center mt-2 md:mt-0">
              查看詳細資訊 <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================
          Section 7: Nulab 關於我們 (有機色塊與三宮格卡片)
          ========================================= */}
      <section className="relative w-full bg-white py-32 overflow-hidden font-sans">
        <div className="absolute top-10 -left-32 w-[500px] h-[500px] bg-[#38bdae] rounded-[40%_60%_70%_30%] -z-10 opacity-90 transform rotate-12"></div>
        <div className="absolute bottom-10 -right-40 w-[600px] h-[600px] bg-[#f5d14f] rounded-[50%_50%_30%_70%] -z-10 opacity-90 transform -rotate-12"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-slate-500 flex items-center justify-center gap-2 mb-4 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> About
              Jeko eSIM
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-[#1e293b] leading-tight mb-6">
              認識 Jeko eSIM
              <br />
              從這裡開始
            </h2>
            <p className="text-slate-600 font-medium">
              如果您想更深入了解 Jeko eSIM，請參考以下資訊。
              <br />
              我們彙整了產品特色、覆蓋國家以及合作夥伴計畫等詳細內容。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group flex flex-col gap-4 cursor-pointer">
              <div className="w-full h-64 rounded-3xl overflow-hidden bg-[#9b7aff] relative p-6 flex flex-col items-center justify-center shadow-sm group-hover:shadow-xl transition-all duration-300">
                <div className="absolute top-4 left-4 w-24 h-24 bg-white/20 rounded-[30%_70%_70%_30%]"></div>
                <div className="absolute bottom-[-10px] right-[-10px] w-32 h-32 bg-white/20 rounded-full"></div>
                <div className="z-10 text-white font-black text-2xl text-center leading-tight drop-shadow-md">
                  一分鐘了解
                  <br /> <span className="text-4xl mt-2 block">Jeko eSIM</span>
                </div>
              </div>
              <div className="flex justify-between items-center px-2">
                <span className="font-bold text-[#1e293b] text-lg">
                  一分鐘認識 Jeko
                </span>
                <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center group-hover:bg-[#593bc1] transition-colors">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>

            <div className="group flex flex-col gap-4 cursor-pointer">
              <div className="w-full h-64 rounded-3xl overflow-hidden bg-white border border-slate-100 relative p-6 flex items-center justify-center shadow-sm group-hover:shadow-xl transition-all duration-300">
                <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[80%] bg-[#38bdae] rounded-[30%_70%_50%_50%]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[70%] bg-[#768cf7] rounded-[60%_40%_70%_30%]"></div>
                <div className="absolute bottom-10 left-[-20%] w-[60%] h-[50%] bg-[#3b5bdb] rounded-[50%_50%_40%_60%]"></div>
                <div className="z-10 flex flex-col gap-4 w-full px-4">
                  <div className="bg-white/90 backdrop-blur rounded-full py-3 px-6 text-center font-black text-[#38bdae] shadow-md transform -rotate-3">
                    全球覆蓋
                  </div>
                  <div className="bg-white/90 backdrop-blur rounded-full py-3 px-6 text-center font-black text-[#768cf7] shadow-md self-end transform rotate-2">
                    在地網速
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center px-2">
                <span className="font-bold text-[#1e293b] text-lg">
                  核心服務內容
                </span>
                <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center group-hover:bg-[#593bc1] transition-colors">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>

            <div className="group flex flex-col gap-4 cursor-pointer">
              <div className="w-full h-64 rounded-3xl overflow-hidden bg-[#f0f3f5] relative flex items-end justify-center shadow-sm group-hover:shadow-xl transition-all duration-300 border border-slate-100">
                <div className="w-3/4 h-3/4 bg-slate-300 rounded-t-[3rem] relative shadow-inner overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=800"
                    className="w-full h-full object-cover opacity-80"
                    alt="Team"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center px-2">
                <span className="font-bold text-[#1e293b] text-lg">
                  品牌願景與故事
                </span>
                <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center group-hover:bg-[#593bc1] transition-colors">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          Section 8: 應用場景 (原 KAGAMI 設計)
          ========================================= */}
      <div className="bg-white w-full font-sans text-[#1e293b]">
        <section className="max-w-7xl mx-auto px-6 pt-32 pb-20">
          <div className="flex flex-col md:flex-row justify-between mb-24">
            <div className="w-full md:w-5/12 pr-8 mb-12 md:mb-0">
              <div className="inline-flex items-center gap-2 bg-[#eaf4ff] px-4 py-1.5 rounded-full text-blue-600 font-bold text-sm mb-6">
                <span className="text-blue-400">應用場景</span>{" "}
                <span className="text-gray-300">|</span>{" "}
                <span className="text-lg">2</span>
              </div>
              <h2 className="text-4xl font-black leading-tight mb-8">
                完美適應您的
                <br />
                各種旅行需求
              </h2>
              <p className="text-slate-600 leading-relaxed font-medium">
                無論是短期的觀光旅遊、長期的商務出差，甚至是留學與打工度假，Jeko
                eSIM 都能為您提供最適合的客製化上網方案。
              </p>
            </div>
            <div className="w-full md:w-7/12 relative">
              <div className="absolute top-0 right-0 w-3/4 h-full bg-[#eaf4ff]/50 rounded-[3rem] -z-10 blur-xl"></div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { t1: "短期觀光旅遊", t2: "暢遊日韓歐美等熱門景點" },
                  { t1: "商務跨國出差", t2: "多國漫遊方案，落地即連" },
                  { t1: "留學與打工度假", t2: "長期穩定不斷網" },
                  { t1: "企業員工配號", t2: "統一管理團隊出差網路" },
                  { t1: "遠距數位遊牧", t2: "隨時隨地保持線上狀態" },
                  { t1: "旅遊網紅推薦", t2: "網路直播、打卡零延遲" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 flex flex-col justify-center items-center text-center hover:-translate-y-1 transition duration-300 cursor-pointer"
                  >
                    <p className="font-bold text-[#1e293b] mb-1">{item.t1}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {item.t2}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="w-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-[2.5rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)",
              }}
            ></div>
            <div className="relative z-10 flex flex-col items-center">
              <span className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-bold mb-8 backdrop-blur flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Jeko
                eSIM 的核心理念
              </span>
              <h2 className="text-3xl md:text-[40px] font-black leading-snug mb-8 drop-shadow-md">
                致力於消除國界間的數位隔閡
                <br />將{" "}
                <span className="bg-white text-blue-600 px-6 py-2 rounded-xl inline-block mx-2 shadow-lg my-4">
                  全球連線
                </span>{" "}
                變得
                <span className="border-b-4 border-white pb-1 ml-2">
                  簡單且平易近人
                </span>
                <br />
                這就是我們打造「Jeko eSIM」的初衷
              </h2>
            </div>
            <div className="absolute bottom-6 right-6 w-3 h-3 bg-white/50 rounded-full"></div>
          </div>
        </section>

        {/* =========================================
            Section 9: CTA / 聯絡我們
            ========================================= */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-32" id="contact">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-blue-500 font-bold mb-4">
              <span className="w-2 h-2 bg-blue-500 rounded-sm transform rotate-45"></span>{" "}
              探索更多可能
            </div>
            <h2 className="text-3xl md:text-4xl font-black leading-tight text-[#0f172a]">
              對於 Jeko eSIM 的方案或企業導入有任何疑問
              <br />
              歡迎隨時與我們的團隊聯繫
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-[2.5rem] p-10 flex flex-col justify-between shadow-[0_20px_50px_rgb(0,0,0,0.08)] border border-slate-50 relative overflow-hidden group hover:-translate-y-2 transition duration-500 cursor-pointer">
              <div className="absolute -right-8 -top-8 w-64 h-64 bg-[#eaf4ff] rounded-[3rem] -z-10 group-hover:scale-110 transition duration-500"></div>
              <div className="absolute right-12 top-16 w-24 h-24 bg-blue-500/10 backdrop-blur rounded-2xl border border-white flex items-center justify-center shadow-lg transform rotate-6">
                <MessageCircle className="text-blue-500 w-10 h-10" />
              </div>
              <div>
                <p className="text-blue-600 font-bold mb-6 tracking-widest text-sm">
                  CONTACT
                </p>
                <h3 className="text-2xl font-bold text-[#0f172a] leading-relaxed mb-12">
                  了解詳細服務內容
                  <br />
                  或索取企業大量採購報價
                </h3>
              </div>
              <button className="bg-blue-600 text-white w-[200px] py-4 rounded-xl font-bold shadow-md hover:bg-blue-700 transition flex items-center justify-between px-6">
                聯絡客服團隊{" "}
                <span className="w-2 h-2 bg-white/80 rounded-full"></span>
              </button>
            </div>
            <div className="bg-white rounded-[2.5rem] p-10 flex flex-col justify-between shadow-[0_20px_50px_rgb(0,0,0,0.08)] border border-slate-50 relative overflow-hidden group hover:-translate-y-2 transition duration-500 cursor-pointer">
              <div className="absolute -right-8 -top-8 w-64 h-64 bg-[#eaf4ff] rounded-[3rem] -z-10 group-hover:scale-110 transition duration-500"></div>
              <div className="absolute right-16 top-12 w-24 h-28 bg-white/80 backdrop-blur rounded-xl border border-white flex flex-col items-center justify-center shadow-xl transform -rotate-3">
                <FileText className="text-blue-400 w-12 h-12 mb-2" />
                <div className="w-12 h-2 bg-slate-200 rounded-full"></div>
              </div>
              <div>
                <p className="text-blue-600 font-bold mb-6 tracking-widest text-sm">
                  DOWNLOAD
                </p>
                <h3 className="text-2xl font-bold text-[#0f172a] leading-relaxed mb-12">
                  下載產品簡介與
                  <br />
                  eSIM 安裝設定教學手冊
                </h3>
              </div>
              <button
                className="bg-blue-500 text-white w-[220px] py-4 rounded-xl font-bold shadow-md hover:bg-blue-600 transition flex items-center justify-between px-6"
                id="download"
              >
                下載相關資料{" "}
                <span className="w-2 h-2 bg-white/80 rounded-full"></span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </PartnerLayout>
  );
}

// ==========================================
// 伺服器端資料抓取 (SSR) - 務必保留此段
// ==========================================
export async function getServerSideProps(context) {
  const { partnerSlug } = context.params;

  try {
    const db = getSupabaseAdminServer();
    // 取得商店資訊
    const { data: store, error: storeError } = await db
      .from("stores")
      .select("*")
      .eq("domain", partnerSlug)
      .eq("status", "active")
      .single();

    if (storeError || !store) {
      console.error("Store Not Found:", partnerSlug);
      return { notFound: true };
    }

    // 取得該店產品
    const { data: storeProducts, error: spError } = await db
      .from("store_products")
      .select(
        `
        product_id,
        custom_prices,
        products ( id, name, description, image_url, product_variations ( id, b2b_price ) )
      `,
      )
      .eq("store_id", store.id);

    if (spError) throw spError;

    // 格式化產品資料
    const formattedProducts = (storeProducts || [])
      .filter((sp) => sp.products)
      .map((sp) => {
        const p = sp.products;
        let minPrice = 0;
        if (p.product_variations && p.product_variations.length > 0) {
          const prices = p.product_variations.map((v) => {
            if (sp.custom_prices && sp.custom_prices[v.id] !== undefined)
              return parseInt(sp.custom_prices[v.id]);
            return Math.round(
              (v.b2b_price || 0) * (1 + (store.markup_rate || 0) / 100),
            );
          });
          minPrice = Math.min(...prices);
        }
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          displayPrice: minPrice > 0 ? minPrice : "0",
          image: p.image_url || null,
        };
      });

    return { props: { store, products: formattedProducts } };
  } catch (err) {
    console.error("SSR Error:", err);
    return { notFound: true };
  }
}
