/**
 * 旅遊 eSIM 網路涵蓋參考（原生卡重點國家）
 * 電信商卡片一律深連 nPerf「該電信商」熱點圖（含視窗參數），避免開到全國總圖還要手動選。
 */

const ACCENT = "#0A6CD0";

/** @typedef {{ ll: number, lg: number, zoom: number }} NperfView */
/** @typedef {{ id: string, name: string, strength: string, note: string, mapUrl: string, mapLabel?: string }} CoverageCarrier */
/** @typedef {{ id: string, title: string, desc: string, href: string }} CoverageLink */

/**
 * @typedef {object} CoverageCountryConfig
 * @property {string} code
 * @property {string} nameZh
 * @property {string[]} categoryHandles
 * @property {RegExp} namePattern
 * @property {string[]} metaCountries
 * @property {string} nperfUrl
 * @property {string|null} heatmapImage
 * @property {string} intro
 * @property {string} promptTitle
 * @property {string} promptBody
 * @property {CoverageCarrier[]} carriers
 * @property {CoverageLink[]} compareLinks
 */

/**
 * nPerf 信號圖深連結
 * @param {string} countryCode JP|KR|CN|TH|VN
 * @param {string} carrierSlug 例：`167.Viettel-Mobile`；全國總圖傳空字串
 * @param {NperfView} view
 */
export function buildNperfSignalUrl(countryCode, carrierSlug, view) {
  const cc = String(countryCode || "").toUpperCase();
  const slug = String(carrierSlug || "").replace(/^\/+|\/+$/g, "");
  let path;
  if (!slug || slug === "-") {
    // 日本全國總圖路徑較特殊
    path =
      cc === "JP"
        ? `/en/map/JP/-/signal/signal`
        : `/en/map/${cc}/-/-/signal`;
  } else {
    path = `/en/map/${cc}/-/${slug}/signal`;
  }
  const q = `ll=${view.ll}&lg=${view.lg}&zoom=${view.zoom}`;
  return `https://www.nperf.com${path}?${q}`;
}

const VIEW = {
  JP: { ll: 36.5, lg: 138, zoom: 5 },
  KR: { ll: 36.5, lg: 128, zoom: 6 },
  CN: { ll: 35, lg: 105, zoom: 4 },
  TH: { ll: 13.5, lg: 101, zoom: 5 },
  /** 與已驗證可直接帶入電信商的越南連結同格式 */
  VN: { ll: 20, lg: 0, zoom: 3 },
};

/** @type {Record<string, CoverageCountryConfig>} */
export const NETWORK_COVERAGE_COUNTRIES = {
  japan: {
    code: "JP",
    nameZh: "日本",
    categoryHandles: ["japan", "jp"],
    namePattern: /日本|japan|\bjp\b/i,
    metaCountries: ["JP", "JAPAN"],
    nperfUrl: buildNperfSignalUrl("JP", "", VIEW.JP),
    heatmapImage: "/images/收訊熱點範例圖.png",
    intro:
      "購買 eSIM 方案前，建議先參考該方案／電信商在不同地區的網路覆蓋。都會區與主要幹道通常收訊較佳；偏遠地區、山區、滑雪場、離島、地下街或大型建築物室內，收訊常會變差甚至短暫無訊號，實際狀況也會因人潮與基地台負載而異。",
    promptTitle: "出發前，要先了解日本收訊覆蓋嗎？",
    promptBody:
      "購買前可先對照該方案電信商在各地的覆蓋。都會通常較穩；偏遠、山區、滑雪場、離島、室內收訊常較差。",
    carriers: [
      {
        id: "docomo",
        name: "NTT Docomo",
        strength: "全國涵蓋最廣",
        note: "偏鄉、山區、滑雪區相對穩定，旅遊首選參考",
        mapUrl: buildNperfSignalUrl("JP", "187898.NTT-DoCoMo", VIEW.JP),
        mapLabel: "查看 nPerf 熱點圖",
      },
      {
        id: "au",
        name: "au (KDDI)",
        strength: "都會與郊區穩",
        note: "東京／大阪等都市與郊區表現佳，整體可靠",
        mapUrl: buildNperfSignalUrl("JP", "187901.au-by-KDDI", VIEW.JP),
        mapLabel: "查看 nPerf 熱點圖",
      },
      {
        id: "softbank",
        name: "SoftBank",
        strength: "都會速度亮眼",
        note: "密集都會區與交通幹線常有不錯速度",
        mapUrl: buildNperfSignalUrl("JP", "5259.SoftBank", VIEW.JP),
        mapLabel: "查看 nPerf 熱點圖",
      },
    ],
    compareLinks: [
      {
        id: "nperf",
        title: "nPerf 日本全國熱點圖",
        desc: "全國總圖（可再手動切換電信商）",
        href: buildNperfSignalUrl("JP", "", VIEW.JP),
      },
      {
        id: "docomo-official",
        title: "Docomo 官方涵蓋圖",
        desc: "官方服務區域查詢",
        href: "https://www.docomo.ne.jp/area/",
      },
      {
        id: "au-official",
        title: "au 官方涵蓋圖",
        desc: "官方服務區域查詢",
        href: "https://www.au.com/mobile/area/",
      },
      {
        id: "softbank-official",
        title: "SoftBank 官方涵蓋圖",
        desc: "官方服務區域查詢",
        href: "https://www.softbank.jp/mobile/network/area-map/",
      },
      {
        id: "opensignal",
        title: "Opensignal 體驗報告",
        desc: "第三方網路體驗評比摘要（非互動地圖）",
        href: "https://insights.opensignal.com/reports/2026/04/japan/mobile-network-experience",
      },
    ],
  },

  korea: {
    code: "KR",
    nameZh: "韓國",
    categoryHandles: ["korea", "kr", "south-korea"],
    namePattern: /韓國|南韓|korea|\bkr\b/i,
    metaCountries: ["KR", "KOREA", "SOUTH KOREA"],
    nperfUrl: buildNperfSignalUrl("KR", "", VIEW.KR),
    heatmapImage: "/images/收訊熱點範例圖-kr.png",
    intro:
      "購買 eSIM 方案前，建議先參考該方案／電信商在不同地區的網路覆蓋。首爾、釜山等都會與主要幹道通常收訊較佳；山區、島嶼、偏遠鄉鎮、地下鐵部分路段與大型建築物室內，收訊可能變差。實際狀況也會因人潮與基地台負載而異。",
    promptTitle: "出發前，要先了解韓國收訊覆蓋嗎？",
    promptBody:
      "購買前可先對照該方案電信商在各地的覆蓋。都會通常較穩；山區、島嶼、偏遠地區與室內收訊常較差。",
    carriers: [
      {
        id: "skt",
        name: "SK Telecom",
        strength: "涵蓋與穩定度佳",
        note: "全國覆蓋成熟，旅遊與偏鄉表現相對穩定",
        mapUrl: buildNperfSignalUrl("KR", "7359.SK-Telecom", VIEW.KR),
        mapLabel: "查看 nPerf 熱點圖",
      },
      {
        id: "kt",
        name: "KT",
        strength: "都會與網路品質穩",
        note: "都會與幹線表現穩定；下方另有官方涵蓋圖可對照",
        mapUrl: buildNperfSignalUrl("KR", "1935.KT", VIEW.KR),
        mapLabel: "查看 nPerf 熱點圖",
      },
      {
        id: "lgu",
        name: "LG U+",
        strength: "都會區表現亮眼",
        note: "首爾等都會區覆蓋完整，偏遠可再對照熱點圖",
        mapUrl: buildNperfSignalUrl("KR", "11921.U", VIEW.KR),
        mapLabel: "查看 nPerf 熱點圖",
      },
    ],
    compareLinks: [
      {
        id: "nperf",
        title: "nPerf 韓國全國熱點圖",
        desc: "全國總圖（可再手動切換電信商）",
        href: buildNperfSignalUrl("KR", "", VIEW.KR),
      },
      {
        id: "kt-official",
        title: "KT 官方涵蓋圖",
        desc: "官方 5G／LTE 服務區域",
        href: "https://nqi.kt.com/KTCVRG/coverage",
      },
      {
        id: "smartchoice",
        title: "Smart Choice 品質查詢",
        desc: "韓國官方通訊品質公開比較（韓文）",
        href: "https://www.smartchoice.or.kr/smc/info/evaluatePage.do",
      },
    ],
  },

  china: {
    code: "CN",
    nameZh: "中國",
    categoryHandles: ["china", "cn", "mainland-china"],
    namePattern: /中國|大陆|大陸|china|\bcn\b/i,
    metaCountries: ["CN", "CHINA"],
    nperfUrl: buildNperfSignalUrl("CN", "", VIEW.CN),
    heatmapImage: "/images/收訊熱點範例圖-cn.png",
    intro:
      "購買 eSIM 方案前，建議先參考該方案／電信商在不同地區的網路覆蓋。一線城市與主要幹線通常收訊較佳；山區、高原、偏遠縣市、地下空間與大型建築物室內，收訊可能變差。實際狀況也會因人潮與基地台負載而異。",
    promptTitle: "出發前，要先了解中國收訊覆蓋嗎？",
    promptBody:
      "購買前可先對照該方案電信商在各地的覆蓋。都會通常較穩；偏遠、山區、高原與室內收訊常較差。",
    carriers: [
      {
        id: "cmcc",
        name: "中國移動",
        strength: "涵蓋最廣",
        note: "鄉鎮與偏遠地區覆蓋相對完整，旅遊常用參考",
        mapUrl: buildNperfSignalUrl("CN", "2430.China-Mobile", VIEW.CN),
        mapLabel: "查看 nPerf 熱點圖",
      },
      {
        id: "cucc",
        name: "中國聯通",
        strength: "都會速度常佳",
        note: "大城市與熱門景點覆蓋佳，偏遠可再對照熱點圖",
        mapUrl: buildNperfSignalUrl("CN", "14505.China-Unicom", VIEW.CN),
        mapLabel: "查看 nPerf 熱點圖",
      },
      {
        id: "ct",
        name: "中國電信",
        strength: "都會與沿海穩",
        note: "一線與沿海城市表現穩定，實際以方案標示網路為準",
        mapUrl: buildNperfSignalUrl(
          "CN",
          "7204.China-Telecom-Mobile",
          VIEW.CN
        ),
        mapLabel: "查看 nPerf 熱點圖",
      },
    ],
    compareLinks: [
      {
        id: "nperf",
        title: "nPerf 中國全國熱點圖",
        desc: "全國總圖（可再手動切換電信商）",
        href: buildNperfSignalUrl("CN", "", VIEW.CN),
      },
    ],
  },

  thailand: {
    code: "TH",
    nameZh: "泰國",
    categoryHandles: ["thailand", "tailand", "th", "thai"],
    namePattern: /泰國|泰国|thailand|\bth\b/i,
    metaCountries: ["TH", "THAILAND"],
    nperfUrl: buildNperfSignalUrl("TH", "", VIEW.TH),
    heatmapImage: "/images/收訊熱點範例圖-ta.png",
    intro:
      "購買 eSIM 方案前，建議先參考該方案／電信商在不同地區的網路覆蓋。曼谷、清邁、普吉等熱門城市通常收訊較佳；島嶼、山區、偏遠府治、度假村偏遠區與大型建築物室內，收訊可能變差。實際狀況也會因人潮與基地台負載而異。",
    promptTitle: "出發前，要先了解泰國收訊覆蓋嗎？",
    promptBody:
      "購買前可先對照該方案電信商在各地的覆蓋。都會與熱門度假地通常較穩；島嶼、山區、偏遠地區與室內收訊常較差。",
    carriers: [
      {
        id: "ais",
        name: "AIS",
        strength: "涵蓋與 5G 領先",
        note: "熱門旅遊地覆蓋佳；下方另有官方 5G 圖可對照",
        mapUrl: buildNperfSignalUrl("TH", "19345.AIS-Mobile", VIEW.TH),
        mapLabel: "查看 nPerf 熱點圖",
      },
      {
        id: "true",
        name: "TrueMove H",
        strength: "都會與原生卡常用",
        note: "曼谷等地覆蓋完整；原生卡請以商品標示網路為準",
        mapUrl: buildNperfSignalUrl("TH", "11529.True-Move-H", VIEW.TH),
        mapLabel: "查看 nPerf 熱點圖",
      },
      {
        id: "dtac",
        name: "dtac",
        strength: "都會與觀光區穩",
        note: "主要城市與觀光區表現不錯，偏遠島嶼建議先查熱點圖",
        mapUrl: buildNperfSignalUrl("TH", "1885.dtac", VIEW.TH),
        mapLabel: "查看 nPerf 熱點圖",
      },
    ],
    compareLinks: [
      {
        id: "nperf",
        title: "nPerf 泰國全國熱點圖",
        desc: "全國總圖（可再手動切換電信商）",
        href: buildNperfSignalUrl("TH", "", VIEW.TH),
      },
      {
        id: "ais-official",
        title: "AIS 官方 5G 涵蓋圖",
        desc: "官方 5G 服務區域",
        href: "https://www2.ais.th/5G/en/coverage.html?intcid=5gindex-en-banner-coverage",
      },
    ],
  },

  vietnam: {
    code: "VN",
    nameZh: "越南",
    categoryHandles: ["vietnam", "vn", "viet-nam"],
    namePattern: /越南|vietnam|\bvn\b/i,
    metaCountries: ["VN", "VIETNAM", "VIET NAM"],
    nperfUrl: buildNperfSignalUrl("VN", "", VIEW.VN),
    heatmapImage: "/images/收訊熱點範例圖-vn.png",
    intro:
      "購買 eSIM 方案前，建議先參考該方案／電信商在不同地區的網路覆蓋。河內、胡志明市、峴港等都會通常收訊較佳；山區、偏遠省分、離島、地下空間與大型建築物室內，收訊可能變差。實際狀況也會因人潮與基地台負載而異。",
    promptTitle: "出發前，要先了解越南收訊覆蓋嗎？",
    promptBody:
      "購買前可先對照該方案電信商在各地的覆蓋。都會通常較穩；山區、偏遠地區、離島與室內收訊常較差。",
    carriers: [
      {
        id: "viettel",
        name: "Viettel",
        strength: "涵蓋最廣",
        note: "全國覆蓋相對完整，偏遠與山區表現常較佳",
        mapUrl: buildNperfSignalUrl("VN", "167.Viettel-Mobile", VIEW.VN),
        mapLabel: "查看 nPerf 熱點圖",
      },
      {
        id: "vinaphone",
        name: "Vinaphone",
        strength: "都會穩定",
        note: "大城市與熱門旅遊線覆蓋佳，偏遠可再對照熱點圖",
        mapUrl: buildNperfSignalUrl("VN", "21932.Vinaphone", VIEW.VN),
        mapLabel: "查看 nPerf 熱點圖",
      },
      {
        id: "mobifone",
        name: "Mobifone",
        strength: "城市與觀光區",
        note: "主要城市表現穩定，實際以方案標示網路為準",
        mapUrl: buildNperfSignalUrl("VN", "11387.Mobifone", VIEW.VN),
        mapLabel: "查看 nPerf 熱點圖",
      },
    ],
    compareLinks: [
      {
        id: "nperf",
        title: "nPerf 越南全國熱點圖",
        desc: "全國總圖（可再手動切換電信商）",
        href: buildNperfSignalUrl("VN", "", VIEW.VN),
      },
    ],
  },
};

export const NETWORK_COVERAGE_ACCENT = ACCENT;

/**
 * @returns {CoverageCountryConfig | null}
 */
export function resolveCoverageCountry(product, categoryHandle) {
  const cat = String(categoryHandle || "").toLowerCase();
  const metaCountry = String(product?.metadata?.country || "").toUpperCase();
  const blob = [
    product?.name,
    product?.slug,
    product?.handle,
    product?.title,
    ...(product?.categories || []).map((c) => c?.handle || c?.name || ""),
  ]
    .filter(Boolean)
    .join(" ");

  for (const config of Object.values(NETWORK_COVERAGE_COUNTRIES)) {
    if (config.categoryHandles.includes(cat)) return config;
    if (config.metaCountries.includes(metaCountry)) return config;
    if (config.namePattern.test(blob)) return config;
  }
  return null;
}

export function isJapanEsimProduct(product, categoryHandle) {
  return resolveCoverageCountry(product, categoryHandle)?.code === "JP";
}
