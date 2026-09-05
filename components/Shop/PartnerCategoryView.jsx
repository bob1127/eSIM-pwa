import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import { getPartnerCountryPageMeta } from "@/lib/partnerCountryPageMeta";
import { partnerProductPath } from "@/lib/partnerStorefront";

function CountryIcon({ countryKey }) {
  // 簡單線框圖示，對齊截圖側欄風格
  const paths = {
    japan: (
      <>
        <path d="M4 7h16v10H4z" />
        <path d="M8 7V5h8v2" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    korea: (
      <>
        <rect x="5" y="6" width="14" height="12" rx="1.5" />
        <path d="M9 10h6M9 14h4" />
      </>
    ),
    default: (
      <>
        <path d="M4 8h16v9H4z" />
        <path d="M8 8V6h8v2" />
        <path d="M10 12h4" />
      </>
    ),
  };
  const body = paths[countryKey] || paths.default;
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[18px] h-[18px] text-slate-600 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {body}
    </svg>
  );
}

function CategoryProductCard({ product, domain }) {
  const href = partnerProductPath(domain, product);
  const price = Number(product.displayPrice) || 0;
  const countryBadge = product.countryLabel || null;

  return (
    <div className="flex flex-col">
      <Link href={href} className="block relative aspect-square bg-[#f3f3f3] overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-5"
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm">
            No Image
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
          <span className="text-[10px] font-bold tracking-wide text-slate-600 bg-white/90 px-1.5 py-0.5">
            eSIM
          </span>
          {countryBadge ? (
            <span className="text-[10px] font-medium text-slate-500 bg-white/90 px-1.5 py-0.5">
              {countryBadge}
            </span>
          ) : null}
        </div>
      </Link>

      <h3 className="mt-3 text-[13px] sm:text-[14px] font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem]">
        <Link href={href} className="text-slate-900">
          {product.name}
        </Link>
      </h3>

      <div className="mt-3 flex gap-2">
        <Link
          href={href}
          className="flex-1 inline-flex items-center justify-center min-h-[40px] border border-[#0A6CD0] text-[#0A6CD0] text-[12px] sm:text-[13px] font-bold px-2"
        >
          {price > 0 ? `NT$${price.toLocaleString()} 起` : "查看方案"}
        </Link>
      </div>
    </div>
  );
}

/**
 * 夥伴專屬分類頁：左側國家側欄 + 右側標題／商品格（參考 Packaging 風格）
 */
export default function PartnerCategoryView({
  store,
  countryKey,
  countryLabel,
  countries = [],
  products = [],
}) {
  const domain = store?.domain;
  const meta = getPartnerCountryPageMeta(countryKey, countryLabel);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="bg-white min-h-[70vh]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        {/* 手機：國家切換 */}
        <div className="lg:hidden mb-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="w-full flex items-center justify-between border border-slate-200 px-4 py-3 text-sm font-bold text-slate-800"
          >
            <span className="inline-flex items-center gap-2">
              <CountryIcon countryKey={countryKey} />
              {countryLabel || meta.title}
            </span>
            <MaterialIcon
              name={mobileNavOpen ? "expand_less" : "expand_more"}
              size={20}
            />
          </button>
          {mobileNavOpen ? (
            <ul className="mt-2 border border-slate-200 divide-y divide-slate-100">
              {countries.map((c) => (
                <li key={c.key}>
                  <Link
                    href={`/p/${domain}/c/${c.key}/`}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-3 text-sm ${
                      c.key === countryKey
                        ? "font-bold text-slate-900 bg-slate-50"
                        : "text-slate-600"
                    }`}
                  >
                    <CountryIcon countryKey={c.key} />
                    {c.label}
                    {c.count ? (
                      <span className="ml-auto text-[11px] text-slate-400">
                        {c.count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex gap-8 lg:gap-12 items-start">
          {/* 左側國家側欄 */}
          <aside className="hidden lg:block w-[220px] shrink-0 sticky top-28">
            <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-slate-400 mb-4">
              Categories
            </p>
            <ul className="space-y-0.5">
              {countries.map((c) => {
                const active = c.key === countryKey;
                return (
                  <li key={c.key}>
                    <Link
                      href={`/p/${domain}/c/${c.key}/`}
                      className={`flex items-center gap-2.5 px-2 py-2.5 text-[13px] transition-colors ${
                        active
                          ? "font-bold text-slate-900"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <CountryIcon countryKey={c.key} />
                      <span className="flex-1">{c.label}</span>
                      <MaterialIcon
                        name={active ? "expand_less" : "expand_more"}
                        size={16}
                        className="text-slate-400"
                      />
                    </Link>
                    {active ? (
                      <ul className="ml-8 mb-2 space-y-1">
                        <li>
                          <span className="text-[12px] font-semibold text-[#0A6CD0]">
                            全部方案
                          </span>
                        </li>
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* 右側內容 */}
          <div className="flex-1 min-w-0">
            <header className="pb-6 border-b border-slate-200">
              <h1 className="text-[28px] font-bold text-slate-900 tracking-tight leading-tight">
                {meta.title}
              </h1>
              <p className="mt-2 text-[13px] sm:text-[14px] text-slate-500 leading-relaxed max-w-2xl">
                {meta.description}
              </p>
              {meta.tags?.length ? (
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  {meta.tags.map((t) => (
                    <span
                      key={t.label}
                      className="inline-flex items-center gap-1.5 text-[12px] text-slate-600"
                    >
                      <MaterialIcon
                        name={t.icon}
                        size={15}
                        className="text-slate-400"
                      />
                      {t.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </header>

            {products.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-slate-600 font-bold mb-2">此分類暫無方案</p>
                <Link
                  href={`/p/${domain}/`}
                  className="text-sm font-bold text-[#0A6CD0] hover:underline"
                >
                  回賣場首頁
                </Link>
              </div>
            ) : (
              <div className="pt-8 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-10 sm:gap-x-5 sm:gap-y-12">
                {products.map((p) => (
                  <CategoryProductCard
                    key={String(p.id)}
                    product={p}
                    domain={domain}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
