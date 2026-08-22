"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import parse from "html-react-parser";
import MediaGalleryLightbox from "@/components/MediaGalleryLightbox";
import {
  isImgInsideWpGallery,
  isWpGalleryNode,
} from "@/components/Blog/WpPhotoWall";
import {
  collectSlidesFromNode,
  isImgInsideWpSlideshow,
  isWpSlideshowNode,
} from "@/components/Blog/WpSlideshow";
import { normalizeWpAssetUrl } from "@/lib/wordpress";

const BlogLightboxContext = createContext(null);

function toLightboxItem(img, normalizeUrl = normalizeWpAssetUrl) {
  const src = normalizeUrl(img.href || img.src);
  return {
    src,
    thumb: normalizeUrl(img.src || img.href),
    alt: img.alt || img.caption || "",
    type: "image",
  };
}

/**
 * 收集文章級幻燈片用圖片（投影片＋單圖）。
 * 並排圖庫／圖片牆另有獨立幻燈片，不併入此列表。
 */
export function collectWpArticleImages(
  html,
  normalizeUrl = normalizeWpAssetUrl,
) {
  if (!html) return [];
  const images = [];

  parse(String(html), {
    replace: (node) => {
      if (node.type !== "tag") return undefined;

      if (isWpSlideshowNode(node)) {
        collectSlidesFromNode(node).forEach((s) => {
          if (s?.src) images.push(toLightboxItem(s, normalizeUrl));
        });
        return <></>;
      }

      // 圖片牆不進整篇幻燈片
      if (isWpGalleryNode(node)) {
        return <></>;
      }

      if (node.name === "img" && node.attribs?.src) {
        if (isImgInsideWpSlideshow(node) || isImgInsideWpGallery(node)) {
          return null;
        }
        images.push(
          toLightboxItem(
            {
              src: node.attribs.src,
              alt: node.attribs.alt || "",
              href:
                node.attribs["data-full-url"] ||
                node.attribs["data-orig-file"] ||
                node.attribs.src,
            },
            normalizeUrl,
          ),
        );
      }

      return undefined;
    },
  });

  return images;
}

export function BlogArticleLightboxProvider({
  html,
  images: imagesOverride,
  normalizeUrl = normalizeWpAssetUrl,
  children,
  title = "文章圖片",
}) {
  const imagesFromHtml = useMemo(
    () =>
      imagesOverride != null
        ? []
        : collectWpArticleImages(html, normalizeUrl),
    [html, imagesOverride, normalizeUrl],
  );
  const images = useMemo(() => {
    if (imagesOverride != null) {
      return imagesOverride;
    }
    return imagesFromHtml;
  }, [imagesOverride, imagesFromHtml]);
  const [lightbox, setLightbox] = useState({ open: false, index: 0 });

  const openAt = useCallback((index) => {
    const i = Number(index);
    if (!Number.isFinite(i) || i < 0) return;
    setLightbox({ open: true, index: i });
  }, []);

  const value = useMemo(
    () => ({ images, openAt, count: images.length }),
    [images, openAt],
  );

  return (
    <BlogLightboxContext.Provider value={value}>
      {children}
      <MediaGalleryLightbox
        isOpen={lightbox.open}
        onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        images={images}
        title={title}
        initialIndex={lightbox.index}
        ariaLabel="文章圖片幻燈片"
      />
    </BlogLightboxContext.Provider>
  );
}

export function useBlogLightbox() {
  return useContext(BlogLightboxContext);
}
