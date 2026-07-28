"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import ShopNavbar from "@/components/Shop/ShopNavbar";
import ShopCartSidebar from "@/components/Shop/ShopCartSidebar";
import PartnerFooter from "@/components/Shop/PartnerFooter";
import { SITE_URL } from "@/lib/seo.config";

/**
 * 夥伴賣場統一殼層：與 /shop 相同的 Navbar + Footer + 購物車側欄
 * Navbar 主選單改為夥伴上架方案推斷出的國家項目
 */
export default function PartnerShopLayout({
  store,
  title,
  description,
  /** 覆寫 canonical／og:url（夥伴文章應指向主站 /blog/{slug}） */
  canonicalUrl = null,
  /** SSR 可預先帶入國家 nav，避免閃爍 */
  navCountries = null,
  children,
}) {
  const storeName = store?.store_name || "Jeko eSIM";
  const domain = store?.domain || "";
  const homeHref = domain ? `/p/${domain}/` : "/";
  const pageTitle = title
    ? `${title} | ${storeName}`
    : `${storeName} | 官方授權專屬商城`;
  const pageDesc =
    description ||
    store?.description ||
    `${storeName} — Jeko eSIM 官方授權經銷商店`;
  const canonical =
    canonicalUrl || (domain ? `${SITE_URL}/p/${domain}/` : SITE_URL);

  const [primaryNav, setPrimaryNav] = useState(navCountries || []);

  const secondaryNav = domain
    ? [
        { label: "旅遊文章", href: `/p/${domain}/blog/` },
        { label: "安裝教學", href: `/p/${domain}/tutorial/` },
        { label: "會員登入", href: `/p/${domain}/login/` },
      ]
    : [];

  useEffect(() => {
    if (Array.isArray(navCountries) && navCountries.length > 0) {
      setPrimaryNav(navCountries);
      return;
    }
    if (!domain) return;
    let cancelled = false;
    fetch(`/api/partner/storefront-nav?domain=${encodeURIComponent(domain)}`)
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
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonical} />
        <link rel="canonical" href={canonical} />
      </Head>
      <ShopNavbar
        primaryNav={primaryNav}
        secondaryNav={secondaryNav}
        homeHref={homeHref}
        brandLabel={storeName}
        loginHref={domain ? `/p/${domain}/login/` : "/login"}
        promoHref={`${homeHref}#plans`}
        supportHref={domain ? `/p/${domain}/tutorial/` : "/guide"}
      />
      <main className="min-h-screen bg-white">{children}</main>
      <PartnerFooter store={store} />
      <ShopCartSidebar />
    </>
  );
}
