import { cn } from "@/lib/utils";
import { SOCIAL_LINKS } from "@/lib/seo.config";

export function FacebookIconSvg({ className = "w-4 h-4" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M16,2c-7.732,0-14,6.268-14,14,0,6.566,4.52,12.075,10.618,13.588v-9.31h-2.887v-4.278h2.887v-1.843c0-4.765,2.156-6.974,6.835-6.974,.887,0,2.417,.174,3.043,.348v3.878c-.33-.035-.904-.052-1.617-.052-2.296,0-3.183,.87-3.183,3.13v1.513h4.573l-.786,4.278h-3.787v9.619c6.932-.837,12.304-6.74,12.304-13.897,0-7.732-6.268-14-14-14Z"
      />
    </svg>
  );
}

export function InstagramIconSvg({ className = "w-4 h-4" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M10.202,2.098c-1.49,.07-2.507,.308-3.396,.657-.92,.359-1.7,.84-2.477,1.619-.776,.779-1.254,1.56-1.61,2.481-.345,.891-.578,1.909-.644,3.4-.066,1.49-.08,1.97-.073,5.771s.024,4.278,.096,5.772c.071,1.489,.308,2.506,.657,3.396,.359,.92,.84,1.7,1.619,2.477,.779,.776,1.559,1.253,2.483,1.61,.89,.344,1.909,.579,3.399,.644,1.49,.065,1.97,.08,5.771,.073,3.801-.007,4.279-.024,5.773-.095s2.505-.309,3.395-.657c.92-.36,1.701-.84,2.477-1.62s1.254-1.561,1.609-2.483c.345-.89,.579-1.909,.644-3.398,.065-1.494,.081-1.971,.073-5.773s-.024-4.278-.095-5.771-.308-2.507-.657-3.397c-.36-.92-.84-1.7-1.619-2.477s-1.561-1.254-2.483-1.609c-.891-.345-1.909-.58-3.399-.644s-1.97-.081-5.772-.074-4.278,.024-5.771,.096m.164,25.309c-1.365-.059-2.106-.286-2.6-.476-.654-.252-1.12-.557-1.612-1.044s-.795-.955-1.05-1.608c-.192-.494-.423-1.234-.487-2.599-.069-1.475-.084-1.918-.092-5.656s.006-4.18,.071-5.656c.058-1.364,.286-2.106,.476-2.6,.252-.655,.556-1.12,1.044-1.612s.955-.795,1.608-1.05c.493-.193,1.234-.422,2.598-.487,1.476-.07,1.919-.084,5.656-.092,3.737-.008,4.181,.006,5.658,.071,1.364,.059,2.106,.285,2.599,.476,.654,.252,1.12,.555,1.612,1.044s.795,.954,1.051,1.609c.193,.492,.422,1.232,.486,2.597,.07,1.476,.086,1.919,.093,5.656,.007,3.737-.006,4.181-.071,5.656-.06,1.365-.286,2.106-.476,2.601-.252,.654-.556,1.12-1.045,1.612s-.955,.795-1.608,1.05c-.493,.192-1.234,.422-2.597,.487-1.476,.069-1.919,.084-5.657,.092s-4.18-.007-5.656-.071M21.779,8.517c.002,.928,.755,1.679,1.683,1.677s1.679-.755,1.677-1.683c-.002-.928-.755-1.679-1.683-1.677,0,0,0,0,0,0-.928,.002-1.678,.755-1.677,1.683m-12.967,7.496c.008,3.97,3.232,7.182,7.202,7.174s7.183-3.232,7.176-7.202c-.008-3.97-3.233-7.183-7.203-7.175s-7.182,3.233-7.174,7.203m2.522-.005c-.005-2.577,2.08-4.671,4.658-4.676,2.577-.005,4.671,2.08,4.676,4.658,.005,2.577-2.08,4.671-4.658,4.676-2.577,.005-4.671-2.079-4.676-4.656h0"
      />
    </svg>
  );
}

/** LINE 官方泡泡字標（currentColor，適合綠底白字按鈕） */
export function LineIconSvg({ className = "w-4 h-4" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

/** Flaticon App Icon 風格：綠圓角方塊 + 白字 LINE（獨立顯示用） */
export function LineAppIconSvg({ className = "w-5 h-5" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
    >
      <rect width="48" height="48" rx="11" fill="#067A38" />
      <path
        fill="#FFFFFF"
        d="M24 11.2c-6.75 0-12.23 4.43-12.23 9.88 0 4.89 4.34 8.98 10.21 9.75.4.08.94.26 1.08.6.12.31.08.79.04 1.1l-.17 1.04c-.05.31-.24 1.2 1.06.66 1.3-.55 7.03-4.14 9.59-7.08 1.77-1.94 2.61-4.2 2.61-6.07 0-5.45-5.48-9.88-12.19-9.88zm-6.68 12.76h-2.24v-5.57a.44.44 0 0 0-.43-.44h-.87a.44.44 0 0 0-.44.44v5.38c0 .24.2.44.44.44h3.54a.44.44 0 0 0 .44-.44v-.87a.44.44 0 0 0-.44-.44zm3.28-4.5v4.5a.44.44 0 0 1-.44.44h-.87a.44.44 0 0 1-.44-.44v-4.5a.44.44 0 0 1 .44-.44h.87a.44.44 0 0 1 .44.44zm6.64 2.91c0 .24-.2.44-.44.44h-1.99v1.15h1.99a.44.44 0 0 1 .44.44v.87a.44.44 0 0 1-.44.44h-3.3a.44.44 0 0 1-.44-.44v-5.38a.44.44 0 0 1 .44-.44h3.3a.44.44 0 0 1 .44.44v.87a.44.44 0 0 1-.44.44h-1.99v1.16h1.99a.44.44 0 0 1 .44.44v.87zm3.37-2.91-2.09 2.97v-2.97a.44.44 0 0 0-.44-.44h-.87a.44.44 0 0 0-.44.44v5.38c0 .24.2.44.44.44h.87a.44.44 0 0 0 .36-.19l2.17-3.08v3.27a.44.44 0 0 0 .44.44h.87a.44.44 0 0 0 .43-.44v-5.38a.44.44 0 0 0-.43-.44h-.87a.44.44 0 0 0-.44.44z"
      />
    </svg>
  );
}

const ICON_SIZE = {
  sm: "w-[17px] h-[17px]",
  md: "w-[18px] h-[18px]",
};

const SOCIAL_ITEMS = [
  {
    key: "instagram",
    label: "Instagram",
    href: SOCIAL_LINKS.instagram,
    solidClass:
      "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white",
    icon: (size) => (
      <InstagramIconSvg className={ICON_SIZE[size] || ICON_SIZE.md} />
    ),
  },
  {
    key: "instagram2",
    label: "Instagram",
    href: SOCIAL_LINKS.instagram2,
    solidClass:
      "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white",
    icon: (size) => (
      <InstagramIconSvg className={ICON_SIZE[size] || ICON_SIZE.md} />
    ),
  },
  {
    key: "facebook",
    label: "Facebook",
    href: SOCIAL_LINKS.facebook,
    solidClass: "bg-[#1877F2] text-white",
    icon: (size) => (
      <FacebookIconSvg className={ICON_SIZE[size] || ICON_SIZE.md} />
    ),
  },
  {
    key: "line",
    label: "LINE 官方帳號",
    href: SOCIAL_LINKS.line,
    solidClass: "bg-[#067A38] text-white",
    icon: (size) => <LineIconSvg className={ICON_SIZE[size] || ICON_SIZE.md} />,
  },
];

export const visibleSocialItems = SOCIAL_ITEMS.filter((item) => item.href?.trim());

function SocialIconButton({ item, size = "md" }) {
  const dim = size === "sm" ? "w-8 h-8" : "w-9 h-9";

  return (
    <span
      className={cn(
        "rounded-full inline-flex items-center justify-center shrink-0 transition-opacity",
        item.solidClass,
        dim,
      )}
    >
      {typeof item.icon === "function" ? item.icon(size) : item.icon}
    </span>
  );
}

/**
 * @param {{
 *   className?: string,
 *   size?: "sm" | "md",
 *   linkClassName?: string,
 *   onNavigate?: () => void,
 * }} [props]
 */
export function BrandSocialIconLinks({
  className,
  size = "md",
  linkClassName,
  onNavigate,
} = {}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {visibleSocialItems.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          title={item.label}
          onClick={onNavigate}
          className={cn(
            "rounded-full transition-opacity hover:opacity-85 active:scale-95",
            linkClassName,
          )}
        >
          <SocialIconButton item={item} size={size} />
        </a>
      ))}
    </div>
  );
}

function mobileGridCols(count) {
  if (count >= 4) return "grid-cols-4";
  if (count === 3) return "grid-cols-3";
  if (count === 2) return "grid-cols-2";
  return "grid-cols-1";
}

/**
 * @param {{ onNavigate?: () => void }} [props]
 */
export function BrandSocialIconLinksMobile({ onNavigate } = {}) {
  const items = visibleSocialItems;

  return (
    <div className={cn("grid gap-2.5", mobileGridCols(items.length))}>
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white py-3 shadow-sm transition-colors active:bg-slate-50"
        >
          <SocialIconButton item={item} size="md" />
          <span className="text-[10px] font-bold text-slate-600">
            {item.key.startsWith("instagram") ? "IG" : item.label.split(" ")[0]}
          </span>
        </a>
      ))}
    </div>
  );
}
