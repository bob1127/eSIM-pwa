/**
 * Medusa 圖片 URL 正規化：將 localhost / 舊網域改為正式後台網址
 * （資料庫若存了本機上傳時的 URL，前台才能正確顯示）
 *
 * 本機開發（NEXT_PUBLIC_MEDUSA_BACKEND_URL 指向 localhost）時保留本機 URL，
 * 避免把只存在本機 static 的影片／圖改寫到正式站造成黑畫面／404。
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

function isLocalHostUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\b/i.test(url || "");
}

function isLocalDevBackend() {
  const backend =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_ASSET_URL ||
    "";
  return isLocalHostUrl(backend) || backend.includes("localhost");
}

const REWRITE_ORIGINS = [
  /^https?:\/\/localhost:9000/i,
  /^https?:\/\/127\.0\.0\.1:9000/i,
  /^https?:\/\/localhost:3000/i,
];

/**
 * 舊路徑相容：部分商品／OG／分類 metadata 曾寫成 /images/美國esim.png、/images/分類eSIM-西班牙.png
 * 實際檔在 public/images/sim/產品 或 sim/分類（根目錄若有副本仍統一指到正確路徑）
 */
const LEGACY_SITE_IMAGE_REWRITES = {
  "/images/美國esim.png": "/images/sim/產品/美國esim.png",
  "/images/分類eSIM-美國.png": "/images/sim/分類/分類eSIM-美國.png",
  "/images/分類eSIM-美加-.png": "/images/sim/分類/分類eSIM-美加-.png",
  "/images/分類eSIM-美加.png": "/images/sim/分類/分類eSIM-美加-.png",
  "/images/分類eSIM-西班牙.png": "/images/sim/分類/分類eSIM-西班牙.png",
  "/images/分類eSIM-義大利.png": "/images/sim/分類/分類eSIM-義大利.png",
  "/images/分類eSIM-英國.png": "/images/sim/分類/分類eSIM-英國.png",
  "/images/分類eSIM-德國.png": "/images/sim/分類/分類eSIM-德國.png",
  "/images/分類eSIM-歐洲.png": "/images/sim/分類/分類eSIM-歐洲.png",
  "/images/分類eSIM-澳洲.png": "/images/sim/分類/分類eSIM-澳洲.png",
  "/images/分類eSIM-台灣.png": "/images/sim/分類/分類eSIM-台灣.png",
  "/images/分類eSIM-北美.png": "/images/sim/分類/分類eSIM-北美.png",
  "/images/分類eSIM-法國.png": "/images/sim/分類/分類eSIM-法國.png",
  "/images/分類eSIM-瑞士.png": "/images/sim/分類/分類eSIM-瑞士.png",
  "/images/分類eSIM-紐西蘭.png": "/images/sim/分類/分類eSIM-紐西蘭.png",
  "/images/分類eSIM-紐澳.png": "/images/sim/分類/分類eSIM-紐澳.png",
  "/images/分類eSIM-美加墨.png": "/images/sim/分類/分類eSIM-美加墨.png",
  "/images/分類eSIM-泰國.png": "/images/sim/分類/分類eSIM-泰國.png",
};

function decodePathname(pathname) {
  if (!pathname) return pathname;
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

/**
 * 將正式站／本機絕對網址的 /images/... 改成相對路徑，讓本機 public 能直接提供。
 * 非站內圖維持原樣。
 */
export function toSameOriginImagePath(url) {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("/")) {
    return rewriteLegacySiteImagePath(trimmed);
  }
  try {
    const u = new URL(trimmed);
    if (
      !/jeko-esim\.com\.tw$/i.test(u.hostname) &&
      u.hostname !== "localhost" &&
      u.hostname !== "127.0.0.1"
    ) {
      return trimmed;
    }
    const path = decodePathname(u.pathname);
    return rewriteLegacySiteImagePath(path) || path;
  } catch {
    return trimmed;
  }
}

function rewriteLegacySiteImagePath(url) {
  if (!url || typeof url !== "string") return url;
  try {
    if (url.startsWith("/")) {
      const qIndex = url.indexOf("?");
      const pathOnly = qIndex >= 0 ? url.slice(0, qIndex) : url;
      const query = qIndex >= 0 ? url.slice(qIndex) : "";
      const decoded = decodePathname(pathOnly);
      return (LEGACY_SITE_IMAGE_REWRITES[decoded] || decoded) + query;
    }
    const u = new URL(url);
    if (!/jeko-esim\.com\.tw$/i.test(u.hostname) && u.hostname !== "localhost") {
      return url;
    }
    const decoded = decodePathname(u.pathname);
    const next = LEGACY_SITE_IMAGE_REWRITES[decoded];
    if (!next) {
      // 仍把編碼 pathname 解成可讀路徑，方便對照；回傳相對路徑利於本機
      if (decoded !== u.pathname && decoded.startsWith("/images/")) {
        return decoded + u.search + u.hash;
      }
      return url;
    }
    // 站內圖改相對路徑：本機 / 正式站都走各自 public
    return next + u.search + u.hash;
  } catch {
    return url;
  }
}

/**
 * 是否略過優化（傳給 SafeImage 的 unoptimized）。
 * - 本機 next dev：不 bypass，讓 Next 轉 WebP（含 R2／正式站絕對網址）
 * - Cloudflare Image Transformations 啟用時：勿 bypass，交給 cfImageLoader（format=auto → WebP/AVIF）
 * - 未啟用 CF 的正式站：遠端圖 bypass，避免誤走 Vercel /_next/image 產生 402
 */
export function shouldBypassImageOptimization(src) {
  if (!src || typeof src !== "string") return false;
  if (process.env.NODE_ENV === "development" && process.env.VERCEL !== "1") {
    return false;
  }
  const flag = String(process.env.NEXT_PUBLIC_CF_IMAGES || "")
    .trim()
    .toLowerCase();
  const cfOn =
    flag === "1" ||
    flag === "true" ||
    flag === "on";
  if (cfOn) {
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
  const trimmed = rewriteLegacySiteImagePath(url.trim());
  if (!trimmed) return null;

  const backendOrigin = getBackendOrigin();

  if (trimmed.startsWith("/static/")) {
    // 本機開發時優先走本地 Medusa，避免 SYNC 正式站沒有剛上傳的檔
    if (isLocalDevBackend()) {
      try {
        return `${new URL(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL).origin}${trimmed}`;
      } catch {
        return `http://localhost:9000${trimmed}`;
      }
    }
    return `${backendOrigin}${trimmed}`;
  }

  // 本機開發 + DB 仍是 localhost URL → 不要改寫到正式站
  if (isLocalDevBackend() && isLocalHostUrl(trimmed)) {
    return trimmed;
  }

  let resolved = trimmed;
  for (const pattern of REWRITE_ORIGINS) {
    if (pattern.test(resolved)) {
      resolved = resolved.replace(pattern, backendOrigin);
      break;
    }
  }

  return rewriteLegacySiteImagePath(resolved);
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

/**
 * 本機 .MOV（QuickTime／HEVC）在 Chrome 常無法播放。
 * 若路徑像 Medusa static 上傳檔，改指向同名 H.264 .mp4（空格正規成 _）。
 */
export function preferPlayableVideoUrl(url) {
  if (!url || !/\.mov(\?|#|$)/i.test(url)) return url;
  if (!isLocalHostUrl(url) && !url.startsWith("/static/")) return url;
  try {
    const base =
      url.startsWith("/static/")
        ? `http://localhost:9000${url}`
        : url;
    const u = new URL(base);
    let path = decodeURIComponent(u.pathname);
    path = path.replace(/ /g, "_").replace(/\.mov$/i, ".mp4");
    u.pathname = path;
    return url.startsWith("/static/")
      ? `${u.pathname}${u.search}${u.hash}`
      : u.toString();
  } catch {
    return url.replace(/ /g, "_").replace(/\.mov(\?|#|$)/i, ".mp4$1");
  }
}

/** 商品畫廊媒體（圖片 + 影片） */
export function buildProductMediaList({ thumbnail, imageUrls = [], name = "" }) {
  const items = [];
  const seen = new Set();

  const pushItem = (url) => {
    let resolved = resolveMedusaImageUrl(url);
    if (!resolved) return;
    if (isMedusaVideoUrl(resolved)) {
      resolved = preferPlayableVideoUrl(resolved);
    }
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
