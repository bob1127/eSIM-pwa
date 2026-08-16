import { klookAff } from "./activities";

/** 香港景點／通行證（與 KKday 門票區合併顯示） */
export const KLOOK_HK_TICKETS = [
  {
    id: "kl-hk-palace-museum",
    partner: "klook",
    countryId: "hongkong",
    regionLabel: "西九文化區",
    badge: "博物館",
    category: "門票",
    title: "香港故宮文化博物館門票",
    subtitle: "西九龍・故宮珍藏與專題展",
    priceLabel: "TWD 報價 起",
    footer: "立即確認 · 電子憑證",
    images: [
      "https://res.klook.com/image/upload/c_crop,h_1851,w_2962,x_0,y_0,z_0.3/w_1265,h_791,c_fill,q_85/activities/a3s6s608qvm1nlpjpagf.webp",
    ],
    description:
      "香港故宮文化博物館門票（Klook 活動編號 73590）。位於西九文化區，展出故宮博物院珍品與專題展覽。開放時段與休館日以館方公告為準。",
    features: ["西九文化區博物館道", "電子憑證入場", "專題展視方案"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/73590-hong-kong-palace-museum-ticket/",
    ),
  },
  {
    id: "kl-hk-legoland",
    partner: "klook",
    countryId: "hongkong",
    regionLabel: "尖沙咀・K11 MUSEA",
    badge: "親子",
    category: "門票",
    title: "香港樂高探索中心門票",
    subtitle: "LEGOLAND Discovery Centre・室內樂園",
    priceLabel: "TWD 報價 起",
    footer: "需選時段 · 電子憑證",
    images: [
      "https://res.klook.com/image/upload/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/jn7yizdbzpizxkwnqshi.webp",
    ],
    description:
      "香港樂高探索中心門票（Klook 活動編號 53324），位於尖沙咀 K11 MUSEA。室內主題遊樂區，成人須攜同兒童入場，規則以現場為準。",
    features: ["K11 MUSEA B1", "需預約時段", "成人須偕同兒童"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/53324-legoland-discovery-centre-ticket-hong-kong/",
    ),
  },
  {
    id: "kl-hk-noahs-ark",
    partner: "klook",
    countryId: "hongkong",
    regionLabel: "馬灣",
    badge: "親子",
    category: "門票",
    title: "香港挪亞方舟主題公園門票",
    subtitle: "馬灣・一比一比例方舟",
    priceLabel: "TWD 報價 起",
    footer: "立即確認 · 電子憑證",
    images: [
      "https://res.klook.com/image/upload/c_crop,h_958,w_1533,x_234,y_0,z_0.4/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/yqhl9yudb2iqiguhe9mf.webp",
    ],
    description:
      "香港馬灣挪亞方舟主題公園門票（Klook 活動編號 41）。園區含方舟博覽館等展區，休園日與開放時間以園方公告為準。",
    features: ["馬灣珀欣路", "親子主題園區", "電子憑證"],
    url: klookAff("https://www.klook.com/zh-TW/activity/41-noahs-ark-hong-kong/"),
  },
  {
    id: "kl-hk-klook-pass",
    partner: "klook",
    countryId: "hongkong",
    regionLabel: "香港全境",
    badge: "省錢通行證",
    category: "通行證",
    title: "Klook Pass 香港景點通行證",
    subtitle: "自選 2–6 個景點・最高約 4 折",
    priceLabel: "TWD 報價 起",
    footer: "自選套裝 · 電子憑證",
    images: [
      "https://res.klook.com/image/upload/c_crop,h_1280,w_2048,x_0,y_40,z_0.4/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/norj7ppym4cd5x397wjx.webp",
    ],
    description:
      "Klook Pass 香港（活動編號 80363）。可自選多個熱門景點一次購買，實際可選項目與加購樂園以商品頁方案為準。",
    features: ["自選景點數量視方案", "可含故宮／挪亞方舟等", "加購迪士尼／海洋公園視方案"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/80363-klook-pass-hong-kong/",
    ),
  },
  {
    id: "kl-mo-venetian-gondola",
    partner: "klook",
    countryId: "hongkong",
    regionLabel: "澳門・路氹",
    badge: "體驗",
    category: "門票",
    title: "澳門威尼斯人貢多拉船體驗",
    subtitle: "The Venetian Macao・運河乘船",
    priceLabel: "TWD 報價 起",
    footer: "需提前預訂 · 電子憑證",
    images: [
      "https://res.klook.com/image/upload/u_activities:kkpayz8f2udhmqu6sv5q,h_1.0,ar_960:460,c_scale,e_blur:10000/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/kkpayz8f2udhmqu6sv5q.webp",
    ],
    description:
      "澳門威尼斯人貢多拉船體驗（Klook 活動編號 740）。於度假村運河搭乘貢多拉，行程約 10–15 分鐘。戶外人工湖開放狀況與預訂規則以商品頁為準。",
    features: ["澳門威尼斯人", "約 10–15 分鐘", "需至少一日前預訂視公告"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/740-gondola-rides-at-the-venetian-macau/",
    ),
  },
  {
    id: "kl-mo-turbojet",
    partner: "klook",
    countryId: "hongkong",
    section: "transport",
    regionLabel: "香港 ↔ 澳門",
    badge: "渡輪",
    category: "交通票券",
    title: "噴射飛航 TurboJET 港澳船票",
    subtitle: "上環 ↔ 澳門外港／氹仔",
    priceLabel: "TWD 400 起",
    footer: "電子憑證登船 · 班次視方案",
    images: [
      "https://res.klook.com/image/upload/c_crop,h_1500,w_2400,x_300,y_0,z_0.2/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/z5ck0tcwdsgntcjlkt9d.webp",
    ],
    description:
      "噴射飛航 TurboJET 香港往返澳門船票（Klook 活動編號 3070）。航線含上環港澳碼頭至澳門外港或氹仔。建議開航前 30 分鐘入閘，班次以官網為準。",
    features: ["單程／來回視方案", "QR Code 登船視商品頁", "開航前 30 分鐘入閘"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/3070-turbojet-ticket-macau/",
    ),
  },
  {
    id: "kl-mo-hzmb-bus",
    partner: "klook",
    countryId: "hongkong",
    section: "transport",
    regionLabel: "香港 ↔ 澳門",
    badge: "直通巴",
    category: "交通票券",
    title: "港澳直通巴士（環島中港通）",
    subtitle: "經港珠澳大橋・酒店／市區站點",
    priceLabel: "TWD 650 起",
    footer: "電子憑證 · 過關需攜證件",
    images: [
      "https://res.klook.com/image/upload/u_activities:n1jjtzpiuxapygwzxiot,h_1.0,ar_960:460,c_scale,e_blur:10000/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/n1jjtzpiuxapygwzxiot.webp",
    ],
    description:
      "香港往返澳門直通巴士（Klook 活動編號 17925，環島中港通提供）。途經港珠澳大橋，澳門端多為大型酒店站點。出入境需自行辦理，班次與上車點以商品頁為準。",
    features: ["經港珠澳大橋", "澳門酒店站點視方案", "口岸自行過關"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/17925-hkmo-transfers-hong-kong-macau/",
    ),
  },
  {
    id: "kl-mo-alphard-transfer",
    partner: "klook",
    countryId: "hongkong",
    section: "transport",
    regionLabel: "香港 ↔ 澳門",
    badge: "包車",
    category: "交通票券",
    title: "港澳私人專車接送（Alphard）",
    subtitle: "市區／機場單程或來回視方案",
    priceLabel: "TWD 12,000 起",
    footer: "私人專車 · 含過橋費視方案",
    images: [
      "https://res.klook.com/image/upload/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/duorkmjn74tspklqwcu6.webp",
    ],
    description:
      "澳門往返香港私人專車接送（Klook 活動編號 19905）。車型為 Toyota Alphard，最多約 6 位乘客。過橋費是否內含、超時與加停以商品頁為準。",
    features: ["Toyota Alphard", "最多約 6 人", "機場／市區方案視商品頁"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/19905-private-city-transfers-macau-hong-kong/",
    ),
  },
];

export const KLOOK_HK_TRANSPORT = KLOOK_HK_TICKETS.filter(
  (t) => t.section === "transport",
);
