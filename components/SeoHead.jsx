import Head from "next/head";
import {
  SITE_NAME,
  SITE_NAME_FULL,
  SITE_AI_SUMMARY,
  BRAND,
  formatTitle,
  absoluteUrl,
  buildJsonLdGraph,
} from "../lib/seo.config";
import { PRODUCT_AGGREGATE_RATING } from "../lib/productJsonLd";
import { SITE_FAVICON } from "../lib/pwaConfig";
import { ogImageMimeType } from "../lib/ogImages";

/**
 * 全站統一 SEO Head：title / description / keywords / OG / Twitter / canonical / GEO / JSON-LD
 */
export default function SeoHead({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogImageAlt,
  ogType = "website",
  robots = "index, follow",
  breadcrumbs,
  jsonLd,
  jsonLdTypes,
  noindex = false,
  articlePublishedTime,
  articleModifiedTime,
  articleSection,
  articleTags,
  articleAuthor,
  productPrice,
  productCurrency = "TWD",
  productAvailability,
  productCondition,
  productRetailerId,
  productRatingValue,
  productReviewCount,
}) {
  const pageTitle = formatTitle(title);
  const metaDescription = description || "";
  const metaKeywords = keywords || "";
  const canonicalUrl = canonical || absoluteUrl("/");
  const imageUrl = ogImage
    ? absoluteUrl(ogImage)
    : absoluteUrl("/images/06.png");
  const imageAlt = ogImageAlt || pageTitle;
  const imageType = ogImageMimeType(imageUrl);
  const robotsContent = noindex ? "noindex, nofollow" : robots;
  const tags = Array.isArray(articleTags)
    ? articleTags.filter(Boolean)
    : [];
  const geoPosition = `${BRAND.latitude};${BRAND.longitude}`;
  const icbm = `${BRAND.latitude}, ${BRAND.longitude}`;

  const ldGraph = buildJsonLdGraph({
    title: pageTitle,
    description: metaDescription,
    canonical: canonicalUrl,
    ogImage,
    ogImageAlt: imageAlt,
    breadcrumbs,
    jsonLd,
    jsonLdTypes,
    noindex,
  });

  return (
    <Head>
      <title>{pageTitle}</title>
      {metaDescription && (
        <meta name="description" content={metaDescription} />
      )}
      {metaKeywords && <meta name="keywords" content={metaKeywords} />}
      <meta name="author" content={articleAuthor || SITE_NAME_FULL} />
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />
      <meta name="bingbot" content={robotsContent} />

      {/* GEO / 地區語系 */}
      <meta name="geo.region" content={BRAND.region} />
      <meta name="geo.placename" content={BRAND.placename} />
      <meta name="geo.position" content={geoPosition} />
      <meta name="ICBM" content={icbm} />
      <meta name="geo.country" content={BRAND.country} />
      <meta name="language" content={BRAND.language} />
      <meta httpEquiv="content-language" content={BRAND.language} />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="zh-TW" href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
      <link rel="image_src" href={imageUrl} />

      {/* Open Graph */}
      <meta property="og:locale" content="zh_TW" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={pageTitle} />
      {metaDescription && (
        <meta property="og:description" content={metaDescription} />
      )}
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content={imageType} />

      {ogType === "product" && (
        <>
          {productPrice != null && (
            <>
              <meta property="product:price:amount" content={String(productPrice)} />
              <meta property="product:price:currency" content={productCurrency} />
              <meta name="twitter:label1" content="價格" />
              <meta name="twitter:data1" content={`NT$${productPrice}`} />
            </>
          )}
          <meta
            property="product:availability"
            content={productAvailability || "instock"}
          />
          <meta
            property="product:condition"
            content={productCondition || "new"}
          />
          {productRetailerId ? (
            <meta
              property="product:retailer_item_id"
              content={String(productRetailerId)}
            />
          ) : null}
          <meta property="product:brand" content={SITE_NAME} />
          <meta property="og:availability" content="instock" />
          <meta name="twitter:label2" content="評價" />
          <meta
            name="twitter:data2"
            content={`${productRatingValue ?? PRODUCT_AGGREGATE_RATING.ratingValue} / 5（${productReviewCount ?? PRODUCT_AGGREGATE_RATING.reviewCount} 則）`}
          />
        </>
      )}

      {ogType === "article" && (
        <>
          {articlePublishedTime && (
            <meta
              property="article:published_time"
              content={articlePublishedTime}
            />
          )}
          {articleModifiedTime && (
            <meta
              property="article:modified_time"
              content={articleModifiedTime}
            />
          )}
          <meta
            property="article:author"
            content={articleAuthor || SITE_NAME_FULL}
          />
          {articleSection && (
            <meta property="article:section" content={articleSection} />
          )}
          {tags.map((tag) => (
            <meta property="article:tag" content={tag} key={`tag-${tag}`} />
          ))}
          <meta property="article:publisher" content={SITE_NAME_FULL} />
        </>
      )}

      {/* Twitter / LINE / 社群大圖卡 */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      {metaDescription && (
        <meta name="twitter:description" content={metaDescription} />
      )}
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={imageAlt} />

      {/* GEO / AI 摘要友好 */}
      <meta name="abstract" content={SITE_AI_SUMMARY} />
      <meta name="topic" content={articleSection || "旅遊 eSIM"} />
      <meta
        name="summary"
        content={(metaDescription || SITE_AI_SUMMARY).slice(0, 220)}
      />
      <meta name="coverage" content="Worldwide" />
      <meta name="distribution" content="global" />

      <link rel="icon" href={SITE_FAVICON} />

      {/* 結構化資料 @graph */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldGraph) }}
      />
    </Head>
  );
}
