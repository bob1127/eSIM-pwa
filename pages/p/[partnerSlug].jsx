import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import PartnerHomepageEditor, {
  usePartnerStoreOwner,
} from "@/components/Shop/PartnerHomepageEditor";
import PartnerHeroBanner from "@/components/Shop/PartnerHeroBanner";
import {
  fetchActiveStoreByDomain,
  fetchStoreProductsForStorefront,
  partnerProductPath,
} from "@/lib/partnerStorefront";
import {
  buildPartnerCountryNavItems,
  filterProductsByCountry,
  PARTNER_COUNTRY_DEFS,
} from "@/lib/partnerNavCountries";
import { resolveHomepageDisplay } from "@/lib/partnerHomepageCms";

const CONTAINER = "max-w-[1680px] mx-auto px-6 lg:px-10";

function ProductCard({ product, domain }) {
  const href = partnerProductPath(domain, product);
  const price = Number(product.displayPrice) || 0;

  return (
    <Link
      href={href}
      className="group flex flex-col h-full bg-white border border-slate-100 hover:border-slate-200 transition-colors"
    >
      <div className="relative aspect-square bg-[#f5f5f5] overflow-hidden shrink-0">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width:640px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm">
            No Image
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1 min-h-0">
        <h3 className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[#3B9EFF] transition-colors">
          {product.name}
        </h3>
        <p className="mt-1.5 text-[12px] text-slate-500 line-clamp-2 min-h-[2.25rem]">
          {product.description
            ? product.description.replace(/<[^>]+>/g, "")
            : "\u00A0"}
        </p>
        <p className="mt-auto pt-3 text-[15px] font-bold text-slate-900">
          {price > 0 ? (
            <>
              NT${price.toLocaleString()}
              <span className="text-[11px] font-medium text-slate-400 ml-1">
                起
              </span>
            </>
          ) : (
            <span className="text-slate-400 font-medium text-sm">即將推出</span>
          )}
        </p>
      </div>
    </Link>
  );
}

function PromoCard({ card, editMode }) {
  const inner = (
    <>
      <Image
        src={card.image}
        alt={card.title}
        fill
        className="object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width:768px) 100vw, 50vw"
        unoptimized={String(card.image || "").startsWith("http")}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
        <h2 className="text-white text-xl sm:text-2xl font-bold">{card.title}</h2>
        <p className="text-white/80 text-sm mt-1">{card.subtitle}</p>
      </div>
      {editMode ? (
        <span className="absolute top-3 right-3 text-[10px] font-bold bg-white/90 text-slate-800 px-2 py-1 rounded">
          可編輯
        </span>
      ) : null}
    </>
  );

  const cls =
    "group relative block aspect-[16/9] min-h-[180px] overflow-hidden bg-slate-900";

  if (String(card.href || "").startsWith("#")) {
    return (
      <a href={card.href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={card.href || "/"} className={cls}>
      {inner}
    </Link>
  );
}

/**
 * 夥伴賣場首頁 — 版面與 /shop 一致；店主登入可前台編輯 hero／促銷卡／Discover
 */
export default function PartnerStorefront({ store, products, navCountries }) {
  const router = useRouter();
  const currentStore = store || { store_name: "Jeko eSIM", domain: "default" };
  const domain = currentStore.domain;
  const { isOwner, token, checking } = usePartnerStoreOwner(currentStore);
  const [cms, setCms] = useState(() => currentStore.homepage_cms || null);

  const display = useMemo(
    () => resolveHomepageDisplay(currentStore, cms),
    [currentStore, cms],
  );

  const countryKey =
    typeof router.query.country === "string" ? router.query.country : null;
  const countryLabel =
    PARTNER_COUNTRY_DEFS.find((c) => c.key === countryKey)?.label || null;
  const list = filterProductsByCountry(products || [], countryKey);

  const hero = display.hero;

  return (
    <PartnerShopLayout
      store={currentStore}
      title="首頁"
      description={currentStore.description}
      navCountries={navCountries || []}
    >
      {isOwner && !checking ? (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs sm:text-sm font-bold px-4 py-2.5 text-center">
          您正以本店夥伴主帳號瀏覽 — 可使用右下角「編輯首頁」修改圖片、文字與連結
        </div>
      ) : null}

      <PartnerHeroBanner
        store={currentStore}
        hero={hero}
        domain={domain}
      />

      {/* 雙欄促銷卡 */}
      <section className={`${CONTAINER} py-10 sm:py-14`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {display.promoCards.map((card, i) => (
            <PromoCard key={i} card={card} editMode={isOwner} />
          ))}
        </div>
      </section>

      {/* 商品網格 */}
      <section id="plans" className={`${CONTAINER} pb-16 sm:pb-24 scroll-mt-28`}>
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {countryLabel
                ? `${countryLabel} eSIM 方案`
                : "Must-Have eSIM Selections"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {countryLabel
                ? `本賣場 ${countryLabel} 方案 · 共 ${list.length} 款`
                : `本賣場精選方案 · 共 ${list.length} 款`}
              {countryKey ? (
                <>
                  {" · "}
                  <Link
                    href={`/p/${domain}/#plans`}
                    className="text-[#3B9EFF] font-bold hover:underline"
                  >
                    查看全部
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <Link
            href="/shop/"
            className="text-sm font-bold text-[#3B9EFF] hover:underline"
          >
            查看 Jeko Shop 全部商品 →
          </Link>
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
            <p className="text-slate-600 font-bold mb-2">商品準備中</p>
            <p className="text-sm text-slate-400">
              夥伴尚未上架方案，請稍後再來，或先逛 Jeko Shop。
            </p>
            <Link
              href="/shop/"
              className="inline-block mt-6 bg-[#3B9EFF] text-white text-sm font-bold px-6 py-3 hover:bg-[#2B8EEF] transition"
            >
              前往 Jeko Shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {list.map((p) => (
              <ProductCard key={String(p.id)} product={p} domain={domain} />
            ))}
          </div>
        )}
      </section>

      {/* Discover banner */}
      <section className={`${CONTAINER} pb-16 sm:pb-20`}>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
          {display.discover.section_title}
        </h2>
        <Link
          href={display.discover.href || "/shop/"}
          className="group relative block w-full aspect-[21/9] min-h-[220px] overflow-hidden bg-slate-200"
        >
          <Image
            src={display.discover.image}
            alt={display.discover.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="100vw"
            unoptimized={String(display.discover.image || "").startsWith("http")}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center items-start px-8 sm:px-14 gap-2">
            <h3 className="text-white text-2xl sm:text-3xl font-bold leading-tight">
              {display.discover.title}
            </h3>
            <p className="text-white/90 text-sm sm:text-base">
              {display.discover.subtitle}
            </p>
            <span className="mt-3 inline-block bg-white text-black text-[13px] font-bold px-6 py-2.5 hover:bg-slate-100 transition-colors">
              {display.discover.button_label}
            </span>
          </div>
        </Link>
      </section>

      {isOwner && token ? (
        <PartnerHomepageEditor
          store={currentStore}
          cms={cms}
          onCmsChange={setCms}
          token={token}
        />
      ) : null}
    </PartnerShopLayout>
  );
}

export async function getServerSideProps(context) {
  const { partnerSlug } = context.params;
  const slug = String(partnerSlug || "").trim().toLowerCase();

  const store = await fetchActiveStoreByDomain(slug);
  if (!store) {
    console.error("[p/[partnerSlug]] Store Not Found:", slug);
    return { notFound: true };
  }

  let products = [];
  let navCountries = [];
  try {
    products = await fetchStoreProductsForStorefront(store);
    navCountries = buildPartnerCountryNavItems(products, store.domain);
  } catch (err) {
    console.error("[p/[partnerSlug]] products SSR error:", err);
  }

  const safe = (v) => JSON.parse(JSON.stringify(v ?? null));

  return {
    props: {
      store: safe(store),
      products: safe(products) || [],
      navCountries: safe(navCountries) || [],
    },
  };
}
