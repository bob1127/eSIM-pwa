import { collectWpArticleImages } from "@/components/Blog/BlogArticleLightbox";
import { galleryUrls } from "@/lib/partnerBlogBlocks";
import { normalizeWpAssetUrl } from "@/lib/wordpress";

function toItem(src, alt = "") {
  const normalized = normalizeWpAssetUrl(src);
  if (!normalized) return null;
  return {
    src: normalized,
    thumb: normalized,
    alt: alt || "",
    type: "image",
  };
}

/**
 * 收集視覺編輯器區塊內所有可進幻燈片的圖片（順序與版面一致）
 */
export function collectPartnerBlogBlockImages(blocks = []) {
  const images = [];
  const indexBySrc = new Map();

  function add(src, alt = "") {
    const item = toItem(src, alt);
    if (!item) return -1;
    if (indexBySrc.has(item.src)) return indexBySrc.get(item.src);
    const idx = images.length;
    images.push(item);
    indexBySrc.set(item.src, idx);
    return idx;
  }

  function walk(list) {
    for (const block of list || []) walkOne(block);
  }

  function walkOne(block) {
    const p = block?.props || {};
    switch (block?.type) {
      case "image":
        add(p.src, p.alt);
        break;
      case "gallery":
      case "carousel":
        galleryUrls(p.urls).forEach((u) => add(u));
        break;
      case "photo-wall":
        galleryUrls(p.urls, 24).forEach((u) => add(u));
        break;
      case "html":
      case "text":
        collectWpArticleImages(p.html || "").forEach((item) =>
          add(item.src, item.alt),
        );
        break;
      case "columns":
      case "grid":
        (block.columns || []).forEach((col) => walk(col));
        break;
      default:
        break;
    }
  }

  walk(blocks);

  return {
    images,
    indexForSrc(src) {
      const key = normalizeWpAssetUrl(src);
      return key != null && indexBySrc.has(key) ? indexBySrc.get(key) : -1;
    },
  };
}

export function mergeArticleGalleryLists(...lists) {
  const images = [];
  const seen = new Set();
  for (const list of lists) {
    for (const item of list || []) {
      const key = item?.src;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      images.push(item);
    }
  }
  return images;
}
