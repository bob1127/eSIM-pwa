/**
 * 行程地區：國家 → 城市／地區（旅遊常用，可複選）
 * id 全域唯一；國家本體用國碼，城市用短碼。
 */

function C(id, label, regions) {
  return { id, label, regions };
}

function R(id, label, aliases = []) {
  return { id, label, aliases };
}

export const ITINERARY_COUNTRIES = [
  C("japan", "日本", [
    R("tokyo", "東京", ["淺草", "澀谷", "新宿"]),
    R("yokohama", "橫濱／神奈川"),
    R("chiba", "千葉／迪士尼"),
    R("fuji", "富士山／箱根"),
    R("osaka", "大阪"),
    R("kobe", "神戶"),
    R("kyoto", "京都"),
    R("nara", "奈良"),
    R("nagoya", "名古屋／中部"),
    R("hokuriku", "金澤／北陸"),
    R("hiroshima", "廣島"),
    R("tohoku", "仙台／東北"),
    R("hokkaido", "北海道"),
    R("kyushu", "九州／福岡"),
    R("okinawa", "沖繩"),
    R("shikoku", "四國"),
  ]),
  C("korea", "韓國", [
    R("seoul", "首爾"),
    R("busan", "釜山"),
    R("jeju", "濟州"),
    R("gyeongju", "慶州"),
    R("gangwon", "江原道"),
  ]),
  C("taiwan", "台灣", [
    R("taipei", "台北"),
    R("taichung", "台中"),
    R("tainan", "台南"),
    R("kaohsiung", "高雄"),
    R("hualien", "花東"),
  ]),
  C("hongkong", "港澳", [R("hongkong-city", "香港"), R("macau", "澳門")]),
  C("china", "中國", [
    R("beijing", "北京"),
    R("shanghai", "上海"),
    R("chengdu", "成都"),
    R("xian", "西安"),
    R("guangzhou", "廣州／深圳"),
    R("hangzhou", "杭州"),
    R("chongqing", "重慶"),
  ]),
  C("thailand", "泰國", [
    R("bangkok", "曼谷"),
    R("chiangmai", "清邁"),
    R("phuket", "普吉"),
    R("pattaya", "芭達雅"),
    R("samui", "蘇梅"),
  ]),
  C("vietnam", "越南", [
    R("hanoi", "河內"),
    R("hcmc", "胡志明市"),
    R("danang", "峴港"),
    R("hoian", "會安"),
    R("dalat", "大叻"),
    R("phuquoc", "富國島"),
  ]),
  C("singapore", "新加坡", []),
  C("malaysia", "馬來西亞", [
    R("kl", "吉隆坡"),
    R("penang", "檳城"),
    R("malacca", "馬六甲"),
    R("sabah", "沙巴"),
    R("langkawi", "蘭卡威"),
  ]),
  C("philippines", "菲律賓", [
    R("manila", "馬尼拉"),
    R("cebu", "宿霧"),
    R("boracay", "長灘島"),
    R("palawan", "巴拉旺"),
  ]),
  C("indonesia", "印尼", [
    R("bali", "峇里島"),
    R("jakarta", "雅加達"),
    R("yogyakarta", "日惹"),
  ]),
  C("usa", "美國", [
    R("nyc", "紐約"),
    R("la", "洛杉磯"),
    R("sf", "舊金山"),
    R("vegas", "拉斯維加斯"),
    R("hawaii", "夏威夷"),
  ]),
  C("canada", "加拿大", [R("vancouver", "溫哥華"), R("toronto", "多倫多")]),
  C("australia", "澳洲", [
    R("sydney", "雪梨"),
    R("melbourne", "墨爾本"),
    R("goldcoast", "黃金海岸"),
  ]),
  C("newzealand", "紐西蘭", [
    R("auckland", "奧克蘭"),
    R("queenstown", "皇后鎮"),
  ]),
  C("uk", "英國", [R("london", "倫敦"), R("edinburgh", "愛丁堡")]),
  C("france", "法國", [R("paris", "巴黎"), R("nice", "尼斯")]),
  C("italy", "義大利", [
    R("rome", "羅馬"),
    R("milan", "米蘭"),
    R("venice", "威尼斯"),
    R("florence", "佛羅倫斯"),
  ]),
  C("spain", "西班牙", [R("barcelona", "巴塞隆納"), R("madrid", "馬德里")]),
  C("germany", "德國", [R("berlin", "柏林"), R("munich", "慕尼黑")]),
  C("netherlands", "荷蘭", [R("amsterdam", "阿姆斯特丹")]),
  C("switzerland", "瑞士", [
    R("zurich", "蘇黎世"),
    R("interlaken", "因特拉肯"),
  ]),
  C("austria", "奧地利", [R("vienna", "維也納")]),
  C("czech", "捷克", [R("prague", "布拉格")]),
  C("greece", "希臘", [R("athens", "雅典"), R("santorini", "聖托里尼")]),
  C("turkey", "土耳其", [
    R("istanbul", "伊斯坦堡"),
    R("cappadocia", "卡帕多奇亞"),
  ]),
  C("uae", "阿拉伯聯合大公國", [R("dubai", "杜拜"), R("abudhabi", "阿布達比")]),
];

/** 其餘國家（可搜尋選全國；熱門旅遊國已在上方含城市） */
const WORLD_COUNTRIES = [
  ["iceland", "冰島"],
  ["ireland", "愛爾蘭"],
  ["andorra", "安道爾"],
  ["albania", "阿爾巴尼亞"],
  ["algeria", "阿爾及利亞"],
  ["afghanistan", "阿富汗"],
  ["argentina", "阿根廷"],
  ["oman", "阿曼"],
  ["azerbaijan", "亞塞拜然"],
  ["egypt", "埃及"],
  ["ethiopia", "衣索比亞"],
  ["estonia", "愛沙尼亞"],
  ["paraguay", "巴拉圭"],
  ["bahrain", "巴林"],
  ["panama", "巴拿馬"],
  ["brazil", "巴西"],
  ["belarus", "白俄羅斯"],
  ["bermuda", "百慕達"],
  ["bulgaria", "保加利亞"],
  ["northmacedonia", "北馬其頓"],
  ["benin", "貝南"],
  ["belgium", "比利時"],
  ["bolivia", "玻利維亞"],
  ["belize", "貝里斯"],
  ["botswana", "波札那"],
  ["bhutan", "不丹"],
  ["burkina", "布吉納法索"],
  ["burundi", "蒲隆地"],
  ["portugal", "葡萄牙"],
  ["denmark", "丹麥"],
  ["dominican", "多明尼加"],
  ["dominica", "多米尼克"],
  ["ecuador", "厄瓜多"],
  ["russia", "俄羅斯"],
  ["finland", "芬蘭"],
  ["fiji", "斐濟"],
  ["colombia", "哥倫比亞"],
  ["costarica", "哥斯大黎加"],
  ["grenada", "格瑞那達"],
  ["greenland", "格陵蘭"],
  ["georgia", "喬治亞"],
  ["cuba", "古巴"],
  ["haiti", "海地"],
  ["kazakhstan", "哈薩克"],
  ["honduras", "宏都拉斯"],
  ["kyrgyzstan", "吉爾吉斯"],
  ["djibouti", "吉布地"],
  ["kiribati", "吉里巴斯"],
  ["ghana", "迦納"],
  ["cambodia", "柬埔寨"],
  ["zimbabwe", "辛巴威"],
  ["qatar", "卡達"],
  ["croatia", "克羅埃西亞"],
  ["kenya", "肯亞"],
  ["latvia", "拉脫維亞"],
  ["laos", "寮國"],
  ["lebanon", "黎巴嫩"],
  ["lithuania", "立陶宛"],
  ["libya", "利比亞"],
  ["liechtenstein", "列支敦斯登"],
  ["luxembourg", "盧森堡"],
  ["rwanda", "盧安達"],
  ["romania", "羅馬尼亞"],
  ["madagascar", "馬達加斯加"],
  ["maldives", "馬爾地夫"],
  ["malta", "馬爾他"],
  ["malawi", "馬拉威"],
  ["mali", "馬利"],
  ["mauritius", "模里西斯"],
  ["mauritania", "茅利塔尼亞"],
  ["mongolia", "蒙古"],
  ["bangladesh", "孟加拉"],
  ["peru", "秘魯"],
  ["morocco", "摩洛哥"],
  ["monaco", "摩納哥"],
  ["moldova", "摩爾多瓦"],
  ["mozambique", "莫三比克"],
  ["mexico", "墨西哥"],
  ["namibia", "納米比亞"],
  ["southafrica", "南非"],
  ["southsudan", "南蘇丹"],
  ["nepal", "尼泊爾"],
  ["nicaragua", "尼加拉瓜"],
  ["niger", "尼日"],
  ["nigeria", "奈及利亞"],
  ["norway", "挪威"],
  ["palau", "帛琉"],
  ["sweden", "瑞典"],
  ["serbia", "塞爾維亞"],
  ["senegal", "塞內加爾"],
  ["cyprus", "賽普勒斯"],
  ["saudiarabia", "沙烏地阿拉伯"],
  ["seychelles", "塞席爾"],
  ["srilanka", "斯里蘭卡"],
  ["slovakia", "斯洛伐克"],
  ["slovenia", "斯洛維尼亞"],
  ["eswatini", "史瓦帝尼"],
  ["sudan", "蘇丹"],
  ["suriname", "蘇利南"],
  ["solomon", "索羅門群島"],
  ["somalia", "索馬利亞"],
  ["tajikistan", "塔吉克"],
  ["tanzania", "坦尚尼亞"],
  ["tonga", "東加"],
  ["trinidad", "千里達"],
  ["tunisia", "突尼西亞"],
  ["tuvalu", "吐瓦魯"],
  ["turkmenistan", "土庫曼"],
  ["vanuatu", "萬那杜"],
  ["guatemala", "瓜地馬拉"],
  ["venezuela", "委內瑞拉"],
  ["brunei", "汶萊"],
  ["uganda", "烏干達"],
  ["ukraine", "烏克蘭"],
  ["uruguay", "烏拉圭"],
  ["uzbekistan", "烏茲別克"],
  ["hungary", "匈牙利"],
  ["jamaica", "牙買加"],
  ["armenia", "亞美尼亞"],
  ["israel", "以色列"],
  ["india", "印度"],
  ["jordan", "約旦"],
  ["iran", "伊朗"],
  ["iraq", "伊拉克"],
  ["elsalvador", "薩爾瓦多"],
  ["samoa", "薩摩亞"],
  ["chile", "智利"],
  ["chad", "查德"],
  ["gibraltar", "直布羅陀"],
  ["centralafrican", "中非"],
  ["myanmar", "緬甸"],
  ["pakistan", "巴基斯坦"],
  ["palestine", "巴勒斯坦"],
  ["papua", "巴布亞紐幾內亞"],
  ["puertorico", "波多黎各"],
  ["sanmarino", "聖馬利諾"],
  ["vaticancity", "梵蒂岡"],
  ["kosovo", "科索沃"],
  ["faroe", "法羅群島"],
  ["guam", "關島"],
  ["nmi", "北馬里亞納／塞班"],
  ["frenchpolynesia", "法屬玻里尼西亞／大溪地"],
  ["newcaledonia", "新喀里多尼亞"],
  ["poland", "波蘭"],
  ["angola", "安哥拉"],
  ["cameroon", "喀麥隆"],
  ["ivorycoast", "象牙海岸"],
  ["congo", "剛果"],
  ["drc", "剛果民主共和國"],
  ["gabon", "加彭"],
  ["guinea", "幾內亞"],
  ["liberia", "賴比瑞亞"],
  ["sierraleone", "獅子山"],
  ["togo", "多哥"],
  ["zambia", "尚比亞"],
  ["bahamas", "巴哈馬"],
  ["barbados", "巴貝多"],
  ["cayman", "開曼群島"],
  ["curacao", "古拉索"],
  ["aruba", "阿魯巴"],
];

const DETAILED_IDS = new Set(ITINERARY_COUNTRIES.map((c) => c.id));
for (const [id, label] of WORLD_COUNTRIES) {
  if (DETAILED_IDS.has(id)) continue;
  DETAILED_IDS.add(id);
  ITINERARY_COUNTRIES.push(C(id, label, []));
}

const byId = new Map();
for (const country of ITINERARY_COUNTRIES) {
  byId.set(country.id, {
    id: country.id,
    label: country.label,
    kind: "country",
    countryId: country.id,
  });
  for (const region of country.regions || []) {
    byId.set(region.id, {
      id: region.id,
      label: region.label,
      kind: "region",
      countryId: country.id,
      aliases: region.aliases || [],
    });
  }
}

export const ITINERARY_DESTINATION_IDS = new Set(byId.keys());

export const CUSTOM_PREFIX = "custom:";

export function destinationMeta(id) {
  return byId.get(id) || null;
}

export function destinationLabel(id) {
  const raw = String(id || "");
  if (raw.startsWith(CUSTOM_PREFIX)) {
    try {
      return decodeURIComponent(raw.slice(CUSTOM_PREFIX.length));
    } catch {
      return raw.slice(CUSTOM_PREFIX.length);
    }
  }
  return byId.get(id)?.label || "";
}

export function makeCustomDestination(text) {
  const t = String(text || "")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  if (!t) return "";
  return `${CUSTOM_PREFIX}${encodeURIComponent(t)}`;
}

export function sanitizeDestinationIds(raw) {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const legacy = { kansai: "osaka", "osaka-kansai": "osaka" };
  return [
    ...new Set(
      list
        .map((id) => String(id || "").trim())
        .map((id) => legacy[id] || id)
        .filter((id) => {
          if (ITINERARY_DESTINATION_IDS.has(id)) return true;
          if (!id.startsWith(CUSTOM_PREFIX)) return false;
          return Boolean(destinationLabel(id));
        }),
    ),
  ].slice(0, 24);
}

export function filterDestinationTree(query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return ITINERARY_COUNTRIES;
  return ITINERARY_COUNTRIES.map((country) => {
    const countryHit =
      country.label.toLowerCase().includes(q) ||
      String(country.id).toLowerCase().includes(q);
    const regions = (country.regions || []).filter((r) => {
      const blob = [r.label, r.id, ...(r.aliases || [])].join(" ").toLowerCase();
      return blob.includes(q);
    });
    if (countryHit) return country;
    if (regions.length) return { ...country, regions };
    return null;
  }).filter(Boolean);
}

export function destinationCount() {
  return {
    countries: ITINERARY_COUNTRIES.length,
    places: ITINERARY_DESTINATION_IDS.size,
  };
}
