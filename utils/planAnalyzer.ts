// utils/planAnalyzer.ts

export interface PlanAnalysis {
  type: "NATIVE" | "ROAMING" | "ROAMING_PREMIUM" | "UNKNOWN";
  label: string;
  quality: "Premium" | "High" | "Standard";
  tags: string[];
  routingInfo: string;
}

export function analyzePlan(plan: any): PlanAnalysis {
  // 1. 資料清洗：轉小寫以利比對，處理 undefined
  const apn = (plan.apn || "").toLowerCase();
  const ip = (plan.ip || "").toUpperCase(); // 例如 "SG", "HK"
  const operatorName = (plan.operator || "").toLowerCase(); // 有些 API 會有 operator
  const networkStr = (plan.networks || "").toLowerCase();   // "my:digi|my:maxis"
  const locationCodes = (plan.code || "").split(",");       // ["BN", "ID", "MY"]

  // --- 判斷邏輯設定 (你可以隨時回來這裡新增關鍵字) ---
  
  // A. 原生特徵 (Native Hints) — 日／韓／泰／越本地 APN
  const NATIVE_APN_HINTS = [
    "vmobile.jp",
    "au-net",
    "spmode",
    "emov",
    "lte.sktelecom",
    "lguplus",
    "kt.freet",
    "www.dtac",
    "myais",
    "m-wap",
    "m3-world",
    "v-internet",
    "m9-wintel",
  ];
  
  // B. 漫遊特徵 (Roaming Hints) — 勿把一般 internet 當漫遊（泰 Local 常用）
  const ROAMING_APN_HINTS = ["e-ideas", "3gnet", "cmhk", "cmlink", "globaldata", "plus.4g", "drei", "mobile.three.com.hk"];

  // --- 開始判斷 ---

  let type: PlanAnalysis["type"] = "ROAMING"; // 預設悲觀，先當作漫遊
  let label = "標準漫遊";
  let quality: PlanAnalysis["quality"] = "Standard";
  let tags: string[] = [];
  let routingInfo = `${ip} 出口`;

  // 1. 判斷是否為原生 (最高優先級)
  const isNativeApn = NATIVE_APN_HINTS.some(hint => apn.includes(hint));
  // 如果目的地單一，且 IP 等於目的地 (例如去日本 JP，IP 也是 JP)
  const isLocalIp = locationCodes.length === 1 && locationCodes[0] === ip;

  if (isNativeApn || isLocalIp) {
    type = "NATIVE";
    label = "🔥 當地原生極速";
    quality = "Premium";
    routingInfo = "當地直連";
    tags.push("低延遲", "不降速");
  } 
  // 2. 判斷是否為「優質漫遊」(例如新加坡路由)
  else if (ip === "SG") {
    type = "ROAMING_PREMIUM";
    label = "🚀 優質漫遊 (SG)";
    quality = "High";
    routingInfo = "新加坡出口 (低延遲)";
    tags.push("網速穩定");
  }
  // 3. 標記香港漫遊 (市面最常見)
  else if (ip === "HK") {
    routingInfo = "香港出口";
    tags.push("CP值高");
  }

  // 4. 額外特徵：多電信商切換 (如果是漫遊，通常支援多家)
  if (plan.networks && plan.networks.includes("|")) {
    tags.push("訊號自動切換");
  }

  return { type, label, quality, tags, routingInfo };
}