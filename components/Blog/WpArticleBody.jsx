"use client";

import { useMemo } from "react";
import parse from "html-react-parser";
import {
  BlogArticleLightboxProvider,
  useBlogLightbox,
} from "@/components/Blog/BlogArticleLightbox";
import { createWpContentReplace } from "@/components/Blog/wpContentReplace";
import { normalizeWpAssetUrl } from "@/lib/wordpress";

function prepareWpContentHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<(table|th|td)([^>]*)>/gi, (match, tag, attrs = "") => {
      const cleaned = String(attrs)
        .replace(/style="[^"]*display\s*:\s*none[^"]*"/gi, "")
        .replace(
          /style="([^"]*)"/gi,
          (_, style) => {
            const next = String(style)
              .replace(/border[^;]*;?/gi, "")
              .replace(/background(-color)?\s*:[^;]*;?/gi, "")
              .trim()
              .replace(/;+$/, "");
            return next ? `style="${next}"` : "";
          },
        );
      if (tag.toLowerCase() !== "table") {
        return `<${tag}${cleaned}>`;
      }
      if (/class="/i.test(cleaned)) {
        return `<table${cleaned.replace(/class="([^"]*)"/i, 'class="$1 wp-blog-table"')}>`;
      }
      return `<table class="wp-blog-table"${cleaned}>`;
    })
    .replace(
      /<figure([^>]*class="[^"]*wp-block-table[^"]*")/gi,
      "<figure$1 wp-table-figure",
    );
}

function WpArticleBodyInner({ prepared, replaceExtras }) {
  const { openAt } = useBlogLightbox();
  const extras =
    typeof replaceExtras === "function" ? replaceExtras() : replaceExtras || {};

  return parse(
    prepared,
    createWpContentReplace({
      normalizeUrl: normalizeWpAssetUrl,
      imageWrapperClassName: "wp-single-img my-10 text-left",
      imageClassName: "wp-single-img__media",
      onOpenLightbox: openAt,
      ...extras,
    }),
  );
}

/**
 * 文章內文：媒體區塊對齊 WP + 整篇圖片幻燈片 popup
 */
export default function WpArticleBody({
  html,
  className,
  replaceExtras,
  lightboxTitle = "文章圖片",
}) {
  const prepared = useMemo(() => prepareWpContentHtml(html), [html]);

  return (
    <BlogArticleLightboxProvider html={prepared} title={lightboxTitle}>
      <div className={className}>
        <WpArticleBodyInner
          prepared={prepared}
          replaceExtras={replaceExtras}
        />
      </div>
    </BlogArticleLightboxProvider>
  );
}
