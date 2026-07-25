/**
 * chatAffiliate.js
 * Jeko × Klook / KKday 聯盟商品 → J寶 推薦（同分潤連結）
 */

import { KLOOK_HOTELS } from "@/data/klook/hotels";
import { KLOOK_JP_TICKETS } from "@/data/klook/jp";
import { KLOOK_ACTIVITIES, klookAff } from "@/data/klook/activities";
import { KKDAY_TICKETS } from "@/data/kkday/tickets";

const MAX_CARDS = Number(process.env.CHAT_AFFILIATE_MAX_CARDS || 3);
const PROMPT_BUDGET = Number(process.env.CHAT_AFFILIATE_PROMPT_BUDGET || 900);

function normalizeItem(raw, partner) {
  if (!raw?.url || !raw?.title) return null;
  const url =
    partner === "klook" && !String(raw.url).includes("affiliate.klook.com")
      ? klookAff(raw.url)
      : raw.url;
  const images = Array.isArray(raw.images)
    ? raw.images.filter(Boolean)
    : raw.imageUrl
      ? [raw.imageUrl]
      : [];

  return {
    id: raw.id,
    partner,
    kind: raw.kind || (partner === "klook" && raw.hotelId ? "hotel" : "ticket"),
    hotelId: raw.hotelId || null,
    title: raw.title,
    subtitle: raw.subtitle || raw.regionLabel || "",
    regionLabel: raw.regionLabel || "",
    countryId: raw.countryId || "",
    tabId: raw.tabId || "",
    category: raw.category || "",
    badge: raw.badge || "",
    priceLabel: raw.priceLabel || "",
    sellPriceLabel: raw.sellPriceLabel || "",
    discountLabel: raw.discountLabel || "",
    footer: raw.footer || "",
    description: raw.description || "",
    features: Array.isArray(raw.features) ? raw.features : [],
    location: raw.location || null,
    url,
    images,
    imageUrl: images[0] || null,
  };
}

function buildCatalog() {
  const list = [];

  for (const h of KLOOK_HOTELS || []) {
    list.push(normalizeItem({ ...h, kind: "hotel" }, "klook"));
  }
  for (const t of KLOOK_ACTIVITIES || []) {
    list.push(normalizeItem(t, "klook"));
  }
  for (const t of KLOOK_JP_TICKETS || []) {
    // 可能與 activities 重複，之後用 id 去重
    list.push(normalizeItem(t, "klook"));
  }
  for (const t of KKDAY_TICKETS || []) {
    list.push(normalizeItem(t, "kkday"));
  }

  const map = new Map();
  for (const item of list) {
    if (!item) continue;
    const key = item.id || item.url;
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}

const CATALOG = buildCatalog();

const REGION_HINTS = [
  {
    re: /韓國|南韓|首爾|釜山|濟州|korea|seoul|busan/,
    countryIds: ["korea"],
    boost: 18,
  },
  {
    re: /日本|大阪|東京|京都|沖繩|北海道|japan|osaka|tokyo|kyoto/,
    countryIds: ["japan"],
    boost: 18,
  },
  {
    re: /台灣|台北|taiwan|taipei/,
    countryIds: ["taiwan"],
    boost: 18,
  },
];

function scoreAffiliate(item, queryText) {
  const q = String(queryText || "").toLowerCase();
  if (!q) return 0;

  const blob = [
    item.title,
    item.subtitle,
    item.regionLabel,
    item.category,
    item.badge,
    item.description,
    item.partner,
    item.kind,
    item.countryId,
    ...(item.features || []),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const tokens = q.match(/[\u4e00-\u9fff]{2,}|[a-z0-9]{3,}/g) || [];
  for (const t of tokens) {
    if (item.title.toLowerCase().includes(t)) score += 6;
    if (item.regionLabel.toLowerCase().includes(t)) score += 5;
    if (blob.includes(t)) score += 2;
  }

  // 意圖加權
  if (/飯店|住宿|酒店|hotel|民宿/.test(q) && item.kind === "hotel") score += 12;
  if (
    /門票|票券|通行證|pass|樂園|環球|迪士尼|展望/.test(q) &&
    item.kind === "ticket"
  )
    score += 8;
  if (/交通|地鐵|火車|鐵道|rail|t-?money|ktx/.test(q)) {
    const transportFocus = [
      item.title,
      item.subtitle,
      item.category,
      item.badge,
    ]
      .join(" ")
      .toLowerCase();
    if (/交通|地鐵|火車|鐵道|t-?money|ktx|通票|鐵道周遊|rail/.test(transportFocus))
      score += 16;
    if (/交通票券|機場交通|必備交通/.test(transportFocus)) score += 10;
  }
  if (/泳池|游泳池|pool/.test(q)) {
    // 站上飯店卡未必標泳池；略降，仍可推大阪住宿卡並說明需向官網確認設施
    if (item.kind === "hotel") score += 2;
  }
  if (/klook/.test(q) && item.partner === "klook") score += 10;
  if (/kkday/.test(q) && item.partner === "kkday") score += 10;

  // 地區／國家：有明確地區意圖時，不符者大幅降權
  let regionHit = false;
  for (const hint of REGION_HINTS) {
    if (!hint.re.test(q)) continue;
    regionHit = true;
    if (hint.countryIds.includes(String(item.countryId || "").toLowerCase())) {
      score += hint.boost;
    } else {
      score -= 20;
    }
  }
  if (regionHit && score < 1) return 0;

  return score;
}

function pickAffiliates(queryText, limit = MAX_CARDS) {
  const scored = CATALOG.map((item) => ({
    item,
    score: scoreAffiliate(item, queryText),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.item);
}

/**
 * Prompt 知識（精簡，附分潤連結）
 */
export function fetchAffiliateKnowledge(queryText = "") {
  const items = pickAffiliates(queryText);
  if (!items.length) return "";

  const lines = [
    "【Jeko 聯盟推薦｜Klook／KKday（官網同款分潤連結）】",
    "回答旅遊票券、住宿時，優先推薦下列商品，並直接貼「購買連結」（已含聯盟參數，可計分潤）。勿改成非聯盟網址。",
  ];

  let used = lines.join("\n").length;
  for (const item of items) {
    const block = [
      `▸ [${item.partner.toUpperCase()}] ${item.title}`,
      item.regionLabel ? `  地區：${item.regionLabel}` : "",
      item.priceLabel ? `  價格：${item.priceLabel}` : "",
      item.description ? `  說明：${item.description.slice(0, 120)}` : "",
      `  購買連結：${item.url}`,
    ]
      .filter(Boolean)
      .join("\n");
    if (used + block.length + 2 > PROMPT_BUDGET) break;
    lines.push(block);
    used += block.length + 2;
  }

  return lines.join("\n\n");
}

/**
 * 前端卡片／popup 完整資料（與首頁聯盟卡同欄位）
 */
export function fetchAffiliateCards(queryText = "") {
  return pickAffiliates(queryText);
}

export function getAffiliateCatalogCount() {
  return CATALOG.length;
}
