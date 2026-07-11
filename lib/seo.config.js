/**
 * Jeko eSIM 全站 SEO 設定
 * 涵蓋：eSIM 販售、住宿推薦、旅遊知識、包車服務
 */

import { PRODUCTION_SITE_URL } from "./siteUrl";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_SITE_URL
).replace(/\/$/, "");

export const SITE_NAME = "Jeko eSIM";
export const SITE_NAME_FULL = "Jeko eSIM 街口eSIM";
export const SITE_TAGLINE = "連接您與世界的距離";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/icons/icon-512x512.png`;
export const DEFAULT_LOGO = `${SITE_URL}/icons/icon-512x512.png`;

export const BRAND = {
  legalName: "Jeko eSIM",
  email: "support@re-media.com",
  locale: "zh-TW",
  language: "zh-TW",
  country: "TW",
  region: "TW",
  placename: "Taiwan",
  areaServed: ["TW", "JP", "KR", "TH", "MY", "SG", "US", "EU"],
  sameAs: [
    "https://www.facebook.com/profile.php?id=61591030890082",
    "https://lin.ee/y6tdx5q",
  ],
};

/** 全站社群連結 — Navbar / Footer 共用 */
export const SOCIAL_LINKS = {
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
  instagram2: process.env.NEXT_PUBLIC_INSTAGRAM_URL_2 || "",
  facebook:
    process.env.NEXT_PUBLIC_FACEBOOK_URL ||
    "https://www.facebook.com/profile.php?id=61591030890082",
  line: process.env.NEXT_PUBLIC_LINE_OA_URL || "https://lin.ee/y6tdx5q",
};

export const DEFAULT_KEYWORDS = [
  "Jeko eSIM",
  "街口eSIM",
  "旅遊eSIM",
  "日本eSIM",
  "韓國eSIM",
  "泰國eSIM",
  "出國上網",
  "虛擬SIM卡",
  "免換卡上網",
  "旅遊知識",
  "住宿推薦",
  "包車服務",
  "租車包車",
  "日本旅遊攻略",
  "海外漫遊",
].join(", ");

const TITLE_SUFFIX = ` | ${SITE_NAME_FULL}`;

export function absoluteUrl(path = "/") {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatTitle(title, { withSuffix = true } = {}) {
  if (!title) return `${SITE_NAME_FULL}｜${SITE_TAGLINE}`;
  if (!withSuffix || title.includes(SITE_NAME)) return title;
  return `${title}${TITLE_SUFFIX}`;
}

/** 依 pathname 對應靜態頁 SEO */
export const PAGE_SEO = {
  "/": {
    title: `${SITE_NAME_FULL}｜全球旅遊 eSIM・住宿推薦・包車服務・旅遊知識`,
    description:
      "Jeko eSIM 街口eSIM 提供日本、韓國、東南亞及全球旅遊 eSIM 上網方案。一站整合住宿推薦、租車包車服務與旅遊知識攻略，免換實體卡、QR Code 即開即用，讓出國上網更輕鬆。",
    keywords:
      "Jeko eSIM,街口eSIM,旅遊eSIM,日本eSIM,韓國eSIM,住宿推薦,包車服務,旅遊知識,出國上網,免換卡",
    jsonLdTypes: ["WebSite", "Organization", "WebPage"],
  },
  "/product": {
    title: `各國旅遊 eSIM 方案總覽｜日本・韓國・東南亞・歐美`,
    description:
      "瀏覽 Jeko eSIM 全系列出國上網方案：日本、韓國、泰國、馬來西亞、歐美等熱門目的地 eSIM。依天數與流量挑選，即買即用、免換卡，搭配旅遊攻略與在地服務推薦。",
    keywords:
      "eSIM方案,日本eSIM,韓國eSIM,泰國eSIM,旅遊網卡,出國上網,Jeko eSIM,各國eSIM",
    jsonLdTypes: ["CollectionPage", "ItemList", "BreadcrumbList"],
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "eSIM 方案", path: "/product" },
    ],
  },
  "/blog": {
    title: `旅遊知識・出國攻略｜日本韓國東南亞旅遊指南`,
    description:
      "Jeko eSIM 旅遊知識專區：日本、韓國、泰國等目的地實用攻略、上網教學、eSIM 安裝指南與行程靈感。出國前必讀，讓旅程更順暢。",
    keywords:
      "旅遊知識,日本旅遊攻略,韓國旅遊,出國教學,eSIM教學,旅遊指南,Jeko eSIM",
    jsonLdTypes: ["Blog", "CollectionPage", "BreadcrumbList"],
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "旅遊知識", path: "/blog" },
    ],
  },
  "/travel-blog": {
    title: `旅遊資訊・目的地攻略｜住宿・交通・上網一站看`,
    description:
      "精選各國旅遊資訊與實用攻略，涵蓋日本、韓國、泰國、馬來西亞等熱門目的地。搭配 Jeko eSIM 出國上網與住宿、包車服務推薦。",
    keywords: "旅遊資訊,旅遊攻略,日本旅遊,韓國旅遊,住宿推薦,包車,Jeko eSIM",
    jsonLdTypes: ["CollectionPage", "BreadcrumbList"],
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "旅遊資訊", path: "/travel-blog" },
    ],
  },
  "/about": {
    title: `關於我們｜Jeko eSIM 品牌故事與服務理念`,
    description:
      "認識 Jeko eSIM 街口eSIM：專注旅遊 eSIM、住宿推薦、包車服務與旅遊知識，以可靠連線與貼心在地資源，陪伴每一位旅人安心出發。",
    keywords: "Jeko eSIM,街口eSIM,關於我們,旅遊eSIM品牌,出國上網服務",
    jsonLdTypes: ["AboutPage", "Organization", "BreadcrumbList"],
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "關於我們", path: "/about" },
    ],
  },
  "/support": {
    title: `客服支援・eSIM 裝置相容列表｜安裝與疑難排解`,
    description:
      "Jeko eSIM 客服支援中心：查詢 iPhone、Android 等 eSIM 相容機型，eSIM 安裝步驟、常見錯誤排除與售後協助，出國上網疑問一次解答。",
    keywords:
      "eSIM支援,eSIM相容機型,iPhone eSIM,Android eSIM,安裝教學,客服,Jeko eSIM",
    jsonLdTypes: ["WebPage", "FAQPage", "BreadcrumbList"],
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "客服支援", path: "/support" },
    ],
  },
  "/data-query": {
    title: `eSIM 流量查詢・用量估算・推播通知`,
    description:
      "查詢 Jeko eSIM 方案剩餘流量與使用狀況，依旅遊天數與使用習慣估算所需流量。訂閱推播通知，即時掌握 eSIM 狀態與優惠訊息。",
    keywords:
      "eSIM流量查詢,用量估算,旅遊流量,推播通知,Jeko eSIM,出國上網",
    jsonLdTypes: ["WebPage", "BreadcrumbList"],
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "流量查詢", path: "/data-query" },
    ],
  },
  "/operation-ios": {
    title: `iPhone eSIM 安裝教學｜iOS 開通步驟圖解`,
    description:
      "Jeko eSIM iPhone 安裝完整教學：從掃描 QR Code、新增行動方案到開啟漫遊，圖解 iOS eSIM 設定流程，出國前 5 分鐘輕鬆完成。",
    keywords:
      "iPhone eSIM教學,iOS eSIM安裝,QR Code,eSIM開通,出國上網,Jeko eSIM",
    jsonLdTypes: ["HowTo", "WebPage", "BreadcrumbList"],
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "iOS 安裝教學", path: "/operation-ios" },
    ],
  },
  "/cooperation": {
    title: `合作夥伴・經銷加盟｜Jeko eSIM 商業合作`,
    description:
      "歡迎旅行社、電商、KOL 與企業與 Jeko eSIM 合作。提供 eSIM 批發、聯盟行銷、白標方案與旅遊加值服務，共創出國上網與旅遊體驗。",
    keywords: "eSIM合作,經銷加盟,聯盟行銷,旅行社合作,Jeko eSIM,商業合作",
    jsonLdTypes: ["WebPage", "BreadcrumbList"],
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "合作夥伴", path: "/cooperation" },
    ],
  },
  "/contact": {
    title: `聯絡我們｜Jeko eSIM 客服與合作洽詢`,
    description:
      "聯絡 Jeko eSIM 客服團隊：eSIM 購買諮詢、訂單問題、住宿與包車服務合作洽詢，我們將盡快回覆您的訊息。",
    keywords: "聯絡我們,Jeko eSIM客服,eSIM諮詢,合作洽詢",
    jsonLdTypes: ["ContactPage", "BreadcrumbList"],
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "聯絡我們", path: "/contact" },
    ],
  },
  "/privacy": {
    title: `隱私權政策｜Jeko eSIM`,
    description:
      "Jeko eSIM 隱私權政策：說明個人資料蒐集、使用、保護方式與您的權利，保障出國上網服務使用者的資料安全。",
    keywords: "隱私權政策,個人資料保護,Jeko eSIM",
    robots: "index, follow",
    jsonLdTypes: ["WebPage"],
  },
  "/terms": {
    title: `服務條款｜Jeko eSIM`,
    description:
      "Jeko eSIM 服務條款：說明 eSIM 購買、使用、退款、合作夥伴分潤及相關權利義務。",
    keywords: "服務條款,使用條款,Jeko eSIM,合作夥伴",
    robots: "index, follow",
    jsonLdTypes: ["WebPage"],
  },
  "/refund-policy": {
    title: `退換貨政策｜Jeko eSIM`,
    description:
      "Jeko eSIM 退換貨政策：數位 eSIM 未開通退款、已開通例外、申請流程與退款時程說明。",
    keywords: "eSIM退款,退換貨政策,數位商品,Jeko eSIM",
    robots: "index, follow",
    jsonLdTypes: ["WebPage"],
  },
  "/qa": {
    title: `常見問題 FAQ｜eSIM 購買・安裝・使用`,
    description:
      "Jeko eSIM 常見問題：eSIM 如何購買與開通、支援機型、流量計算、退款政策與旅遊加值服務說明，快速找到解答。",
    keywords: "eSIM常見問題,FAQ,出國上網疑問,Jeko eSIM",
    jsonLdTypes: ["FAQPage", "BreadcrumbList"],
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "常見問題", path: "/qa" },
    ],
  },
  "/login": {
    title: `會員登入`,
    robots: "noindex, nofollow",
  },
  "/checkout": {
    title: `結帳`,
    robots: "noindex, nofollow",
  },
  "/Cart": {
    title: `購物車`,
    robots: "noindex, nofollow",
  },
  "/my-account": {
    title: `我的帳戶`,
    robots: "noindex, nofollow",
  },
  "/my-esim": {
    title: `我的 eSIM`,
    robots: "noindex, nofollow",
  },
  "/account": {
    title: `帳戶中心`,
    robots: "noindex, nofollow",
  },
  "/admin/push": {
    title: `推播管理`,
    robots: "noindex, nofollow",
  },
};

/** 不索引的路徑前綴 */
export const NOINDEX_PREFIXES = [
  "/login",
  "/checkout",
  "/Cart",
  "/cart",
  "/my-account",
  "/my-esim",
  "/account",
  "/admin",
  "/test",
  "/p/",
  "/pending",
  "/thank-you",
  "/reset-password",
  "/profile",
  "/wizard",
  "/linepay",
  "/ecpay",
  "/register-distributor",
  "/admin-boss",
];

export function isNoindexPath(pathname, asPath = "") {
  const path = asPath.split("?")[0] || pathname;
  return NOINDEX_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix),
  );
}

/**
 * 合併頁面 SEO：靜態對照表 + 動態覆寫
 */
export function resolvePageSeo(pathname, asPath = "", override = {}) {
  const canonicalPath = (override.canonicalPath || asPath.split("?")[0] || pathname)
    .split("?")[0];
  const staticSeo = PAGE_SEO[pathname] || {};
  const noindex =
    override.noindex ?? staticSeo.noindex ?? isNoindexPath(pathname, asPath);

  return {
    title: override.title || staticSeo.title,
    description: override.description || staticSeo.description,
    keywords: override.keywords || staticSeo.keywords || DEFAULT_KEYWORDS,
    canonical: override.canonical || absoluteUrl(canonicalPath),
    ogImage: override.ogImage || staticSeo.ogImage || DEFAULT_OG_IMAGE,
    ogType: override.ogType || staticSeo.ogType || "website",
    robots: override.robots || staticSeo.robots || (noindex ? "noindex, nofollow" : "index, follow"),
    breadcrumbs: override.breadcrumbs || staticSeo.breadcrumbs,
    jsonLd: override.jsonLd,
    jsonLdTypes: override.jsonLdTypes || staticSeo.jsonLdTypes,
    noindex,
    articlePublishedTime: override.articlePublishedTime,
    articleModifiedTime: override.articleModifiedTime,
  };
}

/** 商品分類頁 SEO */
export function buildCategorySeo(category, products = []) {
  const name = category?.name || "各國";
  const handle = category?.handle || category?.slug || "";
  const title = `${name} eSIM 推薦｜${name}出國上網方案・即買即用`;
  const description =
    category?.description ||
    `精選 ${name} 旅遊 eSIM 上網方案，免換實體卡、QR Code 即開即用。Jeko eSIM 提供多種天數與流量選擇，搭配 ${name} 旅遊知識、住宿與包車服務推薦。`;
  const keywords = `${name}eSIM,${name}出國上網,${name}旅遊網卡,${name}漫遊,Jeko eSIM,旅遊eSIM`;

  const itemList =
    products.length > 0
      ? {
          "@type": "ItemList",
          name: `${name} eSIM 方案`,
          numberOfItems: products.length,
          itemListElement: products.slice(0, 20).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: absoluteUrl(`/product/${handle}/${p.slug || p.handle}`),
            name: p.name || p.title,
          })),
        }
      : null;

  return {
    title,
    description,
    keywords,
    canonical: absoluteUrl(`/product/${handle}`),
    ogType: "website",
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "eSIM 方案", path: "/product" },
      { name: `${name} eSIM`, path: `/product/${handle}` },
    ],
    jsonLd: itemList ? [itemList] : undefined,
    jsonLdTypes: ["CollectionPage", "BreadcrumbList"],
  };
}

/** 商品內頁 SEO */
export function buildProductSeo(product, variation, categoryHandle) {
  const productName = variation?.title || product?.name || "eSIM 方案";
  const title = `${productName}｜${SITE_NAME_FULL} 出國上網`;
  const rawDesc = stripHtml(product?.description || "");
  const description =
    rawDesc.slice(0, 155) ||
    `購買 ${productName}：Jeko eSIM 提供即買即用旅遊 eSIM，免換卡、掃描 QR Code 即可上網。支援多種天數與流量，出國更省心。`;
  const keywords = `${productName},${product?.name || ""} eSIM,旅遊eSIM,出國上網,Jeko eSIM,免換卡`;
  const images = product?.image_urls?.length
    ? product.image_urls
    : product?.image_url
      ? [product.image_url]
      : [DEFAULT_OG_IMAGE];
  const price = variation?.price ?? product?.price;
  const priceAmount =
    typeof price === "number" ? (price > 1000 ? price / 100 : price) : undefined;

  const productSchema = {
    "@type": "Product",
    name: productName,
    description,
    image: images.filter(Boolean),
    sku: variation?.sku || product?.slug,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: "Travel eSIM",
    offers: priceAmount
      ? {
          "@type": "Offer",
          url: absoluteUrl(`/product/${categoryHandle}/${product?.slug}`),
          priceCurrency: "TWD",
          price: priceAmount,
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: SITE_NAME },
        }
      : undefined,
  };

  return {
    title,
    description,
    keywords,
    canonical: absoluteUrl(`/product/${categoryHandle}/${product?.slug}`),
    ogImage: images[0] || DEFAULT_OG_IMAGE,
    ogType: "product",
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "eSIM 方案", path: "/product" },
      { name: product?.name, path: `/product/${categoryHandle}` },
      { name: productName, path: `/product/${categoryHandle}/${product?.slug}` },
    ],
    jsonLd: [productSchema],
    jsonLdTypes: ["Product", "BreadcrumbList"],
  };
}

/** 部落格文章 SEO */
export function buildBlogPostSeo(post, bannerImage, yoast = {}) {
  const titleText = stripHtml(post?.title?.rendered || post?.title || "旅遊知識");
  const title = yoast?.title || `${titleText}｜Jeko eSIM 旅遊知識`;
  const excerpt = stripHtml(post?.excerpt?.rendered || "");
  const contentDesc = stripHtml(post?.content?.rendered || "").slice(0, 155);
  const description =
    yoast?.description || excerpt || contentDesc || `${titleText} - Jeko eSIM 旅遊知識專區`;
  const slug = post?.slug || "";
  const canonical = yoast?.canonical || absoluteUrl(`/blog/${slug}`);
  const image = bannerImage || yoast?.og_image?.[0]?.url || DEFAULT_OG_IMAGE;
  const published = post?.date || post?.published_at;
  const modified = post?.modified || post?.updated_at || published;

  const articleSchema = {
    "@type": "BlogPosting",
    headline: titleText,
    description,
    image: [image],
    datePublished: published,
    dateModified: modified,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: DEFAULT_LOGO },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    inLanguage: "zh-TW",
    keywords: "旅遊知識,出國攻略,eSIM,日本旅遊,Jeko eSIM",
  };

  return {
    title,
    description,
    keywords:
      "旅遊知識,出國攻略,eSIM教學,日本旅遊,韓國旅遊,Jeko eSIM," + titleText,
    canonical,
    ogImage: image,
    ogType: "article",
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "旅遊知識", path: "/blog" },
      { name: titleText, path: `/blog/${slug}` },
    ],
    jsonLd: [articleSchema],
    jsonLdTypes: ["BlogPosting", "BreadcrumbList"],
  };
}

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, "")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 全站 Organization + WebSite（每頁附加） */
export function buildSiteGraph() {
  return [
    {
      "@type": ["Organization", "OnlineStore"],
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME_FULL,
      alternateName: ["Jeko eSIM", "街口eSIM"],
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: DEFAULT_LOGO },
      email: BRAND.email,
      address: {
        "@type": "PostalAddress",
        addressCountry: "TW",
        addressRegion: "Taiwan",
      },
      geo: {
        "@type": "GeoCoordinates",
        addressCountry: "TW",
      },
      areaServed: BRAND.areaServed.map((code) => ({
        "@type": "Country",
        name: code,
      })),
      knowsAbout: [
        "Travel eSIM",
        "International roaming",
        "Japan travel",
        "Korea travel",
        "Accommodation recommendations",
        "Charter car service",
        "Travel guides",
      ],
      sameAs: BRAND.sameAs,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME_FULL,
      description:
        "Jeko eSIM 提供全球旅遊 eSIM、住宿推薦、包車服務與旅遊知識，一站式出國上網與旅遊加值服務。",
      inLanguage: "zh-TW",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/product?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

export function buildBreadcrumbSchema(breadcrumbs = []) {
  if (!breadcrumbs?.length) return null;
  return {
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildJsonLdGraph(seo = {}) {
  const graph = [...buildSiteGraph()];

  if (seo.breadcrumbs?.length) {
    const bc = buildBreadcrumbSchema(seo.breadcrumbs);
    if (bc) graph.push(bc);
  }

  if (seo.jsonLdTypes?.includes("FAQPage")) {
    graph.push(buildDefaultFaqSchema());
  }

  if (Array.isArray(seo.jsonLd)) {
    graph.push(...seo.jsonLd.filter(Boolean));
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

/** 全站 eSIM 常見問題結構化資料 */
export function buildDefaultFaqSchema() {
  return {
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "什麼是 eSIM？出國需要換實體卡嗎？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "eSIM 是內建於手機的虛擬 SIM 卡。購買 Jeko eSIM 後掃描 QR Code 即可開通，無需更換實體 SIM 卡，適合日本、韓國、東南亞及全球旅遊上網。",
        },
      },
      {
        "@type": "Question",
        name: "Jeko eSIM 支援哪些服務？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Jeko eSIM 提供各國旅遊 eSIM 上網方案，並整合住宿推薦、租車包車服務與旅遊知識攻略，一站式協助您規劃出國行程。",
        },
      },
      {
        "@type": "Question",
        name: "iPhone 如何安裝 eSIM？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "於 iPhone 設定 > 行動服務 > 加入 eSIM，掃描 Jeko eSIM 提供的 QR Code 即可完成安裝。詳細圖解請參考本站 iOS 安裝教學頁面。",
        },
      },
      {
        "@type": "Question",
        name: "如何查詢 eSIM 剩餘流量？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "可至 Jeko eSIM 流量查詢頁面輸入方案資訊查詢用量，亦可訂閱推播通知即時掌握剩餘流量與狀態。",
        },
      },
    ],
  };
}
