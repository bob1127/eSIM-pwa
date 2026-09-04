"use client";

import { stripHtml } from "@/lib/stripHtml";

/** 從 WP HTML 抽出 h2 → 文章地圖項目 */
export function extractArticleH2Headings(html) {
  if (!html) return [];
  const matches = [...String(html).matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  return matches
    .map((m, i) => ({
      id: `article-map-${i}`,
      text: stripHtml(m[1]),
    }))
    .filter((h) => h.text);
}

/**
 * 文章地圖：依 h2 產生可點跳錨點目錄（無標題文字；項目前為圓點）
 */
export default function ArticleMapToc({
  headings = [],
  className = "",
}) {
  if (!headings.length) return null;

  return (
    <nav
      aria-label="文章地圖"
      className={`rounded-[8px] border border-[#e5e5e5] bg-[#f7f8fa] overflow-hidden ${className}`}
    >
      <div className="h-1.5 bg-[#1E4AD1]" aria-hidden />
      <ul className="px-4 py-4 space-y-2.5 list-none m-0">
        {headings.map((h) => (
          <li key={h.id} className="flex gap-3 items-start">
            <span
              className="shrink-0 mt-[7px] h-2 w-2 rounded-full bg-[#1E4AD1]"
              aria-hidden
            />
            <a
              href={`#${h.id}`}
              className="text-[14px] text-[#333] hover:text-[#1E4AD1] leading-relaxed transition-colors"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
