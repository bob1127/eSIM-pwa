"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeWpAssetUrl } from "@/lib/wordpress";
import MediaGalleryLightbox from "@/components/MediaGalleryLightbox";
import {
  GUTTER_WIDTH,
  layoutJetpackMosaic,
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

function collectImgs(node, out = []) {
  if (!node) return out;
  if (node.name === "img" && node.attribs?.src) {
    const w = parsePositiveNumber(
      node.attribs.width,
      node.attribs["data-width"],
      node.attribs["data-orig-width"],
    );
    const h = parsePositiveNumber(
      node.attribs.height,
      node.attribs["data-height"],
      node.attribs["data-orig-height"],
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

const DEFAULT_ASPECT = 1;

/**
 * Jetpack 並排圖庫（與後台 Mosaic 同一套演算法）。
 * 幻燈片僅含本圖牆，不與整篇文章混在一起。
 */
export default function WpPhotoWall({ images = [] }) {
  const wrapRef = useRef(null);
  const list = useMemo(
    () =>
      (images || [])
        .filter((i) => i?.src)
        .map((img) => ({
          src: normalizeWpAssetUrl(img.href || img.src),
          thumb: normalizeWpAssetUrl(img.src),
          alt: img.alt || "",
          type: "image",
          knownW: img.width || null,
          knownH: img.height || null,
        })),
    [images],
  );

  const [lightbox, setLightbox] = useState({ open: false, index: 0 });
  const [containerWidth, setContainerWidth] = useState(0);
  const [aspects, setAspects] = useState(() =>
    list.map((img) =>
      img.knownW && img.knownH ? img.knownW / img.knownH : DEFAULT_ASPECT,
    ),
  );

  useEffect(() => {
    setAspects(
      list.map((img) =>
        img.knownW && img.knownH ? img.knownW / img.knownH : DEFAULT_ASPECT,
      ),
    );
  }, [list]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const parentW = el.parentElement?.clientWidth || 0;
      const selfW = el.clientWidth || 0;
      const w = Math.floor(Math.max(parentW, selfW));
      if (w > 0) setContainerWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [list.length]);

  const onImgLoad = useCallback((index, e) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    const ar = w / h;
    setAspects((prev) => {
      if (prev[index] != null && Math.abs(prev[index] - ar) < 0.005) return prev;
      const next = prev.slice();
      next[index] = ar;
      return next;
    });
  }, []);

  const isWide = containerWidth > 1000;
  const { rows } = useMemo(
    () => layoutJetpackMosaic(aspects, containerWidth, { isWide }),
    [aspects, containerWidth, isWide],
  );

  if (!list.length) return null;

  return (
    <>
      <div ref={wrapRef} className="tiled-gallery fl-wall my-8 md:my-10">
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
                            onLoad={(e) => onImgLoad(cell.index, e)}
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
          .tiled-gallery__row {
            display: flex !important;
            flex-direction: row !important;
            justify-content: center;
            margin: 0 0 ${GUTTER_WIDTH}px;
          }
          .tiled-gallery__row:last-child {
            margin-bottom: 0;
          }
          .tiled-gallery__col {
            display: flex !important;
            flex-direction: column !important;
            justify-content: center;
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
