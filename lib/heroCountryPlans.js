/** Hero 區塊：國家 eSIM 方案（假資料 + 後台 Medusa 合併） */

import { parseHotSaleTelecoms } from "@/lib/productHotSale";
import { PARTNER_COUNTRY_DEFS } from "@/lib/partnerNavCountries";

export const MOCK_COUNTRIES = [
  {
    id: "mock-japan",
    name: "日本",
    handle: "japan",
    plans: [
      {
        id: "mock-jp-1",
        name: "日本 5日 10GB",
        data: "10GB",
        days: "5日",
        price: 399,
        slug: "japan-5d-10gb",
        categoryHandle: "japan",
        href: "/product/japan",
      },
      {
        id: "mock-jp-2",
        name: "日本 7日 20GB",
        data: "20GB",
        days: "7日",
        price: 599,
        slug: "japan-7d-20gb",
        categoryHandle: "japan",
        href: "/product/japan",
      },
      {
        id: "mock-jp-3",
        name: "日本 15日 無限量",
        data: "無限量",
        days: "15日",
        price: 899,
        slug: "japan-15d-unlimited",
        categoryHandle: "japan",
        href: "/product/japan",
      },
    ],
  },
  {
    id: "mock-korea",
    name: "韓國",
    handle: "korea",
    plans: [
      {
        id: "mock-kr-1",
        name: "韓國 5日 8GB",
        data: "8GB",
        days: "5日",
        price: 349,
        slug: "korea-5d-8gb",
        categoryHandle: "korea",
        href: "/product/korea",
      },
      {
        id: "mock-kr-2",
        name: "韓國 10日 15GB",
        data: "15GB",
        days: "10日",
        price: 549,
        slug: "korea-10d-15gb",
        categoryHandle: "korea",
        href: "/product/korea",
      },
    ],
  },
  {
    id: "mock-thailand",
    name: "泰國",
    handle: "thailand",
    plans: [
      {
        id: "mock-th-1",
        name: "泰國 5日 10GB",
        data: "10GB",
        days: "5日",
        price: 299,
        slug: "thailand-5d-10gb",
        categoryHandle: "thailand",
        href: "/product/thailand",
      },
      {
        id: "mock-th-2",
        name: "泰國 8日 20GB",
        data: "20GB",
        days: "8日",
        price: 449,
        slug: "thailand-8d-20gb",
        categoryHandle: "thailand",
        href: "/product/thailand",
      },
    ],
  },
  {
    id: "mock-singapore",
    name: "新加坡",
    handle: "singapore",
    plans: [
      {
        id: "mock-sg-1",
        name: "新加坡 5日 10GB",
        data: "10GB",
        days: "5日",
        price: 329,
        slug: "singapore-5d-10gb",
        categoryHandle: "singapore",
        href: "/product/singapore",
      },
    ],
  },
  {
    id: "mock-usa",
    name: "美國",
    handle: "usa",
    plans: [
      {
        id: "mock-us-1",
        name: "美國 7日 10GB",
        data: "10GB",
        days: "7日",
        price: 499,
        slug: "usa-7d-10gb",
        categoryHandle: "usa",
        href: "/product/usa",
      },
      {
        id: "mock-us-2",
        name: "美國 15日 25GB",
        data: "25GB",
        days: "15日",
        price: 799,
        slug: "usa-15d-25gb",
        categoryHandle: "usa",
        href: "/product/usa",
      },
    ],
  },
];

function formatMedusaProduct(product, categoryHandle) {
  const variant = product.variants?.[0];
  let price = 0;
  if (variant?.calculated_price?.calculated_amount != null) {
    price = variant.calculated_price.calculated_amount;
  } else if (variant?.prices?.[0]?.amount != null) {
    price = variant.prices[0].amount;
  }

  const meta = product.metadata || {};
  const data =
    meta.data_amount || meta.data || product.subtitle || "eSIM 方案";
  const days = meta.valid_days || meta.days || "";
  const hotSaleTelecoms = parseHotSaleTelecoms(meta.hot_sale_telecoms);
  const isHotSale =
    meta.hot_sale === true ||
    meta.hot_sale === "true" ||
    hotSaleTelecoms.length > 0;

  return {
    id: product.id,
    name: product.title,
    data: String(data),
    days: days ? String(days) : "",
    price: Math.round(Number(price) || 0),
    slug: product.handle,
    categoryHandle,
    href: `/product/${categoryHandle}/${product.handle}`,
    isReal: true,
    isHotSale,
  };
}

/** 依訂單彙總取得方案購買次數（handle 優先，名稱次之） */
export function getPlanPurchaseCount(plan, ranks) {
  if (!ranks || !plan) return 0;
  const byHandle = ranks.byHandle || {};
  const byName = ranks.byName || {};
  const slug = String(plan.slug || "")
    .trim()
    .toLowerCase();
  const name = String(plan.name || "")
    .trim()
    .toLowerCase();
  if (slug && byHandle[slug]) return byHandle[slug];
  if (name && byName[name]) return byName[name];
  return 0;
}

/**
 * 方案排序：最多人購買優先；尚無購買（或同次數）時 Hot Sale 優先
 */
export function sortPlansByPopularity(plans = [], ranks = null) {
  return [...plans]
    .map((p) => ({
      ...p,
      purchaseCount: getPlanPurchaseCount(p, ranks),
    }))
    .sort((a, b) => {
      if (b.purchaseCount !== a.purchaseCount) {
        return b.purchaseCount - a.purchaseCount;
      }
      const hotA = a.isHotSale ? 1 : 0;
      const hotB = b.isHotSale ? 1 : 0;
      if (hotB !== hotA) return hotB - hotA;
      return (a.price || 0) - (b.price || 0);
    });
}

function defaultPlansForCategory(name, handle) {
  return [
    {
      id: `default-${handle}-1`,
      name: `${name} 5日 10GB`,
      data: "10GB",
      days: "5日",
      price: 399,
      slug: `${handle}-5d`,
      categoryHandle: handle,
      href: `/product/${handle}`,
    },
    {
      id: `default-${handle}-2`,
      name: `${name} 7日 20GB`,
      data: "20GB",
      days: "7日",
      price: 599,
      slug: `${handle}-7d`,
      categoryHandle: handle,
      href: `/product/${handle}`,
    },
  ];
}

/**
 * 合併 Medusa 分類/商品與假資料
 * @param {Array} categories - Medusa product_categories
 * @param {Array} products - Medusa products
 * @param {{ byHandle?: Record<string, number>, byName?: Record<string, number> } | null} ranks - 購買次數
 */
export function buildHeroCountries(
  categories = [],
  products = [],
  ranks = null,
) {
  const mockByHandle = new Map(MOCK_COUNTRIES.map((c) => [c.handle, c]));
  const result = [];
  const seenHandles = new Set();

  const productsByCategoryId = new Map();
  products.forEach((product) => {
    (product.categories || []).forEach((cat) => {
      const list = productsByCategoryId.get(cat.id) || [];
      list.push(formatMedusaProduct(product, cat.handle || cat.id));
      productsByCategoryId.set(cat.id, list);
    });
  });

  categories.forEach((cat) => {
    const handle = cat.handle || cat.id;
    seenHandles.add(handle);
    const mock = mockByHandle.get(handle);
    const apiPlans = productsByCategoryId.get(cat.id) || [];
    const rawPlans =
      apiPlans.length > 0
        ? apiPlans
        : mock?.plans || defaultPlansForCategory(cat.name, handle);

    result.push({
      id: cat.id,
      name: cat.name,
      handle,
      rank: cat.rank ?? 9999,
      plans: sortPlansByPopularity(rawPlans, ranks),
    });
  });

  MOCK_COUNTRIES.forEach((mock) => {
    if (seenHandles.has(mock.handle)) return;
    seenHandles.add(mock.handle);
    result.push({
      ...mock,
      plans: sortPlansByPopularity(mock.plans || [], ranks),
    });
  });

  return result.sort((a, b) => {
    const rankDiff = (a.rank ?? 9999) - (b.rank ?? 9999);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name, "zh-TW");
  });
}

/** 城市／英文別名（handle → 關鍵字） */
const CITY_ALIASES = {
  japan: ["東京", "大阪", "沖繩", "北海道", "京都", "名古屋", "福岡", "tokyo", "osaka"],
  korea: ["首爾", "釜山", "濟州", "南韓", "seoul", "busan"],
  thailand: ["曼谷", "清邁", "普吉", "bangkok", "chiang mai", "phuket"],
  vietnam: ["河內", "胡志明", "峴港", "hanoi", "saigon"],
  singapore: ["新加坡", "sg"],
  malaysia: ["吉隆坡", "檳城", "kl", "kuala lumpur"],
  hongkong: ["香港", "澳門", "港澳", "hong kong", "macau"],
  china: ["大陸", "內地", "上海", "北京"],
  taiwan: ["台灣", "臺灣", "台北"],
  usa: ["美國", "紐約", "洛杉磯", "加州", "夏威夷", "new york", "la"],
  canada: ["溫哥華", "多倫多", "vancouver", "toronto"],
  france: ["巴黎", "里昂", "尼斯", "paris"],
  austria: ["維也納", "薩爾斯堡", "vienna", "salzburg", "innsbruck"],
  switzerland: ["蘇黎世", "日內瓦", "伯恩", "琉森", "因特拉肯", "zurich", "geneva", "bern", "lucerne"],
  italy: ["羅馬", "米蘭", "佛羅倫斯", "威尼斯", "rome", "milan", "florence", "venice"],
  spain: ["馬德里", "巴塞隆納", "塞維亞", "madrid", "barcelona", "seville"],
  uk: ["倫敦", "愛丁堡", "曼徹斯特", "london", "edinburgh", "gb"],
  turkey: ["伊斯坦堡", "安塔利亞", "istanbul"],
  australia: ["雪梨", "墨爾本", "布里斯本", "sydney", "melbourne"],
  newzealand: ["奧克蘭", "皇后鎮", "auckland", "queenstown"],
  europe: ["歐洲", "歐包", "eu"],
  anz: ["紐澳", "澳紐"],
  "new-zealand": ["奧克蘭", "皇后鎮", "auckland", "queenstown", "紐西蘭"],
  "united-kingdom": ["倫敦", "愛丁堡", "曼徹斯特", "london", "edinburgh", "gb"],
};

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeHeroQuery(q) {
  return String(q || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function aliasesForCountry(country) {
  const handle = String(country?.handle || "").toLowerCase();
  const name = String(country?.name || "");
  const def = PARTNER_COUNTRY_DEFS.find(
    (d) => d.key === handle || d.label === name,
  );
  return [
    name,
    handle,
    handle.replace(/-/g, " "),
    handle.replace(/-/g, ""),
    def?.label,
    ...(CITY_ALIASES[handle] || []),
  ].filter(Boolean);
}

function expandPlanToken(token) {
  const t = String(token || "").toLowerCase();
  if (/吃到飽|無限|不限流量|unlimited/.test(t)) {
    return ["吃到飽", "無限", "unlimited", "不限"];
  }
  if (/總量|total/.test(t)) return ["總量", "total"];
  if (/每日|每天|daily/.test(t)) return ["每日", "每天", "daily"];
  return [t];
}

function hayHasToken(hay, token) {
  const expanded = expandPlanToken(token);
  return expanded.some((n) => n && hay.includes(n));
}

export function scoreHeroCountry(country, query) {
  const q = normalizeHeroQuery(query);
  if (!q || !country) return 0;

  const aliases = aliasesForCountry(country).map((a) =>
    normalizeHeroQuery(a),
  );
  let score = 0;
  if (aliases.some((a) => a === q)) score = Math.max(score, 100);
  if (aliases.some((a) => a.startsWith(q) || (a.length >= 2 && q.startsWith(a)))) {
    score = Math.max(score, 90);
  }
  if (aliases.some((a) => a.includes(q) || (q.length >= 2 && q.includes(a)))) {
    score = Math.max(score, 75);
  }

  const def = PARTNER_COUNTRY_DEFS.find(
    (d) => d.key === country.handle || d.label === country.name,
  );
  if (def?.patterns?.some((re) => re.test(query) || re.test(q))) {
    score = Math.max(score, 70);
  }

  const planHay = normalizeHeroQuery(
    (country.plans || [])
      .map((p) => [p.name, p.data, p.days].filter(Boolean).join(" "))
      .join(" "),
  );
  if (q.length >= 2 && planHay.includes(q)) score = Math.max(score, 25);
  return score;
}

/** 精選國家卡／導覽列：依國家名、handle、城市別名過濾 */
export function filterCountriesByQuery(
  countries = [],
  query,
  handleKey = "handle",
) {
  const q = normalizeHeroQuery(query);
  if (!q) return countries;
  return countries
    .map((c) => ({
      ...c,
      score: scoreHeroCountry(
        {
          handle: c[handleKey] || c.handle || c.slug || "",
          name: c.name,
        },
        query,
      ),
    }))
    .filter((c) => c.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        String(a.name).localeCompare(b.name, "zh-TW"),
    );
}

export function rankHeroCountries(countries = [], query) {
  const q = normalizeHeroQuery(query);
  if (!q) {
    return countries.map((c) => ({ ...c, score: 0 }));
  }
  return countries
    .map((c) => ({ ...c, score: scoreHeroCountry(c, query) }))
    .filter((c) => c.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        String(a.name).localeCompare(b.name, "zh-TW"),
    );
}

function planMatchesTokens(plan, countryName, tokens) {
  if (!tokens.length) return true;
  const hay = normalizeHeroQuery(
    [countryName, plan.name, plan.data, plan.days, plan.slug]
      .filter(Boolean)
      .join(" "),
  );
  return tokens.every((tok) => hayHasToken(hay, tok));
}

function stripCountryAliases(query, country) {
  let rest = normalizeHeroQuery(query);
  const aliases = aliasesForCountry(country)
    .map((a) => normalizeHeroQuery(a))
    .filter((a) => a.length >= 2)
    .sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    rest = rest
      .replace(new RegExp(escapeRegExp(alias), "gi"), " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return rest;
}

const COUNTRY_MATCH_THRESHOLD = 50;

/**
 * 即時搜尋：國家名／城市／方案關鍵字 → 對應方案
 */
export function searchHeroCountryPlans(
  countries = [],
  selectedHandle,
  query,
) {
  const selected =
    countries.find((c) => c.handle === selectedHandle) || countries[0];
  const q = normalizeHeroQuery(query);

  if (!q) {
    return {
      countries: countries,
      suggestedHandle: selected?.handle || "",
      plans: (selected?.plans || []).map((p) => ({
        ...p,
        countryName: selected?.name,
        countryHandle: selected?.handle,
      })),
      crossCountry: false,
    };
  }

  const ranked = rankHeroCountries(countries, query);
  const best = ranked[0];
  const useCountry =
    best && best.score >= COUNTRY_MATCH_THRESHOLD ? best : selected;

  const rest = stripCountryAliases(query, useCountry);
  const tokens = rest ? rest.split(/\s+/).filter(Boolean) : [];

  let plans = (useCountry?.plans || [])
    .filter((p) => planMatchesTokens(p, useCountry?.name, tokens))
    .map((p) => ({
      ...p,
      countryName: useCountry?.name,
      countryHandle: useCountry?.handle,
    }));

  let crossCountry = false;
  if (plans.length === 0) {
    const allTokens = q.split(/\s+/).filter(Boolean);
    plans = countries.flatMap((c) =>
      (c.plans || [])
        .filter((p) => planMatchesTokens(p, c.name, allTokens))
        .map((p) => ({
          ...p,
          countryName: c.name,
          countryHandle: c.handle,
        })),
    );
    const handles = new Set(plans.map((p) => p.countryHandle));
    crossCountry = handles.size > 1;
  }

  return {
    countries: ranked,
    suggestedHandle: useCountry?.handle || selected?.handle || "",
    plans,
    crossCountry,
  };
}
