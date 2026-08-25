import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { getClientPlatformFxRates } from "@/lib/esim/platformFx";
import { useProductAdmin } from "@/hooks/useProductAdmin";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

const PLATFORM_FX = getClientPlatformFxRates();

/**
 * 將 location / code 正規化成 ISO token 列表。
 * 例："CN,HK,MO" → ["CN","HK","MO"]；"Hong Kong" → ["HK"]
 */
function normalizeLocationTokens(raw: string): string[] {
  const s = String(raw || "")
    .toUpperCase()
    .trim();
  if (!s) return [];

  return s
    .split(/[,;/|]+/)
    .map((part) => {
      const t = part.trim().replace(/\s+/g, " ");
      if (!t) return "";
      if (/^(HK|HKG|HONG KONG)$/.test(t)) return "HK";
      if (/^(MO|MACAU|MACAO)$/.test(t)) return "MO";
      if (/^(TW|TWN|TAIWAN)$/.test(t)) return "TW";
      if (/^(JP|JPN|JAPAN)$/.test(t)) return "JP";
      if (/^(KR|KOR|KOREA|SOUTH KOREA)$/.test(t)) return "KR";
      if (/^(TH|THA|THAILAND)$/.test(t)) return "TH";
      if (/^(CN|CHN|CHINA|MAINLAND CHINA)$/.test(t)) return "CN";
      if (/^(SG|SGP|SINGAPORE)$/.test(t)) return "SG";
      if (/^(MY|MYS|MALAYSIA)$/.test(t)) return "MY";
      if (/^(VN|VNM|VIETNAM)$/.test(t)) return "VN";
      if (/^(ID|IDN|INDONESIA)$/.test(t)) return "ID";
      if (/^(AU|AUS|AUSTRALIA)$/.test(t)) return "AU";
      if (/^(NZ|NZL|NEW ZEALAND)$/.test(t)) return "NZ";
      if (/^(EG|EGY|EGYPT)$/.test(t)) return "EG";
      if (/^(TR|TUR|TURKEY|TURKIYE)$/.test(t)) return "TR";
      if (
        /^(AE|ARE|UAE|UNITED ARAB EMIRATES|DUBAI|DXB|ABU DHABI|ABUDHABI)$/.test(
          t,
        )
      )
        return "AE";
      if (/^(US|USA|UNITEDSTATES|UNITED STATES|AMERICA)$/.test(t)) return "US";
      if (/^(CA|CAN|CANADA)$/.test(t)) return "CA";
      if (/^(MX|MEX|MEXICO)$/.test(t)) return "MX";
      if (/^(PE|PER|PERU)$/.test(t)) return "PE";
      if (/^(CL|CHL|CHILE)$/.test(t)) return "CL";
      if (/^(AR|ARG|ARGENTINA)$/.test(t)) return "AR";
      if (/^(BR|BRA|BRAZIL|BRASIL)$/.test(t)) return "BR";
      if (/^(FR|FRA|FRANCE)$/.test(t)) return "FR";
      if (/^(IT|ITA|ITALY)$/.test(t)) return "IT";
      if (
        /^(GB|GBR|UK|UNITEDKINGDOM|UNITED KINGDOM|UNITED-KINGDOM|BRITAIN|GREAT BRITAIN|ENGLAND)$/.test(
          t,
        )
      )
        return "GB";
      if (/^(DE|DEU|GERMANY)$/.test(t)) return "DE";
      if (/^(AT|AUT|AUSTRIA)$/.test(t)) return "AT";
      if (/^(CH|CHE|SWITZERLAND)$/.test(t)) return "CH";
      if (/^(PL|POL|POLAND)$/.test(t)) return "PL";
      if (/^(BE|BEL|BELGIUM)$/.test(t)) return "BE";
      if (/^(IE|IRL|IRELAND)$/.test(t)) return "IE";
      if (/^(ES|ESP|SPAIN)$/.test(t)) return "ES";
      if (/^(NL|NLD|NETHERLANDS|HOLLAND)$/.test(t)) return "NL";
      if (/^(CZ|CZE|CZECH|CZECHIA|CZECH REPUBLIC)$/.test(t)) return "CZ";
      return t.replace(/\s+/g, "");
    })
    .filter(Boolean);
}

function sameTokenSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((t) => setB.has(t));
}

function normalizeAliasCodes(codes: string[] = []): string[] {
  return codes
    .map((c) => normalizeLocationTokens(c)[0] || String(c).toUpperCase().trim())
    .filter(Boolean);
}

type CountryConfig = {
  emoji: string;
  name: string;
  /** 純單國：location 只能是該國一碼 */
  pure?: boolean;
  codes: string[];
  /** 多國：location token 集合需完全相符（順序不拘） */
  locationSet?: string[];
  locationSets?: string[][];
  /**
   * 高 CP／涵蓋型：location 含任一 covers 碼即命中
   * coversMultiOnly=true 時需至少 2 國（排除純單國）
   */
  covers?: string[];
  coversMultiOnly?: boolean;
  /** 名稱前綴／關鍵字命中時，一併納入的區域碼（如 ASIA） */
  includeRegionCodes?: string[];
  /**
   * 純單國：location 只能是該國一碼
   * 多個純單國聯集（如留學生專案：美日澳英加韓）
   */
  matchPureCountries?: string[];
  /**
   * 與 matchPureCountries 併用：額外允許的精確 location 集合
   * （如高天數納入美加 ["US","CA"]）
   */
  matchLocationSets?: string[][];
  /** 選中時預設天數篩選：ALL | SHORT | MID | LONG | XLONG | XXLONG */
  defaultDayRange?: "ALL" | "SHORT" | "MID" | "LONG" | "XLONG" | "XXLONG";
  /** 選中時預設依成本由低到高 */
  defaultSortByCost?: boolean;
  /** 只掃方案名稱／SKU（禁止掃整包 JSON，避免 Hong Kong Time 誤傷） */
  keywords?: string[];
  /** 名稱前綴備援（僅 pure 且 location 空白時；networkCodes 篩選也會用） */
  namePrefixes?: string[];
  /** SKU／名稱包含即納入（在 exclude 之前，避免 Europe-43 被 EUROPE 誤殺） */
  includeSkuIncludes?: string[];
  /**
   * 電信 networks 含「XX:」國碼即命中（歐洲多國包涵蓋波蘭／瑞士等）
   */
  networkCodes?: string[];
  exclude?: string[];
  order?: number;
};

// --- 1. 國家設定檔 ---
const COUNTRIES: Record<string, CountryConfig> = {
  /**
   * 高天數方案：純單國（美日澳英加韓）＋美加跨國
   * 預設篩「特長 60天+」，天數由長到短。
   * 主力：韓／英吃到飽 90、加／美加每日 90、美總量 FUP 60。
   */
  HIGH_DAY: {
    emoji: "📅",
    name: "高天數方案 (60天+ 主力)",
    pure: false,
    codes: ["HIGH_DAY", "LONG_STAY"],
    matchPureCountries: ["US", "JP", "AU", "GB", "CA", "KR"],
    matchLocationSets: [["US", "CA"]],
    namePrefixes: [
      "USA-",
      "USA ",
      "United States-",
      "United States ",
      "United States of America-",
      "America-",
      "US,CA-",
      "US,CA ",
      "US&Canada-",
      "US&Canada ",
      "USA&Canada-",
      "USA&Canada ",
      "Japan-",
      "Japan ",
      "Japan(",
      "Australia-",
      "Australia ",
      "Australia(",
      "UK-",
      "UK ",
      "United Kingdom-",
      "United Kingdom ",
      "United-Kingdom-",
      "United-Kingdom ",
      "UnitedKingdom-",
      "Britain-",
      "Great Britain-",
      "England-",
      "Canada-",
      "Canada ",
      "Korea-",
      "Korea ",
      "Korea(",
      "South Korea-",
      "South Korea ",
      "South Korea(",
    ],
    includeSkuIncludes: [
      "United States of America-",
      "United States-",
      "USA-",
      "US,CA-",
      "US&Canada-",
      "USA&Canada-",
      "Japan-",
      "Japan(",
      "Australia-",
      "United Kingdom-",
      "United-Kingdom-",
      "UK-",
      "Canada-",
      "South Korea-",
      "South Korea(",
      "Korea-",
    ],
    exclude: [
      "GLOBAL",
      "WORLD",
      "ASIA",
      "EUROPE",
      "EU ",
      "MEXICO",
      "美加墨",
      "北美",
      "US,CA,MX",
      "USA,CA,MX",
      "JAPAN/KOREA",
      "JAPAN&KOREA",
      "JAPAN-KOREA",
      "JAPAN KOREA",
      "日韓",
      "AU,NZ",
      "AU&NZ",
      "NEW ZEALAND",
      "紐澳",
      "澳紐",
    ],
    defaultDayRange: "XXLONG",
  },
  /**
   * 留學生專案：美國／日本／澳洲／英國／加拿大／韓國（純單國）
   * 預設篩「超長期 30天+」。美加跨國請改選「高天數方案」。
   */
  STUDENT: {
    emoji: "🎓",
    name: "留學生專案 (美日澳英加韓)",
    pure: false,
    codes: ["STUDENT", "STUDY_ABROAD"],
    matchPureCountries: ["US", "JP", "AU", "GB", "CA", "KR"],
    namePrefixes: [
      "USA-",
      "USA ",
      "United States-",
      "United States ",
      "United States of America-",
      "America-",
      "Japan-",
      "Japan ",
      "Japan(",
      "Australia-",
      "Australia ",
      "Australia(",
      "UK-",
      "UK ",
      "United Kingdom-",
      "United Kingdom ",
      "United-Kingdom-",
      "United-Kingdom ",
      "UnitedKingdom-",
      "Britain-",
      "Great Britain-",
      "England-",
      "Canada-",
      "Canada ",
      "Korea-",
      "Korea ",
      "Korea(",
      "South Korea-",
      "South Korea ",
      "South Korea(",
    ],
    includeSkuIncludes: [
      "United States of America-",
      "United States-",
      "USA-",
      "Japan-",
      "Japan(",
      "Australia-",
      "United Kingdom-",
      "United-Kingdom-",
      "UK-",
      "Canada-",
      "South Korea-",
      "South Korea(",
      "Korea-",
    ],
    // 排除全球／區域包與跨國組合（美加、日韓、紐澳另選）
    exclude: [
      "GLOBAL",
      "WORLD",
      "ASIA",
      "EUROPE",
      "EU ",
      "MEXICO",
      "美加墨",
      "北美",
      "USA&CANADA",
      "USA-CANADA",
      "US&CANADA",
      "US-CANADA",
      "US,CA",
      "USA,CA",
      "JAPAN/KOREA",
      "JAPAN&KOREA",
      "JAPAN-KOREA",
      "JAPAN KOREA",
      "日韓",
      "AU,NZ",
      "AU&NZ",
      "NEW ZEALAND",
      "紐澳",
      "澳紐",
    ],
    defaultDayRange: "XLONG",
  },
  JP: {
    emoji: "🇯🇵",
    name: "日本 (純日)",
    pure: true,
    codes: ["JP", "JPN", "JAPAN"],
    namePrefixes: ["Japan-", "Japan ", "Japan("],
    keywords: [],
    exclude: ["ASIA", "GLOBAL", "WORLD", "EUROPE", "Japan/Korea", "Japan Korea"],
  },
  KR: {
    emoji: "🇰🇷",
    name: "韓國 (純韓)",
    pure: true,
    codes: ["KR", "KOR", "KOREA"],
    namePrefixes: ["Korea-", "Korea ", "Korea(", "South Korea"],
    keywords: [],
    exclude: ["ASIA", "GLOBAL", "WORLD", "Japan/Korea", "Japan Korea"],
  },
  TH: {
    emoji: "🇹🇭",
    name: "泰國 (純泰)",
    pure: true,
    codes: ["TH", "THA", "THAILAND"],
    namePrefixes: ["Thailand-", "Thailand ", "Thailand("],
    keywords: [],
    exclude: ["ASIA", "GLOBAL", "Singapore", "Malaysia"],
  },
  TH_CP: {
    emoji: "💎",
    name: "高CP泰國 (多國)",
    pure: false,
    codes: ["TH_CP", "TH_VALUE"],
    /** 涵蓋泰國的多國包（星馬泰、亞太多國等），通常比純泰成本低 */
    covers: ["TH"],
    coversMultiOnly: true,
    includeRegionCodes: ["ASIA", "ASIA11", "ASIA24", "SEA"],
    locationSets: [
      ["SG", "MY", "TH"],
      ["TH", "MY", "SG"],
      ["SG", "TH"],
      ["MY", "TH"],
      ["TH", "VN"],
      ["TH", "ID"],
    ],
    keywords: [
      "Singapore&Malaysia&Thailand",
      "Singapore-Malaysia-Thailand",
      "Singapore/Malaysia/Thailand",
      "Singapore Malaysia Thailand",
      "Malaysia&Thailand",
      "Malaysia-Thailand",
      "Singapore&Thailand",
      "Singapore-Thailand",
      "星馬泰",
      "新馬泰",
      "東南亞",
      "ASIA",
      "Asia ",
      "SEA ",
    ],
    defaultSortByCost: true,
    exclude: ["GLOBAL", "EUROPE", "EU ", "WORLD"],
  },
  /**
   * 批發目錄沒有 Thailand-*-unlimited 的獨立 DTAC 單國品項（純泰吃到飽僅 TRUE／Truemove）。
   * 改抓新馬泰多國 unlimited，供選品比價（泰段 networks 多為 TRUE；非 Medusa 上架）。
   */
  TH_UNLIMITED_MULTI: {
    emoji: "🇹🇭📶",
    name: "泰國吃到飽 (新馬泰多國)",
    pure: false,
    defaultSortByCost: true,
    codes: ["TH_UNLIMITED_MULTI", "TH_DTAC_MULTI"],
    includeSkuIncludes: [
      "Singapore&Malaysia&Thailand -unlimited",
      "Singapore&Malaysia&Thailand-unlimited",
      "Singapore-Malaysia-Thailand-unlimited",
      "Singapore/Malaysia/Thailand-unlimited",
    ],
    exclude: ["GLOBAL", "EUROPE", "EU ", "WORLD", "ASIA"],
  },
  CN: {
    emoji: "🇨🇳",
    name: "中國 (純陸)",
    pure: true,
    codes: ["CN", "CHN", "CHINA"],
    namePrefixes: ["China-", "China ", "China(", "China,"],
    keywords: [],
    // 名稱含港澳／大中華包的不要進純陸
    exclude: ["ASIA", "GLOBAL", "HK", "MACAU", "MACAO", "HONG KONG", "CNHKMO", "CHMT"],
  },
  HK: {
    emoji: "🇭🇰",
    name: "香港 (純港)",
    pure: true,
    codes: ["HK", "HKG", "HONG KONG"],
    namePrefixes: ["Hong Kong-", "Hong Kong ", "Hong Kong("],
    keywords: [],
    exclude: ["ASIA", "GLOBAL", "CHINA", "CNHKMO", "MACAU", "MACAO", ",MO", "MO)"],
  },
  SG: {
    emoji: "🇸🇬",
    name: "新加坡 (純星)",
    pure: true,
    codes: ["SG", "SGP", "SINGAPORE"],
    namePrefixes: ["Singapore-", "Singapore ", "Singapore("],
    keywords: [],
    exclude: ["ASIA", "GLOBAL", "Malaysia", "Thailand"],
  },
  MY: {
    emoji: "🇲🇾",
    name: "馬來西亞 (純馬)",
    pure: true,
    codes: ["MY", "MYS", "MALAYSIA"],
    namePrefixes: ["Malaysia-", "Malaysia ", "Malaysia("],
    keywords: [],
    exclude: ["ASIA", "GLOBAL", "Singapore"],
  },
  VN: {
    emoji: "🇻🇳",
    name: "越南 (純越)",
    pure: true,
    codes: ["VN", "VNM", "VIETNAM"],
    namePrefixes: ["Vietnam-", "Vietnam ", "Vietnam("],
    keywords: [],
    exclude: ["ASIA", "GLOBAL"],
  },
  TW: {
    emoji: "🇹🇼",
    name: "台灣 (純台)",
    pure: true,
    codes: ["TW", "TWN", "TAIWAN"],
    namePrefixes: ["Taiwan-", "Taiwan ", "Taiwan(", "Taiwan（"],
    keywords: [],
    // 排除大中華／亞洲／全球包（純台只抓 location=TW）
    exclude: [
      "ASIA",
      "GLOBAL",
      "WORLD",
      "EUROPE",
      "CHMT",
      "GREATER CHINA",
      "CNHKMO",
      "CHINA",
      "HONG KONG",
    ],
  },
  ID: {
    emoji: "🇮🇩",
    name: "印尼 (純印)",
    pure: true,
    codes: ["ID", "IDN", "INDONESIA"],
    namePrefixes: ["Indonesia-", "Indonesia ", "Indonesia("],
    keywords: [],
    exclude: ["ASIA", "GLOBAL"],
  },
  IN: {
    emoji: "🇮🇳",
    name: "印度 (純度)",
    pure: true,
    codes: ["IN", "IND", "INDIA"],
    namePrefixes: ["India-", "India ", "India("],
    keywords: [],
    exclude: ["ASIA", "GLOBAL"],
  },
  JP_KR: {
    emoji: "🇯🇵🇰🇷",
    name: "日韓通用",
    pure: false,
    codes: ["JP_KR", "KR_JP"],
    locationSet: ["JP", "KR"],
    keywords: [
      "Japan Korea",
      "Japan/Korea",
      "Japan&Korea",
      "Japan-Korea",
      "Korea/Japan",
      "Korea&Japan",
      "日韓",
    ],
    exclude: ["ASIA", "GLOBAL"],
  },
  SMT: {
    emoji: "🏖️",
    name: "新馬泰 (星馬泰)",
    pure: false,
    codes: ["SMT", "SG_MY_TH", "TH_SG_MY"],
    locationSet: ["SG", "MY", "TH"],
    keywords: [
      "Singapore&Malaysia&Thailand",
      "Singapore-Malaysia-Thailand",
      "Singapore/Malaysia/Thailand",
      "新馬泰",
      "星馬泰",
    ],
    exclude: ["ASIA", "GLOBAL"],
  },
  AU: {
    emoji: "🇦🇺",
    name: "澳洲 (純澳)",
    pure: true,
    codes: ["AU", "AUS", "AUSTRALIA"],
    namePrefixes: ["Australia-", "Australia "],
    keywords: [],
    exclude: ["ASIA", "GLOBAL", "NEW ZEALAND", "AU,NZ", "紐澳", "澳紐"],
  },
  NZ: {
    emoji: "🇳🇿",
    name: "紐西蘭 (純紐)",
    pure: true,
    codes: ["NZ", "NZL", "NEW ZEALAND"],
    namePrefixes: ["New Zealand-", "New Zealand ", "NewZealand-", "NZ-"],
    keywords: [],
    exclude: ["ASIA", "GLOBAL", "AUSTRALIA", "AU,NZ", "紐澳", "澳紐"],
  },
  ANZ: {
    emoji: "🇦🇺🇳🇿",
    name: "紐澳 (澳洲+紐西蘭)",
    pure: false,
    codes: ["ANZ", "AU_NZ", "AU-NZ"],
    locationSet: ["AU", "NZ"],
    keywords: [
      "AU,NZ(T+C)",
      "AU,NZ-",
      "Australia&New Zealand",
      "Australia-New Zealand",
      "Australia/New Zealand",
      "Australia & New Zealand",
      "紐澳",
      "澳紐",
    ],
    exclude: ["ASIA", "GLOBAL"],
  },
  CN_HK_MO: {
    emoji: "🐲",
    name: "中港澳",
    pure: false,
    codes: ["CN_HK_MO"],
    // location 精確三碼；名稱關鍵字備援
    locationSet: ["CN", "HK", "MO"],
    keywords: [
      "CNHKMO-",
      "CN,HK,MO(T+C)",
      "CN,HK,MO-",
      "China&Hong Kong&Macau",
      "China,Hongkong,Macao",
      "China&HK&Macau",
      "中港澳",
    ],
    // 排除含台灣的 Greater China(CHMT)、亞洲包、純港／純陸
    exclude: ["ASIA", "CHMT", "GREATER CHINA", ",TW", "TW)", "GLOBAL"],
  },
  ASIA: {
    emoji: "🌏",
    name: "亞洲多國 (Asia)",
    pure: false,
    codes: ["ASIA", "ASIA11", "ASIA24"],
    keywords: ["ASIA", "Asia "],
    exclude: ["GLOBAL", "EUROPE"],
  },
  US: {
    emoji: "🇺🇸",
    name: "美國 (純美)",
    pure: true,
    codes: ["US", "USA", "UNITED STATES"],
    namePrefixes: [
      "USA-",
      "USA ",
      "United States-",
      "United States ",
      "America-",
    ],
    keywords: [],
    exclude: ["GLOBAL", "EUROPE", "ASIA", "CANADA", "MEXICO"],
  },
  /**
   * MicroeSIM「美國本土」：Verizon(+T-Mobile)
   * - Total FUP：United States of America-Total30/60GB-*、60 天 United States-Total*GB-60-*
   * - 無限流量（圖二）：United States of America-unlimited-*-A0（典型 8–20Mbps）
   * 不含外島（波多黎各／關島等）與美加／北美組合
   */
  US_MAINLAND: {
    emoji: "🗽",
    name: "美國本土 (FUP吃到飽)",
    pure: false,
    codes: ["US_MAINLAND"],
    keywords: [
      "United States of America-Total30GB",
      "United States of America-Total60GB",
      "United States of America-unlimited",
      "United States-Total30GB-60",
      "United States-Total60GB-60",
    ],
    exclude: [
      "GLOBAL",
      "EUROPE",
      "ASIA",
      "CANADA",
      "MEXICO",
      "HAWAII",
      "GUAM",
      "PUERTO",
    ],
  },
  CA: {
    emoji: "🇨🇦",
    name: "加拿大 (純加)",
    pure: true,
    codes: ["CA", "CAN", "CANADA"],
    namePrefixes: ["Canada-", "Canada "],
    keywords: [],
    exclude: ["GLOBAL", "EUROPE", "ASIA", "USA", "UNITED STATES"],
  },
  FR: {
    emoji: "🇫🇷",
    name: "法國 (含歐包)",
    pure: false,
    codes: ["FR", "FRA", "FRANCE"],
    networkCodes: ["FR"],
    namePrefixes: ["France-", "France ", "France("],
    keywords: [],
    exclude: ["GLOBAL", "WORLD", "ASIA"],
  },
  IT: {
    emoji: "🇮🇹",
    name: "義大利 (含歐包)",
    pure: false,
    codes: ["IT", "ITA", "ITALY"],
    networkCodes: ["IT"],
    namePrefixes: ["Italy-", "Italy ", "Italy("],
    keywords: [],
    exclude: ["GLOBAL", "WORLD", "ASIA"],
  },
  GB: {
    emoji: "🇬🇧",
    name: "英國 (含歐43)",
    pure: true,
    codes: ["GB", "GBR", "UK", "UNITED KINGDOM", "UNITED-KINGDOM", "BRITAIN"],
    namePrefixes: [
      "UK-",
      "UK ",
      "United Kingdom-",
      "United Kingdom ",
      "United-Kingdom-",
      "United-Kingdom ",
      "UnitedKingdom-",
      "Britain-",
      "Great Britain-",
      "England-",
      "Europe-43-",
      "Europe-43-countries-",
      "Europe-34-",
      "Europe-34-countries-",
      "EU-36-",
      "EU-36 ",
    ],
    includeSkuIncludes: [
      "Europe-43-",
      "Europe-43-countries",
      "Europe 43",
      "43-countries",
      "43 countries",
      "Europe-34-",
      "Europe-34-countries",
      "Europe 34",
      "34-countries",
      "34 countries",
      "EU-36-",
      "EU-36-unlimited",
      "EU 36",
    ],
    keywords: [
      "UNITED-KINGDOM",
      "UNITED KINGDOM",
      "Europe-43-countries",
      "Europe-34-countries",
      "EU-36",
    ],
    exclude: ["GLOBAL", "ASIA"],
  },
  /**
   * 批發目錄沒有 United-Kingdom-unlimited-*（官網那檔 8–20Mbps）。
   * 吃到飽改抓：歐包 Europe-43-countries-unlimited-*（含英國）＋若之後上架的單國 unlimited。
   */
  GB_UNLIMITED: {
    emoji: "🇬🇧",
    name: "英國吃到飽 (歐包無限)",
    pure: false,
    defaultSortByCost: true,
    codes: ["GB_UNLIMITED"],
    includeSkuIncludes: [
      "Europe-43-countries-unlimited",
      "Europe 43 countries unlimited",
      "Europe-34-countries-unlimited",
      "Europe 34 countries unlimited",
      "EU-36-unlimited",
      "EU 36 unlimited",
      "United-Kingdom-unlimited",
      "United Kingdom-unlimited",
    ],
    exclude: ["GLOBAL", "ASIA"],
  },
  DE: {
    emoji: "🇩🇪",
    name: "德國 (純德)",
    pure: true,
    codes: ["DE", "DEU", "GERMANY"],
    namePrefixes: ["Germany-", "Germany "],
    keywords: [],
    exclude: ["GLOBAL", "EUROPE", "EU ", "ASIA"],
  },
  AT: {
    emoji: "🇦🇹",
    name: "奧地利 (含歐包)",
    pure: false,
    codes: ["AT", "AUT", "AUSTRIA"],
    networkCodes: ["AT"],
    namePrefixes: ["Austria-", "Austria ", "Austria(", "Österreich-"],
    keywords: [],
    exclude: ["GLOBAL", "WORLD", "ASIA"],
  },
  CH: {
    emoji: "🇨🇭",
    name: "瑞士 (含歐包)",
    pure: false,
    codes: ["CH", "CHE", "SWITZERLAND"],
    networkCodes: ["CH"],
    namePrefixes: ["Switzerland-", "Switzerland ", "Swiss-"],
    keywords: [],
    exclude: ["GLOBAL", "WORLD", "ASIA"],
  },
  PL: {
    emoji: "🇵🇱",
    name: "波蘭 (含歐包)",
    pure: false,
    codes: ["PL", "POL", "POLAND"],
    networkCodes: ["PL"],
    namePrefixes: ["Poland-", "Poland ", "Poland(", "Polska-"],
    keywords: [],
    exclude: ["GLOBAL", "WORLD", "ASIA"],
  },
  BE: {
    emoji: "🇧🇪",
    name: "比利時 (含歐包)",
    pure: false,
    codes: ["BE", "BEL", "BELGIUM"],
    networkCodes: ["BE"],
    namePrefixes: ["Belgium-", "Belgium ", "Belgium(", "Belgique-"],
    keywords: [],
    exclude: ["GLOBAL", "WORLD", "ASIA"],
  },
  IE: {
    emoji: "🇮🇪",
    name: "愛爾蘭 (含歐包)",
    pure: false,
    codes: ["IE", "IRL", "IRELAND"],
    networkCodes: ["IE"],
    namePrefixes: ["Ireland-", "Ireland ", "Ireland(", "Eire-"],
    keywords: [],
    exclude: ["GLOBAL", "WORLD", "ASIA"],
  },
  ES: {
    emoji: "🇪🇸",
    name: "西班牙 (含歐包)",
    pure: false,
    codes: ["ES", "ESP", "SPAIN"],
    networkCodes: ["ES"],
    namePrefixes: ["Spain-", "Spain ", "Spain("],
    keywords: [],
    exclude: ["GLOBAL", "WORLD", "ASIA"],
  },
  NL: {
    emoji: "🇳🇱",
    name: "荷蘭 (純荷)",
    pure: true,
    codes: ["NL", "NLD", "NETHERLANDS"],
    namePrefixes: ["Netherlands-", "Netherlands ", "Holland-"],
    keywords: [],
    exclude: ["GLOBAL", "EUROPE", "EU ", "ASIA"],
  },
  CZ: {
    emoji: "🇨🇿",
    name: "捷克 (純捷)",
    pure: true,
    codes: ["CZ", "CZE", "CZECH"],
    namePrefixes: ["Czech-", "Czech ", "Czechia-"],
    keywords: [],
    exclude: ["GLOBAL", "EUROPE", "EU ", "ASIA"],
  },
  EG: {
    emoji: "🇪🇬",
    name: "埃及 (純埃)",
    pure: true,
    codes: ["EG", "EGY", "EGYPT"],
    namePrefixes: ["Egypt-", "Egypt "],
    keywords: [],
    exclude: ["GLOBAL", "EUROPE", "EU ", "ASIA", "AFRICA", "MIDDLE EAST"],
  },
  TR: {
    emoji: "🇹🇷",
    name: "土耳其 (純土)",
    pure: true,
    codes: ["TR", "TUR", "TURKEY", "TURKIYE"],
    namePrefixes: ["Turkey-", "Turkey ", "Turkiye-", "Türkiye-"],
    keywords: [],
    exclude: ["GLOBAL", "EUROPE", "EU ", "ASIA", "MIDDLE EAST"],
  },
  AE: {
    emoji: "🇦🇪",
    name: "阿拉伯聯合大公國 (杜拜／阿布達比)",
    pure: true,
    codes: [
      "AE",
      "ARE",
      "UAE",
      "UNITED ARAB EMIRATES",
      "DUBAI",
      "DXB",
      "ABU DHABI",
      "ABUDHABI",
    ],
    namePrefixes: [
      "UAE-",
      "UAE ",
      "UAE(",
      "United Arab",
      "Dubai-",
      "Dubai ",
      "Abu Dhabi-",
      "Abu Dhabi ",
      "Abudhabi-",
      "阿聯",
      "杜拜-",
      "杜拜 ",
      "迪拜-",
      "阿布達比",
      "阿布扎比",
    ],
    keywords: [],
    exclude: ["GLOBAL", "EUROPE", "EU ", "ASIA", "MEA", "MIDDLE EAST"],
  },
  US_CA: {
    emoji: "🇺🇸🇨🇦",
    name: "美加 (純數據)",
    pure: false,
    codes: ["US_CA", "USA_CA"],
    locationSet: ["US", "CA"],
    keywords: [
      "USA&Canada",
      "USA-Canada",
      "USA/Canada",
      "US&Canada",
      "US-Canada",
      "United States&Canada",
      "美加",
    ],
    // 不含墨西哥／門號方案（那些走北美）
    exclude: ["GLOBAL", "EUROPE", "ASIA", "MEXICO", "墨西哥", "北美"],
  },
  US_CA_MX: {
    emoji: "🌎",
    name: "北美 (美加墨)",
    pure: false,
    codes: ["US_CA_MX", "NA", "NORTH_AMERICA"],
    locationSet: ["US", "CA", "MX"],
    locationSets: [
      ["US", "CA", "MX"],
      ["US", "MX", "CA"],
    ],
    keywords: [
      "USA&Canada&Mexico",
      "US&Canada&Mexico",
      "USA-Canada-Mexico",
      "US-Canada-Mexico",
      "United States&Canada&Mexico",
      "North America",
      "NorthAmerica",
      "北美",
      "美加墨",
      "美國加拿大墨西哥",
      "ATT US NUMBER",
      "AT&T 美國號碼",
      "美國號碼",
    ],
    exclude: ["GLOBAL", "EUROPE", "ASIA"],
  },
  PE: {
    emoji: "🇵🇪",
    name: "秘魯 (含南美包)",
    pure: false,
    codes: ["PE", "PER", "PERU"],
    networkCodes: ["PE"],
    namePrefixes: ["Peru-", "Peru ", "Peru(", "Perú-"],
    keywords: [],
    exclude: ["GLOBAL", "WORLD", "ASIA", "EUROPE", "EU "],
  },
  CL: {
    emoji: "🇨🇱",
    name: "智利 (含南美包)",
    pure: false,
    codes: ["CL", "CHL", "CHILE"],
    networkCodes: ["CL"],
    namePrefixes: ["Chile-", "Chile ", "Chile("],
    keywords: [],
    exclude: ["GLOBAL", "WORLD", "ASIA", "EUROPE", "EU "],
  },
  AR: {
    emoji: "🇦🇷",
    name: "阿根廷 (含南美包)",
    pure: false,
    codes: ["AR", "ARG", "ARGENTINA"],
    networkCodes: ["AR"],
    namePrefixes: ["Argentina-", "Argentina ", "Argentina("],
    keywords: [],
    exclude: ["GLOBAL", "WORLD", "ASIA", "EUROPE", "EU "],
  },
  BR: {
    emoji: "🇧🇷",
    name: "巴西 (含南美包)",
    pure: false,
    codes: ["BR", "BRA", "BRAZIL", "BRASIL"],
    networkCodes: ["BR"],
    namePrefixes: ["Brazil-", "Brazil ", "Brazil(", "Brasil-", "Brasil "],
    keywords: [],
    exclude: ["GLOBAL", "WORLD", "ASIA", "EUROPE", "EU "],
  },
  EU: {
    emoji: "🇪🇺",
    name: "歐洲多國 (EU)",
    pure: false,
    codes: ["EU", "EUROPE", "EU33", "EU42"],
    keywords: ["Europe", "EU 33", "EU 42", "EU 3", "歐洲"],
    exclude: ["GLOBAL", "ASIA"],
  },
  GLOBAL: {
    emoji: "🌍",
    name: "全球/歐美",
    pure: false,
    codes: ["GLOBAL"],
    keywords: ["GLOBAL", "WORLD", "Global "],
    exclude: [],
  },
};

function escapeRegExp(s: string) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripPlanText(s: string) {
  return String(s || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toUpperCase();
}

function compactSkuHay(s: string) {
  return stripPlanText(s).replace(/[\s_-]+/g, "");
}

function hayIncludesSku(hay: string, needle: string) {
  const n = stripPlanText(needle);
  if (!n) return false;
  const h = stripPlanText(hay);
  if (h.includes(n)) return true;
  const nc = compactSkuHay(n);
  return nc.length >= 5 && compactSkuHay(h).includes(nc);
}

function classifyPlanType(p: {
  name?: string;
  channel_dataplan_name?: string;
  location?: string;
  rule_desc?: string;
}) {
  // 只看 SKU／名稱：rule_desc 常寫「unlimited 128kbps」（每日額度後降速），
  // 若拿來分類會把 Daily* 全部誤判成吃到飽。
  const n = [p.name, p.channel_dataplan_name, p.location]
    .map((x) => String(x || "").toLowerCase())
    .join(" ");
  if (n.includes("daily")) return "DAILY";
  if (n.includes("unlimited")) return "UNLIMITED";
  if (n.includes("total")) return "TOTAL";
  return "OTHER";
}

/**
 * MicroeSIM 的 location 常是 SKU（United-Kingdom-Total20GB-30-B0），不是 GB。
 * 取出 SKU 開頭國名，再正規化成 ISO。
 */
function skuCountryTokens(raw: string): string[] {
  const s = stripPlanText(raw);
  if (!s) return [];
  const m = s.match(
    /^([A-Z][A-Z0-9]*(?:[- ][A-Z][A-Z0-9]*)*?)(?=-(?:TOTAL|DAILY|UNLIMITED|\d)|$)/,
  );
  const slug = (m ? m[1] : s).replace(/\s+/g, "-");
  // 多國 SKU：France&Germany- / US&Canada-
  if (slug.includes("&")) {
    return slug
      .split("&")
      .flatMap((part) => normalizeLocationTokens(part.replace(/-/g, " ")));
  }
  return normalizeLocationTokens(slug.replace(/-/g, " "));
}

function planFieldTexts(p: {
  name?: string;
  channel_dataplan_name?: string;
  code?: string;
  location?: string;
}) {
  return [
    p.name,
    p.channel_dataplan_name,
    p.location,
    p.code,
  ].map((x) => stripPlanText(String(x || "")));
}

function matchesNamePrefixes(
  fields: string[],
  prefixes?: string[],
): boolean {
  if (!prefixes?.length) return false;
  return prefixes.some((prefix) => {
    const pre = stripPlanText(prefix);
    if (!pre) return false;
    return fields.some((f) => f.startsWith(pre));
  });
}

/** 方案是否符合選中的國家／區域（純單國＝location 精確單碼） */
function planMatchesCountry(
  p: {
    name?: string;
    channel_dataplan_name?: string;
    code?: string;
    location?: string;
    networks?: string;
    operator?: string;
  },
  config: CountryConfig,
): boolean {
  const fields = planFieldTexts(p);
  const pName = fields[0] || fields[1];
  const pLocRaw = String(p.location || p.code || "");
  const tokensFromLoc = normalizeLocationTokens(pLocRaw);
  const skuTokenSets = fields
    .map((f) => skuCountryTokens(f))
    .filter((t) => t.length > 0);
  const tokensFromSku =
    skuTokenSets.find((t) => new Set(t).size === 1) || skuTokenSets[0] || [];
  const tokens =
    tokensFromLoc.length > 0 && !/-TOTAL|-DAILY|-UNLIMITED/i.test(pLocRaw)
      ? tokensFromLoc
      : tokensFromSku.length
        ? tokensFromSku
        : tokensFromLoc;
  const hayForExclude = fields.join(" ");

  const prefixHit = matchesNamePrefixes(fields, config.namePrefixes);
  const aliases = normalizeAliasCodes(config.codes);
  const uniqueTokens = Array.from(new Set(tokens));
  const uniqueIsThisCountry =
    uniqueTokens.length === 1 && aliases.includes(uniqueTokens[0]);

  const extraSkuHit = (config.includeSkuIncludes || []).some((s) =>
    hayIncludesSku(hayForExclude, s),
  );

  // ── 多純單國聯集（留學生／高天數）＋可選跨國 locationSets ──
  if (config.matchPureCountries?.length || config.matchLocationSets?.length) {
    const want = new Set(
      normalizeAliasCodes(config.matchPureCountries || []),
    );
    if (want.has("GB") || want.has("UK")) {
      want.add("GB");
      want.add("UK");
    }
    if (want.has("US") || want.has("USA")) {
      want.add("US");
      want.add("USA");
    }
    const pureHit =
      want.size > 0 &&
      uniqueTokens.length === 1 &&
      want.has(uniqueTokens[0]);
    const extraSets: string[][] = [];
    if (config.locationSet?.length) {
      extraSets.push(normalizeAliasCodes(config.locationSet));
    }
    for (const set of config.matchLocationSets || []) {
      extraSets.push(normalizeAliasCodes(set));
    }
    for (const set of config.locationSets || []) {
      extraSets.push(normalizeAliasCodes(set));
    }
    const setHit = extraSets.some(
      (set) =>
        sameTokenSet(uniqueTokens, set) || sameTokenSet(tokens, set),
    );
    if (pureHit || setHit || prefixHit || extraSkuHit) {
      if (config.exclude?.length) {
        const hitEx = config.exclude.some((ex) =>
          hayForExclude.includes(String(ex).toUpperCase()),
        );
        if (hitEx) return false;
      }
      return true;
    }
    return false;
  }

  // 單國 SKU 或加掛 SKU（Europe-43 / Europe 43 countries）— exclude 之前就過
  if (uniqueIsThisCountry || prefixHit || extraSkuHit) {
    if (config.pure) return true;
  }
  if (extraSkuHit && !config.pure) return true;

  if (config.exclude?.length) {
    const hit = config.exclude.some((ex) =>
      hayForExclude.includes(String(ex).toUpperCase()),
    );
    if (hit) return false;
  }

  // ── 電信 networks 含指定國碼（歐洲包涵蓋波蘭／瑞士等）──
  if (config.networkCodes?.length) {
    const nets = String(p.networks || p.operator || "").toUpperCase();
    const hitNet = config.networkCodes.some((code) => {
      const c = escapeRegExp(String(code).toUpperCase().trim());
      return c.length > 0 && new RegExp(`(?:^|\\|)${c}:`).test(nets);
    });
    if (hitNet) return true;
  }

  // ── 純單國：location 只能是該國一碼（UK,GB 視為同一國）──
  if (config.pure) {
    return false;
  }

  // ── 涵蓋型（高 CP）：location 含目標國，且為多國／區域包 ──
  if (config.covers?.length) {
    const need = normalizeAliasCodes(config.covers);
    const hasCover = need.some((c) => tokens.includes(c));
    const multiOk = !config.coversMultiOnly || tokens.length >= 2;
    if (hasCover && multiOk) return true;

    // 區域碼：ASIA / SEA 等（通常含泰國）
    if (config.includeRegionCodes?.length) {
      const regions = normalizeAliasCodes(config.includeRegionCodes);
      if (tokens.some((t) => regions.includes(t))) return true;
      // 名稱／SKU 標 ASIA 且與泰國／東南亞相關
      if (
        regions.some((r) => pName.includes(r) || pLocRaw.toUpperCase().includes(r)) &&
        /THAILAND|\bTH\b|泰國|星馬泰|新馬泰|東南亞|ASIA|SEA/.test(hayForExclude)
      ) {
        return true;
      }
    }
  }

  // ── 多國／區域：location token 集合完全相符 ──
  const sets: string[][] = [];
  if (config.locationSet?.length) {
    sets.push(normalizeAliasCodes(config.locationSet));
  }
  for (const set of config.locationSets || []) {
    sets.push(normalizeAliasCodes(set));
  }
  if (sets.some((set) => sameTokenSet(tokens, set))) return true;

  // 名稱關鍵字（只掃 name／SKU，不掃整包 JSON）
  if (config.keywords?.length) {
    const hitKeywords = config.keywords.filter((k) =>
      hayIncludesSku(hayForExclude, k) || hayIncludesSku(pName, k),
    );
    if (!hitKeywords.length) return false;

    // 涵蓋型（高 CP）：明確多國關鍵字直接過；ASIA／SEA 需再確認與泰國有關
    if (config.covers?.length) {
      const loose = /^(ASIA|SEA\s?|東南亞|ASIA\s)/i;
      const hasSpecific = hitKeywords.some((k) => !loose.test(String(k).trim()));
      if (hasSpecific) return true;
      const regionTokens = normalizeAliasCodes(config.includeRegionCodes || []);
      const thRelated =
        tokens.includes("TH") ||
        regionTokens.some((r) => tokens.includes(r)) ||
        /THAILAND|\bTH\b|泰國|星馬泰|新馬泰|東南亞/.test(hayForExclude);
      return thRelated;
    }

    // 精確多國 set：名稱命中但 location 已標其他組合 → 擋下
    if (config.locationSet?.length && tokens.length > 0) {
      const want = normalizeAliasCodes(config.locationSet);
      if (!sameTokenSet(tokens, want)) return false;
    }
    return true;
  }

  if (!config.pure && config.namePrefixes?.length) {
    if (
      config.namePrefixes.some((prefix) =>
        pName.startsWith(String(prefix).toUpperCase()),
      )
    ) {
      return true;
    }
  }

  return false;
}

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
    // MicroeSIM Total = 高速額度用完後降速無限（FUP 吃到飽）
    return match
      ? `高速 ${match[1].toUpperCase()} 後 FUP吃到飽 · ${day}天`
      : `總量型 FUP吃到飽 · ${day}天`;
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

type EkycStatus = "none" | "required" | "unknown";

/**
 * 實名／eKYC：只信 API 備註明文（special_desc / speed_desc / rule_desc）。
 * 後台沒寫就不猜——例如 Taiwan-Daily*-A1 只寫 Support Tiktok & GPT，算「未標」。
 */
function parseEkycStatus(p: any): {
  ekycStatus: EkycStatus;
  ekycLabel: string;
  ekycClass: string;
  ekycTitle: string;
} {
  const notes = [
    p.speed_desc,
    p.special_desc,
    p.rule_desc,
    p.tags,
    p.remark,
    p.note,
    p.desc,
  ]
    .map((x) => String(x || ""))
    .join(" ");

  const noHit =
    /no\s*e-?kyc|no ekyc|無需\s*e-?kyc|不需\s*e-?kyc|無需.*實名|不需.*實名|not\s*(require|needed).*e-?kyc|ekyc not (required|needed)|no real[- ]?name/i.test(
      notes,
    );
  const yesHit =
    /e-?kyc required|require[ds]?\s*e-?kyc|實名認[證証]|real[- ]?name authentication|ekyc required/i.test(
      notes,
    ) && !noHit;

  if (noHit) {
    return {
      ekycStatus: "none",
      ekycLabel: "🪪 無需實名",
      ekycClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      ekycTitle: notes.slice(0, 180) || "API 備註：No ekyc needed",
    };
  }
  if (yesHit) {
    return {
      ekycStatus: "required",
      ekycLabel: "⚠️ 需實名",
      ekycClass: "bg-red-50 text-red-700 border border-red-200 font-bold",
      ekycTitle: notes.slice(0, 180) || "API 備註：ekyc required",
    };
  }

  return {
    ekycStatus: "unknown",
    ekycLabel: "❓ 實名未標",
    ekycClass: "bg-gray-50 text-gray-500 border border-gray-200",
    ekycTitle: notes.trim()
      ? `API 未標實名。備註：${notes.slice(0, 140)}`
      : "API 備註未標示是否需實名認證",
  };
}

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

  // IP & App Support（原生：日／韓／泰／越／馬）
  let isNative = false;
  let ipRegion = "當地 IP";

  const networksBlob = String(p.networks || p.operator || "").toLowerCase();
  const planNameRaw = String(
    p.name || p.channel_dataplan_name || p.sku || "",
  );
  const isLocalNamed = /\blocal\b/i.test(planNameRaw);

  // 優先用 ip 欄位，避免 networks 等字串誤判成 gateway
  const ipField = String(p.ip || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (/^([A-Z]{2})(,[A-Z]{2})*$/.test(ipField)) {
    rawGateway = ipField;
  }

  const NATIVE_REGION_RULES: Array<{
    code: string;
    label: string;
    apnHints: string[];
    netHints: string[];
    /** 韓／泰／越／馬：需 Local 名稱（或極明確本地 APN）；日本可僅靠 APN／電信 */
    requireLocalName: boolean;
  }> = [
    {
      code: "JP",
      label: "🇯🇵 日本原生 IP",
      apnHints: [".jp", "au-net", "vmobile.jp"],
      netHints: ["docomo", "kddi", "iij"],
      requireLocalName: false,
    },
    {
      code: "KR",
      label: "🇰🇷 韓國原生 IP",
      apnHints: ["lte.sktelecom", "lguplus", "internet.lguplus", "ktfreetel"],
      netHints: ["skt", "kt[", "lgu"],
      requireLocalName: true,
    },
    {
      code: "TH",
      label: "🇹🇭 泰國原生 IP",
      apnHints: ["www.dtac", "myais"],
      netHints: ["true", "ture", "ais", "dtac"],
      requireLocalName: true,
    },
    {
      code: "VN",
      label: "🇻🇳 越南原生 IP",
      apnHints: ["m-wap", "m3-world", "v-internet", "m9-wintel"],
      netHints: ["viettel", "mobifone", "vinaphone", "wintel"],
      requireLocalName: true,
    },
    {
      code: "MY",
      label: "🇲🇾 馬來西亞原生 IP",
      apnHints: ["my3g"],
      netHints: ["umobile", "u mobile"],
      requireLocalName: true,
    },
  ];

  const matchNativeRule = (rule: (typeof NATIVE_REGION_RULES)[number]) => {
    if (isRoamingAPN) return false;
    const apnHit = rule.apnHints.some((h) => apn.includes(h));
    const netHit = rule.netHints.some((h) => networksBlob.includes(h));
    const gwHit = rawGateway === rule.code;

    if (rule.requireLocalName) {
      // 韓／泰／越／馬：名稱含 Local + 當地單一 IP（且非漫遊 APN）
      if (gwHit && isLocalNamed) return true;
      // 無 Local 字樣但 APN 極明確本地時也接受（如 UMobile my3g + MY IP）
      if (gwHit && apnHit) return true;
      if (gwHit && netHit && rule.code === "MY") return true;
      return false;
    }

    // 日本：當地 IP + 本地 APN／Docomo·KDDI·IIJ（不含純 SoftBank 漫遊感）
    if (gwHit && (apnHit || netHit)) return true;
    if (!rawGateway && apnHit) return true;
    return false;
  };

  if (rawGateway) {
    const gws = rawGateway.split(",").map((g) => {
      if (g === "HK") return "🇭🇰 香港";
      if (g === "SG") return "🇸🇬 新加坡";
      if (g === "JP") return "🇯🇵 日本";
      if (g === "KR") return "🇰🇷 韓國";
      if (g === "TH") return "🇹🇭 泰國";
      if (g === "VN") return "🇻🇳 越南";
      if (g === "MY") return "🇲🇾 馬來西亞";
      if (g === "ID") return "🇮🇩 印尼";
      if (g === "IN") return "🇮🇳 印度";
      return g;
    });

    const hit = NATIVE_REGION_RULES.find((rule) => matchNativeRule(rule));
    if (hit) {
      isNative = true;
      ipRegion = hit.label;
    } else {
      isNative = false;
      const isSingleLocal = /^[A-Z]{2}$/.test(rawGateway);
      ipRegion =
        gws.join("/") +
        (isSingleLocal && !isRoamingAPN ? " IP" : isSingleLocal ? " 漫遊 IP" : " IP");
    }
  } else {
    if (isRoamingAPN) {
      isNative = false;
      if (apn.includes("3gnet")) ipRegion = "🇭🇰/🇸🇬 混合 IP";
      else ipRegion = "🇭🇰 香港 IP (漫遊)";
    } else {
      const hit = NATIVE_REGION_RULES.find((rule) => matchNativeRule(rule));
      if (hit) {
        isNative = true;
        ipRegion = hit.label;
      }
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

  const ekyc = parseEkycStatus(p);

  return {
    isNative,
    carrier,
    carrierBadge,
    isTrueUnlimited,
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
    ...ekyc,
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
  // 這頁會攤開供應商成本、方案 ID 與利潤設定，只有管理者能看；
  // 真正的把關在 /api/esim/list（lib/esimCatalogGuard.js），這裡只是不做無謂請求。
  const { isAdmin, adminChecked, authHeaders } = useProductAdmin();
  const [rawPlans, setRawPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedCountry, setSelectedCountry] = useState("JP");
  const [filterName, setFilterName] = useState("ALL");
  const [filterCarrier, setFilterCarrier] = useState("ALL");
  const [filterIP, setFilterIP] = useState("ALL");
  const [filterDayRange, setFilterDayRange] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  /** ALL | TRUE_UNLIMITED */
  const [filterThrottle, setFilterThrottle] = useState("ALL");
  /** ALL | NO_EKYC | EKYC_REQUIRED | UNKNOWN */
  const [filterEkyc, setFilterEkyc] = useState("ALL");

  type SortKey = "PRICE" | "DAY" | "DATA";
  interface SortConfig {
    key: SortKey;
    order: "ASC" | "DESC";
  }
  const [sortStack, setSortStack] = useState<SortConfig[]>([
    { key: "PRICE", order: "ASC" },
  ]);

  const [baseCurrency, setBaseCurrency] = useState("HKD");
  /** platform = 與夥伴底價同一套；market = 即時市價對照 */
  const [fxMode, setFxMode] = useState<"platform" | "market">("platform");
  const [marketRates, setMarketRates] = useState<{ USD: number; HKD: number } | null>(null);
  const exchangeRates =
    fxMode === "market" && marketRates ? marketRates : PLATFORM_FX;
  const [savedPlanIds, setSavedPlanIds] = useState<string[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  /** 建議售價利潤％（漫遊／原生分開，對成本加成；即官網動態售價） */
  const [profitPercent, setProfitPercent] = useState(45);
  const [nativeProfitPercent, setNativeProfitPercent] = useState(60);
  const [customProfitInput, setCustomProfitInput] = useState("45");
  /**
   * 專屬折扣碼連結：只設「給夥伴的成本加成點數」
   * 售價＝官網建議售價（漫遊/原生利潤）；你自動拿＝該方案利潤％ − 夥伴％
   * 固定九折（預設 10%）會從「總利潤％」先扣掉，再按原比例分給夥伴／你
   * 例：總利潤 60%、夥伴 30%、九折 → 剩餘 50% → 夥伴／你各 25%
   */
  const [partnerRatePercent, setPartnerRatePercent] = useState(20);
  /** 專屬折扣碼固定折抵％（九折＝10）；與商品頁自訂優惠互斥、不可疊加 */
  const [partnerDiscountPercent, setPartnerDiscountPercent] = useState(10);

  useEffect(() => {
    const saved = localStorage.getItem("savedPlans");
    if (saved) setSavedPlanIds(JSON.parse(saved));
    const savedFx = localStorage.getItem("esimSelectionFxMode");
    if (savedFx === "market" || savedFx === "platform") setFxMode(savedFx);
    const savedProfit = localStorage.getItem("esimSelectionProfitPercent");
    const savedNative = localStorage.getItem("esimSelectionNativeProfitPercent");
    const savedPartner = localStorage.getItem("esimSelectionPartnerRate");
    const savedDiscount = localStorage.getItem("esimSelectionPartnerDiscount");
    if (savedProfit) {
      const n = Number(savedProfit);
      if (!Number.isNaN(n) && n > 0) {
        setProfitPercent(n);
        setCustomProfitInput(String(n));
      }
    }
    if (savedNative) {
      const n = Number(savedNative);
      if (!Number.isNaN(n) && n > 0) setNativeProfitPercent(n);
    }
    if (savedPartner) {
      const n = Number(savedPartner);
      if (!Number.isNaN(n) && n >= 0 && n <= 500) setPartnerRatePercent(n);
    }
    if (savedDiscount) {
      const n = Number(savedDiscount);
      if (!Number.isNaN(n) && n >= 0 && n <= 50) setPartnerDiscountPercent(n);
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("savedPlans", JSON.stringify(savedPlanIds));
  }, [savedPlanIds]);

  const applyProfitPercent = (value: number) => {
    if (Number.isNaN(value) || value <= 0 || value > 500) return;
    const rounded = Math.round(value * 10) / 10;
    setProfitPercent(rounded);
    setCustomProfitInput(String(rounded));
    localStorage.setItem("esimSelectionProfitPercent", String(rounded));
  };

  const applyNativeProfitPercent = (value: number) => {
    if (Number.isNaN(value) || value <= 0 || value > 500) return;
    const rounded = Math.round(value * 10) / 10;
    setNativeProfitPercent(rounded);
    localStorage.setItem(
      "esimSelectionNativeProfitPercent",
      String(rounded),
    );
  };

  const applyPartnerRatePercent = (value: number) => {
    if (Number.isNaN(value) || value < 0 || value > 500) return;
    const rounded = Math.round(value * 10) / 10;
    setPartnerRatePercent(rounded);
    localStorage.setItem("esimSelectionPartnerRate", String(rounded));
  };

  const applyPartnerDiscountPercent = (value: number) => {
    if (Number.isNaN(value) || value < 0 || value > 50) return;
    const rounded = Math.round(value * 10) / 10;
    setPartnerDiscountPercent(rounded);
    localStorage.setItem("esimSelectionPartnerDiscount", String(rounded));
  };
  const toggleSavePlan = (id: string) => {
    setSavedPlanIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  };
  const fetchMarketRates = async () => {
    try {
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/TWD");
      const data = await res.json();
      setMarketRates({ USD: 1 / data.rates.USD, HKD: 1 / data.rates.HKD });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (fxMode === "market" && !marketRates) fetchMarketRates();
  }, [fxMode, marketRates]);

  const setFxModePersist = (mode: "platform" | "market") => {
    setFxMode(mode);
    localStorage.setItem("esimSelectionFxMode", mode);
  };
  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/esim/list", {
        credentials: "include",
        headers: { ...(authHeaders as Record<string, string>) },
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      setRawPlans(data.result || []);
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminChecked) return;
    if (!isAdmin) {
      setRawPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminChecked, isAdmin, authHeaders]);

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
        return planMatchesCountry(p, config);
      })
      .map((p) => {
        const details = parsePlanDetails(p, config);
        const simpleDesc = getSimpleDesc(p.name, p.day);
        const dataValue = parseDataValue(p.name);

        let planCategory = classifyPlanType(p);

        const rawPrice = parseFloat(p.price || 0);
        const rate =
          baseCurrency === "USD" ? exchangeRates.USD : exchangeRates.HKD;
        const costTWD = Math.ceil(rawPrice * rate);

        const percent = details.isNative ? nativeProfitPercent : profitPercent;
        const margin = 1 + percent / 100;
        const profitRate = `${percent}%`;
        const suggestedPrice = Math.ceil((costTWD * margin) / 10) * 10 - 1;
        const grossProfit = suggestedPrice - costTWD;
        // 標價分潤（無折扣）：夥伴／你拆「成本加成點數」
        const partnerSharePct = partnerRatePercent;
        const ownerSharePct = Math.round((percent - partnerSharePct) * 10) / 10;
        const splitOk = partnerSharePct <= percent;
        const partnerProfitRaw = Math.round(
          (costTWD * partnerSharePct) / 100,
        );
        const partnerProfit = splitOk
          ? Math.min(partnerProfitRaw, Math.max(0, grossProfit))
          : partnerProfitRaw;
        const ownerProfit = grossProfit - partnerProfit;

        // 專屬折扣碼固定折抵（預設九折）：先從總利潤％扣折扣％，再按原比例分
        // 例：60% 利潤、夥伴 30%、折扣 10% → 剩餘 50% → 夥伴／你各 25%
        const discountPct = Math.min(50, Math.max(0, partnerDiscountPercent));
        const paidPrice = Math.max(
          costTWD,
          Math.round(suggestedPrice * (1 - discountPct / 100)),
        );
        const remainingMarginPct = Math.max(
          0,
          Math.round((percent - discountPct) * 10) / 10,
        );
        const partnerEffPct =
          percent > 0
            ? Math.round(
                ((partnerSharePct * remainingMarginPct) / percent) * 10,
              ) / 10
            : 0;
        const ownerEffPct =
          Math.round((remainingMarginPct - partnerEffPct) * 10) / 10;
        const paidGross = Math.max(0, paidPrice - costTWD);
        const partnerProfitDisc =
          percent > 0
            ? Math.round((paidGross * partnerSharePct) / percent)
            : 0;
        const ownerProfitDisc = paidGross - partnerProfitDisc;

        return {
          ...p,
          ...details,
          simpleDesc,
          planCategory,
          dataValue,
          costTWD,
          profitRate,
          markupPercent: percent,
          suggestedPrice,
          grossProfit,
          partnerSharePct,
          ownerSharePct,
          partnerProfit,
          ownerProfit,
          splitOk,
          discountPct,
          paidPrice,
          remainingMarginPct,
          partnerEffPct,
          ownerEffPct,
          partnerProfitDisc,
          ownerProfitDisc,
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
    profitPercent,
    nativeProfitPercent,
    partnerRatePercent,
    partnerDiscountPercent,
  ]);

  const uniqueCarriers = useMemo(() => {
    const carriers = new Set(baseProcessedPlans.map((p) => p.carrier));
    return Array.from(carriers).sort();
  }, [baseProcessedPlans]);

  const uniquePlanNames = useMemo(() => {
    const names = new Set(baseProcessedPlans.map((p) => p.name));
    return Array.from(names).sort();
  }, [baseProcessedPlans]);

  const ekycCounts = useMemo(() => {
    let none = 0;
    let required = 0;
    let unknown = 0;
    for (const p of baseProcessedPlans) {
      if (p.ekycStatus === "none") none += 1;
      else if (p.ekycStatus === "required") required += 1;
      else unknown += 1;
    }
    return { none, required, unknown, all: baseProcessedPlans.length };
  }, [baseProcessedPlans]);

  const trueUnlimitedCount = useMemo(
    () => baseProcessedPlans.filter((p) => p.isTrueUnlimited).length,
    [baseProcessedPlans],
  );

  useEffect(() => {
    setFilterName("ALL");
    setFilterCarrier("ALL");
    setFilterType("ALL");
    setFilterThrottle("ALL");
    setFilterEkyc("ALL");
    const cfg = COUNTRIES[selectedCountry];
    if (cfg?.defaultDayRange) {
      setFilterDayRange(cfg.defaultDayRange);
    } else {
      setFilterDayRange("ALL");
    }
    if (cfg?.defaultSortByCost) {
      setSortStack([{ key: "PRICE", order: "ASC" }]);
    } else if (
      cfg?.defaultDayRange === "XLONG" ||
      cfg?.defaultDayRange === "XXLONG"
    ) {
      // 高天數／留學生：先看天數由長到短
      setSortStack([{ key: "DAY", order: "DESC" }]);
    } else {
      setSortStack([{ key: "PRICE", order: "ASC" }]);
    }
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
      if (filterDayRange === "XLONG")
        result = result.filter((p) => p.dayInt >= 30);
      if (filterDayRange === "XXLONG")
        result = result.filter((p) => p.dayInt >= 60);
      if (filterType === "DAILY")
        result = result.filter((p) => p.planCategory === "DAILY");
      if (filterType === "TOTAL")
        result = result.filter((p) => p.planCategory === "TOTAL");
      if (filterType === "UNLIMITED")
        result = result.filter((p) => p.planCategory === "UNLIMITED");
      if (filterThrottle === "TRUE_UNLIMITED")
        result = result.filter((p) => p.isTrueUnlimited);
      if (filterEkyc === "NO_EKYC")
        result = result.filter((p) => p.ekycStatus === "none");
      if (filterEkyc === "EKYC_REQUIRED")
        result = result.filter((p) => p.ekycStatus === "required");
      if (filterEkyc === "UNKNOWN")
        result = result.filter((p) => p.ekycStatus === "unknown");
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
    filterThrottle,
    filterEkyc,
    sortStack,
    showSavedOnly,
  ]);

  const noIndex = (
    <Head>
      <title>選品工具</title>
      <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
    </Head>
  );

  if (!adminChecked)
    return (
      <>
        {noIndex}
        <div className="p-10 text-center font-bold text-gray-500">
          驗證權限中...
        </div>
      </>
    );

  if (!isAdmin)
    return (
      <>
        {noIndex}
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🔒</div>
            <h1 className="text-lg font-bold text-gray-800 mb-2">
              內部工具｜需要管理者權限
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              此頁包含供應商成本與方案資料，僅限管理者帳號存取。
            </p>
            <Link
              href="/login"
              className="inline-block px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold"
            >
              前往登入
            </Link>
          </div>
        </div>
      </>
    );

  if (loading)
    return (
      <>
        {noIndex}
        <div className="p-10">
          <LoadingIndicator
            layout="center"
            label="掃描中..."
            labelClassName="font-bold text-gray-500"
          />
        </div>
      </>
    );
  if (errorMsg)
    return (
      <>
        {noIndex}
        <div className="p-10 text-center text-red-500">錯誤: {errorMsg}</div>
      </>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-sm pb-32">
      {noIndex}
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-800">
            eSIM 選品神器 (Pro版)
          </h1>
          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all shadow-sm ${showSavedOnly ? "bg-red-500 text-white shadow-red-200" : "bg-white text-stone-900 border hover:bg-gray-50"}`}
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
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {fxMode === "platform" ? "平台匯率" : "市價匯率"}：1 USD ≈{" "}
              {exchangeRates.USD.toFixed(1)} TWD | 1 HKD ≈{" "}
              {exchangeRates.HKD.toFixed(1)} TWD
            </span>
            <div className="flex rounded-md overflow-hidden border border-slate-500">
              <button
                type="button"
                onClick={() => setFxModePersist("platform")}
                className={`px-2 py-0.5 text-[11px] font-bold ${
                  fxMode === "platform"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                平台（夥伴底價）
              </button>
              <button
                type="button"
                onClick={() => setFxModePersist("market")}
                className={`px-2 py-0.5 text-[11px] font-bold ${
                  fxMode === "market"
                    ? "bg-sky-500 text-white"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                市價對照
              </button>
            </div>
            <span className="text-emerald-300">
              官網售價：漫遊 {profitPercent}% · 原生 {nativeProfitPercent}%
            </span>
            <span className="text-violet-300">
              專屬折扣碼 · 夥伴 {partnerRatePercent}%
              {partnerDiscountPercent > 0
                ? ` · 固定 −${partnerDiscountPercent}%`
                : ""}{" "}
              → 漫遊我留{" "}
              {Math.round((profitPercent - partnerRatePercent) * 10) / 10}% ·
              原生我留{" "}
              {Math.round((nativeProfitPercent - partnerRatePercent) * 10) / 10}%
            </span>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6 space-y-4">
          {/* 第一排：基礎篩選 */}
          <div className="flex flex-wrap gap-4 items-center">
            {!showSavedOnly && (
              <div className="flex flex-col gap-1">
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
                {selectedCountry === "HIGH_DAY" && (
                  <p className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 max-w-lg">
                    高天數：純單國（美日澳英加韓）＋美加。預設「特長
                    60天+」、天數由長到短。主力含韓／英吃到飽
                    90、加／美加每日 90、美總量 FUP 60。日／澳最長多半
                    30 天→請改篩「超長期 30天+」才看得到。
                  </p>
                )}
                {selectedCountry === "STUDENT" && (
                  <p className="text-xs text-violet-900 bg-violet-50 border border-violet-200 rounded-md px-2 py-1 max-w-lg">
                    留學生專案：僅美／日／澳／英／加／韓純單國（不含美加）。預設「超長期
                    30天+」。要美加 90 天請改選「📅 高天數方案」。
                  </p>
                )}
                {selectedCountry === "TH_CP" && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 max-w-md">
                    抓取涵蓋泰國的多國／星馬泰／亞太方案，預設依成本由低到高（通常比純泰更省）
                  </p>
                )}
                {selectedCountry === "TH" && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 max-w-md">
                    純泰吃到飽目錄無獨立 DTAC 單國品項（多為 TRUE／Truemove）。要比新馬泰多國
                    unlimited，請改選「🇹🇭📶 泰國吃到飽 (新馬泰多國)」
                  </p>
                )}
                {selectedCountry === "TH_UNLIMITED_MULTI" && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 max-w-md">
                    單國無 DTAC 吃到飽 → 改抓 Singapore&amp;Malaysia&amp;Thailand-unlimited（新馬泰一卡）。請再篩「♾️
                    吃到飽」；預設依成本排序比 CP。泰段電信多為 TRUE 網。
                  </p>
                )}
                {selectedCountry === "GB" && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 max-w-md">
                    含純英 Total，以及歐包 Europe-43／Europe-34／EU-36（Daily、Total、unlimited）。吃到飽請篩「♾️
                    吃到飽」；EU-36-A0 通常比 43 國 B0 更省
                  </p>
                )}
                {selectedCountry === "GB_UNLIMITED" && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 max-w-md">
                    吃到飽：Europe-43-unlimited（B0）、Europe-34-unlimited（B0）、EU-36-unlimited（A0，多為
                    8–20Mbps、成本較低）。請依成本排序比 CP
                  </p>
                )}
                {!!COUNTRIES[selectedCountry]?.networkCodes?.length && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 max-w-md">
                    抓電信 networks 含該國的多國包；若有單國 SKU 也會一併列出（不含全球包）
                  </p>
                )}
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

            <div className="flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-bold text-emerald-800 whitespace-nowrap">
                💰 漫遊利潤:
              </span>
              {[30, 35, 40, 45, 50, 55, 60].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyProfitPercent(pct)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    profitPercent === pct
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {pct}%
                </button>
              ))}
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="number"
                  min={1}
                  max={500}
                  step={1}
                  value={customProfitInput}
                  onChange={(e) => setCustomProfitInput(e.target.value)}
                  onBlur={() => applyProfitPercent(Number(customProfitInput))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyProfitPercent(Number(customProfitInput));
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-14 border border-emerald-300 rounded-md px-2 py-1 text-xs font-bold text-emerald-900 bg-white outline-none focus:ring-2 focus:ring-emerald-400"
                  aria-label="自訂漫遊利潤百分比"
                />
                <span className="text-xs font-bold text-emerald-700">%</span>
              </div>
              <div className="flex items-center gap-1 border-l border-emerald-200 pl-2 ml-1">
                <span className="text-[10px] font-bold text-emerald-700 whitespace-nowrap">
                  原生
                </span>
                {[50, 55, 60].map((pct) => (
                  <button
                    key={`native-${pct}`}
                    type="button"
                    onClick={() => applyNativeProfitPercent(pct)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all ${
                      nativeProfitPercent === pct
                        ? "bg-emerald-600 text-white shadow-sm border-emerald-600"
                        : "bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={500}
                  step={1}
                  value={nativeProfitPercent}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n) && n > 0) applyNativeProfitPercent(n);
                  }}
                  className="w-14 border border-emerald-300 rounded-md px-2 py-1 text-xs font-bold text-emerald-900 bg-white outline-none focus:ring-2 focus:ring-emerald-400"
                  aria-label="原生線路利潤百分比"
                />
                <span className="text-xs font-bold text-emerald-700">%</span>
              </div>
            </div>
          </div>

          {/* 專屬折扣碼連結：分潤趴數 + 固定旅客折扣（與商品頁優惠互斥） */}
          <div className="flex flex-wrap items-center gap-3 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2.5">
            <span className="text-xs font-bold text-violet-900 whitespace-nowrap">
              🔗 專屬折扣碼連結
            </span>
            <span className="text-[10px] font-bold text-violet-600 bg-white/70 border border-violet-100 rounded px-2 py-0.5">
              標價＝官網 · 旅客另享固定折扣
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-violet-700 whitespace-nowrap">
                給夥伴（成本加成點數）
              </span>
              {[10, 15, 20, 25, 30].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyPartnerRatePercent(pct)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    partnerRatePercent === pct
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-white text-violet-800 border border-violet-200 hover:bg-violet-100"
                  }`}
                >
                  {pct}%
                </button>
              ))}
              <input
                type="number"
                min={0}
                max={500}
                step={1}
                value={partnerRatePercent}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n)) applyPartnerRatePercent(n);
                }}
                className="w-14 border border-violet-300 rounded-md px-2 py-1 text-xs font-bold text-violet-900 bg-white outline-none focus:ring-2 focus:ring-violet-400"
                aria-label="給夥伴的成本加成百分比"
              />
              <span className="text-xs font-bold text-violet-700">%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-amber-800 whitespace-nowrap">
                固定折扣（九折＝10）
              </span>
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyPartnerDiscountPercent(pct)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    partnerDiscountPercent === pct
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-50"
                  }`}
                >
                  {pct === 0 ? "無" : `${pct}%`}
                </button>
              ))}
              <input
                type="number"
                min={0}
                max={50}
                step={1}
                value={partnerDiscountPercent}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n)) applyPartnerDiscountPercent(n);
                }}
                className="w-14 border border-amber-300 rounded-md px-2 py-1 text-xs font-bold text-amber-900 bg-white outline-none focus:ring-2 focus:ring-amber-400"
                aria-label="專屬折扣碼固定折抵百分比"
              />
              <span className="text-xs font-bold text-amber-800">% off</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1">
                漫遊標價：夥伴 {partnerRatePercent}% / 我{" "}
                {Math.round((profitPercent - partnerRatePercent) * 10) / 10}%
                {partnerDiscountPercent > 0 && (
                  <>
                    {" "}
                    → 折後{" "}
                    {profitPercent > 0
                      ? Math.round(
                          ((partnerRatePercent *
                            Math.max(0, profitPercent - partnerDiscountPercent)) /
                            profitPercent) *
                            10,
                        ) / 10
                      : 0}
                    % /{" "}
                    {Math.round(
                      (Math.max(0, profitPercent - partnerDiscountPercent) -
                        (profitPercent > 0
                          ? (partnerRatePercent *
                              Math.max(
                                0,
                                profitPercent - partnerDiscountPercent,
                              )) /
                            profitPercent
                          : 0)) *
                        10,
                    ) / 10}
                    %
                  </>
                )}
              </span>
              <span className="text-rose-700 bg-rose-50 border border-rose-100 rounded-md px-2 py-1">
                原生標價：夥伴 {partnerRatePercent}% / 我{" "}
                {Math.round((nativeProfitPercent - partnerRatePercent) * 10) /
                  10}
                %
                {partnerDiscountPercent > 0 && (
                  <>
                    {" "}
                    → 折後{" "}
                    {nativeProfitPercent > 0
                      ? Math.round(
                          ((partnerRatePercent *
                            Math.max(
                              0,
                              nativeProfitPercent - partnerDiscountPercent,
                            )) /
                            nativeProfitPercent) *
                            10,
                        ) / 10
                      : 0}
                    % /{" "}
                    {Math.round(
                      (Math.max(
                        0,
                        nativeProfitPercent - partnerDiscountPercent,
                      ) -
                        (nativeProfitPercent > 0
                          ? (partnerRatePercent *
                              Math.max(
                                0,
                                nativeProfitPercent - partnerDiscountPercent,
                              )) /
                            nativeProfitPercent
                          : 0)) *
                        10,
                    ) / 10}
                    %
                  </>
                )}
              </span>
            </div>
            <p className="w-full text-[10px] text-violet-600/90 leading-snug m-0">
              固定折扣從總利潤％先扣，再按原比例分給夥伴／你。例：原生 60%、夥伴
              30%、九折 10% → 剩餘 50% → 雙方各 25%。此折扣與商品頁自訂優惠碼互斥、不可疊加。
            </p>
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
                <option value="XLONG">🎓 超長期 (30天+)</option>
                <option value="XXLONG">📅 特長 (60天+)</option>
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

              <div className="flex items-center gap-1 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg px-1 py-0.5">
                <span className="text-xs font-bold text-purple-800 px-1.5 whitespace-nowrap">
                  速度
                </span>
                <button
                  type="button"
                  onClick={() => setFilterThrottle("ALL")}
                  className={`px-2 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    filterThrottle === "ALL"
                      ? "bg-gray-800 text-white"
                      : "text-purple-900 hover:bg-white"
                  }`}
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => setFilterThrottle("TRUE_UNLIMITED")}
                  className={`px-2 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    filterThrottle === "TRUE_UNLIMITED"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm"
                      : "text-purple-800 hover:bg-white"
                  }`}
                  title="只顯示 API 標為 high speed／max speed、且沒有鎖 Mbps 的真不限速方案（不含 10Mbps 限速吃到飽）"
                >
                  🔥 真．不限速 {trueUnlimitedCount}
                </button>
              </div>

              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-1 py-0.5">
                <span className="text-xs font-bold text-emerald-800 px-1.5 whitespace-nowrap">
                  實名
                </span>
                {(
                  [
                    ["ALL", `全部 ${ekycCounts.all}`],
                    ["NO_EKYC", `🪪 無需 ${ekycCounts.none}`],
                    ["EKYC_REQUIRED", `⚠️ 需實名 ${ekycCounts.required}`],
                    ["UNKNOWN", `❓ 未標 ${ekycCounts.unknown}`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilterEkyc(value)}
                    className={`px-2 py-1.5 rounded-md text-xs font-bold transition-colors ${
                      filterEkyc === value
                        ? value === "EKYC_REQUIRED"
                          ? "bg-red-600 text-white"
                          : value === "NO_EKYC"
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-800 text-white"
                        : "text-emerald-900 hover:bg-white"
                    }`}
                    title={
                      value === "NO_EKYC"
                        ? "只含 API 明文：No ekyc needed／無需實名。後台沒寫的不算。"
                        : value === "UNKNOWN"
                          ? "API 特殊說明沒寫實名（例如只寫 Support Tiktok & GPT）"
                          : undefined
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

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
                <th className="p-4 w-28 text-right">
                  建議售價
                  <div className="text-[10px] font-normal text-emerald-600 mt-0.5">
                    漫遊 {profitPercent}% · 原生 {nativeProfitPercent}%
                  </div>
                </th>
                <th className="p-4 w-40 text-right bg-violet-50 text-violet-800 border-b-2 border-violet-200">
                  專屬折扣碼分潤
                  <div className="text-[10px] font-normal text-violet-600 mt-0.5 normal-case tracking-normal">
                    標價給夥伴 {partnerRatePercent}%
                    {partnerDiscountPercent > 0
                      ? ` · 固定 −${partnerDiscountPercent}% 後按比例拆`
                      : " · 我＝利潤％−夥伴"}
                  </div>
                </th>
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
                    <div
                      className={`text-[10px] px-1.5 py-0.5 rounded inline-block mb-1 ${p.ekycClass}`}
                      title={p.ekycTitle}
                    >
                      {p.ekycLabel}
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
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      毛利 ${p.grossProfit}
                    </div>
                  </td>
                  <td className="p-4 align-top text-right bg-violet-50/40">
                    <div className="text-[10px] text-violet-500 mb-1">
                      標價拆 {p.markupPercent}%（夥伴 {p.partnerSharePct}% / 我{" "}
                      {p.ownerSharePct}%）
                    </div>
                    <div className="text-sm font-bold text-violet-700">
                      夥伴 ${p.partnerProfit}
                    </div>
                    <div
                      className={`text-sm font-bold mt-0.5 ${
                        !p.splitOk || p.ownerProfit < 0
                          ? "text-red-600"
                          : "text-emerald-700"
                      }`}
                    >
                      我 ${p.ownerProfit}
                    </div>
                    {p.discountPct > 0 && (
                      <div className="mt-2 pt-2 border-t border-violet-100 text-left">
                        <div className="text-[10px] font-bold text-amber-700 mb-0.5">
                          專屬碼 −{p.discountPct}% → 實付 ${p.paidPrice}
                        </div>
                        <div className="text-[10px] text-amber-800/90 mb-1">
                          等效拆 {p.remainingMarginPct}%（夥伴 {p.partnerEffPct}%
                          / 我 {p.ownerEffPct}%）
                        </div>
                        <div className="text-xs font-bold text-violet-700">
                          夥伴 ${p.partnerProfitDisc}
                        </div>
                        <div
                          className={`text-xs font-bold ${
                            p.ownerProfitDisc < 0
                              ? "text-red-600"
                              : "text-emerald-700"
                          }`}
                        >
                          我 ${p.ownerProfitDisc}
                        </div>
                      </div>
                    )}
                    {!p.splitOk && (
                      <div className="text-[10px] mt-1 font-medium text-red-600">
                        ⚠️ 夥伴％超過本方案利潤％
                      </div>
                    )}
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
