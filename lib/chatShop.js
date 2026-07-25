/**
 * chatShop.js
 * Jeko 商城商品 → J寶 推薦（與 /shop 同目錄）
 */

import { SHOP_CATALOG } from "@/data/shop/catalog";
import { getPublicSiteUrl } from "@/lib/siteUrl";

const MAX_CARDS = Number(process.env.CHAT_SHOP_MAX_CARDS || 3);
const PROMPT_BUDGET = Number(process.env.CHAT_SHOP_PROMPT_BUDGET || 900);

const SHOP_INTENT =
  /商城|周邊|配件|充電器|充電|行動電源|耳機|轉接|插座|收納|背包|腰包|保護貼|手機殼|腳架|攝影|旅遊用品|旅行用品|3c|氮化鎵|magsafe|快充|盥洗|筆電|相機/i;

function absoluteShopUrl(href) {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  if (!href) return `${site}/shop`;
  if (/^https?:\/\//i.test(href)) return href;
  return `${site}${href.startsWith("/") ? href : `/${href}`}`;
}

function scoreShopItem(item, queryText) {
  const q = String(queryText || "").toLowerCase();
  if (!q) return 0;

  const blob = [item.title, item.desc, item.category, ...(item.tags || [])]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const tokens = q.match(/[\u4e00-\u9fff]{2,}|[a-z0-9]{3,}/g) || [];
  for (const t of tokens) {
    if (item.title.toLowerCase().includes(t)) score += 6;
    if ((item.desc || "").toLowerCase().includes(t)) score += 3;
    if ((item.tags || []).some((tag) => String(tag).toLowerCase().includes(t)))
      score += 4;
    if (blob.includes(t)) score += 1;
  }

  if (SHOP_INTENT.test(q)) score += 8;

  if (/充電|充電器|氮化鎵|快充|行動電源|magsafe|無線充電/.test(q)) {
    if (/充電|電源|氮化鎵|magsafe|pd/i.test(blob)) score += 12;
  }
  if (/耳機|降噪|anc/.test(q) && /耳機|降噪|anc/i.test(blob)) score += 12;
  if (/轉接|插座|插頭/.test(q) && /轉接|插座|插頭/i.test(blob)) score += 12;
  if (/收納|盥洗|整理/.test(q) && /收納|盥洗|整理/i.test(blob)) score += 10;
  if (
    /背包|筆電|公事包|腰包/.test(q) &&
    /背包|筆電|公事|腰包|briefcase|backpack|sleeve/i.test(blob)
  )
    score += 10;
  if (
    /腳架|相機|insta360|攝影|握把/.test(q) &&
    /腳架|相機|insta|攝影|握把|tripod|grip/i.test(blob)
  )
    score += 12;
  if (/商城|周邊|好物|推薦商品/.test(q)) score += 4;

  if (/esim/i.test(item.title) || (item.tags || []).includes("eSIM")) {
    if (!/商城|周邊|配件/.test(q)) score -= 6;
  }

  return score;
}

function pickShopItems(queryText, limit = MAX_CARDS) {
  const scored = SHOP_CATALOG.map((item) => ({
    item,
    score: scoreShopItem(item, queryText),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const strong = scored.filter((x) => x.score >= 8);
  const pool = strong.length
    ? strong
    : SHOP_INTENT.test(queryText)
      ? scored
      : [];
  return pool.slice(0, limit).map((x) => x.item);
}

export function fetchShopKnowledge(queryText = "") {
  const items = pickShopItems(queryText);
  if (!items.length) return "";

  const lines = [
    "【Jeko 商城推薦｜/shop】",
    "回覆順序：先給實用說明（插頭規格、注意事項等），再輕描淡寫帶一句可參考下方卡片。",
    "聊天室已會顯示商品輪播卡；文字中請勿重複列出「購買：路徑」「售價 NT$」這種硬推格式。",
    "若要在文字附購買連結，只能用下列完整 https 網址，禁止用官網首頁充當商品連結。",
  ];

  let used = lines.join("\n").length;
  for (const item of items) {
    const url = absoluteShopUrl(item.href);
    const block = [
      `▸ ${item.title}`,
      item.desc ? `  說明：${item.desc}` : "",
      `  參考售價：NT$${item.price}${item.original ? `（原價 NT$${item.original}）` : ""}`,
      `  購買連結：${url}`,
    ]
      .filter(Boolean)
      .join("\n");
    if (used + block.length + 2 > PROMPT_BUDGET) break;
    lines.push(block);
    used += block.length + 2;
  }

  return lines.join("\n\n");
}

export function fetchShopCards(queryText = "") {
  return pickShopItems(queryText).map((item) => ({
    ...item,
    href: absoluteShopUrl(item.href),
  }));
}

export function getShopCatalogCount() {
  return SHOP_CATALOG.length;
}
