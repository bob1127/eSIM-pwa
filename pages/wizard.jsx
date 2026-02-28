import React, { useState, useEffect } from "react";
import Layout from "./Layout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Globe,
  Calendar,
  Wifi,
  ShoppingCart,
  Smartphone,
  Zap,
} from "lucide-react";

// --- 假資料 (Mock Data) ---
const COUNTRIES = [
  {
    id: "JP",
    name: "日本",
    flag: "🇯🇵",
    image:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=500&q=80",
  },
  {
    id: "KR",
    name: "韓國",
    flag: "🇰🇷",
    image:
      "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=500&q=80",
  },
  {
    id: "TH",
    name: "泰國",
    flag: "🇹🇭",
    image:
      "https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=500&q=80",
  },
  {
    id: "EU",
    name: "歐洲",
    flag: "🇪🇺",
    image:
      "https://images.unsplash.com/photo-1499856871940-a09627c6d7db?w=500&q=80",
  },
];

const DAYS_OPTIONS = [3, 5, 7, 10, 15, 30];

const APP_NEEDS = [
  { id: "TIKTOK", name: "抖音 (TikTok)", icon: "🎵" },
  { id: "CHATGPT", name: "ChatGPT", icon: "🤖" },
  { id: "NONE", name: "都不需要", icon: "🙅‍♂️" },
];

const USAGE_HABITS = [
  {
    id: "LIGHT",
    name: "輕度使用",
    desc: "主要用 Line 文字、Google Maps 找路",
    icon: "🍃",
    rec: "每日 1GB",
  },
  {
    id: "NORMAL",
    name: "一般使用",
    desc: "會滑 IG 限動、FB、偶爾視訊通話",
    icon: "📱",
    rec: "每日 2GB",
  },
  {
    id: "HEAVY",
    name: "重度使用",
    desc: "狂刷 Reels/TikTok、追劇、熱點分享",
    icon: "🔥",
    rec: "吃到飽",
  },
];

export default function WizardPage() {
  const [step, setStep] = useState(1);
  const [selections, setSelections] = useState({
    country: null,
    days: null,
    apps: [], // 多選
    habit: null,
  });
  const [isResultReady, setIsResultReady] = useState(false);
  const [recommendedPlan, setRecommendedPlan] = useState(null);

  // --- 處理選擇邏輯 ---
  const handleSelect = (key, value) => {
    setSelections((prev) => ({ ...prev, [key]: value }));
    // 自動跳下一布 (延遲一下讓用戶看到選取效果)
    setTimeout(() => {
      if (step < 5) setStep(step + 1);
    }, 300);
  };

  // --- 處理多選 (APP 需求) ---
  const handleAppSelect = (appId) => {
    setSelections((prev) => {
      const currentApps = prev.apps;
      if (appId === "NONE") return { ...prev, apps: ["NONE"] };

      // 如果選了別的，就把 NONE 拿掉
      let newApps = currentApps.filter((a) => a !== "NONE");

      if (newApps.includes(appId)) {
        newApps = newApps.filter((a) => a !== appId);
      } else {
        newApps = [...newApps, appId];
      }
      return { ...prev, apps: newApps };
    });
  };

  // --- 智慧推薦演算法 ---
  useEffect(() => {
    if (step === 5) {
      // 根據使用習慣推薦流量
      let planName = "標準方案";
      let price = 0;
      let tags = [];

      // 1. 流量推薦
      if (selections.habit?.id === "LIGHT") {
        planName = "每日 1GB 輕量型";
        price = 100 * selections.days;
      } else if (selections.habit?.id === "NORMAL") {
        planName = "每日 2GB 高 CP 值";
        price = 150 * selections.days;
      } else {
        planName = "真吃到飽 (不降速)";
        price = 250 * selections.days;
        tags.push("熱點分享 OK");
      }

      // 2. 線路推薦 (APP 需求)
      const needSpecialAccess =
        selections.apps.includes("TIKTOK") ||
        selections.apps.includes("CHATGPT");
      if (needSpecialAccess) {
        planName = `原生極速 ${planName}`;
        price += 100; // 原生卡比較貴
        tags.push("原生 IP", "低延遲");
      } else {
        planName = `漫遊 ${planName}`;
      }

      setRecommendedPlan({
        name: planName,
        price: price,
        tags: tags,
      });
    }
  }, [step, selections]);

  // --- 重置 ---
  const handleReset = () => {
    setStep(1);
    setSelections({ country: null, days: null, apps: [], habit: null });
    setIsResultReady(false);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* 標題區 */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI 智慧選購嚮導
            </h1>
            <p className="text-gray-500">
              回答 4 個簡單問題，為您客製化最適合的 eSIM 方案
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* 左側：互動選擇區 */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden min-h-[600px]">
              {/* 進度條 */}
              {!isResultReady && (
                <div className="flex justify-between mb-8 px-2 relative">
                  {/* 連接線 */}
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -z-10" />

                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`flex flex-col items-center gap-1 ${
                        step >= i ? "text-blue-600" : "text-gray-300"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                          step >= i
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {i}
                      </div>
                      <span className="text-xs font-medium hidden sm:block">
                        {i === 1
                          ? "國家"
                          : i === 2
                          ? "天數"
                          : i === 3
                          ? "APP"
                          : "習慣"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* Step 1: 選擇國家 */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <Globe className="w-6 h-6 text-blue-500" />{" "}
                      第一步：您要去哪裡？
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      {COUNTRIES.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelect("country", c)}
                          className={`relative h-32 rounded-xl overflow-hidden group border-2 transition-all ${
                            selections.country?.id === c.id
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-transparent hover:border-gray-200"
                          }`}
                        >
                          <img
                            src={c.image}
                            alt={c.name}
                            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                          <div className="absolute bottom-3 left-3 text-white text-left">
                            <div className="text-2xl">{c.flag}</div>
                            <div className="font-bold text-lg">{c.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: 選擇天數 */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <button
                      onClick={() => setStep(1)}
                      className="text-sm text-gray-400 mb-4 hover:text-gray-600"
                    >
                      ← 上一步
                    </button>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-blue-500" />{" "}
                      預計停留幾天？
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                      {DAYS_OPTIONS.map((d) => (
                        <button
                          key={d}
                          onClick={() => handleSelect("days", d)}
                          className={`py-4 rounded-xl border font-bold text-lg transition-all ${
                            selections.days === d
                              ? "bg-blue-600 text-white border-blue-600 shadow-md"
                              : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                          }`}
                        >
                          {d} 天
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: APP 需求 (多選) */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <button
                      onClick={() => setStep(2)}
                      className="text-sm text-gray-400 mb-4 hover:text-gray-600"
                    >
                      ← 上一步
                    </button>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <Smartphone className="w-6 h-6 text-blue-500" />{" "}
                      需要使用這些 APP 嗎？
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                      這會影響我們為您選擇的網路線路（可多選）
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                      {APP_NEEDS.map((app) => {
                        const isSelected = selections.apps.includes(app.id);
                        return (
                          <button
                            key={app.id}
                            onClick={() => handleAppSelect(app.id)}
                            className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <div className="text-2xl">{app.icon}</div>
                            <div className="font-bold text-gray-900 flex-1 text-left">
                              {app.name}
                            </div>
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? "border-blue-500 bg-blue-500 text-white"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected && <Check size={14} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setStep(4)}
                      disabled={selections.apps.length === 0}
                      className={`w-full mt-8 py-4 rounded-xl font-bold text-lg transition-all ${
                        selections.apps.length > 0
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      下一步
                    </button>
                  </motion.div>
                )}

                {/* Step 4: 使用習慣 */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <button
                      onClick={() => setStep(3)}
                      className="text-sm text-gray-400 mb-4 hover:text-gray-600"
                    >
                      ← 上一步
                    </button>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <Wifi className="w-6 h-6 text-blue-500" />{" "}
                      平常怎麼使用網路？
                    </h2>
                    <div className="space-y-3">
                      {USAGE_HABITS.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => {
                            setSelections((prev) => ({ ...prev, habit: h }));
                            setIsResultReady(true);
                            setStep(5); // 前往結果頁
                          }}
                          className="w-full p-4 rounded-xl border flex items-start gap-4 hover:border-blue-400 hover:shadow-md transition-all bg-white text-left"
                        >
                          <div className="text-3xl pt-1">{h.icon}</div>
                          <div>
                            <div className="font-bold text-gray-900 text-lg">
                              {h.name}
                            </div>
                            <div className="text-sm text-gray-500 mb-2">
                              {h.desc}
                            </div>
                            <div className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                              AI 建議：{h.rec}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 5: 結果顯示 */}
                {isResultReady && recommendedPlan && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 bg-gradient-to-tr from-blue-400 to-cyan-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
                      <Zap className="w-10 h-10 text-white fill-current" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      分析完成！
                    </h2>
                    <p className="text-gray-500 mb-8">
                      這就是最適合您的專屬方案：
                    </p>

                    <div className="bg-white border-2 border-blue-500 rounded-2xl p-6 text-left shadow-xl mb-8 relative overflow-hidden ring-4 ring-blue-50">
                      <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-bl-lg font-bold">
                        最佳推薦
                      </div>
                      <div className="flex gap-4 items-start">
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          <img
                            src={selections.country?.image}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900">
                            {selections.country?.name}{" "}
                            {recommendedPlan.name.includes("原生")
                              ? "原生"
                              : ""}{" "}
                            eSIM
                          </h3>
                          <div className="text-lg font-medium text-blue-600 mt-1">
                            {recommendedPlan.name}
                          </div>

                          <div className="flex flex-wrap gap-2 mt-3">
                            {recommendedPlan.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold"
                              >
                                {tag}
                              </span>
                            ))}
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              {selections.days} 天
                            </span>
                          </div>

                          <div className="mt-4 flex items-end gap-2 border-t pt-3">
                            <span className="text-3xl font-bold text-gray-900">
                              NT$ {recommendedPlan.price}
                            </span>
                            <span className="text-sm text-gray-400 mb-1">
                              含稅價
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 重新開始 / 結帳 */}
                    <div className="flex gap-4">
                      <button
                        onClick={handleReset}
                        className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                      >
                        重新測驗
                      </button>
                      <button className="flex-1 py-3 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 shadow-lg transition-transform active:scale-95">
                        <ShoppingCart className="w-5 h-5" /> 立即購買
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 右側：即時預覽 (Sticky Sidebar) */}
            <div className="w-full lg:w-[350px]">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                <h3 className="font-bold text-gray-900 mb-6 border-b pb-4 flex items-center gap-2">
                  <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                  您的需求清單
                </h3>

                <div className="space-y-6">
                  {/* 國家預覽 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">目的地</span>
                    {selections.country ? (
                      <div className="flex items-center gap-2 font-bold text-gray-900">
                        <span className="text-xl">
                          {selections.country.flag}
                        </span>
                        {selections.country.name}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-sm">--</span>
                    )}
                  </div>

                  {/* 天數預覽 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">天數</span>
                    {selections.days ? (
                      <span className="font-bold text-gray-900">
                        {selections.days} 天
                      </span>
                    ) : (
                      <span className="text-gray-300 text-sm">--</span>
                    )}
                  </div>

                  {/* APP 需求預覽 */}
                  <div className="flex items-start justify-between">
                    <span className="text-gray-500 text-sm">APP 需求</span>
                    <div className="text-right">
                      {selections.apps.length > 0 ? (
                        selections.apps.includes("NONE") ? (
                          <span className="text-gray-500 text-sm">無</span>
                        ) : (
                          <div className="flex gap-1 justify-end flex-wrap">
                            {selections.apps.map((app) => (
                              <span
                                key={app}
                                className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded"
                              >
                                {app === "TIKTOK" ? "抖音" : "GPT"}
                              </span>
                            ))}
                          </div>
                        )
                      ) : (
                        <span className="text-gray-300 text-sm">--</span>
                      )}
                    </div>
                  </div>

                  {/* 習慣預覽 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">使用習慣</span>
                    {selections.habit ? (
                      <span className="font-bold text-gray-900">
                        {selections.habit.name}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-sm">--</span>
                    )}
                  </div>
                </div>

                {/* 預估總價 (只在結果頁顯示) */}
                {isResultReady && recommendedPlan && (
                  <div className="mt-8 pt-6 border-t border-dashed border-gray-300 flex justify-between items-center">
                    <span className="font-bold text-gray-900">預估金額</span>
                    <span className="text-2xl font-bold text-blue-600">
                      NT$ {recommendedPlan.price}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
