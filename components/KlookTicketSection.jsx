"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MobileCardCarousel from "./MobileCardCarousel";
import KlookLocationMap from "./KlookLocationMap";
import { KLOOK_JP_TICKETS } from "../data/klook/jp";

/* ─────────────────────────────────────────────── */
/* 工具函式                                         */
/* ─────────────────────────────────────────────── */
const AID = "125977";

/**
 * 若 url 已是完整 affiliate.klook.com/redirect 連結就直接用，
 * 否則在商品網址後加 ?aid=AID（分潤效果相同，僅少了廣告層級分析）。
 * 如需完整追蹤請到後台「產生聯盟連結」取得 aff_adid，直接把完整 URL 貼入下方 url 欄位。
 */
function aff(url) {
  if (url.startsWith("https://affiliate.klook.com/redirect")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}aid=${AID}`;
}

/* ─────────────────────────────────────────────── */
/* Tab 定義                                         */
/* ─────────────────────────────────────────────── */
const COUNTRY_TABS = [
  { id: "japan", label: "日本" },
  { id: "korea", label: "韓國" },
];

/* ─────────────────────────────────────────────── */
/* 商品資料（圖片請換成 /images/klook/{id}-1.jpg）   */
/* ─────────────────────────────────────────────── */
const TICKETS = [
  /* ====== 日本 ====== */
  {
    id: "kl-jp-usj",
    countryId: "japan",
    regionLabel: "大阪",
    badge: "熱銷 No.1",
    category: "主題樂園",
    title: "日本環球影城門票 Universal Studios Japan",
    subtitle: "官方授權 · 免排隊掃碼入園",
    priceLabel: "TWD 1,826 起",
    footer: "立即確認 · 電子票券 · 300K+ 已訂購",
    images: [
      "/images/klook/kl-jp-usj-1.jpg",
      "/images/klook/kl-jp-usj-2.jpg",
    ],
    description:
      "日本環球影城（USJ）是大阪最受歡迎的主題樂園，設有超級任天堂世界™、哈利波特魔法世界™、小小兵樂園等超人氣區域。透過 Klook 購票，即時取得 QR Code，現場直接掃碼入園！",
    features: [
      "超級任天堂世界™、哈利波特魔法世界™",
      "QR Code 即掃即入，免排隊",
      "彈性選擇入園日期",
      "可加購 Express Pass 快速通關",
      "Klook 官方授權，中文客服支援",
    ],
    url: aff("https://affiliate.klook.com/redirect?aid=125977&aff_adid=1333304&k_site=https%3A%2F%2Fwww.klook.com%2Fzh-TW%2Factivity%2F46604-universal-studios-japan-e-ticket-osaka-qr-code-direct-entry"),
  },
  {
    id: "kl-jp-disney",
    countryId: "japan",
    regionLabel: "東京・千葉",
    badge: "夢幻首選",
    category: "主題樂園",
    title: "東京迪士尼樂園 & 迪士尼海洋門票",
    subtitle: "夢幻城堡 · 海洋奇觀 · 魔法全日體驗",
    priceLabel: "TWD 1,800 起",
    footer: "電子票券 · 可選日期",
    images: [
      "/images/klook/kl-jp-disney-1.jpg",
      "/images/klook/kl-jp-disney-2.jpg",
    ],
    description:
      "東京迪士尼樂園與東京迪士尼海洋，是全球最具人氣的主題樂園。選擇 1-Day Passport 或跨兩園的 Park Hopper Passport，透過 Klook 購票享 QR Code 電子入場，並可享中文客服。",
    features: [
      "夢幻城堡・灰姑娘城堡地標",
      "東京迪士尼海洋獨特海洋風情",
      "星際旅行・幽靈公館・小熊維尼",
      "豐富迪士尼主題美食與商品",
      "QR Code 電子票，直接入場",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/2246/"),
  },
  {
    id: "kl-jp-teamlab",
    countryId: "japan",
    regionLabel: "東京・豐洲",
    badge: "沉浸體驗",
    category: "藝術展覽",
    title: "teamLab Planets TOKYO 門票",
    subtitle: "全球最夯數位藝術沉浸展・光影水境",
    priceLabel: "TWD 750 起",
    footer: "指定時段入場 · 電子票券",
    images: [
      "/images/klook/kl-jp-teamlab-1.jpg",
      "/images/klook/kl-jp-teamlab-2.jpg",
    ],
    description:
      "teamLab Planets TOKYO 是全球最受矚目的沉浸式數位藝術展覽，以花海、無限宇宙、水境等多個震撼場景讓訪客完全融入藝術之中。官方強烈建議提前購票，熱門時段極易售罄。",
    features: [
      "巨型花海・無限光粒子空間",
      "水中行走・腳踩花朵映射體驗",
      "宇宙星空沉浸空間",
      "️ 官方建議提前購票，熱門場次秒殺",
      "豐洲站步行 5 分鐘，交通方便",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/13900/"),
  },
  {
    id: "kl-jp-skytree",
    countryId: "japan",
    regionLabel: "東京・淺草",
    badge: "全球最高電波塔",
    category: "展望台",
    title: "東京晴空塔 TOKYO SKYTREE 門票",
    subtitle: "634m 世界最高電波塔 · 俯瞰東京全景",
    priceLabel: "TWD 600 起",
    footer: "天望台 350m/450m · 電子票",
    images: [
      "/images/klook/kl-jp-skytree-1.jpg",
      "/images/klook/kl-jp-skytree-2.jpg",
    ],
    description:
      "東京晴空塔高 634 公尺，是全球最高的電波塔。350 公尺的天望台可 360° 眺望整個東京盆地，晴天更可遠眺富士山；450 公尺天望迴廊的玻璃地板讓你直視腳下，體驗極致刺激。",
    features: [
      "高 634m，全球最高電波塔",
      "350m & 450m 雙層展望台",
      "️ 晴天可遠眺富士山",
      "夜景璀璨，攝影人必訪",
      "免現場排隊，電子票直接入場",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/2260/"),
  },
  {
    id: "kl-jp-fujiq",
    countryId: "japan",
    regionLabel: "山梨・富士山",
    badge: "刺激必玩",
    category: "主題樂園",
    title: "富士急樂園 Fuji-Q Highland 門票",
    subtitle: "世界級激速雲霄飛車 · 富士山超近景",
    priceLabel: "TWD 650 起",
    footer: "電子票 · 含入場費",
    images: [
      "/images/klook/kl-jp-fujiq-1.jpg",
      "/images/klook/kl-jp-fujiq-2.jpg",
    ],
    description:
      "富士急樂園坐擁富士山絕景，以多座世界紀錄雲霄飛車聞名，包含超陡下墜的 TAKABISHA、高速旋轉的 FUJIYAMA、極度刺激的 Do-Dodonpa。富士山作為背景，拍照打卡一流！",
    features: [
      "TAKABISHA・FUJIYAMA 世界級雲霄飛車",
      "富士山絕景背景，拍照超美",
      "哆啦 A 夢及多個 IP 園區",
      "️ 四季皆宜，冬天雪景最壯觀",
      "電子票直接入園，免排隊購票",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/2248/"),
  },
  {
    id: "kl-jp-haruka",
    countryId: "japan",
    regionLabel: "大阪・關西",
    category: "機場交通",
    title: "關西機場特快 HARUKA 車票",
    subtitle: "機場直達大阪・京都・神戶",
    priceLabel: "TWD 480 起",
    footer: "外國旅客折扣 · 電子憑證",
    images: [
      "/images/klook/kl-jp-haruka-1.jpg",
      "/images/klook/kl-jp-haruka-2.jpg",
    ],
    description:
      "HARUKA 特急是往返關西機場最快捷的選擇，可直達大阪、京都、神戶市中心。外國旅客享專屬折扣，比現場購票更優惠，訂購後直接出示 QR Code 上車。",
    features: [
      "️ 機場直達大阪・京都・神戶",
      "京都最短約 75 分鐘直達",
      "指定席對號入座",
      "外國旅客專屬優惠票",
      "電子憑證，免換票直接上車",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/2478/"),
  },
  {
    id: "kl-jp-nex",
    countryId: "japan",
    regionLabel: "東京・成田",
    badge: "機場接駁",
    category: "機場交通",
    title: "成田特快 N'EX 來回車票",
    subtitle: "成田機場直達新宿・池袋・橫濱",
    priceLabel: "TWD 960 起",
    footer: "來回券 · 14 天有效 · 電子票",
    images: [
      "/images/klook/kl-jp-nex-1.jpg",
      "/images/klook/kl-jp-nex-2.jpg",
    ],
    description:
      "成田特快 N'EX 是往返成田機場與東京市區最舒適的選擇，可直達新宿、池袋、澀谷、橫濱。來回套票限外國旅客購買，14 天內有效，是長程旅遊者最划算的機場交通。",
    features: [
      "機場直達新宿・池袋・橫濱",
      "外國旅客限定來回套票，超值",
      "全車對號座，寬敞行李空間",
      "14 天內有效，彈性使用",
      "電子票，機場下機即可搭乘",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/1384/"),
  },
  {
    id: "kl-jp-osaka-pass",
    countryId: "japan",
    regionLabel: "大阪",
    category: "景點通票",
    title: "大阪周遊卡 OSAKA AMAZING PASS",
    subtitle: "40+ 景點免費 · 含海遊館・大阪城・通天閣",
    priceLabel: "TWD 680 起",
    footer: "1日/2日 · 含地鐵無限搭",
    images: [
      "/images/klook/kl-jp-osaka-pass-1.jpg",
      "/images/klook/kl-jp-osaka-pass-2.jpg",
    ],
    description:
      "大阪周遊卡（OSAKA AMAZING PASS）讓你一卡暢遊 40+ 景點，含海遊館水族館、大阪城、通天閣、HEP Five 摩天輪等，並附大阪地鐵巴士無限搭乘，一天遊透大阪不是夢。",
    features: [
      "大阪城天守閣免費入場",
      "海遊館水族館（世界頂級之一）",
      "通天閣展望台・夕陽之塔",
      "大阪市地鐵巴士無限搭乘",
      "40+ 設施・1 日 / 2 日券可選",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/2476/"),
  },
  {
    id: "kl-jp-jr-pass",
    countryId: "japan",
    regionLabel: "全日本",
    badge: "長途旅行必備",
    category: "鐵路周遊券",
    title: "JR PASS 全日本鐵路周遊券",
    subtitle: "新幹線無限搭 · 東京到九州自由行",
    priceLabel: "TWD 12,000 起",
    footer: "7/14/21 日 · 台灣取件",
    images: [
      "/images/klook/kl-jp-jr-pass-1.jpg",
      "/images/klook/kl-jp-jr-pass-2.jpg",
    ],
    description:
      "JR PASS 全國版讓你在效期內無限次搭乘幾乎所有 JR 路線，包括新幹線在內。從東京到京都、大阪、廣島、博多，跨城市暢遊日本。透過 Klook 可選台灣取件，一落地就能使用。",
    features: [
      "新幹線（部分除外）無限搭乘",
      "涵蓋東京至九州全線 JR",
      "7 日 / 14 日 / 21 日效期",
      "含部分 JR 巴士路線",
      "可選台灣取件，落地即用",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/1384/"),
  },
  {
    id: "kl-jp-shibuya-sky",
    countryId: "japan",
    regionLabel: "東京・澀谷",
    badge: "打卡必去",
    category: "展望台",
    title: "澀谷 SHIBUYA SKY 展望台門票",
    subtitle: "露天屋頂 · 360° 全景 · 夜景無敵",
    priceLabel: "TWD 580 起",
    footer: "電子票 · 即買即用",
    images: [
      "/images/klook/kl-jp-shibuya-sky-1.jpg",
      "/images/klook/kl-jp-shibuya-sky-2.jpg",
    ],
    description:
      "SHIBUYA SKY 位於澀谷 Scramble Square 46 樓，360° 露天無障礙視野，白天可遠眺富士山與東京鐵塔，夜晚俯瞰澀谷五叉路口萬燈燈海，是 IG 網美的終極打卡聖地。",
    features: [
      "46F 露天展望台・360° 無死角",
      "可同時看見富士山、東京鐵塔、晴空塔",
      "白天夜晚各有千秋",
      "全球頂尖 IG 打卡地點",
      "電子票直接入場",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/44295/"),
  },

  /* ====== 韓國 ====== */
  {
    id: "kl-kr-everland",
    countryId: "korea",
    regionLabel: "首爾近郊",
    badge: "韓國最大樂園",
    category: "主題樂園",
    title: "愛寶樂園 Everland 門票",
    subtitle: "T EXPRESS 世界最陡木製雲霄飛車 · 四季花園",
    priceLabel: "TWD 920 起",
    footer: "QR Code 電子入場 · 四季限定活動",
    images: [
      "/images/klook/kl-kr-everland-1.jpg",
      "/images/klook/kl-kr-everland-2.jpg",
    ],
    description:
      "愛寶樂園（Everland）是韓國最大主題樂園，T EXPRESS 木製雲霄飛車傲居全球最陡前列，Safari World 可近距離觀賞野生動物，春夏秋冬各有花海・水樂園・楓葉・雪景限定活動。",
    features: [
      "T EXPRESS 全球最陡木製雲霄飛車",
      "Safari World 野生動物園",
      "春夏秋冬四季限定活動",
      "韓國最大主題樂園",
      "QR Code 電子票，免排隊",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/2914/"),
  },
  {
    id: "kl-kr-lotte-world",
    countryId: "korea",
    regionLabel: "首爾・松坡",
    badge: "必玩",
    category: "主題樂園",
    title: "樂天世界 Lotte World 門票",
    subtitle: "全球最大室內主題樂園 · 全天候不怕天氣",
    priceLabel: "TWD 780 起",
    footer: "電子票 · 24h 室內樂園",
    images: [
      "/images/klook/kl-kr-lotte-world-1.jpg",
      "/images/klook/kl-kr-lotte-world-2.jpg",
    ],
    description:
      "樂天世界是全球最大室內主題樂園，無論晴雨都可暢玩。園內有刺激雲霄飛車、溜冰場及韓國民俗博物館，戶外魔法島嶼夜間燈光秀更是必看。蠶室站直連，交通超方便。",
    features: [
      "全球最大室內主題樂園",
      "️ 室內溜冰場體驗",
      "️ 韓國民俗博物館",
      "戶外魔法島嶼夜間燈光秀",
      "蠶室站直達，交通超便利",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/2948/"),
  },
  {
    id: "kl-kr-n-seoul-tower",
    countryId: "korea",
    regionLabel: "首爾・南山",
    badge: "首爾地標",
    category: "展望台",
    title: "N 首爾塔 N Seoul Tower 門票",
    subtitle: "首爾最具代表性地標 · 愛情鎖 · 浪漫夜景",
    priceLabel: "TWD 320 起",
    footer: "含纜車 · 電子票",
    images: [
      "/images/klook/kl-kr-n-seoul-tower-1.jpg",
      "/images/klook/kl-kr-n-seoul-tower-2.jpg",
    ],
    description:
      "N 首爾塔是首爾最具代表性的地標，俯瞰整個首爾盆地的 360° 全景展望台日夜皆美。戶外平台的「愛情鎖」更是情侶必訪打卡點，下方南山公園秋楓與冬雪景色如畫。",
    features: [
      "首爾最具代表性地標",
      "愛情鎖・情侶打卡勝地",
      "360° 首爾全景展望台",
      "可含南山纜車套票",
      "夜景璀璨，夕陽時分最美",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/2930/"),
  },
  {
    id: "kl-kr-nami-island",
    countryId: "korea",
    regionLabel: "春川・南怡島",
    badge: "浪漫首選",
    category: "一日遊",
    title: "南怡島 + 小法國村一日遊",
    subtitle: "冬季戀歌拍攝地 · 法式夢幻小村",
    priceLabel: "TWD 980 起",
    footer: "含來回船票 · 中文導遊",
    images: [
      "/images/klook/kl-kr-nami-island-1.jpg",
      "/images/klook/kl-kr-nami-island-2.jpg",
    ],
    description:
      "南怡島以筆直的白楊木大道聞名全球，是韓劇《冬季戀歌》拍攝地，春夏秋冬各有絕色。小法國村以法式彩色建築為特色，童話風格超適合拍照。行程含來回渡輪及中文導遊。",
    features: [
      "冬季戀歌拍攝地・浪漫白楊大道",
      "含南怡島來回渡輪船票",
      "小法國村・夢幻法式建築",
      "四季限定景色",
      "️ 中文導遊・台灣集合出發",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/3807/"),
  },
  {
    id: "kl-kr-gyeongbok",
    countryId: "korea",
    regionLabel: "首爾・景福宮",
    category: "文化體驗",
    title: "景福宮門票 + 韓服租借體驗",
    subtitle: "朝鮮王朝宮殿 · 穿韓服免費入場",
    priceLabel: "TWD 320 起",
    footer: "電子票 · 穿韓服免門票",
    images: [
      "/images/klook/kl-kr-gyeongbok-1.jpg",
      "/images/klook/kl-kr-gyeongbok-2.jpg",
    ],
    description:
      "景福宮是朝鮮王朝規模最宏大的宮殿，以北嶽山為背景氣勢磅礴。穿著韓服可免費入場，在傳統宮殿建築前拍照留念。附近還有北村韓屋村與仁王市場可同日探索。",
    features: [
      "朝鮮王朝最大宮殿",
      "穿韓服可免費入場景福宮",
      "宮殿 × 北嶽山絕美背景",
      "️ 鄰近北村韓屋村",
      "定時守門將交接式表演",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/11731/"),
  },
  {
    id: "kl-kr-busan-tour",
    countryId: "korea",
    regionLabel: "釜山",
    badge: "釜山必訪",
    category: "一日遊",
    title: "釜山精華一日遊",
    subtitle: "甘川文化村 · 海雲台 · 廣安里海水浴場",
    priceLabel: "TWD 680 起",
    footer: "中文導遊 · 來回接送",
    images: [
      "/images/klook/kl-kr-busan-tour-1.jpg",
      "/images/klook/kl-kr-busan-tour-2.jpg",
    ],
    description:
      "釜山精華一日遊帶你走遍彩虹色的甘川文化村、海雲台白沙海灘、廣安里大橋夜景、扎嘎其市場海鮮、BIFF 廣場等釜山必訪景點，全程中文導遊，輕鬆又充實。",
    features: [
      "甘川文化村・彩虹山城打卡",
      "️ 海雲台白沙海灘・釜山地標",
      "廣安里大橋夜景",
      "扎嘎其市場道地海鮮",
      "️ 全程中文導遊・輕鬆暢遊",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/3809/"),
  },
  {
    id: "kl-kr-jeju",
    countryId: "korea",
    regionLabel: "濟州島",
    category: "一日遊",
    title: "濟州島東部精華一日遊",
    subtitle: "城山日出峰 · 涉地可支 · 城邑民俗村",
    priceLabel: "TWD 650 起",
    footer: "小團精緻 · 中文導遊",
    images: [
      "/images/klook/kl-kr-jeju-1.jpg",
      "/images/klook/kl-kr-jeju-2.jpg",
    ],
    description:
      "濟州島東部一日遊帶你走訪世界遺產城山日出峰、火山玄武岩海岸涉地可支、保存完整的城邑民俗村，感受濟州獨特的火山地貌與傳統石頭屋文化，全程舒適小團出遊。",
    features: [
      "城山日出峰 UNESCO 世界遺產",
      "涉地可支・玄武岩海岸奇景",
      "️ 城邑民俗村・傳統石頭屋",
      "濟州馬體驗（視行程）",
      "️ 中文導遊・精緻小團",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/3808/"),
  },
  {
    id: "kl-kr-ktx",
    countryId: "korea",
    regionLabel: "首爾・釜山",
    category: "鐵道票券",
    title: "首爾 ↔ 釜山 KTX 高速火車票",
    subtitle: "最快 2.5 小時直達 · 舒適指定座",
    priceLabel: "TWD 650 起",
    footer: "電子票券 · 指定座位",
    images: [
      "/images/klook/kl-kr-ktx-1.jpg",
      "/images/klook/kl-kr-ktx-2.jpg",
    ],
    description:
      "KTX 韓國高速鐵路連接首爾與釜山，最快僅需 2 小時 30 分鐘。寬敞舒適車廂配合指定對號座，是往返兩大城市的首選。透過 Klook 預訂，電子票券直接上車，免現場排隊。",
    features: [
      "首爾至釜山最快 2.5 小時",
      "指定對號座，寬敞舒適",
      "電子票券，免排隊上車",
      "可提前預訂黃金班次",
      "可選含釜山景點組合票",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/2930/"),
  },
  {
    id: "kl-kr-seoul-city-pass",
    countryId: "korea",
    regionLabel: "首爾",
    badge: "超值通票",
    category: "景點通票",
    title: "首爾通票 DISCOVER SEOUL PASS",
    subtitle: "100+ 景點免費 · 含地鐵無限搭",
    priceLabel: "TWD 650 起",
    footer: "24/48/72 小時 · 外國旅客專屬",
    images: [
      "/images/klook/kl-kr-seoul-city-pass-1.jpg",
      "/images/klook/kl-kr-seoul-city-pass-2.jpg",
    ],
    description:
      "Discover Seoul Pass 是首爾最超值的景點通票，涵蓋 N 首爾塔、景福宮、昌德宮、漢江遊船、樂天世界水族館等 100+ 景點，並附首爾地鐵無限搭功能，一卡在手輕鬆暢遊首爾。",
    features: [
      "N 首爾塔・景福宮・昌德宮等 100+ 景點",
      "首爾地鐵無限搭（含機場鐵路）",
      "含樂天世界水族館等熱門設施",
      "漢江遊船體驗",
      "24/48/72 小時彈性選擇",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/2930/"),
  },
  {
    id: "kl-kr-t-money",
    countryId: "korea",
    regionLabel: "全韓國",
    badge: "必備交通",
    category: "交通票券",
    title: "T-money 交通卡 | 韓國自由行必備",
    subtitle: "地鐵・公車・計程車・便利商店全通用",
    priceLabel: "TWD 190 起",
    footer: "台灣取件 · 無使用期限",
    images: [
      "/images/klook/kl-kr-t-money-1.jpg",
      "/images/klook/kl-kr-t-money-2.jpg",
    ],
    description:
      "T-money 卡是韓國最通用的交通卡，覆蓋全韓地鐵、公車、計程車，甚至 GS25、CU 便利商店都能消費。透過 Klook 購買可選台灣取件，落地即用，搭乘大眾交通享轉乘優惠。",
    features: [
      "全韓地鐵・公車・計程車通用",
      "GS25、CU 便利商店可用",
      "搭乘大眾運輸享轉乘折扣",
      "可多次加值，無使用期限",
      "️ 台灣取件，落地即用不排隊",
    ],
    url: aff("https://www.klook.com/zh-TW/activity/2930/"),
  },
];

const PREVIEW_COUNT = 4;
const CAROUSEL_INTERVAL_MS = 4000;
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=960&q=85";

function uniqueImages(images, max = 2) {
  return [...new Set((images || []).filter(Boolean))].slice(0, max);
}

/* ─────────────────────────────────────────────── */
/* 雙圖輪播                                        */
/* ─────────────────────────────────────────────── */
function DualImageCarousel({
  images,
  alt,
  aspectClass = "aspect-[4/3]",
  roundedClass = "",
  showArrows = false,
}) {
  const slides = uniqueImages(images);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, CAROUSEL_INTERVAL_MS);
  }, [slides.length]);

  useEffect(() => {
    setIdx(0);
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [slides, startTimer]);

  const go = (dir) => {
    setIdx((i) => (i + dir + slides.length) % slides.length);
    startTimer();
  };

  return (
    <div
      className={[
        "relative w-full bg-slate-100 overflow-hidden select-none",
        aspectClass,
        roundedClass,
      ].join(" ")}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={`${slides[idx]}-${idx}`}
          src={slides[idx]}
          alt={alt}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
      </AnimatePresence>

      {showArrows && slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            aria-label="上一張"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            aria-label="下一張"
          >
            ›
          </button>
        </>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIdx(i);
                startTimer();
              }}
              className={[
                "h-1.5 rounded-full transition-all",
                i === idx ? "w-4 bg-white" : "w-1.5 bg-white/50",
              ].join(" ")}
              aria-label={`第 ${i + 1} 張`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/* 詳細 Modal                                      */
/* ─────────────────────────────────────────────── */
function TicketModal({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          className="relative w-full sm:max-w-xl max-h-[92vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
        >
          <DualImageCarousel
            images={item.images}
            alt={item.title}
            aspectClass="aspect-[16/9] bg-slate-900"
            roundedClass="rounded-t-2xl"
            showArrows
          />

          <div className="overflow-y-auto flex-1 px-5 pt-4 pb-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-[11px] font-bold text-[#00B259] bg-green-50 px-2 py-0.5 rounded-full">
                {item.category}
              </span>
              <span className="text-[11px] text-gray-400">{item.regionLabel}</span>
              {item.badge && (
                <span className="text-[11px] font-bold text-[#00B259] bg-green-100 px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>

            <h2 className="text-lg font-black text-gray-900 leading-snug mb-1">
              {item.title}
            </h2>
            <p className="text-sm text-gray-500 mb-3">{item.subtitle}</p>

            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              {item.description}
            </p>

            {item.features?.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  票券特色
                </p>
                <ul className="space-y-1.5">
                  {item.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="shrink-0 text-[#00B259] mt-1">·</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item.location && (
              <KlookLocationMap location={item.location} className="mb-2" />
            )}
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <p className="text-[11px] text-gray-400">最低價格</p>
                <p className="text-xl font-black text-gray-900">{item.priceLabel}</p>
              </div>
              <p className="text-[11px] text-gray-500 text-right leading-snug max-w-[45%]">
                {item.footer}
              </p>
            </div>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block w-full text-center py-4 rounded-xl bg-[#00B259] hover:bg-[#009f4f] text-white text-base font-black shadow-lg transition-colors"
            >
              前往 Klook 立即購票
            </a>

            <p className="mt-2 text-center text-[10px] text-gray-400">
              聯盟行銷連結 · 票價以 Klook 官網即時顯示為準
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center text-lg leading-none transition"
            aria-label="關閉"
          >
            ×
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────── */
/* 商品 Card                                       */
/* ─────────────────────────────────────────────── */
function KlookCard({ item, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-[#00B259]/25 transition-all duration-200 overflow-hidden h-full text-left w-full cursor-pointer"
    >
      <div className="relative overflow-hidden">
        <DualImageCarousel
          images={item.images}
          alt={item.title}
          aspectClass="aspect-[4/3]"
        />
        <span className="absolute top-2.5 left-2.5 z-10 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white">
          {item.regionLabel}
        </span>
        {item.badge && (
          <span className="absolute top-2.5 right-2.5 z-10 rounded-md bg-[#00B259] px-2 py-0.5 text-[10px] font-bold text-white">
            {item.badge}
          </span>
        )}
        <span className="absolute bottom-2.5 left-2.5 z-10 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700">
          {item.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        <p className="text-[11px] text-gray-400 line-clamp-1">{item.subtitle}</p>
        <h3 className="mt-1 text-[15px] font-black text-gray-900 leading-snug line-clamp-2 min-h-[2.5rem]">
          {item.title}
        </h3>

        <div className="mt-3 flex items-center gap-1.5 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00B259] text-[9px] font-black text-white">
            KL
          </span>
          <span className="text-base font-black text-gray-900">{item.priceLabel}</span>
        </div>

        <div className="mt-3 border-t border-gray-100 pt-2.5 flex items-center justify-between gap-2">
          <p className="text-[10px] text-gray-400 line-clamp-1 flex-1">{item.footer}</p>
          <span className="shrink-0 text-[10px] font-bold text-[#00B259] group-hover:underline">
            查看詳情 →
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/* 主元件                                           */
/* ─────────────────────────────────────────────── */
export default function KlookTicketSection() {
  const [activeTab, setActiveTab] = useState("japan");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    if (activeTab === "japan") {
      return KLOOK_JP_TICKETS.map((t) => ({ ...t, url: aff(t.url) }));
    }
    return TICKETS.filter((t) => t.countryId === activeTab);
  }, [activeTab]);

  const displayItems = showAll ? filtered : filtered.slice(0, PREVIEW_COUNT);

  const listingUrl =
    activeTab === "japan"
      ? aff("https://www.klook.com/zh-TW/country/jp-japan/")
      : aff("https://www.klook.com/zh-TW/country/kr-south-korea/");

  return (
    <section
      id="klook-ticket-recommend"
      className="w-full bg-[#f0f1f3] pb-12 lg:pb-16 pt-4 scroll-mt-28"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* 標題 */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Jeko <span className="text-[#00B259]">×</span> Klook
            </h2>
            <span className="text-base font-semibold text-gray-500">
              熱門體驗 / 一日遊推薦
            </span>
          </div>
          <a
            href={listingUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="text-sm font-bold text-[#00B259] hover:underline shrink-0"
          >
            查看 Klook 更多體驗 →
          </a>
        </div>

        {/* 國家 Tab */}
        <div className="flex flex-wrap gap-2 mb-8">
          {COUNTRY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setShowAll(false);
              }}
              className={[
                "rounded-full px-4 py-2 text-sm font-bold transition-all duration-200",
                activeTab === tab.id
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 手機版輪播 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`mobile-${activeTab}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="md:hidden"
          >
            <MobileCardCarousel slideClassName="min-w-0 flex-[0_0_82%]">
              {filtered.map((item) => (
                <KlookCard
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </MobileCardCarousel>
          </motion.div>
        </AnimatePresence>

        {/* 桌面版網格 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`desktop-${activeTab}-${showAll}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5"
          >
            {displayItems.map((item) => (
              <KlookCard
                key={item.id}
                item={item}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* 按鈕列 */}
        <div className="mt-8 hidden md:flex items-center justify-center gap-4 flex-wrap">
          {!showAll && filtered.length > PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex items-center justify-center min-w-[180px] px-8 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-bold hover:border-gray-300 transition-colors"
            >
              顯示全部 {filtered.length} 筆 ↓
            </button>
          )}
          <a
            href={listingUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center justify-center min-w-[180px] px-8 py-3.5 rounded-xl bg-[#00B259] text-white text-sm font-bold shadow-md hover:bg-[#009f4f] transition-colors"
          >
            Klook 查看更多體驗
          </a>
        </div>

        <p className="mt-5 text-center text-[11px] text-gray-400 max-w-lg mx-auto leading-relaxed">
          本區為 Jeko eSIM 與 Klook 聯盟行銷合作連結，點擊購買後 Jeko 可能獲得推薦佣金。票價以 Klook 官網即時顯示為準。
        </p>
      </div>

      {selectedItem && (
        <TicketModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </section>
  );
}
