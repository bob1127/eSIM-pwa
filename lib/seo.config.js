/**
 * Jeko eSIM 全站 SEO 設定
 * 涵蓋：eSIM 販售、住宿推薦、旅遊知識、包車服務
 */

import { PRODUCTION_SITE_URL } from "./siteUrl";
import { SUPPORT_EMAIL } from "./contactUi";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_SITE_URL
).replace(/\/$/, "");

export const SITE_NAME = "Jeko eSIM";
export const SITE_NAME_FULL = "Jeko eSIM 接口eSIM";
export const SITE_TAGLINE = "連接您與世界的距離";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/icons/icon-512x512.png`;
export const DEFAULT_LOGO = `${SITE_URL}/icons/icon-512x512.png`;

export const BRAND = {
  legalName: "Jeko eSIM",
  email: SUPPORT_EMAIL,
  locale: "zh-TW",
  language: "zh-TW",
  country: "TW",
  region: "TW",
  placename: "Taiwan",
  areaServed: ["TW", "JP", "KR", "TH", "MY", "SG", "US", "EU"],
  sameAs: [
    "https://www.facebook.com/profile.php?id=61591030890082",
    "https://lin.ee/y6tdx5q",
    "https://www.instagram.com/jekoesim/",
  ],
};

/** 全站社群連結 — Navbar / Footer / 右側浮層共用 */
export const SOCIAL_LINKS = {
  instagram:
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
    "https://www.instagram.com/jekoesim/",
  instagram2: process.env.NEXT_PUBLIC_INSTAGRAM_URL_2 || "",
  facebook:
    process.env.NEXT_PUBLIC_FACEBOOK_URL ||
    "https://www.facebook.com/profile.php?id=61591030890082",
  line: process.env.NEXT_PUBLIC_LINE_OA_URL || "https://lin.ee/y6tdx5q",
};

export const DEFAULT_KEYWORDS = [
  "Jeko eSIM",
  "接口eSIM",
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
      "Jeko eSIM 接口eSIM 提供日本、韓國、東南亞及全球旅遊 eSIM 上網方案。一站整合住宿推薦、租車包車服務與旅遊知識攻略，免換實體卡、QR Code 即開即用，讓出國上網更輕鬆。",
    keywords:
      "Jeko eSIM,接口eSIM,旅遊eSIM,日本eSIM,韓國eSIM,住宿推薦,包車服務,旅遊知識,出國上網,免換卡",
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
      "認識 Jeko eSIM 接口eSIM：專注旅遊 eSIM、住宿推薦、包車服務與旅遊知識，以可靠連線與貼心在地資源，陪伴每一位旅人安心出發。",
    keywords: "Jeko eSIM,接口eSIM,關於我們,旅遊eSIM品牌,出國上網服務",
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
  "/promo": {
    title: `最新優惠・限時特惠｜購物金與折價券`,
    description:
      "查看 Jeko eSIM 最新優惠 Banner：新會員購物金、限時折價券與出國上網活動，立即加入官方 LINE 領取。",
    keywords: "eSIM優惠,購物金,折價券,限時特惠,LINE優惠,Jeko eSIM",
    jsonLdTypes: ["WebPage", "BreadcrumbList"],
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "最新優惠", path: "/promo" },
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
  "/member-offers": {
    title: `會員優惠｜新會員折扣、介紹好朋友、LINE 專屬`,
    description:
      "Jeko eSIM 會員優惠規劃：新會員首購折扣、介紹好朋友雙邊回饋、官方 LINE 優先領獎，以及回購、連假季、多人購等旅遊 eSIM 優惠藍圖。",
    keywords:
      "會員優惠,新會員折扣,介紹好朋友,推薦碼,LINE優惠,eSIM折扣,Jeko eSIM",
    jsonLdTypes: ["WebPage", "BreadcrumbList"],
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "會員優惠", path: "/member-offers" },
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
      "Jeko eSIM 服務條款：說明 eSIM 購買、使用、退款、合作夥伴（專屬連結／專屬商店）分潤及相關權利義務。",
    keywords: "服務條款,使用條款,Jeko eSIM,合作夥伴,專屬連結,專屬商店",
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
    ogImageAlt: override.ogImageAlt || staticSeo.ogImageAlt,
    ogType: override.ogType || staticSeo.ogType || "website",
    robots: override.robots || staticSeo.robots || (noindex ? "noindex, nofollow" : "index, follow"),
    breadcrumbs: override.breadcrumbs || staticSeo.breadcrumbs,
    jsonLd: override.jsonLd,
    jsonLdTypes: override.jsonLdTypes || staticSeo.jsonLdTypes,
    noindex,
    articlePublishedTime: override.articlePublishedTime,
    articleModifiedTime: override.articleModifiedTime,
    articleSection: override.articleSection,
    articleTags: override.articleTags,
    articleAuthor: override.articleAuthor,
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

/** 商品內頁 SEO（可被 metadata.seo_title / seo_description / seo_keywords 覆寫） */
export function buildProductSeo(product, variation, categoryHandle) {
  const meta = product?.metadata || {};
  const baseName = product?.name || "eSIM 方案";
  const productSubtitle = product?.subtitle?.trim();
  const variantLabel = variation?.title?.trim();
  const productName = [baseName, productSubtitle, variantLabel]
    .filter((part) => part && part !== baseName)
    .reduce(
      (acc, part) => (acc.includes(part) ? acc : [...acc, part]),
      [baseName],
    )
    .join("｜");
  const customTitle = String(meta.seo_title || "").trim();
  const title =
    customTitle || `${productName}｜${SITE_NAME_FULL} 出國上網`;
  const customDesc = String(meta.seo_description || "").trim();
  const rawDesc = stripHtml(product?.description || "");
  const description =
    customDesc ||
    rawDesc.slice(0, 155) ||
    `購買 ${productName}：Jeko eSIM 提供即買即用旅遊 eSIM，免換卡、掃描 QR Code 即可上網。支援多種天數與流量，出國更省心。`;
  const customKeywords = String(meta.seo_keywords || "").trim();
  const keywords =
    customKeywords ||
    `${baseName},${productSubtitle || ""},${variantLabel || ""},${product?.name || ""} eSIM,旅遊eSIM,出國上網,Jeko eSIM,免換卡`;
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
    name: customTitle || productName,
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
      {
        name: variantLabel || productSubtitle || baseName,
        path: `/product/${categoryHandle}/${product?.slug}`,
      },
    ],
    jsonLd: [productSchema],
    jsonLdTypes: ["Product", "BreadcrumbList"],
  };
}

/** 部落格文章 SEO + GEO 結構化資料（最完整） */
export function buildBlogPostSeo(
  post,
  bannerImage,
  yoast = {},
  options = {},
) {
  const {
    country = null,
    categoryNames = [],
    relatedPosts = [],
    isArticle = false,
  } = options;

  const titleText = stripHtml(post?.title?.rendered || post?.title || "旅遊知識");
  const title = yoast?.title || `${titleText}｜Jeko eSIM 旅遊知識`;
  const excerpt = stripHtml(post?.excerpt?.rendered || "");
  const plainContent = stripHtml(post?.content?.rendered || "");
  const contentDesc = plainContent.slice(0, 155);
  const customDescription = String(post?.meta?.jeko_description || "").trim();
  const customKeywords = String(post?.meta?.jeko_keywords || "")
    .split(/[,，、]/)
    .map((k) => k.trim())
    .filter(Boolean);
  const description =
    customDescription ||
    yoast?.description ||
    excerpt ||
    contentDesc ||
    `${titleText} - Jeko eSIM 旅遊知識專區`;
  const slug = post?.slug || "";
  const canonical = yoast?.canonical || absoluteUrl(`/blog/${slug}`);
  const imageUrl = absoluteUrl(
    bannerImage || yoast?.og_image?.[0]?.url || DEFAULT_OG_IMAGE,
  );
  const published = post?.date || post?.published_at;
  const modified = post?.modified || post?.updated_at || published;

  const tagNames = getPostTagNames(post);
  const sections = uniqueStrings([
    isArticle ? "旅遊文章" : "旅遊知識",
    country,
    ...categoryNames,
  ]);
  const keywordList = uniqueStrings([
    ...customKeywords,
    titleText,
    country,
    ...categoryNames,
    ...tagNames,
    "旅遊知識",
    "出國攻略",
    "eSIM",
    "Jeko eSIM",
    country ? `${country}旅遊` : null,
    country ? `${country}eSIM` : null,
  ]);

  const wordCount = estimateWordCount(plainContent);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 400));
  const faqsFromMeta = parseJekoQaMeta(post?.meta?.jeko_qa);
  const faqs =
    faqsFromMeta.length >= 1
      ? faqsFromMeta
      : extractFaqsFromHtml(post?.content?.rendered || "");
  const place = country ? buildPlaceSchema(country) : null;

  const imageObject = {
    "@type": "ImageObject",
    "@id": `${canonical}#primaryimage`,
    url: imageUrl,
    contentUrl: imageUrl,
    caption: titleText,
    inLanguage: "zh-TW",
  };

  const authorOrg = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME_FULL,
    url: SITE_URL,
  };

  const publisher = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME_FULL,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: DEFAULT_LOGO,
      width: 512,
      height: 512,
    },
  };

  const articleSchema = {
    "@type": ["BlogPosting", "Article"],
    "@id": `${canonical}#article`,
    headline: titleText,
    alternativeHeadline: excerpt ? excerpt.slice(0, 110) : undefined,
    description,
    abstract: excerpt || contentDesc,
    image: [imageObject],
    thumbnailUrl: imageUrl,
    datePublished: published,
    dateModified: modified,
    author: authorOrg,
    creator: authorOrg,
    publisher,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "zh-TW",
    isAccessibleForFree: true,
    isFamilyFriendly: true,
    wordCount,
    timeRequired: `PT${readingMinutes}M`,
    articleSection: sections[0] || "旅遊知識",
    keywords: keywordList.join(", "),
    about: uniqueStrings([
      "Travel eSIM",
      "Travel guide",
      country,
      ...categoryNames,
    ]).map((name) =>
      name === country && place
        ? { "@id": `${canonical}#place` }
        : { "@type": "Thing", name },
    ),
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [
        ".seo-speakable-title",
        ".seo-speakable-summary",
        "h1",
        "article h2",
      ],
    },
    potentialAction: {
      "@type": "ReadAction",
      target: [canonical],
    },
  };

  if (place) {
    articleSchema.contentLocation = { "@id": `${canonical}#place` };
    articleSchema.spatialCoverage = { "@id": `${canonical}#place` };
  }

  const webPageSchema = {
    "@type": "WebPage",
    "@id": canonical,
    url: canonical,
    name: titleText,
    description,
    inLanguage: "zh-TW",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    primaryImageOfPage: { "@id": `${canonical}#primaryimage` },
    breadcrumb: { "@id": `${canonical}#breadcrumb` },
    datePublished: published,
    dateModified: modified,
    speakable: articleSchema.speakable,
  };

  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    "@id": `${canonical}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "首頁",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "旅遊知識",
        item: absoluteUrl("/blog"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: titleText,
        item: canonical,
      },
    ],
  };

  const jsonLd = [webPageSchema, articleSchema, breadcrumbSchema, imageObject];

  if (place) {
    jsonLd.push({
      ...place,
      "@id": `${canonical}#place`,
    });
  }

  if (faqs.length >= 1) {
    jsonLd.push({
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answer,
        },
      })),
    });
  }

  const relatedList = (relatedPosts || [])
    .filter((p) => p?.slug && p.slug !== slug)
    .slice(0, 8);
  if (relatedList.length) {
    jsonLd.push({
      "@type": "ItemList",
      "@id": `${canonical}#related`,
      name: `${titleText}｜相關文章`,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: relatedList.length,
      itemListElement: relatedList.map((p, i) => {
        const relatedTitle = stripHtml(p.title?.rendered || p.title || "");
        const relatedUrl = absoluteUrl(`/blog/${p.slug}`);
        return {
          "@type": "ListItem",
          position: i + 1,
          url: relatedUrl,
          name: relatedTitle,
          item: {
            "@type": "BlogPosting",
            headline: relatedTitle,
            url: relatedUrl,
            datePublished: p.date || undefined,
          },
        };
      }),
    });
  }

  return {
    title,
    description,
    keywords: keywordList.join(", "),
    canonical,
    ogImage: imageUrl,
    ogType: "article",
    ogImageAlt: titleText,
    robots:
      "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    breadcrumbs: [
      { name: "首頁", path: "/" },
      { name: "旅遊知識", path: "/blog" },
      { name: titleText, path: `/blog/${slug}` },
    ],
    jsonLd,
    articlePublishedTime: published,
    articleModifiedTime: modified,
    articleSection: sections[0] || "旅遊知識",
    articleTags: uniqueStrings([...tagNames, ...categoryNames, country]),
    articleAuthor: SITE_NAME_FULL,
  };
}

function uniqueStrings(list = []) {
  const out = [];
  const seen = new Set();
  list.forEach((v) => {
    const s = String(v || "").trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  });
  return out;
}

function getPostTagNames(post) {
  const terms = post?._embedded?.["wp:term"];
  if (!Array.isArray(terms)) return [];
  return terms
    .flat()
    .filter((t) => t?.taxonomy === "post_tag" && t?.name)
    .map((t) => t.name);
}

function estimateWordCount(text) {
  if (!text) return 0;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = text
    .replace(/[\u4e00-\u9fff]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return cjk + latin;
}

/** 解析 WP Code Snippets 欄位 jeko_qa（JSON 或 Q/A 純文字） */
export function parseJekoQaMeta(raw) {
  if (!raw || typeof raw !== "string") return [];
  const text = raw.trim();
  if (!text) return [];

  // JSON 陣列
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => ({
            question: stripHtml(
              String(item?.question || item?.q || item?.name || "").trim(),
            ),
            answer: stripHtml(
              String(item?.answer || item?.a || item?.text || "").trim(),
            ),
          }))
          .filter((f) => f.question && f.answer)
          .slice(0, 20);
      }
    } catch {
      /* fall through to Q/A text */
    }
  }

  // Q: … / A: … 區塊
  const faqs = [];
  const blocks = text.split(/\n\s*\n+/);
  for (const block of blocks) {
    const qMatch = block.match(/^\s*Q[:：]\s*([\s\S]+?)(?:\n\s*A[:：]|$)/i);
    const aMatch = block.match(/\n\s*A[:：]\s*([\s\S]+)$/i);
    if (qMatch && aMatch) {
      const question = stripHtml(qMatch[1].trim());
      const answer = stripHtml(aMatch[1].trim());
      if (question && answer) faqs.push({ question, answer });
      continue;
    }
    // 單行連續：Q: … A: …
    const line = block.match(
      /^\s*Q[:：]\s*(.+?)\s+A[:：]\s*([\s\S]+)$/i,
    );
    if (line) {
      const question = stripHtml(line[1].trim());
      const answer = stripHtml(line[2].trim());
      if (question && answer) faqs.push({ question, answer });
    }
  }

  // 整篇用多組 Q:/A: 無空行分隔
  if (!faqs.length) {
    const pairRe = /Q[:：]\s*([\s\S]*?)\s*A[:：]\s*([\s\S]*?)(?=\s*Q[:：]|$)/gi;
    let m;
    while ((m = pairRe.exec(text)) && faqs.length < 20) {
      const question = stripHtml(m[1].trim());
      const answer = stripHtml(m[2].trim());
      if (question && answer) faqs.push({ question, answer });
    }
  }

  // Q1：問題\n答案…\nQ2：…
  if (!faqs.length) {
    const numbered = [
      ...text.replace(/\r\n/g, "\n").matchAll(
        /Q\s*(\d+)\s*[:：]\s*([^\n]+)\n([\s\S]*?)(?=\nQ\s*\d+\s*[:：]|$)/gi,
      ),
    ];
    for (const match of numbered) {
      const question = stripHtml(match[2].trim());
      const answer = stripHtml(match[3].trim());
      if (question && answer) faqs.push({ question, answer });
    }
  }

  return faqs.slice(0, 20);
}

/** 從內文抽取 FAQ（細節／accordion／Q&A 標題）供 FAQPage */
export function extractFaqsFromHtml(html) {
  if (!html) return [];
  const faqs = [];
  const detailsRe =
    /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  let m;
  while ((m = detailsRe.exec(html)) && faqs.length < 12) {
    const q = stripHtml(m[1]);
    const a = stripHtml(m[2]);
    if (q && a && a.length > 8) faqs.push({ question: q, answer: a.slice(0, 500) });
  }

  // h2/h3 問句 + 後續段落
  if (faqs.length < 2) {
    const headingRe =
      /<h([23])[^>]*>([\s\S]*?)<\/h\1>\s*((?:<p[^>]*>[\s\S]*?<\/p>\s*)+)/gi;
    while ((m = headingRe.exec(html)) && faqs.length < 12) {
      const q = stripHtml(m[2]);
      const a = stripHtml(m[3]);
      if (/[?？]|嗎|如何|怎麼|什麼|為何|可以/.test(q) && a && a.length > 12) {
        faqs.push({ question: q, answer: a.slice(0, 500) });
      }
    }
  }

  return faqs;
}

/** 旅遊目的地 Place／GEO（供 AI／搜尋引擎理解空間實體） */
export function buildPlaceSchema(countryName) {
  const placeMap = {
    日本: {
      name: "Japan",
      alternateName: ["日本", "Japan"],
      addressCountry: "JP",
    },
    韓國: {
      name: "South Korea",
      alternateName: ["韓國", "South Korea", "Korea"],
      addressCountry: "KR",
    },
    泰國: {
      name: "Thailand",
      alternateName: ["泰國", "Thailand"],
      addressCountry: "TH",
    },
    馬來西亞: {
      name: "Malaysia",
      alternateName: ["馬來西亞", "Malaysia"],
      addressCountry: "MY",
    },
    新加坡: {
      name: "Singapore",
      alternateName: ["新加坡", "Singapore"],
      addressCountry: "SG",
    },
    中國: {
      name: "China",
      alternateName: ["中國", "China"],
      addressCountry: "CN",
    },
    台灣: {
      name: "Taiwan",
      alternateName: ["台灣", "Taiwan"],
      addressCountry: "TW",
    },
    越南: {
      name: "Vietnam",
      alternateName: ["越南", "Vietnam"],
      addressCountry: "VN",
    },
    歐洲: {
      name: "Europe",
      alternateName: ["歐洲", "Europe"],
      addressCountry: undefined,
    },
  };

  const hit =
    placeMap[countryName] ||
    Object.entries(placeMap).find(([k]) =>
      String(countryName || "").includes(k),
    )?.[1];

  if (!hit) {
    return {
      "@type": ["Place", "TouristDestination"],
      name: countryName,
      alternateName: [countryName],
    };
  }

  return {
    "@type": ["Place", "TouristDestination"],
    name: hit.name,
    alternateName: hit.alternateName,
    address: hit.addressCountry
      ? {
          "@type": "PostalAddress",
          addressCountry: hit.addressCountry,
        }
      : undefined,
    geo: hit.addressCountry
      ? {
          "@type": "GeoCoordinates",
          addressCountry: hit.addressCountry,
        }
      : undefined,
  };
}

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, "")
    .replace(/&#\d+;/g, "")
    .replace(/&[a-z]+;/gi, " ")
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
      alternateName: ["Jeko eSIM", "接口eSIM"],
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

  const jsonLdItems = Array.isArray(seo.jsonLd)
    ? seo.jsonLd.filter(Boolean)
    : [];
  const hasCustomBreadcrumb = jsonLdItems.some((item) => {
    const t = item?.["@type"];
    return (
      t === "BreadcrumbList" ||
      (Array.isArray(t) && t.includes("BreadcrumbList")) ||
      String(item?.["@id"] || "").includes("#breadcrumb")
    );
  });

  if (seo.breadcrumbs?.length && !hasCustomBreadcrumb) {
    const bc = buildBreadcrumbSchema(seo.breadcrumbs);
    if (bc) graph.push(bc);
  }

  if (seo.jsonLdTypes?.includes("FAQPage")) {
    const hasFaq = jsonLdItems.some((item) => {
      const t = item?.["@type"];
      return t === "FAQPage" || (Array.isArray(t) && t.includes("FAQPage"));
    });
    if (!hasFaq) graph.push(buildDefaultFaqSchema());
  }

  graph.push(...jsonLdItems);

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
