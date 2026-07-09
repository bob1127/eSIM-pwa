"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MobileCardCarousel from "./MobileCardCarousel";

/* ─────────────────────────────────────────────── */
/* 工具函式                                         */
/* ─────────────────────────────────────────────── */
const CID = "25559";
function aff(url) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}cid=${CID}`;
}

/* ─────────────────────────────────────────────── */
/* Tab 定義                                         */
/* ─────────────────────────────────────────────── */
const COUNTRY_TABS = [
  { id: "japan", label: "日本 🇯🇵" },
  { id: "korea", label: "韓國 🇰🇷" },
];

/* ─────────────────────────────────────────────── */
/* 商品資料（每筆含多圖）                            */
/* ─────────────────────────────────────────────── */
const TICKETS = [
  /* ====== 日本 ====== */
  {
    id: "jp-usj",
    countryId: "japan",
    regionLabel: "大阪",
    badge: "熱銷 No.1",
    category: "主題樂園",
    title: "日本環球影城門票 Universal Studios Japan",
    subtitle: "官方授權・QR Code 即掃即入",
    priceLabel: "TWD 1,826 起",
    footer: "立即確認 · 電子票券 · 300K+ 已訂購",
    images: [
      "/images/kkday/jp-usj-1.jpg",
      "/images/kkday/jp-usj-2.jpg",
    ],
    description:
      "日本環球影城（USJ）是大阪最受歡迎的主題樂園，以好萊塢電影為題材，打造超級任天堂世界™、哈利波特魔法世界™、小小兵樂園、侏羅紀公園等多個超人氣園區。透過 KKday 購買官方授權電子票，訂購後立即取得 QR Code，現場直接掃碼入園，省去排隊購票的麻煩！",
    features: [
      "🎢 超級任天堂世界™、哈利波特魔法世界™",
      "📱 QR Code 電子票，免排隊直接入園",
      "📅 可在效期內彈性選擇入園日期",
      "⚡ 可加購快速通關 Express Pass",
      "✅ 官方授權，KKday 獨家優惠",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/2247-universal-studios-japan-ticket-osaka",
    ),
  },
  {
    id: "jp-shibuya-sky",
    countryId: "japan",
    regionLabel: "東京・澀谷",
    badge: "打卡必去",
    category: "展望台",
    title: "澀谷 SHIBUYA SKY 展望台門票",
    subtitle: "露天屋頂・360° 全景・澀谷街頭俯瞰",
    priceLabel: "TWD 580 起",
    footer: "電子票券 · 即買即用",
    images: [
      "/images/kkday/jp-shibuya-sky-1.jpg",
      "/images/kkday/jp-shibuya-sky-2.jpg",
    ],
    description:
      "位於澀谷 Scramble Square 46 樓的 SHIBUYA SKY，是東京最熱門的露天展望台。360° 無遮擋全景視野，白天可飽覽富士山與東京鐵塔，夜晚則是澀谷五叉路口的璀璨燈海。是 IG 打卡的終極聖地！",
    features: [
      "🌆 46F 露天頂樓・360° 全景無死角",
      "🗼 可同時看見富士山、東京鐵塔、晴空塔",
      "🌃 白天夜晚景觀各有千秋",
      "📸 網美熱門打卡地點",
      "📱 電子票券直接入場",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/133300-shibuya-sky-observatory-e-ticket-tokyo",
    ),
  },
  {
    id: "jp-tokyo-pass",
    countryId: "japan",
    regionLabel: "東京",
    badge: "超值CP值",
    category: "景點通票",
    title: "東京通票 THE TOKYO PASS",
    subtitle: "50+ 景點免費入場・含東京鐵塔・森美術館",
    priceLabel: "TWD 1,104 起",
    footer: "180 天有效 · 電子票券",
    images: [
      "/images/kkday/jp-tokyo-pass-1.jpg",
      "/images/kkday/jp-tokyo-pass-2.jpg",
    ],
    description:
      "THE TOKYO PASS 涵蓋 50+ 東京必訪文化景點，包括東京鐵塔、東京國立博物館、新宿御苑、上野動物園、銀座藝術水族館、SMALL WORLDS、森美術館等。一票暢遊，180 天內有效，讓你輕鬆安排東京多日行程。",
    features: [
      "🏙️ 涵蓋 50+ 東京熱門景點",
      "🗼 含東京鐵塔 Main Deck 150m 展望台",
      "🐟 含銀座藝術水族館 ART AQUARIUM",
      "🌳 新宿御苑・上野動物園・森美術館",
      "📅 180 天內有效，彈性安排行程",
    ],
    url: aff("https://www.kkday.com/zh-tw/product/269798"),
  },
  {
    id: "jp-disney",
    countryId: "japan",
    regionLabel: "東京・千葉",
    badge: "夢幻首選",
    category: "主題樂園",
    title: "東京迪士尼樂園 & 東京迪士尼海洋門票",
    subtitle: "夢幻城堡・海洋奇觀・魔法全日體驗",
    priceLabel: "TWD 1,800 起",
    footer: "電子票券 · 可選日期",
    images: [
      "/images/kkday/jp-disney-1.jpg",
      "/images/kkday/jp-disney-2.jpg",
    ],
    description:
      "東京迪士尼樂園與東京迪士尼海洋，是東亞最受歡迎的主題樂園，每年吸引超過 3,000 萬遊客。選擇 1-Day Passport 或跨兩園的 Park Hopper Passport，透過 KKday 購票享電子 QR Code，直接掃碼入場，免現場排隊購票。",
    features: [
      "🏰 夢幻城堡・灰姑娘城堡地標",
      "🌊 東京迪士尼海洋獨特海洋風情",
      "🎭 星際旅行、幽靈公館、小熊維尼等設施",
      "🍭 豐富的迪士尼主題美食與商品",
      "📱 電子票券，選定日期直接入場",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/19252-tokyo-disney-resort-disneyland-disneysea",
    ),
  },
  {
    id: "jp-city-pass",
    countryId: "japan",
    regionLabel: "東京",
    category: "地鐵＋景點通票",
    title: "TOKYO CITY PASS 地鐵＋景點通票",
    subtitle: "地鐵無限搭 + teamLab / 東京鐵塔 / 哈利波特擇一",
    priceLabel: "TWD 900 起",
    footer: "1日/2日/3日 · 電子票券",
    images: [
      "/images/kkday/jp-city-pass-1.jpg",
      "/images/kkday/jp-city-pass-2.jpg",
    ],
    description:
      "TOKYO CITY PASS 整合東京地鐵無限搭（24/48/72 小時）與多項 S 級人氣景點，一張通票搞定交通與門票。可選 teamLab Planets、東京鐵塔、六本木之丘、陽光水族館或哈利波特製片廠之旅。",
    features: [
      "🚇 東京地鐵全線無限次搭乘",
      "🎨 可選 teamLab Planets 數位藝術展",
      "🗼 可選東京鐵塔 Main Deck 展望台",
      "🎬 可選哈利波特製片廠之旅",
      "💰 享 60~80% 優惠，超高 CP 值",
    ],
    url: aff("https://www.kkday.com/zh-tw/product/279586"),
  },
  {
    id: "jp-jr-pass",
    countryId: "japan",
    regionLabel: "全日本",
    badge: "長途旅行必備",
    category: "鐵路周遊券",
    title: "全日本鐵路通票 JR PASS 全國版",
    subtitle: "新幹線無限搭・東京到九州自由行最強票券",
    priceLabel: "TWD 12,000 起",
    footer: "7/14/21 日 · 電子憑證兌換",
    images: [
      "/images/kkday/jp-jr-pass-1.jpg",
      "/images/kkday/jp-jr-pass-2.jpg",
    ],
    description:
      "JR PASS 全國版讓你在效期內無限次搭乘幾乎所有 JR 路線，包括東海道、山陽新幹線等高速列車。從東京到京都、大阪、廣島、博多，暢遊日本各城市，是跨城市長途旅遊的最佳選擇。",
    features: [
      "🚄 新幹線（部分除外）無限搭乘",
      "🗾 涵蓋東京至九州全線 JR 路線",
      "📅 7 日 / 14 日 / 21 日多種效期",
      "🚌 含部分 JR 巴士路線",
      "💼 適合多城市跨地區旅遊",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/20291-all-japan-rail-pass-with-delivery-to-taiwan-hong-kong-south-korea-singapore",
    ),
  },
  {
    id: "jp-haruka",
    countryId: "japan",
    regionLabel: "大阪・關西",
    category: "機場交通",
    title: "關西機場特快 HARUKA 車票",
    subtitle: "關西機場直達大阪・京都・神戶",
    priceLabel: "TWD 480 起",
    footer: "電子憑證 · 外國旅客限定折扣",
    images: [
      "/images/kkday/jp-haruka-1.jpg",
      "/images/kkday/jp-haruka-2.jpg",
    ],
    description:
      "HARUKA 特急列車是往返關西國際機場最便捷的交通工具，直達大阪梅田（難波）、京都、神戶等市中心。外國旅客可享專屬折扣票，相較現場購票更優惠，訂購後直接憑 QR Code 上車。",
    features: [
      "✈️ 關西機場直達大阪・京都・神戶",
      "⏱️ 京都最短約 75 分鐘直達",
      "💺 指定席・對號入座",
      "🎫 外國旅客專屬折扣票",
      "📱 電子憑證・免換票直接上車",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/18940-kansai-airport-haruka-ticket-japan",
    ),
  },
  {
    id: "jp-osaka-pass",
    countryId: "japan",
    regionLabel: "大阪",
    category: "景點通票",
    title: "大阪周遊卡 OSAKA AMAZING PASS",
    subtitle: "大阪城・海遊館・通天閣等 40+ 景點免費",
    priceLabel: "TWD 680 起",
    footer: "1日/2日 · 電子票",
    images: [
      "/images/kkday/jp-osaka-pass-1.jpg",
      "/images/kkday/jp-osaka-pass-2.jpg",
    ],
    description:
      "大阪周遊卡（OSAKA AMAZING PASS）是暢遊大阪最超值的選擇，涵蓋 40+ 景點免費入場，包含大阪城、海遊館水族館、通天閣等。並附大阪地鐵及巴士無限搭乘，一日玩透大阪。",
    features: [
      "🏯 大阪城天守閣免費入場",
      "🐬 海遊館水族館（世界頂級水族館之一）",
      "🗼 通天閣展望台・夕陽之塔",
      "🚇 大阪市地鐵巴士無限搭乘",
      "💯 40+ 設施・1 日 / 2 日券",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/12156-osaka-amazing-pass-e-ticket-japan",
    ),
  },
  {
    id: "jp-skyliner",
    countryId: "japan",
    regionLabel: "東京・成田",
    badge: "機場接駁",
    category: "機場交通",
    title: "Skyliner 京成電鐵車票",
    subtitle: "成田機場直達上野・淺草・押上",
    priceLabel: "TWD 360 起",
    footer: "電子憑證 · 最速 36 分",
    images: [
      "/images/kkday/jp-skyliner-1.jpg",
      "/images/kkday/jp-skyliner-2.jpg",
    ],
    description:
      "Skyliner 是成田機場到東京市區最快的交通工具，最短 36 分鐘直達上野，全程對號座、行李可帶上車，讓你抵達日本第一步就舒適便捷。搭配地鐵券套票更省錢。",
    features: [
      "🛫 成田機場直達東京上野、淺草",
      "⚡ 最短 36 分鐘，全日本最快機場列車",
      "💺 指定對號座，行李帶上車",
      "🎫 可搭配東京地鐵券套票",
      "📱 電子憑證，免排隊購票",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/7913-keisei-skyliner-narita-airport-express-ticket",
    ),
  },
  {
    id: "jp-odaiba",
    countryId: "japan",
    regionLabel: "東京・台場",
    category: "景點通票",
    title: "台場週遊券",
    subtitle: "東京歡樂城・小小世界・杜莎蠟像館",
    priceLabel: "TWD 380 起",
    footer: "1日/2日 · 最高 55% OFF",
    images: [
      "/images/kkday/jp-odaiba-1.jpg",
      "/images/kkday/jp-odaiba-2.jpg",
    ],
    description:
      "台場週遊券讓你以超值票價暢遊台場多個熱門景點，包括東京歡樂城、SMALL WORLDS 縮小版世界、章魚燒博物館、電信中心展望台、東京杜莎夫人蠟像館等，最高享 55% 折扣。",
    features: [
      "🎢 東京歡樂城・沉浸式雲霄飛車體驗",
      "🌍 SMALL WORLDS 全球縮小世界",
      "🐙 台場章魚燒博物館道地美食",
      "🏙️ 電信中心展望台・城市全景",
      "💫 最高享 55% OFF 超值折扣",
    ],
    url: aff("https://www.kkday.com/zh-tw/product/164762"),
  },

  /* ====== 韓國 ====== */
  {
    id: "kr-tmoney",
    countryId: "korea",
    regionLabel: "全韓國",
    badge: "必備交通",
    category: "交通票券",
    title: "T-money Card 交通卡｜韓國自由行必備",
    subtitle: "地鐵・公車・計程車・便利商店全通用",
    priceLabel: "TWD 190 起",
    footer: "台灣取件 · 無使用期限",
    images: [
      "/images/kkday/kr-tmoney-1.jpg",
      "/images/kkday/kr-tmoney-2.jpg",
    ],
    description:
      "T-money 卡是韓國最通用的交通卡，適用於首爾・釜山等全韓國地鐵、市區公車、計程車，甚至 GS25、CU、7-Eleven 便利商店消費也能使用。相較現金購票享轉乘優惠，是自由行必備神器。",
    features: [
      "🚇 全韓國地鐵・公車・計程車通用",
      "🏪 GS25、CU 便利商店消費可用",
      "💰 搭乘大眾運輸享轉乘折扣優惠",
      "🔋 可多次加值，無使用期限",
      "✈️ 台灣取件，落地即用不排隊",
    ],
    url: aff("https://www.kkday.com/zh-tw/product/149765"),
  },
  {
    id: "kr-seoul-busan-ktx",
    countryId: "korea",
    regionLabel: "首爾・釜山",
    category: "鐵道票券",
    title: "首爾－釜山 KTX 高速火車票",
    subtitle: "最快 2.5 小時直達釜山・高速舒適",
    priceLabel: "TWD 650 起",
    footer: "電子票券 · 指定座位",
    images: [
      "/images/kkday/kr-seoul-busan-ktx-1.jpg",
      "/images/kkday/kr-seoul-busan-ktx-2.jpg",
    ],
    description:
      "KTX 韓國高速鐵路連接首爾與釜山，最快約 2 小時 30 分鐘。舒適的座椅與寬敞車廂，是往返兩大城市的首選。透過 KKday 線上預訂，無需到現場排隊，電子票券直接上車。",
    features: [
      "🚄 首爾至釜山最快 2.5 小時",
      "💺 指定對號座，寬敞舒適車廂",
      "📱 電子票券，免排隊直接上車",
      "📅 可提前預訂，確保黃金班次",
      "🎒 可選組合套票含釜山景點門票",
    ],
    url: aff("https://www.kkday.com/zh-tw/product/536336"),
  },
  {
    id: "kr-korail-pass",
    countryId: "korea",
    regionLabel: "全韓國",
    badge: "彈性旅行",
    category: "鐵道周遊券",
    title: "KR PASS 韓國鐵道周遊券",
    subtitle: "KTX・ITX 無限搭・2/3/4/5 日自由選",
    priceLabel: "TWD 1,800 起",
    footer: "電子憑證 · 免服務費",
    images: [
      "/images/kkday/kr-korail-pass-1.jpg",
      "/images/kkday/kr-korail-pass-2.jpg",
    ],
    description:
      "KR PASS（KORAIL PASS）讓你在效期內無限次搭乘韓國鐵路，包含 KTX 高速列車、ITX 快速列車及各普通列車。計畫多城市旅遊——首爾、釜山、慶州、全州、江陵——一張通票輕鬆搞定。",
    features: [
      "🚄 KTX / ITX / 一般列車無限搭乘",
      "🗺️ 全韓國鐵路通用",
      "📅 2/3/4/5 日效期彈性選擇",
      "🧳 多城市旅行最省錢",
      "🎟️ 電子憑證，免換票直接使用",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/2930-korea-ktx-train-discounted-korail-day-pass",
    ),
  },
  {
    id: "kr-everland",
    countryId: "korea",
    regionLabel: "首爾近郊",
    badge: "韓國最大樂園",
    category: "主題樂園",
    title: "愛寶樂園 Everland 門票",
    subtitle: "韓國最大主題樂園・T EXPRESS 木製雲霄飛車",
    priceLabel: "TWD 920 起",
    footer: "QR Code 電子入場 · 四季活動",
    images: [
      "/images/kkday/kr-everland-1.jpg",
      "/images/kkday/kr-everland-2.jpg",
    ],
    description:
      "愛寶樂園（Everland）是韓國最大的主題樂園，擁有刺激的 T EXPRESS 木製雲霄飛車、動物王國 Safari World、室外花卉庭園與季節性活動（春賞鬱金香、夏水上樂園、秋楓葉、冬雪景）。",
    features: [
      "🎢 T EXPRESS 全球最陡木製雲霄飛車",
      "🦁 Safari World 野生動物園",
      "🌸 春夏秋冬四季不同限定活動",
      "🦊 韓國最大主題樂園",
      "📱 QR Code 電子票券，免排隊",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/2914-everland-theme-park-admission-ticket-korea",
    ),
  },
  {
    id: "kr-busan-pass",
    countryId: "korea",
    regionLabel: "釜山",
    badge: "釜山必備",
    category: "景點通票",
    title: "釜山通行證 VISIT BUSAN PASS",
    subtitle: "30+ 景點・含海岸列車・X the Sky・含交通卡",
    priceLabel: "TWD 480 起",
    footer: "BIG3/BIG5 · 外國旅客專屬",
    images: [
      "/images/kkday/kr-busan-pass-1.jpg",
      "/images/kkday/kr-busan-pass-2.jpg",
    ],
    description:
      "VISIT BUSAN PASS 涵蓋釜山 30+ 必玩景點，包含 X the Sky（最高展望台）、釜山海岸列車（Blueline Park）、松島海上纜車、遊艇體驗等。實體卡附 LOCA 交通卡功能，可搭乘釜山地鐵。",
    features: [
      "🏙️ X the Sky 釜山最高點 360° 展望",
      "🚂 海岸列車 Blueline Park 絕景路線",
      "🚠 松島海上纜車・俯瞰大海",
      "🚢 遊艇體驗・釜山港灣風光",
      "🚇 含 LOCA 交通卡功能搭地鐵",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/138477-visit-busan-pass-discount-free-attractions",
    ),
  },
  {
    id: "kr-namsan",
    countryId: "korea",
    regionLabel: "首爾・南山",
    category: "景點",
    title: "首爾中區旅遊通票",
    subtitle: "南山纜車・德壽宮・明洞街頭體驗",
    priceLabel: "TWD 380 起",
    footer: "QR Code 直接入場 · 電子票券",
    images: [
      "/images/kkday/kr-namsan-1.jpg",
      "/images/kkday/kr-namsan-2.jpg",
    ],
    description:
      "首爾中區通票涵蓋多個中區核心景點，包括搭乘南山纜車俯瞰首爾市景、參觀紙博物館與 Ground Seesaw Myeongdong 當代展覽、在太極堂等百年老店品嚐傳統點心，完整體驗首爾歷史文化魅力。",
    features: [
      "🚡 南山纜車・俯瞰首爾夜景",
      "🏯 德壽宮・朝鮮王朝歷史古蹟",
      "🛍️ 明洞購物街美食・街頭小吃",
      "🎨 Ground Seesaw Myeongdong 當代藝術展",
      "📱 KakaoTalk QR Code 直接入場",
    ],
    url: aff("https://www.kkday.com/zh-tw/product/285983"),
  },
  {
    id: "kr-lotte-world",
    countryId: "korea",
    regionLabel: "首爾・松坡",
    badge: "必玩",
    category: "主題樂園",
    title: "樂天世界 Lotte World 門票",
    subtitle: "全球最大室內主題樂園・冰場・民俗博物館",
    priceLabel: "TWD 780 起",
    footer: "電子票 · 24h 室內不怕天氣",
    images: [
      "/images/kkday/kr-lotte-world-1.jpg",
      "/images/kkday/kr-lotte-world-2.jpg",
    ],
    description:
      "樂天世界（Lotte World）是全球規模最大的室內主題樂園，無論晴雨都能遊玩。園內設有刺激的雲霄飛車與旋轉木馬，還有可供溜冰的冰場，以及展示韓國傳統文化的民俗博物館，適合全年齡同樂。",
    features: [
      "🎢 全球最大室內主題樂園・全天候",
      "⛸️ 室內溜冰場・獨特冰上體驗",
      "🏛️ 韓國民俗博物館・傳統文化展示",
      "🌙 室外魔法島嶼・夜間燈光秀",
      "📍 蠶室站直達，交通超方便",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/2948-lotte-world-ticket-seoul-korea",
    ),
  },
  {
    id: "kr-gyeongbok",
    countryId: "korea",
    regionLabel: "首爾・景福宮",
    category: "文化體驗",
    title: "景福宮門票＋韓服租借體驗",
    subtitle: "朝鮮王朝宮殿・穿韓服免費入場・絕美打卡",
    priceLabel: "TWD 320 起",
    footer: "電子票 · 穿韓服免門票",
    images: [
      "/images/kkday/kr-gyeongbok-1.jpg",
      "/images/kkday/kr-gyeongbok-2.jpg",
    ],
    description:
      "景福宮是朝鮮王朝規模最宏大的宮殿，北嶽山為背景，氣勢磅礴。穿著韓服可免費入場，在傳統宮殿建築前拍照留念，是首爾最具代表性的文化體驗。附近還有仁王市場與北村韓屋村可一起探索。",
    features: [
      "🏯 朝鮮王朝最大宮殿・歷史震撼",
      "👘 穿韓服可免費入場景福宮",
      "📸 宮殿前・北嶽山背景絕美拍照",
      "🏘️ 鄰近北村韓屋村、仁王市場",
      "🎭 定時有守門將交接式表演",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/11731-gyeongbokgung-palace-seohwa-hanbok-rental-seoul-south-korea",
    ),
  },
  {
    id: "kr-nami-island",
    countryId: "korea",
    regionLabel: "春川・南怡島",
    badge: "浪漫首選",
    category: "景點",
    title: "南怡島＋小法國村一日遊",
    subtitle: "冬季戀歌拍攝地・法式夢幻小村",
    priceLabel: "TWD 980 起",
    footer: "含來回船票 · 中文導遊",
    images: [
      "/images/kkday/kr-nami-island-1.jpg",
      "/images/kkday/kr-nami-island-2.jpg",
    ],
    description:
      "南怡島是韓劇《冬季戀歌》拍攝地，以筆直的白楊木大道聞名全球。春賞粉嫩油菜花、夏覽翠綠林蔭、秋看楓葉金黃、冬賞白雪皚皚，四季各有絕色。小法國村則以法式彩色建築為特色，童話感十足。",
    features: [
      "🌲 冬季戀歌拍攝地・浪漫白楊大道",
      "🚢 含南怡島來回渡輪船票",
      "🇫🇷 小法國村・夢幻法式童話建築",
      "🍂 四季限定景色・春花夏綠秋楓冬雪",
      "🗣️ 中文導遊・台灣出發集合",
    ],
    url: aff(
      "https://www.kkday.com/zh-tw/product/133956-nami-island-petite-france-village-korea",
    ),
  },
  {
    id: "kr-jeju-funpass",
    countryId: "korea",
    regionLabel: "濟州島",
    category: "景點通票",
    title: "濟州島 Fun Pass 景點通票",
    subtitle: "城山日出峰・偶來市場・濟州民俗村",
    priceLabel: "TWD 420 起",
    footer: "24/48/72 小時 · 靈活選擇",
    images: [
      "/images/kkday/kr-jeju-funpass-1.jpg",
      "/images/kkday/kr-jeju-funpass-2.jpg",
    ],
    description:
      "濟州島 Fun Pass 是暢遊濟州最省錢的方式，涵蓋城山日出峰（世界遺產）、濟州海女博物館、偶來市場、濟州民俗村等多個熱門景點，24/48/72 小時彈性效期，一人旅行也超划算。",
    features: [
      "🌋 城山日出峰 UNESCO 世界遺產",
      "🌊 濟州海女體驗・傳統文化",
      "🏘️ 濟州民俗村・傳統石頭屋",
      "⏱️ 24/48/72 小時彈性效期",
      "💰 比單買各景點票券省 30-40%",
    ],
    url: aff("https://www.kkday.com/zh-tw/product/573131"),
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
/* 雙圖輪播（Card / Modal 共用）                   */
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
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            aria-label="上一張"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
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
              onClick={() => {
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
        {/* 遮罩 */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* 視窗 */}
        <motion.div
          className="relative w-full sm:max-w-lg max-h-[92vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
        >
          {/* 圖片輪播 */}
          <DualImageCarousel
            images={item.images}
            alt={item.title}
            aspectClass="aspect-[16/9] bg-slate-900"
            roundedClass="rounded-t-2xl"
            showArrows
          />

          {/* 內容區（可捲動） */}
          <div className="overflow-y-auto flex-1 px-5 pt-4 pb-6">
            {/* 標籤 */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-[11px] font-bold text-[#0A6CD0] bg-blue-50 px-2 py-0.5 rounded-full">
                {item.category}
              </span>
              <span className="text-[11px] text-gray-400">
                {item.regionLabel}
              </span>
              {item.badge && (
                <span className="text-[11px] font-bold text-white bg-[#0A6CD0] px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>

            {/* 標題 */}
            <h2 className="text-lg font-black text-gray-900 leading-snug mb-1">
              {item.title}
            </h2>
            <p className="text-sm text-gray-500 mb-3">{item.subtitle}</p>

            {/* 價格 */}
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFD43A] text-[10px] font-black text-slate-800">
                KK
              </span>
              <span className="text-2xl font-black text-gray-900">
                {item.priceLabel}
              </span>
            </div>

            {/* 說明 */}
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {item.description}
            </p>

            {/* 特色列表 */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                票券特色
              </p>
              <ul className="space-y-1.5">
                {item.features.map((f, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* 購買按鈕 */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block w-full text-center py-4 rounded-xl bg-[#0A6CD0] hover:bg-[#095bb8] text-white text-base font-black shadow-lg transition-colors"
            >
              前往 KKday 立即購票 →
            </a>

            <p className="mt-3 text-center text-[10px] text-gray-400">
              聯盟行銷連結 · 票價以 KKday 官網即時顯示為準
            </p>
          </div>

          {/* 關閉按鈕 */}
          <button
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
function KKdayCard({ item, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-[#0A6CD0]/25 transition-all duration-200 overflow-hidden h-full text-left w-full cursor-pointer"
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
          <span className="absolute top-2.5 right-2.5 z-10 rounded-md bg-[#0A6CD0] px-2 py-0.5 text-[10px] font-bold text-white">
            {item.badge}
          </span>
        )}
        <span className="absolute bottom-2.5 left-2.5 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700 z-10">
          {item.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        <p className="text-[11px] text-gray-400 line-clamp-1">
          {item.subtitle}
        </p>
        <h3 className="mt-1 text-[15px] font-black text-gray-900 leading-snug line-clamp-2 min-h-[2.5rem]">
          {item.title}
        </h3>

        <div className="mt-3 flex items-center gap-1.5 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFD43A] text-[9px] font-black text-slate-800">
            KK
          </span>
          <span className="text-base font-black text-gray-900">
            {item.priceLabel}
          </span>
        </div>

        <div className="mt-3 border-t border-gray-100 pt-2.5 flex items-center justify-between gap-2">
          <p className="text-[10px] text-gray-400 line-clamp-1 flex-1">
            {item.footer}
          </p>
          <span className="shrink-0 text-[10px] font-bold text-[#0A6CD0] group-hover:underline">
            查看詳情 →
          </span>
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────── */
/* 主元件                                           */
/* ─────────────────────────────────────────────── */
export default function KKdayTicketSection() {
  const [activeTab, setActiveTab] = useState("japan");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(
    () => TICKETS.filter((t) => t.countryId === activeTab),
    [activeTab],
  );

  const displayItems = showAll ? filtered : filtered.slice(0, PREVIEW_COUNT);

  const listingUrl =
    activeTab === "japan"
      ? aff("https://www.kkday.com/zh-tw/destination/jp-japan")
      : aff("https://www.kkday.com/zh-tw/destination/kr-korea");

  return (
    <section
      id="kkday-ticket-recommend"
      className="w-full bg-[#f0f1f3] pb-12 lg:pb-16 pt-4 scroll-mt-28"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* 標題 */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Jeko <span className="text-[#0A6CD0]">×</span> KKday
            </h2>
            <span className="text-base font-semibold text-gray-500">
              門票 / 交通票券推薦
            </span>
          </div>
          <a
            href={listingUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="text-sm font-bold text-[#0A6CD0] hover:underline shrink-0"
          >
            查看 KKday 更多票券 →
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
                <KKdayCard
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
              <KKdayCard
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
            className="inline-flex items-center justify-center min-w-[180px] px-8 py-3.5 rounded-xl bg-[#0A6CD0] text-white text-sm font-bold shadow-md hover:bg-[#095bb8] transition-colors"
          >
            KKday 查看更多票券
          </a>
        </div>
      </div>

      {/* Modal */}
      {selectedItem && (
        <TicketModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </section>
  );
}
