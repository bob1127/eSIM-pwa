/**
 * 將 MicroeSIM 官方英文字段轉成中文顯示（只翻譯已知樣式，不臆造方案內容）
 */

const COUNTRY = {
  TW: "台灣",
  JP: "日本",
  KR: "韓國",
  HK: "香港",
  SG: "新加坡",
  CN: "中國",
  US: "美國",
  TH: "泰國",
  VN: "越南",
  MY: "馬來西亞",
  PH: "菲律賓",
  ID: "印尼",
  AU: "澳洲",
  GB: "英國",
  FR: "法國",
  DE: "德國",
  IT: "義大利",
  ES: "西班牙",
};

const CARRIER = {
  Chunghwa: "中華電信",
  "Taiwan Mobile": "台灣大哥大",
  FarEasTone: "遠傳電信",
  SoftBank: "SoftBank",
  KDDI: "KDDI",
  Docomo: "Docomo",
  "NTT Docomo": "Docomo",
  SKT: "SKT",
  KT: "KT",
  LGU: "LG U+",
  CMCC: "中國移動",
};

function zhCountry(code) {
  const c = String(code || "").trim().toUpperCase();
  return COUNTRY[c] || c;
}

function zhCarrier(name) {
  const n = String(name || "").trim();
  if (!n) return "";
  if (CARRIER[n]) return CARRIER[n];
  for (const [en, zh] of Object.entries(CARRIER)) {
    if (n.toLowerCase() === en.toLowerCase()) return zh;
  }
  return n;
}

/** Daily2GB / Total10GB / Unlimited → 中文 */
export function formatDataAllowanceZh(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^unlimited$/i.test(s)) return "不限流量";
  const daily = s.match(/^Daily\s*([\d.]+)\s*(GB|MB)$/i);
  if (daily) return `每日 ${daily[1]}${daily[2].toUpperCase()}`;
  const total = s.match(/^Total\s*([\d.]+)\s*(GB|MB)$/i);
  if (total) return `總量 ${total[1]}${total[2].toUpperCase()}`;
  return s
    .replace(/Daily/gi, "每日 ")
    .replace(/Total/gi, "總量 ")
    .replace(/Unlimited/gi, "不限流量")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * special_desc / notes → 中文
 * 例：Daily1GB+10mbps | No ekyc needed. | Data reset... 
 */
export function formatSetupNotesZh(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";

  // 先處理組合句（避免被後續 replace 拆壞）
  s = s.replace(
    /Daily\s*([\d.]+)\s*(GB|MB)\s*\+\s*([\d.]+)\s*(mbps|Mbps)/gi,
    (_m, amt, unit, speed) =>
      `每日約 ${amt}${unit.toUpperCase()} 高速後約 ${speed}Mbps 吃到飽`,
  );
  s = s.replace(
    /Daily([\d.]+)(GB|MB)\+([\d.]+)(mbps|Mbps)/gi,
    (_m, amt, unit, speed) =>
      `每日約 ${amt}${unit.toUpperCase()} 高速後約 ${speed}Mbps 吃到飽`,
  );

  s = s
    .replace(/\|\s*/g, "｜")
    .replace(/No\s*e?kyc\s*needed\.?/gi, "無需實名認證")
    .replace(/e?kyc\s*required\.?/gi, "需實名認證")
    .replace(/Support\s*Tiktok\s*&\s*GPT/gi, "支援 TikTok／ChatGPT")
    .replace(
      /Data\s*reset\s*\(?\s*流量重置\s*\)?\s*00:00\s*Taiwan\s*\(\s*UTC\s*\+?\s*8\s*\)/gi,
      "流量重置：台灣時間 00:00（UTC+8）",
    )
    .replace(
      /Date\s*reset\s*\(?\s*日期重置\s*\)?\s*00:00\s*Taiwan\s*\(\s*UTC\s*\+?\s*8\s*\)/gi,
      "日期重置：台灣時間 00:00（UTC+8）",
    )
    .replace(/Hongkong\s*\/\s*Taiwan/gi, "香港／台灣")
    .replace(/others\s*not\.?/gi, "其他地區通常不需")
    .replace(/Link[：:]\s*/gi, "連結：")
    .replace(/\s*\/\s*/g, "／")
    .replace(/\s*｜\s*/g, "｜")
    .replace(/\s{2,}/g, " ")
    .trim();

  return s;
}

/**
 * TW:Chunghwa[4G;5G]|JP:SoftBank[4G;LTE]| → 台灣：中華電信（4G／5G）
 */
export function formatNetworksZh(raw) {
  const s = String(raw || "")
    .replace(/\|+$/g, "")
    .trim();
  if (!s) return "";

  const parts = s.split("|").map((p) => p.trim()).filter(Boolean);
  const out = [];

  for (const part of parts) {
    const m = part.match(/^([A-Za-z]{2})\s*:\s*(.+)$/);
    if (!m) {
      out.push(part);
      continue;
    }
    const country = zhCountry(m[1]);
    const rest = m[2];
    // SoftBank[4G;LTE;5G],KDDI[4G]
    const carriers = rest.split(",").map((c) => c.trim()).filter(Boolean);
    const zhCarriers = carriers.map((c) => {
      const cm = c.match(/^(.+?)\[([^\]]+)\]$/);
      if (!cm) return zhCarrier(c);
      const name = zhCarrier(cm[1].trim());
      const bands = cm[2]
        .split(";")
        .map((b) => b.trim())
        .filter(Boolean)
        .join("／");
      return bands ? `${name}（${bands}）` : name;
    });
    out.push(`${country}：${zhCarriers.join("、")}`);
  }

  return out.join("；");
}

export function formatExitIpZh(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s
    .split(/[,/|]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => zhCountry(x) || x)
    .join("／");
}

/**
 * 未啟用有效期（validityPeriod）＋使用天數（serviceDays）→ 中文說明行
 * 例：購買後 180 天內須完成安裝；啟用後 8 天有效
 */
export function formatEsimValidityLinesZh({
  validityPeriod = "",
  serviceDays = "",
} = {}) {
  const installDays = String(validityPeriod || "").trim();
  const useDays = String(serviceDays || "").trim();
  const lines = [];
  if (installDays) {
    lines.push(`購買後 ${installDays} 天內須完成安裝（未啟用有效期）`);
  }
  if (useDays) {
    lines.push(`啟用後 ${useDays} 天有效（自開始使用流量起算）`);
  }
  return lines;
}

/** 單行摘要（email／UI 小字） */
export function formatEsimValiditySummaryZh(opts) {
  return formatEsimValidityLinesZh(opts).join("；");
}
