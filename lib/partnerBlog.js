/**
 * 夥伴賣場 Blog（店內前台）
 * — 只顯示該店 store_blog_posts，不抓主站 WordPress
 * — 尚無發布文章時，回傳示範假文（標 source: partner-demo）
 */
import { getPartnerStorefrontDb } from "@/lib/partnerStorefront";

export function formatPartnerBlogDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 含時間：2026.08.10 14:30 */
export function formatPartnerBlogDateTime(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  const date = formatPartnerBlogDate(isoStr);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${date} ${hh}:${mm}`;
}

export function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]*>?/gm, "")
    .replace(/&#\d+;/gm, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function slugifyTitle(title = "") {
  const base = String(title)
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `post-${Date.now()}`;
}

export { slugifyTitle };

/** 分類標籤繁中（示範英文碼與常見英文一併對應） */
const CATEGORY_LABEL_ZH = {
  travel: "旅遊",
  esim: "eSIM",
  japan: "日本",
  china: "中港澳",
  korea: "韓國",
  thailand: "泰國",
  europe: "歐洲",
  asia: "亞洲",
  tips: "攻略",
  news: "最新消息",
};

export function localizePartnerBlogCategory(label) {
  const raw = String(label || "").trim();
  if (!raw) return "旅遊";
  const key = raw.toLowerCase();
  if (CATEGORY_LABEL_ZH[key]) return CATEGORY_LABEL_ZH[key];
  // 已是中文或其他自訂字串則原樣顯示
  return raw;
}

function daysAgo(n, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * 統一前台文章 shape（僅夥伴來源）
 */
export function normalizeStoreBlogRow(row, store = null) {
  if (!row) return null;
  const editorFallback =
    store?.store_name || store?.footer_company_name || "夥伴編輯";
  const publishedIso = row.published_at || row.created_at || null;
  const updatedIso = row.updated_at || null;
  const publishedMs = publishedIso ? new Date(publishedIso).getTime() : 0;
  const updatedMs = updatedIso ? new Date(updatedIso).getTime() : 0;
  const wasEdited =
    updatedMs > 0 && publishedMs > 0 && updatedMs - publishedMs > 60 * 1000;

  return {
    id: `partner-${row.id}`,
    partnerId: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: (row.excerpt || "").slice(0, 200),
    date: formatPartnerBlogDate(publishedIso),
    dateIso: publishedIso,
    publishedLabel: formatPartnerBlogDateTime(publishedIso),
    updatedLabel: wasEdited ? formatPartnerBlogDateTime(updatedIso) : null,
    updatedAtIso: wasEdited ? updatedIso : null,
    wasEdited,
    categories: [
      localizePartnerBlogCategory(row.category_label || "旅遊"),
    ],
    categoryLabel: localizePartnerBlogCategory(row.category_label || "旅遊"),
    tags: Array.isArray(row.tags) ? row.tags : [],
    image: row.cover_image_url || null,
    contentHtml: row.content_html || "",
    authorName: row.author_name || editorFallback,
    editorName: row.author_name || editorFallback,
    authorBio: row.author_bio || null,
    source: row._demo ? "partner-demo" : "partner",
    status: row.status || "published",
  };
}

/** 尚無真實文章時的示範內容（僅該店可見，不混主站） */
export function buildDemoPartnerBlogPosts(store) {
  const brand = store?.store_name || "夥伴商店";
  const domain = store?.domain || "demo";
  const editor = brand;

  const demos = [
    {
      id: `demo-1-${domain}`,
      slug: `demo-esim-ready-${domain}`,
      title: `${brand}精選：出國前必做的 eSIM 檢查清單`,
      excerpt:
        "從開通、雙卡設定到落地連網，整理旅客最常踩雷的步驟，讓你一落地就能上網。",
      category_label: "eSIM",
      tags: ["eSIM", "出國準備"],
      cover_image_url: "/images/shop/shop-promo-01.png",
      author_name: editor,
      author_bio: `${brand} 旅遊顧問團隊撰寫，分享實用出國連網經驗。`,
      published_at: daysAgo(2, 9, 30),
      updated_at: daysAgo(1, 16, 20),
      created_at: daysAgo(2, 9, 30),
      status: "published",
      content_html: `
        <p>出國前最怕落地才發現沒有網路。這篇由 <strong>${brand}</strong> 整理，給第一次使用 eSIM 的旅客。</p>
        <p><img src="/images/shop/shop-promo-01.png" alt="eSIM 出國準備" /></p>
        <h2>出發前三件事</h2>
        <ol>
          <li>確認手機支援 eSIM，並已解鎖（非合約鎖機）。</li>
          <li>預先安裝方案 QR Code，抵達後再開啟漫遊數據。</li>
          <li>保留實體 SIM 或 iMessage／驗證碼管道，避免收不到簡訊。</li>
        </ol>
        <p><img src="/images/shop/shop-hero-banner.png" alt="旅遊連網示意" /></p>
        <h2>落地後建議</h2>
        <p>開啟「數據漫遊」、選對 eSIM 線路，並關閉可能搶流量的自動更新。若連不上，先開關飛行模式再試一次。</p>
        <p>需要方案推薦，歡迎回到本賣場選購適合目的地的 eSIM。</p>
      `,
      _demo: true,
    },
    {
      id: `demo-2-${domain}`,
      slug: `demo-japan-travel-${domain}`,
      title: `日本自由行：${brand} 私房交通與上網建議`,
      excerpt:
        "東京／大阪怎麼搭最省事？搭配 eSIM 的實戰路線，避開觀光客塞車時段。",
      category_label: "日本",
      tags: ["日本", "交通"],
      cover_image_url: "/images/shop/shop-promo-01.png",
      author_name: editor,
      author_bio: `${brand} 在地旅遊筆記。`,
      published_at: daysAgo(5, 11, 0),
      updated_at: daysAgo(5, 11, 0),
      created_at: daysAgo(5, 11, 0),
      status: "published",
      content_html: `
        <p>這是 <strong>${brand}</strong> 為日本自由行旅客準備的精簡攻略。</p>
        <p><img src="/images/shop/shop-promo-01.png" alt="日本旅遊" /></p>
        <h2>交通卡與路線</h2>
        <p>Suica／ICOCA 可先在手機 Wallet 加值；尖峰避開山手線轉乘站，可大幅省時間。</p>
        <h2>上網怎麼選</h2>
        <p>短天數建議每日型 eSIM；長住或多城市跳點可選總量型。記得提前安裝，入境後再開通。</p>
      `,
      _demo: true,
    },
    {
      id: `demo-3-${domain}`,
      slug: `demo-china-line-${domain}`,
      title: `中港澳出行：LINE／IG 怎麼用得安心`,
      excerpt:
        "免 VPN 方案怎麼挑？出發前設定檢查，避免通訊軟體突然連不上。",
      category_label: "中港澳",
      tags: ["中國", "通訊"],
      cover_image_url: "/images/shop/shop-promo-01.png",
      author_name: editor,
      author_bio: `${brand} 實測筆記。`,
      published_at: daysAgo(9, 14, 15),
      updated_at: daysAgo(8, 10, 5),
      created_at: daysAgo(9, 14, 15),
      status: "published",
      content_html: `
        <p>前往中國大陸時，一般國際漫遊常無法使用常見社群 App。<strong>${brand}</strong> 建議選標示「免 VPN」的專用方案。</p>
        <p><img src="/images/shop/shop-promo-01.png" alt="中港澳連網" /></p>
        <h2>出發前</h2>
        <ul>
          <li>先在台灣安裝並測試 eSIM 設定頁是否出現。</li>
          <li>重要驗證碼改用 Email 或備援門號。</li>
        </ul>
        <h2>當地使用</h2>
        <p>開啟對應線路後，再測試 LINE 傳訊與圖片。若異常，切換飛行模式 10 秒通常可恢復。</p>
      `,
      _demo: true,
    },
  ];

  return demos.map((row) => normalizeStoreBlogRow(row, store));
}

async function fetchStoreCustomPosts(storeId) {
  if (!storeId) return [];
  const db = getPartnerStorefrontDb();
  if (!db) return [];
  const { data, error } = await db
    .from("store_blog_posts")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) {
    if (/store_blog_posts|schema cache/i.test(error.message || "")) return [];
    console.error("[fetchStoreCustomPosts]", error.message);
    return [];
  }
  return data || [];
}

async function fetchStoreCustomPostBySlug(storeId, slug) {
  if (!storeId || !slug) return null;
  const db = getPartnerStorefrontDb();
  if (!db) return null;
  const { data, error } = await db
    .from("store_blog_posts")
    .select("*")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    if (/store_blog_posts|schema cache/i.test(error.message || "")) return null;
    console.error("[fetchStoreCustomPostBySlug]", error.message);
    return null;
  }
  return data;
}

/**
 * 列表：僅該店夥伴文章；無資料則示範假文
 */
export async function fetchPartnerBlogPosts({
  store = null,
  perPage = 24,
  allowDemo = true,
} = {}) {
  if (!store?.id) {
    return allowDemo ? buildDemoPartnerBlogPosts(store).slice(0, perPage) : [];
  }

  const rows = await fetchStoreCustomPosts(store.id);
  const posts = rows
    .map((r) => normalizeStoreBlogRow(r, store))
    .filter(Boolean);

  if (posts.length > 0) return posts.slice(0, perPage);
  if (!allowDemo) return [];
  return buildDemoPartnerBlogPosts(store).slice(0, perPage);
}

/**
 * 單篇：僅該店夥伴文章（含示範假文 slug）
 */
export async function fetchPartnerBlogPostBySlug(slug, store = null) {
  if (!slug) return null;

  if (store?.id) {
    const row = await fetchStoreCustomPostBySlug(store.id, slug);
    if (row) return normalizeStoreBlogRow(row, store);
  }

  const demos = buildDemoPartnerBlogPosts(store);
  return demos.find((p) => p.slug === slug) || null;
}
