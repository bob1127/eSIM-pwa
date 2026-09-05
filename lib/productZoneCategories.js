/**
 * 首頁連線方案／商店頁共用：留學生、出差辦公專區
 * 各國分開顯示；長天數商品內以「電信商」選項整合每日／總量／吃到飽。
 */

/**
 * @typedef {{
 *   code: string,
 *   name: string,
 *   slug: string,
 *   desc: string,
 *   hotSale?: boolean,
 *   href?: string | null,
 * }} ZoneCountry
 *
 * href: 字串＝指定商品／分類；null＝暫不開放連結；省略＝預設 /product/{slug}
 */

/** 留學生：美澳日＋英加＋韓星（去重後 7 國） */
export const STUDENT_ZONE_COUNTRIES = /** @type {ZoneCountry[]} */ ([
  {
    code: "US",
    name: "美國",
    slug: "usa",
    desc: "台生人數最多的留學目的地。適合學期長期上網、宿舍／校外熱點與日常課程使用。",
    hotSale: true,
    // 美國原生卡長天數吃到飽（31–88 天）
    href: "/product/usa/usa-native-unlimited-longterm-esim/",
  },
  {
    code: "AU",
    name: "澳洲",
    slug: "australia",
    desc: "台生熱門留學國。適合學期生活、打工度假與城市間移動上網。",
    hotSale: true,
    href: "/product/australia/australia-student-longterm-esim/",
  },
  {
    code: "JP",
    name: "日本",
    slug: "japan",
    desc: "距離近、申請多的留學首選之一。適合語言學校、大學生活與日常導航／通訊。",
    hotSale: true,
    href: "/product/japan/japan-student-longterm-esim/",
  },
  {
    code: "GB",
    name: "英國",
    slug: "uk",
    desc: "英美體系熱門留學國。適合倫敦、愛丁堡等城市學期與生活上網。",
    href: "/product/uk/uk-student-longterm-esim/",
  },
  {
    code: "CA",
    name: "加拿大",
    slug: "canada",
    desc: "北美熱門留學選擇。適合溫哥華、多倫多等城市長期就學與日常生活。",
    href: "/product/canada/canada-student-longterm-esim/",
  },
  {
    code: "KR",
    name: "韓國",
    slug: "korea",
    desc: "近年台生成長快速的留學目的地。適合語言學校、大學課程與日常 App 使用。",
    href: "/product/korea/korea-student-longterm-esim/",
  },
  {
    code: "SG",
    name: "新加坡",
    slug: "singapore",
    desc: "亞洲新興留學熱點。適合市區就學、校園生活與區域往返通訊。",
    href: "/product/singapore/singapore-student-longterm-esim/",
  },
]);

/** 出差辦公：日中韓＋港越星泰馬美 */
export const BUSINESS_ZONE_COUNTRIES = /** @type {ZoneCountry[]} */ ([
  {
    code: "JP",
    name: "日本",
    slug: "japan",
    desc: "台商／出差最高頻目的地之一。適合會議、拜訪客戶與熱點分享筆電。",
    hotSale: true,
    href: "/product/japan/japan-student-longterm-esim/",
  },
  {
    code: "CN",
    name: "中國",
    slug: "china",
    desc: "台商往返與商務會議常見需求。適合展會、工廠拜訪與城市移動辦公。",
    hotSale: true,
  },
  {
    code: "KR",
    name: "韓國",
    slug: "korea",
    desc: "東北亞商務往來熱點。適合首爾會議、供應鏈拜訪與短天數出差。",
    hotSale: true,
    href: "/product/korea/korea-student-longterm-esim/",
  },
  {
    code: "HK",
    name: "香港",
    slug: "hongkong",
    desc: "金融與區域商務樞紐。適合短天數會議、過境與辦公連線。",
  },
  {
    code: "VN",
    name: "越南",
    slug: "vietnam",
    desc: "製造供應鏈常見出差地。適合工廠、客戶拜訪與熱點辦公。",
  },
  {
    code: "SG",
    name: "新加坡",
    slug: "singapore",
    desc: "東南亞區域總部常見據點。適合會議、過境與短天數辦公。",
    href: "/product/singapore/singapore-student-longterm-esim/",
  },
  {
    code: "TH",
    name: "泰國",
    slug: "thailand",
    desc: "東南亞商務與展會常見目的地。適合曼谷會議與城市間移動。",
  },
  {
    code: "MY",
    name: "馬來西亞",
    slug: "malaysia",
    desc: "工廠與區域業務常見出差地。適合吉隆坡會議與短天數辦公。",
  },
  {
    code: "US",
    name: "美國",
    slug: "usa",
    desc: "長線商務、研討會與客戶拜訪需求穩定。適合會議與熱點辦公。",
    hotSale: true,
    href: "/product/usa/usa-native-unlimited-longterm-esim/",
  },
]);

export const PRODUCT_ZONE_DEFS = [
  {
    key: "student",
    label: "留學生專區",
    href: "/product/student/",
    pill: "留學",
    countries: STUDENT_ZONE_COUNTRIES,
  },
  {
    key: "business",
    label: "出差辦公專區",
    href: "/product/business/",
    pill: "出差",
    countries: BUSINESS_ZONE_COUNTRIES,
  },
];

/** 專區進商品頁時帶 from=，麵包屑上層才回得到 student／business */
function withZoneFromParam(href, zoneKey) {
  const raw = String(href || "").trim();
  if (!raw || !zoneKey) return raw || null;
  if (/[?&]from=/i.test(raw)) return raw;
  const sep = raw.includes("?") ? "&" : "?";
  return `${raw}${sep}from=${encodeURIComponent(zoneKey)}`;
}

/**
 * @param {ZoneCountry} country
 * @param {"student"|"business"|string} [zoneKey]
 */
export function resolveZoneCountryHref(country, zoneKey) {
  if (!country) return null;
  if (country.href === null) return null;
  let href;
  if (typeof country.href === "string" && country.href.trim()) {
    href = country.href.trim();
  } else {
    href = `/product/${country.slug}/`;
  }
  if (zoneKey === "student" || zoneKey === "business") {
    return withZoneFromParam(href, zoneKey);
  }
  return href;
}

/**
 * 學生／出差長天數商品的麵包屑上層（專區 hub）
 * @param {{ handle?: string, slug?: string, metadata?: Record<string, unknown> }|null|undefined} product
 * @param {Record<string, unknown>|null|undefined} query router.query
 * @returns {{ key: "student"|"business", href: string, label: string }|null}
 */
export function resolveLongtermZoneParent(product, query) {
  if (!product) return null;
  const handle = String(product.handle || product.slug || "").trim();
  const fromRaw = String(
    query?.from || query?.zone || query?.zoneKey || "",
  )
    .trim()
    .toLowerCase();

  const inStudent = STUDENT_ZONE_COUNTRIES.some((c) =>
    String(c.href || "").includes(handle),
  );
  const inBusiness = BUSINESS_ZONE_COUNTRIES.some((c) =>
    String(c.href || "").includes(handle),
  );
  const meta = product.metadata || {};
  const isLongterm =
    meta.student_longterm === true ||
    meta.student_business_zone === true ||
    /student-longterm|longterm-esim/i.test(handle);

  if (!isLongterm && !inStudent && !inBusiness) return null;

  if (fromRaw === "business" || fromRaw === "出差" || fromRaw === "biz") {
    return {
      key: "business",
      href: "/product/business/",
      label: "出差辦公專區",
    };
  }
  if (fromRaw === "student" || fromRaw === "留學" || fromRaw === "study") {
    return {
      key: "student",
      href: "/product/student/",
      label: "留學生專區",
    };
  }

  // 僅出差專區有、留學沒有 → 出差；其餘長天數預設留學
  if (inBusiness && !inStudent) {
    return {
      key: "business",
      href: "/product/business/",
      label: "出差辦公專區",
    };
  }
  if (isLongterm || inStudent) {
    return {
      key: "student",
      href: "/product/student/",
      label: "留學生專區",
    };
  }
  return null;
}

export function zoneCountryToServiceCard(country, pillLabel, zoneKey) {
  const link = resolveZoneCountryHref(country, zoneKey);
  return {
    hotSale: !!country.hotSale,
    pills: [
      { text: country.code, color: "#2E4457" },
      { text: pillLabel, color: "#17806A" },
    ],
    title: country.name,
    desc: country.desc,
    tags: [pillLabel, country.name],
    ...(link ? { link } : {}),
  };
}
