/** 夥伴文章元件外觀：色票、圓角、邊框、寬度 */

export const COLOR_SWATCHES = [
  "#1E4AD1",
  "#93003c",
  "#111827",
  "#FFFFFF",
  "#FADE2B",
  "#0ea5e9",
  "#10b981",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
  "#f3f1eb",
  "#e2e8f0",
  "#000000",
  "transparent",
];

export const RADIUS_OPTIONS = [
  { id: "0", label: "直角", px: 0 },
  { id: "6", label: "小", px: 6 },
  { id: "12", label: "中", px: 12 },
  { id: "20", label: "大", px: 20 },
  { id: "999", label: "膠囊", px: 999 },
];

export const WIDTH_OPTIONS = [
  { id: "full", label: "滿版" },
  { id: "auto", label: "內容" },
  { id: "75", label: "75%" },
  { id: "50", label: "50%" },
  { id: "33", label: "33%" },
  { id: "custom", label: "自訂" },
];

export const HEIGHT_OPTIONS = [
  { id: "auto", label: "自動", px: 0 },
  { id: "sm", label: "矮", px: 160 },
  { id: "md", label: "中", px: 240 },
  { id: "lg", label: "高", px: 360 },
  { id: "xl", label: "更高", px: 520 },
  { id: "custom", label: "自訂", px: 0 },
];

export const GAP_OPTIONS = [
  { id: "none", label: "無", px: 0 },
  { id: "sm", label: "小", px: 8 },
  { id: "md", label: "中", px: 16 },
  { id: "lg", label: "大", px: 28 },
];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function safeColor(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  if (v === "transparent") return "transparent";
  if (HEX.test(v)) return v.toLowerCase();
  return "";
}

const RADIUS_IDS = ["0", "6", "12", "20", "999"];

export const CARD_DESIGN_TYPES = new Set(["social-post", "products"]);

function pickRadius(value) {
  return RADIUS_IDS.includes(String(value)) ? String(value) : "";
}

export function sanitizeDesign(p = {}, type = "") {
  const width = ["full", "auto", "75", "50", "33", "custom"].includes(p.width)
    ? p.width
    : "";
  const radius = pickRadius(p.radius);
  const card_radius = pickRadius(p.card_radius);
  const pad = ["none", "sm", "md", "lg"].includes(p.pad) ? p.pad : "";
  const shadow = ["none", "sm", "md"].includes(p.shadow) ? p.shadow : "";
  const card_shadow = ["none", "sm", "md"].includes(p.card_shadow)
    ? p.card_shadow
    : "";
  const height_mode = HEIGHT_OPTIONS.some((o) => o.id === p.height_mode)
    ? p.height_mode
    : "";
  const gap = GAP_OPTIONS.some((o) => o.id === p.gap) ? p.gap : "";
  const border_w = Math.min(8, Math.max(0, Number(p.border_w) || 0));
  const card_border_w = Math.min(8, Math.max(0, Number(p.card_border_w) || 0));
  const out = {};
  const bg = safeColor(p.bg);
  const color = safeColor(p.color);
  const fill = safeColor(p.fill);
  const border = safeColor(p.border);
  const card_bg = safeColor(p.card_bg);
  const card_border = safeColor(p.card_border);
  if (["left", "center", "right"].includes(p.align)) out.align = p.align;
  if (bg) out.bg = bg;
  if (color) out.color = color;
  if (fill) out.fill = fill;
  if (border) out.border = border;
  if (border_w) out.border_w = border_w;
  if (CARD_DESIGN_TYPES.has(type)) {
    if (card_radius) out.card_radius = card_radius;
    else if (radius) out.card_radius = radius;
    if (radius && card_radius) out.radius = radius;
    if (card_bg) out.card_bg = card_bg;
    if (card_border) out.card_border = card_border;
    if (card_border_w) out.card_border_w = card_border_w;
    if (card_shadow) out.card_shadow = card_shadow;
  } else if (radius) {
    out.radius = radius;
  }
  if (width) out.width = width;
  if (width === "custom") {
    out.width_px = Math.min(1200, Math.max(160, Number(p.width_px) || 480));
  }
  if (pad) out.pad = pad;
  if (shadow) out.shadow = shadow;
  if (height_mode && height_mode !== "auto") out.height_mode = height_mode;
  if (height_mode === "custom") {
    out.min_h = Math.min(900, Math.max(80, Number(p.min_h) || 240));
  }
  if (gap) out.gap = gap;
  return out;
}

function radiusCss(radius) {
  if (radius === "" || radius == null) return undefined;
  const n = Number(radius);
  if (Number.isNaN(n)) return undefined;
  return n >= 999 ? 9999 : n;
}

export function designRadiusPx(radius) {
  const n = radiusCss(radius);
  return n == null ? 12 : n;
}

/** 圖片牆：外層軌道對齊，內層框決定拼貼寬度（避免文章欄過寬把比例撐怪） */
export const PHOTO_WALL_READ_WIDTH = 720;

export function photoWallFrameStyle(p = {}) {
  const justify =
    p.align === "right" ? "flex-end" : p.align === "center" ? "center" : "flex-start";
  const frame = {
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };
  if (p.width === "75") {
    frame.width = "75%";
  } else if (p.width === "50") {
    frame.width = "50%";
  } else if (p.width === "custom") {
    frame.width = `${Math.min(1200, Math.max(160, Number(p.width_px) || PHOTO_WALL_READ_WIDTH))}px`;
  } else {
    frame.width = "100%";
    frame.maxWidth = PHOTO_WALL_READ_WIDTH;
  }
  return {
    track: {
      width: "100%",
      display: "flex",
      justifyContent: justify,
    },
    frame,
  };
}

function widthCss(p, type) {
  const fillTypes = new Set([
    "image",
    "gallery",
    "video",
    "carousel",
    "products",
    "social-post",
    "share",
  ]);
  if (fillTypes.has(type) && (!p.width || p.width === "auto" || p.width === "full")) {
    return "100%";
  }
  if (!p.width || p.width === "full") return "100%";
  if (p.width === "auto") return "fit-content";
  if (p.width === "custom") return `${Number(p.width_px) || 480}px`;
  return `${p.width}%`;
}

function minHeightCss(p) {
  if (!p.height_mode || p.height_mode === "auto") return undefined;
  if (p.height_mode === "custom") {
    return `${Math.min(900, Math.max(80, Number(p.min_h) || 240))}px`;
  }
  const found = HEIGHT_OPTIONS.find((o) => o.id === p.height_mode);
  return found?.px ? `${found.px}px` : undefined;
}

export function designHeightPx(p = {}) {
  if (!p.height_mode || p.height_mode === "auto") return 0;
  if (p.height_mode === "custom") {
    return Math.min(900, Math.max(80, Number(p.min_h) || 240));
  }
  return HEIGHT_OPTIONS.find((o) => o.id === p.height_mode)?.px || 0;
}

export function gapCss(gap) {
  const found = GAP_OPTIONS.find((o) => o.id === gap);
  if (!found) return 16;
  return found.px;
}

function padCss(pad) {
  if (pad === "sm") return "8px 12px";
  if (pad === "md") return "16px 18px";
  if (pad === "lg") return "28px 24px";
  return undefined;
}

function shadowCss(shadow) {
  if (shadow === "sm") return "0 1px 3px rgba(15,23,42,.12)";
  if (shadow === "md") return "0 10px 28px rgba(15,23,42,.14)";
  return undefined;
}

const SKIP_BOX = new Set(["columns", "spacer", "html"]);
const SKIP_PAINT = new Set(["button", "cta", "alert"]);
/** 社群貼文用等比縮放，不要用 overflow 裁切 */
const SKIP_CLIP = new Set(["social-post", "photo-wall"]);
const SKIP_RADIUS_SHELL = new Set(["social-post", "products"]);

/** 外層：寬度、對齊、底、框、圓角 */
export function designShellStyle(type, p = {}) {
  if (SKIP_BOX.has(type)) return undefined;
  const shellP = type === "photo-wall" ? { ...p, width: "full" } : p;
  const style = {
    maxWidth: "100%",
    width: widthCss(shellP, type),
    boxSizing: "border-box",
    minWidth: 0,
  };
  if (p.align === "center") {
    style.marginLeft = "auto";
    style.marginRight = "auto";
  } else if (p.align === "right") {
    style.marginLeft = "auto";
  }
  const minH = minHeightCss(p);
  if (minH && !SKIP_CLIP.has(type)) {
    style.minHeight = minH;
    style.height = minH;
    style.overflow = "hidden";
    style.display = "flex";
    style.flexDirection = "column";
  } else if (minH && SKIP_CLIP.has(type)) {
    style.minHeight = minH;
  }
  if (SKIP_PAINT.has(type)) return style;

  if (p.bg) style.background = p.bg;
  if (p.color) style.color = p.color;
  const r = radiusCss(p.radius);
  const skipShellRadius = SKIP_RADIUS_SHELL.has(type) && !p.card_radius;
  if (r != null && !skipShellRadius) {
    style.borderRadius = r;
    if (!SKIP_CLIP.has(type)) style.overflow = "hidden";
  }
  if (p.border_w) {
    style.border = `${p.border_w}px solid ${p.border || "#e2e8f0"}`;
  }
  const pad = padCss(p.pad);
  if (pad) style.padding = pad;
  const sh = shadowCss(p.shadow);
  if (sh) style.boxShadow = sh;
  return style;
}

/** 內層卡片：圓角／底／框／陰影，與外層容器分開 */
export function designCardStyle(p = {}) {
  const style = { overflow: "hidden" };
  const r = radiusCss(p.card_radius || p.radius);
  if (r != null) style.borderRadius = r;
  const bg = safeColor(p.card_bg);
  if (bg) style.background = bg;
  const bw = Math.min(8, Math.max(0, Number(p.card_border_w) || 0));
  if (bw) style.border = `${bw}px solid ${safeColor(p.card_border) || "#e2e8f0"}`;
  const sh = shadowCss(p.card_shadow);
  if (sh) style.boxShadow = sh;
  return style;
}
export function designControlStyle(p = {}, { outline = false } = {}) {
  const fill = p.fill || "#1E4AD1";
  const text = p.color || (outline ? fill : "#ffffff");
  const border = p.border || fill;
  const bw = p.border_w || (outline ? 2 : 0);
  const r = radiusCss(p.radius ?? "999");
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 20px",
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 1.2,
    background: outline ? "transparent" : fill,
    color: text,
    border: `${bw}px solid ${outline ? border : bw ? border : "transparent"}`,
    borderRadius: r != null ? r : 9999,
    width: p.width === "full" ? "100%" : undefined,
    boxSizing: "border-box",
  };
}
