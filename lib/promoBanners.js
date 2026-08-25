/**
 * 優惠頁 Banner（不足 3 張時循環補齊）
 * 原始檔在 public/images/disccount/
 */
const SOURCE_BANNERS = [
  {
    id: "promo-01",
    src: "/images/disccount/promo-banner-01.png",
    alt: "新會員加入 LINE 即贈 50 元購物金，另可抽 500 元折價券",
    href: process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn",
  },
  {
    id: "promo-02",
    src: "/images/disccount/promo-banner-02.png",
    alt: "新加入官方會員立即獲得 50 元優惠，再抽 500 元折價券",
    href: process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn",
  },
];

/** 組出至少 minCount 張，不夠就重複既有圖 */
export function buildPromoSlides(minCount = 3) {
  if (!SOURCE_BANNERS.length) return [];
  const slides = [];
  for (let i = 0; i < Math.max(minCount, SOURCE_BANNERS.length); i += 1) {
    const src = SOURCE_BANNERS[i % SOURCE_BANNERS.length];
    slides.push({
      ...src,
      key: `${src.id}-${i}`,
      slideIndex: i,
    });
  }
  return slides;
}

export { SOURCE_BANNERS };
