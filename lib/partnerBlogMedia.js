/** 夥伴文章媒體上傳上限（避免 Cloudflare R2 被大檔灌爆） */
export const BLOG_IMAGE_MAX_BYTES = 1.5 * 1024 * 1024; // 1.5MB
export const BLOG_VIDEO_MAX_BYTES = 8 * 1024 * 1024; // 8MB
export const BLOG_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const BLOG_VIDEO_TYPES = ["video/mp4", "video/webm"];

export function formatUploadBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.round(n / 1024)}KB`;
}

export function blogMediaKindFromFile(file) {
  if (!file?.type) return null;
  if (BLOG_IMAGE_TYPES.includes(file.type)) return "image";
  if (BLOG_VIDEO_TYPES.includes(file.type)) return "video";
  return null;
}

export function blogMediaLimit(kind) {
  return kind === "video" ? BLOG_VIDEO_MAX_BYTES : BLOG_IMAGE_MAX_BYTES;
}
