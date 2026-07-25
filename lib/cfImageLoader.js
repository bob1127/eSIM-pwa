/**
 * Cloudflare Image Transformations loader（略過 Vercel /_next/image）
 *
 * 免費額友善：
 * - 寬度只落到少數 bucket（減少 unique transformations）
 * - quality 固定 75、format=auto
 * - onerror=redirect（同源圖超額時導回原圖；跨網域 R2 需靠 SafeImage onError）
 *
 * 啟用（正式站）：
 *   NEXT_PUBLIC_CF_IMAGES=1
 *   NEXT_PUBLIC_CF_IMAGES_ZONE=https://www.jeko-esim.com.tw
 * 前提：jeko-esim.com.tw 在 Cloudflare 橘色雲（proxied）
 */

const WIDTH_BUCKETS = [360, 640, 960, 1280];

function bucketWidth(width) {
  const n = Number(width) || 640;
  for (const b of WIDTH_BUCKETS) {
    if (n <= b) return b;
  }
  return WIDTH_BUCKETS[WIDTH_BUCKETS.length - 1];
}

function isCfImagesEnabled() {
  if (process.env.NODE_ENV === "development") return false;
  const flag = process.env.NEXT_PUBLIC_CF_IMAGES;
  return flag === "1" || flag === "true";
}

function getZoneOrigin() {
  const raw = (
    process.env.NEXT_PUBLIC_CF_IMAGES_ZONE ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/$/, "");
  }
}

/**
 * @param {{ src: string, width: number, quality?: number }} params
 */
export default function cfImageLoader({ src, width }) {
  if (!src || typeof src !== "string") return src;

  if (
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    /\.svg(\?|#|$)/i.test(src) ||
    /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src)
  ) {
    return src;
  }

  if (!isCfImagesEnabled()) {
    // 自訂 loader 不會走 Vercel Image Optimization → 避免 402
    return src;
  }

  const zone = getZoneOrigin();
  if (!zone) return src;

  const w = bucketWidth(width);
  const opts = [
    `width=${w}`,
    "quality=75",
    "format=auto",
    "fit=scale-down",
    "onerror=redirect",
  ].join(",");

  if (/^https?:\/\//i.test(src)) {
    return `${zone}/cdn-cgi/image/${opts}/${src}`;
  }

  const path = src.startsWith("/") ? src : `/${src}`;
  return `${zone}/cdn-cgi/image/${opts}${path}`;
}
