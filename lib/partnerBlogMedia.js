/** 夥伴文章媒體上傳上限（避免 Cloudflare R2 被大檔灌爆） */
export const BLOG_IMAGE_MAX_BYTES = 1.5 * 1024 * 1024; // 1.5MB
export const BLOG_VIDEO_MAX_BYTES = 8 * 1024 * 1024; // 8MB
/** 每篇文章可上傳至 R2 的本機影片數（YouTube／Vimeo 嵌入不計） */
export const BLOG_VIDEO_MAX_PER_POST = 2;
export const BLOG_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const BLOG_VIDEO_TYPES = ["video/mp4", "video/webm"];

export function formatUploadBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.round(n / 1024)}KB`;
}

export const BLOG_VIDEO_UPLOAD_NOTE = `本機影片：每篇最多 ${BLOG_VIDEO_MAX_PER_POST} 支，單檔 ≤ ${formatUploadBytes(BLOG_VIDEO_MAX_BYTES)}（MP4／WEBM）。建議優先用 YouTube／Vimeo 嵌入以節省空間。`;

export function blogMediaKindFromFile(file) {
  if (!file?.type) return null;
  if (BLOG_IMAGE_TYPES.includes(file.type)) return "image";
  if (BLOG_VIDEO_TYPES.includes(file.type)) return "video";
  return null;
}

export function blogMediaLimit(kind) {
  return kind === "video" ? BLOG_VIDEO_MAX_BYTES : BLOG_IMAGE_MAX_BYTES;
}

/** 遞迴計算文章內已上傳本機影片（有 fileUrl 的 video 元件） */
export function countBlogUploadedVideos(blocks, { excludeBlockId } = {}) {
  let count = 0;
  const walk = (list) => {
    for (const b of list || []) {
      if (
        b?.type === "video" &&
        b.id !== excludeBlockId &&
        String(b.props?.fileUrl || "").trim()
      ) {
        count += 1;
      }
      if (Array.isArray(b?.columns)) {
        for (const col of b.columns) walk(col);
      }
    }
  };
  walk(blocks);
  return count;
}
