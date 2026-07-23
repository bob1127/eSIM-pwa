import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import PartnerCategoryView from "@/components/Shop/PartnerCategoryView";
import {
  fetchActiveStoreByDomain,
  fetchStoreProductsForStorefront,
} from "@/lib/partnerStorefront";
import {
  buildPartnerCountryNavItems,
  filterProductsByCountry,
  PARTNER_COUNTRY_DEFS,
} from "@/lib/partnerNavCountries";
import { getPartnerCountryPageMeta } from "@/lib/partnerCountryPageMeta";

/**
 * 夥伴專屬產品分類頁
 * /p/{partnerSlug}/c/{countryKey}/
 */
export default function PartnerCountryCategoryPage({
  store,
  countryKey,
  countryLabel,
  countries,
  products,
  navCountries,
}) {
  const meta = getPartnerCountryPageMeta(countryKey, countryLabel);

  return (
    <PartnerShopLayout
      store={store}
      title={meta.title}
      description={meta.description}
      navCountries={navCountries}
    >
      <PartnerCategoryView
        store={store}
        countryKey={countryKey}
        countryLabel={countryLabel}
        countries={countries}
        products={products}
      />
    </PartnerShopLayout>
  );
}

export async function getServerSideProps(context) {
  const partnerSlug = String(context.params?.partnerSlug || "")
    .trim()
    .toLowerCase();
  const countryKey = String(context.params?.countryKey || "")
    .trim()
    .toLowerCase();

  if (!partnerSlug || !countryKey) {
    return { notFound: true };
  }

  try {
    const store = await fetchActiveStoreByDomain(partnerSlug);
    if (!store) return { notFound: true };

    const allProducts = await fetchStoreProductsForStorefront(store);
    const navCountries = buildPartnerCountryNavItems(allProducts, store.domain);

    // 側欄僅顯示夥伴有上架的國家
    const countries = navCountries.map((c) => ({
      key: c.key,
      label: c.label,
      count: c.count || 0,
    }));

    const known = countries.some((c) => c.key === countryKey);
    // 若尚未上架該國但 URL 直接打進來：仍顯示空狀態（不 404），方便擴充
    if (!known && !PARTNER_COUNTRY_DEFS.some((d) => d.key === countryKey) && countryKey !== "other") {
      return { notFound: true };
    }

    const countryLabel =
      countries.find((c) => c.key === countryKey)?.label ||
      PARTNER_COUNTRY_DEFS.find((d) => d.key === countryKey)?.label ||
      countryKey;

    const products = filterProductsByCountry(allProducts, countryKey);

    return {
      props: {
        store,
        countryKey,
        countryLabel,
        countries: countries.length
          ? countries
          : [{ key: countryKey, label: countryLabel, count: products.length }],
        products,
        navCountries,
      },
    };
  } catch (err) {
    console.error("[PartnerCountryCategoryPage]", err);
    return { notFound: true };
  }
}
