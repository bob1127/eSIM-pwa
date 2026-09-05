import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import { usePartnerStoreOwner } from "@/components/Shop/PartnerHomepageEditor";
import PartnerHeroBanner from "@/components/Shop/PartnerHeroBanner";
import PartnerHeroCarouselEditorDialog from "@/components/Shop/PartnerHeroCarouselEditorDialog";
import PartnerHomepageBlockEditorDialog from "@/components/Shop/PartnerHomepageBlockEditorDialog";
import PartnerSectionEditButton from "@/components/Shop/PartnerSectionEditButton";
import {
  fetchActiveStoreByDomain,
  fetchStoreProductsForStorefront,
  partnerProductPath,
} from "@/lib/partnerStorefront";
import {
  applyPartnerCountryNavOrder,
  buildPartnerCountryNavItems,
  filterProductsByCountry,
  PARTNER_COUNTRY_DEFS,
} from "@/lib/partnerNavCountries";
import { resolveHomepageDisplay } from "@/lib/partnerHomepageCms";
import JekoAnimatedCtaButton, {
  JekoShopCatalogButton,
} from "@/components/ui/JekoAnimatedCtaButton";
import PartnerStoreCategoryTabs from "@/components/Shop/PartnerStoreCategoryTabs";

const CONTAINER = "max-w-[1680px] mx-auto px-6 lg:px-10";

/** 商品網格欄數對齊 Tailwind：2 / md:4 / lg:5 / xl:6；預設顯示兩排 */
const PRODUCT_GRID_ROWS = 2;

function getPartnerProductPageSize(width) {
  const w = Number(width) || 0;
  if (w >= 1280) return 6 * PRODUCT_GRID_ROWS;
  if (w >= 1024) return 5 * PRODUCT_GRID_ROWS;
  if (w >= 768) return 4 * PRODUCT_GRID_ROWS;
  return 2 * PRODUCT_GRID_ROWS;
}

function usePartnerProductPageSize() {
  const [pageSize, setPageSize] = useState(4);
  useEffect(() => {
    const update = () => setPageSize(getPartnerProductPageSize(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return pageSize;
}

function PartnerProductPagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const nums = (() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items = [1];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);
    if (left > 2) items.push("…");
    for (let i = left; i <= right; i += 1) items.push(i);
    if (right < totalPages - 1) items.push("…");
    items.push(totalPages);
    return items;
  })();

  const square =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold transition-colors";

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
      aria-label="商品分頁"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="上一頁"
        className={`${square} border-slate-300 bg-white text-slate-700 hover:border-[#0071EB] hover:bg-[#0071EB] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-slate-300 disabled:hover:bg-white disabled:hover:text-slate-700`}
      >
        ‹
      </button>
      {nums.map((item, i) =>
        item === "…" ? (
          <span
            key={`e-${i}`}
            className={`${square} border-transparent text-slate-400`}
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={`${square} ${
              item === page
                ? "border-[#0071EB] bg-[#0071EB] text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-[#0071EB] hover:text-[#0071EB]"
            }`}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="下一頁"
        className={`${square} border-slate-300 bg-white text-slate-700 hover:border-[#0071EB] hover:bg-[#0071EB] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-slate-300 disabled:hover:bg-white disabled:hover:text-slate-700`}
      >
        ›
      </button>
    </nav>
  );
}

function ProductCard({ product, domain }) {
  const href = partnerProductPath(domain, product);
  const price = Number(product.displayPrice) || 0;

  return (
    <Link
      href={href}
      className="group flex flex-col h-full overflow-hidden rounded-xl border border-slate-200/90 lg:hover:border-[#0071EB]/30 lg:hover:shadow-md transition-all"
    >
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-white shrink-0">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-3 sm:p-4 lg:group-hover:scale-[1.03] lg:transition-transform lg:duration-500"
            sizes="(max-width:640px) 50vw, 16vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-xs">
            No Image
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 px-3 pt-3 pb-4 sm:px-3.5 sm:pt-3.5 sm:pb-5 bg-[#F9FAFB]">
        <h3 className="font-bold text-[12px] sm:text-[13px] text-slate-800 leading-snug line-clamp-2 min-h-[2.5em] group-hover:text-[#0071EB] transition-colors">
          {product.name}
        </h3>
        <div className="flex items-end gap-1.5 mt-auto pt-2.5">
          {price > 0 ? (
            <span className="text-[#0071EB] font-bold text-[15px] sm:text-base tabular-nums leading-none">
              NT${price.toLocaleString()}
              <span className="text-[10px] sm:text-[11px] font-bold ml-0.5">起</span>
            </span>
          ) : (
            <span className="text-slate-400 font-medium text-xs">即將推出</span>
          )}
        </div>
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
        <h2 className="text-white text-xl sm:text-[24px] font-bold">{card.title}</h2>
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
export default function PartnerStorefront({ store, products }) {
  const router = useRouter();
  const currentStore = store || { store_name: "Jeko eSIM", domain: "default" };
  const domain = currentStore.domain;
  const { isOwner, token, checking } = usePartnerStoreOwner(currentStore);
  const [cms, setCms] = useState(() => currentStore.homepage_cms || null);
  const [carouselEditorOpen, setCarouselEditorOpen] = useState(false);
  const [blockEditor, setBlockEditor] = useState(null);

  const display = useMemo(
    () => resolveHomepageDisplay(currentStore, cms),
    [currentStore, cms],
  );

  const orderedNavCountries = useMemo(
    () =>
      applyPartnerCountryNavOrder(
        buildPartnerCountryNavItems(products || [], domain),
        display.plans?.category_order,
      ),
    [products, domain, display.plans?.category_order],
  );

  const countryKey =
    typeof router.query.country === "string" ? router.query.country : null;
  const countryLabel =
    PARTNER_COUNTRY_DEFS.find((c) => c.key === countryKey)?.label || null;
  const list = filterProductsByCountry(products || [], countryKey);
  const totalProductCount = (products || []).length;

  const pageSize = usePartnerProductPageSize();
  const [productPage, setProductPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(Math.max(1, productPage), totalPages);
  const pageItems = list.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  useEffect(() => {
    setProductPage(1);
  }, [countryKey, pageSize]);

  const goProductPage = (next) => {
    const p = Math.min(Math.max(1, next), totalPages);
    setProductPage(p);
    if (typeof document !== "undefined") {
      document.getElementById("plans")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const hero = display.hero;

  return (
    <PartnerShopLayout
      store={currentStore}
      title="首頁"
      description={currentStore.description}
      navCountries={orderedNavCountries}
    >
      {isOwner && !checking ? (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs sm:text-sm font-bold px-4 py-2.5 text-center">
          您正以本店夥伴主帳號瀏覽 — 各區塊右上角可「編輯」
        </div>
      ) : null}

      <PartnerHeroBanner
        store={currentStore}
        hero={hero}
        domain={domain}
        editable={isOwner && hero?.layout === "slider"}
        onEditCarousel={() => setCarouselEditorOpen(true)}
      />

      {/* 雙欄促銷卡 */}
      <section className={`${CONTAINER} py-10 sm:py-14 relative`}>
        {isOwner ? (
          <div className="flex justify-end mb-3">
            <PartnerSectionEditButton
              label="編輯雙欄卡片"
              onClick={() => setBlockEditor("promo")}
            />
          </div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {display.promoCards.map((card, i) => (
            <PromoCard key={i} card={card} editMode={isOwner} />
          ))}
        </div>
      </section>

      {/* 商品網格 */}
      <section id="plans" className={`${CONTAINER} pb-16 sm:pb-24 scroll-mt-28`}>
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-[24px] sm:text-[28px] font-bold text-slate-900">
                  {countryLabel
                    ? `${countryLabel} eSIM 方案`
                    : display.plans?.title || "Must-Have eSIM Selections"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {countryLabel
                    ? `本賣場 ${countryLabel} 方案 · 共 ${list.length} 款`
                    : `${display.plans?.subtitle || "本賣場精選方案"} · 共 ${list.length} 款`}
                </p>
              </div>
              {isOwner ? (
                <PartnerSectionEditButton
                  label="編輯方案區"
                  onClick={() => setBlockEditor("plans")}
                  className="shrink-0"
                />
              ) : null}
            </div>
          </div>
          <JekoShopCatalogButton
            href={display.plans?.shop_link_href || "/shop/"}
            label={
              display.plans?.shop_link_label || "查看 Jeko Shop 全部商品"
            }
            className="shrink-0"
          />
        </div>

        <PartnerStoreCategoryTabs
          domain={domain}
          categories={orderedNavCountries}
          activeKey={countryKey}
          totalCount={totalProductCount}
        />

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
            <p className="text-slate-600 font-bold mb-2">商品準備中</p>
            <p className="text-sm text-slate-400">
              夥伴尚未上架方案，請稍後再來，或先逛 Jeko Shop。
            </p>
            <Link
              href={`/p/${domain}/#plans`}
              className="inline-block mt-6 bg-[#3B9EFF] text-white text-sm font-bold px-6 py-3 hover:bg-[#2B8EEF] transition"
            >
              查看本店方案
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3">
              {pageItems.map((p) => (
                <ProductCard key={String(p.id)} product={p} domain={domain} />
              ))}
            </div>
            <PartnerProductPagination
              page={safePage}
              totalPages={totalPages}
              onChange={goProductPage}
            />
          </>
        )}
      </section>

      {/* Discover banner */}
      <section className={`${CONTAINER} pb-16 sm:pb-20`}>
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <h2 className="text-[24px] sm:text-[28px] font-bold text-slate-900">
            {display.discover.section_title}
          </h2>
          {isOwner ? (
            <PartnerSectionEditButton
              label="編輯橫幅"
              onClick={() => setBlockEditor("discover")}
            />
          ) : null}
        </div>
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
            <h3 className="text-white text-[24px] sm:text-[28px] font-bold leading-tight">
              {display.discover.title}
            </h3>
            <p className="text-white/90 text-sm sm:text-base">
              {display.discover.subtitle}
            </p>
            <JekoAnimatedCtaButton nested className="mt-3">
              {display.discover.button_label}
            </JekoAnimatedCtaButton>
          </div>
        </Link>
      </section>

      {isOwner && token ? (
        <>
          <PartnerHeroCarouselEditorDialog
            open={carouselEditorOpen}
            onClose={() => setCarouselEditorOpen(false)}
            store={currentStore}
            cms={cms}
            onCmsChange={setCms}
            token={token}
          />
          <PartnerHomepageBlockEditorDialog
            open={!!blockEditor}
            onClose={() => setBlockEditor(null)}
            block={blockEditor}
            store={currentStore}
            cms={cms}
            onCmsChange={setCms}
            token={token}
            navCountries={orderedNavCountries}
          />
        </>
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
  try {
    products = await fetchStoreProductsForStorefront(store);
  } catch (err) {
    console.error("[p/[partnerSlug]] products SSR error:", err);
  }

  const safe = (v) => JSON.parse(JSON.stringify(v ?? null));

  return {
    props: {
      store: safe(store),
      products: safe(products) || [],
    },
  };
}
