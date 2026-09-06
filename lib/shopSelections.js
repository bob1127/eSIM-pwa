/**
 * /shop「Must-Have Jeko Selections」：從 Medusa 抓實體商品，對齊 catalog 卡片格式。
 */
import {
  getMedusaStoreApiUrl,
  getMedusaPublishableKey,
  fetchMedusaRegions,
  isVisibleOnMainSite,
} from "./medusaStoreApi";
import { resolveMedusaImageUrl } from "./resolveMedusaImageUrl";
import { parseRetailPrice } from "./medusaPartnerPricing";
import { isPhysicalShopCategory } from "./categoryNavFilter";

const PLACEHOLDER_IMG = "/images/shop/01/p1.avif";
const VIDEO_URL_RE = /\.(mp4|webm|mov|m4v|avi|mkv|qt)(\?|#|$)/i;

export function isShopMediaVideoUrl(url) {
  return VIDEO_URL_RE.test(String(url || "").split("?")[0]);
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePhysicalDescription(metadata) {
  const raw = metadata?.physical_description;
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
  }
  if (!obj || typeof obj !== "object") {
    return { text: "", aspect: "4:3", images: [] };
  }
  const aspect = obj.aspect === "3:4" ? "3:4" : "4:3";
  const images = Array.isArray(obj.images)
    ? obj.images
        .map((img) => ({
          url: resolveMedusaImageUrl(img?.url || img) || "",
          alt: String(img?.alt || "").trim(),
        }))
        .filter((img) => img.url)
    : [];
  return {
    text: String(obj.text || "").trim(),
    aspect,
    images,
  };
}

function productLooksPhysical(product) {
  const meta = product?.metadata || {};
  if (
    meta.is_physical === true ||
    meta.is_physical === "true" ||
    String(meta.product_kind || "").toLowerCase() === "physical" ||
    String(meta.shop_channel || "").toLowerCase() === "physical"
  ) {
    return true;
  }

  const typeValue = String(product?.type?.value || "");
  if (/實體/.test(typeValue) || /physical/i.test(typeValue)) return true;

  const cats = Array.isArray(product?.categories) ? product.categories : [];
  if (cats.some((c) => isPhysicalShopCategory(c))) return true;

  const colHandle = String(product?.collection?.handle || "").toLowerCase();
  if (["physical", "accessories", "product"].includes(colHandle)) return true;

  // 配件關鍵字（尚未掛類型／分類時也能進商城）
  const blob = `${product?.title || ""} ${product?.handle || ""}`.toLowerCase();
  if (
    /anker|充電線|傳輸線|充電器|行動電源|cable|usb-?c|type-?c|編織線|配件|轉接|筆電包|電腦包|手提包|背包|收納/.test(
      blob,
    )
  ) {
    return true;
  }

  return false;
}

function productLooksEsim(product) {
  const colHandle = String(product?.collection?.handle || "").toLowerCase();
  const colTitle = String(product?.collection?.title || "").toLowerCase();
  const handle = String(product?.handle || "").toLowerCase();
  const title = String(product?.title || "").toLowerCase();
  if (colHandle === "esim" || colTitle.includes("esim")) return true;
  if (handle.includes("esim") || title.includes("esim")) return true;
  if (/吃到飽|總量型|每日型/.test(title)) return true;
  return false;
}

function pickVariant(product) {
  const variants = product?.variants || [];
  if (!variants.length) return null;
  let best = variants[0];
  let bestPrice = parseRetailPrice(best);
  for (const v of variants) {
    const p = parseRetailPrice(v);
    if (p > 0 && (bestPrice <= 0 || p < bestPrice)) {
      best = v;
      bestPrice = p;
    }
  }
  return best;
}

function pickOriginalPrice(variant, salePrice) {
  const calc = variant?.calculated_price;
  const original =
    calc?.original_amount ??
    calc?.original_price?.amount ??
    null;
  if (original != null && Number(original) > Number(salePrice)) {
    return Number(original);
  }
  const metaCompare = variant?.metadata?.compare_at_price;
  if (metaCompare != null && Number(metaCompare) > Number(salePrice)) {
    return Number(metaCompare);
  }
  return null;
}

/** 從變體收集圖片 URL（thumbnail + images + metadata 備援） */
function collectVariantImageUrls(variant) {
  const urls = [];
  const push = (raw) => {
    const u = resolveMedusaImageUrl(raw);
    if (u && !urls.includes(u)) urls.push(u);
  };
  push(variant?.thumbnail);
  for (const img of variant?.images || []) {
    push(img?.url || img);
  }
  const meta = variant?.metadata || {};
  push(meta.thumbnail);
  push(meta.image);
  push(meta.image_url);
  const metaImages = meta.images;
  if (Array.isArray(metaImages)) {
    for (const img of metaImages) push(img?.url || img);
  }
  return urls;
}

function mapProductToShopCard(product) {
  const variant = pickVariant(product);
  const price = variant ? parseRetailPrice(variant) : 0;
  const thumbCandidates = [
    resolveMedusaImageUrl(product.thumbnail),
    ...(product.images || []).map((img) =>
      resolveMedusaImageUrl(img?.url || img),
    ),
  ].filter(Boolean);
  const thumb =
    thumbCandidates.find((url) => !isShopMediaVideoUrl(url)) ||
    PLACEHOLDER_IMG;
  const images = (product.images || [])
    .map((img) => resolveMedusaImageUrl(img?.url || img))
    .filter(Boolean);
  if (!images.length && thumb) images.push(thumb);

  const desc =
    stripHtml(product.subtitle || product.metadata?.subtitle) ||
    stripHtml(product.description).slice(0, 80) ||
    "";

  const handle = String(product.handle || "").trim();
  const isBestseller =
    product.metadata?.shop_bestseller === true ||
    product.metadata?.shop_bestseller === "true" ||
    product.metadata?.shop_tab === "bestsellers";

  const styles = (product.variants || []).map((v) => {
    const imageUrls = collectVariantImageUrls(v);
    return {
      id: v.id,
      label:
        v.title ||
        v.options?.map((o) => o.value).filter(Boolean).join(" / ") ||
        "預設",
      price: parseRetailPrice(v),
      sku: v.sku || null,
      thumbnail: imageUrls[0] || null,
      imageUrls,
    };
  });

  // 變體專屬圖若未出現在商品圖庫，補進 images
  for (const s of styles) {
    for (const u of s.imageUrls || []) {
      if (u && !images.includes(u)) images.push(u);
    }
  }

  return {
    id: product.id,
    variant_id: variant?.id || product.id,
    title: product.title || "未命名商品",
    desc,
    description: stripHtml(product.description),
    price: Number(price) || 0,
    original: pickOriginalPrice(variant, price),
    img: thumb,
    images,
    href: handle ? `/shop/product/${handle}` : "/shop",
    handle,
    category: isBestseller ? "bestsellers" : "new",
    tags: [],
    type: "physical",
    created_at: product.created_at || null,
    isBestseller,
    styles,
    stockText: "有現貨 — 預計 3～7 個工作天送達",
  };
}

/**
 * 商城商品內頁：依 handle 抓 Medusa 實體商品
 * @returns {Promise<object|null>}
 */
export async function fetchShopProductByHandle(handle) {
  const h = String(handle || "").trim();
  if (!h) return null;

  const backendUrl = getMedusaStoreApiUrl();
  const key = getMedusaPublishableKey();
  if (!key) return null;

  const region = await fetchMedusaRegions().catch(() => null);
  const headers = { "x-publishable-api-key": key };
  const query = new URLSearchParams({
    handle: h,
    limit: "1",
    fields:
      "id,title,handle,thumbnail,description,created_at,+metadata,*images,*type,*categories,*collection,*variants,*variants.prices,*variants.calculated_price,*variants.metadata,*variants.options,*variants.images,+variants.thumbnail,*options",
  });
  if (region?.id) query.set("region_id", region.id);

  const res = await fetch(`${backendUrl}/store/products?${query}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  const product = (data.products || [])[0];
  if (!product || !isVisibleOnMainSite(product)) return null;

  const card = mapProductToShopCard(product);
  const gallery = (card.images || []).map((src, i) => ({
    type: isShopMediaVideoUrl(src) ? "video" : "image",
    src,
    alt: `${card.title} ${i + 1}`,
  }));
  if (!gallery.length && card.img) {
    gallery.push({
      type: isShopMediaVideoUrl(card.img) ? "video" : "image",
      src: card.img,
      alt: card.title,
    });
  }

  const original = card.original;
  const saveAmount =
    original && original > card.price ? original - card.price : 0;
  const physicalDescription = parsePhysicalDescription(product.metadata);

  // 圖 URL → 變體：優先 thumbnail／僅單一變體擁有的圖
  const urlOwnerCount = new Map();
  for (const s of card.styles || []) {
    for (const u of s.imageUrls || []) {
      urlOwnerCount.set(u, (urlOwnerCount.get(u) || 0) + 1);
    }
  }
  const imageToStyleId = {};
  for (const s of card.styles || []) {
    const primary = s.thumbnail || s.imageUrls?.[0];
    if (primary) imageToStyleId[primary] = s.id;
    for (const u of s.imageUrls || []) {
      if ((urlOwnerCount.get(u) || 0) === 1) imageToStyleId[u] = s.id;
    }
  }

  // 各變體前台圖庫：只留該變體專屬圖（排除全變體共用）；沒專屬則用 thumbnail
  const stylesWithGallery = (card.styles || []).map((s) => {
    const exclusive = (s.imageUrls || []).filter(
      (u) => (urlOwnerCount.get(u) || 0) === 1,
    );
    let galleryUrls = exclusive;
    if (!galleryUrls.length && s.thumbnail) galleryUrls = [s.thumbnail];
    if (!galleryUrls.length && s.imageUrls?.length) {
      galleryUrls = [s.imageUrls[0]];
    }
    return {
      id: s.id,
      label: s.label,
      price: s.price,
      thumbnail: s.thumbnail || galleryUrls[0] || null,
      imageUrls: s.imageUrls || [],
      galleryUrls,
    };
  });

  return {
    product: {
      slug: card.handle,
      badge: "新品",
      title: card.title,
      rating: 5,
      reviewCount: 0,
      price: card.price,
      originalPrice: original || card.price,
      saveAmount,
      discountLabel: saveAmount > 0 ? `省 NT$${saveAmount}` : "",
      promoCode: "",
      features: card.desc ? [card.desc] : [],
      styles:
        stylesWithGallery.length > 0
          ? stylesWithGallery
          : [
              {
                id: card.variant_id,
                label: "預設規格",
                price: card.price,
                thumbnail: card.img || null,
                imageUrls: card.images || [],
                galleryUrls: card.images || [],
              },
            ],
      imageToStyleId,
      stockText: card.stockText,
      bulkNote: "",
      description: card.description || card.desc || "",
      medusa_product_id: card.id,
      physicalDescription,
    },
    gallery,
  };
}

/**
 * @returns {Promise<{ new: object[], bestsellers: object[] }>}
 */
export async function fetchShopMustHaveSelections({ limit = 24 } = {}) {
  const backendUrl = getMedusaStoreApiUrl();
  const key = getMedusaPublishableKey();
  if (!key) {
    return { new: [], bestsellers: [] };
  }

  const region = await fetchMedusaRegions().catch(() => null);
  const headers = { "x-publishable-api-key": key };

  const query = new URLSearchParams({
    limit: String(Math.min(Math.max(limit * 3, 50), 100)),
    offset: "0",
    order: "-created_at",
    fields:
      "id,title,handle,thumbnail,description,created_at,+metadata,*images,*type,*categories,*collection,*variants,*variants.prices,*variants.calculated_price,*variants.metadata",
  });
  if (region?.id) query.set("region_id", region.id);

  const res = await fetch(`${backendUrl}/store/products?${query}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Medusa products ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const physical = (data.products || [])
    .filter(isVisibleOnMainSite)
    .filter((p) => productLooksPhysical(p) && !productLooksEsim(p))
    .map(mapProductToShopCard)
    .filter((p) => p.price > 0 || p.img);

  const sortedNew = [...physical].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });

  const bestsellersMarked = sortedNew.filter((p) => p.isBestseller);
  const bestsellers =
    bestsellersMarked.length > 0
      ? bestsellersMarked
      : sortedNew.slice(0, limit);

  return {
    new: sortedNew.slice(0, limit),
    bestsellers: bestsellers.slice(0, limit),
  };
}
