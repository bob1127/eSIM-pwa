/**
 * Klook 日本商品資料（由 klook.xlsx 匯入）
 * 欄位：名稱 | 圖片 | 分潤連結 | 價格 | 描述
 * 圖片放在 public/images/klook/jp/
 */
export const KLOOK_JP_TICKETS = [
  {
    id: "kl-jp-usj",
    countryId: "japan",
    regionLabel: "大阪・此花區",
    badge: "熱銷 No.1",
    category: "主題樂園",
    title: "日本環球影城門票 Universal Studios Japan",
    subtitle: "QR Code 直接入園 · 超級任天堂世界™",
    priceLabel: "NT$ 1,229 起",
    footer: "立即確認 · 電子票券",
    images: [
      "/images/klook/jp/日本環球影城門票 Universal Studios Japan.png",
    ],
    description:
      "日本環球影城（USJ）是大阪最受歡迎的主題樂園。走進超級任天堂世界™、哈利波特魔法世界™、小小兵樂園與侏儸紀公園，每個角落都充滿探險奇趣。透過 Klook 提前購票，免排隊入園超過 60 個設施，省時又省力。",
    features: [
      "超級任天堂世界™：身歷其境的瑪利歐主題世界",
      "咚奇剛的瘋狂礦車™ 等必玩遊樂設施",
      "哈利波特魔法世界™、小小兵樂園、侏儸紀公園",
      "QR Code 直接入園，免現場排隊購票",
      "票價依日期而異，建議行前查看並提前預訂",
    ],
    url: "https://affiliate.klook.com/redirect?aid=125977&aff_adid=1333304&k_site=https%3A%2F%2Fwww.klook.com%2Fzh-TW%2Factivity%2F46604-universal-studios-japan-e-ticket-osaka-qr-code-direct-entry",
    location: {
      name: "日本環球影城 Universal Studios Japan",
      address: "〒554-0031 大阪府大阪市此花區櫻島2丁目1-33",
      lat: 34.6655022,
      lng: 135.4322802,
    },
  },
];
