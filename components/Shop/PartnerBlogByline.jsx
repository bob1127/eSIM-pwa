"use client";

/**
 * 編輯者 + 發布／編輯時間
 */
export default function PartnerBlogByline({
  post,
  tone = "dark",
  className = "",
  compact = false,
}) {
  if (!post) return null;
  const editor = post.editorName || post.authorName || "夥伴編輯";
  const light = tone === "light";
  const muted = light ? "text-white/75" : "text-slate-500";
  const strong = light ? "text-white" : "text-slate-800";
  const sep = light ? "text-white/40" : "text-slate-300";

  return (
    <div
      className={`${
        compact ? "text-[11px]" : "text-[12px]"
      } leading-relaxed ${className}`}
    >
      <p className={muted}>
        <span className={`${strong} font-bold`}>編輯者</span>
        <span className={`mx-1.5 ${sep}`}>·</span>
        <span className={`${strong} font-semibold`}>{editor}</span>
      </p>
      <p className={`mt-0.5 ${muted}`}>
        <span>發布 {post.publishedLabel || post.date || "—"}</span>
        {post.wasEdited && post.updatedLabel ? (
          <>
            <span className={`mx-1.5 ${sep}`}>·</span>
            <span>更新 {post.updatedLabel}</span>
          </>
        ) : null}
      </p>
      {post.source === "partner-demo" ? (
        <p
          className={`mt-1 text-[10px] font-bold tracking-wide uppercase ${muted}`}
        >
          示範文章 · 夥伴賣場專屬
        </p>
      ) : null}
    </div>
  );
}
