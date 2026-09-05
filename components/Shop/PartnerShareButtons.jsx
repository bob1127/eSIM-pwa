"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import {
  FacebookIconSvg,
  InstagramIconSvg,
  LineIconSvg,
} from "@/components/social/SocialBrandIcons";
import { SITE_URL } from "@/lib/seo.config";

export const SHARE_BUTTON_CATALOG = [
  { id: "facebook", label: "Facebook" },
  { id: "line", label: "LINE" },
  { id: "instagram", label: "Instagram" },
  { id: "copy", label: "複製連結" },
  { id: "native", label: "系統分享" },
];

const ALLOWED_SHARE_IDS = SHARE_BUTTON_CATALOG.map((x) => x.id);

export function parseShareItems(items) {
  const raw = Array.isArray(items)
    ? items
    : String(items || "facebook,line,instagram,copy,native").split(/[,，\s]+/);
  const seen = new Set();
  const out = [];
  raw.forEach((id) => {
    const key = String(id || "").trim();
    if (!ALLOWED_SHARE_IDS.includes(key) || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  });
  return out.length ? out : [...ALLOWED_SHARE_IDS];
}

function buildPartnerArticleShareUrl({ domain, slug, fallbackUrl }) {
  const site = String(SITE_URL || "").replace(/\/$/, "");
  if (domain && slug) {
    return `${site}/p/${domain}/blog/${slug}/`;
  }
  if (fallbackUrl) return String(fallbackUrl).split("#")[0];
  if (typeof window !== "undefined") {
    return window.location.href.split("#")[0];
  }
  return site || "";
}

function openShareWindow(href) {
  if (!href || typeof window === "undefined") return;
  window.open(href, "_blank", "noopener,noreferrer,width=600,height=640");
}

function iconSizeClass(size) {
  return size === "sm" ? "w-[14px] h-[14px]" : "w-[17px] h-[17px]";
}

function btnSizeClass(size) {
  return size === "sm" ? "h-8 w-8" : "h-10 w-10";
}

function shapeClass(shape) {
  return shape === "rounded" ? "rounded-[10px]" : "rounded-full";
}

/**
 * 夥伴文章社群分享：FB / LINE / IG / 複製連結 / 原生分享
 */
export default function PartnerShareButtons({
  store,
  title = "",
  slug = "",
  shareUrl: shareUrlProp = "",
  label = "分享",
  showLabel = true,
  items = "facebook,line,instagram,copy,native",
  look = "brand",
  shape = "circle",
  size = "md",
  align = "left",
  disabled = false,
  layout = "inline",
  className = "",
}) {
  const domain = store?.domain || "";
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const ids = parseShareItems(items);
  const outline = look === "outline";
  const ic = iconSizeClass(size);
  const box = btnSizeClass(size);
  const round = shapeClass(shape);
  const copyPad = size === "sm" ? "h-8 px-2.5 text-[11px]" : "h-10 px-3.5 text-[12px]";
  const justify =
    align === "center"
      ? "justify-center"
      : align === "right"
        ? "justify-end"
        : "justify-start";

  const shareUrl =
    shareUrlProp ||
    buildPartnerArticleShareUrl({
      domain,
      slug,
      fallbackUrl: "",
    });

  const showToast = (msg) => {
    setToast(msg);
    if (typeof window === "undefined") return;
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  };

  const getUrl = () =>
    shareUrl ||
    buildPartnerArticleShareUrl({
      domain,
      slug,
      fallbackUrl:
        typeof window !== "undefined" ? window.location.href : "",
    });

  const copyLink = async () => {
    const url = getUrl();
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const handleCopy = async () => {
    if (disabled) return;
    const ok = await copyLink();
    setCopied(ok);
    showToast(ok ? "已複製文章連結" : "複製失敗，請手動選取網址");
    if (ok && typeof window !== "undefined") {
      window.clearTimeout(handleCopy._t);
      handleCopy._t = window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareInstagram = async () => {
    if (disabled) return;
    const url = getUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    const ok = await copyLink();
    showToast(
      ok ? "文章連結已複製，可貼到 Instagram" : "請手動複製網址後貼到 Instagram",
    );
  };

  const shareFacebook = () => {
    if (disabled) return;
    const url = getUrl();
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    );
  };

  const shareLine = () => {
    if (disabled) return;
    const url = getUrl();
    openShareWindow(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
    );
  };

  const shareNative = async () => {
    if (disabled) return;
    const url = getUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    await handleCopy();
  };

  const renderCopyButton = () => (
    <button
      key="copy"
      type="button"
      onClick={handleCopy}
      aria-label="複製連結"
      title="複製連結"
      className={`${copyPad} ${round} border border-slate-200 bg-white text-slate-700 inline-flex items-center gap-1.5 font-bold hover:border-slate-400 hover:bg-slate-50 transition active:scale-95`}
    >
      {copied ? (
        <Check className={`${ic} text-emerald-600`} strokeWidth={2.5} />
      ) : (
        <Copy className={ic} strokeWidth={2} />
      )}
      {copied ? "已複製" : "複製連結"}
    </button>
  );

  const renderNativeButton = () => (
    <button
      key="native"
      type="button"
      onClick={shareNative}
      aria-label="更多分享"
      title="更多分享"
      className={`${box} ${round} border border-slate-200 bg-white text-slate-700 inline-flex items-center justify-center hover:border-slate-400 hover:bg-slate-50 transition active:scale-95`}
    >
      <Share2 className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={2} />
    </button>
  );

  const brandButtons = {
    facebook: {
      label: "Facebook 分享",
      onClick: shareFacebook,
      brand: "bg-[#1877F2] text-white hover:brightness-110",
      outline: "bg-white text-[#1877F2] border border-slate-200 hover:border-[#1877F2]/50",
      icon: <FacebookIconSvg className={ic} />,
    },
    line: {
      label: "LINE 傳送",
      onClick: shareLine,
      brand: "bg-[#067A38] text-white hover:brightness-110",
      outline: "bg-white text-[#067A38] border border-slate-200 hover:border-[#067A38]/50",
      icon: <LineIconSvg className={ic} />,
    },
    instagram: {
      label: "Instagram 分享",
      onClick: shareInstagram,
      brand:
        "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white hover:brightness-110",
      outline: "bg-white text-[#dd2a7b] border border-slate-200 hover:border-[#dd2a7b]/40",
      icon: <InstagramIconSvg className={ic} />,
    },
  };

  return (
    <div className={`relative ${className}`}>
      {layout === "split" ? (
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            {showLabel !== false && label ? (
              <span className="text-[12px] font-bold text-slate-500 shrink-0">
                {label}
              </span>
            ) : null}
            {ids.includes("copy") ? renderCopyButton() : null}
            {ids
              .filter((id) => id !== "copy" && id !== "native")
              .map((id) => {
                const item = brandButtons[id];
                if (!item) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={item.onClick}
                    aria-label={item.label}
                    title={item.label}
                    className={`${box} ${round} inline-flex items-center justify-center shadow-sm ring-1 ring-black/5 transition active:scale-95 ${
                      outline ? item.outline : item.brand
                    }`}
                  >
                    {item.icon}
                  </button>
                );
              })}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {ids.includes("native") ? renderNativeButton() : null}
          </div>
        </div>
      ) : (
      <div className={`flex flex-wrap items-center gap-2.5 ${justify}`}>
        {showLabel !== false && label ? (
          <span className="text-[12px] font-bold text-slate-500 mr-1">
            {label}
          </span>
        ) : null}

        {ids.map((id) => {
          if (id === "copy") {
            return renderCopyButton();
          }
          if (id === "native") {
            return renderNativeButton();
          }
          const item = brandButtons[id];
          if (!item) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={item.onClick}
              aria-label={item.label}
              title={item.label}
              className={`${box} ${round} inline-flex items-center justify-center shadow-sm ring-1 ring-black/5 transition active:scale-95 ${
                outline ? item.outline : item.brand
              }`}
            >
              {item.icon}
            </button>
          );
        })}
      </div>
      )}

      {toast ? (
        <p
          role="status"
          className="absolute left-0 top-full mt-2 text-[12px] font-medium text-[#0A6CD0] bg-sky-50 border border-sky-100 px-2.5 py-1.5 rounded-md shadow-sm z-10"
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}
