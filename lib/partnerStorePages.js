import {
  fetchActiveStoreByDomain,
  fetchStoreProductsForStorefront,
} from "@/lib/partnerStorefront";
import { buildPartnerCountryNavForStore } from "@/lib/partnerNavCountries";

function jsonSafe(value) {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value));
}

/** 夥伴賣場靜態頁 SSR（about / terms / contact） */
export async function loadPartnerStorePageProps(partnerSlug) {
  const domain = String(partnerSlug || "")
    .trim()
    .toLowerCase();
  if (!domain) return { notFound: true };

  const store = await fetchActiveStoreByDomain(domain);
  if (!store) return { notFound: true };

  let navCountries = [];
  try {
    const products = await fetchStoreProductsForStorefront(store);
    navCountries = buildPartnerCountryNavForStore(store, products);
  } catch {
    /* ignore */
  }

  return {
    props: {
      store: jsonSafe(store),
      navCountries: jsonSafe(navCountries) || [],
    },
  };
}

export function partnerPagePaths(domain) {
  const base = `/p/${String(domain || "").trim()}/`;
  return {
    home: base,
    about: `${base}about/`,
    terms: `${base}terms/`,
    contact: `${base}contact/`,
    blog: `${base}blog/`,
    plans: `${base}#plans`,
  };
}

/** 主站顯示夥伴供稿時，側欄／頁尾連結改回主站路徑 */
export function mainSitePagePaths() {
  return {
    home: "/",
    about: "/about/",
    terms: "/terms/",
    contact: "/contact/",
    blog: "/blog/",
    plans: "/#jeko-recommend",
  };
}
