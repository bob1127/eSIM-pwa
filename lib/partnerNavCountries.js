/**
 * 夥伴賣場 Navbar：由目前上架／可售 eSIM 方案動態推斷國家分類
 *
 * 規則：
 * - 只依「目前賣場可見商品」出現的種類產生項目
 * - 較具體關鍵字優先（例：中國香港 → 港澳，而非笼统的「中國」）
 * - 排序依預設熱門目的地順序，同序再依商品數
 */

import { mergeHomepageCms } from "@/lib/partnerHomepageCms";

/**
 * weight 越高越優先；patterns 以具體詞為主
 * @type {{ key: string, label: string, weight: number, patterns: RegExp[] }[]}
 */
export const PARTNER_COUNTRY_DEFS = [
  {
    key: "japan",
    label: "日本",
    weight: 100,
    patterns: [/日本/, /japan/i, /\bjp\b/i],
  },
  {
    key: "korea",
    label: "韓國",
    weight: 100,
    patterns: [/韓國|南韓|朝鮮/, /korea/i, /\bkr\b/i],
  },
  {
    key: "hongkong",
    label: "港澳",
    weight: 120,
    patterns: [
      /中國香港|中國澳門|港澳|香港|澳門/,
      /hong\s?kong/i,
      /macau|macao/i,
      /\bhk\b/i,
    ],
  },
  {
    key: "taiwan",
    label: "台灣",
    weight: 110,
    patterns: [/台灣|臺灣/, /taiwan/i, /\btw\b/i],
  },
  {
    key: "china",
    label: "中國",
    weight: 90,
    patterns: [/中國大陸|中國|大陸|內地/, /china(?!\s*hong)/i, /\bcn\b/i],
  },
  {
    key: "thailand",
    label: "泰國",
    weight: 100,
    patterns: [/泰國/, /thailand/i, /\bth\b/i],
  },
  {
    key: "vietnam",
    label: "越南",
    weight: 100,
    patterns: [/越南/, /vietnam/i, /\bvn\b/i],
  },
  {
    key: "singapore",
    label: "新加坡",
    weight: 100,
    patterns: [/新加坡/, /singapore/i, /\bsg\b/i],
  },
  {
    key: "malaysia",
    label: "馬來西亞",
    weight: 100,
    patterns: [/馬來西亞|馬來/, /malaysia/i, /\bmy\b/i],
  },
  {
    key: "philippines",
    label: "菲律賓",
    weight: 100,
    patterns: [/菲律賓/, /philippines?/i, /\bph\b/i],
  },
  {
    key: "indonesia",
    label: "印尼",
    weight: 100,
    patterns: [/印尼|印度尼西亞|峇里|巴里島/, /indonesia|bali/i, /\bid\b/i],
  },
  {
    key: "southeast_asia",
    label: "東南亞",
    weight: 95,
    patterns: [
      /東南亞|東協|新馬泰|亞太多國/,
      /south\s?east\s?asia|\bsea\b|\basean\b/i,
    ],
  },
  {
    key: "asia",
    label: "亞洲",
    weight: 70,
    patterns: [/亞洲多國|亞洲|多國通行|多國/, /asia(?!\s*minor)/i],
  },
  {
    key: "france",
    label: "法國",
    weight: 115,
    patterns: [/法國/, /france/i, /paris/i],
  },
  {
    key: "uk",
    label: "英國",
    weight: 115,
    patterns: [/英國/, /united\s*kingdom|\buk\b/i, /london|edinburgh/i],
  },
  {
    key: "austria",
    label: "奧地利",
    weight: 115,
    patterns: [/奧地利/, /austria/i, /vienna|wien|維也納|薩爾斯堡/i],
  },
  {
    key: "switzerland",
    label: "瑞士",
    weight: 115,
    patterns: [/瑞士/, /switzerland/i, /zurich|geneva|伯恩|蘇黎世|日內瓦|琉森/i],
  },
  {
    key: "italy",
    label: "義大利",
    weight: 115,
    patterns: [/義大利|意大利/, /italy/i, /rome|milan|佛羅倫斯|威尼斯|羅馬|米蘭/i],
  },
  {
    key: "spain",
    label: "西班牙",
    weight: 115,
    patterns: [/西班牙/, /spain/i, /madrid|barcelona|馬德里|巴塞隆納/i],
  },
  {
    key: "turkey",
    label: "土耳其",
    weight: 115,
    patterns: [/土耳其/, /turkey|turkiye|türkiye/i, /istanbul/i],
  },
  {
    key: "europe",
    label: "歐洲",
    weight: 100,
    patterns: [/歐洲|歐美|歐陸/, /europe|\beu\b/i],
  },
  {
    key: "usa",
    label: "美國",
    weight: 100,
    patterns: [/美國|美加|北美/, /united\s?states|\busa\b|\bus\b/i],
  },
  {
    key: "canada",
    label: "加拿大",
    weight: 105,
    patterns: [/加拿大/, /canada/i],
  },
  {
    key: "anz",
    label: "紐澳",
    weight: 125,
    patterns: [/紐澳|澳紐/, /\banz\b/i],
  },
  {
    key: "newzealand",
    label: "紐西蘭",
    weight: 115,
    patterns: [/紐西蘭/, /new\s?zealand/i],
  },
  {
    key: "australia",
    label: "澳洲",
    weight: 100,
    patterns: [/澳洲/, /australia/i],
  },
  {
    key: "global",
    label: "全球",
    weight: 60,
    patterns: [/全球|世界|國際漫遊/, /global|worldwide|world/i],
  },
];

const DEF_ORDER = new Map(
  PARTNER_COUNTRY_DEFS.map((d, i) => [d.key, i]),
);

/** 智慧選品／目的地大區篩選 */
export const PARTNER_REGION_DEFS = [
  { id: "all", label: "全部地區" },
  { id: "southeast_asia", label: "東南亞" },
  { id: "asia", label: "亞洲" },
  { id: "europe", label: "歐洲" },
  { id: "americas", label: "美洲" },
];

const COUNTRY_TO_REGION = {
  thailand: "southeast_asia",
  vietnam: "southeast_asia",
  singapore: "southeast_asia",
  malaysia: "southeast_asia",
  philippines: "southeast_asia",
  indonesia: "southeast_asia",
  southeast_asia: "southeast_asia",
  japan: "asia",
  korea: "asia",
  hongkong: "asia",
  taiwan: "asia",
  china: "asia",
  asia: "asia",
  australia: "asia",
  newzealand: "asia",
  anz: "asia",
  france: "europe",
  uk: "europe",
  austria: "europe",
  switzerland: "europe",
  italy: "europe",
  spain: "europe",
  turkey: "europe",
  europe: "europe",
  usa: "americas",
  canada: "americas",
};

export function getCountryRegionKey(countryKey) {
  return COUNTRY_TO_REGION[countryKey] || null;
}

export function filterCountryGroupsByRegion(groups = [], regionId = "all") {
  if (!regionId || regionId === "all") return groups;
  return groups.filter((g) => getCountryRegionKey(g.key) === regionId);
}

function categoryTextFromProduct(product) {
  const { categories, category } = product || {};
  if (Array.isArray(categories) && categories.length) {
    return categories
      .map((c) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object") {
          return [c.name, c.handle, c.title].filter(Boolean).join(" ");
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return category || "";
}

/**
 * @param {string} [text]
 * @returns {{ key: string, label: string } | null}
 */
export function inferCountryFromText(text = "") {
  const raw = String(text || "");
  if (!raw.trim()) return null;

  let best = null;
  let bestScore = -1;

  for (const def of PARTNER_COUNTRY_DEFS) {
    for (const re of def.patterns) {
      const m = raw.match(re);
      if (!m) continue;
      // 權重 + 匹配字串長度（越具體越高）
      const score = (def.weight || 0) + String(m[0] || "").length * 2;
      if (score > bestScore) {
        bestScore = score;
        best = { key: def.key, label: def.label };
      }
    }
  }

  return best;
}

/**
 * @param {{
 *   name?: string,
 *   handle?: string,
 *   description?: string,
 *   tags?: string[]|string,
 *   category?: string,
 *   categories?: string[],
 *   country?: string,
 *   region?: string,
 * }} product
 */
export function inferProductCountry(product) {
  const tagText = Array.isArray(product?.tags)
    ? product.tags.join(" ")
    : product?.tags || "";
  const catText = categoryTextFromProduct(product);
  const parts = [
    product?.name,
    product?.handle,
    product?.description,
    product?.country,
    product?.region,
    tagText,
    catText,
  ]
    .filter(Boolean)
    .join(" ");
  return inferCountryFromText(parts);
}

/**
 * 依目的地 key 篩選商品（與選品管理 inferProductCountry 一致）
 */
export function productMatchesCountryKeys(product, countryKeys = []) {
  if (!countryKeys?.length) return true;
  const inferred = inferProductCountry(product);
  const key = inferred?.key || "other";
  return countryKeys.includes(key);
}

/**
 * 由商品池統計可選目的地（智慧開店 wizard 用）
 */
export function buildCountryGroupsFromProducts(products = []) {
  const map = new Map();
  for (const p of products) {
    const c = inferProductCountry(p) || { key: "other", label: "其他" };
    const prev = map.get(c.key);
    map.set(c.key, {
      key: c.key,
      label: c.label,
      count: (prev?.count || 0) + 1,
    });
  }
  const items = Array.from(map.values());
  items.sort((a, b) => {
    const ao = DEF_ORDER.has(a.key)
      ? DEF_ORDER.get(a.key)
      : a.key === "other"
        ? 9999
        : 500;
    const bo = DEF_ORDER.has(b.key)
      ? DEF_ORDER.get(b.key)
      : b.key === "other"
        ? 9999
        : 500;
    return ao - bo || b.count - a.count;
  });
  return items;
}

/**
 * 依夥伴目前可售商品建立 Navbar 國家項目
 * @param {Array<{ id?: string|number, name?: string, handle?: string, description?: string, countryKey?: string, countryLabel?: string }>} products
 * @param {string} domain
 */
export function buildPartnerCountryNavItems(products = [], domain) {
  const base = `/p/${String(domain || "").trim()}`;
  const byKey = new Map();

  for (const p of products) {
    let guessed = null;
    if (p?.countryKey) {
      const known = PARTNER_COUNTRY_DEFS.find((d) => d.key === p.countryKey);
      guessed = {
        key: p.countryKey,
        label: p.countryLabel || known?.label || p.countryKey,
      };
    } else {
      guessed = inferProductCountry(p);
    }
    if (!guessed) {
      guessed = { key: "other", label: "其他方案" };
    }

    if (!byKey.has(guessed.key)) {
      byKey.set(guessed.key, {
        key: guessed.key,
        label: guessed.label,
        products: [],
      });
    }
    byKey.get(guessed.key).products.push(p);
  }

  const items = Array.from(byKey.values()).map((group) => ({
    key: group.key,
    label: group.label,
    href: `${base}/c/${encodeURIComponent(group.key)}/`,
    count: group.products.length,
  }));

  items.sort((a, b) => {
    const ao = DEF_ORDER.has(a.key)
      ? DEF_ORDER.get(a.key)
      : a.key === "other"
        ? 999
        : 500;
    const bo = DEF_ORDER.has(b.key)
      ? DEF_ORDER.get(b.key)
      : b.key === "other"
        ? 999
        : 500;
    if (ao !== bo) return ao - bo;
    return (b.count || 0) - (a.count || 0);
  });

  return items;
}

/**
 * 依夥伴 CMS 自訂順序排列國家分類（未列出的項目維持原順序接在後方）
 */
export function applyPartnerCountryNavOrder(items = [], orderKeys = []) {
  const keys = (Array.isArray(orderKeys) ? orderKeys : [])
    .map((k) => String(k || "").trim())
    .filter(Boolean);
  if (!keys.length || !items.length) return items;

  const byKey = new Map(items.map((item) => [item.key, item]));
  const ordered = [];
  const seen = new Set();

  for (const key of keys) {
    const item = byKey.get(key);
    if (item && !seen.has(key)) {
      ordered.push(item);
      seen.add(key);
    }
  }

  for (const item of items) {
    if (!seen.has(item.key)) ordered.push(item);
  }

  return ordered;
}

/**
 * 建立夥伴賣場國家 nav，並套用 homepage CMS 分類順序
 */
export function buildPartnerCountryNavForStore(store, products = []) {
  const items = buildPartnerCountryNavItems(products, store?.domain);
  const cms = mergeHomepageCms(store, store?.homepage_cms);
  return applyPartnerCountryNavOrder(items, cms.plans?.category_order);
}

/**
 * 給首頁／分類頁篩選用
 */
export function filterProductsByCountry(products = [], countryKey) {
  if (!countryKey) return products;
  return products.filter((p) => {
    const c =
      p.countryKey ||
      inferProductCountry(p)?.key ||
      "other";
    return c === countryKey;
  });
}
