/**
 * eSIM 相容機型清單 — 全站單一資料源
 *
 * 維護週期：每半年更新一次（建議 1 月、7 月檢視並收錄新機）
 * 更新時請同步修改 ESIM_COMPATIBLE_DEVICES_UPDATED_AT
 */

/** ISO 日期：上次人工更新清單 */
export const ESIM_COMPATIBLE_DEVICES_UPDATED_AT = "2026-08-22";

/** 對外說明用 */
export const ESIM_COMPATIBLE_DEVICES_UPDATE_INTERVAL = "每半年";

export const COMPATIBLE_DEVICE_BRANDS = [
  {
    id: "apple",
    title: "支援 eSIM 的蘋果 iPhone",
    devices: [
      "iPhone 17 / 17 Plus / 17 Pro / 17 Pro Max",
      "iPhone 16e",
      "iPhone 16 / 16 Plus / 16 Pro / 16 Pro Max",
      "iPhone 15 / 15 Plus / 15 Pro / 15 Pro Max",
      "iPhone 14 / 14 Plus / 14 Pro / 14 Pro Max",
      "iPhone 13 / 13 Mini / 13 Pro / 13 Pro Max",
      "iPhone 12 / 12 Mini / 12 Pro / 12 Pro Max",
      "iPhone 11 / 11 Pro / 11 Pro Max",
      "iPhone XS / XS Max / XR",
      "iPhone SE (2020 第2代 / 2022 第3代)",
      "注意：中國大陸、香港、澳門版實體雙卡 iPhone 多數不支援 eSIM（部分 mini / SE / XS 除外）",
    ],
  },
  {
    id: "pixel",
    title: "Google Pixel 支援 eSIM 的手機",
    devices: [
      "Google Pixel 10 / 10 Pro / 10 Pro XL / 10 Pro Fold",
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
    devices: [
      "Galaxy S25 / S25+ / S25 Ultra",
      "Galaxy S24 / S24+ / S24 Ultra / S24 FE",
      "Galaxy S23 / S23+ / S23 Ultra / S23 FE",
      "Galaxy S22 / S22+ / S22 Ultra",
      "Galaxy S21 / S21+ / S21 Ultra",
      "Galaxy S20 / S20+ / S20 Ultra",
      "Galaxy Z Fold 7 / Flip 7",
      "Galaxy Z Fold 6 / Flip 6",
      "Galaxy Z Fold 5 / Flip 5",
      "Galaxy Z Fold 4 / Flip 4",
      "Galaxy Z Fold 3 / Flip 3",
      "Galaxy Note 20 / Note 20 Ultra",
      "注意：台灣版三星 S23 系列（含）以前多數不支援 eSIM，請撥打 *#06# 確認是否有 EID",
    ],
  },
  {
    id: "ipad",
    title: "相容 eSIM 的 iPad (Wi-Fi + 行動網路)",
    devices: [
      "iPad Pro 13 吋 (M4 / M5)",
      "iPad Pro 11 吋 (M4 / M5)",
      "iPad Pro 12.9 吋 (第3代～第6代)",
      "iPad Pro 11 吋 (第1代～第4代)",
      "iPad Air (第3代～第7代 / M2 / M3)",
      "iPad (第7代～第11代)",
      "iPad mini (第5代～第7代)",
      "注意：僅 Wi-Fi + Cellular 版本支援，純 Wi-Fi 版不支援",
    ],
  },
  {
    id: "windows",
    title: "eSIM 支援的 Windows 10/11 筆記型電腦",
    devices: [
      "Microsoft Surface Pro 11 / Pro 10 / Pro 9 (5G) / Pro X",
      "Microsoft Surface Go 4 (LTE) / Go 3 (LTE) / Go 2 (LTE)",
      "Lenovo ThinkPad X1 Carbon Gen 12 / X1 Titanium Yoga 5G",
      "Dell Latitude 7450 / 7440 / 7340",
      "HP EliteBook 840 G11 / Spectre x360",
      "Acer Swift Go / Swift 7",
      "需確認裝置內建 LTE/5G 模組且標示支援 eSIM",
    ],
  },
  {
    id: "others",
    title: "其他支援 eSIM 的手機裝置",
    devices: [
      "Sony Xperia 1 VI / 1 V / 10 VI / 10 V / 5 VI / 5 V",
      "Oppo Find X8 / X7 / Find N5 / N3 Flip",
      "Xiaomi 15 / 15 Pro / 14 / 14 Pro / 13T Pro / 12T Pro",
      "Sharp Aquos R9 pro / R8 pro / sense9 / sense8",
      "Motorola Razr 50 / Edge 50 / Razr 40 Ultra",
      "Huawei P40 / P40 Pro / Mate 40 Pro",
      "Nokia G60 5G / X30 5G",
    ],
  },
];

/** 三星 UA 機身代碼 → 行銷名稱（供 support 頁自動偵測） */
export const SAMSUNG_MODEL_MAP = [
  { prefix: "SM-S938", label: "Galaxy S25 Ultra" },
  { prefix: "SM-S936", label: "Galaxy S25+" },
  { prefix: "SM-S931", label: "Galaxy S25" },
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
  { prefix: "SM-F968", label: "Galaxy Z Fold7" },
  { prefix: "SM-F751", label: "Galaxy Z Flip7" },
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

export function formatCompatibilityLastUpdated(dateStr = ESIM_COMPATIBLE_DEVICES_UPDATED_AT) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("zh-TW", { year: "numeric", month: "long" });
}

export function getCompatibilityUpdateNotice() {
  return `機型清單${ESIM_COMPATIBLE_DEVICES_UPDATE_INTERVAL}更新（上次：${formatCompatibilityLastUpdated()}）。新機上市後若未收錄，請以撥打 *#06# 是否顯示 EID 為準。`;
}

/** 商品頁 modal 用：{ category, items }[] */
export function getCompatibleDeviceCategories() {
  return COMPATIBLE_DEVICE_BRANDS.map(({ title, devices }) => ({
    category: title,
    items: devices,
  }));
}

export function isDeviceNoteLine(line) {
  return String(line || "").trim().startsWith("注意");
}

export function findCompatibleDeviceMatches(term) {
  if (!term) return [];
  const t = term.toLowerCase();
  const results = [];
  for (const brand of COMPATIBLE_DEVICE_BRANDS) {
    const matches = brand.devices.filter(
      (d) => !isDeviceNoteLine(d) && d.toLowerCase().includes(t),
    );
    if (matches.length) {
      results.push({ brandTitle: brand.title, matches });
    }
  }
  return results;
}
