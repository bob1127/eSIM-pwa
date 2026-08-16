import { klookAff } from "./activities";

/** 泰國景點／體驗（與 KKday 門票區合併顯示，不另開 Klook 區塊） */
export const KLOOK_TH_TICKETS = [];

/** 泰國交通票券（獨立 section） */
export const KLOOK_TH_TRANSPORT = [
  {
    id: "kl-th-private-car",
    partner: "klook",
    countryId: "thailand",
    regionLabel: "曼谷",
    badge: "包車",
    category: "私人包車",
    title: "曼谷包車（含司機）房車／休旅／箱型車",
    subtitle: "含油費・私人包團・可客製行程",
    priceLabel: "TWD 2,500 起",
    footer: "立即確認 · 含油費與過路費視方案",
    images: [
      "https://res.klook.com/image/upload/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/dv3ycw8njx88sudahf9l.webp",
    ],
    description:
      "曼谷包車含司機，可選房車、休旅車或箱型車。方案多含油費與過路費，適合客製一天行程或往返鄰近府治。",
    features: [
      "安全驗證車隊",
      "私人包團，不與其他旅客共乘",
      "含油費（視方案）",
      "可客製行程",
    ],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/1596-private-car-charter-thailand-bangkok/",
    ),
  },
  {
    id: "kl-th-phuket-ferry",
    partner: "klook",
    countryId: "thailand",
    regionLabel: "普吉・皮皮・喀比",
    badge: "跳島",
    category: "船票",
    title: "普吉 — 皮皮島 — 喀比渡輪船票",
    subtitle: "Andaman 航線・可選接駁",
    priceLabel: "TWD 480 起",
    footer: "立即確認 · 電子憑證換實體票視方案",
    images: [
      "https://res.klook.com/image/upload/w_1265,h_791,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/eiyu5svhwxlip3nikq0v.webp",
    ],
    description:
      "往返普吉、皮皮島與喀比的渡輪／快艇票，適合跳島行程。部分方案可加購飯店接駁，班次與航行時間依海象調整。",
    features: [
      "普吉／皮皮／喀比航線",
      "可選飯店接駁方案",
      "電子憑證，碼頭換票或直接登船視方案",
    ],
    url: klookAff(
      "https://www.klook.com/zh-TW/activity/6626-andaman-wave-master-one-way-ticket-phuket-phi-phi-island/",
    ),
  },
];
