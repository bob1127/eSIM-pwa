import { klookAff } from "./activities";

/** 韓國景點／體驗（與 KKday 門票區合併顯示） */
export const KLOOK_KR_TICKETS = [
  {
    id: "kl-kr-ganghwa-luge",
    partner: "klook",
    countryId: "korea",
    regionLabel: "仁川・江華島",
    badge: "戶外",
    category: "半日遊",
    title: "江華斜坡滑車半日遊（含接送）",
    subtitle: "Ganghwa Seaside Luge・仁川出發",
    priceLabel: "TWD 報價 起",
    footer: "立即確認 · 電子憑證",
    images: [
      "https://res.klook.com/image/upload/c_crop,h_1857,w_2971,x_14,y_0,z_0.2/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/jhyxffxjj8iimqg9gdus.webp",
    ],
    description:
      "從仁川出發的江華斜坡滑車半日遊，含接送與滑車體驗。實際行程與停留時間依當日方案為準。",
    features: ["含接送（視方案）", "江華斜坡滑車", "電子憑證"],
    url: klookAff("https://www.klook.com/zh-TW/activity/100900-ganghwa-luge/"),
  },
  {
    id: "kl-kr-suwon-hwaseong",
    partner: "klook",
    countryId: "korea",
    regionLabel: "水原",
    badge: "世界遺產",
    category: "一日遊",
    title: "水原華城・韓國民俗村一日遊",
    subtitle: "華城城郭與民俗村・首爾出發",
    priceLabel: "TWD 報價 起",
    footer: "立即確認 · 電子憑證",
    images: [
      "https://res.klook.com/image/upload/c_crop,h_767,w_1227,x_103,y_1,z_0.5/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/xnml9fp3ts2tm16c1xv0.webp",
    ],
    description:
      "首爾出發的水原華城與韓國民俗村行程。華城為世界文化遺產，實際停點與導覽語言依方案為準。",
    features: ["水原華城", "韓國民俗村（視方案）", "首爾出發"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/29707-suwon-hwaseong-fortress-folk-village-tour/",
    ),
  },
  {
    id: "kl-kr-spa-land",
    partner: "klook",
    countryId: "korea",
    regionLabel: "釜山・Centum City",
    badge: "汗蒸幕",
    category: "門票",
    title: "釜山 SPA LAND 汗蒸幕門票",
    subtitle: "Centum City・韓屋風室內空間",
    priceLabel: "TWD 報價 起",
    footer: "立即確認 · 電子憑證",
    images: [
      "https://res.klook.com/image/upload/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/qfo1kmmgjdow5oznhvzy.webp",
    ],
    description:
      "釜山 Centum City 的 SPA LAND 汗蒸幕門票，可使用多種溫泉池與休息區。使用時段與設施依現場規定。",
    features: ["電子憑證", "Centum City 商場內", "汗蒸幕與溫泉設施"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/33180-spa-land-centum-city-ticket-busan/",
    ),
  },
  {
    id: "kl-kr-herb-island",
    partner: "klook",
    countryId: "korea",
    regionLabel: "抱川",
    badge: "打卡",
    category: "一日遊",
    title: "抱川一日遊（香草島・藝術谷・出 Pent 橋）",
    subtitle: "Herb Island 粉紅山丘・首爾出發",
    priceLabel: "TWD 報價 起",
    footer: "立即確認 · 電子憑證",
    images: [
      "https://res.klook.com/image/upload/c_crop,h_1536,w_2458,x_125,y_0,z_0.3/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/r8chtzwmnfqj2ksuun07.webp",
    ],
    description:
      "首爾出發的抱川一日遊，行程含香草島（粉紅山丘打卡點）等景點。實際停點依當日方案為準。",
    features: ["香草島 Herb Island", "首爾出發", "電子憑證"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/196972-pocheon-day-tour-y-suspension-bridge-art-valley-herb-island/",
    ),
  },
  {
    id: "kl-kr-lotte-world",
    partner: "klook",
    countryId: "korea",
    regionLabel: "首爾・蠶室",
    badge: "主題樂園",
    category: "門票",
    title: "樂天世界門票",
    subtitle: "Adventure + Magic Island・QR 入園視方案",
    priceLabel: "TWD 報價 起",
    footer: "立即確認 · 電子票券",
    images: [
      "https://res.klook.com/image/upload/c_crop,h_1875,w_3000,x_0,y_1313,z_0.2/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/nfkfi8khf7fdnthhqd2a.webp",
    ],
    description:
      "首爾樂天世界主題樂園門票，含 Adventure 與 Magic Island 區域（依票種）。建議尖峰日提前購票。",
    features: ["樂天世界冒險園區", "Magic Island（視票種）", "電子票券"],
    url: klookAff("https://www.klook.com/zh-TW/activity/251-lotte-world-seoul/"),
  },
];

/** 韓國交通票券 */
export const KLOOK_KR_TRANSPORT = [
  {
    id: "kl-kr-arex",
    partner: "klook",
    countryId: "korea",
    section: "transport",
    regionLabel: "仁川機場・首爾",
    badge: "機場快線",
    category: "火車",
    title: "AREX 機場快線",
    subtitle: "仁川機場往返首爾市區",
    priceLabel: "TWD 270 起",
    footer: "立即確認 · 電子憑證",
    images: [
      "https://res.klook.com/image/upload/c_crop,h_516,w_825,x_0,y_0,z_0.9/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/zots6hmguxmyqoakjh3f.webp",
    ],
    description:
      "AREX 機場鐵路連接仁川國際機場與首爾市區。可選直達或一般列車方案，實際班次與停站依票種為準。",
    features: ["仁川機場 T1／T2", "往返首爾市區", "電子憑證"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/1163-airport-to-seoul-city-center-arex-train-incheon/",
    ),
  },
  {
    id: "kl-kr-kal-limousine",
    partner: "klook",
    countryId: "korea",
    section: "transport",
    regionLabel: "仁川機場・首爾",
    badge: "機場巴士",
    category: "巴士",
    title: "K-Limousine 仁川機場巴士",
    subtitle: "KAL 機場巴士・市區多線",
    priceLabel: "TWD 420 起",
    footer: "立即確認 · 電子憑證",
    images: [
      "https://res.klook.com/image/upload/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/wmvpqymwtj2njihsefcx.webp",
    ],
    description:
      "K-Limousine（KAL）仁川機場巴士，連接機場與首爾市區飯店／商圈。路線與班次依現場營運為準。",
    features: ["仁川機場出發", "市區多線", "電子憑證"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/1309-kal-limousine-bus-seoul/",
    ),
  },
  {
    id: "kl-kr-tmoney",
    partner: "klook",
    countryId: "korea",
    section: "transport",
    regionLabel: "仁川機場",
    badge: "交通卡",
    category: "交通卡",
    title: "T-money 卡（仁川機場領取）",
    subtitle: "地鐵・巴士・計程車可用",
    priceLabel: "TWD 120 起",
    footer: "立即確認 · 機場領取",
    images: [
      "https://res.klook.com/image/upload/c_crop,h_1008,w_1612,x_0,y_33,z_0.4/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/mjm1oo8wuy04rgka7o03.webp",
    ],
    description:
      "於 Klook 預訂 T-money 卡，可在仁川國際機場指定櫃檯領取。可用於首爾地鐵、巴士與部分計程車。儲值與押金依方案說明。",
    features: ["仁川機場領取", "地鐵／巴士可用", "電子憑證換卡"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/18054-klook-t-money-card-seoul/",
    ),
  },
  {
    id: "kl-kr-intl-taxi",
    partner: "klook",
    countryId: "korea",
    section: "transport",
    regionLabel: "仁川機場・首爾",
    badge: "官方計程車",
    category: "接送",
    title: "首爾國際計程車（仁川機場接送）",
    subtitle: "Seoul International Taxi・多語司機",
    priceLabel: "TWD 1,900 起",
    footer: "立即確認 · 私人接送",
    images: [
      "https://res.klook.com/image/upload/u_activities:ididvzsuwwi5cbydtjjq,h_1.0,ar_16:9,c_scale,e_blur:10000/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/ididvzsuwwi5cbydtjjq.webp",
    ],
    description:
      "首爾市官方外語計程車接送，往返仁川機場與市區。可選轎車或 Jumbo 廂型車，實際車型依預訂方案。",
    features: ["官方國際計程車", "多語司機（視派遣）", "私人接送不共乘"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/76596-private-incheon-airport-taxi-transfers-seoul/",
    ),
  },
];
