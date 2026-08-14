"use client";

import MaterialIcon from "@/components/MaterialIcon";
import {
  slugifyTitle,
  sanitizePartnerBlogSlug,
  validatePartnerBlogMeta,
} from "@/lib/partnerBlog";
import MediaUploadField from "./MediaUploadField";
import PartnerContentDisclaimer from "@/components/legal/PartnerContentDisclaimer";

const inputCls =
  "w-full bg-[#2b2c31] border border-white/10 rounded px-2.5 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#e2498e]";

function Field({ label, hint, error, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
        {label}
      </span>
      {children}
      {error ? (
        <span className="block mt-1 text-[10px] text-rose-300">{error}</span>
      ) : hint ? (
        <span className="block mt-1 text-[10px] text-white/35">{hint}</span>
      ) : null}
    </label>
  );
}

export default function PartnerBlogPostSettings({
  meta,
  onChange,
  storeDomain,
  categories = [],
}) {
  const set = (key, value) => onChange({ ...meta, [key]: value });
  const { errors } = validatePartnerBlogMeta(meta, { requireImage: true });
  const serpTitle = (meta.og_title || meta.title || "標題").slice(0, 60);
  const serpDesc = (meta.meta_description || meta.excerpt || "").slice(0, 160);
  const serpUrl = storeDomain
    ? `jeko.esim / p / ${storeDomain} / blog / ${meta.slug || "slug"}`
    : `blog / ${meta.slug || "slug"}`;
  const errCls = "border-rose-400/80 focus:border-rose-400";

  return (
    <div className="flex flex-col h-full bg-[#1a1b1e] text-white">
      <div className="px-3 py-2.5 border-b border-white/10">
        <p className="text-[11px] font-black">文章設定</p>

        {Object.keys(errors).length ? (
          <p className="mt-2 text-[11px] text-rose-300 leading-snug">
            發布前請補齊：{Object.values(errors).join("、")}
          </p>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="rounded-lg bg-white p-3 mb-4 text-slate-800">
          <p className="text-[11px] text-emerald-700 truncate">{serpUrl}</p>
          <p className="text-[15px] text-[#1a0dab] font-medium leading-snug mt-0.5 line-clamp-2">
            {serpTitle}
          </p>
          <p className="text-[12px] text-slate-600 mt-1 line-clamp-2">
            {serpDesc || "尚未填寫描述"}
          </p>
        </div>

        <Field label="標題 *" hint="發布與建立都必填" error={errors.title}>
          <input
            className={`${inputCls} ${errors.title ? errCls : ""}`}
            value={meta.title || ""}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>
        <Field
          label="網址 slug *"
          hint="只能小寫英文、數字與連字號（japan-esim-tips）。中文、空白、底線、問號會自動去掉，以免 LINE／FB 分享時網址斷掉"
          error={errors.slug}
        >
          <div className="flex gap-1">
            <input
              className={`${inputCls} ${errors.slug ? errCls : ""} font-mono`}
              value={meta.slug || ""}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="url"
              onChange={(e) =>
                set("slug", sanitizePartnerBlogSlug(e.target.value))
              }
            />
            <button
              type="button"
              title="依標題產生"
              className="shrink-0 px-2 rounded bg-white/10 text-[11px] font-bold"
              onClick={() =>
                set(
                  "slug",
                  slugifyTitle(meta.title || "") || `post-${Date.now()}`,
                )
              }
            >
              產生
            </button>
          </div>
        </Field>
        <Field
          label="描述 description"
          hint={`${(meta.meta_description || "").length}/160`}
        >
          <textarea
            className={`${inputCls} min-h-[88px]`}
            value={meta.meta_description || ""}
            onChange={(e) =>
              set("meta_description", e.target.value.slice(0, 300))
            }
            placeholder="搜尋結果與社群分享會看到這段"
          />
        </Field>
        <Field label="關鍵字 keywords" hint="逗號分隔">
          <input
            className={inputCls}
            value={meta.meta_keywords || ""}
            onChange={(e) => set("meta_keywords", e.target.value)}
            placeholder="日本 eSIM, 出國上網"
          />
        </Field>
        <Field label="摘要 excerpt">
          <textarea
            className={`${inputCls} min-h-[64px]`}
            value={meta.excerpt || ""}
            onChange={(e) => set("excerpt", e.target.value)}
          />
        </Field>
        <Field label="社群標題 og:title">
          <input
            className={inputCls}
            value={meta.og_title || ""}
            onChange={(e) => set("og_title", e.target.value)}
            placeholder="空白則用文章標題"
          />
        </Field>
        <Field
          label="精選圖片 *"
          hint="文章封面與社群分享圖，沒有圖不能發布"
          error={errors.image}
        >
          <MediaUploadField
            kind="image"
            value={meta.og_image_url}
            onUploaded={(url) => set("og_image_url", url)}
          />
          <input
            className={`${inputCls} ${errors.image ? errCls : ""}`}
            value={meta.og_image_url || ""}
            onChange={(e) => set("og_image_url", e.target.value)}
            placeholder="或貼上圖片網址 https://"
          />
        </Field>
        {meta.og_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meta.og_image_url}
            alt=""
            className="w-full h-36 object-cover rounded-lg mb-3 border border-white/10"
          />
        ) : (
          <div className="mb-3 rounded-lg border border-dashed border-rose-400/40 bg-rose-500/5 py-8 text-center text-[11px] text-rose-200/80">
            尚未上傳精選圖
          </div>
        )}
        <Field label="分類">
          <select
            className={inputCls}
            value={meta.category_label || ""}
            onChange={(e) => set("category_label", e.target.value)}
          >
            <option value="">未分類</option>
            {[
              ...new Set(
                [...(categories || []), meta.category_label].filter(Boolean),
              ),
            ].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="標籤" hint="逗號分隔">
          <input
            className={inputCls}
            value={meta.tags || ""}
            onChange={(e) => set("tags", e.target.value)}
          />
        </Field>
        <Field label="作者">
          <input
            className={inputCls}
            value={meta.author_name || ""}
            onChange={(e) => set("author_name", e.target.value)}
          />
        </Field>
        <PartnerContentDisclaimer variant="dark" className="mt-2 mb-1" />
      </div>
    </div>
  );
}

export function LivePreviewOverlay({ viewport, onClose, children }) {
  const width =
    viewport === "mobile" ? 390 : viewport === "tablet" ? 768 : null;
  return (
    <div className="absolute inset-0 z-[50] bg-[#1f2124] flex flex-col">
      <div className="h-9 shrink-0 flex items-center gap-2 px-3 border-b border-white/10 text-white">
        <MaterialIcon name="visibility" size={16} />
        <span className="text-[11px] font-black">即時預覽</span>
        <span className="text-[10px] text-white/40">含尚未儲存的變更</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded bg-white/10"
        >
          <MaterialIcon name="close" size={14} />
          關閉預覽
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-[#cfd3da] p-4">
        <div
          className={`mx-auto bg-white min-h-full shadow-2xl overflow-hidden ${
            viewport === "mobile"
              ? "rounded-[28px]"
              : viewport === "tablet"
                ? "rounded-xl"
                : ""
          }`}
          style={width ? { width, maxWidth: "100%" } : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
