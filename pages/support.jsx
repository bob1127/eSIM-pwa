"use client";
import { useState, useMemo } from "react";
import Layout from "./Layout.js";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  SquaresPlusIcon,
} from "@heroicons/react/24/outline";
import { FaApple, FaGoogle, FaAndroid, FaWindows } from "react-icons/fa"; // 如果沒有安裝 react-icons，可以用 heroicons 替代，或需安裝 npm install react-icons

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
      <div className="min-h-screen bg-slate-50 pb-20 pt-[120px]">
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
            <div className="mt-6 max-w-xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden text-left p-4">
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
                className="group relative flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 text-left"
              >
                <div
                  className={`p-3 rounded-xl shadow-inner ${item.color} bg-opacity-90 group-hover:scale-110 transition-transform duration-300`}
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
            <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
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
