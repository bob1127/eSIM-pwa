/**
 * 商品頁完整 JSON-LD（Google Product / Merchant / GEO）
 * 評分 4.9 需同時出現在 schema 與頁面可見區塊，搜尋才較容易出星級。
 */
import { PRODUCTION_SITE_URL } from "./siteUrl";
import { resolveCoverageCountry } from "./networkCoverageCountries";
import { collectProductFaqItems } from "./productFaqContent";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_SITE_URL
).replace(/\/$/, "");
const SITE_NAME = "Jeko eSIM";
const SITE_AI_SUMMARY =
  "Jeko eSIM 是台灣一家專門販售 eSIM 以及其他旅遊服務的公司，提供全球旅遊 eSIM、住宿推薦、旅遊推薦、包車服務與旅遊知識。";
const DEFAULT_LOGO = `${SITE_URL}/icons/icon-512x512.png`;

function absoluteUrl(path = "/") {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const PRODUCT_AGGREGATE_RATING = {
  ratingValue: 4.9,
  reviewCount: 247,
  ratingCount: 247,
  bestRating: 5,
  worstRating: 1,
};

const ORG_ID = `${SITE_URL}/#organization`;

function compact(value) {
  if (Array.isArray(value)) {
    const list = value.map(compact).filter((v) => v != null && v !== "");
    return list.length ? list : undefined;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const c = compact(v);
      if (c === undefined || c === null || c === "") continue;
      out[k] = c;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return value;
}

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Medusa 金額：大於 1000 視為「分」再轉成元 */
export function toTwdAmount(price) {
  if (price == null || price === "") return undefined;
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const twd = n > 1000 ? n / 100 : n;
  return Number(twd.toFixed(0));
}

function priceValidUntil() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function imageList(product) {
  const urls = [];
  for (const u of product?.image_urls || []) {
    if (u) urls.push(absoluteUrl(u));
  }
  if (product?.image_url) urls.push(absoluteUrl(product.image_url));
  if (product?.thumbnail) urls.push(absoluteUrl(product.thumbnail));
  const unique = [...new Set(urls.filter(Boolean))];
  return unique.length ? unique : [absoluteUrl("/icons/icon-512x512.png")];
}

function imageObjects(urls, caption, canonical) {
  return urls.slice(0, 8).map((url, i) => ({
    "@type": "ImageObject",
    "@id": i === 0 ? `${canonical}#primaryimage` : `${canonical}#image-${i + 1}`,
    url,
    contentUrl: url,
    caption,
    inLanguage: "zh-TW",
  }));
}

function destinationFromProduct(product, categoryHandle) {
  const cov = resolveCoverageCountry(product, categoryHandle);
  if (cov) {
    return {
      nameZh: cov.nameZh,
      code: cov.code,
    };
  }
  const handle = String(categoryHandle || "").toLowerCase();
  const MAP = {
    japan: ["日本", "JP"],
    jp: ["日本", "JP"],
    korea: ["韓國", "KR"],
    kr: ["韓國", "KR"],
    china: ["中國", "CN"],
    cn: ["中國", "CN"],
    thailand: ["泰國", "TH"],
    th: ["泰國", "TH"],
    vietnam: ["越南", "VN"],
    vn: ["越南", "VN"],
    malaysia: ["馬來西亞", "MY"],
    my: ["馬來西亞", "MY"],
    singapore: ["新加坡", "SG"],
    sg: ["新加坡", "SG"],
    taiwan: ["台灣", "TW"],
    tw: ["台灣", "TW"],
    usa: ["美國", "US"],
    us: ["美國", "US"],
    uk: ["英國", "GB"],
    europe: ["歐洲", "EU"],
    eu: ["歐洲", "EU"],
    hongkong: ["香港", "HK"],
    hk: ["香港", "HK"],
  };
  const hit = MAP[handle];
  if (hit) return { nameZh: hit[0], code: hit[1] };
  return { nameZh: "", code: "" };
}

function additionalProperties(variation, destName) {
  const attrs = variation?.attributes || {};
  const props = [];
  if (destName) {
    props.push({
      "@type": "PropertyValue",
      name: "目的地",
      value: destName,
    });
  }
  if (attrs.days) {
    props.push({
      "@type": "PropertyValue",
      name: "使用天數",
      value: `${attrs.days}天`,
      unitCode: "DAY",
    });
  }
  if (attrs.data_amount) {
    props.push({
      "@type": "PropertyValue",
      name: "數據量",
      value: String(attrs.data_amount),
    });
  }
  if (attrs.telecom) {
    props.push({
      "@type": "PropertyValue",
      name: "電信商",
      value: String(attrs.telecom),
    });
  }
  if (attrs.line) {
    props.push({
      "@type": "PropertyValue",
      name: "線路類型",
      value: String(attrs.line),
    });
  }
  if (attrs.speed_rule) {
    props.push({
      "@type": "PropertyValue",
      name: "速度規則",
      value: String(attrs.speed_rule),
    });
  }
  props.push({
    "@type": "PropertyValue",
    name: "商品類型",
    value: "旅遊 eSIM（數位商品）",
  });
  return props;
}

function aggregateRatingNode() {
  const r = PRODUCT_AGGREGATE_RATING;
  return {
    "@type": "AggregateRating",
    ratingValue: r.ratingValue,
    reviewCount: r.reviewCount,
    ratingCount: r.ratingCount,
    bestRating: r.bestRating,
    worstRating: r.worstRating,
  };
}

function merchantReturnPolicy() {
  return {
    "@type": "MerchantReturnPolicy",
    "@id": `${SITE_URL}/refund-policy#policy`,
    applicableCountry: "TW",
    returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    merchantReturnLink: absoluteUrl("/refund-policy"),
    refundType: "https://schema.org/FullRefund",
    returnPolicyCountry: {
      "@type": "Country",
      name: "TW",
    },
  };
}

function digitalDeliveryDetails() {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: 0,
      currency: "TWD",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "TW",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 0,
        unitCode: "MIN",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 5,
        unitCode: "MIN",
      },
    },
  };
}

function offerNode({ url, price, sku }) {
  const amount = toTwdAmount(price);
  if (amount == null) return undefined;
  return {
    "@type": "Offer",
    url,
    price: amount,
    priceCurrency: "TWD",
    priceValidUntil: priceValidUntil(),
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    sku: sku || undefined,
    seller: { "@id": ORG_ID },
    checkoutPageURLTemplate: absoluteUrl("/Cart"),
    hasMerchantReturnPolicy: { "@id": `${SITE_URL}/refund-policy#policy` },
    shippingDetails: digitalDeliveryDetails(),
    acceptedPaymentMethod: [
      "https://schema.org/CreditCard",
      "http://purl.org/goodrelations/v1#ByBankTransferInAdvance",
    ],
    areaServed: {
      "@type": "Country",
      name: "TW",
    },
  };
}

function aggregateOfferNode(url, variations) {
  const prices = (variations || [])
    .map((v) => toTwdAmount(v?.price))
    .filter((n) => n != null);
  if (!prices.length) return undefined;
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return {
    "@type": "AggregateOffer",
    url,
    priceCurrency: "TWD",
    lowPrice: low,
    highPrice: high,
    offerCount: prices.length,
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": ORG_ID },
    hasMerchantReturnPolicy: { "@id": `${SITE_URL}/refund-policy#policy` },
    shippingDetails: digitalDeliveryDetails(),
    offers: (variations || [])
      .slice(0, 24)
      .map((v) =>
        offerNode({
          url,
          price: v.price,
          sku: v.sku,
        }),
      )
      .filter(Boolean),
  };
}

function buildProductFaqs(productName, destName, description) {
  const dest = destName || "目的地";
  return [
    {
      question: `${productName} 適合誰使用？`,
      answer:
        description ||
        `${productName} 是 Jeko eSIM 旅遊上網方案，適合前往${dest}的旅客。購買後以 Email 收到 QR Code，掃描即可安裝，免換實體 SIM 卡。`,
    },
    {
      question: `如何安裝 ${dest} eSIM？`,
      answer:
        "付款完成後約 5 分鐘內，QR Code 會寄至您的信箱。iPhone 請到設定 > 行動服務 > 加入 eSIM 掃描；Android 請依機型至 SIM 卡管理員新增 eSIM。建議抵達目的地或需要上網時再安裝啟用。詳細圖解見本站安裝教學。",
    },
    {
      question: "購買後多久可以使用？",
      answer:
        "結帳完成後預計 5 分鐘內將 QR Code 寄至信箱。此為數位商品，無實體運費與物流等待。請確認手機支援 eSIM 並已解除電信鎖。",
    },
    {
      question: "可以退貨或換方案嗎？",
      answer:
        "Jeko eSIM 為數位商品。標示為原生 eSIM 者售出後原則上不退款；非原生／漫遊方案依安裝與激活狀態適用退換貨政策。詳見本站退換貨政策頁。",
    },
    {
      question: "有支援電子發票嗎？",
      answer:
        "有。Jeko eSIM 支援開立電子發票，付款完成後依結帳 Email 或會員資料開立；公司戶請填寫統一編號與發票抬頭。",
    },
  ];
}

function faqPageNode(canonical, faqs) {
  if (!faqs?.length) return null;
  return {
    "@type": "FAQPage",
    "@id": `${canonical}#faq`,
    inLanguage: "zh-TW",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

function howToInstallNode(canonical, destName) {
  const dest = destName || "目的地";
  return {
    "@type": "HowTo",
    "@id": `${canonical}#howto`,
    name: `如何安裝 ${dest} 旅遊 eSIM`,
    description:
      "購買 Jeko eSIM 後掃描 QR Code 即可開通，無需更換實體 SIM 卡。",
    inLanguage: "zh-TW",
    totalTime: "PT5M",
    tool: [{ "@type": "HowToTool", name: "支援 eSIM 的智慧型手機" }],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "完成結帳",
        text: "在 Jeko eSIM 選擇天數與流量並完成付款。",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "收取 QR Code",
        text: "約 5 分鐘內於 Email 或會員中心取得 eSIM QR Code。",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "掃描安裝",
        text: "於手機行動服務設定加入 eSIM，掃描 QR Code 完成安裝。",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "抵達後啟用",
        text: "建議抵達目的地後再開啟該行動方案與漫遊數據。",
      },
    ],
  };
}

/**
 * 商品內頁完整 @graph 節點（不含全站 Organization，由 buildJsonLdGraph 合併）
 */
export function buildProductJsonLdNodes({
  product,
  variation,
  variations = [],
  categoryHandle,
  name,
  description,
  canonical,
} = {}) {
  const dest = destinationFromProduct(product, categoryHandle);
  const images = imageList(product);
  const imageObjs = imageObjects(images, name, canonical);
  const sku = variation?.sku || product?.slug || product?.handle;
  const currentPrice = variation?.price ?? product?.price;
  const offers =
    variations.length > 1
      ? aggregateOfferNode(canonical, variations)
      : offerNode({ url: canonical, price: currentPrice, sku });

  const productNode = {
    "@type": ["Product", "ProductModel"],
    "@id": `${canonical}#product`,
    name,
    alternateName: product?.subtitle || undefined,
    description,
    image: imageObjs,
    sku,
    mpn: sku,
    productID: product?.id || sku,
    url: canonical,
    mainEntityOfPage: `${canonical}#webpage`,
    brand: {
      "@type": "Brand",
      "@id": `${SITE_URL}/#brand`,
      name: SITE_NAME,
      logo: DEFAULT_LOGO,
    },
    manufacturer: { "@id": ORG_ID },
    category: dest.nameZh ? `${dest.nameZh} 旅遊 eSIM` : "Travel eSIM",
    itemCondition: "https://schema.org/NewCondition",
    material: "eSIM",
    isFamilyFriendly: true,
    inLanguage: "zh-TW",
    countryOfOrigin: {
      "@type": "Country",
      name: "TW",
    },
    audience: {
      "@type": "Audience",
      audienceType: "國際旅客",
      geographicArea: dest.code
        ? { "@type": "Country", name: dest.code }
        : undefined,
    },
    additionalProperty: additionalProperties(variation, dest.nameZh),
    aggregateRating: aggregateRatingNode(),
    offers,
    isRelatedTo: dest.nameZh
      ? {
          "@type": "Trip",
          name: `${dest.nameZh}旅遊`,
          itinerary: {
            "@type": "Place",
            name: dest.nameZh,
            address: dest.code
              ? { "@type": "PostalAddress", addressCountry: dest.code }
              : undefined,
          },
        }
      : undefined,
  };

  if (dest.nameZh) {
    productNode.areaServed = {
      "@type": "Country",
      name: dest.code || dest.nameZh,
    };
    productNode.about = {
      "@type": "Place",
      "@id": `${canonical}#destination`,
      name: dest.nameZh,
      address: {
        "@type": "PostalAddress",
        addressCountry: dest.code || undefined,
      },
    };
  }

  const variantNodes = (variations || []).slice(0, 24).map((v, i) => {
    const vName = v.title
      ? `${name}｜${v.title}`
      : `${name} 方案 ${i + 1}`;
    const vSku = v.sku || `${sku}-${i + 1}`;
    return {
      "@type": "Product",
      "@id": `${canonical}#variant-${vSku}`,
      name: vName,
      sku: vSku,
      isVariantOf: { "@id": `${canonical}#product` },
      image: images[0],
      brand: { "@id": `${SITE_URL}/#brand` },
      offers: offerNode({
        url: canonical,
        price: v.price,
        sku: vSku,
      }),
      additionalProperty: additionalProperties(v, dest.nameZh),
    };
  });

  const productGroup =
    variantNodes.length > 1
      ? {
          "@type": "ProductGroup",
          "@id": `${canonical}#group`,
          name,
          description,
          url: canonical,
          brand: { "@id": `${SITE_URL}/#brand` },
          productGroupID: product?.slug || product?.handle || sku,
          variesBy: [
            "https://schema.org/duration",
            "https://schema.org/additionalProperty",
          ],
          hasVariant: variantNodes.map((n) => ({ "@id": n["@id"] })),
        }
      : null;

  const carrierFaqs = collectProductFaqItems(product, { limit: 12 });
  const faqs =
    carrierFaqs.length >= 2
      ? carrierFaqs
      : buildProductFaqs(name, dest.nameZh, description);

  const webPage = {
    "@type": "ItemPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name,
    description,
    inLanguage: "zh-TW",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${canonical}#product` },
    primaryImageOfPage: { "@id": `${canonical}#primaryimage` },
    mainEntity: { "@id": `${canonical}#product` },
    publisher: { "@id": ORG_ID },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [
        "h1",
        ".product-seo-summary",
        ".product-rating-badge",
        ".jeko-faq-trigger",
        ".jeko-section-head",
      ],
    },
    significantLink: [
      absoluteUrl("/operation-ios"),
      absoluteUrl("/support"),
      absoluteUrl("/refund-policy"),
      absoluteUrl("/qa"),
    ],
  };

  return compact(
    [
      merchantReturnPolicy(),
      productNode,
      productGroup,
      ...variantNodes,
      webPage,
      faqPageNode(canonical, faqs),
      howToInstallNode(canonical, dest.nameZh),
    ].filter(Boolean),
  );
}

/** 分類／商店列表：ItemList 內嵌 Product + 4.9 星 */
export function buildProductListJsonLd(products = [], { listName, canonical, handle } = {}) {
  const items = (products || []).slice(0, 30).map((p, i) => {
    const slug = p.slug || p.handle;
    const cat = handle || p.category_slug || p.category_handle || "uncategorized";
    const url = absoluteUrl(`/product/${cat}/${slug}`);
    const img = p.image_url || p.thumbnail || (p.image_urls || [])[0];
    const price = toTwdAmount(p.price);
    return {
      "@type": "ListItem",
      position: i + 1,
      url,
      item: compact({
        "@type": "Product",
        "@id": `${url}#product`,
        name: p.name || p.title,
        url,
        image: img ? absoluteUrl(img) : undefined,
        sku: slug,
        brand: { "@type": "Brand", name: SITE_NAME },
        aggregateRating: aggregateRatingNode(),
        offers: price
          ? {
              "@type": "Offer",
              url,
              price,
              priceCurrency: "TWD",
              availability: "https://schema.org/InStock",
              seller: { "@id": ORG_ID },
            }
          : undefined,
      }),
    };
  });

  return compact([
    {
      "@type": "CollectionPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: listName,
      description: SITE_AI_SUMMARY,
      inLanguage: "zh-TW",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      mainEntity: { "@id": `${canonical}#itemlist` },
    },
    {
      "@type": "ItemList",
      "@id": `${canonical}#itemlist`,
      name: listName,
      numberOfItems: items.length,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement: items,
    },
  ]);
}

export { stripHtml as stripProductHtml };
