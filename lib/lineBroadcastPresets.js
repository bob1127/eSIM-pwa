/** 首頁 Hero 輪播（Slider.jsx）與 Jeko 推薦區常用 DM 圖 */
export const LINE_HERO_DM_PRESETS = [
  {
    id: "hero-1",
    label: "首頁 Hero 主視覺",
    image: "/images/Hero-banner-01.png",
    url: "/",
  },
  {
    id: "hero-mobile",
    label: "首頁 Hero（手機版）",
    image: "/images/hero-banner-mobile.png",
    url: "/",
  },
  { id: "kyushu-dm", label: "九州 DM", image: "/images/九州.png", url: "/product/japan/" },
  {
    id: "japan-esim",
    label: "日本 eSIM 方案",
    image: "/images/日本eSIM方案.png",
    url: "/product/japan/",
  },
  {
    id: "korea-esim",
    label: "韓國原生 eSIM",
    image: "/images/韓國01.png",
    url: "/product/korea/korea-unlimited-esim/",
  },
  {
    id: "thailand-esim",
    label: "泰國原生 eSIM",
    image: "/images/泰國原生eSIM.png",
    url: "/product/thailand/thailand-unlimited-esim/",
  },
  {
    id: "china-esim",
    label: "中國 eSIM",
    image: "/images/中國.png",
    url: "/product/china/china-unlimited-esim/",
  },
  {
    id: "member-line-promo",
    label: "會員／LINE 優惠",
    image: "/images/加入會員_加入line官方_優惠-Jeko eSIM_多國旅遊eSIM.png",
    url: "/promo/",
  },
];

/** 一鍵帶入輪播商品（handle + 備援圖；Medusa 抓不到時仍可用） */
export const LINE_CAROUSEL_PRESETS = [
  {
    id: "japan-unlimited",
    label: "日本吃到飽",
    handle: "japan-unlimited-esim",
    fallbackImage: "/images/日本eSIM方案.png",
    url: "/product/japan/japan-unlimited-esim/",
  },
  {
    id: "kyushu-nolimit",
    label: "九州不限速",
    handle: "japan-unlimited-esim-nolimit",
    fallbackImage: "/images/九州01.png",
    url: "/product/japan/japan-unlimited-esim-nolimit/",
  },
  {
    id: "korea-unlimited",
    label: "韓國原生吃到飽",
    handle: "korea-unlimited-esim",
    fallbackImage: "/images/韓國01.png",
    url: "/product/korea/korea-unlimited-esim/",
  },
  {
    id: "thailand-unlimited",
    label: "泰國原生吃到飽",
    handle: "thailand-unlimited-esim",
    fallbackImage: "/images/泰國原生eSIM.png",
    url: "/product/thailand/thailand-unlimited-esim/",
  },
  {
    id: "china-unlimited",
    label: "中國吃到飽",
    handle: "china-unlimited-esim",
    fallbackImage: "/images/中國.png",
    url: "/product/china/china-unlimited-esim/",
  },
];
