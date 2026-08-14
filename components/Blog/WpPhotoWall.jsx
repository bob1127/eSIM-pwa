"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeWpAssetUrl } from "@/lib/wordpress";
import MediaGalleryLightbox from "@/components/MediaGalleryLightbox";
import {
  GUTTER_WIDTH,
  layoutJustifiedRows,
} from "@/components/Blog/jetpackMosaicLayout";

/** WordPress 圖庫／並排圖庫（Jetpack Tiled Gallery）容器 */
export function isWpGalleryNode(node) {
  if (!node || node.type !== "tag") return false;
  const cls = String(node.attribs?.class || "");
  return /wp-block-gallery|wp-block-jetpack-tiled-gallery|jetpack-tiled-gallery|tiled-gallery|blocks-gallery-grid|blocks-gallery|wp-block-gallery-/.test(
    cls,
  );
}

/** 圖片是否在圖庫容器內 */
export function isImgInsideWpGallery(node) {
  let p = node?.parent;
  while (p) {
    if (isWpGalleryNode(p)) return true;
    p = p.parent;
  }
  return false;
}

function parsePositiveNumber(...vals) {
  for (const v of vals) {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function parseDimsFromStyle(style) {
  const s = String(style || "");
  const w = s.match(/width:\s*([\d.]+)px/i);
  const h = s.match(/height:\s*([\d.]+)px/i);
  if (w && h) {
    return {
      w: Number.parseFloat(w[1]),
      h: Number.parseFloat(h[1]),
    };
  }
  return { w: null, h: null };
}

function parseDimsFromFilename(url) {
  const m = String(url || "").match(/[-_](\d{2,5})x(\d{2,5})(?:\.[a-z0-9]+)?(?:[?#]|$)/i);
  if (!m) return { w: null, h: null };
  return { w: Number(m[1]), h: Number(m[2]) };
}

function collectImgs(node, out = []) {
  if (!node) return out;
  if (node.name === "img" && node.attribs?.src) {
    const styleDims = parseDimsFromStyle(node.attribs.style);
    const full =
      node.attribs["data-orig-file"] ||
      node.attribs["data-full-url"] ||
      (node.parent?.name === "a" ? node.parent.attribs?.href : "") ||
      node.attribs.src;
    const fileDims = parseDimsFromFilename(full) || parseDimsFromFilename(node.attribs.src);
    const w = parsePositiveNumber(
      node.attribs["data-orig-width"],
      node.attribs["data-width"],
      node.attribs.width,
      styleDims.w,
      fileDims.w,
    );
    const h = parsePositiveNumber(
      node.attribs["data-orig-height"],
      node.attribs["data-height"],
      node.attribs.height,
      styleDims.h,
      fileDims.h,
    );
    out.push({
      src: node.attribs.src,
      alt: node.attribs.alt || "",
      href:
        node.parent?.name === "a" && node.parent.attribs?.href
          ? node.parent.attribs.href
          : node.attribs["data-full-url"] ||
            node.attribs["data-orig-file"] ||
            node.attribs.src,
      width: w,
      height: h,
    });
  }
  if (Array.isArray(node.children)) {
    node.children.forEach((c) => collectImgs(c, out));
  }
  return out;
}

export function collectImgsFromGalleryNode(node) {
  return collectImgs(node);
}

function tagKids(node) {
  return (node?.children || []).filter((c) => c && c.type === "tag");
}

function parsePx(style, prop) {
  const m = String(style || "").match(
    new RegExp(`${prop}\\s*:\\s*([\\d.]+)px`, "i"),
  );
  return m ? Number.parseFloat(m[1]) : null;
}

/**
 * 讀出 Jetpack 後台已算好的列／欄／寬高，前台才能跟編輯器同一套拼貼。
 */
export function extractWpMosaicLayout(root) {
  const images = [];
  const rows = [];

  const findItems = (node, acc = []) => {
    if (!node || node.type !== "tag") return acc;
    const cls = String(node.attribs?.class || "");
    if (/tiled-gallery__item/.test(cls)) {
      acc.push(node);
      return acc;
    }
    tagKids(node).forEach((c) => findItems(c, acc));
    return acc;
  };

  const walk = (node) => {
    if (!node || node.type !== "tag") return;
    const cls = String(node.attribs?.class || "");
    if (/tiled-gallery__row/.test(cls)) {
      const cols = [];
      tagKids(node).forEach((colNode) => {
        if (!/tiled-gallery__col/.test(String(colNode.attribs?.class || ""))) {
          return;
        }
        const items = [];
        findItems(colNode).forEach((itemNode) => {
          const imgs = collectImgs(itemNode);
          const img = imgs[0];
          if (!img) return;
          const itemStyle = itemNode.attribs?.style || "";
          const imgStyle = itemNode.name === "img" ? itemNode.attribs?.style : "";
          const innerImg = tagKids(itemNode).find((c) => c.name === "img");
          const w =
            parsePx(itemStyle, "width") ||
            parsePx(innerImg?.attribs?.style || imgStyle, "width") ||
            img.width ||
            0;
          const h =
            parsePx(itemStyle, "height") ||
            parsePx(innerImg?.attribs?.style || imgStyle, "height") ||
            img.height ||
            0;
          const index = images.length;
          images.push(img);
          items.push({ index, width: w, height: h });
        });
        if (items.length) cols.push({ items });
      });
      if (cols.length) rows.push({ cols });
      return;
    }
    tagKids(node).forEach(walk);
  };

  walk(root);
  if (!rows.length || !images.length) return null;

  const sourceWidth = rows.reduce((max, row) => {
    const colW = row.cols.reduce((s, col, i) => {
      const w = Number(col.items[0]?.width) || 0;
      return s + w + (i > 0 ? GUTTER_WIDTH : 0);
    }, 0);
    return Math.max(max, colW);
  }, 0);
  if (sourceWidth < 40) return null;
  return { images, rows, sourceWidth };
}

function scaleMosaicRows(rows, sourceWidth, targetWidth) {
  if (!sourceWidth || !targetWidth || !rows?.length) return [];
  const s = targetWidth / sourceWidth;
  return rows.map((row) => ({
    cols: row.cols.map((col) => ({
      items: col.items.map((it) => ({
        index: it.index,
        width: Math.max(1, it.width * s),
        height: Math.max(1, it.height * s),
      })),
    })),
  }));
}

export const PHOTO_WALL_MAX_H = {
  sm: 260,
  md: 380,
  lg: 520,
  full: 0,
};

function squareColumnCount(size, isWide, width) {
  const base = { sm: 5, md: 4, lg: 3, full: 2 }[size] || 4;
  let cols = isWide ? base + 1 : base;
  if (width < 420) cols = Math.min(cols, 2);
  else if (width < 720) cols = Math.min(cols, 3);
  return Math.max(1, cols);
}

function layoutSquareRows(count, containerWidth, { size = "md", isWide = false } = {}) {
  const g = GUTTER_WIDTH;
  const W = Math.max(1, containerWidth);
  const cols = squareColumnCount(size, isWide, W);
  const side = (W - g * Math.max(0, cols - 1)) / cols;
  const rows = [];
  for (let i = 0; i < count; i += cols) {
    const n = Math.min(cols, count - i);
    rows.push({
      cols: Array.from({ length: n }, (_, c) => ({
        items: [{ index: i + c, width: side, height: side }],
      })),
    });
  }
  return rows;
}

function capMosaicRowHeight(rows, maxH) {
  if (!maxH || !rows?.length) return rows;
  return rows.map((row) => {
    const h = Math.max(
      1,
      ...row.cols.flatMap((c) => c.items.map((it) => Number(it.height) || 1)),
    );
    if (h <= maxH) return row;
    const s = maxH / h;
    return {
      cols: row.cols.map((col) => ({
        items: col.items.map((it) => ({
          ...it,
          width: it.width,
          height: Math.max(1, it.height * s),
        })),
      })),
    };
  });
}

function readImageAspect(url) {
  return new Promise((resolve) => {
    if (!url || typeof window === "undefined") {
      resolve(null);
      return;
    }
    const el = new window.Image();
    el.onload = () => {
      const w = el.naturalWidth;
      const h = el.naturalHeight;
      resolve(w > 0 && h > 0 ? w / h : null);
    };
    el.onerror = () => resolve(null);
    el.src = url;
  });
}

/**
 * Jetpack 並排圖庫：優先用後台已存的 mosaic；否則等真實比例再排。
 * 點擊開本圖牆幻燈片。
 */
export default function WpPhotoWall({
  images = [],
  isWide = false,
  mosaic = null,
  size = "md",
  align = "center",
  layout = "mosaic",
}) {
  const wrapRef = useRef(null);
  const sourceImages = mosaic?.images?.length ? mosaic.images : images;
  const list = useMemo(
    () =>
      (sourceImages || [])
        .filter((i) => i?.src)
        .map((img) => ({
          src: normalizeWpAssetUrl(img.href || img.src),
          thumb: normalizeWpAssetUrl(img.src),
          alt: img.alt || "",
          type: "image",
          knownW: img.width || null,
          knownH: img.height || null,
        })),
    [sourceImages],
  );

  const [lightbox, setLightbox] = useState({ open: false, index: 0 });
  const [containerWidth, setContainerWidth] = useState(0);
  const [aspects, setAspects] = useState(() =>
    list.map((img) =>
      img.knownW && img.knownH ? img.knownW / img.knownH : null,
    ),
  );

  useEffect(() => {
    let cancelled = false;
    const initial = list.map((img) =>
      img.knownW && img.knownH ? img.knownW / img.knownH : null,
    );
    setAspects(initial);
    const missing = initial
      .map((ar, i) => (ar == null ? i : -1))
      .filter((i) => i >= 0);
    if (!missing.length) return undefined;
    Promise.all(
      missing.map(async (i) => {
        const ar = await readImageAspect(list[i].src);
        return [i, ar];
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setAspects((prev) => {
        const next = prev.slice();
        pairs.forEach(([i, ar]) => {
          if (ar) next[i] = ar;
          else if (next[i] == null) next[i] = 1;
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [list]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0) setContainerWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [list.length]);

  const mosaicWide = Boolean(isWide);
  const squareLayout = layout === "square";
  const aspectsReady = aspects.length === list.length && aspects.every((a) => a > 0);
  const maxH = PHOTO_WALL_MAX_H[size] ?? PHOTO_WALL_MAX_H.md;
  const rows = useMemo(() => {
    if (!containerWidth) return [];
    if (squareLayout) {
      return layoutSquareRows(list.length, containerWidth, {
        size,
        isWide: mosaicWide,
      });
    }
    if (mosaic?.rows?.length && mosaic.sourceWidth) {
      return capMosaicRowHeight(
        scaleMosaicRows(mosaic.rows, mosaic.sourceWidth, containerWidth),
        maxH,
      );
    }
    if (aspectsReady) {
      return layoutJustifiedRows(aspects, containerWidth, {
        size,
        isWide: mosaicWide,
      });
    }
    return [];
  }, [
    aspects,
    aspectsReady,
    containerWidth,
    mosaic,
    mosaicWide,
    maxH,
    squareLayout,
    list.length,
    size,
  ]);

  if (!list.length) return null;

  const packAlign =
    align === "right" ? "flex-end" : align === "left" ? "flex-start" : "center";

  return (
    <>
      <div
        ref={wrapRef}
        className={`tiled-gallery fl-wall my-8 md:my-10${squareLayout ? "" : " fl-wall--justified"}`}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: packAlign,
        }}
      >
        {containerWidth > 0
          ? rows.map((row, ri) => (
              <div key={`row-${ri}`} className="tiled-gallery__row">
                {row.cols.map((col, ci) => (
                  <div key={`col-${ri}-${ci}`} className="tiled-gallery__col">
                    {col.items.map((cell) => {
                      const img = list[cell.index];
                      if (!img) return null;
                      return (
                        <button
                          key={`${img.thumb}-${cell.index}`}
                          type="button"
                          className="tiled-gallery__item fl-wall-item"
                          style={{
                            width: `${cell.width}px`,
                            height: `${cell.height}px`,
                          }}
                          onClick={() =>
                            setLightbox({ open: true, index: cell.index })
                          }
                          aria-label={`查看圖片牆第 ${cell.index + 1} 張`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.thumb}
                            alt={img.alt || ""}
                            loading="lazy"
                            data-width={Math.round(cell.width)}
                            data-height={Math.round(cell.height)}
                          />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))
          : null}

        <style jsx global>{`
          .entry-content .fl-wall.tiled-gallery,
          .article-entry-content .fl-wall.tiled-gallery,
          .fl-wall.tiled-gallery {
            width: 100% !important;
            max-width: 100%;
            box-sizing: border-box;
            clear: both;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          .fl-wall .tiled-gallery__row {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            justify-content: flex-start;
            align-items: stretch;
            margin: 0 0 ${GUTTER_WIDTH}px;
            width: max-content;
            max-width: 100%;
            overflow: hidden;
          }
          .fl-wall.fl-wall--justified .tiled-gallery__row {
            width: 100%;
          }
          .tiled-gallery__row:last-child {
            margin-bottom: 0;
          }
          .tiled-gallery__col {
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start;
            flex: 0 0 auto;
            margin: 0 ${GUTTER_WIDTH}px 0 0;
          }
          .tiled-gallery__col:last-child {
            margin-right: 0;
          }
          .tiled-gallery__item {
            display: block;
            overflow: hidden;
            line-height: 0;
            background: #eee;
            padding: 0;
            border: 0;
            border-radius: 0;
            cursor: zoom-in;
            margin: 0 0 ${GUTTER_WIDTH}px;
            flex: 0 0 auto;
          }
          .tiled-gallery__col .tiled-gallery__item:last-child {
            margin-bottom: 0;
          }
          .tiled-gallery__item img,
          .entry-content .tiled-gallery__item img,
          .article-entry-content .tiled-gallery__item img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            object-position: center center !important;
            display: block !important;
            margin: 0 !important;
            border: none !important;
            max-width: none !important;
            max-height: none !important;
            background: transparent !important;
            pointer-events: none;
          }
        `}</style>
      </div>

      <MediaGalleryLightbox
        isOpen={lightbox.open}
        onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        images={list}
        title="圖片牆"
        initialIndex={lightbox.index}
        ariaLabel="圖片牆幻燈片"
      />
    </>
  );
}
