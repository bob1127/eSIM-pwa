import Link from "next/link";

const ACCENT = "#1d5cc5";

/**
 * 首頁區塊標題（圖二 Event 版型・藍色系）
 * 上：小標 eyebrow｜下左：大標｜右：圓箭頭 + 更多連結
 */
export default function HomeSectionHeader({
  eyebrow,
  title,
  href,
  moreLabel,
  className = "",
  external = false,
}) {
  const more =
    href && moreLabel ? (
      <Link
        href={href}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        className="group flex items-center gap-2.5 shrink-0 max-w-[48%] sm:max-w-none text-left"
      >
        <span
          className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-white shadow-sm transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: ACCENT }}
          aria-hidden
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            className="translate-x-px"
          >
            <path
              d="M9 5l7 7-7 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-[12px] sm:text-sm text-gray-800 font-medium leading-snug group-hover:text-[#1d5cc5] transition-colors">
          {moreLabel}
        </span>
      </Link>
    ) : null;

  return (
    <div className={`mb-5 lg:mb-7 ${className}`}>
      {eyebrow ? (
        <p
          className="text-[13px] sm:text-sm font-bold tracking-wide"
          style={{ color: ACCENT }}
        >
          {eyebrow}
        </p>
      ) : null}
      <div className="mt-1.5 flex items-center justify-between gap-3 sm:gap-6">
        <h2 className="min-w-0 text-2xl sm:text-[28px] lg:text-[32px] font-black text-gray-900 tracking-tight leading-tight">
          {title}
        </h2>
        {more}
      </div>
    </div>
  );
}
