"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import ShopNavbar from "@/components/Shop/ShopNavbar";
import PartnerCartSidebar from "@/components/PartnerCartSidebar";
import PartnerFooter from "@/components/Shop/PartnerFooter";
import SeoHead from "@/components/SeoHead";
import { buildPartnerShopSeo, isPartnerPrivatePath } from "@/lib/partnerSeo";

/**
 * 夥伴賣場統一殼層：Navbar + Footer + 購物車
 * SEO：與主站互聯（Organization parent／isPartOf／可索引公開頁）
 */
export default function PartnerShopLayout({
  store,
  title,
  description,
  /** 覆寫 canonical／og:url */
  canonicalUrl = null,
  /** SSR 可預先帶入國家 nav */
  navCountries = null,
  /** 額外 SEO 覆寫（pageType、product、article、mainProductUrl…） */
  seo = null,
  children,
}) {
  const router = useRouter();
  const storeName = store?.store_name || "Jeko eSIM";
  const domain = store?.domain || "";
  const homeHref = domain ? `/p/${domain}/` : "/";
  const accountHref = domain ? `/p/${domain}/account/` : "/account";
  const path = router.asPath?.split("?")[0] || "";
  const privatePage = isPartnerPrivatePath(path);

  const resolvedSeo = useMemo(() => {
    return buildPartnerShopSeo({
      store,
      title: seo?.title || title,
      description: seo?.description || description,
      path:
        seo?.path != null
          ? seo.path
          : domain
            ? path.replace(new RegExp(`^/p/${domain}/?`), "") || ""
            : "",
      canonicalUrl: seo?.canonical || canonicalUrl,
      noindex: privatePage || seo?.noindex === true,
      pageType: seo?.pageType || "WebPage",
      ogType: seo?.ogType || "website",
      ogImage: seo?.ogImage,
      breadcrumbs: seo?.breadcrumbs,
      product: seo?.product,
      article: seo?.article,
      mainProductUrl: seo?.mainProductUrl,
      mainArticleUrl: seo?.mainArticleUrl,
      keywords: seo?.keywords,
    });
  }, [store, title, description, canonicalUrl, path, domain, privatePage, seo]);

  const [primaryNav, setPrimaryNav] = useState(navCountries || []);

  const secondaryNav = domain
    ? [
        { label: "旅遊文章", href: `/p/${domain}/blog/` },
        { label: "安裝教學", href: `/p/${domain}/tutorial/` },
        { label: "會員中心", href: accountHref },
      ]
    : [];

  useEffect(() => {
    if (Array.isArray(navCountries)) {
      setPrimaryNav(navCountries);
    }
    if (!domain) return;
    let cancelled = false;
    fetch(
      `/api/partner/storefront-nav?domain=${encodeURIComponent(domain)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.countries)) {
          setPrimaryNav(data.countries);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [domain, navCountries]);

  return (
    <>
      <SeoHead
        title={resolvedSeo.title}
        description={resolvedSeo.description}
        keywords={resolvedSeo.keywords}
        canonical={resolvedSeo.canonical}
        ogImage={resolvedSeo.ogImage}
        ogImageAlt={resolvedSeo.ogImageAlt}
        ogType={resolvedSeo.ogType}
        robots={resolvedSeo.robots}
        noindex={resolvedSeo.noindex}
        breadcrumbs={resolvedSeo.breadcrumbs}
        jsonLd={resolvedSeo.jsonLd}
        jsonLdTypes={resolvedSeo.jsonLdTypes}
        articlePublishedTime={seo?.articlePublishedTime}
        articleModifiedTime={seo?.articleModifiedTime}
        articleSection={seo?.articleSection}
        articleTags={seo?.articleTags}
        articleAuthor={seo?.articleAuthor || storeName}
      />
      <a href="#main-content" className="skip-link">
        跳到主要內容
      </a>
      <ShopNavbar
        primaryNav={primaryNav}
        secondaryNav={secondaryNav}
        homeHref={homeHref}
        brandLabel={storeName}
        loginHref={accountHref}
        promoHref={`${homeHref}#plans`}
        supportHref={domain ? `/p/${domain}/tutorial/` : "/guide"}
        utilityNav={
          domain
            ? [
                { label: "賣場首頁", href: homeHref },
                { label: "選購方案", href: `${homeHref}#plans` },
                { label: "旅遊文章", href: `/p/${domain}/blog/` },
                { label: "安裝教學", href: `/p/${domain}/tutorial/` },
              ]
            : undefined
        }
        searchScope={domain ? "partner" : "site"}
        searchDomain={domain}
        cartMode="esim"
      />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-white">{children}</main>
      <PartnerFooter store={store} />
      <PartnerCartSidebar storeDomain={domain} storeId={store?.id} />
    </>
  );
}
