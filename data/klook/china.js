import { klookAff } from "./activities";

/** 中國景點／體驗／套票（與 KKday 門票區合併顯示） */
export const KLOOK_CN_TICKETS = [
  {
    id: "kl-cn-custom-travel",
    partner: "klook",
    countryId: "china",
    regionLabel: "北京／上海等",
    badge: "私人定制",
    category: "客製行程",
    title: "Klook 中國大陸私人定制旅行",
    subtitle: "1 對 1 定制師・北京故宮等可規劃",
    priceLabel: "TWD 報價 起",
    footer: "諮詢單・行程再確認",
    images: [
      "https://res.klook.com/image/upload/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/wgzeoca7b6zpaw6rjmv1.webp",
    ],
    description:
      "Klook 中國大陸私人定制旅行（活動編號 174253）。依人數、天數與預算規劃北京、上海、雲南、西安等路線。此為諮詢／規劃服務，最終行程與價格以下單後確認為準。",
    features: ["1 對 1 定制師", "可含故宮等熱門點", "行程與報價需二次確認"],
    url: klookAff("https://www.klook.com/zh-TW/activity/174253/"),
  },
  {
    id: "kl-cn-muji-shenzhen",
    partner: "klook",
    countryId: "china",
    regionLabel: "深圳・福田",
    badge: "住宿套票",
    category: "住宿套票",
    title: "深圳無印良品酒店住宿套票",
    subtitle: "全球首家 MUJI HOTEL・深業上城",
    priceLabel: "TWD 報價 起",
    footer: "立即確認 · 方案含早餐視商品頁",
    images: [
      "https://res.klook.com/image/upload/w_1160,c_fill,q_85/v1783665015/hotel/szfgrdwkdwlwpjvlmjye.webp",
    ],
    description:
      "深圳無印良品酒店住宿套票（Klook 活動編號 127235），位於福田深業上城 UPPERHILLS。客房與公區皆為 MUJI 風格，鄰近蓮花山與地鐵站。",
    features: ["全球首家 MUJI 酒店", "深業上城／福田", "MUJI Diner 餐堂視方案"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/127235-the-world-s-first-muji-hotel-muji-hotel-shenzhen-accommodation-package/",
    ),
  },
  {
    id: "kl-cn-penguin-buffet",
    partner: "klook",
    countryId: "china",
    regionLabel: "珠海・橫琴",
    badge: "企鵝主題",
    category: "美食體驗",
    title: "珠海長隆企鵝酒店帝企鵝自助餐",
    subtitle: "冰川主題餐廳・邊吃邊看企鵝",
    priceLabel: "TWD 報價 起",
    footer: "需選餐期 · 電子憑證",
    images: [
      "https://res.klook.com/image/upload/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/q4frdvfvhtfomtb4jcx4.webp",
    ],
    description:
      "珠海橫琴長隆企鵝酒店帝企鵝自助餐廳（Klook 活動編號 56845）。冰川主題空間可近距離看企鵝，供應中西自助餐。餐期與座位以現場安排為準。",
    features: ["早／午／晚餐期視方案", "企鵝館主題餐廳", "橫琴長隆度假區"],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/56845-penguin-hotel-buffet-chimelong-zhu-hai/",
    ),
  },
];
