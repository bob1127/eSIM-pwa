/**
 * 夥伴賣場首頁 CMS：預設值、合併、輸入消毒
 */

const MAX_TEXT = 120;
const MAX_SUB = 200;
const MAX_URL = 500;
const MAX_SLIDES = 5;

export function defaultHomepageCms(store = {}) {
  const domain = String(store.domain || "").trim();
  const base = domain ? `/p/${domain}` : "";
  return {
    hero: {
      /** classic = 文字主視覺；slider = 全幅輪播 Banner */
      layout: "classic",
      eyebrow: "Official Partner Store · Powered by Jeko",
      title: "",
      subtitle: "",
      background_image: "",
      cta1_label: "探索 eSIM 方案",
      cta1_href: "#plans",
      cta2_label: "旅遊文章",
      cta2_href: `${base}/blog/`,
      cta3_label: "安裝教學",
      cta3_href: `${base}/tutorial/`,
      slides: [
        {
          image: "",
          title: "",
          subtitle: "",
          cta_label: "探索方案",
          href: "#plans",
        },
      ],
      autoplay: true,
      autoplay_ms: 5000,
    },
    promoCards: [
      {
        title: "出國必備 eSIM",
        subtitle: "抵達目的地即開即用 · QR Code 啟用",
        image: "/images/shop/shop-promo-01.png",
        href: "#plans",
      },
      {
        title: "旅行周邊精選",
        subtitle: "前往 Jeko Shop 探索更多",
        image:
          "https://www.bitplayinc.com/cdn/shop/files/Slider_s4_2000x.jpg?v=1740538574",
        href: "/shop/",
      },
    ],
    discover: {
      section_title: "Discover More from Jeko",
      title: "Jeko Shop 旅行完整配備",
      subtitle: "eSIM、充電器、收納與旅遊配件一次購足",
      button_label: "立即逛商城",
      href: "/shop/",
      image: "/images/shop/shop-promo-01.png",
    },
  };
}

function clip(str, max) {
  return String(str ?? "")
    .trim()
    .slice(0, max);
}

function safeHref(href, fallback = "#") {
  const h = clip(href, MAX_URL);
  if (!h) return fallback;
  if (
    h.startsWith("/") ||
    h.startsWith("#") ||
    h.startsWith("https://") ||
    h.startsWith("http://")
  ) {
    if (/^\s*javascript:/i.test(h)) return fallback;
    return h;
  }
  return fallback;
}

function safeImageUrl(url) {
  const u = clip(url, MAX_URL);
  if (!u) return "";
  if (u.startsWith("/") || u.startsWith("https://") || u.startsWith("http://")) {
    if (/^\s*javascript:/i.test(u)) return "";
    return u;
  }
  return "";
}

function normalizeLayout(v) {
  return String(v || "").toLowerCase() === "slider" ? "slider" : "classic";
}

function normalizeSlide(raw, fallbackHref = "#plans") {
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    image: safeImageUrl(s.image ?? ""),
    title: clip(s.title ?? "", MAX_TEXT),
    subtitle: clip(s.subtitle ?? "", MAX_SUB),
    cta_label: clip(s.cta_label ?? "", MAX_TEXT),
    href: safeHref(s.href ?? fallbackHref, fallbackHref),
  };
}

export function mergeHomepageCms(store, raw) {
  const base = defaultHomepageCms(store);
  const incoming = raw && typeof raw === "object" ? raw : {};
  const heroIn = incoming.hero && typeof incoming.hero === "object" ? incoming.hero : {};
  const discIn =
    incoming.discover && typeof incoming.discover === "object"
      ? incoming.discover
      : {};
  const cardsIn = Array.isArray(incoming.promoCards)
    ? incoming.promoCards
    : [];

  const promoCards = [0, 1].map((i) => {
    const d = base.promoCards[i];
    const c = cardsIn[i] && typeof cardsIn[i] === "object" ? cardsIn[i] : {};
    return {
      title: clip(c.title ?? d.title, MAX_TEXT) || d.title,
      subtitle: clip(c.subtitle ?? d.subtitle, MAX_SUB) || d.subtitle,
      image: safeImageUrl(c.image ?? d.image) || d.image,
      href: safeHref(c.href ?? d.href, d.href),
    };
  });

  const slidesIn = Array.isArray(heroIn.slides) ? heroIn.slides : [];
  const slides =
    slidesIn.length > 0
      ? slidesIn.slice(0, MAX_SLIDES).map((s) => normalizeSlide(s, "#plans"))
      : base.hero.slides.map((s) => ({ ...s }));

  const autoplayMs = Math.min(
    15000,
    Math.max(2500, Number(heroIn.autoplay_ms) || base.hero.autoplay_ms),
  );

  return {
    hero: {
      layout: normalizeLayout(heroIn.layout ?? base.hero.layout),
      eyebrow: clip(heroIn.eyebrow ?? base.hero.eyebrow, MAX_TEXT) || base.hero.eyebrow,
      title: clip(heroIn.title ?? "", MAX_TEXT),
      subtitle: clip(heroIn.subtitle ?? "", MAX_SUB),
      background_image: safeImageUrl(heroIn.background_image ?? ""),
      cta1_label:
        clip(heroIn.cta1_label ?? base.hero.cta1_label, MAX_TEXT) ||
        base.hero.cta1_label,
      cta1_href: safeHref(heroIn.cta1_href ?? base.hero.cta1_href, base.hero.cta1_href),
      cta2_label:
        clip(heroIn.cta2_label ?? base.hero.cta2_label, MAX_TEXT) ||
        base.hero.cta2_label,
      cta2_href: safeHref(heroIn.cta2_href ?? base.hero.cta2_href, base.hero.cta2_href),
      cta3_label:
        clip(heroIn.cta3_label ?? base.hero.cta3_label, MAX_TEXT) ||
        base.hero.cta3_label,
      cta3_href: safeHref(heroIn.cta3_href ?? base.hero.cta3_href, base.hero.cta3_href),
      slides,
      autoplay: heroIn.autoplay === false ? false : true,
      autoplay_ms: autoplayMs,
    },
    promoCards,
    discover: {
      section_title:
        clip(discIn.section_title ?? base.discover.section_title, MAX_TEXT) ||
        base.discover.section_title,
      title:
        clip(discIn.title ?? base.discover.title, MAX_TEXT) || base.discover.title,
      subtitle:
        clip(discIn.subtitle ?? base.discover.subtitle, MAX_SUB) ||
        base.discover.subtitle,
      button_label:
        clip(discIn.button_label ?? base.discover.button_label, MAX_TEXT) ||
        base.discover.button_label,
      href: safeHref(discIn.href ?? base.discover.href, base.discover.href),
      image: safeImageUrl(discIn.image ?? base.discover.image) || base.discover.image,
    },
  };
}

/** 顯示用：空 title/subtitle 回退到商店名稱／描述；slider 無圖則回退 classic */
export function resolveHomepageDisplay(store, cms) {
  const merged = mergeHomepageCms(store, cms || store?.homepage_cms);
  const slidesWithImage = (merged.hero.slides || []).filter((s) => s.image);
  let layout = merged.hero.layout;
  if (layout === "slider" && slidesWithImage.length === 0) {
    layout = "classic";
  }
  return {
    ...merged,
    hero: {
      ...merged.hero,
      layout,
      slides: slidesWithImage.length > 0 ? slidesWithImage : merged.hero.slides,
      displayTitle: merged.hero.title || store?.store_name || "夥伴商店",
      displaySubtitle:
        merged.hero.subtitle ||
        store?.description ||
        "精選全球 eSIM 方案，即買即用，出遊上網一次搞定。",
    },
  };
}

export function sanitizeHomepageCmsInput(store, body) {
  return mergeHomepageCms(store, body);
}

export const HOMEPAGE_HERO_MAX_SLIDES = MAX_SLIDES;
