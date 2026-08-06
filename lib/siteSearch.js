/**
 * 全站即時搜尋：靜態頁面／條款索引 + 結果正規化
 */

/** 結果小標記僅三種：產品／文章／頁面 */
export const SEARCH_SOURCE = {
  product: { key: "product", label: "產品" },
  article: { key: "article", label: "文章" },
  terms: { key: "terms", label: "頁面" },
  privacy: { key: "privacy", label: "頁面" },
  refund: { key: "refund", label: "頁面" },
  page: { key: "page", label: "頁面" },
};

/** 同分時類型優先：產品 > 文章 > 頁面 */
export const SEARCH_TYPE_RANK = {
  product: 0,
  article: 1,
  page: 2,
  terms: 2,
  privacy: 2,
  refund: 2,
};

/** 類型加權：相關度相近時產品較容易排前面 */
export const SEARCH_TYPE_BOOST = {
  product: 22,
  article: 6,
  page: 0,
  terms: 0,
  privacy: 0,
  refund: 0,
};

export function displaySourceLabel(source) {
  const meta = SEARCH_SOURCE[source];
  if (meta?.label) return meta.label;
  return "頁面";
}

export function rankScore(item) {
  const base = Number(item?.score) || 0;
  const boost = SEARCH_TYPE_BOOST[item?.source] || 0;
  return base + boost;
}

export function compareSearchResults(a, b) {
  const diff = rankScore(b) - rankScore(a);
  if (diff !== 0) return diff;
  return (
    (SEARCH_TYPE_RANK[a?.source] ?? 9) - (SEARCH_TYPE_RANK[b?.source] ?? 9)
  );
}

/** 站內重要頁面（標題＋關鍵字） */
export const STATIC_PAGE_ENTRIES = [
  {
    id: "page-home",
    title: "首頁",
    href: "/",
    keywords: "jeko esim 出國上網 旅遊",
    excerpt: "Jeko eSIM 出國上網、旅遊 eSIM 方案與教學。",
  },
  {
    id: "page-product",
    title: "全部 eSIM 方案",
    href: "/product",
    keywords: "商品 方案 國家 日本 韓國 泰國",
    excerpt: "瀏覽各國旅遊 eSIM 方案。",
  },
  {
    id: "page-support",
    title: "客服支援・相容機型",
    href: "/support",
    keywords: "客服 支援 FAQ 相容 機型 iphone android",
    excerpt: "查詢手機是否支援 eSIM、常見問題與聯絡方式。",
  },
  {
    id: "page-contact",
    title: "聯絡我們",
    href: "/contact",
    keywords: "聯絡 客服 line email 退款 詢問",
    excerpt: "透過表單或 LINE 聯繫 Jeko eSIM 客服。",
  },
  {
    id: "page-setting",
    title: "eSIM 安裝教學",
    href: "/setting",
    keywords: "安裝 設定 教學 qrcode 啟用 ios android",
    excerpt: "iPhone／Android eSIM 安裝與啟用步驟。",
  },
  {
    id: "page-data-query",
    title: "用量查詢",
    href: "/data-query",
    keywords: "用量 流量 查詢 iccid 剩餘",
    excerpt: "以 ICCID 查詢 eSIM 剩餘流量。",
  },
  {
    id: "page-about",
    title: "關於我們",
    href: "/about",
    keywords: "關於 jeko 品牌",
    excerpt: "認識 Jeko eSIM。",
  },
  {
    id: "page-blog",
    title: "旅遊知識文章",
    href: "/blog",
    keywords: "部落格 文章 旅遊 攻略",
    excerpt: "出國上網、旅遊攻略與 eSIM 知識。",
  },
  {
    id: "page-promo",
    title: "會員優惠",
    href: "/promo",
    keywords: "優惠 折價 推薦 好友 line",
    excerpt: "新會員折價、推薦好友與 LINE 優惠。",
  },
  {
    id: "page-member-offers",
    title: "會員優惠說明",
    href: "/member-offers",
    keywords: "會員 優惠 策略",
    excerpt: "會員與 LINE 優先優惠規劃說明。",
  },
  {
    id: "page-wizard",
    title: "智慧選品精靈",
    href: "/wizard",
    keywords: "選品 推薦 精靈 出國",
    excerpt: "依目的地與天數推薦合適 eSIM。",
  },
  {
    id: "page-cooperation",
    title: "合作夥伴方案",
    href: "/cooperation",
    keywords: "合作 夥伴 分潤 專屬商店 專屬連結",
    excerpt: "申請成為 Jeko eSIM 合作夥伴。",
  },
  {
    id: "page-check-esim",
    title: "檢查手機是否支援 eSIM",
    href: "/check-esim-support",
    keywords: "相容 檢查 支援 esim 手機",
    excerpt: "確認裝置是否支援 eSIM。",
  },
];

/**
 * 條款／政策可搜尋段落（標題＋摘要關鍵字）
 * href 指到對應頁面；小字標記用 sourceLabel 區分。
 */
export const LEGAL_ENTRIES = [
  // 服務條款
  {
    id: "terms-scope",
    source: "terms",
    title: "服務說明與適用範圍",
    href: "/terms",
    keywords: "服務條款 適用 註冊 夥伴 專屬商店",
    excerpt: "使用 Jeko eSIM 購買、會員與合作夥伴方案之適用範圍。",
  },
  {
    id: "terms-account",
    source: "terms",
    title: "帳號與會員義務",
    href: "/terms",
    keywords: "帳號 密碼 email line google 登入 義務",
    excerpt: "註冊資料、第三方登入與帳號保管義務。",
  },
  {
    id: "terms-esim",
    source: "terms",
    title: "eSIM 商品購買與使用",
    href: "/terms",
    keywords: "購買 數位商品 qrcode 啟用 相容 流量",
    excerpt: "eSIM 為數位商品、裝置相容與使用注意事項。",
  },
  {
    id: "terms-payment",
    source: "terms",
    title: "付款、發票與退款",
    href: "/terms",
    keywords: "付款 發票 退款 line pay 信用卡",
    excerpt: "付款方式、電子發票與退款相關說明。",
  },
  {
    id: "terms-partner",
    source: "terms",
    title: "合作夥伴與分潤",
    href: "/terms",
    keywords: "夥伴 分潤 專屬連結 專屬商店 加價",
    excerpt: "專屬連結／專屬商店合作與分潤規則。",
  },
  {
    id: "terms-liability",
    source: "terms",
    title: "責任限制與準據法",
    href: "/terms",
    keywords: "責任 準據法 管轄",
    excerpt: "服務責任限制與適用法律。",
  },
  // 隱私權
  {
    id: "privacy-scope",
    source: "privacy",
    title: "隱私權政策適用範圍",
    href: "/privacy",
    keywords: "隱私 個人資料 蒐集",
    excerpt: "網站、夥伴賣場、LINE 客服之個人資料處理範圍。",
  },
  {
    id: "privacy-collect",
    source: "privacy",
    title: "我們蒐集哪些資料",
    href: "/privacy",
    keywords: "帳號 訂單 交易 裝置 cookie",
    excerpt: "帳號、訂單、夥伴申請與裝置相關資料蒐集說明。",
  },
  {
    id: "privacy-use",
    source: "privacy",
    title: "資料使用目的",
    href: "/privacy",
    keywords: "使用目的 行銷 客服 金流",
    excerpt: "訂單處理、客服、金流與行銷之資料使用目的。",
  },
  {
    id: "privacy-rights",
    source: "privacy",
    title: "您的權利",
    href: "/privacy",
    keywords: "查詢 刪除 更正 權利",
    excerpt: "個人資料查詢、更正、刪除等權利行使方式。",
  },
  // 退換貨
  {
    id: "refund-nature",
    source: "refund",
    title: "商品性質與重要提醒",
    href: "/refund-policy",
    keywords: "退換貨 數位商品 原生 漫遊",
    excerpt: "原生與非原生／漫遊 eSIM 退換貨條件不同。",
  },
  {
    id: "refund-roaming",
    source: "refund",
    title: "非原生／漫遊 eSIM 退款",
    href: "/refund-policy",
    keywords: "未安裝 未激活 已激活 全額退款 連線問題 更換",
    excerpt: "未安裝／已安裝未激活全額退；已激活不退；連線問題可協助更換或部分退。",
  },
  {
    id: "refund-native",
    source: "refund",
    title: "原生 eSIM — 售出後不退不換",
    href: "/refund-policy",
    keywords: "原生 esim 不退款 不換貨",
    excerpt: "原生 eSIM 售出後概不退款或換貨。",
  },
  {
    id: "refund-process",
    source: "refund",
    title: "退款申請流程與時程",
    href: "/refund-policy",
    keywords: "申請 流程 時程 line 客服",
    excerpt: "如何申請退款與預計處理時程。",
  },
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchQuery(haystack, query) {
  const h = normalize(haystack);
  const q = normalize(query);
  if (!q || !h) return false;
  const tokens = q.split(" ").filter(Boolean);
  return tokens.every((t) => h.includes(t));
}

export function scoreMatch(haystack, query) {
  const h = normalize(haystack);
  const q = normalize(query);
  if (!q || !h) return 0;
  if (h === q) return 100;
  if (h.startsWith(q)) return 85;
  if (h.includes(q)) {
    // 越靠前、佔比越高 → 相關度越高
    const idx = h.indexOf(q);
    const posBonus = Math.max(0, 12 - Math.floor(idx / 4));
    const lenBonus = Math.min(10, Math.round((q.length / Math.max(h.length, 1)) * 20));
    return 60 + posBonus + lenBonus;
  }
  const tokens = q.split(" ").filter(Boolean);
  let hit = 0;
  for (const t of tokens) {
    if (h.includes(t)) hit += 1;
  }
  if (!hit) return 0;
  return Math.round((hit / tokens.length) * 40);
}

/** 標題命中加分，摘要／關鍵字次之 */
export function scoreFields({ title = "", keywords = "", excerpt = "" }, query) {
  const titleScore = scoreMatch(title, query);
  const bodyScore = scoreMatch(`${keywords} ${excerpt}`, query);
  if (!titleScore && !bodyScore) return 0;
  if (titleScore) return titleScore + 18;
  return bodyScore;
}

export function searchStaticEntries(query, { limit = 8 } = {}) {
  const q = String(query || "").trim();
  if (!q) return [];

  const pageHits = STATIC_PAGE_ENTRIES.map((e) => {
    const score = scoreFields(
      { title: e.title, keywords: e.keywords, excerpt: e.excerpt },
      q,
    );
    if (!score) return null;
    return {
      id: e.id,
      title: e.title,
      href: e.href,
      excerpt: e.excerpt || "",
      source: SEARCH_SOURCE.page.key,
      sourceLabel: SEARCH_SOURCE.page.label,
      score,
    };
  }).filter(Boolean);

  const legalHits = LEGAL_ENTRIES.map((e) => {
    const score = scoreFields(
      { title: e.title, keywords: e.keywords, excerpt: e.excerpt },
      q,
    );
    if (!score) return null;
    const meta = SEARCH_SOURCE[e.source] || SEARCH_SOURCE.page;
    return {
      id: e.id,
      title: e.title,
      href: e.href,
      excerpt: e.excerpt || "",
      source: meta.key,
      sourceLabel: meta.label,
      score,
    };
  }).filter(Boolean);

  return [...pageHits, ...legalHits]
    .sort(compareSearchResults)
    .slice(0, limit);
}

export function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildProductHref(product) {
  const handle = product.handle || product.slug || product.id;
  const cat =
    product.categories?.[0]?.handle ||
    product.categoryHandle ||
    product.category_slug ||
    "uncategorized";
  if (!handle) return "/product";
  return `/product/${cat}/${handle}`;
}
