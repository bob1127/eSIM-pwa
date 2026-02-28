import React, { useState, useEffect, useMemo } from "react";

// --- 1. 國家設定檔 ---
const COUNTRIES: Record<string, any> = {
  JP: {
    emoji: "🇯🇵",
    name: "日本 (純日)",
    codes: ["JP", "JPN", "JAPAN"],
    keywords: ["Japan", "Osaka", "Tokyo", "SoftBank", "Docomo", "KDDI", "IIJ"],
    exclude: [
      "ASIA",
      "GLOBAL",
      "WORLD",
      "EUROPE",
      "TOTAL COUNTRIES",
      "KOREA",
      "Japan/Korea",
      "Japan Korea",
    ],
  },
  KR: {
    emoji: "🇰🇷",
    name: "韓國 (純韓)",
    codes: ["KR", "KOR", "KOREA"],
    keywords: ["Korea", "Seoul", "SKT", "KT", "LGU"],
    exclude: ["ASIA", "GLOBAL", "WORLD", "JAPAN", "Japan/Korea", "Japan Korea"],
  },
  TH: {
    emoji: "🇹🇭",
    name: "泰國",
    codes: ["TH", "THA", "THAILAND"],
    keywords: ["Thailand", "Bangkok", "AIS", "DTAC"],
    exclude: ["ASIA", "GLOBAL", "Singapore", "Malaysia"],
  },
  CN: {
    emoji: "🇨🇳",
    name: "中國",
    codes: ["CN", "CHN", "CHINA"],
    keywords: ["China", "Shanghai", "Unicom"],
    exclude: ["ASIA", "GLOBAL", "HK", "MACAU"],
  },
  HK: {
    emoji: "🇭🇰",
    name: "香港",
    codes: ["HK", "HKG", "HONG KONG"],
    keywords: ["Hong Kong", "CSL", "SmarTone"],
    exclude: ["ASIA", "GLOBAL", "CHINA"],
  },
  SG: {
    emoji: "🇸🇬",
    name: "新加坡",
    codes: ["SG", "SGP", "SINGAPORE"],
    keywords: ["Singapore", "Singtel", "StarHub", "M1"],
    exclude: ["ASIA", "GLOBAL", "Malaysia", "Thailand"],
  },
  MY: {
    emoji: "🇲🇾",
    name: "馬來西亞",
    codes: ["MY", "MYS", "MALAYSIA"],
    keywords: ["Malaysia", "Kuala Lumpur", "Maxis", "Celcom"],
    exclude: ["ASIA", "GLOBAL", "Singapore"],
  },
  VN: {
    emoji: "🇻🇳",
    name: "越南",
    codes: ["VN", "VNM", "VIETNAM"],
    keywords: ["Vietnam", "Viettel", "Vinaphone"],
    exclude: ["ASIA", "GLOBAL"],
  },
  ID: {
    emoji: "🇮🇩",
    name: "印尼",
    codes: ["ID", "IDN", "INDONESIA"],
    keywords: ["Indonesia", "Bali", "Telkomsel", "Indosat"],
    exclude: ["ASIA", "GLOBAL"],
  },
  JP_KR: {
    emoji: "🇯🇵🇰🇷",
    name: "日韓通用",
    codes: ["JP_KR", "KR_JP"],
    keywords: [
      "Japan Korea",
      "Japan/Korea",
      "Japan&Korea",
      "Japan-Korea",
      "Korea/Japan",
      "Korea&Japan",
      "日韓",
    ],
    exclude: [],
  },
  SMT: {
    emoji: "🏖️",
    name: "新馬泰 (星馬泰)",
    codes: ["SMT", "SG_MY_TH", "TH_SG_MY"],
    keywords: [
      "Singapore&Malaysia&Thailand",
      "Singapore-Malaysia-Thailand",
      "Singapore/Malaysia/Thailand",
      "新馬泰",
      "星馬泰",
    ],
    exclude: [],
  },
  ANZ: {
    emoji: "🦘",
    name: "紐澳 (澳洲+紐西蘭)",
    codes: ["ANZ", "AU_NZ", "AU-NZ"],
    keywords: [
      "Australia&New Zealand",
      "Australia-New Zealand",
      "紐澳",
      "澳紐",
    ],
    exclude: [],
  },
  CN_HK_MO: {
    emoji: "🐲",
    name: "中港澳",
    codes: ["CN_HK_MO", "GREATER_CHINA"],
    keywords: ["China&HK", "China-HK", "Greater China", "中港澳"],
    exclude: ["ASIA"],
  },
  ASIA: {
    emoji: "🌏",
    name: "亞洲多國 (Asia)",
    codes: ["ASIA", "ASIA11", "ASIA24"],
    keywords: ["ASIA", "Countries"],
    exclude: ["GLOBAL", "EUROPE"],
  },
  EU: {
    emoji: "🇪🇺",
    name: "歐洲多國 (EU)",
    codes: ["EU", "EUROPE", "EU33", "EU42"],
    keywords: ["Europe", "EU 33", "EU 42", "歐洲"],
    exclude: ["GLOBAL"],
  },
  GLOBAL: {
    emoji: "🌍",
    name: "全球/歐美",
    codes: ["GLOBAL"],
    keywords: ["GLOBAL", "WORLD"],
    exclude: [],
  },
};

// --- 2. 輔助函式 ---
const parseDataValue = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("unlimited")) return 999999999;
  const match = n.match(/(\d+\.?\d*)\s*(gb|mb)/);
  if (match) {
    let val = parseFloat(match[1]);
    const unit = match[2];
    if (unit === "gb") val *= 1024;
    return val;
  }
  return 0;
};

// ★ 更新: 白話文說明，增加 10Mbps 偵測
const getSimpleDesc = (name: string, day: number) => {
  const n = name.toLowerCase();

  // 1. 先抓網速 (Mbps)
  const mbpsMatch = n.match(/(\d+)\s*mbps/);
  const speedSuffix = mbpsMatch ? ` · ${mbpsMatch[1]}Mbps` : "";

  if (n.includes("total")) {
    const match = n.match(/total\s*(\d+\.?\d*[g|m]b)/);
    return match
      ? `總量 ${match[1].toUpperCase()} · ${day}天`
      : `總量型 · ${day}天`;
  } else if (n.includes("daily") || n.includes("day")) {
    const match = n.match(/daily\s*(\d+\.?\d*[g|m]b)/);
    return match
      ? `每日 ${match[1].toUpperCase()} · ${day}天`
      : `每日定量 · ${day}天`;
  } else if (n.includes("unlimited")) {
    return `吃到飽${speedSuffix} · ${day}天`; // e.g., 吃到飽 · 10Mbps · 3天
  }
  return `規格詳見內容 · ${day}天`;
};

// --- 3. 核心解析邏輯 ---
const parsePlanDetails = (p: any, countryConfig: any) => {
  const name = (p.name || "").toLowerCase();
  const fullDesc = (
    (p.rule_desc || "") +
    " " +
    (p.speed_desc || "") +
    (p.apn || "") +
    name
  ) // 也要搜 name
    .toLowerCase();
  const apn = (p.apn || "").trim().toLowerCase();

  let rawOp = "";
  let rawGateway = "";

  Object.entries(p).forEach(([key, val]) => {
    if (typeof val === "string") {
      const v = val.trim();
      const vUpper = v.toUpperCase();
      if (v.includes("[") && v.includes("]") && v.length > 5) rawOp = vUpper;
      if (
        key !== "location" &&
        key !== "countryCode" &&
        key !== "apn" &&
        key !== "id"
      ) {
        if (/^([A-Z]{2})(,[A-Z]{2})*$/.test(vUpper)) rawGateway = vUpper;
      }
    }
  });

  const roamingApns = [
    "3gnet",
    "globaldata",
    "cuniq",
    "cmhk",
    "mobile.three.com.hk",
    "ctm-mobile",
    "plus.4g",
  ];
  const isRoamingAPN = roamingApns.some((key) => apn.includes(key));

  let networkSpeed = "4G/LTE";
  let speedBadgeClass = "bg-gray-100 text-gray-600";
  let is5G = false;
  if (rawOp.includes("5G") || /5g(?!b)/i.test(name)) is5G = true;

  if (is5G) {
    networkSpeed = "5G 極速";
    speedBadgeClass =
      "bg-purple-100 text-purple-700 border border-purple-200 ring-1 ring-purple-200";
  }

  // ★ 更新: 真吃到飽 vs 10Mbps vs FUP 判斷邏輯
  let isTrueUnlimited = false;
  let isCappedUnlimited = false; // 10Mbps 這類
  let capSpeed = "";

  // 抓取 Mbps 數字
  const mbpsMatch = fullDesc.match(/(\d+)\s*mbps/);

  if (fullDesc.includes("unlimited")) {
    if (mbpsMatch) {
      // 如果有具體的 Mbps 數字 (例如 10Mbps)，視為限速吃到飽
      isCappedUnlimited = true;
      capSpeed = mbpsMatch[1] + "Mbps";
    } else if (
      fullDesc.includes("high speed") ||
      fullDesc.includes("max speed")
    ) {
      // 如果沒寫數字，但寫了 High Speed，視為真吃到飽
      isTrueUnlimited = true;
    }
  }

  let setupMode = "⚡️ 自動設定";
  let setupBadge = "text-green-600 bg-green-50 border border-green-100";
  if (
    apn.includes("username") ||
    apn.includes("password") ||
    apn.includes("chap")
  ) {
    setupMode = "⚙️ 需手動設定";
    setupBadge = "text-red-700 bg-red-50 border border-red-100 font-bold";
  }

  let carrier = "自動切換";
  let carrierBadge = "bg-gray-50 text-gray-600";

  const formatOperator = (raw: string) => {
    if (!raw) return "自動切換";
    return raw
      .split("|")
      .map((part) => {
        const [code, opsRaw] = part.split(":");
        if (!opsRaw) return part;
        const cleanOps = opsRaw
          .replace(/\[.*?\]/g, "")
          .split(",")
          .join(" / ");
        const flag = COUNTRIES[code]?.emoji || code;
        return `${flag} ${cleanOps}`;
      })
      .join(" + ");
  };

  if (rawOp && rawOp.length > 5) {
    carrier = formatOperator(rawOp);
    if (
      carrier.includes("/") ||
      carrier.includes("+") ||
      carrier.includes("Softbank")
    )
      carrierBadge = "bg-blue-50 text-blue-700 border border-blue-100";
    else if (carrier.includes("KDDI"))
      carrierBadge = "bg-orange-50 text-orange-700 border border-orange-100";
    else if (carrier.includes("Docomo") || carrier.includes("IIJ"))
      carrierBadge = "bg-red-50 text-red-700 border border-red-100";
  } else {
    if (name.includes("softbank") && name.includes("kddi"))
      carrier = "SoftBank / KDDI";
    else if (apn.includes("au-net")) carrier = "AU (KDDI)";
    else if (apn.includes("vmobile.jp")) carrier = "IIJ Docomo";
    else if (apn.includes("mobile.three.com.hk")) carrier = "3HK 漫遊";
  }

  // IP & App Support
  let isNative = false;
  let ipRegion = "當地 IP";

  if (rawGateway) {
    const gws = rawGateway.split(",").map((g) => {
      if (g === "HK") return "🇭🇰 香港";
      if (g === "SG") return "🇸🇬 新加坡";
      if (g === "JP") return "🇯🇵 日本";
      return g;
    });
    const isSingleJP = rawGateway === "JP";
    if (isSingleJP && !isRoamingAPN) {
      isNative = true;
      ipRegion = "🇯🇵 日本原生 IP";
    } else {
      isNative = false;
      ipRegion = gws.join("/") + (isSingleJP ? " 漫遊 IP" : " IP");
    }
  } else {
    if (isRoamingAPN) {
      isNative = false;
      if (apn.includes("3gnet")) ipRegion = "🇭🇰/🇸🇬 混合 IP";
      else ipRegion = "🇭🇰 香港 IP (漫遊)";
    } else if (apn.includes(".jp") || apn.includes("au-net")) {
      isNative = true;
      ipRegion = "🇯🇵 日本原生 IP";
    }
  }

  let supportChatGPT = true;
  let supportTikTok = true;
  let supportGemini = true;

  const regionStr = ipRegion.toLowerCase();

  if (regionStr.includes("中國") || regionStr.includes("cn")) {
    supportChatGPT = false;
    supportTikTok = false;
    supportGemini = false;
  } else if (regionStr.includes("香港") || regionStr.includes("hk")) {
    supportChatGPT = false;
    supportTikTok = false;
    supportGemini = true;
  } else if (
    regionStr.includes("混合") ||
    (regionStr.includes("hk") && regionStr.includes("sg"))
  ) {
    supportChatGPT = false;
    supportTikTok = false;
    supportGemini = true;
  }

  // ★ 更新: 降速/類型顯示邏輯
  let throttle = "未知";
  let throttleClass = "bg-gray-50 text-gray-500";
  const lowSpeedMatch = fullDesc.match(/(\d+)\s*kbps/i); // 找降速後的低速 (e.g. 128kbps)

  if (fullDesc.includes("terminate") || fullDesc.includes("stop")) {
    throttle = "🚫 用完斷網";
    throttleClass = "bg-red-50 text-red-600 border border-red-100";
  } else if (isCappedUnlimited) {
    // 優先顯示 10Mbps 這種高速限制
    throttle = `🚀 限速 ${capSpeed}`;
    throttleClass =
      "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold";
  } else if (lowSpeedMatch) {
    throttle = `⬇️ 降速至 ${lowSpeedMatch[1]}kbps`;
    throttleClass = "bg-yellow-50 text-yellow-700 border border-yellow-100";
  } else if (isTrueUnlimited) {
    throttle = "🔥 真．不限速";
    throttleClass =
      "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200 font-bold shadow-sm";
  } else if (fullDesc.includes("unlimited")) {
    throttle = "♾️ 無限流量 (FUP)";
    throttleClass = "bg-blue-50 text-blue-700 border border-blue-100";
  }

  let hotspotStatus = "📡 支援熱點";
  let hotspotClass = "bg-blue-50 text-blue-600 border border-blue-100";
  if (
    fullDesc.match(
      /no\s*hotspot|not\s*support\s*tethering|no\s*tethering|不可.*熱點/i,
    )
  ) {
    hotspotStatus = "🚫 不可熱點";
    hotspotClass = "bg-red-50 text-red-600 border border-red-100 font-bold";
  } else if (fullDesc.match(/hotspot\s*limit|share\s*limit/i)) {
    hotspotStatus = "⚠️ 熱點限量";
    hotspotClass = "bg-yellow-50 text-yellow-700 border border-yellow-100";
  }

  return {
    isNative,
    carrier,
    carrierBadge,
    throttle,
    throttleClass,
    supportChatGPT,
    supportTikTok,
    supportGemini,
    ipRegion,
    networkSpeed,
    speedBadgeClass,
    setupMode,
    setupBadge,
    hotspotStatus,
    hotspotClass,
  };
};

// ... CurrencyConverter (保持不變) ...
const CurrencyConverter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rates, setRates] = useState<any>(null);
  const [inputs, setInputs] = useState({ USD: "", HKD: "", TWD: "" });

  useEffect(() => {
    fetch("https://api.exchangerate-api.com/v4/latest/USD")
      .then((res) => res.json())
      .then((data) => setRates(data.rates))
      .catch((e) => console.error(e));
  }, []);

  const handleConvert = (currency: string, value: string) => {
    if (!rates || isNaN(Number(value))) return;
    const val = parseFloat(value);
    let newInputs = { USD: "", HKD: "", TWD: "" };
    if (value === "") {
      setInputs(newInputs);
      return;
    }
    if (currency === "USD")
      newInputs = {
        USD: value,
        HKD: (val * rates.HKD).toFixed(2),
        TWD: (val * rates.TWD).toFixed(1),
      };
    else if (currency === "HKD") {
      const usdBase = val / rates.HKD;
      newInputs = {
        USD: usdBase.toFixed(2),
        HKD: value,
        TWD: (usdBase * rates.TWD).toFixed(1),
      };
    } else if (currency === "TWD") {
      const usdBase = val / rates.TWD;
      newInputs = {
        USD: usdBase.toFixed(2),
        HKD: (usdBase * rates.HKD).toFixed(2),
        TWD: value,
      };
    }
    setInputs(newInputs);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-200 w-80 mb-4 animate-fade-in-up origin-bottom-right">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
            <h3 className="text-base font-bold flex items-center gap-2 text-gray-800">
              💱 匯率計算器
            </h3>
            <button onClick={() => setIsOpen(false)}>✕</button>
          </div>
          <div className="space-y-4">
            {["USD", "HKD", "TWD"].map((cur) => (
              <div key={cur} className="relative">
                <label className="absolute left-3 top-2 text-[10px] font-bold text-gray-400">
                  {cur}
                </label>
                <input
                  type="number"
                  value={inputs[cur as keyof typeof inputs]}
                  onChange={(e) => handleConvert(cur, e.target.value)}
                  className={`w-full border border-gray-200 rounded-xl px-4 pt-6 pb-2 text-xl font-bold outline-none ${cur === "TWD" ? "bg-blue-50 text-blue-700" : "bg-gray-50"}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-5 py-3 rounded-full shadow-xl font-bold bg-black text-white hover:scale-105 transition-all"
      >
        <span className="text-xl">💱</span>
        {isOpen ? "收折" : "匯率試算"}
      </button>
    </div>
  );
};

export default function GlobalPlanScanner() {
  const [rawPlans, setRawPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedCountry, setSelectedCountry] = useState("JP");
  const [filterName, setFilterName] = useState("ALL");
  const [filterCarrier, setFilterCarrier] = useState("ALL");
  const [filterIP, setFilterIP] = useState("ALL");
  const [filterDayRange, setFilterDayRange] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  type SortKey = "PRICE" | "DAY" | "DATA";
  interface SortConfig {
    key: SortKey;
    order: "ASC" | "DESC";
  }
  const [sortStack, setSortStack] = useState<SortConfig[]>([
    { key: "PRICE", order: "ASC" },
  ]);

  const [baseCurrency, setBaseCurrency] = useState("HKD");
  const [exchangeRates, setExchangeRates] = useState({ USD: 32.5, HKD: 4.1 });
  const [savedPlanIds, setSavedPlanIds] = useState<string[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  useEffect(() => {
    fetchRates();
    fetchPlans();
    const saved = localStorage.getItem("savedPlans");
    if (saved) setSavedPlanIds(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem("savedPlans", JSON.stringify(savedPlanIds));
  }, [savedPlanIds]);
  const toggleSavePlan = (id: string) => {
    setSavedPlanIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  };
  const fetchRates = async () => {
    try {
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/TWD");
      const data = await res.json();
      setExchangeRates({ USD: 1 / data.rates.USD, HKD: 1 / data.rates.HKD });
    } catch (e) {
      console.error(e);
    }
  };
  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/esim/test-list");
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      setRawPlans(data.result || []);
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  const handleSortClick = (key: SortKey) => {
    setSortStack((prevStack) => {
      const existingIndex = prevStack.findIndex((s) => s.key === key);
      let newStack = [...prevStack];

      if (existingIndex === 0) {
        newStack[0] = {
          ...newStack[0],
          order: newStack[0].order === "ASC" ? "DESC" : "ASC",
        };
      } else {
        if (existingIndex !== -1) {
          newStack.splice(existingIndex, 1);
        }
        newStack.unshift({ key, order: "ASC" });
      }
      return newStack.slice(0, 3);
    });
  };

  const getSortPriority = (key: SortKey) => {
    const index = sortStack.findIndex((s) => s.key === key);
    return index === -1 ? null : index + 1;
  };

  const getSortOrder = (key: SortKey) => {
    const config = sortStack.find((s) => s.key === key);
    return config ? config.order : null;
  };

  const baseProcessedPlans = useMemo(() => {
    if (!rawPlans || rawPlans.length === 0) return [];

    const config = COUNTRIES[selectedCountry] || {
      name: selectedCountry,
      codes: [selectedCountry],
      keywords: [],
      exclude: [],
    };

    return rawPlans
      .filter((p) => {
        if (showSavedOnly) return savedPlanIds.includes(p.id);
        const fullString = JSON.stringify(p).toUpperCase();
        const pCode = (p.code || p.location || "").toUpperCase();
        const pName = p.name.toUpperCase();

        if (config.exclude && config.exclude.length > 0) {
          const isExcluded = config.exclude.some((exWord: string) =>
            pName.includes(exWord.toUpperCase()),
          );
          if (isExcluded) return false;
        }

        const matchCode = config.codes
          ? config.codes.some((c: string) => pCode === c || pCode.includes(c))
          : pCode === selectedCountry;

        const matchKeyword = config.keywords
          ? config.keywords.some((k: string) =>
              fullString.includes(k.toUpperCase()),
            )
          : false;

        return matchCode || matchKeyword;
      })
      .map((p) => {
        const details = parsePlanDetails(p, config);
        const simpleDesc = getSimpleDesc(p.name, p.day);
        const dataValue = parseDataValue(p.name);

        let planCategory = "OTHER";
        const nLower = p.name.toLowerCase();
        if (nLower.includes("total")) planCategory = "TOTAL";
        else if (nLower.includes("daily") || nLower.includes("day"))
          planCategory = "DAILY";
        else if (
          nLower.includes("unlimited") ||
          p.rule_desc?.toLowerCase().includes("unlimited")
        )
          planCategory = "UNLIMITED";

        const rawPrice = parseFloat(p.price || 0);
        const rate =
          baseCurrency === "USD" ? exchangeRates.USD : exchangeRates.HKD;
        const costTWD = Math.ceil(rawPrice * rate);

        const margin = details.isNative ? 1.6 : 1.4;
        const profitRate = Math.round((margin - 1) * 100) + "%";
        const suggestedPrice = Math.ceil((costTWD * margin) / 10) * 10 - 1;

        return {
          ...p,
          ...details,
          simpleDesc,
          planCategory,
          dataValue,
          costTWD,
          profitRate,
          suggestedPrice,
          dayInt: parseInt(p.day) || 0,
          typeLabel: details.isNative ? `🔴 ${config.name}原生` : "🔵 漫遊線路",
          typeClass: details.isNative
            ? "bg-red-50 text-red-700 border border-red-100"
            : "bg-blue-50 text-blue-700 border border-blue-100",
          isSaved: savedPlanIds.includes(p.id),
        };
      });
  }, [
    rawPlans,
    selectedCountry,
    baseCurrency,
    exchangeRates,
    savedPlanIds,
    showSavedOnly,
  ]);

  const uniqueCarriers = useMemo(() => {
    const carriers = new Set(baseProcessedPlans.map((p) => p.carrier));
    return Array.from(carriers).sort();
  }, [baseProcessedPlans]);

  const uniquePlanNames = useMemo(() => {
    const names = new Set(baseProcessedPlans.map((p) => p.name));
    return Array.from(names).sort();
  }, [baseProcessedPlans]);

  useEffect(() => {
    setFilterName("ALL");
    setFilterCarrier("ALL");
  }, [selectedCountry]);

  const filteredPlans = useMemo(() => {
    let result = baseProcessedPlans;

    if (!showSavedOnly) {
      if (filterName !== "ALL")
        result = result.filter((p) => p.name === filterName);
      if (filterCarrier !== "ALL")
        result = result.filter((p) => p.carrier === filterCarrier);
      if (filterIP === "NATIVE") result = result.filter((p) => p.isNative);
      if (filterIP === "ROAMING") result = result.filter((p) => !p.isNative);
      if (filterDayRange === "SHORT")
        result = result.filter((p) => p.dayInt <= 5);
      if (filterDayRange === "MID")
        result = result.filter((p) => p.dayInt > 5 && p.dayInt <= 10);
      if (filterDayRange === "LONG")
        result = result.filter((p) => p.dayInt > 10);
      if (filterType === "DAILY")
        result = result.filter((p) => p.planCategory === "DAILY");
      if (filterType === "TOTAL")
        result = result.filter((p) => p.planCategory === "TOTAL");
      if (filterType === "UNLIMITED")
        result = result.filter((p) => p.planCategory === "UNLIMITED");
    }

    result.sort((a, b) => {
      for (const sortConfig of sortStack) {
        let compareResult = 0;
        const { key, order } = sortConfig;

        let valA, valB;
        if (key === "PRICE") {
          valA = a.costTWD;
          valB = b.costTWD;
        } else if (key === "DAY") {
          valA = a.dayInt;
          valB = b.dayInt;
        } else if (key === "DATA") {
          valA = a.dataValue;
          valB = b.dataValue;
        } else continue;

        if (valA !== valB) {
          compareResult = valA - valB;
          if (order === "DESC") compareResult = -compareResult;
          return compareResult;
        }
      }
      return 0;
    });

    return result;
  }, [
    baseProcessedPlans,
    filterName,
    filterCarrier,
    filterIP,
    filterDayRange,
    filterType,
    sortStack,
    showSavedOnly,
  ]);

  if (loading)
    return (
      <div className="p-10 text-center font-bold text-gray-500">掃描中...</div>
    );
  if (errorMsg)
    return (
      <div className="p-10 text-center text-red-500">錯誤: {errorMsg}</div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-sm pb-32">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-800">
            eSIM 選品神器 (Pro版)
          </h1>
          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all shadow-sm ${showSavedOnly ? "bg-red-500 text-white shadow-red-200" : "bg-white text-gray-700 border hover:bg-gray-50"}`}
          >
            {showSavedOnly
              ? "🔙 返回列表"
              : `❤️ 查看已收藏 (${savedPlanIds.length})`}
          </button>
        </div>

        {/* Info Bar */}
        <div className="bg-gray-800 text-white p-3 rounded-lg mb-6 flex flex-wrap justify-between items-center text-xs font-mono gap-2">
          <div>
            API 庫存: <span className="text-yellow-400">{rawPlans.length}</span>{" "}
            | 顯示: <span className="text-white">{filteredPlans.length}</span>
          </div>
          <div>
            1 USD ≈ {exchangeRates.USD.toFixed(1)} TWD | 1 HKD ≈{" "}
            {exchangeRates.HKD.toFixed(1)} TWD
          </div>
        </div>

        {/* Controls Panel */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6 space-y-4">
          {/* 第一排：基礎篩選 */}
          <div className="flex flex-wrap gap-4 items-center">
            {!showSavedOnly && (
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2">
                <span className="text-xl mr-2">🌏</span>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="py-2 pl-1 pr-8 bg-transparent font-bold outline-none cursor-pointer text-gray-800 min-w-[120px]"
                >
                  {Object.keys(COUNTRIES).map((c) => (
                    <option key={c} value={c}>
                      {COUNTRIES[c].emoji} {COUNTRIES[c].name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!showSavedOnly && (
              <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-2">
                <span className="text-sm font-bold text-blue-800 mr-2 whitespace-nowrap">
                  🔍 方案細分:
                </span>
                <select
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="py-2 pl-1 pr-8 bg-transparent text-blue-900 font-medium outline-none cursor-pointer max-w-[200px]"
                >
                  <option value="ALL">
                    全部方案 ({baseProcessedPlans.length})
                  </option>
                  {uniquePlanNames.map((name) => {
                    const count = baseProcessedPlans.filter(
                      (p) => p.name === name,
                    ).length;
                    return (
                      <option key={name} value={name}>
                        {name} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="flex items-center bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1">
              <span className="text-xs font-bold text-yellow-800 mr-2">
                原始幣:
              </span>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="bg-transparent font-bold text-yellow-900 outline-none cursor-pointer"
              >
                <option value="HKD">HKD</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* 第二排：排序與進階篩選 */}
          {!showSavedOnly && (
            <div className="flex flex-wrap gap-4 items-center pt-2 border-t border-gray-100">
              <div className="flex items-center bg-purple-50 border border-purple-200 rounded-lg px-2">
                <span className="text-sm font-bold text-purple-800 mr-2 whitespace-nowrap">
                  📡 電信商:
                </span>
                <select
                  value={filterCarrier}
                  onChange={(e) => setFilterCarrier(e.target.value)}
                  className="py-2 pl-1 pr-8 bg-transparent text-purple-900 font-medium outline-none cursor-pointer max-w-[200px]"
                >
                  <option value="ALL">所有電信商</option>
                  {uniqueCarriers.map((carrier) => (
                    <option key={carrier} value={carrier}>
                      {carrier}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={filterIP}
                onChange={(e) => setFilterIP(e.target.value)}
                className="border p-2 rounded-lg bg-white text-sm"
              >
                <option value="ALL">全部線路</option>
                <option value="NATIVE">🔴 原生線路</option>
                <option value="ROAMING">🔵 漫遊線路</option>
              </select>

              <select
                value={filterDayRange}
                onChange={(e) => setFilterDayRange(e.target.value)}
                className="border p-2 rounded-lg bg-white text-sm"
              >
                <option value="ALL">所有天數</option>
                <option value="SHORT">短期 (1-5天)</option>
                <option value="MID">中期 (6-10天)</option>
                <option value="LONG">長期 (11天+)</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border p-2 rounded-lg bg-white text-sm"
              >
                <option value="ALL">所有類型</option>
                <option value="DAILY">📅 每日型</option>
                <option value="TOTAL">📦 總量型</option>
                <option value="UNLIMITED">♾️ 吃到飽</option>
              </select>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-gray-500 text-xs font-bold mr-1">
                  排序:
                </span>

                {/* 1. 價格 */}
                <button
                  onClick={() => handleSortClick("PRICE")}
                  className={`relative px-3 py-1.5 rounded-lg border text-sm font-bold transition-all flex items-center gap-1
                    ${
                      getSortPriority("PRICE")
                        ? "bg-yellow-100 border-yellow-400 text-yellow-900 shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  {getSortPriority("PRICE") && (
                    <span className="absolute -top-2 -right-1 bg-yellow-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                      {getSortPriority("PRICE")}
                    </span>
                  )}
                  💰 價格
                  {getSortPriority("PRICE") && (
                    <span>{getSortOrder("PRICE") === "ASC" ? "⬆️" : "⬇️"}</span>
                  )}
                </button>

                {/* 2. 天數 */}
                <button
                  onClick={() => handleSortClick("DAY")}
                  className={`relative px-3 py-1.5 rounded-lg border text-sm font-bold transition-all flex items-center gap-1
                    ${
                      getSortPriority("DAY")
                        ? "bg-blue-100 border-blue-400 text-blue-900 shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  {getSortPriority("DAY") && (
                    <span className="absolute -top-2 -right-1 bg-blue-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                      {getSortPriority("DAY")}
                    </span>
                  )}
                  📅 天數
                  {getSortPriority("DAY") && (
                    <span>{getSortOrder("DAY") === "ASC" ? "⬆️" : "⬇️"}</span>
                  )}
                </button>

                {/* 3. 流量 */}
                <button
                  onClick={() => handleSortClick("DATA")}
                  className={`relative px-3 py-1.5 rounded-lg border text-sm font-bold transition-all flex items-center gap-1
                    ${
                      getSortPriority("DATA")
                        ? "bg-purple-100 border-purple-400 text-purple-900 shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  {getSortPriority("DATA") && (
                    <span className="absolute -top-2 -right-1 bg-purple-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                      {getSortPriority("DATA")}
                    </span>
                  )}
                  📊 流量
                  {getSortPriority("DATA") && (
                    <span>{getSortOrder("DATA") === "ASC" ? "⬆️" : "⬇️"}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="p-4 w-12 text-center">收藏</th>
                <th className="p-4 w-32">類型 / 網速</th>
                <th className="p-4 w-48">電信商</th>
                <th className="p-4 w-24">APP / 熱點</th>
                <th className="p-4 w-1/5">方案名稱 (ID)</th>
                <th className="p-4 w-32 bg-yellow-50 text-yellow-800 border-b-2 border-yellow-200">
                  說明
                </th>
                <th className="p-4 w-32">降速規則</th>
                <th className="p-4 w-32">APN / 設定</th>
                <th className="p-4 w-24 text-right">成本 (TWD)</th>
                <th className="p-4 w-24 text-right">建議售價</th>
                <th className="p-4 w-16 text-center">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPlans.map((p) => (
                <tr
                  key={p.id}
                  className={`transition-colors ${p.isSaved ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}`}
                >
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleSavePlan(p.id)}
                      className="text-xl hover:scale-110 transition-transform"
                    >
                      {p.isSaved ? "❤️" : "🤍"}
                    </button>
                  </td>
                  <td className="p-4 align-top">
                    <span
                      className={`inline-block px-2 py-1 rounded text-[10px] font-bold mb-1 ${p.typeClass}`}
                    >
                      {p.typeLabel}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-bold text-gray-900">
                        {p.day}
                        <span className="text-xs font-normal">天</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${p.speedBadgeClass}`}
                      >
                        {p.networkSpeed}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <div
                      className={`font-bold text-sm px-2 py-1 rounded-md inline-block mb-1 ${p.carrierBadge}`}
                    >
                      {p.carrier}
                    </div>
                    {p.carrier.includes("SoftBank / KDDI") && (
                      <div className="text-[10px] text-blue-500">
                        ✨ 雙網自動切換
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-top">
                    <div className="flex flex-col gap-1 text-[10px] font-bold">
                      <div className="flex gap-2">
                        <span
                          className={
                            p.supportChatGPT ? "text-green-600" : "text-red-400"
                          }
                        >
                          {p.supportChatGPT ? "GPT✅" : "GPT❌"}
                        </span>
                        <span
                          className={
                            p.supportTikTok ? "text-green-600" : "text-red-400"
                          }
                        >
                          {p.supportTikTok ? "TikTok✅" : "TikTok❌"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span
                          className={
                            p.supportGemini ? "text-blue-600" : "text-red-400"
                          }
                        >
                          {p.supportGemini ? "Gemini✅" : "Gemini❌"}
                        </span>
                      </div>

                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-center mt-1 ${p.hotspotClass}`}
                      >
                        {p.hotspotStatus}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="font-medium text-xs text-gray-900 mb-1 break-all">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {p.id}
                    </div>
                  </td>
                  <td className="p-4 align-top bg-yellow-50/30">
                    <div className="text-sm font-bold text-yellow-900">
                      {p.simpleDesc}
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${p.throttleClass}`}
                    >
                      {p.throttle}
                    </span>
                  </td>
                  <td className="p-4 align-top">
                    <div
                      className={`text-[10px] font-bold px-1 rounded inline-block mb-1 ${p.setupBadge}`}
                    >
                      {p.setupMode}
                    </div>
                    <div className="text-xs text-gray-500 font-mono break-all">
                      {p.apn || "Manual"}
                    </div>
                    <div className="text-[10px] text-gray-400 border border-gray-100 px-1 rounded inline-block mt-1">
                      {p.ipRegion}
                    </div>
                  </td>
                  <td className="p-4 align-top text-right font-bold text-gray-600">
                    ${p.costTWD}
                    <div className="text-[9px] text-gray-400 font-normal mt-1">
                      {p.price} {baseCurrency}
                    </div>
                  </td>
                  <td className="p-4 align-top text-right">
                    <div className="text-xl font-bold text-blue-600">
                      ${p.suggestedPrice}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      (抓 {p.profitRate} 利潤)
                    </div>
                  </td>
                  <td className="p-4 align-top text-center">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(p.id);
                        alert("Copied: " + p.id);
                      }}
                      className="text-gray-400 hover:text-black"
                    >
                      📋
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPlans.length === 0 && (
            <div className="p-20 text-center text-gray-400 flex flex-col items-center">
              <div className="text-6xl mb-4">🔍</div>
              <p className="font-bold">沒有找到符合的方案</p>
              <button
                onClick={() => setFilterName("ALL")}
                className="mt-2 text-blue-500 hover:underline"
              >
                清除方案細分篩選
              </button>
            </div>
          )}
        </div>
      </div>
      <CurrencyConverter />
    </div>
  );
}
