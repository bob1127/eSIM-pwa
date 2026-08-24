import { resolveMedusaImageUrl } from "./resolveMedusaImageUrl";
import { getPublicSiteUrl } from "./siteUrl";

function encodeUrlPathIfNeeded(rawUrl) {
  try {
    const u = new URL(rawUrl);
    u.pathname = u.pathname
      .split("/")
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join("/");
    return u.toString();
  } catch {
    return rawUrl;
  }
}

/** LINE 推播圖片必須 HTTPS 且公開可存取 */
export function resolveLinePushImageUrl(rawUrl) {
  const siteUrl = getPublicSiteUrl().replace(/\/$/, "");
  let url = String(rawUrl || "").trim();
  if (!url) return null;

  if (url.startsWith("/")) {
    url = `${siteUrl}${url}`;
  } else if (!/^https?:\/\//i.test(url)) {
    const resolved = resolveMedusaImageUrl(url);
    if (resolved) {
      url = resolved.startsWith("/") ? `${siteUrl}${resolved}` : resolved;
    }
  } else {
    const resolved = resolveMedusaImageUrl(url);
    if (resolved) url = resolved.startsWith("/") ? `${siteUrl}${resolved}` : resolved;
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url)) {
    try {
      const u = new URL(url);
      if (u.pathname.startsWith("/images/")) {
        url = `${siteUrl}${u.pathname}`;
      }
    } catch {
      /* ignore */
    }
  }

  if (url.startsWith("http://")) {
    url = `https://${url.slice(7)}`;
  }

  url = encodeUrlPathIfNeeded(url);

  return /^https:\/\//i.test(url) ? url : null;
}

export function resolveLinePushLink(rawUrl) {
  const siteUrl = getPublicSiteUrl().replace(/\/$/, "");
  const s = String(rawUrl || "/").trim() || "/";
  if (/^https?:\/\//i.test(s)) return s;
  return `${siteUrl}${s.startsWith("/") ? s : `/${s}`}`;
}
