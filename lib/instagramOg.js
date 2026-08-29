/**
 * Instagram 公開貼文 Open Graph 預覽／影片解析（供本頁播放，不走 IG embed iframe）
 */

const BOT_UA =
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

export function extractInstagramShortcode(raw) {
  const input = String(raw || "").trim();
  if (!input) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "instagram.com" && host !== "instagr.am") return "";
    const m =
      url.pathname.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i) ||
      url.pathname.match(/\/[A-Za-z0-9._]+\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
    return m?.[1] || "";
  } catch {
    return "";
  }
}

function decodeHtmlEntities(s) {
  let str = String(s || "");
  // &#064; / &#x1f47e;
  str = str.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    if (!Number.isFinite(code)) return _;
    try {
      return String.fromCodePoint(code);
    } catch {
      return _;
    }
  });
  str = str.replace(/&#(\d+);/g, (_, dec) => {
    const code = Number(dec);
    if (!Number.isFinite(code)) return _;
    try {
      return String.fromCodePoint(code);
    } catch {
      return _;
    }
  });
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export { decodeHtmlEntities };

function metaContent(html, prop) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    "i",
  );
  const m = html.match(re) || html.match(re2);
  return m ? decodeHtmlEntities(m[1]) : "";
}

/**
 * @returns {Promise<{
 *   ok: boolean,
 *   shortcode: string,
 *   permalink: string,
 *   thumbnail: string,
 *   videoUrl: string,
 *   title: string,
 *   profileUrl: string,
 *   error?: string
 * }>}
 */
export async function fetchInstagramOgMedia(permalinkOrCode) {
  const code =
    extractInstagramShortcode(permalinkOrCode) ||
    String(permalinkOrCode || "").replace(/[^A-Za-z0-9_-]/g, "");
  if (!code) {
    return {
      ok: false,
      shortcode: "",
      permalink: "",
      thumbnail: "",
      videoUrl: "",
      title: "",
      profileUrl: "",
      error: "invalid_url",
    };
  }

  const permalink = `https://www.instagram.com/reel/${code}/`;
  const candidates = [
    `https://www.instagram.com/reel/${code}/`,
    `https://www.instagram.com/p/${code}/`,
  ];

  let html = "";
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": BOT_UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (text && text.length > 500 && /og:image/i.test(text)) {
        html = text;
        break;
      }
    } catch {
      /* try next */
    }
  }

  if (!html) {
    return {
      ok: false,
      shortcode: code,
      permalink,
      thumbnail: "",
      videoUrl: "",
      title: "",
      profileUrl: "",
      error: "fetch_failed",
    };
  }

  const thumbnail =
    metaContent(html, "og:image") ||
    metaContent(html, "og:image:secure_url") ||
    metaContent(html, "twitter:image");
  let videoUrl =
    metaContent(html, "og:video") ||
    metaContent(html, "og:video:secure_url") ||
    metaContent(html, "og:video:url") ||
    metaContent(html, "twitter:player:stream") ||
    "";

  if (!videoUrl) {
    const fromJson =
      html.match(/"video_url"\s*:\s*"(https:\\\/\\\/[^"]+\.mp4[^"]*)"/i) ||
      html.match(/"contentUrl"\s*:\s*"(https:\\\/\\\/[^"]+\.mp4[^"]*)"/i) ||
      html.match(/(https:\/\/[^"'\s]+\.cdninstagram\.com\/[^"'\s]+\.mp4[^"'\s]*)/i);
    if (fromJson?.[1]) {
      videoUrl = decodeHtmlEntities(fromJson[1].replace(/\\\//g, "/"));
    }
  }
  const title = metaContent(html, "og:title") || "Instagram";
  const ogUrl = metaContent(html, "og:url") || permalink;
  let profileUrl = "";
  try {
    const u = new URL(ogUrl);
    const user = u.pathname.match(/^\/([A-Za-z0-9._]+)\//);
    if (user && !["p", "reel", "reels", "tv"].includes(user[1])) {
      profileUrl = `https://www.instagram.com/${user[1]}/`;
    }
  } catch {
    /* ignore */
  }

  return {
    ok: Boolean(thumbnail || videoUrl),
    shortcode: code,
    permalink: ogUrl.startsWith("http") ? ogUrl : permalink,
    thumbnail,
    videoUrl,
    title,
    profileUrl,
  };
}
