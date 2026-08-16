/**
 * 行程規劃文章（Funliday 式：天 → 景點）
 * 存在 content_blocks 裡的單一 itinerary 區塊，不需新資料表欄位。
 */
import { sanitizeDestinationIds } from "@/lib/itineraryDestinations";

function clip(str, max = 8000) {
  return String(str ?? "").slice(0, max);
}

function newId() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeUrl(href) {
  const h = clip(String(href || "").trim(), 500);
  if (!h) return "";
  if (/^\s*javascript:/i.test(h)) return "";
  if (
    h.startsWith("/") ||
    h.startsWith("https://") ||
    h.startsWith("http://")
  ) {
    return h;
  }
  return "";
}

function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emptyStop(name = "新景點") {
  return {
    id: newId(),
    name,
    duration: "停留 1 小時",
    photos: [],
    body: "<p>寫下怎麼玩、吃什麼、交通與注意事項。</p>",
    map: "",
  };
}

export function emptyDay(index = 1) {
  return {
    id: newId(),
    title: `第 ${index} 天`,
    destinations: [],
    stops: [emptyStop("第一個景點")],
  };
}

export function emptyItineraryBlock() {
  return {
    id: newId(),
    type: "itinerary",
    props: {
      intro: "",
      destinations: [],
      days: [emptyDay(1)],
    },
  };
}

export function isItineraryBlocks(blocks) {
  return (
    Array.isArray(blocks) && blocks.some((b) => b && b.type === "itinerary")
  );
}

export function getItineraryProps(blocks) {
  const block = (blocks || []).find((b) => b && b.type === "itinerary");
  return (
    block?.props || {
      intro: "",
      destinations: [],
      days: [],
    }
  );
}

function sanitizeStop(raw) {
  const photos = Array.isArray(raw?.photos)
    ? raw.photos.map((u) => safeUrl(u)).filter(Boolean).slice(0, 12)
    : typeof raw?.photos === "string"
      ? raw.photos
          .split(/\n|,/)
          .map((u) => safeUrl(u.trim()))
          .filter(Boolean)
          .slice(0, 12)
      : [];
  return {
    id: clip(raw?.id || newId(), 80),
    name: clip(raw?.name, 80) || "景點",
    duration: clip(raw?.duration, 40),
    photos,
    body: clip(raw?.body, 20000),
    map: clip(raw?.map, 200),
  };
}

function sanitizeDay(raw, index) {
  const stops = Array.isArray(raw?.stops)
    ? raw.stops.map(sanitizeStop).slice(0, 24)
    : [emptyStop()];
  return {
    id: clip(raw?.id || newId(), 80),
    title: clip(raw?.title, 60) || `第 ${index + 1} 天`,
    destination: sanitizeDestinationIds(raw?.destinations || raw?.destination)[0] || "",
    destinations: sanitizeDestinationIds(raw?.destinations || raw?.destination),
    stops: stops.length ? stops : [emptyStop()],
  };
}

export function sanitizeItineraryBlock(raw) {
  if (!raw || raw.type !== "itinerary") return null;
  const p = raw.props || {};
  const days = Array.isArray(p.days)
    ? p.days.map(sanitizeDay).slice(0, 21)
    : [emptyDay(1)];
  return {
    id: clip(raw.id || newId(), 80),
    type: "itinerary",
    props: {
      intro: clip(p.intro, 8000),
      destinations: sanitizeDestinationIds(p.destinations),
      days: days.length ? days : [emptyDay(1)],
    },
  };
}

export function itineraryToHtml(props = {}) {
  const intro = props.intro ? `<div>${props.intro}</div>` : "";
  const days = (props.days || [])
    .map((day) => {
      const stops = (day.stops || [])
        .map((stop) => {
          const imgs = (stop.photos || [])
            .map((src) => `<p><img src="${esc(src)}" alt="${esc(stop.name)}" /></p>`)
            .join("");
          const map = stop.map
            ? `<p>地點：${esc(stop.map)}</p>`
            : "";
          return `<h3>${esc(stop.name)}${
            stop.duration ? ` · ${esc(stop.duration)}` : ""
          }</h3>${imgs}${stop.body || ""}${map}`;
        })
        .join("");
      return `<h2>${esc(day.title)}</h2>${stops}`;
    })
    .join("");
  return `${intro}${days}`;
}

export function firstItineraryImage(blocks) {
  for (const day of getItineraryProps(blocks).days || []) {
    for (const stop of day.stops || []) {
      const url = (stop.photos || []).find(Boolean);
      if (url) return url;
    }
  }
  return "";
}

export function ensureItineraryBlocks(blocks) {
  const found = (blocks || []).find((b) => b && b.type === "itinerary");
  return [sanitizeItineraryBlock(found) || emptyItineraryBlock()];
}

export function flattenStops(days = []) {
  const out = [];
  (days || []).forEach((day, di) => {
    (day.stops || []).forEach((stop, si) => {
      out.push({ day, dayIndex: di, stop, stopIndex: si });
    });
  });
  return out;
}
