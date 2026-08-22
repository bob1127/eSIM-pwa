"use client";

import { useState } from "react";
import HomepageImageCropModal, {
  HOMEPAGE_IMAGE_ASPECT,
  HOMEPAGE_IMAGE_SOURCE_MAX_BYTES,
  HOMEPAGE_IMAGE_UPLOAD_MAX_BYTES,
  formatBytes,
} from "@/components/Shop/HomepageImageCropModal";

export function EditorField({ label, value, onChange, placeholder, multiline }) {
  const cls =
    "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/25 focus:border-[#1E4AD1]";
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {multiline ? (
        <textarea
          rows={2}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </label>
  );
}

export function EditorImageField({
  label,
  value,
  onChange,
  storeId,
  token,
  busy,
  setBusy,
  cropKind = "hero",
}) {
  const [cropFile, setCropFile] = useState(null);
  const aspect = HOMEPAGE_IMAGE_ASPECT[cropKind] || HOMEPAGE_IMAGE_ASPECT.hero;
  const aspectHint =
    cropKind === "promo" ? "16:9" : cropKind === "discover" ? "21:9" : "21:9";

  const uploadFile = async (file) => {
    if (!file || !token) return;
    if (file.size > HOMEPAGE_IMAGE_UPLOAD_MAX_BYTES) {
      throw new Error(
        `圖片請小於 ${formatBytes(HOMEPAGE_IMAGE_UPLOAD_MAX_BYTES)}（目前 ${formatBytes(file.size)}）`,
      );
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("storeId", String(storeId));
      fd.append("file", file);
      const res = await fetch("/api/partner/upload-homepage-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "上傳失敗");
      onChange(data.url);
    } finally {
      setBusy(false);
    }
  };

  const onPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      window.alert("請上傳 JPG / PNG / WEBP / GIF");
      return;
    }
    if (file.size > HOMEPAGE_IMAGE_SOURCE_MAX_BYTES) {
      window.alert(
        `原圖請小於 ${formatBytes(HOMEPAGE_IMAGE_SOURCE_MAX_BYTES)}（目前 ${formatBytes(file.size)}）`,
      );
      return;
    }
    setCropFile(file);
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <p className="text-[11px] text-slate-400 leading-snug">
        上傳後可裁切為 {aspectHint}；檔案上限{" "}
        {formatBytes(HOMEPAGE_IMAGE_UPLOAD_MAX_BYTES)}
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="圖片 URL 或上傳"
          className="flex-1 min-w-[140px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <label className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 text-white cursor-pointer hover:bg-slate-700 disabled:opacity-50">
          {busy ? "上傳中…" : "上傳裁切"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={busy}
            onChange={onPick}
          />
        </label>
      </div>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="mt-1 h-20 w-full max-w-xs object-cover rounded-lg border border-slate-100"
        />
      ) : null}

      {cropFile ? (
        <HomepageImageCropModal
          file={cropFile}
          aspect={aspect}
          aspectHint={aspectHint}
          onCancel={() => setCropFile(null)}
          onConfirm={async (cropped) => {
            try {
              await uploadFile(cropped);
              setCropFile(null);
            } catch (err) {
              window.alert(err.message || "上傳失敗");
            }
          }}
        />
      ) : null}
    </div>
  );
}
