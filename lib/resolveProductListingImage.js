import { resolveMedusaImageUrl } from "./resolveMedusaImageUrl";
import { withCountryProductImage } from "./countryProductImages";
import { withUsEsimDefaultImage } from "./usEsimDefaultImage";
import {
  SHARED_PRODUCT_CAROUSEL_IMAGES,
  buildProductGalleryUrls,
  isSharedCarouselImageUrl,
} from "./productCarouselShared";

/** 商品列表／分類卡：Medusa 主圖 → 美國預設 → 本機去背產品圖 */
export function resolveProductListingImage(thumbnail, ctx = {}) {
  const resolved = resolveMedusaImageUrl(thumbnail);
  const withUs = withUsEsimDefaultImage(resolved, ctx);
  return withCountryProductImage(withUs, ctx);
}

/**
 * 商品詳情輪播：第 1 張各國特色圖 + 第 2 張起共用教學圖
 * （不依賴 Medusa Admin 寫入，前台直接組裝）
 */
export function resolveProductGalleryUrls(thumbnail, imageUrls = [], ctx = {}) {
  const feature = resolveProductListingImage(thumbnail, ctx);
  if (!feature) {
    const cleaned = (imageUrls || [])
      .map((u) => resolveMedusaImageUrl(u))
      .filter(Boolean)
      .filter((u) => !isSharedCarouselImageUrl(u));
    return cleaned.length
      ? [...cleaned.slice(0, 1), ...SHARED_PRODUCT_CAROUSEL_IMAGES]
      : [...SHARED_PRODUCT_CAROUSEL_IMAGES];
  }
  return buildProductGalleryUrls(feature);
}

export { SHARED_PRODUCT_CAROUSEL_IMAGES, buildProductGalleryUrls };
