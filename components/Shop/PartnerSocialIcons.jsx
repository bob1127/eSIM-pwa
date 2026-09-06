"use client";

import {
  FacebookIconSvg,
  InstagramIconSvg,
  LineIconSvg,
} from "@/components/social/SocialBrandIcons";

/**
 * 夥伴商店社群追蹤圖示（品牌色圓鈕）
 * @param {{
 *   store?: {
 *     social_instagram?: string | null,
 *     social_facebook?: string | null,
 *     social_line?: string | null,
 *   } | null,
 *   size?: "sm" | "md" | "lg",
 *   showLabels?: boolean,
 *   emptyHint?: boolean,
 *   className?: string,
 * }} props
 */
export default function PartnerSocialIcons({
  store,
  size = "md",
  showLabels = false,
  emptyHint = true,
  className = "",
}) {
  const dim =
    size === "sm" ? "w-8 h-8" : size === "lg" ? "w-11 h-11" : "w-9 h-9";
  const iconClass =
    size === "sm"
      ? "w-[15px] h-[15px]"
      : size === "lg"
        ? "w-[19px] h-[19px]"
        : "w-[17px] h-[17px]";

  const items = [
    {
      key: "instagram",
      label: "Instagram",
      short: "IG",
      href: store?.social_instagram?.trim() || "",
      className:
        "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white",
      icon: <InstagramIconSvg className={iconClass} />,
    },
    {
      key: "facebook",
      label: "Facebook",
      short: "FB",
      href: store?.social_facebook?.trim() || "",
      className: "bg-[#1877F2] text-white",
      icon: <FacebookIconSvg className={iconClass} />,
    },
    {
      key: "line",
      label: "LINE",
      short: "LINE",
      href: store?.social_line?.trim() || "",
      className: "bg-[#06C755] text-white",
      icon: <LineIconSvg className={iconClass} />,
    },
  ].filter((item) => item.href);

  if (!items.length) {
    if (!emptyHint) return null;
    return (
      <p className="text-[11px] text-slate-400 leading-relaxed">
        請於夥伴後台「商店設定」填寫 IG／FB／LINE
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`.trim()}>
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          title={item.label}
          className="group inline-flex flex-col items-center gap-1.5 rounded-full transition-opacity hover:opacity-90 active:scale-95"
        >
          <span
            className={`${dim} rounded-full inline-flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/5 ${item.className}`}
          >
            {item.icon}
          </span>
          {showLabels ? (
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-800">
              {item.short}
            </span>
          ) : null}
        </a>
      ))}
    </div>
  );
}
