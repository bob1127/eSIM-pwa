/**
 * chatAffiliate.js
 * Jeko × Klook / KKday 聯盟商品 → J寶 推薦（同分潤連結）
 * 僅在使用者出現對應關鍵詞（住宿／門票／交通／活動等）時才推，避免亂塞。
 */

import { KLOOK_HOTELS } from "@/data/klook/hotels";
import { KLOOK_JP_TICKETS } from "@/data/klook/jp";
import { KLOOK_ACTIVITIES, klookAff } from "@/data/klook/activities";
import { KKDAY_TICKETS } from "@/data/kkday/tickets";

const MAX_CARDS = Number(process.env.CHAT_AFFILIATE_MAX_CARDS || 3);
const PROMPT_BUDGET = Number(process.env.CHAT_AFFILIATE_PROMPT_BUDGET || 900);
/** 低於此分數不推（避免只靠「日本」等泛用詞命中） */
const MIN_SCORE = Number(process.env.CHAT_AFFILIATE_MIN_SCORE || 12);

/** 必須出現至少一類聯盟意圖，才啟用 Klook／KKday 推薦 */
const AFFILIATE_INTENT =
  /klook|kkday|可購|客路|飯店|住宿|酒店|hotel|民宿|訂房|過夜住宿|門票|票券|通行證|一日券|入場|pass|樂園|環球|迪士尼|展望台|景點票|體驗|活動票|一日遊|半日遊|導覽|交通票|交通卡|地鐵卡|火車|鐵道|rail|\bjr\b|周遊券|t-?money|ktx|西瓜卡|ic\s*卡|機場交通|接駁/i;

const HOTEL_INTENT = /飯店|住宿|酒店|hotel|民宿|訂房|過夜|住哪/i;
const TICKET_INTENT =
  /門票|票券|通行證|一日券|入場|pass|樂園|環球|迪士尼|展望|景點|體驗|活動|一日遊|半日遊|導覽/i;
const TRANSPORT_INTENT =
  /交通票|交通卡|地鐵|火車|鐵道|rail|\bjr\b|周遊券|t-?money|ktx|西瓜卡|ic\s*卡|機場交通|接駁/i;

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

function isTransportItem(item) {
  const blob = [item.title, item.subtitle, item.category, item.badge]
    .join(" ")
    .toLowerCase();
  return /交通|地鐵|火車|鐵道|t-?money|ktx|通票|鐵道周遊|rail|\bjr\b|周遊|西瓜|ic\s*卡|機場交通/.test(
    blob
  );
}

function scoreAffiliate(item, queryText) {
  const q = String(queryText || "").toLowerCase();
  if (!q) return 0;
  // 沒有聯盟意圖關鍵詞 → 一律不推
  if (!AFFILIATE_INTENT.test(q)) return 0;

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

  const wantHotel = HOTEL_INTENT.test(q);
  const wantTicket = TICKET_INTENT.test(q);
  const wantTransport = TRANSPORT_INTENT.test(q);

  // 意圖與商品類型要對得上；對不上直接排除
  if (wantHotel && !wantTicket && !wantTransport) {
    if (item.kind !== "hotel") return 0;
    score += 14;
  } else if (wantTransport && !wantHotel) {
    if (!isTransportItem(item)) return 0;
    score += 16;
  } else if (wantTicket && !wantHotel) {
    if (item.kind === "hotel") return 0;
    score += 10;
    if (isTransportItem(item) && !wantTransport) score -= 4;
  } else {
    // 僅提到 klook／kkday 或混合意圖：類型不硬卡，但仍需足夠關鍵詞分數
    if (/klook/.test(q) && item.partner === "klook") score += 10;
    if (/kkday/.test(q) && item.partner === "kkday") score += 10;
    if (wantHotel && item.kind === "hotel") score += 10;
    if (wantTicket && item.kind !== "hotel") score += 8;
    if (wantTransport && isTransportItem(item)) score += 12;
  }

  if (/泳池|游泳池|pool/.test(q) && item.kind === "hotel") score += 2;

  // 地區／國家：有明確地區意圖時，不符者排除
  let regionHit = false;
  for (const hint of REGION_HINTS) {
    if (!hint.re.test(q)) continue;
    regionHit = true;
    if (hint.countryIds.includes(String(item.countryId || "").toLowerCase())) {
      score += hint.boost;
    } else {
      return 0;
    }
  }
  if (regionHit && score < 1) return 0;

  return score;
}

function pickAffiliates(queryText, limit = MAX_CARDS) {
  const q = String(queryText || "").trim();
  if (!q || !AFFILIATE_INTENT.test(q)) return [];

  const scored = CATALOG.map((item) => ({
    item,
    score: scoreAffiliate(item, queryText),
  }))
    .filter((x) => x.score >= MIN_SCORE)
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
    "使用者已明確詢問住宿／門票／交通／活動等相關需求。僅推薦下列對應商品，並直接貼「購買連結」（已含聯盟參數）。勿主動塞其他無關聯盟商品，勿改成非聯盟網址。",
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
