/**
 * Medusa 圖片 URL 正規化：將 localhost / 舊網域改為正式後台網址
 * （資料庫若存了本機上傳時的 URL，前台才能正確顯示）
 */
const DEFAULT_BACKEND =
  process.env.NEXT_PUBLIC_MEDUSA_ASSET_URL ||
  process.env.MEDUSA_SYNC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

function getBackendOrigin() {
  try {
    return new URL(DEFAULT_BACKEND).origin;
  } catch {
    return "http://localhost:9000";
  }
}

const REWRITE_ORIGINS = [
  /^https?:\/\/localhost:9000/i,
  /^https?:\/\/127\.0\.0\.1:9000/i,
  /^https?:\/\/localhost:3000/i,
];

/**
 * 是否略過優化（unoptimized）。
 * - 已接 Cloudflare Image Transformations 時：交給 cfImageLoader（勿 unoptimized）
 * - 未啟用 CF 時：遠端圖仍 unoptimized，避免 Vercel /_next/image 402
 *   （若 next.config 已設 custom loader，遠端也可不 unoptimized；雙保險保留）
 */
export function shouldBypassImageOptimization(src) {
  if (!src || typeof src !== "string") return false;
  const cfOn =
    process.env.NEXT_PUBLIC_CF_IMAGES === "1" ||
    process.env.NEXT_PUBLIC_CF_IMAGES === "true";
  if (cfOn && process.env.NODE_ENV !== "development") {
    return false;
  }
  return (
    /^https?:\/\//i.test(src) ||
    src.includes("/static/") ||
    /\.vercel\.app/i.test(src) ||
    /\.r2\.dev/i.test(src)
  );
}

/** @deprecated 請改用 shouldBypassImageOptimization */
export function isMedusaStaticImage(src) {
  return shouldBypassImageOptimization(src);
}

/** 單一圖片 URL */
export function resolveMedusaImageUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const backendOrigin = getBackendOrigin();

  if (trimmed.startsWith("/static/")) {
    return `${backendOrigin}${trimmed}`;
  }

  let resolved = trimmed;
  for (const pattern of REWRITE_ORIGINS) {
    if (pattern.test(resolved)) {
      resolved = resolved.replace(pattern, backendOrigin);
      break;
    }
  }

  return resolved;
}

/** 多張商品圖 */
export function resolveMedusaImageUrls(urls) {
  if (!Array.isArray(urls)) return [];
  return urls.map(resolveMedusaImageUrl).filter(Boolean);
}

const VIDEO_URL_PATTERN = /\.(mp4|mov|webm|m4v)(\?|#|$)/i;

/** 是否為影片 URL */
export function isMedusaVideoUrl(url) {
  if (!url || typeof url !== "string") return false;
  return VIDEO_URL_PATTERN.test(url);
}

/** 商品畫廊媒體（圖片 + 影片） */
export function buildProductMediaList({ thumbnail, imageUrls = [], name = "" }) {
  const items = [];
  const seen = new Set();

  const pushItem = (url) => {
    const resolved = resolveMedusaImageUrl(url);
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);
    items.push({
      src: resolved,
      alt: name || "Product media",
      type: isMedusaVideoUrl(resolved) ? "video" : "image",
    });
  };

  pushItem(thumbnail);
  imageUrls.forEach(pushItem);

  if (!items.length) {
    items.push({
      src: "/default-image.jpg",
      alt: name || "Product Image",
      type: "image",
    });
  }

  return items;
}
