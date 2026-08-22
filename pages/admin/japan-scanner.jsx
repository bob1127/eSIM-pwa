import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { DEFAULT_PLATFORM_FX } from "@/lib/esim/platformFx";
import { useProductAdmin } from "@/hooks/useProductAdmin";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
// import Layout from "../Layout"; // 如果您有 Layout 請自行取消註解

// --- 匯率設定：與夥伴底價同一套平台匯率 ---
const RATES = DEFAULT_PLATFORM_FX;

// --- 國家設定檔 ---
const COUNTRIES = {
  JP: {
    emoji: "🇯🇵",
    name: "日本",
    codes: ["JP"],
    keywords: ["Japan", "Osaka", "Tokyo"],
    nativeKeywords: ["vmobile.jp", "iij", "docomo", "softbank", "kddi"],
  },
  KR: {
    emoji: "🇰🇷",
    name: "韓國",
    codes: ["KR"],
    keywords: ["Korea", "Seoul"],
    nativeKeywords: ["sk telecom", "skt", "kt", "lgu+", "lg u+"],
  },
  TH: {
    emoji: "🇹🇭",
    name: "泰國",
    codes: ["TH"],
    keywords: ["Thailand", "Bangkok"],
    nativeKeywords: ["ais", "dtac", "true", "truemove"],
  },
  CN: {
    emoji: "🇨🇳",
    name: "中國",
    codes: ["CN"],
    keywords: ["China"],
    nativeKeywords: ["china unicom", "china mobile", "china telecom"],
  },
  HK: {
    emoji: "🇭🇰",
    name: "香港",
    codes: ["HK"],
    keywords: ["Hong Kong", "HK"],
    nativeKeywords: ["csl", "smartone", "3hk", "china mobile hk", "cmhk"],
  },
  VN: {
    emoji: "🇻🇳",
    name: "越南",
    codes: ["VN"],
    keywords: ["Vietnam"],
    nativeKeywords: ["viettel", "vinaphone", "mobifone"],
  },
  MY: {
    emoji: "🇲🇾",
    name: "馬來西亞",
    codes: ["MY"],
    keywords: ["Malaysia"],
    nativeKeywords: ["celcom", "maxis", "digi", "umobile"],
  },
};

export default function GlobalPlanScanner() {
  const { isAdmin, adminChecked, authHeaders } = useProductAdmin();
  // --- 原始資料 State ---
  const [rawPlans, setRawPlans] = useState([]); // 存放 API 回傳的所有原始資料
  const [plans, setPlans] = useState([]); // 當前國家處理後的資料
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // --- 篩選條件 State ---
  const [selectedCountry, setSelectedCountry] = useState("JP"); // 預設日本
  const [filterIP, setFilterIP] = useState("ALL"); // ALL, NATIVE, ROAMING
  const [filterDay, setFilterDay] = useState("ALL"); // ALL, SHORT, MID, LONG
  const [filterData, setFilterData] = useState("ALL"); // ALL, DAILY, TOTAL, UNLIMITED
  const [sortBy, setSortBy] = useState("PRICE_ASC"); // PRICE_ASC, DAY_ASC

  // 1. 初始載入 API（目錄需管理者身分，未通過時 API 會回 404）
  useEffect(() => {
    if (!adminChecked) return;
    if (!isAdmin) {
      setLoading(false);
      setErrorMsg("需要管理者權限");
      return;
    }
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminChecked, isAdmin, authHeaders]);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/esim/list", {
        credentials: "include",
        headers: { ...authHeaders },
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      const allPlans = data.result || [];

      // 🔥 Debug: 偷看這個特定方案 API 傳回來多少錢
      // ID 5975 是您截圖中的韓國方案
      const debugPlan = allPlans.find(
        (p) => p.id === 5975 || (p.code && p.code.includes("Daily1GB-4")),
      );
      if (debugPlan) {
        console.log("🔥 [DEBUG] 韓國方案 5975 原始資料:", debugPlan);
        console.log("🔥 [DEBUG] 原始價格 (price):", debugPlan.price);
      } else {
        console.log("⚠️ [DEBUG] 找不到 ID 5975 的方案");
      }

      setRawPlans(allPlans); // 儲存原始資料
      setLoading(false);
    } catch (err) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  // 2. 當「原始資料」或「選擇國家」改變時，重新計算該國家的方案
  useEffect(() => {
    if (rawPlans.length === 0) return;

    const config = COUNTRIES[selectedCountry];

    // 初步過濾國家
    const countryPlans = rawPlans.filter((p) => {
      const name = (p.name || p.channel_dataplan_name || "").toLowerCase();
      const code = p.code || p.location || "";

      // 檢查 Code 是否符合 OR 名稱是否包含國家關鍵字
      const isCodeMatch = config.codes.includes(code);
      const isNameMatch = config.keywords.some((k) =>
        name.includes(k.toLowerCase()),
      );

      return isCodeMatch || isNameMatch;
    });

    // 資料清洗與計算
    const processed = countryPlans.map((p) => {
      const apn = (p.apn || "").toLowerCase();
      const name = (p.name || p.channel_dataplan_name || "").toLowerCase();
      const rule = (p.rule_desc || "").toLowerCase();
      const tags = p.tags || [];

      // ---------------------------------------------------------
      // 💰 [價格計算修復核心邏輯]
      // ---------------------------------------------------------
      const rawPrice = parseFloat(p.price || 0);
      let costTWD = 0;
      let currencyUsed = "HKD"; // 預設

      // 判斷邏輯：如果價格小於 20，通常是美金 (例如 8.19)
      // 如果價格大於 20，通常是港幣 (例如 63.83)
      if (rawPrice > 0 && rawPrice < 20) {
        currencyUsed = "USD";
        costTWD = Math.ceil(rawPrice * RATES.USD);
      } else {
        currencyUsed = "HKD";
        costTWD = Math.ceil(rawPrice * RATES.HKD);
      }
      // ---------------------------------------------------------

      // --- 通用原生判斷邏輯 ---
      // 檢查 APN 或 名稱 是否包含該國家的原生電信商關鍵字
      let isNative = config.nativeKeywords.some(
        (k) => apn.includes(k) || name.includes(k),
      );

      let isDaily = name.includes("daily") || name.includes("天");
      let isTotal = name.includes("total") || name.includes("總量");
      let isUnlimited = rule.includes("unlimited") || rule.includes("吃到飽");

      // APP 支援度
      let supportChatGPT = false;
      let supportTikTok = false;

      if (selectedCountry === "CN") {
        // 中國特殊邏輯：漫遊線路 (非 Native) 才通常支援
        supportChatGPT = !isNative;
        supportTikTok = !isNative;
      } else {
        // 其他國家：通常有標籤或是原生線路都支援
        supportChatGPT = tags.includes("ChatGPT✅") || true;
        supportTikTok = tags.includes("TikTok✅") || true;
      }

      // 類型標籤
      let typeLabel = isNative ? `🔴 ${config.name}原生` : "🔵 漫遊線路";
      let typeClass = isNative
        ? "bg-red-100 text-red-800"
        : "bg-blue-100 text-blue-800";

      // 建議售價邏輯 (原生利潤抓高一點)
      const margin = isNative ? 2.0 : 1.5;
      const suggestedPrice = Math.ceil((costTWD * margin) / 10) * 10 - 1;

      return {
        ...p,
        name: p.name || p.channel_dataplan_name,
        apn,
        rawPrice, // 原始價格
        currencyUsed, // 使用的幣別
        costTWD, // 計算後的台幣成本
        suggestedPrice,
        isNative,
        isDaily,
        isTotal,
        isUnlimited,
        supportChatGPT,
        supportTikTok,
        typeLabel,
        typeClass,
      };
    });

    setPlans(processed);
  }, [rawPlans, selectedCountry]);

  // --- 核心篩選邏輯 (useMemo) ---
  const filteredPlans = useMemo(() => {
    let result = plans;

    // 1. IP 篩選
    if (filterIP === "NATIVE") result = result.filter((p) => p.isNative);
    if (filterIP === "ROAMING") result = result.filter((p) => !p.isNative);

    // 2. 天數篩選
    if (filterDay === "SHORT") result = result.filter((p) => p.day <= 5);
    if (filterDay === "MID")
      result = result.filter((p) => p.day > 5 && p.day <= 10);
    if (filterDay === "LONG") result = result.filter((p) => p.day > 10);

    // 3. 流量篩選
    if (filterData === "DAILY") result = result.filter((p) => p.isDaily);
    if (filterData === "TOTAL") result = result.filter((p) => p.isTotal);
    if (filterData === "UNLIMITED")
      result = result.filter((p) => p.isUnlimited);

    // 4. 排序
    result.sort((a, b) => {
      if (sortBy === "PRICE_ASC") return a.costTWD - b.costTWD;
      if (sortBy === "DAY_ASC") return a.day - b.day;
      return 0;
    });

    return result;
  }, [plans, filterIP, filterDay, filterData, sortBy]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(`已複製 SKU: ${text}`);
  };

  if (loading)
    return (
      <>
        <Head>
          <meta name="robots" content="noindex, nofollow, noarchive" />
        </Head>
        <div className="p-10 flex justify-center">
          <LoadingIndicator layout="center" label="載入中..." />
        </div>
      </>
    );
  if (errorMsg)
    return (
      <>
        <Head>
          <meta name="robots" content="noindex, nofollow, noarchive" />
        </Head>
        <div className="p-10 text-red-600">錯誤：{errorMsg}</div>
      </>
    );

  const currentConfig = COUNTRIES[selectedCountry];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
          <span>{currentConfig.emoji}</span>
          <span>{currentConfig.name}方案選品神器</span>
        </h1>

        {/* --- 國家選擇區 (Tabs) --- */}
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2 scrollbar-hide">
          {Object.entries(COUNTRIES).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSelectedCountry(key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-bold transition-all ${
                selectedCountry === key
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {config.emoji} {config.name}
            </button>
          ))}
        </div>

        {/* --- 篩選控制區 (Filter Bar) --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 1. IP 篩選 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              線路類型
            </label>
            <select
              value={filterIP}
              onChange={(e) => setFilterIP(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">全部顯示</option>
              <option value="NATIVE">{currentConfig.emoji} 原生線路</option>
              <option value="ROAMING">🌍 漫遊線路</option>
            </select>
          </div>

          {/* 2. 天數篩選 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              旅遊天數
            </label>
            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">全部天數</option>
              <option value="SHORT">短期 (1-5天)</option>
              <option value="MID">中期 (6-10天)</option>
              <option value="LONG">長期 (11天以上)</option>
            </select>
          </div>

          {/* 3. 流量篩選 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              流量規則
            </label>
            <select
              value={filterData}
              onChange={(e) => setFilterData(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">全部規格</option>
              <option value="DAILY">每天定量 (Daily)</option>
              <option value="TOTAL">總量型 (Total)</option>
              <option value="UNLIMITED">🔥 真吃到飽 (Unlimited)</option>
            </select>
          </div>

          {/* 4. 排序 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              排序方式
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="PRICE_ASC">💰 價格 (低 - 高)</option>
              <option value="DAY_ASC">📅 天數 (短 - 長)</option>
            </select>
          </div>
        </div>

        {/* --- 結果表格 --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 text-sm text-gray-500 flex justify-between items-center">
            <span className="font-bold text-stone-900">
              {currentConfig.name} 方案列表
            </span>
            <span className="bg-gray-200 px-2 py-1 rounded text-xs">
              共 {filteredPlans.length} 筆
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-sm uppercase">
                  <th className="p-4 w-32">類型</th>
                  <th className="p-4 w-24">天數</th>
                  <th className="p-4">方案名稱 / 流量</th>
                  <th className="p-4 w-32">支援度</th>
                  <th className="p-4 text-right w-32">成本 (TWD)</th>
                  <th className="p-4 text-right w-32 text-blue-600">
                    建議售價
                  </th>
                  <th className="p-4 text-center w-24">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredPlans.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b hover:bg-yellow-50 transition-colors"
                  >
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${p.typeClass}`}
                      >
                        {p.typeLabel}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-lg text-gray-900">
                      {p.day} 天
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-gray-800 text-base">
                        {p.data}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                        {p.name}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {p.isUnlimited && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded border border-green-200">
                            吃到飽
                          </span>
                        )}
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1 rounded border border-gray-200">
                          {p.apn}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <span
                          className={
                            p.supportChatGPT
                              ? "text-green-700 font-bold"
                              : "text-gray-400"
                          }
                        >
                          {p.supportChatGPT ? "✅ GPT" : "❌ GPT"}
                        </span>
                        <span
                          className={
                            p.supportTikTok
                              ? "text-green-700 font-bold"
                              : "text-gray-400"
                          }
                        >
                          {p.supportTikTok ? "✅ TikTok" : "❌ TikTok"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium text-gray-600">
                      <div>${p.costTWD}</div>
                      <div className="text-[10px] text-gray-400">
                        ({p.rawPrice} {p.currencyUsed})
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-lg text-blue-600 bg-blue-50">
                      ${p.suggestedPrice}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => copyToClipboard(p.id)}
                        className="border border-gray-300 px-3 py-1 rounded hover:bg-gray-800 hover:text-white transition text-xs"
                      >
                        複製
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredPlans.length === 0 && (
            <div className="p-10 text-center text-gray-500 flex flex-col items-center">
              <span className="text-4xl mb-2">🧐</span>
              沒有符合「{currentConfig.name}」篩選條件的方案
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
