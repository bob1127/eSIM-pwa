/**
 * LINE 加好友歡迎設定（Boss 可編輯）
 * 存於 platform_settings.key = line_welcome_follow（JSON）
 */
import { getSupabaseAdminServer } from "./supabaseAdminServer";

export const LINE_WELCOME_SETTINGS_KEY = "line_welcome_follow";

const DEFAULT_CARDS = [
  {
    title: "日本 AU(KDDI)",
    subtitle: "真．不限速・日本 IP",
    body: "AU（KDDI）當地網路，高速吃到飽、真．不限速，適合導航、視訊與熱點。",
    // 手機版 700×700（與首頁 Hero banner04-mobile 同圖，LINE 輪播不裁切）
    imageUrl: "/images/banner04-mobile.png",
    url: "/product/japan/japan-unlimited-esim-nolimit?telecom=au-kddi&data_amount=unlimited",
    buttonLabel: "查看方案",
  },
  {
    title: "韓國 SK電信（含門號）",
    subtitle: "真．不限速・韓國 IP",
    body: "SKT 原生韓國 IP、真．不限速吃到飽。實名後可接聽來電與收簡訊，適合外送 App 與認證碼。",
    imageUrl: "/images/韓國01-mobile.png",
    url: "/product/korea/korea-unlimited-esim?telecom=sk-native&data_amount=unlimited",
    buttonLabel: "查看方案",
  },
  {
    title: "泰國 Truemove 8／15天",
    subtitle: "真．不限速・當地號碼",
    body: "Truemove H 當地號碼，8 天與 15 天兩檔，真．不限速高速上網，可免費接聽來電與收簡訊。",
    imageUrl: "/images/泰國原生eSIM-mobile.png",
    url: "/product/thailand/thailand-unlimited-esim?telecom=truemove&days=8&data_amount=unlimited",
    buttonLabel: "查看方案",
  },
];

export const DEFAULT_LINE_WELCOME_SETTINGS = {
  greetingLead: "Jeko 旅伴您好～ ٩(●˙▿˙●)۶｜歡迎加入 Jeko eSIM",
  howtoText: [
    "【怎麼查流量／開偏低提醒】",
    "① 點下方「開啟流量提醒」，依畫面綁定會員或輸入 ICCID 以開啟偏低提醒",
    "② 或直接在對話貼上 19～20 碼 ICCID，只會回覆目前使用流量狀態",
    "※ 用量非即時，供應商同步通常有約 30～60 分鐘延遲",
  ].join("\n"),
  /** 可用 {{code}} */
  promoFirst: [
    "恭喜！已為您保留新會員 50 元折抵 (*´▽`*)",
    "折扣碼：{{code}}",
    "",
    "結帳時輸入此碼即可（須維持官方 LINE 好友）。",
    "若尚未加入會員，請點下方「註冊／會員中心」；完成後同一折扣碼會出現在會員頁。",
  ].join("\n"),
  promoRefollow: [
    "歡迎回來！(´∀｀*)ゞ",
    "您的新會員 50 元折抵仍有效。",
    "折扣碼：{{code}}",
    "",
    "結帳時輸入此碼即可（須維持官方 LINE 好友）。",
    "若尚未註冊會員，完成註冊後同一折扣碼會出現在會員中心。",
  ].join("\n"),
  promoRedeemed: [
    "新會員 50 元優惠",
    "此 LINE 已使用過新會員 50 元折抵，無法再次領取。",
    "您仍可查流量、使用客服與選購 eSIM。",
  ].join("\n"),
  promoNocode: [
    "新會員 50 元折抵",
    "請稍後再試，或至官網會員中心領取。",
  ].join("\n"),
  closingLine: "🌼🌻🌼",
  carouselTitle: "Jeko 推薦 原生eSIM",
  cards: DEFAULT_CARDS.map((c) => ({ ...c })),
  iccid: {
    headerTitle: "開啟流量提醒",
    headerSub: "綁定會員後選一張 eSIM 開提醒，或輸入 ICCID（一次一張）",
    bodyText: [
      "點下方按鈕：可一鍵綁定官網會員，或在頁面輸入 ICCID（19～20 碼）查流量並開啟偏低提醒。",
      "若只想查目前用量，也可直接在對話貼上 ICCID（不會自動開提醒；用量約有 30～60 分鐘延遲）。",
    ].join("\n"),
    buttonLabel: "開啟流量提醒",
    headerBg: "#3768C7",
    buttonBg: "#3768C7",
  },
  offHours: {
    headerTitle: "目前為非人工客服時段",
    headerSub: "人工客服：每日 09:00–24:00（台灣時間）",
    bodyText: [
      "現在是深夜／清晨時段，專人會在營業時間再回覆您。",
      "您可先開啟官網或已加入主畫面的 PWA，使用智慧客服（24 小時）。可問 eSIM 安裝、方案、流量，也可傳截圖請智慧客服判讀。",
    ].join("\n"),
    primaryLabel: "開啟智慧客服",
    secondaryLabel: "查詢流量／提醒",
    headerBg: "#0A6CD0",
    buttonBg: "#0A6CD0",
  },
};

const CACHE_TTL_MS = 30_000;
let cached = null;
let cachedAt = 0;

function asStr(v, fallback = "") {
  if (v == null) return fallback;
  return String(v);
}

function clip(s, max) {
  return asStr(s).slice(0, max);
}

function normalizeCard(raw, fallback = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  const fb = fallback && typeof fallback === "object" ? fallback : {};
  return {
    title: clip(src.title ?? fb.title, 40) || "方案",
    subtitle: clip(src.subtitle ?? fb.subtitle, 60),
    body: clip(src.body ?? fb.body, 160),
    imageUrl: clip(src.imageUrl ?? fb.imageUrl, 500),
    url: clip(src.url ?? fb.url, 500) || "/",
    buttonLabel: clip(src.buttonLabel ?? fb.buttonLabel, 20) || "查看方案",
  };
}

function normalizeFlex(raw, fallback) {
  const src = raw && typeof raw === "object" ? raw : {};
  const fb = fallback || {};
  return {
    headerTitle: clip(src.headerTitle ?? fb.headerTitle, 40) || fb.headerTitle,
    headerSub: clip(src.headerSub ?? fb.headerSub, 120) || fb.headerSub,
    bodyText: clip(src.bodyText ?? fb.bodyText, 800) || fb.bodyText,
    buttonLabel: clip(
      src.buttonLabel ?? src.primaryLabel ?? fb.buttonLabel ?? fb.primaryLabel,
      20,
    ),
    primaryLabel: clip(src.primaryLabel ?? fb.primaryLabel, 20),
    secondaryLabel: clip(src.secondaryLabel ?? fb.secondaryLabel, 20),
    headerBg: clip(src.headerBg ?? fb.headerBg, 16) || fb.headerBg,
    buttonBg: clip(src.buttonBg ?? fb.buttonBg, 16) || fb.buttonBg,
  };
}

export function normalizeLineWelcomeSettings(raw) {
  const d = DEFAULT_LINE_WELCOME_SETTINGS;
  const src = raw && typeof raw === "object" ? raw : {};

  const defaultCards = d.cards;
  let cards = Array.isArray(src.cards) ? src.cards : defaultCards;
  if (!cards.length) cards = defaultCards;
  // 固定最多 10 張、至少沿用預設長度或輸入長度
  cards = cards.slice(0, 10).map((c, i) =>
    normalizeCard(c, defaultCards[i] || defaultCards[0]),
  );
  if (cards.length < 1) {
    cards = defaultCards.map((c) => normalizeCard(c));
  }

  const value = {
    greetingLead: clip(src.greetingLead ?? d.greetingLead, 200) || d.greetingLead,
    howtoText: clip(src.howtoText ?? d.howtoText, 1200) || d.howtoText,
    promoFirst: clip(src.promoFirst ?? d.promoFirst, 800) || d.promoFirst,
    promoRefollow:
      clip(src.promoRefollow ?? d.promoRefollow, 800) || d.promoRefollow,
    promoRedeemed:
      clip(src.promoRedeemed ?? d.promoRedeemed, 800) || d.promoRedeemed,
    promoNocode: clip(src.promoNocode ?? d.promoNocode, 400) || d.promoNocode,
    closingLine: clip(src.closingLine ?? d.closingLine, 40) || d.closingLine,
    carouselTitle:
      clip(src.carouselTitle ?? d.carouselTitle, 40) || d.carouselTitle,
    cards,
    iccid: normalizeFlex(src.iccid, d.iccid),
    offHours: normalizeFlex(src.offHours, d.offHours),
  };

  return { ok: true, value };
}

function fillTpl(tpl, vars) {
  return String(tpl || "").replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] == null ? "" : String(vars[k]),
  );
}

export function buildWelcomePromoFromSettings(settings, state = {}) {
  const s = settings || DEFAULT_LINE_WELCOME_SETTINGS;
  const code = state.code || "";
  if (state.alreadyRedeemed) return s.promoRedeemed;
  if (code) {
    if (state.isReFollow || state.alreadyClaimed) {
      return fillTpl(s.promoRefollow, { code });
    }
    return fillTpl(s.promoFirst, { code });
  }
  return s.promoNocode;
}

export function buildWelcomeFollowTextFromSettings(settings, opts = {}) {
  const s = settings || DEFAULT_LINE_WELCOME_SETTINGS;
  const siteUrl =
    String(opts.siteUrl || "")
      .replace(/\/$/, "") || "https://www.jeko-esim.com.tw";
  const promo = buildWelcomePromoFromSettings(s, opts);
  const howto = String(s.howtoText || "")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));

  return [
    s.greetingLead,
    "",
    promo,
    "",
    ...howto,
    "",
    `官網：${siteUrl}`,
    "",
    s.closingLine || "🌼🌻🌼",
  ].join("\n");
}

export function flexPreviewFromSettings(block) {
  const b = block || {};
  return {
    headerTitle: b.headerTitle,
    headerSub: b.headerSub,
    body: String(b.bodyText || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
    buttonLabel: b.buttonLabel || b.primaryLabel,
    primaryLabel: b.primaryLabel || b.buttonLabel,
    secondaryLabel: b.secondaryLabel,
    headerBg: b.headerBg,
    buttonBg: b.buttonBg,
  };
}

export async function loadLineWelcomeSettings({ force = false } = {}) {
  if (!force && cached && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const supabase = getSupabaseAdminServer();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value, updated_at")
      .eq("key", LINE_WELCOME_SETTINGS_KEY)
      .maybeSingle();

    if (!error && data?.value) {
      let parsed = data.value;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          parsed = null;
        }
      }
      const norm = normalizeLineWelcomeSettings(parsed);
      if (norm.ok) {
        cached = {
          ...norm.value,
          source: "db",
          updatedAt: data.updated_at,
        };
        cachedAt = Date.now();
        return cached;
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[lineWelcomeSettings] 讀取失敗，使用預設：",
        err?.message || err,
      );
    }
  }

  cached = {
    ...DEFAULT_LINE_WELCOME_SETTINGS,
    cards: DEFAULT_LINE_WELCOME_SETTINGS.cards.map((c) => ({ ...c })),
    iccid: { ...DEFAULT_LINE_WELCOME_SETTINGS.iccid },
    offHours: { ...DEFAULT_LINE_WELCOME_SETTINGS.offHours },
    source: "default",
    updatedAt: null,
  };
  cachedAt = Date.now();
  return cached;
}

export async function saveLineWelcomeSettings(raw) {
  const norm = normalizeLineWelcomeSettings(raw);
  if (!norm.ok) return norm;

  try {
    const supabase = getSupabaseAdminServer();
    const { error } = await supabase.from("platform_settings").upsert(
      {
        key: LINE_WELCOME_SETTINGS_KEY,
        value: JSON.stringify(norm.value),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) return { ok: false, message: error.message };
  } catch (err) {
    return { ok: false, message: err?.message || "寫入失敗" };
  }

  cached = {
    ...norm.value,
    source: "db",
    updatedAt: new Date().toISOString(),
  };
  cachedAt = Date.now();
  return { ok: true, value: norm.value };
}

export async function describeLineWelcomeSettings() {
  const copy = await loadLineWelcomeSettings({ force: true });
  const {
    source,
    updatedAt,
    ...rest
  } = copy;
  return {
    copy: rest,
    source,
    updatedAt,
    defaults: DEFAULT_LINE_WELCOME_SETTINGS,
  };
}
