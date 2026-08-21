/**
 * Cloudflare Image Transformations（略過 Vercel /_next/image）
 *
 * R2 只存原檔（png/jpg），不會自動轉 WebP。
 * 轉換發生在瀏覽器打到橘色雲網域的 /cdn-cgi/image/format=auto/...
 *
 * 啟用（必須明確開，否則 /cdn-cgi/image 404 會整站破圖）：
 *   NEXT_PUBLIC_CF_IMAGES=1
 * 關閉：不設，或 =0
 *
 * 前提：網域橘色雲，且 Dashboard → Images → Transformations 已開。
 * Polish / WebP 自動壓縮不需要改 URL，不要開這個 flag。
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
  return flag === "1" || flag === "true" || flag === "on";
}

/** 中文檔名必須編碼，否則 CF 回 9406/9419 破圖 */
function encodeSourcePath(pathname) {
  return String(pathname || "")
    .split("/")
    .map((seg) => {
      if (!seg) return seg;
      try {
        return encodeURIComponent(decodeURIComponent(seg));
      } catch {
        return encodeURIComponent(seg);
      }
    })
    .join("/");
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
    // 同網域原圖：額度用完（9422）等錯誤時 CF 會 302 回原圖
    // R2 等外網原圖仍可能失敗 → SafeImage / bootstrap 再剝 URL 回退
    "onerror=redirect",
  ].join(",");
}

/**
 * 從 /cdn-cgi/image/... 還原原始 src（額度用完、轉換失敗時用）。
 * - /cdn-cgi/image/opts/path → /path
 * - /cdn-cgi/image/opts/https://... → https://...
 */
export function unwrapCfImageSrc(url) {
  if (!url || typeof url !== "string") return url;
  const marker = "/cdn-cgi/image/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  let rest = url.slice(idx + marker.length);
  // 去掉 options 段（第一段逗號參數，直到下一個 /）
  const slash = rest.indexOf("/");
  if (slash === -1) return url;
  rest = rest.slice(slash + 1);

  if (/^https?:\/\//i.test(rest)) return rest;
  if (rest.startsWith("/")) return rest;
  return `/${rest}`;
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
    const path = encodeSourcePath(src.startsWith("/") ? src : `/${src}`);
    return `/cdn-cgi/image/${opts}${path}`;
  }

  // 絕對網址（R2 / 正式站圖）：優先相對 /cdn-cgi，讓目前網域的 CF 去拉原圖
  const zone = getZoneOrigin();
  try {
    const srcUrl = new URL(src);
    const zoneHost = zone ? new URL(zone).host : "";
    const sameHost = zoneHost && srcUrl.host === zoneHost;
    if (sameHost) {
      return `/cdn-cgi/image/${opts}${encodeSourcePath(srcUrl.pathname)}${srcUrl.search}`;
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
