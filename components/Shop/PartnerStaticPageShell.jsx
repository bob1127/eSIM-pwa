"use client";

import Link from "next/link";

/**
 * 夥伴賣場靜態內容頁共用版型
 */
export default function PartnerStaticPageShell({
  store,
  title,
  description,
  children,
  breadcrumbs = [],
}) {
  const domain = store?.domain;
  const homeHref = domain ? `/p/${domain}/` : "/";
  const brand = store?.store_name || "夥伴商店";

  return (
    <div className="bg-white min-h-[60vh]">
      <div className="max-w-[1480px] w-[96%] mx-auto px-3 sm:px-5 lg:px-8 py-8 lg:py-12">
        <nav className="text-[12px] text-slate-400 tracking-wide mb-6">
          <Link href={homeHref} className="hover:text-slate-700">
            首頁
          </Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.label}>
              <span className="mx-1.5">/</span>
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-slate-700">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-600">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        <header className="mb-8 lg:mb-10">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#1E4AD1] mb-2">
            {brand}
          </p>
          <h1 className="text-[26px] sm:text-[32px] font-bold text-slate-900 leading-snug">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 text-[15px] text-slate-600 leading-relaxed max-w-2xl">
              {description}
            </p>
          ) : null}
        </header>

        <div className="max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
