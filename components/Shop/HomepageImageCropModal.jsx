"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { PARTNER_OVERLAY_Z } from "@/lib/partnerOverlayZ";

/** 原始檔上限（進入裁切前） */
export const HOMEPAGE_IMAGE_SOURCE_MAX_BYTES = 8 * 1024 * 1024;
/** 裁切後上傳上限 */
export const HOMEPAGE_IMAGE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

export const HOMEPAGE_IMAGE_ASPECT = {
  hero: 21 / 9,
  promo: 16 / 9,
  discover: 21 / 9,
};

export function formatBytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(0)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

function coverMetrics(nw, nh, cw, ch, zoom) {
  const cover = Math.max(cw / nw, ch / nh);
  const scale = cover * zoom;
  const dispW = nw * scale;
  const dispH = nh * scale;
  return { scale, dispW, dispH };
}

async function exportCroppedBlob({
  image,
  containerW,
  containerH,
  offset,
  zoom,
  aspect,
  maxBytes = HOMEPAGE_IMAGE_UPLOAD_MAX_BYTES,
  maxEdge = 2400,
}) {
  const nw = image.naturalWidth;
  const nh = image.naturalHeight;
  if (!nw || !nh || !containerW || !containerH) {
    throw new Error("圖片尚未載入完成");
  }

  const { scale, dispW, dispH } = coverMetrics(
    nw,
    nh,
    containerW,
    containerH,
    zoom,
  );
  const left = (containerW - dispW) / 2 + offset.x;
  const top = (containerH - dispH) / 2 + offset.y;

  const sx = Math.max(0, Math.min(nw, (-left) / scale));
  const sy = Math.max(0, Math.min(nh, (-top) / scale));
  const sw = Math.max(1, Math.min(nw - sx, containerW / scale));
  const sh = Math.max(1, Math.min(nh - sy, containerH / scale));

  let outW = sw;
  let outH = sh;
  const long = Math.max(outW, outH);
  if (long > maxEdge) {
    const r = maxEdge / long;
    outW *= r;
    outH *= r;
  }
  outW = Math.max(1, Math.round(outW));
  outH = Math.max(1, Math.round(outW / aspect));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立畫布");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outW, outH);

  const toBlob = (q) =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("輸出失敗"))),
        "image/jpeg",
        q,
      );
    });

  let quality = 0.88;
  let blob = await toBlob(quality);
  while (blob.size > maxBytes && quality > 0.45) {
    quality -= 0.08;
    blob = await toBlob(quality);
  }
  if (blob.size > maxBytes) {
    const shrink = Math.sqrt(maxBytes / blob.size) * 0.92;
    const w2 = Math.max(1, Math.round(outW * shrink));
    const h2 = Math.max(1, Math.round(w2 / aspect));
    canvas.width = w2;
    canvas.height = h2;
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w2, h2);
    blob = await toBlob(0.8);
  }
  if (blob.size > maxBytes) {
    throw new Error(
      `裁切後仍超過 ${formatBytes(maxBytes)}，請換較小的原圖`,
    );
  }
  return blob;
}

/**
 * 固定比例裁切：拖曳移動、滾輪／滑桿縮放
 */
export default function HomepageImageCropModal({
  file,
  aspect = HOMEPAGE_IMAGE_ASPECT.hero,
  aspectHint = "21:9",
  onCancel,
  onConfirm,
}) {
  const [src, setSrc] = useState("");
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [layout, setLayout] = useState({ w: 0, h: 0, dispW: 0, dispH: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const imgRef = useRef(null);
  const boxRef = useRef(null);
  const dragRef = useRef(null);

  const refreshLayout = useCallback(
    (z = zoom, o = offset) => {
      const img = imgRef.current;
      const box = boxRef.current;
      if (!img?.naturalWidth || !box) return;
      const cw = box.clientWidth;
      const ch = box.clientHeight;
      const { dispW, dispH } = coverMetrics(
        img.naturalWidth,
        img.naturalHeight,
        cw,
        ch,
        z,
      );
      const maxX = Math.max(0, (dispW - cw) / 2);
      const maxY = Math.max(0, (dispH - ch) / 2);
      const clamped = {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      };
      if (clamped.x !== o.x || clamped.y !== o.y) setOffset(clamped);
      setLayout({ w: cw, h: ch, dispW, dispH });
    },
    [zoom, offset],
  );

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setReady(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setErr("");
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!ready) return;
    refreshLayout(zoom, offset);
    const onResize = () => refreshLayout(zoom, offset);
    window.addEventListener("resize", onResize);
    const box = boxRef.current;
    const onWheelNative = (e) => {
      e.preventDefault();
      const next = Math.min(
        3,
        Math.max(1, zoom + (e.deltaY < 0 ? 0.08 : -0.08)),
      );
      setZoom(next);
    };
    box?.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      window.removeEventListener("resize", onResize);
      box?.removeEventListener("wheel", onWheelNative);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, zoom]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const next = {
      x: dragRef.current.ox + (e.clientX - dragRef.current.x),
      y: dragRef.current.oy + (e.clientY - dragRef.current.y),
    };
    setOffset(next);
    refreshLayout(zoom, next);
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    const img = imgRef.current;
    const box = boxRef.current;
    if (!img || !box) return;
    setBusy(true);
    setErr("");
    try {
      const blob = await exportCroppedBlob({
        image: img,
        containerW: box.clientWidth,
        containerH: box.clientHeight,
        offset,
        zoom,
        aspect,
      });
      const out = new File(
        [blob],
        (file?.name || "banner").replace(/\.\w+$/, "") + "-crop.jpg",
        { type: "image/jpeg" },
      );
      await onConfirm(out);
    } catch (e) {
      setErr(e.message || "裁切失敗");
    } finally {
      setBusy(false);
    }
  };

  if (!file) return null;

  const left = layout.w
    ? (layout.w - layout.dispW) / 2 + offset.x
    : 0;
  const top = layout.h ? (layout.h - layout.dispH) / 2 + offset.y : 0;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-3"
      style={{ zIndex: PARTNER_OVERLAY_Z.crop }}
    >
      <div
        className="absolute inset-0 bg-black/55"
        onClick={busy ? undefined : onCancel}
        aria-hidden
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-black text-slate-800">裁切圖片</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              比例 {aspectHint} · 上傳上限{" "}
              {formatBytes(HOMEPAGE_IMAGE_UPLOAD_MAX_BYTES)} · 拖曳移動／滾輪縮放
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="text-xs font-bold text-slate-400 hover:text-slate-700"
          >
            取消
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div
            ref={boxRef}
            className="relative w-full overflow-hidden rounded-xl bg-slate-900 touch-none select-none cursor-grab active:cursor-grabbing"
            style={{ aspectRatio: String(aspect) }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  width: layout.dispW || "100%",
                  height: layout.dispH || "100%",
                  left: layout.dispW ? left : 0,
                  top: layout.dispH ? top : 0,
                  objectFit: layout.dispW ? undefined : "cover",
                }}
                onLoad={() => {
                  setReady(true);
                  requestAnimationFrame(() => refreshLayout(1, { x: 0, y: 0 }));
                }}
              />
            ) : null}
            <div className="absolute inset-0 ring-2 ring-white/80 ring-inset pointer-events-none" />
          </div>

          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              縮放 {zoom.toFixed(2)}×
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[#1a56db]"
            />
          </label>

          {err ? (
            <p className="text-[11px] font-bold text-red-600">{err}</p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              disabled={busy || !ready}
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-[#0f172a] text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? (
                <LoadingIndicator
                  layout="inline"
                  size="xs"
                  label="處理中…"
                  labelClassName="text-sm font-bold text-white"
                  spinnerClassName="text-white"
                />
              ) : (
                "套用並上傳"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
