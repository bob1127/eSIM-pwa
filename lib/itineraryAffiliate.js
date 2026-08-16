/**
 * 行程停留點 → 本站手動 Klook／KKday 商品檔
 * 以編輯器必選「地區」為準；標題關鍵字只當加分，不再當唯一依據。
 */
import { KLOOK_TH_TICKETS, KLOOK_TH_TRANSPORT } from "@/data/klook/thailand";
import { KLOOK_KR_TICKETS, KLOOK_KR_TRANSPORT } from "@/data/klook/korea";
import { KLOOK_CN_TICKETS } from "@/data/klook/china";
import { KLOOK_HK_TICKETS } from "@/data/klook/hongkong";
import { KLOOK_JP_TICKETS } from "@/data/klook/jp";
import { klookAff } from "@/data/klook/activities";
import { KKDAY_TICKETS, kkdayAff } from "@/data/kkday/tickets";
import { stripHtml } from "@/lib/stripHtml";
import {
  destinationMeta,
  destinationLabel,
  sanitizeDestinationIds,
} from "@/lib/itineraryDestinations";

export { sanitizeDestinationIds } from "@/lib/itineraryDestinations";

export const AFFILIATE_DESTINATIONS = [
  {
    id: "tokyo",
    label: "東京",
    countryId: "japan",
    re: /東京|淺草|澀谷|新宿|台場|迪士尼|千葉|成田|羽田|橫濱|豐洲|晴空塔|skytree|押上|tokyo|shibuya|asakusa|disney/,
    photo:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=640&q=80",
  },
  {
    id: "osaka",
    label: "大阪／關西",
    countryId: "japan",
    re: /大阪|關西|難波|梅田|神戶|此花|環球影城|haruka|osaka|kansai|kobe|usj/,
    photo:
      "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=640&q=80",
  },
  {
    id: "kyoto",
    label: "京都／奈良",
    countryId: "japan",
    re: /京都|奈良|kyoto|nara|天橋立|勝尾寺|美山|伊根|宇治|伏見|稻荷/,
    photo:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=640&q=80",
  },
  {
    id: "fuji",
    label: "富士山／箱根",
    countryId: "japan",
    re: /富士|山梨|河口湖|箱根|忍野|蘆之湖|大涌谷|熱海|伊豆|御殿場/,
    photo:
      "https://images.unsplash.com/photo-1570459027562-4a4191586b62?w=640&q=80",
  },
  {
    id: "okinawa",
    label: "沖繩",
    countryId: "japan",
    re: /沖繩|那霸|石垣|宮古|okinawa|naha/,
    photo:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=640&q=80",
  },
  {
    id: "hokkaido",
    label: "北海道",
    countryId: "japan",
    re: /北海道|札幌|hokkaido|sapporo/,
    photo:
      "https://images.unsplash.com/photo-1559411953-8c0b2c2c2b0d?w=640&q=80",
  },
  {
    id: "kyushu",
    label: "九州／福岡",
    countryId: "japan",
    re: /福岡|熊本|阿蘇|由布院|湯布院|九州|博多|太宰府|柳川|糸島|高千穂|宮崎|北九州|門司|小倉|海之中道|dazaifu|takachiho|kitakyushu|itoshima|yufuin|fukuoka/,
    photo:
      "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=640&q=80",
  },
  {
    id: "nikko",
    label: "日光",
    countryId: "japan",
    re: /日光|東照宮|華嚴|中禪寺|nikko|tochigi|栃木/,
    photo:
      "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=640&q=80",
  },
  {
    id: "karuizawa",
    label: "輕井澤",
    countryId: "japan",
    re: /輕井澤|karuizawa|白絲瀑布|雲場池/,
    photo:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=640&q=80",
  },
  {
    id: "seoul",
    label: "首爾",
    countryId: "korea",
    re: /首爾|明洞|弘大|江南|仁川|南山|景福|松坡|春川|南怡|龍山|新村|seoul|yongsan|myeongdong/,
    photo:
      "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=640&q=80",
  },
  {
    id: "busan",
    label: "釜山",
    countryId: "korea",
    re: /釜山|西面|busan|seomyeon/,
    photo:
      "https://images.unsplash.com/photo-1548115184-bc6544d06a69?w=640&q=80",
  },
  {
    id: "gangneung",
    label: "江陵",
    countryId: "korea",
    re: /江陵|江原|鏡浦|gangneung|gangwon/,
    photo:
      "https://res.klook.com/klook-hotel/image/upload/w_1160,c_fill,q_85/travelapi/28000000/27440000/27434200/27434198/cb31822f_z.webp",
  },
  {
    id: "sokcho",
    label: "束草",
    countryId: "korea",
    re: /束草|雪嶽|sokcho|seorak/,
    photo:
      "https://i.travelapi.com/lodging/94000000/93320000/93312100/93312008/d7a6eaad_z.jpg?impolicy=resizecrop&rw=1200&ra=fit",
  },
  {
    id: "jeju",
    label: "濟州",
    countryId: "korea",
    re: /濟州|jeju/,
    photo:
      "https://images.unsplash.com/photo-1535189043414-47a2c5bcf0c0?w=640&q=80",
  },
  {
    id: "bangkok",
    label: "曼谷",
    countryId: "thailand",
    re: /曼谷|bangkok|sukhumvit|暹羅|大皇宮/,
    photo:
      "https://i.travelapi.com/lodging/121000000/120390000/120386300/120386201/cd32d638_z.jpg?impolicy=resizecrop&rw=1200&ra=fit",
  },
  {
    id: "phuket",
    label: "普吉",
    countryId: "thailand",
    re: /普吉|皮皮|喀比|phuket|phi\s*phi|krabi/,
    photo:
      "https://res.klook.com/image/upload/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/eiyu5svhwxlip3nikq0v.webp",
  },
  {
    id: "chiangmai",
    label: "清邁",
    countryId: "thailand",
    re: /清邁|尼曼|chiang\s*mai|nimman/,
    photo:
      "https://res.klook.com/klook-hotel/image/upload/w_1160,c_fill,q_85/travelapi/77000000/76670000/76664200/76664152/7bcbca7a_z.webp",
  },
  {
    id: "shanghai",
    label: "上海",
    countryId: "china",
    re: /上海|浦東|旗忠|叙宴|黃浦|外灘|十六鋪|金茂|蟹粉|shanghai/,
    photo:
      "https://image.kkday.com/v2/image/get/c_fill%2Ch_800%2Cq_55%2Ct_webp%2Cw_1240/s1.kkday.com/product_7076/20260708062005_hV1Bc/jpg",
  },
  {
    id: "beijing",
    label: "北京",
    countryId: "china",
    re: /北京|慕田峪|長城|故宮|紫禁城|beijing|mutianyu/,
    photo:
      "https://image.kkday.com/v2/image/get/c_fill%2Ch_800%2Cq_55%2Ct_webp%2Cw_1240/s1.kkday.com/product_161367/20250423015819_tlqeM/jpg",
  },
  {
    id: "guangzhou",
    label: "廣州／深圳",
    countryId: "china",
    re: /廣州|深圳|長隆|番禺|前海|冰雪|珠海|橫琴|東莞|企鵝|chimelong|guangzhou|shenzhen|zhuhai/,
    photo:
      "https://image.kkday.com/v2/image/get/c_fill%2Ch_800%2Cq_55%2Ct_webp%2Cw_1240/s1.kkday.com/product_21350/20260625105526_A8N5P/jpg",
  },
  {
    id: "hangzhou",
    label: "杭州",
    countryId: "china",
    re: /杭州|蘇州|拙政園|寒山寺|山塘|hangzhou|suzhou/,
    photo:
      "https://image.kkday.com/v2/image/get/c_fill%2Ch_800%2Cq_55%2Ct_webp%2Cw_1240/s1.kkday.com/product_8191/20160517040314_4p7ZR/jpg",
  },
  {
    id: "chengdu",
    label: "成都",
    countryId: "china",
    re: /成都|帝盛|寬窄|春熙|chengdu/,
    photo:
      "https://res.klook.com/klook-hotel/image/upload/w_1160,c_fill,q_85/meituan_p1/tdchoteldark/a8fc94549b88e460f47345385d7283b0404215.webp",
  },
  {
    id: "hongkong-city",
    label: "香港",
    countryId: "hongkong",
    re: /香港|維多利亞|尖沙咀|中環|銅鑼灣|灣仔|北角|荃灣|迪士尼|海洋公園|西九|故宮文化|挪亞|樂高探索|山頂|城巴|張保仔|hong\s*kong|disneyland|ocean\s*park/,
    photo:
      "https://image.kkday.com/v2/image/get/c_fill%2Ch_800%2Cq_55%2Ct_webp%2Cw_1240/s1.kkday.com/product_18070/20260507000142_P3cP0/jpg",
  },
  {
    id: "macau",
    label: "澳門",
    countryId: "hongkong",
    re: /澳門|macau|macao|威尼斯人|貢多拉|噴射飛航|turbojet|港珠澳|旅遊塔|新濠影滙|studio\s*city/,
    photo:
      "https://res.klook.com/image/upload/u_activities:kkpayz8f2udhmqu6sv5q,h_1.0,ar_960:460,c_scale,e_blur:10000/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/kkpayz8f2udhmqu6sv5q.webp",
  },
  {
    id: "hanoi",
    label: "河內",
    countryId: "vietnam",
    re: /河內|下龍|hanoi|ha\s*long|halong/,
    photo:
      "https://i.travelapi.com/lodging/58000000/57550000/57549900/57549879/1073bc23_z.jpg?impolicy=resizecrop&rw=1200&ra=fit",
  },
  {
    id: "hcmc",
    label: "胡志明市",
    countryId: "vietnam",
    re: /胡志明|西貢|saigon|ho\s*chi\s*minh|hcmc|meander/,
    photo:
      "https://res.klook.com/klook-hotel/image/upload/w_1160,c_fill,q_85/travelapi/22000000/21690000/21685700/21685664/d4bd99e6_z.webp",
  },
  {
    id: "danang",
    label: "峴港",
    countryId: "vietnam",
    re: /峴港|巴拿|da\s*nang|ba\s*na|soho boutique/,
    photo:
      "https://image.kkday.com/v2/image/get/c_fill%2Ch_800%2Cq_55%2Ct_webp%2Cw_1240/s1.kkday.com/product_37521/20260522123817_fMYSb/png",
  },
  {
    id: "hoian",
    label: "會安",
    countryId: "vietnam",
    re: /會安|hoi\s*an/,
    photo:
      "https://image.kkday.com/v2/image/get/c_fill%2Ch_800%2Cq_55%2Ct_webp%2Cw_1240/s1.kkday.com/product_37521/20260522123817_fMYSb/png",
  },
  {
    id: "phuquoc",
    label: "富國島",
    countryId: "vietnam",
    re: /富國|phu\s*quoc/,
    photo:
      "https://image.kkday.com/v2/image/get/c_fill%2Ch_800%2Cq_55%2Ct_webp%2Cw_1240/s1.kkday.com/product_173303/20240515064834_xIAWc/jpg",
  },
];

export function itineraryDestinationsMissing(props = {}) {
  return sanitizeDestinationIds(props.destinations).length === 0;
}

function destById(id) {
  return AFFILIATE_DESTINATIONS.find((d) => d.id === id) || null;
}

const AFFILIATE_IDS = new Set(AFFILIATE_DESTINATIONS.map((d) => d.id));
const AFFILIATE_BY_COUNTRY = AFFILIATE_DESTINATIONS.reduce((map, d) => {
  if (!map[d.countryId]) map[d.countryId] = [];
  map[d.countryId].push(d.id);
  return map;
}, {});

const CITY_TO_AFFILIATE = {
  nara: "kyoto",
  kobe: "osaka",
  yokohama: "tokyo",
  chiba: "tokyo",
};

function expandAffiliateRegions(selected) {
  const ids = sanitizeDestinationIds(selected);
  const mapped = ids.map((id) => CITY_TO_AFFILIATE[id] || id);
  const out = mapped.filter((id) => AFFILIATE_IDS.has(id));
  const countries = ids.filter((id) => destinationMeta(id)?.kind === "country");
  for (const cid of countries) {
    const hasCity = ids.some((id) => {
      const m = destinationMeta(id);
      return m?.kind === "region" && m.countryId === cid;
    });
    if (hasCity) continue;
    out.push(...(AFFILIATE_BY_COUNTRY[cid] || []));
  }
  for (const id of ids) {
    const label = destinationLabel(id);
    if (!label) continue;
    out.push(...detectRegions(label));
  }
  return [...new Set(out)];
}

function detectRegions(text) {
  const s = String(text || "");
  return AFFILIATE_DESTINATIONS.filter((r) => r.re.test(s)).map((r) => r.id);
}

function normalize(raw, partner) {
  if (!raw?.url || !raw?.title) return null;
  const rawUrl = String(raw.url);
  const url =
    partner === "klook" && !rawUrl.includes("affiliate.klook.com")
      ? klookAff(rawUrl)
      : partner === "kkday"
        ? kkdayAff(rawUrl)
        : rawUrl;
  const images = Array.isArray(raw.images)
    ? raw.images.filter(Boolean)
    : raw.imageUrl
      ? [raw.imageUrl]
      : [];
  const regionIds = detectRegions(
    [raw.regionLabel, raw.title, raw.subtitle, raw.category].filter(Boolean).join(" "),
  ).filter((id) => {
    const country = String(raw.countryId || "").toLowerCase();
    if (!country) return true;
    const dest = destById(id);
    return !dest?.countryId || dest.countryId === country;
  });
  const coverFallback = destById(regionIds[0])?.photo || destById("tokyo")?.photo;
  return {
    id: raw.id,
    partner,
    title: raw.title,
    subtitle: raw.subtitle || raw.regionLabel || "",
    regionLabel: raw.regionLabel || "",
    regionIds,
    countryId: String(raw.countryId || "").toLowerCase(),
    category: raw.category || "",
    priceLabel: raw.priceLabel || "",
    url,
    images,
    coverFallback,
  };
}

function buildCatalog() {
  const list = [];
  for (const t of KLOOK_TH_TICKETS || []) list.push(normalize(t, "klook"));
  for (const t of KLOOK_TH_TRANSPORT || []) list.push(normalize(t, "klook"));
  for (const t of KLOOK_JP_TICKETS || []) list.push(normalize(t, "klook"));
  for (const t of KLOOK_KR_TICKETS || []) list.push(normalize(t, "klook"));
  for (const t of KLOOK_KR_TRANSPORT || []) list.push(normalize(t, "klook"));
  for (const t of KLOOK_CN_TICKETS || []) list.push(normalize(t, "klook"));
  for (const t of KLOOK_HK_TICKETS || []) list.push(normalize(t, "klook"));
  for (const t of KKDAY_TICKETS || []) list.push(normalize(t, "kkday"));
  const map = new Map();
  for (const item of list) {
    if (!item) continue;
    const key = item.id || item.url;
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}

const CATALOG = buildCatalog();

function hay(parts) {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isNationwide(item) {
  return /全日本|全韓國/.test(`${item.regionLabel}${item.title}`);
}

function scoreItem(item, query, regions) {
  if (isNationwide(item)) return 0;
  const own = item.regionIds || [];
  if (!own.some((id) => regions.includes(id))) return 0;
  const blob = hay([item.title, item.subtitle, item.regionLabel]);
  let score = 10;
  for (const id of own) {
    if (regions.includes(id)) score += 24;
  }
  const toks =
    String(query || "").match(/[\u4e00-\u9fff]{2,}|[a-z0-9]{3,}/gi) || [];
  for (const t of toks) {
    const n = t.toLowerCase();
    if (
      n.length < 2 ||
      n === "日本" ||
      n === "韓國" ||
      n === "japan" ||
      n === "korea"
    ) {
      continue;
    }
    if (item.regionLabel.toLowerCase().includes(n)) score += 16;
    if (item.title.toLowerCase().includes(n)) score += 8;
    if (blob.includes(n)) score += 2;
  }
  return score;
}

/**
 * @param {{ destinations?: string[], dayDestinations?: string[], category?: string, title?: string, tags?: string[], stopName?: string, stopMap?: string, stopBody?: string, dayTitle?: string, limit?: number }} ctx
 */
export function matchItineraryAffiliates(ctx = {}) {
  const limit = Math.min(8, Math.max(1, Number(ctx.limit) || 8));
  const forced = expandAffiliateRegions(
    ctx.dayDestinations?.length ? ctx.dayDestinations : ctx.destinations,
  );
  const localText = hay([
    ctx.stopName,
    ctx.stopMap,
    stripHtml(ctx.stopBody || ""),
    ctx.dayTitle,
  ]);
  const articleText = hay([
    ctx.category,
    ctx.title,
    ...(Array.isArray(ctx.tags) ? ctx.tags : []),
  ]);
  const query = hay([articleText, localText]);
  const regions = forced.length
    ? forced
    : detectRegions(hay([articleText, localText]));
  if (!regions.length) return [];

  const scored = CATALOG.map((item) => ({
    item,
    score: scoreItem(item, query, regions),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked = [];
  const used = new Set();
  for (const row of scored) {
    const key = row.item.id || row.item.url;
    if (used.has(key)) continue;
    used.add(key);
    picked.push(row.item);
    if (picked.length >= limit) break;
  }

  const mixed = [];
  const klook = picked.filter((p) => p.partner === "klook");
  const kkday = picked.filter((p) => p.partner === "kkday");
  const n = Math.max(klook.length, kkday.length);
  for (let i = 0; i < n; i += 1) {
    if (klook[i]) mixed.push(klook[i]);
    if (kkday[i]) mixed.push(kkday[i]);
  }
  return mixed.slice(0, limit);
}
