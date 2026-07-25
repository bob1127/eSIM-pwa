/**
 * Jeko 商城目錄（目前為 /shop 假資料；之後換成真實 API 時只改此檔即可）
 */

export const PRODUCT_PDP = "/shop/product/usb-c-cable-240w";

export const SHOP_01_IMGS = [
  "/images/shop/01/p1.avif",
  "/images/shop/01/p2.avif",
  "/images/shop/01/p3.avif",
  "/images/shop/01/p4.webp",
  "/images/shop/01/p5.webp",
];

function normalize(raw, extras = {}) {
  const img = raw.img || raw.images?.[0] || null;
  const images =
    Array.isArray(raw.images) && raw.images.length
      ? raw.images.filter(Boolean)
      : img
        ? [img]
        : [];
  return {
    id: raw.id,
    title: raw.title,
    desc: raw.desc || "",
    price: Number(raw.price) || 0,
    original: raw.original != null ? Number(raw.original) : null,
    img,
    images,
    href: raw.href || PRODUCT_PDP,
    category: extras.category || raw.category || "shop",
    tags: extras.tags || raw.tags || [],
    type: "physical",
  };
}

const NEW_RAW = [
  {
    id: "shop-new-gan65",
    title: "65W 氮化鎵旅行充電器",
    desc: "折疊插頭 · 全球電壓適用",
    price: 680,
    original: 880,
    img: SHOP_01_IMGS[0],
    tags: ["充電", "充電器", "氮化鎵", "旅行配件", "3C"],
  },
  {
    id: "shop-new-jp-esim7",
    title: "日本 5G eSIM 吃到飽（7天）",
    desc: "即買即用 · QR Code 啟用",
    price: 299,
    original: 399,
    img: SHOP_01_IMGS[1],
    tags: ["eSIM", "日本", "吃到飽"],
  },
  {
    id: "shop-new-adapter",
    title: "全球通用轉接插座",
    desc: "150+ 國家適用",
    price: 350,
    original: null,
    img: SHOP_01_IMGS[2],
    tags: ["轉接頭", "插座", "旅行配件", "插頭"],
  },
  {
    id: "shop-new-anc",
    title: "ANC 降噪無線耳機",
    desc: "出差旅行必備",
    price: 1280,
    original: 1680,
    img: SHOP_01_IMGS[3],
    tags: ["耳機", "降噪", "3C", "無線"],
  },
  {
    id: "shop-new-magsafe",
    title: "MagSafe 15W 無線充電板",
    desc: "磁吸對位 · 快速充電",
    price: 990,
    original: 1290,
    img: SHOP_01_IMGS[4],
    tags: ["充電", "MagSafe", "無線充電", "3C"],
  },
  {
    id: "shop-new-toiletry",
    title: "旅行盥洗收納包",
    desc: "防水材質 · 吊掛設計",
    price: 320,
    original: null,
    img: SHOP_01_IMGS[0],
    tags: ["收納", "盥洗", "旅行用品"],
  },
];

const BEST_RAW = [
  {
    id: "shop-best-powerbank",
    title: "10000mAh USB-C 行動電源",
    desc: "雙向快充 · 輕薄好攜帶",
    price: 790,
    original: 990,
    img: SHOP_01_IMGS[1],
    tags: ["行動電源", "充電", "快充", "3C"],
  },
  {
    id: "shop-best-kr-esim5",
    title: "韓國 5G eSIM（5天）",
    desc: "不限速 · 即開即用",
    price: 199,
    original: 269,
    img: SHOP_01_IMGS[2],
    tags: ["eSIM", "韓國"],
  },
  {
    id: "shop-best-pack",
    title: "旅行收納整理包套組",
    desc: "分層收納 · 防水材質",
    price: 450,
    original: null,
    img: SHOP_01_IMGS[3],
    tags: ["收納", "旅行用品", "整理"],
  },
  {
    id: "shop-best-privacy",
    title: "防窺螢幕保護貼 iPhone",
    desc: "防刮耐磨 · 完美貼合",
    price: 280,
    original: null,
    img: SHOP_01_IMGS[4],
    tags: ["保護貼", "iPhone", "3C"],
  },
  {
    id: "shop-best-car-pd",
    title: "車用 PD 快充充電器",
    desc: "雙孔輸出 · 過熱保護",
    price: 480,
    original: 580,
    img: SHOP_01_IMGS[0],
    tags: ["車用", "充電", "PD", "3C"],
  },
  {
    id: "shop-best-waist",
    title: "隱形腰包 防扒設計",
    desc: "貼身收納 · 出國安心",
    price: 390,
    original: null,
    img: SHOP_01_IMGS[1],
    tags: ["腰包", "防扒", "旅行用品", "收納"],
  },
];

const TRAVEL_RAW = [
  {
    id: "shop-travel-backpack",
    title: "Lime Green Everyday Backpack",
    desc: "輕量防水 · 日常與戶外皆宜",
    price: 1680,
    original: 2180,
    img: "https://png.pngtree.com/png-vector/20251101/ourlarge/pngtree-stylish-lime-green-backpack-for-everyday-carry-and-outdoor-adventures-featuring-png-image_17882412.webp",
    tags: ["背包", "收納", "旅行用品"],
  },
  {
    id: "shop-travel-briefcase",
    title: "Slim Laptop Briefcase",
    desc: "極簡輪廓 · 商務出差首選",
    price: 2480,
    original: 2980,
    img: "https://png.pngtree.com/png-vector/20230831/ourmid/pngtree-3d-render-laptop-bag-perspective-view-png-image_9192010.png",
    tags: ["筆電包", "公事包", "出差"],
  },
  {
    id: "shop-travel-sleeve",
    title: "tomtoc Laptop Sleeve",
    desc: "防震內襯 · 筆電配件好收納",
    price: 990,
    original: 1290,
    img: "https://shoplineimg.com/55c37526e37ec6fc5d000002/64a64a983c7aa7001de01a5f/900x.png",
    tags: ["筆電套", "保護套", "收納"],
  },
  {
    id: "shop-travel-tripod",
    title: "Insta360 × PGYTECH Mini Tripod",
    desc: "手持／腳架兩用 · 運動相機必備",
    price: 890,
    original: 1090,
    img: "https://res.insta360.com/static/854ed74b1296e5db844f4accf2779a95/Main.png",
    tags: ["腳架", "Insta360", "攝影", "配件"],
  },
  {
    id: "shop-travel-grip",
    title: "Insta360 Remote Grip",
    desc: "遙控握把 · 自拍延長更穩",
    price: 1190,
    original: 1490,
    img: "https://www.esentra.com.tw/wp-content/uploads/2025/06/e1e07f3dcc4a6886188a8f58f862ac6a.jpg",
    tags: ["握把", "Insta360", "攝影", "配件"],
  },
  {
    id: "shop-travel-pela",
    title: "Pela Eco Phone Case",
    desc: "永續材質 · 輕薄防摔保護",
    price: 690,
    original: 890,
    img: "https://shoplineimg.com/5fe41f7ec43d7f0018039a42/68c3e88af795900012f01d60/800x.png",
    tags: ["手機殼", "保護殼", "3C"],
  },
];

export const SHOP_NEW = NEW_RAW.map((p) =>
  normalize({ ...p, href: PRODUCT_PDP }, { category: "new" }),
);
export const SHOP_BESTSELLERS = BEST_RAW.map((p) =>
  normalize({ ...p, href: PRODUCT_PDP }, { category: "bestsellers" }),
);
export const SHOP_TRAVEL_GEAR = TRAVEL_RAW.map((p) =>
  normalize({ ...p, href: PRODUCT_PDP }, { category: "travel-gear" }),
);

/** 給 /shop 頁面 Tab 用 */
export const PRODUCT_TABS = {
  new: SHOP_NEW,
  bestsellers: SHOP_BESTSELLERS,
};

/** 聊天／知識庫完整目錄（去重） */
export const SHOP_CATALOG = (() => {
  const map = new Map();
  for (const item of [...SHOP_NEW, ...SHOP_BESTSELLERS, ...SHOP_TRAVEL_GEAR]) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
})();
