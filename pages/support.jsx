"use client";
import { useState, useMemo } from "react";
import Layout from "./Layout.js";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  SquaresPlusIcon,
  BoltIcon,
  PhoneIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { FaApple, FaGoogle, FaAndroid, FaWindows } from "react-icons/fa"; // 如果沒有安裝 react-icons，可以用 heroicons 替代，或需安裝 npm install react-icons

// --- 0. 三星常見機身代碼 → 行銷名稱（Android UA 常回報代碼而非行銷名） ---
const SAMSUNG_MODEL_MAP = [
  { prefix: "SM-S928", label: "Galaxy S24 Ultra" },
  { prefix: "SM-S926", label: "Galaxy S24+" },
  { prefix: "SM-S921", label: "Galaxy S24" },
  { prefix: "SM-S918", label: "Galaxy S23 Ultra" },
  { prefix: "SM-S916", label: "Galaxy S23+" },
  { prefix: "SM-S911", label: "Galaxy S23" },
  { prefix: "SM-S711", label: "Galaxy S23 FE" },
  { prefix: "SM-S908", label: "Galaxy S22 Ultra" },
  { prefix: "SM-S906", label: "Galaxy S22+" },
  { prefix: "SM-S901", label: "Galaxy S22" },
  { prefix: "SM-G998", label: "Galaxy S21 Ultra" },
  { prefix: "SM-G996", label: "Galaxy S21+" },
  { prefix: "SM-G991", label: "Galaxy S21" },
  { prefix: "SM-G988", label: "Galaxy S20 Ultra" },
  { prefix: "SM-G986", label: "Galaxy S20+" },
  { prefix: "SM-G981", label: "Galaxy S20" },
  { prefix: "SM-F956", label: "Galaxy Z Fold6" },
  { prefix: "SM-F741", label: "Galaxy Z Flip6" },
  { prefix: "SM-F946", label: "Galaxy Z Fold5" },
  { prefix: "SM-F731", label: "Galaxy Z Flip5" },
  { prefix: "SM-F936", label: "Galaxy Z Fold4" },
  { prefix: "SM-F721", label: "Galaxy Z Flip4" },
  { prefix: "SM-F926", label: "Galaxy Z Fold3" },
  { prefix: "SM-F711", label: "Galaxy Z Flip3" },
  { prefix: "SM-N986", label: "Galaxy Note20 Ultra" },
  { prefix: "SM-N981", label: "Galaxy Note20" },
];

function resolveFriendlyModelName(rawModel) {
  if (!rawModel) return "";
  const upper = rawModel.toUpperCase();
  const hit = SAMSUNG_MODEL_MAP.find((m) => upper.startsWith(m.prefix));
  return hit ? hit.label : rawModel;
}

/**
 * 依 User-Agent 猜測裝置。
 * ⚠️ 瀏覽器基於隱私考量不會、也不能提供 SIM/eSIM 硬體狀態，
 * 這裡只能「猜」機型並比對已知支援清單，不是讀取手機硬體。
 * iOS 13+ 之後 Safari 一律回報「iPhone」，無法取得確切型號。
 */
function detectDeviceInfo() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isIPadOS13Plus = platform === "MacIntel" && maxTouchPoints > 1;

  if (/iPhone/i.test(ua)) {
    return { os: "iOS", deviceFamily: "iPhone", friendly: "", raw: "" };
  }
  if (/iPad/i.test(ua) || isIPadOS13Plus) {
    return { os: "iPadOS", deviceFamily: "iPad", friendly: "", raw: "" };
  }
  if (/Android/i.test(ua)) {
    const m = ua.match(/Android [\d.]+;\s*([^;)]+?)(?:\s+Build|\))/i);
    const raw = m ? m[1].trim() : "";
    const friendly = resolveFriendlyModelName(raw);
    return { os: "Android", deviceFamily: "Android 手機", friendly, raw };
  }
  if (/Windows NT/i.test(ua) && !/Windows Phone/i.test(ua)) {
    return { os: "Windows", deviceFamily: "Windows 電腦", friendly: "", raw: "" };
  }
  if (/Macintosh/i.test(ua)) {
    return { os: "Mac", deviceFamily: "Mac 電腦", friendly: "", raw: "" };
  }
  return { os: "Unknown", deviceFamily: "未知裝置", friendly: "", raw: "" };
}

function findDeviceMatches(term) {
  if (!term) return [];
  const t = term.toLowerCase();
  const results = [];
  DEVICE_DATA.forEach((brand) => {
    const matches = brand.devices.filter(
      (d) => !d.includes("注意") && d.toLowerCase().includes(t),
    );
    if (matches.length) {
      results.push({ brandTitle: brand.title, matches });
    }
  });
  return results;
}

// --- 1. 資料庫：支援 eSIM 的裝置列表 ---
const DEVICE_DATA = [
  {
    id: "apple",
    title: "支援 eSIM 的蘋果 iPhone",
    icon: <FaApple className="w-8 h-8" />,
    color: "bg-gray-900 text-white",
    devices: [
      "iPhone 16 / 16 Plus / 16 Pro / 16 Pro Max",
      "iPhone 15 / 15 Plus / 15 Pro / 15 Pro Max",
      "iPhone 14 / 14 Plus / 14 Pro / 14 Pro Max",
      "iPhone 13 / 13 Mini / 13 Pro / 13 Pro Max",
      "iPhone 12 / 12 Mini / 12 Pro / 12 Pro Max",
      "iPhone 11 / 11 Pro / 11 Pro Max",
      "iPhone XS / XS Max / XR",
      "iPhone SE (2020 第2代 / 2022 第3代)",
      "注意：中國大陸、香港、澳門版本的實體雙卡 iPhone 通常不支援 eSIM (部分 iPhone 13 mini, 12 mini, SE 2/3, XS 除外)",
    ],
  },
  {
    id: "pixel",
    title: "Google Pixel 支援 eSIM 的手機",
    icon: <FaGoogle className="w-8 h-8" />,
    color: "bg-blue-600 text-white",
    devices: [
      "Google Pixel 9 / 9 Pro / 9 Pro XL / 9 Pro Fold",
      "Google Pixel 8 / 8 Pro / 8a",
      "Google Pixel 7 / 7 Pro / 7a",
      "Google Pixel 6 / 6 Pro / 6a",
      "Google Pixel 5 / 5a",
      "Google Pixel 4 / 4a / 4 XL",
      "Google Pixel 3 / 3a / 3 XL / 3a XL",
      "Google Pixel Fold",
    ],
  },
  {
    id: "samsung",
    title: "具備 eSIM 功能的三星手機",
    icon: <FaAndroid className="w-8 h-8" />, // Samsung 通常用 Android icon 代表或專屬 logo
    color: "bg-[#1428a0] text-white",
    devices: [
      "Galaxy S24 / S24+ / S24 Ultra",
      "Galaxy S23 / S23+ / S23 Ultra / S23 FE",
      "Galaxy S22 / S22+ / S22 Ultra",
      "Galaxy S21 / S21+ / S21 Ultra",
      "Galaxy S20 / S20+ / S20 Ultra",
      "Galaxy Z Fold 6 / Flip 6",
      "Galaxy Z Fold 5 / Flip 5",
      "Galaxy Z Fold 4 / Flip 4",
      "Galaxy Z Fold 3 / Flip 3",
      "Galaxy Note 20 / Note 20 Ultra",
      "注意：台灣版本的三星手機，S23 系列(含)以前的大多不支援 eSIM，請務必撥打 *#06# 確認是否有 EID",
    ],
  },
  {
    id: "ipad",
    title: "相容 eSIM 的 iPad (Wi-Fi + 行動網路)",
    icon: <DevicePhoneMobileIcon className="w-8 h-8" />, // 使用平板 Icon
    color: "bg-gray-700 text-white",
    devices: [
      "iPad Pro 13吋 (M4)",
      "iPad Pro 11吋 (M4)",
      "iPad Pro 12.9吋 (第3代 ~ 第6代)",
      "iPad Pro 11吋 (第1代 ~ 第4代)",
      "iPad Air (第3代 ~ 第6代/M2)",
      "iPad (第7代 ~ 第10代)",
      "iPad mini (第5代 ~ 第6代)",
      "注意：僅限 Wi-Fi + Cellular (行動網路) 版本支援，純 Wi-Fi 版不支援",
    ],
  },
  {
    id: "windows",
    title: "eSIM 支援的 Windows 10/11 筆記型電腦",
    icon: <FaWindows className="w-8 h-8" />,
    color: "bg-[#0078D4] text-white",
    devices: [
      "Microsoft Surface Pro 9 (5G) / Pro 8 (LTE) / Pro X",
      "Microsoft Surface Go 3 (LTE) / Go 2 (LTE)",
      "Lenovo ThinkPad X1 Titanium Yoga 5G / X1 Carbon Gen 9",
      "Dell Latitude 7440 / 7340",
      "HP EliteBook 840 G8 / Spectre x360",
      "Acer Swift 3 / 7",
      "Asus Transformer Mini / NovaGo",
      "需確認裝置是否內建 LTE/5G 模組且標示支援 eSIM",
    ],
  },
  {
    id: "others",
    title: "其他支援 eSIM 的手機裝置",
    icon: <SquaresPlusIcon className="w-8 h-8" />,
    color: "bg-teal-600 text-white",
    devices: [
      "Sony Xperia 1 V / 1 IV / 10 V / 10 IV / 5 V / 5 IV",
      "Oppo Find N3 / N3 Flip / N2 Flip / Find X5 Pro / Find X3 Pro",
      "Xiaomi 14 / 14 Pro / 13 / 13 Pro / 13T Pro / 12T Pro",
      "Sharp Aquos R8 pro / R7 / sense7 / sense8",
      "Motorola Razr 40 / 40 Ultra / Edge 40",
      "Huawei P40 / P40 Pro / Mate 40 Pro",
      "Nokia G60 5G / X30 5G",
    ],
  },
];

export default function CompatibilityPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState(null);
  const [detectMatches, setDetectMatches] = useState(null);

  const handleDetect = () => {
    setDetecting(true);
    setDetectResult(null);
    setDetectMatches(null);
    // 短暫延遲純粹是 UX（讓「偵測中」有感），偵測本身是即時的。
    window.setTimeout(() => {
      const info = detectDeviceInfo();
      setDetectResult(info);
      if (info?.os === "Android" && info.friendly) {
        setDetectMatches(findDeviceMatches(info.friendly));
        setSearchTerm(info.friendly);
      } else {
        setDetectMatches(null);
      }
      setDetecting(false);
    }, 600);
  };

  // 搜尋邏輯：如果使用者輸入關鍵字，即時過濾出包含該關鍵字的「品牌卡片」或「裝置」
  // 這裡我們做簡單處理：如果輸入文字，會顯示一個搜尋結果區塊
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    const results = [];

    DEVICE_DATA.forEach((brand) => {
      const matchingDevices = brand.devices.filter((d) =>
        d.toLowerCase().includes(term),
      );
      if (matchingDevices.length > 0) {
        results.push({
          brandName: brand.title,
          devices: matchingDevices,
        });
      }
    });
    return results;
  }, [searchTerm]);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 pb-20">
        {/* 1. Header & Search Section */}
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4">
            查詢您的裝置是否支援 eSIM
          </h1>
          <p className="text-slate-500 text-lg mb-8">
            輸入型號關鍵字，或點擊下方品牌分類查看完整列表
          </p>

          <div className="relative max-w-xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="輸入手機型號 (例如：iPhone 15, Pixel 8...)"
              className="w-full pl-12 pr-4 py-4 rounded-full border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 搜尋結果顯示區 */}
          {searchTerm && (
            <div className="mt-6 max-w-xl mx-auto bg-white  shadow-lg border border-gray-100 overflow-hidden text-left p-4">
              {searchResults.length > 0 ? (
                searchResults.map((res, idx) => (
                  <div key={idx} className="mb-4 last:mb-0">
                    <h3 className="font-bold text-blue-600 text-sm mb-2">
                      {res.brandName}
                    </h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {res.devices.map((dev, i) => (
                        <li
                          key={i}
                          className="text-slate-700 text-sm font-medium"
                        >
                          {dev}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  找不到符合 "{searchTerm}" 的裝置，請確認拼寫或查看下方分類。
                </div>
              )}
            </div>
          )}
        </div>

        {/* 1.5 一鍵自動偵測 */}
        <div className="max-w-4xl mx-auto px-6 mt-10">
          <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 mb-2">
                  <BoltIcon className="w-4 h-4" />
                  一鍵自動偵測（Beta）
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1">
                  用瀏覽器資訊幫您快速猜一下裝置
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  點一下即可依瀏覽器回報的裝置資訊自動比對；iOS
                  基於隱私設計不會透露確切機型，最終仍建議以撥打{" "}
                  <span className="font-mono font-bold">*#06#</span>{" "}
                  是否出現 EID 為準。
                </p>
              </div>
              <button
                type="button"
                onClick={handleDetect}
                disabled={detecting}
                className="shrink-0 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold px-6 py-3.5 rounded-full transition-colors"
              >
                {detecting ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    偵測中…
                  </>
                ) : (
                  <>
                    <BoltIcon className="w-5 h-5" />
                    一鍵偵測我的裝置
                  </>
                )}
              </button>
            </div>

            {/* 偵測結果 */}
            {detectResult && !detecting && (
              <div className="mt-6 pt-6 border-t border-blue-100">
                {detectResult.os === "Android" && (
                  <div>
                    <p className="text-sm text-slate-600 mb-3">
                      偵測到裝置：
                      <span className="font-bold text-slate-900 ml-1">
                        {detectResult.friendly || "Android 手機"}
                      </span>
                      {detectResult.raw &&
                        detectResult.raw !== detectResult.friendly && (
                          <span className="text-slate-400 ml-2 text-xs">
                            （機身代碼：{detectResult.raw}）
                          </span>
                        )}
                    </p>
                    {detectMatches && detectMatches.length > 0 ? (
                      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-5 py-4">
                        <p className="font-bold text-emerald-700 mb-1">
                          ✅ 極可能支援 eSIM
                        </p>
                        <p className="text-sm text-emerald-700/80">
                          符合「{detectMatches[0].brandTitle}」清單中的{" "}
                          {detectMatches[0].matches[0]}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-amber-50 border border-amber-100 px-5 py-4">
                        <p className="font-bold text-amber-700 mb-1">
                          ⚠️ 無法自動確認
                        </p>
                        <p className="text-sm text-amber-700/80">
                          您的機型不在自動比對清單中（可能是較舊機型或資料庫尚未收錄），請至下方分類或搜尋框手動確認，或直接撥打{" "}
                          <span className="font-mono font-bold">*#06#</span>
                          查看是否顯示 EID。
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {(detectResult.os === "iOS" ||
                  detectResult.os === "iPadOS") && (
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4">
                    <p className="font-bold text-blue-700 mb-1">
                      偵測到裝置：{detectResult.deviceFamily}
                    </p>
                    <p className="text-sm text-blue-700/80 leading-relaxed">
                      iOS／iPadOS 基於隱私設計，網頁無法讀取確切機型（例如
                      15 或 SE），因此無法自動判定。多數 iPhone XS／XR
                      之後的機型都支援 eSIM，請點下方「
                      {DEVICE_DATA[0].title}」卡片核對您的確切型號，或撥打{" "}
                      <span className="font-mono font-bold">*#06#</span>
                      查看是否顯示 EID 最準確。
                    </p>
                  </div>
                )}

                {(detectResult.os === "Windows" ||
                  detectResult.os === "Mac" ||
                  detectResult.os === "Unknown") && (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4">
                    <p className="font-bold text-slate-700 mb-1">
                      偵測到裝置：{detectResult.deviceFamily}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      您目前似乎是用電腦瀏覽本頁，請改用您實際要安裝
                      eSIM 的手機／平板打開本頁再次偵測，或直接於該裝置撥打{" "}
                      <span className="font-mono font-bold">*#06#</span>
                      確認。
                    </p>
                  </div>
                )}

                <a
                  href="tel:*#06#"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors"
                >
                  <PhoneIcon className="w-4 h-4" />
                  改用手機直接撥打 *#06#（100% 準確）
                </a>

                <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
                  ※ 偵測依據瀏覽器回報的裝置資訊（User-Agent）比對已知型號清單，並非讀取
                  SIM／eSIM 硬體狀態，僅供參考。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Brand Cards Grid */}
        <div className="max-w-5xl mx-auto px-6 mt-16">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-600 rounded-full inline-block"></span>
            選擇您的裝置品牌
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEVICE_DATA.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedBrand(item)}
                className="group relative flex items-center gap-4 bg-white p-6  shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 text-left"
              >
                <div
                  className={`p-3  shadow-inner ${item.color} bg-opacity-90 group-hover:scale-110 transition-transform duration-300`}
                >
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    點擊查看型號列表 →
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Footer / Manual Check Info */}
        <div className="max-w-4xl mx-auto px-6 mt-20">
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="bg-white p-4 rounded-full shadow-sm text-blue-600">
              <span className="text-3xl font-black">?</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                不確定您的手機是否支援？
              </h3>
              <p className="text-slate-600 leading-relaxed">
                最準確的方法是撥打{" "}
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-gray-200 text-slate-900">
                  *#06#
                </span>
              </p>
              <p className="text-slate-600 text-sm mt-1">
                若畫面出現 <strong className="text-blue-600">EID</strong>{" "}
                條碼資訊，代表您的裝置支援 eSIM 功能。
              </p>
            </div>
          </div>
        </div>

        {/* 4. Popup Modal */}
        {selectedBrand && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setSelectedBrand(null)}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-2xl max-h-[85vh]  shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedBrand.color}`}>
                    {selectedBrand.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {selectedBrand.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBrand(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-8 overflow-y-auto custom-scrollbar">
                <ul className="space-y-3">
                  {selectedBrand.devices.map((device, idx) => (
                    <li
                      key={idx}
                      className={`
                        p-4 rounded-xl text-lg font-medium 
                        ${
                          device.includes("注意")
                            ? "bg-amber-50 text-amber-800 text-base border border-amber-100 leading-relaxed"
                            : "bg-gray-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        }
                      `}
                    >
                      {device}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 bg-white text-center">
                <button
                  onClick={() => setSelectedBrand(null)}
                  className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  關閉列表
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
