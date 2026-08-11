"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import {
  FacebookIconSvg,
  InstagramIconSvg,
  LineIconSvg,
} from "@/components/social/SocialBrandIcons";
import { SITE_URL } from "@/lib/seo.config";

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

/**
 * 夥伴文章社群分享：FB / LINE / IG（系統分享或複製）/ 複製連結 / 原生分享
 */
export default function PartnerShareButtons({
  store,
  title = "",
  slug = "",
  shareUrl: shareUrlProp = "",
}) {
  const domain = store?.domain || "";
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const shareUrl =
    shareUrlProp ||
    buildPartnerArticleShareUrl({
      domain,
      slug,
      fallbackUrl: "",
    });

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

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
    const ok = await copyLink();
    setCopied(ok);
    showToast(ok ? "已複製文章連結" : "複製失敗，請手動選取網址");
    if (ok && typeof window !== "undefined") {
      window.clearTimeout(handleCopy._t);
      handleCopy._t = window.setTimeout(() => setCopied(false), 2000);
    }
  };

  /** Instagram 無官方網頁分享 API：優先系統分享，否則複製連結 */
  const shareInstagram = async () => {
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
    const url = getUrl();
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    );
  };

  const shareLine = () => {
    const url = getUrl();
    openShareWindow(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
    );
  };

  const shareNative = async () => {
    const url = getUrl();
    try {
      await navigator.share({ title, text: title, url });
    } catch (err) {
      if (err?.name === "AbortError") return;
      await handleCopy();
    }
  };

  const buttons = [
    {
      key: "facebook",
      label: "Facebook 分享",
      short: "FB",
      onClick: shareFacebook,
      className: "bg-[#1877F2] text-white hover:brightness-110",
      icon: <FacebookIconSvg className="w-[17px] h-[17px]" />,
    },
    {
      key: "line",
      label: "LINE 傳送",
      short: "LINE",
      onClick: shareLine,
      className: "bg-[#06C755] text-white hover:brightness-110",
      icon: <LineIconSvg className="w-[17px] h-[17px]" />,
    },
    {
      key: "instagram",
      label: "Instagram 分享",
      short: "IG",
      onClick: shareInstagram,
      className:
        "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white hover:brightness-110",
      icon: <InstagramIconSvg className="w-[17px] h-[17px]" />,
    },
  ];

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[12px] font-bold text-slate-500 mr-1">分享</span>

        {buttons.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            aria-label={item.label}
            title={item.label}
            className={`w-10 h-10 rounded-full inline-flex items-center justify-center shadow-sm ring-1 ring-black/5 transition active:scale-95 ${item.className}`}
          >
            {item.icon}
          </button>
        ))}

        <button
          type="button"
          onClick={handleCopy}
          aria-label="複製連結"
          title="複製連結"
          className="h-10 px-3.5 rounded-full border border-slate-200 bg-white text-slate-700 inline-flex items-center gap-1.5 text-[12px] font-bold hover:border-slate-400 hover:bg-slate-50 transition active:scale-95"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
          ) : (
            <Copy className="w-3.5 h-3.5" strokeWidth={2} />
          )}
          {copied ? "已複製" : "複製連結"}
        </button>

        {canNativeShare ? (
          <button
            type="button"
            onClick={shareNative}
            aria-label="更多分享"
            title="更多分享"
            className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-700 inline-flex items-center justify-center hover:border-slate-400 hover:bg-slate-50 transition active:scale-95"
          >
            <Share2 className="w-4 h-4" strokeWidth={2} />
          </button>
        ) : null}
      </div>

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
