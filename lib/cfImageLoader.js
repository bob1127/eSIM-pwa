/**
 * Cloudflare Image Transformations（略過 Vercel /_next/image）
 *
 * R2 只存原檔（png/jpg），不會自動轉 WebP。
 * 轉換發生在瀏覽器打到橘色雲網域的 /cdn-cgi/image/format=auto/...
 *
 * 啟用：
 *   正式站預設開啟（NODE_ENV=production）
 *   本機要測 CF：NEXT_PUBLIC_CF_IMAGES=1
 *   強制關閉：NEXT_PUBLIC_CF_IMAGES=0
 *
 * 前提：測試站／正式站網域在 Cloudflare 橘色雲，且
 * Dashboard → Images → Transformations（或 Speed → Image Resizing）已開啟。
 */

const WIDTH_BUCKETS = [360, 640, 960, 1280];

export function bucketWidth(width) {
  const n = Number(width) || 640;
  for (const b of WIDTH_BUCKETS) {
    if (n <= b) return b;
  }
  return WIDTH_BUCKETS[WIDTH_BUCKETS.length - 1];
}

export function isCfImagesEnabled() {
  const flag = String(process.env.NEXT_PUBLIC_CF_IMAGES || "")
    .trim()
    .toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  return process.env.NODE_ENV === "production";
}

/**
 * QR / favicon / SVG 等不該被壓縮或轉 WebP 的圖。
 */
export function shouldSkipCfImage(src) {
  if (!src || typeof src !== "string") return true;
  if (src.startsWith("data:") || src.startsWith("blob:")) return true;
  if (src.includes("/cdn-cgi/image/")) return true;
  if (/\.svg(\?|#|$)/i.test(src)) return true;
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src)) return true;
  if (/\.gif(\?|#|$)/i.test(src)) return true;
  if (/\.ico(\?|#|$)/i.test(src)) return true;
  if (/favicon|apple-touch-icon/i.test(src)) return true;
  if (/qrcode|qr-code|\/qr\/|barcode/i.test(src)) return true;
  return false;
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

export function transformOptions(width) {
  return [
    `width=${bucketWidth(width)}`,
    "quality=75",
    "format=auto",
    "fit=scale-down",
    "onerror=redirect",
  ].join(",");
}

/**
 * @param {{ src: string, width?: number, quality?: number }} params
 */
export default function cfImageLoader({ src, width }) {
  if (shouldSkipCfImage(src)) return src;
  if (!isCfImagesEnabled()) return src;

  const opts = transformOptions(width);

  // 相對路徑：測試站、正式站各自走自己的橘色雲（不要寫死 www）
  if (!/^https?:\/\//i.test(src)) {
    const path = src.startsWith("/") ? src : `/${src}`;
    return `/cdn-cgi/image/${opts}${path}`;
  }

  // 絕對網址（R2 / 正式站圖）：優先相對 /cdn-cgi，讓目前網域的 CF 去拉原圖
  const zone = getZoneOrigin();
  try {
    const srcUrl = new URL(src);
    const zoneHost = zone ? new URL(zone).host : "";
    const sameHost = zoneHost && srcUrl.host === zoneHost;
    if (sameHost) {
      return `/cdn-cgi/image/${opts}${srcUrl.pathname}${srcUrl.search}`;
    }
  } catch {
    /* fall through */
  }

  return `/cdn-cgi/image/${opts}/${src}`;
}

/** 給 <img src> / WP HTML 用的捷徑 */
export function cfImgSrc(src, width = 960) {
  return cfImageLoader({ src, width });
}
