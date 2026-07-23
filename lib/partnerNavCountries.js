/**
 * 夥伴賣場 Navbar：由上架方案推斷國家項目
 */

export const PARTNER_COUNTRY_DEFS = [
  { key: "japan", label: "日本", patterns: [/日本/, /japan/i, /\bjp\b/i] },
  { key: "korea", label: "韓國", patterns: [/韓國|南韓/, /korea/i, /\bkr\b/i] },
  { key: "china", label: "中國", patterns: [/中國|大陸/, /china/i, /\bcn\b/i] },
  { key: "hongkong", label: "港澳", patterns: [/港澳|香港|澳門/, /hong\s?kong/i, /macau/i] },
  {
    key: "taiwan",
    label: "台灣",
    patterns: [/台灣|臺灣/, /taiwan/i, /\btw\b/i],
  },
  {
    key: "thailand",
    label: "泰國",
    patterns: [/泰國/, /thailand/i, /\bth\b/i],
  },
  {
    key: "vietnam",
    label: "越南",
    patterns: [/越南/, /vietnam/i, /\bvn\b/i],
  },
  {
    key: "singapore",
    label: "新加坡",
    patterns: [/新加坡/, /singapore/i, /\bsg\b/i],
  },
  {
    key: "malaysia",
    label: "馬來西亞",
    patterns: [/馬來西亞|馬來/, /malaysia/i, /\bmy\b/i],
  },
  {
    key: "philippines",
    label: "菲律賓",
    patterns: [/菲律賓/, /philippines?/i, /\bph\b/i],
  },
  {
    key: "indonesia",
    label: "印尼",
    patterns: [/印尼|印尼尼西亞/, /indonesia/i, /\bid\b/i],
  },
  { key: "asia", label: "亞洲", patterns: [/亞洲|多國/, /asia/i] },
  {
    key: "europe",
    label: "歐洲",
    patterns: [/歐洲|歐美/, /europe/i, /eu\b/i],
  },
  {
    key: "usa",
    label: "美國",
    patterns: [/美國|美加/, /united\s?states|\busa\b|\bus\b/i],
  },
  {
    key: "australia",
    label: "澳紐",
    patterns: [/澳洲|紐西蘭|澳紐/, /australia|new\s?zealand/i],
  },
  { key: "global", label: "全球", patterns: [/全球|世界/, /global|worldwide/i] },
];

/**
 * @param {string} [text]
 * @returns {{ key: string, label: string } | null}
 */
export function inferCountryFromText(text = "") {
  const raw = String(text || "");
  if (!raw.trim()) return null;
  for (const def of PARTNER_COUNTRY_DEFS) {
    if (def.patterns.some((re) => re.test(raw))) {
      return { key: def.key, label: def.label };
    }
  }
  return null;
}

/**
 * @param {{ name?: string, handle?: string, description?: string }} product
 */
export function inferProductCountry(product) {
  const parts = [product?.name, product?.handle, product?.description]
    .filter(Boolean)
    .join(" ");
  return inferCountryFromText(parts);
}

/**
 * 依夥伴上架商品建立 Navbar 國家項目（去重，保留出現順序）
 * @param {Array<{ id?: string|number, name?: string, handle?: string, description?: string, countryKey?: string, countryLabel?: string }>} products
 * @param {string} domain
 */
export function buildPartnerCountryNavItems(products = [], domain) {
  const base = `/p/${domain}`;
  const order = [];
  const byKey = new Map();

  for (const p of products) {
    const guessed =
      p.countryKey && p.countryLabel
        ? { key: p.countryKey, label: p.countryLabel }
        : inferProductCountry(p) || { key: "other", label: "其他方案" };

    if (!byKey.has(guessed.key)) {
      byKey.set(guessed.key, {
        key: guessed.key,
        label: guessed.label,
        products: [],
      });
      order.push(guessed.key);
    }
    byKey.get(guessed.key).products.push(p);
  }

  return order.map((key) => {
    const group = byKey.get(key);
    return {
      key,
      label: group.label,
      href: `${base}/c/${encodeURIComponent(key)}/`,
      count: group.products.length,
    };
  });
}

/**
 * 給首頁篩選用
 */
export function filterProductsByCountry(products = [], countryKey) {
  if (!countryKey) return products;
  return products.filter((p) => {
    const c =
      p.countryKey ||
      inferProductCountry(p)?.key ||
      null;
    return c === countryKey;
  });
}
