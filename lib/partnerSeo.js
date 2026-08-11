/**
 * 夥伴賣場 ↔ 主站 SEO 互聯
 * - 夥伴頁：可索引、結構化資料標 parentOrganization = Jeko
 * - 主站：Organization 與夥伴賣場互相連結（JSON-LD + 內連）
 */
import {
  SITE_URL,
  SITE_NAME,
  SITE_NAME_FULL,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  formatTitle,
} from "@/lib/seo.config";

export function partnerStoreHomeUrl(domain) {
  const d = String(domain || "").trim();
  if (!d) return SITE_URL;
  return `${SITE_URL}/p/${d}/`;
}

export function partnerPageUrl(domain, path = "") {
  const base = partnerStoreHomeUrl(domain).replace(/\/$/, "");
  const p = String(path || "").replace(/^\//, "");
  if (!p) return `${base}/`;
  return `${base}/${p}${p.endsWith("/") ? "" : "/"}`;
}

/** 夥伴私密頁（不索引） */
export function isPartnerPrivatePath(pathname = "") {
  const path = String(pathname || "").split("?")[0];
  return /^\/p\/[^/]+\/(account|cart|login)(\/|$)/i.test(path);
}

export function buildPartnerOrganizationNode(store) {
  const domain = store?.domain || "";
  const url = partnerStoreHomeUrl(domain);
  const name = store?.store_name || "夥伴賣場";
  const logo = store?.logo_url || null;
  const sameAs = [
    store?.social_instagram,
    store?.social_facebook,
    store?.social_line,
  ]
    .map((u) => String(u || "").trim())
    .filter(Boolean);

  return {
    "@type": ["Organization", "Store"],
    "@id": `${url}#organization`,
    name,
    url,
    description:
      store?.description ||
      `${name} — ${SITE_NAME} 官方授權夥伴賣場，提供旅遊 eSIM 方案。`,
    ...(logo
      ? { logo: { "@type": "ImageObject", url: absoluteUrl(logo) } }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
    brand: { "@id": `${SITE_URL}/#organization` },
    memberOf: { "@id": `${SITE_URL}/#organization` },
  };
}

export function buildPartnerWebsiteNode(store) {
  const domain = store?.domain || "";
  const url = partnerStoreHomeUrl(domain);
  const name = store?.store_name || "夥伴賣場";
  return {
    "@type": "WebSite",
    "@id": `${url}#website`,
    url,
    name: `${name}｜${SITE_NAME} 官方授權`,
    inLanguage: "zh-TW",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: { "@id": `${url}#organization` },
  };
}

/**
 * 夥伴頁 JSON-LD 節點（會再與主站 Organization 圖合併）
 */
export function buildPartnerJsonLdNodes({
  store,
  pageUrl,
  pageType = "WebPage",
  title,
  description,
  breadcrumbs = [],
  product = null,
  article = null,
  /** 主站對應商品 URL（有則標 isRelatedTo） */
  mainProductUrl = null,
  /** 主站文章正本 URL（夥伴文 canonical 用） */
  mainArticleUrl = null,
} = {}) {
  if (!store?.domain) return [];

  const storeUrl = partnerStoreHomeUrl(store.domain);
  const nodes = [
    buildPartnerOrganizationNode(store),
    buildPartnerWebsiteNode(store),
  ];

  if (breadcrumbs?.length) {
    nodes.push({
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumb`,
      itemListElement: breadcrumbs.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.path?.startsWith("http")
          ? item.path
          : absoluteUrl(item.path || "/"),
      })),
    });
  }

  if (pageType === "Product" && product) {
    nodes.push({
      "@type": "Product",
      "@id": `${pageUrl}#product`,
      name: product.name || title,
      description: strip(description || product.description || ""),
      image: product.images?.[0] || product.thumbnail || product.image || undefined,
      brand: { "@id": `${SITE_URL}/#organization` },
      seller: { "@id": `${storeUrl}#organization` },
      url: pageUrl,
      ...(mainProductUrl
        ? {
            isRelatedTo: { "@type": "Product", url: mainProductUrl },
            isSimilarTo: { "@type": "Product", url: mainProductUrl },
          }
        : {}),
      offers: {
        "@type": "Offer",
        url: pageUrl,
        priceCurrency: "TWD",
        availability: "https://schema.org/InStock",
        seller: { "@id": `${storeUrl}#organization` },
      },
    });
  } else if (pageType === "Article" && article) {
    nodes.push({
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      headline: article.title || title,
      description: strip(description || article.excerpt || ""),
      image: article.image || undefined,
      datePublished: article.dateIso || article.date || undefined,
      dateModified:
        article.updatedAtIso || article.dateIso || article.date || undefined,
      author: {
        "@type": "Organization",
        "@id": `${storeUrl}#organization`,
        name: store.store_name,
      },
      publisher: { "@id": `${SITE_URL}/#organization` },
      isPartOf: { "@id": `${storeUrl}#website` },
      mainEntityOfPage: mainArticleUrl || pageUrl,
      ...(mainArticleUrl ? { sameAs: [mainArticleUrl] } : {}),
    });
  } else {
    nodes.push({
      "@type": pageType === "CollectionPage" ? "CollectionPage" : "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description: strip(description || ""),
      isPartOf: { "@id": `${storeUrl}#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      publisher: { "@id": `${storeUrl}#organization` },
      significantLink: SITE_URL,
    });
  }

  return nodes;
}

function strip(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/**
 * 給 PartnerShopLayout / SeoHead 用的完整 SEO props
 */
export function buildPartnerShopSeo({
  store,
  title,
  description,
  path = "",
  canonicalUrl = null,
  ogImage = null,
  ogType = "website",
  pageType = "WebPage",
  breadcrumbs = null,
  product = null,
  article = null,
  mainProductUrl = null,
  mainArticleUrl = null,
  noindex = false,
  keywords = null,
} = {}) {
  const domain = store?.domain || "";
  const storeName = store?.store_name || "夥伴賣場";
  const pageUrl =
    canonicalUrl ||
    (domain ? partnerPageUrl(domain, path) : SITE_URL);
  const desc =
    description ||
    store?.description ||
    `${storeName} — ${SITE_NAME} 官方授權夥伴賣場，選購旅遊 eSIM，與 ${SITE_NAME_FULL} 商品同源。`;
  const pageTitle = title
    ? `${title}｜${storeName}`
    : `${storeName}｜${SITE_NAME} 官方授權賣場`;

  const crumbs =
    breadcrumbs ||
    [
      { name: SITE_NAME, path: "/" },
      { name: "官方授權夥伴賣場", path: `/p/${domain}/` },
      ...(path
        ? [{ name: title || "頁面", path: `/p/${domain}/${String(path).replace(/^\//, "")}` }]
        : []),
    ];

  const jsonLd = buildPartnerJsonLdNodes({
    store,
    pageUrl,
    pageType,
    title: pageTitle,
    description: desc,
    breadcrumbs: crumbs,
    product,
    article,
    mainProductUrl,
    mainArticleUrl,
  });

  return {
    title: pageTitle,
    description: desc,
    keywords:
      keywords ||
      `${storeName},${SITE_NAME},eSIM,旅遊eSIM,官方授權,出國上網`,
    canonical: pageUrl,
    ogImage: ogImage || store?.logo_url || DEFAULT_OG_IMAGE,
    ogImageAlt: pageTitle,
    ogType,
    robots: noindex ? "noindex, nofollow" : "index, follow",
    noindex,
    breadcrumbs: crumbs,
    jsonLd,
    jsonLdTypes: [],
  };
}

/** 主站 Organization 可附加的授權賣場連結（sameAs 擴充） */
export function buildPartnerSameAsLinks(stores = []) {
  return (stores || [])
    .map((s) => partnerStoreHomeUrl(s.domain))
    .filter(Boolean)
    .slice(0, 50);
}

export { formatTitle };
