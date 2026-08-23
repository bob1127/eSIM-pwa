import { canonicalCategoryHandle } from "./categoryAliases";

/** Navbar 精選卡：Medusa 分類 handle → ISO 英文代碼 */
export const FEATURED_COUNTRY_CODES = {
  japan: "JP",
  korea: "KR",
  china: "CN",
  kongkong: "CNHK",
  hongkong: "HK",
  taiwan: "TW",
  thailand: "TH",
  malaysia: "MY",
  singapore: "SG",
  vietnam: "VN",
  usa: "US",
  "us-canada": "US",
  "north-america": "US",
  canada: "CA",
  france: "FR",
  germany: "DE",
  spain: "ES",
  italy: "IT",
  uk: "GB",
  austria: "AT",
  switzerland: "CH",
  turkey: "TR",
  australia: "AU",
  "new-zealand": "NZ",
  anz: "AU",
  indonesia: "ID",
  india: "IN",
};

export function getFeaturedCountryCode(slug) {
  const handle = canonicalCategoryHandle(slug);
  if (!handle) return null;
  return FEATURED_COUNTRY_CODES[handle] || handle.slice(0, 2).toUpperCase();
}
