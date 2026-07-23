import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import {
  fetchActiveStoreByDomain,
  fetchStoreProductsForStorefront,
} from "@/lib/partnerStorefront";
import {
  buildPartnerCountryNavItems,
  filterProductsByCountry,
  PARTNER_COUNTRY_DEFS,
} from "@/lib/partnerNavCountries";

const CONTAINER = "max-w-[1680px] mx-auto px-6 lg:px-10";

function ProductCard({ product, domain }) {
  const href = `/p/${domain}/${product.id}/`;
  const price = Number(product.displayPrice) || 0;

  return (
    <Link
      href={href}
      className="group flex flex-col bg-white border border-slate-100 hover:border-slate-200 transition-colors"
    >
      <div className="relative aspect-square bg-[#f5f5f5] overflow-hidden">
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
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <h3 className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#3B9EFF] transition-colors">
          {product.name}
        </h3>
        {product.description ? (
          <p className="text-[12px] text-slate-500 line-clamp-2">
            {product.description.replace(/<[^>]+>/g, "")}
          </p>
        ) : null}
        <p className="mt-auto pt-2 text-[15px] font-bold text-slate-900">
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

/**
 * 夥伴賣場首頁 — 版面與 /shop 一致（ShopNavbar + Footer）
 * Navbar 顯示夥伴上架方案對應的國家
 */
export default function PartnerStorefront({ store, products, navCountries }) {
  const router = useRouter();
  const currentStore = store || { store_name: "Jeko eSIM", domain: "default" };
  const domain = currentStore.domain;
  const countryKey =
    typeof router.query.country === "string" ? router.query.country : null;
  const countryLabel =
    PARTNER_COUNTRY_DEFS.find((c) => c.key === countryKey)?.label || null;
  const list = filterProductsByCountry(products || [], countryKey);

  return (
    <PartnerShopLayout
      store={currentStore}
      title="首頁"
      description={currentStore.description}
      navCountries={navCountries || []}
    >
      {/* Hero — 店名品牌區（對齊 shop 大標風格） */}
      <section className="relative w-full bg-gradient-to-br from-[#0a3a7a] via-[#1a56db] to-[#3B9EFF] text-white">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,.35), transparent 40%), radial-gradient(circle at 80% 10%, rgba(255,212,58,.2), transparent 35%)",
          }}
        />
        <div className={`${CONTAINER} relative py-16 sm:py-20 md:py-24`}>
          {currentStore.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentStore.logo_url}
              alt={currentStore.store_name}
              className="h-12 sm:h-14 w-auto object-contain mb-6 rounded-lg bg-white/10 p-1.5"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <p className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-white/70 mb-3">
            Official Partner Store · Powered by Jeko
          </p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] mb-4">
            {currentStore.store_name}
          </h1>
          <p className="text-sm sm:text-base text-white/85 max-w-2xl leading-relaxed">
            {currentStore.description ||
              "精選全球 eSIM 方案，即買即用，出遊上網一次搞定。"}
          </p>
          <div id="about" className="sr-only">
            {currentStore.store_name} — {currentStore.description || "官方授權專屬商城"}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#plans"
              className="inline-flex items-center bg-white text-[#0a3a7a] text-sm font-bold px-6 py-3 hover:bg-white/95 transition"
            >
              探索 eSIM 方案
            </a>
            <Link
              href={`/p/${domain}/blog/`}
              className="inline-flex items-center border border-white/40 text-white text-sm font-bold px-6 py-3 hover:bg-white/10 transition"
            >
              旅遊文章
            </Link>
            <Link
              href={`/p/${domain}/tutorial/`}
              className="inline-flex items-center border border-white/40 text-white text-sm font-bold px-6 py-3 hover:bg-white/10 transition"
            >
              安裝教學
            </Link>
          </div>
        </div>
      </section>

      {/* 雙欄促銷／導覽卡（shop 同款） */}
      <section className={`${CONTAINER} py-10 sm:py-14`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="#plans"
            className="group relative block aspect-[16/9] min-h-[180px] overflow-hidden bg-slate-900"
          >
            <Image
              src="/images/shop/shop-promo-01.png"
              alt="出國必備 eSIM"
              fill
              className="object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width:768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <h2 className="text-white text-xl sm:text-2xl font-bold">
                出國必備 eSIM
              </h2>
              <p className="text-white/80 text-sm mt-1">
                抵達目的地即開即用 · QR Code 啟用
              </p>
            </div>
          </Link>
          <Link
            href="/shop/"
            className="group relative block aspect-[16/9] min-h-[180px] overflow-hidden bg-slate-900"
          >
            <Image
              src="https://www.bitplayinc.com/cdn/shop/files/Slider_s4_2000x.jpg?v=1740538574"
              alt="旅行周邊"
              fill
              className="object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width:768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <h2 className="text-white text-xl sm:text-2xl font-bold">
                旅行周邊精選
              </h2>
              <p className="text-white/80 text-sm mt-1">前往 Jeko Shop 探索更多</p>
            </div>
          </Link>
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
          Discover More from Jeko
        </h2>
        <Link
          href="/shop/"
          className="group relative block w-full aspect-[21/9] min-h-[220px] overflow-hidden bg-slate-200"
        >
          <Image
            src="/images/shop/shop-promo-01.png"
            alt="Discover Jeko Shop"
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center items-start px-8 sm:px-14 gap-2">
            <h3 className="text-white text-2xl sm:text-3xl font-bold leading-tight">
              Jeko Shop 旅行完整配備
            </h3>
            <p className="text-white/90 text-sm sm:text-base">
              eSIM、充電器、收納與旅遊配件一次購足
            </p>
            <span className="mt-3 inline-block bg-white text-black text-[13px] font-bold px-6 py-2.5 hover:bg-slate-100 transition-colors">
              立即逛商城
            </span>
          </div>
        </Link>
      </section>
    </PartnerShopLayout>
  );
}

export async function getServerSideProps(context) {
  const { partnerSlug } = context.params;
  const slug = String(partnerSlug || "").trim().toLowerCase();

  try {
    const store = await fetchActiveStoreByDomain(slug);
    if (!store) {
      console.error("Store Not Found:", slug);
      return { notFound: true };
    }

    const products = await fetchStoreProductsForStorefront(store);
    const navCountries = buildPartnerCountryNavItems(products, store.domain);
    return { props: { store, products, navCountries } };
  } catch (err) {
    console.error("SSR Error:", err);
    return { notFound: true };
  }
}
