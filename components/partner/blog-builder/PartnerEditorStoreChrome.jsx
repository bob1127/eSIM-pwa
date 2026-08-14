"use client";

import { useEffect, useState } from "react";
import ShopNavbar from "@/components/Shop/ShopNavbar";
import PartnerFooter from "@/components/Shop/PartnerFooter";

/**
 * 視覺編輯器畫布殼層：自動帶入夥伴商店 Navbar / Footer（僅預覽，不可點擊）
 */
export default function PartnerEditorStoreChrome({ store, children, viewport = "desktop" }) {
  const domain = store?.domain || "";
  const storeName = store?.store_name || "Jeko eSIM";
  const homeHref = domain ? `/p/${domain}/` : "/";
  const accountHref = domain ? `/p/${domain}/account/` : "/account";
  const [primaryNav, setPrimaryNav] = useState([]);

  const secondaryNav = domain
    ? [
        { label: "旅遊文章", href: `/p/${domain}/blog/` },
        { label: "安裝教學", href: `/p/${domain}/tutorial/` },
        { label: "會員中心", href: accountHref },
      ]
    : [];

  useEffect(() => {
    if (!domain) return;
    let cancelled = false;
    fetch(`/api/partner/storefront-nav?domain=${encodeURIComponent(domain)}`, {
      cache: "no-store",
    })
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
  }, [domain]);

  if (!store) return children;

  return (
    <div className="flex flex-col min-h-full bg-white overflow-x-hidden">
      <div className="pointer-events-none select-none relative z-[1] [&_header]:sticky [&_header]:top-0">
        <p className="absolute left-2 top-1 z-[2] rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white/80">
          NAVBAR 預覽
        </p>
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
          forceViewport={viewport}
        />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
      <div className="pointer-events-none select-none relative z-0 min-w-0">
        <p className="px-4 pt-2 text-[9px] font-bold tracking-wider text-slate-400">
          FOOTER 預覽
        </p>
        <PartnerFooter store={store} forceViewport={viewport} />
      </div>
    </div>
  );
}
