/**
 * 夥伴文章視覺編輯器 — Elementor 主流元件定義、消毒、轉 HTML
 */

import { sanitizeDesign } from "./partnerBlogDesign";

export const WIDGET_GROUPS = [
  {
    id: "basic",
    label: "基本",
    widgets: [
      { type: "heading", label: "標題", icon: "title" },
      { type: "text", label: "文字編輯器", icon: "notes" },
      { type: "image", label: "圖片", icon: "image" },
      { type: "video", label: "影片", icon: "videocam" },
      { type: "button", label: "按鈕", icon: "smart_button" },
      { type: "divider", label: "分隔線", icon: "horizontal_rule" },
      { type: "spacer", label: "間距", icon: "expand" },
      { type: "html", label: "HTML", icon: "code" },
    ],
  },
  {
    id: "pro",
    label: "Pro 元件",
    widgets: [
      { type: "columns", label: "欄位", icon: "view_column" },
      { type: "grid", label: "Grid", icon: "grid_view" },
      { type: "table", label: "表格", icon: "table" },
      { type: "gallery", label: "圖庫", icon: "photo_library" },
      { type: "photo-wall", label: "圖片牆", icon: "grid_on" },
      { type: "icon-box", label: "圖示方塊", icon: "dashboard" },
      { type: "icon-list", label: "圖示清單", icon: "format_list_bulleted" },
      { type: "accordion", label: "手風琴", icon: "unfold_more" },
      { type: "tabs", label: "分頁", icon: "tab" },
      { type: "alert", label: "提示框", icon: "info" },
      { type: "quote", label: "引言", icon: "format_quote" },
      { type: "testimonial", label: "推薦語", icon: "record_voice_over" },
      { type: "cta", label: "行動呼籲", icon: "campaign" },
      { type: "counter", label: "計數器", icon: "pin" },
      { type: "progress", label: "進度條", icon: "linear_scale" },
      { type: "rating", label: "星等", icon: "star" },
      { type: "social", label: "社群連結", icon: "share" },
      { type: "share", label: "社群分享", icon: "ios_share" },
      { type: "social-post", label: "社群貼文", icon: "photo_camera" },
      { type: "map", label: "Google 地圖", icon: "map" },
      { type: "carousel", label: "輪播", icon: "view_carousel" },
      { type: "products", label: "產品區塊", icon: "inventory_2" },
    ],
  },
];

export function newBlockId() {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clip(str, max = 8000) {
  return String(str ?? "").slice(0, max);
}

export function safeHref(href, fallback = "#") {
  const h = clip(String(href || "").trim(), 500);
  if (!h) return fallback;
  if (/^\s*javascript:/i.test(h)) return fallback;
  if (
    h.startsWith("/") ||
    h.startsWith("#") ||
    h.startsWith("https://") ||
    h.startsWith("http://")
  ) {
    return h;
  }
  return fallback;
}

export function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function defaultProps(type) {
  switch (type) {
    case "heading":
      return { text: "標題文字", tag: "h2", align: "left" };
    case "text":
      return {
        html: "<p>在這裡撰寫段落。可直接描述行程、注意事項或 eSIM 使用方式。</p>",
      };
    case "image":
      return { src: "", alt: "", caption: "", width: "full" };
    case "video":
      return { url: "", fileUrl: "", width: "full" };
    case "button":
      return { label: "了解更多", href: "", align: "left", style: "solid" };
    case "divider":
      return { style: "solid" };
    case "spacer":
      return { height: 32 };
    case "html":
      return { html: "" };
    case "columns":
      return { count: 2, gap: "md" };
    case "grid":
      return { rows: 2, cols: 2, gap: "md" };
    case "table":
      return {
        rows: 3,
        cols: 3,
        header: true,
        cells: [
          ["項目", "內容", "備註"],
          ["", "", ""],
          ["", "", ""],
        ],
        width: "full",
        border_w: 1,
        border: "#e2e8f0",
        radius: "6",
      };
    case "gallery":
      return { urls: "", width: "full" };
    case "photo-wall":
      return {
        urls: "",
        wide: false,
        size: "md",
        align: "left",
        layout: "mosaic",
        width: "custom",
        width_px: 720,
      };
    case "icon-box":
      return {
        icon: "travel_explore",
        title: "重點標題",
        text: "補充說明文字。",
      };
    case "icon-list":
      return {
        items: "確認手機支援 eSIM\n出發前完成安裝\n落地再開啟漫遊數據",
      };
    case "accordion":
      return {
        items: [
          { title: "常見問題一", body: "在此回答旅客最常問的問題。" },
          { title: "常見問題二", body: "可再補充第二則。" },
        ],
      };
    case "tabs":
      return {
        items: [
          { title: "行程", body: "第一天建議行程。" },
          { title: "交通", body: "交通與票券提醒。" },
        ],
      };
    case "alert":
      return { tone: "info", text: "重要提醒：請在出發前完成 eSIM 安裝。" };
    case "quote":
      return { text: "這是一段引言。", cite: "" };
    case "testimonial":
      return {
        text: "實際使用後落地就能上網，非常推薦。",
        name: "旅客",
        role: "自由行",
      };
    case "cta":
      return {
        title: "準備好出國上網了嗎？",
        text: "回到賣場挑選適合天數與流量的 eSIM。",
        button: "選購方案",
        href: "",
      };
    case "counter":
      return { value: "24", suffix: "hr", label: "全年無休支援" };
    case "progress":
      return { label: "5G 覆蓋", percent: 90 };
    case "rating":
      return { value: 5, label: "旅客評價" };
    case "social":
      return {
        style: "icons",
        title: "追蹤我們",
        text: "最新優惠與安裝教學",
        instagram: "",
        facebook: "",
        line: "",
      };
    case "share":
      return {
        label: "分享",
        show_label: true,
        items: "facebook,line,instagram,copy,native",
        look: "brand",
        shape: "circle",
        size: "md",
        width: "full",
      };
    case "social-post":
      return {
        urls: "",
        layout: "carousel",
        gap: "md",
        visible: 4,
        autoplay: true,
        interval: 4,
        width: "full",
      };
    case "map":
      return { query: "Tokyo Station" };
    case "carousel":
      return {
        urls: "",
        style: "slide",
        effect: "slide",
        visible: 1,
        height: 320,
        autoplay: true,
        interval: 4,
      };
    case "products":
      return {
        title: "推薦 eSIM",
        layout: "cards",
        width: "full",
        per_page: 2,
        visible: 2,
        autoplay: true,
        interval: 4,
        items: [],
      };
    default:
      return {};
  }
}

export function isLayoutType(type) {
  return type === "columns" || type === "grid";
}

export function layoutCellCount(props = {}, type = "columns") {
  if (type === "grid") {
    const rows = Math.min(4, Math.max(1, Number(props.rows) || 2));
    const cols = Math.min(4, Math.max(1, Number(props.cols) || 2));
    return rows * cols;
  }
  return Number(props.count) === 3 ? 3 : 2;
}

export function createBlock(type) {
  const block = {
    id: newBlockId(),
    type,
    props: defaultProps(type),
  };
  if (type === "columns") {
    block.columns = [[], []];
  }
  if (type === "grid") {
    block.columns = Array.from({ length: 4 }, () => []);
  }
  return block;
}

function sanitizeItems(items, max = 8) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, max).map((it) => ({
    title: clip(it?.title, 120),
    body: clip(it?.body, 2000),
  }));
}

export function sanitizeBlock(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = String(raw.type || "");
  const allowed = WIDGET_GROUPS.flatMap((g) => g.widgets.map((w) => w.type));
  if (!allowed.includes(type)) return null;
  const props = { ...defaultProps(type), ...(raw.props || {}) };
  const block = {
    id: clip(raw.id || newBlockId(), 80),
    type,
    props: {},
  };

  const p = props;
  switch (type) {
    case "heading":
      block.props = {
        text: clip(p.text, 200),
        tag: ["h1", "h2", "h3", "h4"].includes(p.tag) ? p.tag : "h2",
        align: ["left", "center", "right"].includes(p.align) ? p.align : "left",
      };
      break;
    case "text":
      block.props = { html: clip(p.html, 20000) };
      break;
    case "image":
      block.props = {
        src: safeHref(p.src, ""),
        alt: clip(p.alt, 120),
        caption: clip(p.caption, 200),
      };
      break;
    case "video":
      block.props = {
        url: clip(p.url, 500),
        fileUrl: safeHref(p.fileUrl, ""),
      };
      break;
    case "button":
      block.props = {
        label: clip(p.label, 60),
        href: safeHref(p.href, "#"),
        align: ["left", "center", "right"].includes(p.align) ? p.align : "left",
        style: p.style === "outline" ? "outline" : "solid",
      };
      break;
    case "divider":
      block.props = { style: p.style === "dashed" ? "dashed" : "solid" };
      break;
    case "spacer":
      block.props = {
        height: Math.min(160, Math.max(8, Number(p.height) || 32)),
      };
      break;
    case "html":
      block.props = { html: clip(p.html, 20000) };
      break;
    case "columns": {
      const count = Number(p.count) === 3 ? 3 : 2;
      const gap = ["none", "sm", "md", "lg"].includes(p.gap) ? p.gap : "md";
      block.props = { count, gap };
      const cols = Array.isArray(raw.columns) ? raw.columns : [];
      block.columns = Array.from({ length: count }, (_, i) =>
        sanitizeBlocks(cols[i] || []),
      );
      break;
    }
    case "grid": {
      const rows = Math.min(4, Math.max(1, Number(p.rows) || 2));
      const colsN = Math.min(4, Math.max(1, Number(p.cols) || 2));
      const gap = ["none", "sm", "md", "lg"].includes(p.gap) ? p.gap : "md";
      block.props = { rows, cols: colsN, gap };
      const cols = Array.isArray(raw.columns) ? raw.columns : [];
      block.columns = Array.from({ length: rows * colsN }, (_, i) =>
        sanitizeBlocks(cols[i] || []),
      );
      break;
    }
    case "table": {
      const colsN = Math.min(6, Math.max(1, Number(p.cols) || 3));
      const rows = Math.min(12, Math.max(1, Number(p.rows) || 3));
      const src = Array.isArray(p.cells) ? p.cells : [];
      block.props = {
        rows,
        cols: colsN,
        header: p.header !== false,
        cells: Array.from({ length: rows }, (_, r) =>
          Array.from({ length: colsN }, (_, c) => clip(src[r]?.[c] ?? "", 200)),
        ),
      };
      break;
    }
    case "gallery":
      block.props = { urls: clip(p.urls, 4000) };
      break;
    case "photo-wall":
      block.props = {
        urls: clip(p.urls, 8000),
        wide: p.wide === true,
        size: ["sm", "md", "lg", "full"].includes(p.size) ? p.size : "md",
        align: ["left", "center", "right"].includes(p.align) ? p.align : "left",
        layout: p.layout === "square" ? "square" : "mosaic",
      };
      break;
    case "icon-box":
      block.props = {
        icon: clip(p.icon, 40) || "travel_explore",
        title: clip(p.title, 80),
        text: clip(p.text, 400),
      };
      break;
    case "icon-list":
      block.props = { items: clip(p.items, 2000) };
      break;
    case "accordion":
    case "tabs":
      block.props = { items: sanitizeItems(p.items) };
      break;
    case "alert":
      block.props = {
        tone: ["info", "warning", "success"].includes(p.tone) ? p.tone : "info",
        text: clip(p.text, 400),
      };
      break;
    case "quote":
      block.props = { text: clip(p.text, 500), cite: clip(p.cite, 80) };
      break;
    case "testimonial":
      block.props = {
        text: clip(p.text, 500),
        name: clip(p.name, 40),
        role: clip(p.role, 40),
      };
      break;
    case "cta":
      block.props = {
        title: clip(p.title, 80),
        text: clip(p.text, 240),
        button: clip(p.button, 40),
        href: safeHref(p.href, "#"),
      };
      break;
    case "counter":
      block.props = {
        value: clip(p.value, 12),
        suffix: clip(p.suffix, 12),
        label: clip(p.label, 40),
      };
      break;
    case "progress":
      block.props = {
        label: clip(p.label, 40),
        percent: Math.min(100, Math.max(0, Number(p.percent) || 0)),
      };
      break;
    case "rating":
      block.props = {
        value: Math.min(5, Math.max(1, Number(p.value) || 5)),
        label: clip(p.label, 40),
      };
      break;
    case "social":
      block.props = {
        style: ["icons", "cards", "banner"].includes(p.style) ? p.style : "icons",
        title: clip(p.title, 80),
        text: clip(p.text, 200),
        instagram: safeHref(p.instagram, ""),
        facebook: safeHref(p.facebook, ""),
        line: safeHref(p.line, ""),
      };
      break;
    case "share": {
      const allowed = ["facebook", "line", "instagram", "copy", "native"];
      const items = String(p.items || "facebook,line,instagram,copy,native")
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter((id) => allowed.includes(id));
      block.props = {
        label: clip(p.label, 20) || "分享",
        show_label: p.show_label !== false,
        items: (items.length ? items : allowed).join(","),
        look: p.look === "outline" ? "outline" : "brand",
        shape: p.shape === "rounded" ? "rounded" : "circle",
        size: p.size === "sm" ? "sm" : "md",
      };
      break;
    }
    case "social-post":
      block.props = {
        urls: clip(p.urls, 2500),
        layout: ["auto", "carousel", "stack"].includes(p.layout)
          ? p.layout
          : "carousel",
        gap: ["none", "sm", "md", "lg"].includes(p.gap) ? p.gap : "md",
        visible: Math.min(4, Math.max(1, Number(p.visible) || 4)),
        autoplay:
          p.interval == null && p.autoplay === false
            ? true
            : p.autoplay !== false,
        interval: Math.min(12, Math.max(2, Number(p.interval) || 4)),
      };
      break;
    case "map":
      block.props = { query: clip(p.query, 120) };
      break;
    case "carousel": {
      let effect = p.effect;
      if (effect === "cube") effect = "cards";
      if (effect === "coverflow") effect = "peek";
      if (!["slide", "fade", "peek", "zoom", "marquee", "cards"].includes(effect)) {
        effect =
          p.style === "fade" ? "fade" : p.style === "peek" ? "peek" : "slide";
      }
      block.props = {
        urls: clip(p.urls, 4000),
        style: ["slide", "fade", "peek"].includes(p.style) ? p.style : "slide",
        effect,
        visible: Math.min(6, Math.max(1, Number(p.visible) || 1)),
        height: Math.min(720, Math.max(160, Number(p.height) || 320)),
        autoplay: p.autoplay !== false,
        interval: Math.min(12, Math.max(2, Number(p.interval) || 4)),
      };
      break;
    }
    case "products":
      block.props = {
        title: clip(p.title, 80),
        layout: ["grid", "row", "cards", "pages", "carousel"].includes(p.layout)
          ? p.layout
          : "cards",
        per_page: Math.min(4, Math.max(1, Number(p.per_page) || 2)),
        visible: Math.min(6, Math.max(1, Number(p.visible) || 2)),
        autoplay: p.autoplay !== false,
        interval: Math.min(12, Math.max(2, Number(p.interval) || 4)),
        items: Array.isArray(p.items)
          ? p.items.slice(0, 12).map((it) => ({
              handle: clip(it?.handle, 80),
              name: clip(it?.name, 80),
              image: safeHref(it?.image, ""),
              price: clip(String(it?.price ?? ""), 12),
              href: safeHref(it?.href, "#"),
            }))
          : [],
      };
      break;
    default:
      return null;
  }
  block.props = { ...block.props, ...sanitizeDesign(p, type) };
  return block;
}

export function sanitizeBlocks(list) {
  if (!Array.isArray(list)) return [];
  return list.map(sanitizeBlock).filter(Boolean).slice(0, 80);
}

export function parseContentBlocks(raw) {
  if (Array.isArray(raw)) return sanitizeBlocks(raw);
  if (typeof raw === "string") {
    try {
      return sanitizeBlocks(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

export function youtubeEmbed(url) {
  const u = String(url || "").trim();
  const m =
    u.match(/youtu\.be\/([\w-]{6,})/) ||
    u.match(/[?&]v=([\w-]{6,})/) ||
    u.match(/youtube\.com\/embed\/([\w-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return "";
}

/** 把 IG / FB 貼文網址轉成可嵌入的 iframe */
export function parseSocialPostUrl(raw) {
  const input = String(raw || "").trim();
  if (!input) return null;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "instagram.com" || host === "instagr.am") {
    const m = url.pathname.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    const isReel = m[1] !== "p";
    const code = m[2];
    const path = isReel ? "reel" : "p";
    return {
      platform: "instagram",
      label: isReel ? "Instagram Reels" : "Instagram",
      permalink: `https://www.instagram.com/${path}/${code}/`,
      embedSrc: `https://www.instagram.com/${path}/${code}/embed`,
    };
  }

  if (
    host === "facebook.com" ||
    host === "fb.com" ||
    host === "m.facebook.com" ||
    host === "fb.watch"
  ) {
    ["fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(
      (k) => url.searchParams.delete(k),
    );
    const permalink = url.toString();
    return {
      platform: "facebook",
      label: "Facebook",
      permalink,
      embedSrc: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(
        permalink,
      )}&show_text=true&width=550`,
    };
  }

  return null;
}

export function parseSocialPostUrls(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => parseSocialPostUrl(line.trim()))
    .filter(Boolean)
    .slice(0, 12);
}

function galleryUrls(urls, max = 12) {
  return String(urls || "")
    .split(/[\n,]+/)
    .map((s) => safeHref(s.trim(), ""))
    .filter(Boolean)
    .slice(0, max);
}

function blockToHtml(block) {
  const p = block.props || {};
  switch (block.type) {
    case "heading": {
      const Tag = p.tag || "h2";
      const align = p.align === "center" ? "center" : p.align === "right" ? "right" : "left";
      return `<${Tag} style="text-align:${align}">${esc(p.text)}</${Tag}>`;
    }
    case "text":
      return p.html || "";
    case "image":
      if (!p.src) return "";
      return `<figure><img src="${esc(p.src)}" alt="${esc(p.alt)}" />${
        p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ""
      }</figure>`;
    case "video": {
      const src = youtubeEmbed(p.url);
      if (src) {
        return `<p><iframe src="${esc(src)}" width="100%" height="360" allowfullscreen loading="lazy"></iframe></p>`;
      }
      if (p.fileUrl) {
        return `<p><video src="${esc(p.fileUrl)}" controls playsinline style="width:100%"></video></p>`;
      }
      if (p.url) return `<p><a href="${esc(safeHref(p.url))}">${esc(p.url)}</a></p>`;
      return "";
    }
    case "button":
      return `<p style="text-align:${p.align || "left"}"><a href="${esc(p.href)}">${esc(p.label)}</a></p>`;
    case "divider":
      return `<hr />`;
    case "spacer":
      return `<p style="height:${Number(p.height) || 32}px"></p>`;
    case "html":
      return p.html || "";
    case "columns": {
      const cols = block.columns || [];
      const inner = cols
        .map((c) => `<div>${blocksToHtml(c)}</div>`)
        .join("");
      return `<div class="jeko-cols" style="display:grid;grid-template-columns:repeat(${cols.length},minmax(0,1fr));gap:16px">${inner}</div>`;
    }
    case "grid": {
      const colsN = Number(p.cols) || 2;
      const inner = (block.columns || [])
        .map((c) => `<div>${blocksToHtml(c)}</div>`)
        .join("");
      return `<div class="jeko-grid" style="display:grid;grid-template-columns:repeat(${colsN},minmax(0,1fr));gap:16px">${inner}</div>`;
    }
    case "table": {
      const cells = p.cells || [];
      const header = p.header !== false;
      const rows = cells
        .map((row, ri) => {
          const tag = header && ri === 0 ? "th" : "td";
          return `<tr>${(row || [])
            .map((cell) => `<${tag}>${esc(cell)}</${tag}>`)
            .join("")}</tr>`;
        })
        .join("");
      return `<table class="jeko-table">${rows}</table>`;
    }
    case "gallery":
      return galleryUrls(p.urls)
        .map((src) => `<p><img src="${esc(src)}" alt="" /></p>`)
        .join("");
    case "photo-wall":
      return galleryUrls(p.urls, 24)
        .map((src) => `<p><img src="${esc(src)}" alt="" /></p>`)
        .join("");
    case "icon-box":
      return `<h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>`;
    case "icon-list":
      return `<ul>${String(p.items || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `<li>${esc(l)}</li>`)
        .join("")}</ul>`;
    case "accordion":
    case "tabs":
      return (p.items || [])
        .map((it) => `<h3>${esc(it.title)}</h3><p>${esc(it.body)}</p>`)
        .join("");
    case "alert":
      return `<p><strong>提醒：</strong>${esc(p.text)}</p>`;
    case "quote":
      return `<blockquote>${esc(p.text)}${p.cite ? `<cite>${esc(p.cite)}</cite>` : ""}</blockquote>`;
    case "testimonial":
      return `<blockquote>${esc(p.text)}<cite>${esc(p.name)} ${esc(p.role)}</cite></blockquote>`;
    case "cta":
      return `<h2>${esc(p.title)}</h2><p>${esc(p.text)}</p><p><a href="${esc(p.href)}">${esc(p.button)}</a></p>`;
    case "counter":
      return `<p><strong>${esc(p.value)}${esc(p.suffix)}</strong> ${esc(p.label)}</p>`;
    case "progress":
      return `<p>${esc(p.label)} ${Number(p.percent) || 0}%</p>`;
    case "rating":
      return `<p>${esc(p.label)} ${"★".repeat(Number(p.value) || 5)}</p>`;
    case "social": {
      const links = [p.instagram, p.facebook, p.line].filter(Boolean);
      const head = p.title ? `<h3>${esc(p.title)}</h3>` : "";
      return (
        head +
        links.map((h) => `<p><a href="${esc(h)}">${esc(h)}</a></p>`).join("")
      );
    }
    case "share":
      return `<p>${esc(p.label || "分享")}</p>`;
    case "social-post":
      return parseSocialPostUrls(p.urls)
        .map(
          (post) =>
            `<p><iframe src="${esc(post.embedSrc)}" width="100%" height="620" loading="lazy" style="border:0;max-width:550px"></iframe></p>`,
        )
        .join("");
    case "map":
      if (!p.query) return "";
      return `<p>地圖：${esc(p.query)}</p>`;
    case "carousel":
      return galleryUrls(p.urls)
        .map((src) => `<p><img src="${esc(src)}" alt="" /></p>`)
        .join("");
    case "products":
      return `<h3>${esc(p.title)}</h3>${(p.items || [])
        .map(
          (it) =>
            `<p><a href="${esc(it.href)}">${esc(it.name)}${it.price ? ` NT$${esc(it.price)}` : ""}</a></p>`,
        )
        .join("")}`;
    default:
      return "";
  }
}

export function blocksToHtml(blocks) {
  return sanitizeBlocks(blocks).map(blockToHtml).join("\n");
}

export function widgetLabel(type) {
  for (const g of WIDGET_GROUPS) {
    const w = g.widgets.find((x) => x.type === type);
    if (w) return w.label;
  }
  return type;
}

export { galleryUrls };
