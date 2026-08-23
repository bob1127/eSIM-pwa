/**
 * 全站商品輪播共用圖（第 2 張起）— Cloudflare R2
 */
import { R2_SHARED_CAROUSEL_IMAGES } from "./productGalleryR2.js";

export const SHARED_PRODUCT_CAROUSEL_IMAGES = R2_SHARED_CAROUSEL_IMAGES;

/** 各國特色圖 + 共用輪播（皆 R2） */
export function buildProductGalleryUrls(featureImagePath) {
  const thumb = String(featureImagePath || "").trim();
  if (!thumb) return null;
  return [thumb, ...SHARED_PRODUCT_CAROUSEL_IMAGES];
}

export function buildProductGalleryPayload(featureImagePath) {
  const urls = buildProductGalleryUrls(featureImagePath);
  if (!urls) return null;
  return urls.map((url) => ({ url }));
}

/** 是否為共用教學輪播圖（R2 或舊站內／static 路徑） */
export function isSharedCarouselImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  let path = url;
  try {
    if (/^https?:\/\//i.test(url)) path = decodeURIComponent(new URL(url).pathname);
    else path = decodeURIComponent(url.split("?")[0]);
  } catch {
    path = url;
  }
  if (path.includes("/product-gallery/carousel/")) return true;
  if (path.includes("/images/sim/教學/")) return true;
  if (/\/static\/1787464295/.test(path)) return true;
  if (/support-0[123]\.png$/i.test(path)) return true;
  return false;
}
