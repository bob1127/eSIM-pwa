/**
 * 全站社群預覽圖（Open Graph / Twitter 1200×630 取向）
 * 挑選現有橫式旅遊／品牌主視覺，避免再用方形 App icon。
 */

export const DEFAULT_OG_PATH = "/images/06.png";

/** pathname → 預覽圖 */
export const PAGE_OG = {
  "/": {
    image: "/images/06.png",
    alt: "Jeko eSIM 全球旅遊上網｜方案可選、落地就有網路",
  },
  "/product": {
    image: "/images/日本eSIM.png",
    alt: "Jeko eSIM 各國旅遊方案｜日本高速上網・即買即用",
  },
  "/blog": {
    image: "/images/index-05.png",
    alt: "Jeko eSIM 旅遊知識｜幾分鐘設定好，一落地就有網路",
  },
  "/travel-blog": {
    image: "/images/index-05.png",
    alt: "Jeko eSIM 旅遊資訊與目的地攻略",
  },
  "/about": {
    image: "/images/06.png",
    alt: "關於 Jeko 接口 eSIM｜成為你與世界的接口",
  },
  "/support": {
    image: "/images/06.png",
    alt: "Jeko eSIM 客服支援與裝置相容查詢",
  },
  "/data-query": {
    image: "/images/06.png",
    alt: "Jeko eSIM 流量查詢與用量估算",
  },
  "/promo": {
    image:
      "/images/加入會員_加入line官方_優惠-Jeko eSIM_多國旅遊eSIM.png",
    alt: "Jeko eSIM 新會員優惠｜加入官方 LINE 領 50 折扣金",
  },
  "/missions": {
    image: "/images/接任務吧.png",
    alt: "Jeko eSIM 任務牆｜加入官方 LINE 接任務領報酬",
  },
  "/operation-ios": {
    image: "/images/06.png",
    alt: "iPhone 安裝 Jeko eSIM 教學｜掃描 QR Code 即開即用",
  },
  "/cooperation": {
    image:
      "/images/加入會員_加入line官方_優惠-Jeko eSIM_多國旅遊eSIM.png",
    alt: "成為 Jeko eSIM 合作夥伴｜專屬連結與分潤合作",
  },
  "/contact": {
    image: "/images/06.png",
    alt: "聯絡 Jeko eSIM 客服與合作洽詢",
  },
  "/qa": {
    image: "/images/06.png",
    alt: "Jeko eSIM 常見問題｜購買、安裝、電子發票",
  },
  "/shopee-qrcode": {
    image: "/images/日本eSIM.png",
    alt: "蝦皮訂單兌換 Jeko eSIM QR Code",
  },
  "/privacy": {
    image: "/images/06.png",
    alt: "Jeko eSIM 隱私權政策",
  },
  "/terms": {
    image: "/images/06.png",
    alt: "Jeko eSIM 服務條款",
  },
  "/refund-policy": {
    image: "/images/06.png",
    alt: "Jeko eSIM 退換貨政策",
  },
};

/** 商品分類頁預覽圖 */
export const CATEGORY_OG_IMAGES = {
  japan: { image: "/images/日本eSIM.png", alt: "日本 eSIM｜高速上網・即買即用" },
  jp: { image: "/images/日本eSIM.png", alt: "日本 eSIM｜高速上網・即買即用" },
  korea: { image: "/images/韓國01.png", alt: "韓國 eSIM｜原生 IP 高速上網" },
  kr: { image: "/images/韓國01.png", alt: "韓國 eSIM｜原生 IP 高速上網" },
  thailand: {
    image: "/images/泰國原生eSIM.png",
    alt: "泰國 eSIM｜原生 IP 高速上網",
  },
  th: { image: "/images/泰國原生eSIM.png", alt: "泰國 eSIM｜原生 IP 高速上網" },
  china: { image: "/images/中國.png", alt: "中國 eSIM｜出國上網即買即用" },
  hongkong: { image: "/images/分類eSIM-中港澳.png", alt: "香港／中港澳 eSIM" },
  hk: { image: "/images/分類eSIM-中港澳.png", alt: "香港／中港澳 eSIM" },
  cnhkmo: { image: "/images/分類eSIM-中港澳.png", alt: "中港澳 eSIM" },
  malaysia: { image: "/images/分類eSIM-馬來西亞.png", alt: "馬來西亞 eSIM" },
  my: { image: "/images/分類eSIM-馬來西亞.png", alt: "馬來西亞 eSIM" },
  singapore: { image: "/images/分類eSIM-新馬.png", alt: "新加坡／新馬 eSIM" },
  sg: { image: "/images/分類eSIM-新馬.png", alt: "新加坡／新馬 eSIM" },
  vietnam: { image: "/images/分類eSIM-越南.png", alt: "越南 eSIM" },
  vn: { image: "/images/分類eSIM-越南.png", alt: "越南 eSIM" },
  usa: { image: "/images/sim/產品/美國esim.png", alt: "美國 eSIM" },
  us: { image: "/images/sim/產品/美國esim.png", alt: "美國 eSIM" },
  "north-america": {
    image: "/images/sim/分類/分類eSIM-北美.png",
    alt: "北美 eSIM",
  },
  "us-canada": {
    image: "/images/sim/分類/分類eSIM-美加-.png",
    alt: "美加 eSIM",
  },
  germany: { image: "/images/sim/分類/分類eSIM-德國.png", alt: "德國 eSIM" },
  de: { image: "/images/sim/分類/分類eSIM-德國.png", alt: "德國 eSIM" },
  spain: { image: "/images/sim/分類/分類eSIM-西班牙.png", alt: "西班牙 eSIM" },
  es: { image: "/images/sim/分類/分類eSIM-西班牙.png", alt: "西班牙 eSIM" },
  italy: { image: "/images/sim/分類/分類eSIM-義大利.png", alt: "義大利 eSIM" },
  it: { image: "/images/sim/分類/分類eSIM-義大利.png", alt: "義大利 eSIM" },
  uk: { image: "/images/sim/分類/分類eSIM-英國.png", alt: "英國 eSIM" },
  gb: { image: "/images/sim/分類/分類eSIM-英國.png", alt: "英國 eSIM" },
  france: { image: "/images/sim/分類/分類eSIM-法國.png", alt: "法國 eSIM" },
  fr: { image: "/images/sim/分類/分類eSIM-法國.png", alt: "法國 eSIM" },
  europe: { image: "/images/sim/分類/分類eSIM-歐洲.png", alt: "歐洲 eSIM" },
  eu: { image: "/images/sim/分類/分類eSIM-歐洲.png", alt: "歐洲 eSIM" },
  australia: { image: "/images/sim/分類/分類eSIM-澳洲.png", alt: "澳洲 eSIM" },
  au: { image: "/images/sim/分類/分類eSIM-澳洲.png", alt: "澳洲 eSIM" },
  taiwan: { image: "/images/sim/分類/分類eSIM-台灣.png", alt: "台灣 eSIM" },
  tw: { image: "/images/sim/分類/分類eSIM-台灣.png", alt: "台灣 eSIM" },
  global: { image: "/images/分類eSIM-多國.png", alt: "全球／多國 eSIM" },
};

export function resolvePageOg(pathname) {
  return PAGE_OG[pathname] || { image: DEFAULT_OG_PATH, alt: "Jeko eSIM" };
}

export function resolveCategoryOg(handle = "") {
  const key = String(handle || "").toLowerCase();
  return (
    CATEGORY_OG_IMAGES[key] || {
      image: PAGE_OG["/product"].image,
      alt: PAGE_OG["/product"].alt,
    }
  );
}

export function ogImageMimeType(url = "") {
  const lower = String(url).split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}
