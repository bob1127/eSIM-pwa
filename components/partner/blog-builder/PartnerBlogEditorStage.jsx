"use client";

/**
 * 編輯畫布／即時預覽：對齊前台文章主欄＋側欄寬度，避免元件看起來跟網站不同。
 */
export default function PartnerBlogEditorStage({
  meta,
  title,
  viewport = "desktop",
  children,
}) {
  const desktop = viewport === "desktop";
  const phone = viewport === "mobile";

  return (
    <div
      className={
        phone
          ? "w-full px-4 py-6"
          : desktop
            ? "max-w-[1680px] w-[96%] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10"
            : "w-full px-6 py-8"
      }
    >
      <div
        className={`flex items-stretch ${desktop ? "flex-row" : "flex-col"}`}
      >
        <div
          className={`flex-1 min-w-0 ${
            desktop ? "pr-8 xl:pr-10 border-r border-slate-200" : ""
          }`}
        >
          {meta?.og_image_url ? (
            <div className="relative w-full aspect-[16/10] sm:aspect-[21/10] min-h-[180px] bg-[#efeee9] overflow-hidden mb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meta.og_image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <p className="absolute bottom-4 left-4 right-4 text-white text-lg sm:text-2xl font-bold leading-snug">
                {meta.title || title || ""}
              </p>
            </div>
          ) : (
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
              {meta?.title || title || "未命名文章"}
            </h1>
          )}
          <div className="partner-blog-prose w-full max-w-full overflow-visible text-[15px] sm:text-[16px] leading-[2] text-slate-700 break-words">
            {children}
          </div>
        </div>
        {desktop ? (
          <aside className="w-[240px] xl:w-[280px] shrink-0 pl-6 xl:pl-8">
            <div className="sticky top-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-[11px] text-slate-400 leading-relaxed">
              前台側欄位置
              <br />
              （導覽／搜尋／分類）
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
