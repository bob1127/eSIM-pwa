import { SHARED_PRODUCT_CAROUSEL_IMAGES, buildProductGalleryUrls } from "./productCarouselShared.js";
import { R2_PRODUCT_THUMB_BY_FILE } from "./productGalleryR2.js";

export const PRODUCT_IMAGE_DIR = "/images/sim/產品";

/** Medusa category handle → 檔名（對應 R2 product-gallery/thumbs） */
export const CATEGORY_PRODUCT_IMAGE_FILES = {
  canada: "加拿大esim.png",
  taiwan: "台灣esim.png",
  turkey: "土耳其esim.png",
  austria: "奧地利esim.png",
  singapore: "新加坡esim.png",
  france: "法國esim.png",
  thailand: "泰國esim.png",
  australia: "澳洲esim.png",
  switzerland: "瑞士esim.png",
  "new-zealand": "紐西蘭esim.png",
  usa: "美國esim.png",
  "us-canada": "美國esim.png",
  "north-america": "美國esim.png",
  italy: "義大利esim.png",
  uk: "英國esim.png",
  spain: "西班牙esim.png",
  vietnam: "越南-esim.png",
  hongkong: "香港-esim.png",
  kongkong: "esim-中港澳.png",
  cnhkmo: "esim-中港澳.png",
  malaysia: "馬來西亞-esim.png",
  anz: "澳洲esim.png",
  japan: "日本esim.png",
  jp: "日本esim.png",
  korea: "韓國esim.png",
  kr: "韓國esim.png",
  china: "中國esim.png",
  cn: "中國esim.png",
  germany: "德國esim.png",
  de: "德國esim.png",
  indonesia: "印尼esim.png",
  india: "印度esim.png",
};

function r2ThumbUrl(file) {
  if (!file) return null;
  return R2_PRODUCT_THUMB_BY_FILE[file] || null;
}

function buildLegacyRewrites() {
  const out = {};
  for (const file of Object.values(CATEGORY_PRODUCT_IMAGE_FILES)) {
    const r2 = r2ThumbUrl(file);
    if (!r2) continue;
    out[`${PRODUCT_IMAGE_DIR}/${file}`] = r2;
    out[`/images/${file}`] = r2;
    if (file.includes("-")) {
      out[`/images/${file.replace(/-/g, "")}`] = r2;
    }
  }
  // 無連字號別名
  out["/images/越南esim.png"] = r2ThumbUrl("越南-esim.png");
  out["/images/香港esim.png"] = r2ThumbUrl("香港-esim.png");
  out["/images/馬來西亞esim.png"] = r2ThumbUrl("馬來西亞-esim.png");
  return Object.fromEntries(
    Object.entries(out).filter(([, v]) => Boolean(v)),
  );
}

/** 舊站內路徑 → R2 */
export const LEGACY_ROOT_PRODUCT_IMAGE_REWRITES = buildLegacyRewrites();

/** 回傳特色圖 URL：優先 R2，否則站內 /images/sim/產品 */
export function getCountryProductImagePath(categoryHandle) {
  const handle = String(categoryHandle || "")
    .trim()
    .toLowerCase();
  const file = CATEGORY_PRODUCT_IMAGE_FILES[handle];
  if (!file) return null;
  return r2ThumbUrl(file) || `${PRODUCT_IMAGE_DIR}/${file}`;
}

/** 去背產品圖：略過 Next / CF 壓縮，避免透明變白底 */
export function isTransparentProductImageSrc(src) {
  if (!src || typeof src !== "string") return false;
  let path = src;
  try {
    if (/^https?:\/\//i.test(src)) {
      path = decodeURIComponent(new URL(src).pathname);
    } else {
      path = decodeURIComponent(src.split("?")[0].split("#")[0]);
    }
  } catch {
    path = src;
  }
  if (path.includes("/product-gallery/thumbs/")) return true;
  if (path.includes("/product-gallery/carousel/")) return true;
  if (path.includes("/sim/產品/")) return true;
  if (path.includes("/sim/教學/")) return true;
  if (LEGACY_ROOT_PRODUCT_IMAGE_REWRITES[path]) return true;
  return /\/images\/[^/]*(esim|eSIM)[^/]*\.png$/i.test(path);
}

function collectCategoryHandles(ctx = {}) {
  const handles = new Set();
  const { categorySlug, handle, categories } = ctx;
  if (categorySlug) {
    handles.add(String(categorySlug).trim().toLowerCase());
  }
  if (handle) {
    const h = String(handle).trim().toLowerCase();
    handles.add(h);
    const prefix = h.match(
      /^([a-z0-9]+(?:-[a-z0-9]+)*?)-(?:unlimited|total|daily|mainland)/,
    );
    if (prefix?.[1]) handles.add(prefix[1]);
  }
  if (Array.isArray(categories)) {
    for (const c of categories) {
      const ch = c?.handle || c?.slug;
      if (ch) handles.add(String(ch).trim().toLowerCase());
    }
  }
  return [...handles];
}

/** 有本機去背圖時，覆寫 Medusa / R2 舊主圖 */
export function withCountryProductImage(imageUrl, ctx = {}) {
  for (const h of collectCategoryHandles(ctx)) {
    const path = getCountryProductImagePath(h);
    if (path) return path;
  }
  return imageUrl || null;
}

export function getCountryProductImageUrl(categoryHandle, siteOrigin) {
  // 已一律走 R2，略過 siteOrigin
  void siteOrigin;
  return getCountryProductImagePath(categoryHandle);
}

/** 從商品 categories 解析主圖（多分類時取第一個有對應檔案的） */
export function resolveProductImageFromCategories(categories, siteOrigin) {
  const list = Array.isArray(categories) ? categories : [];
  const handles = list
    .map((c) => String(c?.handle || c || "").toLowerCase())
    .filter(Boolean);
  for (const h of handles) {
    const url = getCountryProductImageUrl(h, siteOrigin);
    if (url) return { handle: h, url, path: getCountryProductImagePath(h) };
  }
  return null;
}

/** 各國去背特色圖 + 全站共用教學輪播（第 2 張起） */
export function buildCountryProductGallery(categories, siteOrigin = "") {
  const picked = resolveProductImageFromCategories(categories, siteOrigin);
  if (!picked?.path) return null;
  return {
    handle: picked.handle,
    thumbnail: picked.path,
    urls: buildProductGalleryUrls(picked.path),
    images: buildProductGalleryUrls(picked.path).map((url) => ({ url })),
  };
}

export { SHARED_PRODUCT_CAROUSEL_IMAGES, buildProductGalleryUrls };
