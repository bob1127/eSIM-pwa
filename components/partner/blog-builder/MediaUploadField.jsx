"use client";

import { createContext, useContext, useState } from "react";
import {
  BLOG_IMAGE_MAX_BYTES,
  BLOG_VIDEO_MAX_BYTES,
  blogMediaKindFromFile,
  blogMediaLimit,
  formatUploadBytes,
} from "@/lib/partnerBlogMedia";

const BlogBuilderMediaContext = createContext({
  token: "",
  storeId: "",
  store: null,
});

export function BlogBuilderMediaProvider({ token, store, children }) {
  return (
    <BlogBuilderMediaContext.Provider
      value={{ token: token || "", storeId: store?.id || "", store }}
    >
      {children}
    </BlogBuilderMediaContext.Provider>
  );
}

export function useBlogBuilderMedia() {
  return useContext(BlogBuilderMediaContext);
}

async function uploadBlogFile(file, { token, storeId, kind }) {
  const fd = new FormData();
  fd.append("storeId", String(storeId));
  fd.append("kind", kind);
  fd.append("file", file);
  const res = await fetch("/api/partner/upload-blog-media", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "上傳失敗");
  return data.url;
}

/**
 * 本機選擇或拖放上傳（寫入 R2，有大小上限）
 * @param {{ kind: "image"|"video", value?: string, onUploaded: (url: string) => void, multiple?: boolean }} props
 */
export default function MediaUploadField({
  kind = "image",
  value = "",
  onUploaded,
  multiple = false,
  variant = "dark",
}) {
  const { token, storeId } = useBlogBuilderMedia();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const max = kind === "video" ? BLOG_VIDEO_MAX_BYTES : BLOG_IMAGE_MAX_BYTES;
  const accept =
    kind === "video"
      ? "video/mp4,video/webm"
      : "image/jpeg,image/png,image/webp,image/gif";

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (!token || !storeId) {
      setError("請先登入夥伴帳號再上傳");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const slice = multiple ? files.slice(0, 8) : files.slice(0, 1);
      for (const file of slice) {
        const detected = blogMediaKindFromFile(file);
        if (kind === "image" && detected !== "image") {
          throw new Error("請上傳 JPG / PNG / WEBP / GIF");
        }
        if (kind === "video" && detected !== "video") {
          throw new Error("請上傳 MP4 / WEBM");
        }
        if (file.size > blogMediaLimit(kind)) {
          throw new Error(
            `超過上限 ${formatUploadBytes(max)}（目前 ${formatUploadBytes(file.size)}）`,
          );
        }
        const url = await uploadBlogFile(file, { token, storeId, kind });
        onUploaded(url);
      }
    } catch (err) {
      setError(err.message || "上傳失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed px-3 py-4 text-center transition ${
          over
            ? "border-[#e2498e] bg-[#e2498e]/10"
            : variant === "light"
              ? "border-slate-300 bg-slate-50"
              : "border-white/20 bg-black/20"
        }`}
      >
        <p
          className={`text-[12px] font-bold ${
            variant === "light" ? "text-slate-700" : "text-white/80"
          }`}
        >
          {busy ? "上傳中…" : "拖放檔案到這裡，或點選上傳"}
        </p>
        <p
          className={`text-[10px] mt-1 ${
            variant === "light" ? "text-slate-400" : "text-white/40"
          }`}
        >
          {kind === "video"
            ? `MP4／WEBM，單檔 ${formatUploadBytes(BLOG_VIDEO_MAX_BYTES)}`
            : `JPG／PNG／WEBP／GIF，單檔 ${formatUploadBytes(BLOG_IMAGE_MAX_BYTES)}`}
        </p>
        <label
          className={`inline-block mt-2 cursor-pointer rounded px-3 py-1.5 text-[11px] font-bold ${
            variant === "light"
              ? "bg-[#1E4AD1] text-white hover:bg-[#1639a8]"
              : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {multiple ? "選擇多個檔案" : "選擇檔案"}
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {error ? <p className="mt-1 text-[11px] text-red-300">{error}</p> : null}
      {value && kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-2 h-16 w-full object-cover rounded" />
      ) : null}
    </div>
  );
}
