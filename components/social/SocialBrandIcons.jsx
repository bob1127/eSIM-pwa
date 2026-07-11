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

export function LineIconSvg({ className = "w-4 h-4" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M37.113,22.417c0-5.865-5.88-10.637-13.107-10.637s-13.108,4.772-13.108,10.637c0,5.258,4.663,9.662,10.962,10.495c0.427,0.092,1.008,0.282,1.155,0.646c0.132,0.331,0.086,0.85,0.042,1.185c0,0-0.153,0.925-0.187,1.122c-0.057,0.331-0.263,1.296,1.135,0.707c1.399-0.589,7.548-4.445,10.298-7.611h-0.001C36.203,26.879,37.113,24.764,37.113,22.417z M18.875,25.907h-2.604c-0.379,0-0.687-0.308-0.687-0.688V20.01c0-0.379,0.308-0.687,0.687-0.687c0.379,0,0.687,0.308,0.687,0.687v4.521h1.917c0.379,0,0.687,0.308,0.687,0.687C19.562,25.598,19.254,25.907,18.875,25.907z M21.568,25.219c0,0.379-0.308,0.688-0.687,0.688s-0.687-0.308-0.687-0.688V20.01c0-0.379,0.308-0.687,0.687-0.687s0.687,0.308,0.687,0.687V25.219z M27.838,25.219c0,0.297-0.188,0.559-0.47,0.652c-0.071,0.024-0.145,0.036-0.218,0.036c-0.215,0-0.42-0.103-0.549-0.275l-2.669-3.635v3.222c0,0.379-0.308,0.688-0.688,0.688c-0.379,0-0.688-0.308-0.688-0.688V20.01c0-0.296,0.189-0.558,0.47-0.652c0.071-0.024,0.144-0.035,0.218-0.035c0.214,0,0.42,0.103,0.549,0.275l2.67,3.635V20.01c0-0.379,0.309-0.687,0.688-0.687c0.379,0,0.687,0.308,0.687,0.687V25.219z M32.052,21.927c0.379,0,0.688,0.308,0.688,0.688c0,0.379-0.308,0.687-0.688,0.687h-1.917v1.23h1.917c0.379,0,0.688,0.308,0.688,0.687c0,0.379-0.309,0.688-0.688,0.688h-2.604c-0.378,0-0.687-0.308-0.687-0.688v-2.603c0-0.001,0-0.001,0-0.001c0,0,0-0.001,0-0.001v-2.601c0-0.001,0-0.001,0-0.002c0-0.379,0.308-0.687,0.687-0.687h2.604c0.379,0,0.688,0.308,0.688,0.687s-0.308,0.687-0.688,0.687h-1.917v1.23H32.052z"
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
    solidClass: "bg-[#00C300] text-white",
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
