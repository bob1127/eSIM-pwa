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
