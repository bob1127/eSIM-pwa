/**
 * 日本 eSIM 商品輪播（R2：特色圖 + 全站共用教學圖）
 */
import {
  SHARED_PRODUCT_CAROUSEL_IMAGES,
  buildProductGalleryPayload,
  buildProductGalleryUrls,
} from "../../lib/productCarouselShared.js";
import { R2_PRODUCT_THUMB_BY_FILE } from "../../lib/productGalleryR2.js";

export const JAPAN_PRODUCT_THUMB =
  process.env.JAPAN_PRODUCT_THUMB ||
  R2_PRODUCT_THUMB_BY_FILE["日本esim.png"] ||
  "https://pub-bafdb375cb164c488d6841a7b565951a.r2.dev/product-gallery/thumbs/%E6%97%A5%E6%9C%ACesim.png";

export const JAPAN_CAROUSEL_STATIC_IMAGES = SHARED_PRODUCT_CAROUSEL_IMAGES;

export const JAPAN_PRODUCT_GALLERY = buildProductGalleryUrls(JAPAN_PRODUCT_THUMB);

export function japanProductImages() {
  return buildProductGalleryPayload(JAPAN_PRODUCT_THUMB);
}
