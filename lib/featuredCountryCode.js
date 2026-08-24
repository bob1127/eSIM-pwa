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

/**
 * 縮圖構圖不同時，代碼圓標垂直位置微調（預設對齊 SIM 凹槽）
 * 中國縮圖天際線較高，需往下移才與 JP／KR 對齊
 */
const FEATURED_CODE_TOP_CLASS = {
  china: "top-[36%]",
};

const DEFAULT_CODE_TOP_CLASS = "top-[22%]";

export function getFeaturedCountryCode(slug) {
  const handle = canonicalCategoryHandle(slug);
  if (!handle) return null;
  return FEATURED_COUNTRY_CODES[handle] || handle.slice(0, 2).toUpperCase();
}

export function getFeaturedCountryCodeTopClass(slug) {
  const handle = canonicalCategoryHandle(slug);
  if (!handle) return DEFAULT_CODE_TOP_CLASS;
  return FEATURED_CODE_TOP_CLASS[handle] || DEFAULT_CODE_TOP_CLASS;
}
