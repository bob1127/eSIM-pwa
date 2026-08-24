export const LINE_ASPECT_OPTIONS = [
  { id: "20:13", label: "橫式 DM（20:13）" },
  { id: "16:9", label: "寬橫（16:9）" },
  { id: "4:3", label: "4:3" },
  { id: "1:1", label: "正方形（1:1）" },
  { id: "3:4", label: "直式（3:4）" },
];

export const LINE_BUBBLE_SIZE_OPTIONS = [
  { id: "mega", label: "大（mega）" },
  { id: "kilo", label: "中（kilo）" },
  { id: "micro", label: "小（micro）" },
];

export const LINE_BUTTON_STYLE_OPTIONS = [
  { id: "primary", label: "實心按鈕" },
  { id: "secondary", label: "次要按鈕" },
  { id: "link", label: "文字連結" },
];

const ASPECT_SET = new Set(LINE_ASPECT_OPTIONS.map((o) => o.id));
const SIZE_SET = new Set(LINE_BUBBLE_SIZE_OPTIONS.map((o) => o.id));
const BTN_SET = new Set(LINE_BUTTON_STYLE_OPTIONS.map((o) => o.id));

function hexColor(raw, fallback) {
  const s = String(raw || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase();
  return fallback;
}

function clip(s, n) {
  return String(s || "").trim().slice(0, n);
}

export function defaultLineCardStyle(kind = "hero") {
  const isCarousel = kind === "carousel";
  return {
    bubbleSize: isCarousel ? "kilo" : "mega",
    aspectRatio: isCarousel ? "1:1" : "20:13",
    aspectMode: "cover",
    titleColor: "#111827",
    subtitleColor: "#3768C7",
    bodyColor: "#374151",
    buttonColor: "#3768C7",
    buttonStyle: "primary",
    showHero: true,
    showTitle: true,
    showSubtitle: true,
    showBody: true,
    showButton: true,
  };
}

export function normalizeLineCardStyle(raw, kind = "hero") {
  const base = defaultLineCardStyle(kind);
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    bubbleSize: SIZE_SET.has(s.bubbleSize) ? s.bubbleSize : base.bubbleSize,
    aspectRatio: ASPECT_SET.has(s.aspectRatio) ? s.aspectRatio : base.aspectRatio,
    aspectMode: s.aspectMode === "fit" ? "fit" : "cover",
    titleColor: hexColor(s.titleColor, base.titleColor),
    subtitleColor: hexColor(s.subtitleColor, base.subtitleColor),
    bodyColor: hexColor(s.bodyColor, base.bodyColor),
    buttonColor: hexColor(s.buttonColor, base.buttonColor),
    buttonStyle: BTN_SET.has(s.buttonStyle) ? s.buttonStyle : base.buttonStyle,
    showHero: s.showHero !== false,
    showTitle: s.showTitle !== false,
    showSubtitle: s.showSubtitle !== false,
    showBody: s.showBody !== false,
    showButton: s.showButton !== false,
  };
}

export function emptyLineCard(partial = {}) {
  return {
    title: "",
    subtitle: "",
    body: "",
    imageUrl: "",
    url: "/",
    buttonLabel: "查看詳情",
    ...partial,
  };
}

export function sanitizeLineCard(raw) {
  const c = raw && typeof raw === "object" ? raw : {};
  return {
    title: clip(c.title, 80),
    subtitle: clip(c.subtitle, 60),
    body: clip(c.body, 400),
    imageUrl: clip(c.imageUrl, 1000),
    url: clip(c.url, 1000) || "/",
    buttonLabel: clip(c.buttonLabel, 20) || "查看詳情",
  };
}

export function sanitizeLineCards(list) {
  const cards = Array.isArray(list) ? list.map(sanitizeLineCard) : [];
  return cards.filter((c) => c.title || c.imageUrl || c.body || c.subtitle);
}

export function cssAspectFromLine(aspectRatio) {
  const map = {
    "20:13": "20 / 13",
    "16:9": "16 / 9",
    "4:3": "4 / 3",
    "1:1": "1 / 1",
    "3:4": "3 / 4",
  };
  return map[aspectRatio] || "20 / 13";
}
