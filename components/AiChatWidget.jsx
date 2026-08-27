"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Bot,
  Sparkles,
  ImagePlus,
  Film,
  UserRound,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Tag,
  Percent,
  MapPin,
  CalendarDays,
} from "lucide-react";

import { getPublicSiteUrl } from "../lib/siteUrl";
import { buildLoginUrl } from "../lib/authRedirect";
import { QuarterRing } from "@/components/ui/QuarterRing";
import {
  isSupportBusinessHours,
  SUPPORT_HOURS_LABEL,
} from "../lib/supportHours";
import { PRESET_ANSWERS, QUICK_QUESTIONS } from "../lib/aiChatPresets";
import { useAuth } from "../hooks/useAuth";
import AffiliateChatOffers from "./affiliate/AffiliateChatOffers";
import ShopChatOffers from "./Shop/ShopChatOffers";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";
import { useRouter } from "next/router";

/** LINE OA Basic ID（含 @），用於 oaMessage 預填文字 */
function resolveLineOaId() {
  const raw = (process.env.NEXT_PUBLIC_LINE_OA_ID || "").trim();
  if (raw) return raw.startsWith("@") ? raw : `@${raw}`;
  const url = process.env.NEXT_PUBLIC_LINE_OA_URL || "";
  const m = String(url).match(/@[\w.-]+/);
  if (m) return m[0];
  return "@593gvyzn";
}
const LINE_OA_ID = resolveLineOaId();
/** 僅加好友／開啟官方帳號（無預填文字；桌機／手機通用後備） */
const LINE_OA_FRIEND_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL ||
  `https://line.me/R/ti/p/${encodeURIComponent(LINE_OA_ID)}`;

/**
 * MicroeSIM WhatsApp（選填國際號碼，無 + 號，例：8615999587946）。
 * 未設定時開啟 WhatsApp 僅帶預填文字，由客服自行選聯絡人／群組。
 */
const MICROESIM_WA =
  (process.env.NEXT_PUBLIC_MICROESIM_WHATSAPP || "").replace(/\D/g, "");


const WELCOME_TEXT =
  "🌼 嗨！我是 J寶，Jeko 的旅行小幫手～\n" +
  "目前最拿手的是 eSIM 上網與景點行程相關問題，需要什麼直接跟我說～\n" +
  "（可上傳截圖協助排查；影片請改傳官方 LINE 真人客服。）\n" +
  "（備註：住宿、包車、3C 與旅行用品即將上線，敬請期待。）";

const WELCOME_TEXT_VERSION = 4; // 變更歡迎詞時 +1，自動替換快取中的舊歡迎詞

/** 歡迎詞下方的優惠／活動輪播（圖卡，可之後改成 API） */
const WELCOME_PROMO_CARDS = [
  {
    id: "new-member",
    badge: "新朋友",
    title: "新朋友會員優惠",
    subtitle: "註冊會員立刻領迎新折扣",
    cta: "立即加入",
    href: "__login__",
    image: "/images/優惠折扣.png",
  },
  {
    id: "referral",
    badge: "好康道相報",
    title: "邀請碼分享賺折扣",
    subtitle: "邀請好友加入會員，雙方都有優惠",
    cta: "去邀請",
    href: "/account",
    image: "/images/865dc2a1-b546-47fe-823f-37bf4f201d43.png",
  },
  {
    id: "japan-80",
    badge: "日本限定",
    title: "日本吃到飽目前 8 折！",
    subtitle: "暢遊日本不降速，限時優惠價",
    cta: "看方案",
    href: "/product/japan",
    image: "/images/eac1444f-59c2-46b3-96b9-f675b0223a62.png",
  },
  {
    id: "sitewide-75",
    badge: "限時",
    title: "全站一律 7.5 折！！",
    subtitle: "限時優惠，eSIM／行程／用品都適用",
    cta: "馬上逛",
    href: "/product",
    image: "/images/Hero-banner-01.png",
  },
  {
    id: "car-rental",
    badge: "包車／租車",
    title: "立即租車出發",
    subtitle: "機場接送、包車旅遊一站搞定",
    cta: "去看看",
    href: "/#car-rental-charter",
    image: "/images/立即租車.png",
  },
];

/**
 * 開 LINE 官方帳號聊天，並把文字預填進輸入框（使用者只需按送出）。
 * 使用 https://line.me/R/…（手機開 App、電腦開 LINE／網頁皆可）。
 * 官方文件：https://developers.line.biz/en/docs/messaging-api/using-line-url-scheme/
 */
function buildLineOaMessageUrl(text) {
  // Android Intent / URL 長度有限，摘要壓在約 900 字內
  const body = String(text || "").slice(0, 900);
  const id = encodeURIComponent(LINE_OA_ID);
  return `https://line.me/R/oaMessage/${id}/?${encodeURIComponent(body)}`;
}

/**
 * 桌機＋手機通用開啟 LINE：
 * - 優先新分頁（不關掉網站聊天室）
 * - 被擋彈窗時改同頁導向（手機／內建瀏覽器較穩）
 */
function openOfficialLine(url) {
  const target = url || LINE_OA_FRIEND_URL;
  try {
    const win = window.open(target, "_blank", "noopener,noreferrer");
    if (win) return "tab";
  } catch {
    /* ignore */
  }
  window.location.assign(target);
  return "navigate";
}

/** 手機／平板：深層連結較穩；桌機瀏覽器常被導到 line.me 官網 → 改掃 QR */
function prefersLineAppDeepLink() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPod|iPad|Mobile/i.test(ua);
}

/**
 * 桌機主 QR：指向手機中繼頁（短網址才掃得穩）。
 * 手機開中繼頁後再帶提問進 LINE（電腦剪貼簿無法同步到手機）。
 */
function buildLineHandoffQrImageUrl(pageUrl) {
  const data = encodeURIComponent(pageUrl || LINE_OA_FRIEND_URL);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&ecc=L&margin=12&data=${data}`;
}

/** QR 落地頁必須與產生票券的同一台伺服器（本機票券在 localhost 記憶體） */
function getHandoffQrOrigin() {
  if (typeof window === "undefined") return getPublicSiteUrl();
  return window.location.origin;
}

/** WhatsApp 分享（預填文字；有號碼則開該對話，否則讓使用者選聯絡人／群組） */
function buildWhatsAppShareUrl(text) {
  const body = encodeURIComponent(String(text || "").slice(0, 1500));
  if (MICROESIM_WA) {
    return `https://wa.me/${MICROESIM_WA}?text=${body}`;
  }
  return `https://wa.me/?text=${body}`;
}

function buildHandoffSummary(messages, { userLabel = "訪客" } = {}) {
  const recent = messages.slice(-10);
  const hasMedia = recent.some(
    (m) => m.mediaPreview || m.mediaKind === "video" || m.hadMedia,
  );
  const lines = recent
    .filter((m) => m.role === "user" || m.role === "ai")
    .map((m) => {
      const label = m.role === "user" ? "【客人】" : "【J寶】";
      const max = m.role === "user" ? 280 : 160;
      const text =
        String(m.content || "").length > max
          ? String(m.content).slice(0, max) + "…"
          : String(m.content || "");
      return `${label} ${text}`;
    });

  const when = new Date().toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    hour12: false,
  });

  return (
    `【Jeko→MicroeSIM 客服轉介】\n` +
    `時間：${when}\n` +
    `來賓：${userLabel}\n` +
    `來源：J寶 AI 聊天室\n` +
    `────────\n` +
    lines.join("\n") +
    (hasMedia ? "\n────────\n（對話含截圖／影片，請一併確認）" : "")
  );
}

/** 給使用者轉官方 LINE 的預填訊息（可順便加入好友） */
function buildCustomerLineMessage(messages, { userLabel = "訪客" } = {}) {
  const recent = messages
    .filter((m) => m.role === "user" || m.role === "ai")
    .slice(-6)
    .map((m) => {
      const label = m.role === "user" ? "我" : "J寶";
      const max = 120;
      const text =
        String(m.content || "").length > max
          ? String(m.content).slice(0, max) + "…"
          : String(m.content || "");
      return `${label}：${text}`;
    });

  return (
    `您好，我想請專人客服協助（來自官網 J寶）。\n` +
    `來賓：${userLabel}\n` +
    `────────\n` +
    (recent.length ? `${recent.join("\n")}\n────────\n` : "") +
    `（若尚未加入好友，請先加入官方帳號後再按送出）`
  );
}

/**
 * 桌機剪貼簿用的提問摘要（完整一點；QR 本身不塞這段，否則掃不出）。
 */
function buildCustomerLineMessageForQr(messages, { userLabel = "訪客" } = {}) {
  return buildCustomerLineMessage(messages, { userLabel });
}


/** 取得或建立本次瀏覽器 guest fingerprint（localStorage） */
function getOrCreateGuestId() {
  if (typeof window === "undefined") return null;
  const key = "jeko_guest_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    localStorage.setItem(key, id);
  }
  return id;
}

const CHAT_UI_STORAGE_KEY = "jeko_jbao_chat_ui_v1";
const CHAT_UI_IDB_NAME = "jeko_jbao_chat";
const CHAT_UI_IDB_STORE = "ui";
const CHAT_UI_IDB_KEY = "current";
const CHAT_UI_MAX_MESSAGES = 40;
const CHAT_UI_TTL_MS = 1000 * 60 * 60 * 12; // 12 小時

const DEFAULT_WELCOME_MESSAGE = {
  id: 1,
  role: "ai",
  content: WELCOME_TEXT,
  welcomeVersion: WELCOME_TEXT_VERSION,
  promoCards: WELCOME_PROMO_CARDS,
};

function createSessionId() {
  return (
    (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
    Math.random().toString(36).slice(2)
  );
}

function normalizeStoredMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && typeof m === "object")
    .slice(-CHAT_UI_MAX_MESSAGES);
}

function openChatUiDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(CHAT_UI_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CHAT_UI_IDB_STORE)) {
        db.createObjectStore(CHAT_UI_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("idb open failed"));
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAT_UI_IDB_STORE, "readonly");
    const req = tx.objectStore(CHAT_UI_IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAT_UI_IDB_STORE, "readwrite");
    const req = tx.objectStore(CHAT_UI_IDB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHAT_UI_IDB_STORE, "readwrite");
    const req = tx.objectStore(CHAT_UI_IDB_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function clearLegacyChatUiStorage() {
  try {
    sessionStorage.removeItem(CHAT_UI_STORAGE_KEY);
    localStorage.removeItem(CHAT_UI_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function parseChatUiPayload(data) {
  if (!data || !Array.isArray(data.messages) || data.messages.length === 0) {
    return null;
  }
  if (data.updatedAt && Date.now() - data.updatedAt > CHAT_UI_TTL_MS) {
    return null;
  }
  return {
    sessionId: data.sessionId || null,
    isOpen: Boolean(data.isOpen),
    pendingMedia: data.pendingMedia || null,
    messages: normalizeStoredMessages(data.messages),
  };
}

/** IndexedDB 可存截圖 dataURL；舊版 localStorage 僅作備援（可能無圖） */
async function loadChatUiState() {
  if (typeof window === "undefined") return null;

  try {
    const db = await openChatUiDb();
    const data = await idbGet(db, CHAT_UI_IDB_KEY);
    db.close();
    const parsed = parseChatUiPayload(data);
    if (parsed) return parsed;
    if (data?.updatedAt && Date.now() - data.updatedAt > CHAT_UI_TTL_MS) {
      const db2 = await openChatUiDb();
      await idbDelete(db2, CHAT_UI_IDB_KEY);
      db2.close();
    }
  } catch {
    /* fall through */
  }

  try {
    const raw =
      sessionStorage.getItem(CHAT_UI_STORAGE_KEY) ||
      localStorage.getItem(CHAT_UI_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseChatUiPayload(JSON.parse(raw));
    if (!parsed) {
      clearLegacyChatUiStorage();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function saveChatUiState({ sessionId, isOpen, messages, pendingMedia }) {
  if (typeof window === "undefined") return;

  const payload = {
    sessionId,
    isOpen: Boolean(isOpen),
    pendingMedia: pendingMedia || null,
    messages: normalizeStoredMessages(messages),
    updatedAt: Date.now(),
  };

  try {
    const db = await openChatUiDb();
    await idbPut(db, CHAT_UI_IDB_KEY, payload);
    db.close();
    clearLegacyChatUiStorage();
  } catch {
    // IndexedDB 失敗時：仍存文字；截圖盡力寫入，爆量再去掉圖
    try {
      const withMedia = JSON.stringify(payload);
      sessionStorage.setItem(CHAT_UI_STORAGE_KEY, withMedia);
      localStorage.setItem(CHAT_UI_STORAGE_KEY, withMedia);
    } catch {
      try {
        const slim = {
          ...payload,
          pendingMedia: pendingMedia
            ? {
                kind: pendingMedia.kind,
                name: pendingMedia.name,
                dataUrl: null,
              }
            : null,
          messages: payload.messages.map((m) => ({
            ...m,
            mediaPreview: null,
            hadMedia: Boolean(m.mediaPreview) || Boolean(m.hadMedia),
          })),
        };
        const text = JSON.stringify(slim);
        sessionStorage.setItem(CHAT_UI_STORAGE_KEY, text);
        localStorage.setItem(CHAT_UI_STORAGE_KEY, text);
      } catch {
        /* ignore */
      }
    }
  }
}

/** 非同步儲存訊息到 Supabase（fire-and-forget，不影響 UI） */
async function persistChatLog({ sessionId, userId, guestId, messages }) {
  try {
    await fetch("/api/chat/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, userId, guestId, messages }),
    });
  } catch {
    // 靜默失敗，不影響聊天功能
  }
}

const SITE = getPublicSiteUrl();
const JEKO_LOGO = "/images/Logo/logo-no-bg.png";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const VIDEO_LINE_PREFILL =
  "您好，我想傳操作影片請真人客服協助（網站 J寶目前僅支援截圖判讀）。";

function buildVideoRejectedReply() {
  const inHours = isSupportBusinessHours();
  if (inHours) {
    return {
      content:
        "🌼 目前 J寶 先支援「截圖」判讀，影片暫時關閉。\n\n" +
        "建議改傳錯誤畫面／設定頁截圖，我可以立刻幫你看。\n\n" +
        `若一定要傳影片，現在是人工客服時段（${SUPPORT_HOURS_LABEL}），可點下方按鈕到官方 LINE 傳影片給我們。`,
      lineCta: true,
    };
  }
  return {
    content:
      "🌼 目前 J寶 先支援「截圖」判讀，影片暫時關閉。\n\n" +
      "請改傳錯誤畫面／設定頁截圖，我就能立刻幫你看。\n\n" +
      `影片請於人工客服時段（${SUPPORT_HOURS_LABEL}）傳到官方 LINE，我們再協助。`,
    lineCta: false,
  };
}

/** 手機版聊天室為全螢幕（與 Tailwind md 斷點對齊） */
function isMobileChatViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function isProductPagePath(pathOrUrl) {
  if (!pathOrUrl) return false;
  try {
    const pathname = /^https?:\/\//i.test(pathOrUrl)
      ? new URL(pathOrUrl).pathname
      : String(pathOrUrl).split("?")[0];
    return /^\/product(\/|$)/.test(pathname);
  } catch {
    return false;
  }
}

/** 後台／LIFF 等頁不顯示 J寶（掛在 _app 後需自行隱藏） */
function shouldHideAiChat(pathname = "") {
  const p = String(pathname || "").split("?")[0];
  return (
    /^\/partner(\/|$)/.test(p) ||
    /^\/admin(\/|$)/.test(p) ||
    /^\/admin-boss(\/|$)/.test(p) ||
    /^\/line(\/|$)/.test(p) ||
    /^\/api(\/|$)/.test(p)
  );
}

/** 寫入關閉狀態，避免跳轉商品頁後又從 IndexedDB 還原成開啟 */
async function forceChatUiClosed() {
  try {
    sessionStorage.setItem("jeko_ai_chat_force_closed", "1");
  } catch {
    /* ignore */
  }
  try {
    const saved = await loadChatUiState();
    if (saved) {
      await saveChatUiState({ ...saved, isOpen: false });
    }
  } catch {
    /* ignore */
  }
}

function closeAiChatForMobileProductNav(href) {
  if (!isMobileChatViewport()) return;
  if (href && !isProductPagePath(href)) return;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("jeko:close-ai-chat"));
  }
  forceChatUiClosed();
}

const PLAN_DESTINATIONS = [
  "日本",
  "韓國",
  "泰國",
  "越南",
  "新加坡／馬來西亞",
  "港澳",
  "歐洲",
  "美國",
  "澳洲／紐西蘭",
  "多國／其他",
];

const PLAN_DAYS = ["3", "5", "7", "10", "15", "30"];

const PLAN_USAGE = [
  { id: "light", label: "輕量使用", desc: "地圖、訊息、查資料" },
  { id: "social", label: "社群／拍照分享", desc: "IG、定位、偶爾影片" },
  { id: "stream", label: "影音吃到飽", desc: "常看影片、直播" },
  { id: "work", label: "工作視訊", desc: "會議、雲端、穩定連線" },
];

/** 商品推薦卡（單張） */
function ProductCard({ card }) {
  const priceLabel =
    card.priceLabel ||
    (card.minPrice && card.maxPrice && card.minPrice !== card.maxPrice
      ? `NT$${card.minPrice} 起`
      : card.minPrice
        ? `NT$${card.minPrice}`
        : null);

  const cta =
    card.partner === "klook" || card.partner === "kkday"
      ? "查看詳情"
      : "立即購買";

  const rawUrl = card.url || "/product";
  let href = rawUrl;
  let openExternal = false;
  if (/^https?:\/\//i.test(rawUrl)) {
    try {
      const u = new URL(rawUrl);
      const host = u.hostname.replace(/^www\./, "");
      if (host.endsWith("jeko-esim.com.tw") || host === "localhost") {
        href = `${u.pathname}${u.search}`;
      } else {
        openExternal = true;
      }
    } catch {
      openExternal = true;
    }
  }

  return (
    <a
      href={href}
      target={openExternal ? "_blank" : undefined}
      rel={openExternal ? "noopener noreferrer" : undefined}
      onClick={() => {
        if (!openExternal) closeAiChatForMobileProductNav(href);
      }}
      className="flex-shrink-0 w-[168px] rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="relative h-[108px] bg-gradient-to-br from-slate-50 to-blue-50/60 flex items-center justify-center overflow-hidden">
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl}
            alt={card.name}
            className="max-h-full max-w-full w-auto h-auto object-contain p-2.5"
          />
        ) : (
          <ShoppingCart className="w-8 h-8 text-blue-300" />
        )}
        {(card.badge || card.isHotSale) && (
          <span
            className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ${
              card.isHotSale && !card.badge
                ? "bg-rose-500 text-white"
                : "bg-white/95 text-slate-700"
            }`}
          >
            {card.badge || "HOT SALE"}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2 mb-1 min-h-[2.4em]">
          {card.name}
        </p>
        {priceLabel && (
          <p className="text-[11px] font-bold text-blue-600">{priceLabel}</p>
        )}
        {card.variantCount > 0 && (
          <p className="text-[10px] text-slate-400 mt-0.5">
            {card.variantCount} 種方案
          </p>
        )}
        <div className="mt-2 w-full text-center text-[10px] bg-blue-600 text-white rounded-full py-1 font-bold">
          {cta}
        </div>
      </div>
    </a>
  );
}

/** 商品推薦輪播（1 張直接顯示，多張可左右滑） */
function ProductCardCarousel({ cards }) {
  const trackRef = useRef(null);
  if (!cards?.length) return null;

  const scroll = (dir) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dir * 180, behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-2 w-full"
    >
      <p className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1">
        <ShoppingCart className="w-3 h-3" /> eSIM 方案推薦
      </p>
      <div className="relative px-0.5">
        {cards.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => scroll(-1)}
              className="absolute left-0 top-[52px] -translate-y-1/2 z-10 bg-white/95 border border-slate-200 rounded-full p-0.5 shadow-sm hover:bg-slate-50"
              aria-label="上一張"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              className="absolute right-0 top-[52px] -translate-y-1/2 z-10 bg-white/95 border border-slate-200 rounded-full p-0.5 shadow-sm hover:bg-slate-50"
              aria-label="下一張"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </>
        )}
        <div
          ref={trackRef}
          className="flex gap-2.5 overflow-x-auto scroll-smooth py-1 px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {cards.map((card, i) => (
            <ProductCard key={card.url || i} card={card} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/** 「幫你規劃」表單：地點／天數／使用習慣 → 推薦產品 */
function PlanTripForm({ disabled = false, onCancel, onSubmit }) {
  const [destination, setDestination] = useState("");
  const [customDestination, setCustomDestination] = useState("");
  const [days, setDays] = useState("7");
  const [usageId, setUsageId] = useState("social");

  const usage = PLAN_USAGE.find((u) => u.id === usageId) || PLAN_USAGE[1];
  const place =
    destination === "多國／其他"
      ? customDestination.trim()
      : destination;
  const canSubmit = Boolean(place) && Boolean(days) && Boolean(usage) && !disabled;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!canSubmit) return;
    onSubmit?.({
      destination: place,
      days,
      usageLabel: usage.label,
      usageDesc: usage.desc,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/90 to-white shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-blue-100/80 sticky top-0 z-[1] bg-blue-50/95 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <p className="text-[13px] font-bold text-slate-800">幫你規劃 eSIM</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-full text-slate-400 hover:bg-white hover:text-slate-600"
          aria-label="關閉規劃表單"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
        <div>
          <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1.5">
            <MapPin className="w-3 h-3 text-blue-500" />
            旅遊地點
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PLAN_DESTINATIONS.map((d) => (
              <button
                key={d}
                type="button"
                disabled={disabled}
                onClick={() => setDestination(d)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  destination === d
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          {destination === "多國／其他" && (
            <input
              type="text"
              value={customDestination}
              onChange={(e) => setCustomDestination(e.target.value)}
              placeholder="例如：日本＋韓國，或填國家名"
              disabled={disabled}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          )}
        </div>

        <div>
          <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1.5">
            <CalendarDays className="w-3 h-3 text-blue-500" />
            天數
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PLAN_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                disabled={disabled}
                onClick={() => setDays(d)}
                className={`min-w-[2.5rem] px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  days === d
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-200"
                }`}
              >
                {d} 天
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1.5">
            <Sparkles className="w-3 h-3 text-blue-500" />
            使用習慣
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {PLAN_USAGE.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={disabled}
                onClick={() => setUsageId(u.id)}
                className={`rounded-xl border px-2.5 py-2 text-left transition-all ${
                  usageId === u.id
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                    : "border-slate-200 bg-white hover:border-blue-200"
                }`}
              >
                <span className="block text-[11px] font-bold text-slate-800">
                  {u.label}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5 leading-snug">
                  {u.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-white text-[13px] font-bold py-2.5 hover:bg-blue-700 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          幫我推薦方案
        </button>
      </form>
    </motion.div>
  );
}

/** 歡迎詞下方：優惠／活動 card 輪播 */
function PromoCardCarousel({ cards }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!cards?.length || cards.length < 2) return undefined;
    const timer = setInterval(() => {
      setActive((i) => {
        const next = (i + 1) % cards.length;
        const track = trackRef.current;
        const child = track?.children?.[next];
        // 只用 track 的 scrollLeft，避免 scrollIntoView 拉動整個聊天視窗
        if (track && child) {
          track.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
        }
        return next;
      });
    }, 4200);
    return () => clearInterval(timer);
  }, [cards]);

  if (!cards?.length) return null;

  const scroll = (dir) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: 0.08 }}
      className="mt-2 -mx-0.5"
    >
      <p className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1">
        <Percent className="w-3 h-3" /> 優惠／活動
      </p>
      <div className="relative">
        {cards.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => scroll(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 border border-slate-200 rounded-full p-0.5 shadow-sm"
              aria-label="上一張"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 border border-slate-200 rounded-full p-0.5 shadow-sm"
              aria-label="下一張"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </>
        )}
        <div
          ref={trackRef}
          className="flex gap-2 overflow-x-auto scroll-smooth pb-1 px-0.5 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {cards.map((card) => {
            const href =
              card.href === "__login__" ? buildLoginUrl() : card.href;
            const isExternal = href.startsWith("http");
            return (
              <a
                key={card.id}
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                onClick={() => {
                  if (!isExternal) closeAiChatForMobileProductNav(href);
                }}
                className="snap-start flex-shrink-0 w-[210px] rounded-xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-shadow group bg-white"
              >
                <div className="relative h-[100px] bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.image}
                    alt={card.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <span className="absolute top-2 left-2 inline-flex items-center gap-0.5 text-[9px] font-bold text-white bg-black/45 backdrop-blur-[2px] rounded-full px-1.5 py-0.5">
                    <Tag className="w-2.5 h-2.5" />
                    {card.badge}
                  </span>
                  <p className="absolute bottom-2 left-2 right-2 text-[12px] font-bold text-white leading-snug line-clamp-2 drop-shadow">
                    {card.title}
                  </p>
                </div>
                <div className="px-2.5 py-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">
                    {card.subtitle}
                  </p>
                  <span className="shrink-0 text-[10px] font-bold text-blue-600 group-hover:text-blue-700">
                    {card.cta} →
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
      {cards.length > 1 && (
        <div className="flex justify-center gap-1 mt-1.5">
          {cards.map((c, i) => (
            <span
              key={c.id}
              className={`h-1 rounded-full transition-all ${
                i === active ? "w-3 bg-blue-500" : "w-1 bg-slate-200"
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function AvatarBubble({ src, alt, fallback, className = "" }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        onError={() => setBroken(true)}
        className={`h-8 w-8 shrink-0 rounded-full object-cover bg-white border border-slate-200 ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 border border-slate-200 ${className}`}
      aria-hidden
    >
      {fallback}
    </div>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** 壓縮圖片，避免 body 過大 */
async function compressImageFile(file, maxEdge = 1280, quality = 0.78) {
  if (!file.type.startsWith("image/")) {
    return fileToDataUrl(file);
  }

  const dataUrl = await fileToDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function AiChatWidget() {
  const router = useRouter();
  const { user, session, isLoggedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState(null);
  const [messages, setMessages] = useState([DEFAULT_WELCOME_MESSAGE]);
  const [chatHydrated, setChatHydrated] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);

  // 每個對話視窗有唯一 sessionId（跳頁會從 storage 還原）
  const sessionIdRef = useRef(null);
  if (!sessionIdRef.current) {
    sessionIdRef.current = createSessionId();
  }
  const guestIdRef = useRef(null);
  useEffect(() => {
    guestIdRef.current = getOrCreateGuestId();
  }, []);

  // 跳頁／重整：還原對話、截圖與是否開啟
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadChatUiState();
      if (cancelled) return;
      if (saved?.messages?.length) {
        if (saved.sessionId) sessionIdRef.current = saved.sessionId;
        let restored = saved.messages;
        // 舊歡迎詞／步驟引導文案 → 換成初版
        const first = restored[0];
        const firstText = String(first?.content || "");
        const needsWelcomeRefresh =
          first?.role === "ai" &&
          (first.showWizard ||
            first.welcomeVersion !== WELCOME_TEXT_VERSION ||
            firstText.includes("先選你想了解的服務") ||
            (firstText.includes("嗨！我是 J寶") &&
              firstText !== WELCOME_TEXT));
        if (needsWelcomeRefresh) {
          restored = [
            {
              ...DEFAULT_WELCOME_MESSAGE,
              id: first?.id || 1,
            },
            ...restored.slice(1),
          ];
        }
        setMessages(restored);
        let shouldOpen = Boolean(saved.isOpen);
        try {
          if (sessionStorage.getItem("jeko_ai_chat_force_closed") === "1") {
            shouldOpen = false;
            sessionStorage.removeItem("jeko_ai_chat_force_closed");
          }
        } catch {
          /* ignore */
        }
        try {
          const params = new URLSearchParams(window.location.search);
          if (
            params.get("openChat") === "1" ||
            params.get("jeko_chat") === "1"
          ) {
            shouldOpen = true;
          }
        } catch {
          /* ignore */
        }
        // 手機全螢幕：進入商品頁時不要自動打開 J寶
        if (
          shouldOpen &&
          isMobileChatViewport() &&
          isProductPagePath(window.location.pathname)
        ) {
          shouldOpen = false;
        }
        if (shouldOpen) setIsOpen(true);
        else if (saved.isOpen) {
          // 寫回關閉，避免下次回跳又開
          saveChatUiState({
            sessionId: saved.sessionId,
            isOpen: false,
            messages: restored,
            pendingMedia: saved.pendingMedia,
          });
        }
        if (saved.pendingMedia?.kind === "image") {
          setPendingMedia(saved.pendingMedia);
        }
      } else {
        try {
          const params = new URLSearchParams(window.location.search);
          if (
            params.get("openChat") === "1" ||
            params.get("jeko_chat") === "1"
          ) {
            const blockMobileProduct =
              isMobileChatViewport() &&
              isProductPagePath(window.location.pathname);
            if (!blockMobileProduct) setIsOpen(true);
          }
        } catch {
          /* ignore */
        }
      }
      setChatHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 同步寫入 IndexedDB（含截圖），避免 Layout 重掛載後消失
  useEffect(() => {
    if (!chatHydrated) return;
    saveChatUiState({
      sessionId: sessionIdRef.current,
      isOpen,
      messages,
      pendingMedia,
    });
  }, [messages, isOpen, pendingMedia, chatHydrated]);

  const messagesContainerRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const scrollRef = useRef(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffSummary, setHandoffSummary] = useState("");
  const [handoffCopied, setHandoffCopied] = useState(false);
  const [handoffToast, setHandoffToast] = useState(null); // { kind: 'line'|'wa'|'copy', hasMedia?: bool }
  /** 桌機轉專人：顯示 QR，避免被導到 line.me 官網 */
  const [lineQrOpen, setLineQrOpen] = useState(false);
  const [lineQrPageUrl, setLineQrPageUrl] = useState("");
  const [lineQrError, setLineQrError] = useState("");

  const fileInputRef = useRef(null);

  const userAvatarUrl = useMemo(() => {
    if (!isLoggedIn) return null;
    return (
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      session?.user?.image ||
      null
    );
  }, [isLoggedIn, user, session]);

  const userDisplayName = useMemo(() => {
    if (!isLoggedIn) return "訪客";
    return (
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      session?.user?.name ||
      user?.email?.split("@")[0] ||
      session?.user?.email?.split("@")[0] ||
      "會員"
    );
  }, [isLoggedIn, user, session]);

  /**
   * 使用者轉專人客服：
   * - 手機：直接開 LINE App（深層連結）
   * - 桌機：顯示 QR（掃碼加入），避免瀏覽器被導到 line.me 官網
   * - Shift／Alt：內部 WhatsApp 工具
   */
  const handleContactAgent = useCallback(
    async (e) => {
      e.preventDefault();
      const userLabel = userDisplayName || "訪客";
      const staffSummary = buildHandoffSummary(messages, { userLabel });
      setHandoffSummary(staffSummary);
      setHandoffCopied(false);

      if (e.shiftKey || e.altKey) {
        setLineQrOpen(false);
        setHandoffOpen(true);
        return;
      }

      setHandoffOpen(false);
      const hasMedia = messages.some(
        (m) => m.mediaPreview || m.mediaKind === "video" || m.hadMedia,
      );

      if (prefersLineAppDeepLink()) {
        setLineQrOpen(false);
        const lineText = buildCustomerLineMessage(messages, { userLabel });
        openOfficialLine(buildLineOaMessageUrl(lineText));
        setHandoffToast({ kind: "line", hasMedia });
        setTimeout(() => setHandoffToast(null), 4500);
        return;
      }

      // 桌機：短 QR → 手機中繼頁 → LINE 預填（剪貼簿無法跨裝置）
      const qrText = buildCustomerLineMessageForQr(messages, { userLabel });
      setLineQrError("");
      setLineQrPageUrl("");
      setLineQrOpen(true);
      setHandoffToast(null);
      try {
        const res = await fetch("/api/line/handoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: qrText }),
        });
        const data = await res.json();
        if (!res.ok || !data?.id) {
          throw new Error(data?.error || "無法產生轉介");
        }
        const pageUrl = `${getHandoffQrOrigin()}/line/handoff/${data.id}`;
        setLineQrPageUrl(pageUrl);
      } catch {
        setLineQrError(
          "無法產生掃碼轉介，請改用手機開啟本站後再點「轉專人客服」。",
        );
      }
    },
    [messages, userDisplayName],
  );

  const copyHandoffSummary = useCallback(async () => {
    const text = handoffSummary || "";
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setHandoffCopied(true);
      setHandoffToast({ kind: "copy" });
      setTimeout(() => setHandoffToast(null), 2500);
    } catch {
      setHandoffToast({ kind: "copy-fail" });
      setTimeout(() => setHandoffToast(null), 2500);
    }
  }, [handoffSummary]);

  const openHandoffWhatsApp = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText && handoffSummary) {
        await navigator.clipboard.writeText(handoffSummary);
        setHandoffCopied(true);
      }
    } catch {
      /* ignore */
    }
    const url = buildWhatsAppShareUrl(handoffSummary);
    window.open(url, "_blank", "noopener,noreferrer");
    setHandoffToast({ kind: "wa" });
    setTimeout(() => setHandoffToast(null), 4000);
  }, [handoffSummary]);

  const openHandoffLine = useCallback(() => {
    const url = buildLineOaMessageUrl(handoffSummary);
    openOfficialLine(url);
    const hasMedia = /截圖|影片/.test(handoffSummary);
    setHandoffToast({ kind: "line", hasMedia });
    setTimeout(() => setHandoffToast(null), 3500);
  }, [handoffSummary]);

  const userInitial = (userDisplayName || "會").trim().charAt(0).toUpperCase();

  const scrollToBottom = useCallback((force = false) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (!force && !stickToBottomRef.current) return;
    // 只捲訊息容器，勿用 scrollIntoView（會連動外層／頁面亂跳）
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = gap < 96;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, pendingMedia, showPlanForm, scrollToBottom]);

  useEffect(() => {
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    window.addEventListener("jeko:open-ai-chat", open);
    window.addEventListener("jeko:close-ai-chat", close);
    return () => {
      window.removeEventListener("jeko:open-ai-chat", open);
      window.removeEventListener("jeko:close-ai-chat", close);
    };
  }, []);

  // 客戶端路由切到商品頁時（手機）：自動關閉全螢幕聊天室
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleRoute = (url) => {
      if (!isMobileChatViewport()) return;
      if (!isProductPagePath(url)) return;
      setIsOpen(false);
      forceChatUiClosed();
    };
    router.events.on("routeChangeStart", handleRoute);
    return () => {
      router.events.off("routeChangeStart", handleRoute);
    };
  }, [router.events]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("jeko:ai-chat-visibility", { detail: { open: isOpen } }),
    );
  }, [isOpen]);

  /** 快捷 tag：僅在橫向意圖或按住 Shift 時轉成橫滑，避免攔截直向捲動 */
  const handleWheel = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    const mostlyHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (!mostlyHorizontal && !e.shiftKey) return;
    e.preventDefault();
    el.scrollLeft += e.deltaX + e.deltaY;
  };

  const renderMessageContent = (content) => {
    // https 連結，或站內路徑 /shop/... /product/... /blog/...
    const tokenRegex =
      /(https?:\/\/[^\s\]）)]+|\/(?:shop|product|blog|esim)[^\s\]）)]*)/g;
    const parts = String(content || "").split(tokenRegex);
    return parts.map((part, index) => {
      if (!part) return null;
      if (/^https?:\/\//i.test(part) || /^\/(shop|product|blog|esim)/.test(part)) {
        const href = part.startsWith("http")
          ? part
          : `${typeof window !== "undefined" ? window.location.origin : ""}${part}`;
        const label = part.length > 64 ? `${part.slice(0, 48)}…` : part;
        const isExternal = part.startsWith("http");
        return (
          <a
            key={index}
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            onClick={() => {
              if (!isExternal) closeAiChatForMobileProductNav(part);
            }}
            className="text-blue-500 underline hover:text-blue-700 break-all font-bold mx-0.5"
          >
            {label}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const onPickMedia = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (isVideo) {
      const reply = buildVideoRejectedReply();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "ai",
          content: reply.content,
          lineCta: reply.lineCta,
        },
      ]);
      return;
    }

    if (!isImage) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "ai",
          content: "目前僅支援圖片截圖。請上傳錯誤畫面或設定頁截圖。",
        },
      ]);
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "ai",
          content: "圖片太大了，請壓縮後再傳（建議 4MB 以內）。",
        },
      ]);
      return;
    }

    try {
      const dataUrl = await compressImageFile(file);
      setPendingMedia({
        dataUrl,
        mimeType: "image/jpeg",
        name: file.name,
        kind: "image",
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "ai",
          content: "無法讀取此檔案，請換一張再試。",
        },
      ]);
    }
  };

  const processChat = async (text, mediaOverride = null, options = {}) => {
    const media = mediaOverride || pendingMedia;
    const trimmed = (text || "").trim();
    if ((!trimmed && !media) || isLoading) return;

    // 舊快取若殘留影片附件：不送 API，改引導截圖／LINE
    if (media?.kind === "video") {
      setPendingMedia(null);
      const reply = buildVideoRejectedReply();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "user",
          content: trimmed || "（已上傳影片）",
        },
        {
          id: Date.now() + 1,
          role: "ai",
          content: reply.content,
          lineCta: reply.lineCta,
        },
      ]);
      return;
    }

    const displayContent =
      typeof options.displayContent === "string" && options.displayContent.trim()
        ? options.displayContent.trim()
        : trimmed || "（已上傳截圖）";
    const fromQuickButton = Boolean(options.fromQuickButton);
    const userLogProvider = fromQuickButton ? "quick" : null;

    stickToBottomRef.current = true;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        content: displayContent,
        // 給 AI／後續 history 用的完整指令（不顯示在氣泡）
        apiContent: trimmed || displayContent,
        mediaPreview: media?.kind === "image" ? media.dataUrl : null,
        mediaKind: media?.kind || null,
      },
    ]);
    setPendingMedia(null);
    setIsLoading(true);

    if (!media && PRESET_ANSWERS[trimmed]) {
      const presetReply = PRESET_ANSWERS[trimmed];
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: "ai", content: presetReply },
        ]);
        setIsLoading(false);
      }, 600);
      // 儲存 preset 對話紀錄
      persistChatLog({
        sessionId: sessionIdRef.current,
        userId: user?.id || null,
        guestId: guestIdRef.current,
        messages: [
          { role: "user", content: displayContent, provider: "preset" },
          { role: "ai", content: presetReply, provider: "preset" },
        ],
      });
      return;
    }

    const history = messages
      .filter((msg) => msg.role === "user" || msg.role === "ai")
      .slice(-10)
      .map((msg) => ({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.apiContent || msg.content,
      }));

    try {
      const payload = {
        message: trimmed || displayContent,
        history,
      };
      if (media?.kind === "image") payload.image = media.dataUrl;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "請求失敗");
      }
      const aiReply = data.reply;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          content: aiReply,
          productCards: data.productCards?.length ? data.productCards : null,
          affiliateCards: data.affiliateCards?.length
            ? data.affiliateCards
            : null,
          shopCards: data.shopCards?.length ? data.shopCards : null,
        },
      ]);
      // 儲存 user + ai 兩則紀錄（快捷按鈕標記 quick，掃描 FAQ 時略過）
      persistChatLog({
        sessionId: sessionIdRef.current,
        userId: user?.id || null,
        guestId: guestIdRef.current,
        messages: [
          {
            role: "user",
            content: displayContent,
            provider: userLogProvider,
          },
          {
            role: "ai",
            content: aiReply,
            provider: fromQuickButton ? "quick" : data.provider || null,
          },
        ],
      });
    } catch (error) {
      const errMsg = `抱歉，我暫時無法處理：${error.message || "請稍後再試"}`;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          content: errMsg,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    const text = input;
    setInput("");
    processChat(text);
  };

  const handlePlanSubmit = ({ destination, days, usageLabel, usageDesc }) => {
    if (isLoading) return;
    setShowPlanForm(false);
    const n = Number(days) || 0;
    const usageFloor =
      usageLabel === "工作視訊"
        ? { perDay: 3.5, label: "工作視訊約每日 3.5GB 起" }
        : usageLabel === "影音吃到飽"
          ? { perDay: 5, label: "影音約每日 5GB 起" }
          : usageLabel === "社群／拍照分享"
            ? { perDay: 2.5, label: "社群約每日 2.5GB 起" }
            : { perDay: 1.5, label: "輕量約每日 1.5GB 起" };
    const minTotal = n > 0 ? Math.ceil(n * usageFloor.perDay) : 0;

    // 使用者氣泡只顯示需求摘要
    const displayContent =
      `請幫我推薦適合的 eSIM：\n` +
      `· 旅遊地點：${destination}\n` +
      `· 天數：${days} 天\n` +
      `· 使用習慣：${usageLabel}（${usageDesc}）`;

    // 完整指令只送 AI，不顯示在聊天室
    const apiPrompt =
      `【eSIM專推】請依我的旅遊需求推薦適合的 eSIM 方案（請附上商品推薦）：\n` +
      `· 旅遊地點：${destination}\n` +
      `· 天數：${days} 天\n` +
      `· 使用習慣：${usageLabel}（${usageDesc}）\n` +
      `請只推薦 Jeko eSIM 商品 1～2 個，不要推薦商城配件、Klook／KKday、門票或鐵路周遊券。\n` +
      `推薦原則：第 1 優先吃到飽；第 2 可推總量型，但總量至少約 ${minTotal || "（天數×每日下限）"}GB` +
      `（${usageFloor.label} × ${days} 天），禁止推剛好均攤、也不要為湊數推不夠用的方案。` +
      `並簡短說明為什麼適合我。`;

    processChat(apiPrompt, null, { displayContent });
  };

  // 後台／LIFF：不渲染浮動客服（狀態仍保留在記憶體，避免換頁中斷）
  if (shouldHideAiChat(router.pathname)) {
    return null;
  }

  return (
    <div
      className={`fixed font-sans ${
        isOpen
          ? "inset-0 z-[12000] flex flex-col pointer-events-none md:inset-auto md:bottom-6 md:right-6 md:items-end"
          : "bottom-[8.75rem] right-4 z-[11000] flex flex-col items-end pointer-events-none md:bottom-6 md:right-6"
      }`}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-chat-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-chat-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="pointer-events-auto bg-white w-full h-[100dvh] max-h-[100dvh] rounded-none border-0 md:border md:border-gray-300 flex flex-col overflow-hidden overscroll-contain md:w-[400px] md:h-[min(600px,70vh)] md:max-h-[80vh] md:rounded-2xl md:mb-4 origin-bottom-right"
          >
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={JEKO_LOGO}
                  alt="JEKO"
                  className="h-9 w-9 rounded-full object-contain bg-white p-0.5 border border-white/40"
                />
                <div className="text-left">
                  <h3 id="ai-chat-title" className="font-bold text-[14px]">
                    J寶 - 您的旅行小幫手
                  </h3>
                  <div className="text-[11px] opacity-80 flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />{" "}
                    {isLoggedIn ? `Hi，${userDisplayName}` : "Live"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="關閉聊天"
                className="p-1 hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 交接提示 Toast */}
            {handoffToast && (
              <div className="mx-3 mt-2 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-[12px] text-emerald-900 shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 fill-emerald-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.477 2 2 6.062 2 11.063c0 2.742 1.313 5.194 3.381 6.853-.148.548-.96 3.302-.99 3.538-.038.283.103.56.372.68.083.037.172.056.26.056.195 0 .378-.078.51-.217.175-.183 3.028-2.018 3.685-2.456.566.08 1.141.12 1.72.12 5.523 0 10-4.06 10-9.063S17.523 2 12 2z" />
                </svg>
                <div>
                  {handoffToast.kind === "copy" && (
                    <>
                      <p className="font-bold">摘要已複製</p>
                      <p className="mt-0.5 leading-snug">
                        可貼到 WhatsApp 與供應商／團隊溝通（內部用）。
                      </p>
                    </>
                  )}
                  {handoffToast.kind === "copy-fail" && (
                    <>
                      <p className="font-bold">複製失敗</p>
                      <p className="mt-0.5 leading-snug">
                        請手動選取下方摘要文字再複製。
                      </p>
                    </>
                  )}
                  {handoffToast.kind === "wa" && (
                    <>
                      <p className="font-bold">已開啟 WhatsApp（內部）</p>
                      <p className="mt-0.5 leading-snug">
                        請選供應商／團隊對話後送出；摘要也已複製備援。
                      </p>
                    </>
                  )}
                  {handoffToast.kind === "line" && (
                    <>
                      <p className="font-bold">正在開啟官方 LINE</p>
                      <p className="mt-0.5 leading-snug">
                        手機將開啟 LINE App。尚未加入可先加好友，訊息預填後再送出。
                        {handoffToast.hasMedia && (
                          <span className="block mt-0.5 text-emerald-800">
                            截圖請在 LINE 中另行上傳。
                          </span>
                        )}
                      </p>
                    </>
                  )}
                  {handoffToast.kind === "line-desktop-try" && (
                    <>
                      <p className="font-bold">已嘗試開啟 LINE 電腦版</p>
                      <p className="mt-0.5 leading-snug">
                        若仍跳到官網，請改用上方 QR 用手機掃描加入。
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 桌機轉專人：掃 QR 加官方 LINE（避免被導到 line.me 官網） */}
            {lineQrOpen && (
              <div className="mx-3 mt-2 rounded-2xl border border-[#d4d4d4] bg-[#fafafa] shadow-md overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2.5 bg-[#2d2d2d] border-b border-[#3d3d3d]">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-white inline-flex items-center gap-1.5">
                      <LineIconSvg className="w-4 h-4 text-white/80" />
                      用手機掃碼轉專人客服
                    </p>
                    <p className="text-[10px] text-white/65 mt-0.5 leading-snug">
                      掃碼後手機會開啟轉介頁，再自動把提問帶進官方 LINE
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLineQrOpen(false)}
                    className="p-1 rounded-full hover:bg-white/10 text-white/70 shrink-0"
                    aria-label="關閉"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 space-y-3">
                  {lineQrError && (
                    <p className="text-[12px] text-[#8a3a3a] leading-relaxed">
                      {lineQrError}
                    </p>
                  )}
                  {!lineQrPageUrl && !lineQrError && (
                    <p className="text-[12px] text-[#5c5c5c]">正在產生掃碼…</p>
                  )}
                  {lineQrPageUrl && (
                    <div className="flex flex-col sm:flex-row gap-3 items-center sm:items-start">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={buildLineHandoffQrImageUrl(lineQrPageUrl)}
                        alt="轉專人客服 QR Code"
                        width={200}
                        height={200}
                        className="w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] rounded-xl border border-[#e0e0e0] bg-white shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-2 text-left w-full">
                        <ol className="text-[11px] text-[#5c5c5c] space-y-1 list-decimal list-inside leading-relaxed">
                          <li>用手機相機或 LINE 掃描左側 QR</li>
                          <li>手機會開啟轉介頁，再自動帶入提問到官方 LINE</li>
                          <li>確認預填內容後按送出即可</li>
                        </ol>
                        <a
                          href={lineQrPageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-[11px] font-semibold text-[#2d2d2d] underline underline-offset-2 break-all hover:text-[#1a1a1a]"
                        >
                          或用手機開啟此轉介連結
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 內部交接面板（Shift／Alt 點「轉專人客服」開啟；WhatsApp 僅內部用） */}
            {handoffOpen && (
              <div className="mx-3 mt-2 rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border-b border-slate-100">
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">
                      內部溝通工具
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      WhatsApp／複製摘要給供應商或團隊（使用者走官方 LINE）
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHandoffOpen(false)}
                    className="p-1 rounded-full hover:bg-slate-200 text-slate-500"
                    aria-label="關閉"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 space-y-2.5">
                  <textarea
                    readOnly
                    value={handoffSummary}
                    rows={7}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={copyHandoffSummary}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 text-white text-[12px] font-semibold py-2.5 hover:bg-slate-700 transition-colors"
                    >
                      {handoffCopied ? "已複製 ✓" : "複製摘要"}
                    </button>
                    <button
                      type="button"
                      onClick={openHandoffWhatsApp}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-white text-[12px] font-semibold py-2.5 hover:bg-[#1ebe57] transition-colors"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3.5 h-3.5 fill-current"
                        aria-hidden="true"
                      >
                        <path d="M12 2C6.477 2 2 6.062 2 11.063c0 2.742 1.313 5.194 3.381 6.853-.148.548-.96 3.302-.99 3.538-.038.283.103.56.372.68.083.037.172.056.26.056.195 0 .378-.078.51-.217.175-.183 3.028-2.018 3.685-2.456.566.08 1.141.12 1.72.12 5.523 0 10-4.06 10-9.063S17.523 2 12 2z" />
                      </svg>
                      開 WhatsApp
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={openHandoffLine}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#06C755] text-[#06C755] text-[12px] font-semibold py-2.5 hover:bg-[#06C755]/5 transition-colors"
                  >
                    <LineIconSvg className="w-3.5 h-3.5" />
                    預覽：開啟官方 LINE（同使用者路徑）
                  </button>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    使用者一般點擊會直接開 LINE；此面板僅內部用（按住
                    Shift 再點「轉專人客服」開啟）。
                  </p>
                </div>
              </div>
            )}

            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 bg-slate-50/50 touch-pan-y"
              style={{ overflowAnchor: "none", WebkitOverflowScrolling: "touch" }}
            >
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isUser && (
                      <AvatarBubble
                        src={JEKO_LOGO}
                        alt="J寶"
                        className="mb-0.5 object-contain p-0.5"
                        fallback={<Bot className="w-4 h-4 text-[#0A6CD0]" />}
                      />
                    )}
                    <div
                      className={`flex flex-col gap-0 ${
                        msg.promoCards || msg.productCards
                          ? "max-w-[92%]"
                          : "max-w-[80%]"
                      }`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl text-[14px] leading-relaxed shadow-sm text-left ${
                          isUser
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white text-slate-700 border border-slate-100 rounded-bl-sm"
                        }`}
                      >
                        {msg.mediaPreview && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={msg.mediaPreview}
                            alt="上傳截圖"
                            className="mb-2 max-h-40 rounded-lg object-contain bg-black/10"
                          />
                        )}
                        {msg.hadMedia && !msg.mediaPreview && (
                          <div className="mb-2 flex items-center gap-1.5 text-[12px] opacity-90">
                            <ImagePlus className="w-3.5 h-3.5" />
                            曾附上截圖
                          </div>
                        )}
                        {msg.mediaKind === "video" && !msg.mediaPreview && (
                          <div className="mb-2 flex items-center gap-1.5 text-[12px] opacity-90">
                            <Film className="w-3.5 h-3.5" />
                            已附上影片
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">
                          {msg.role === "ai"
                            ? renderMessageContent(msg.content)
                            : msg.content}
                        </div>
                        {!isUser && msg.lineCta && (
                          <a
                            href={buildLineOaMessageUrl(VIDEO_LINE_PREFILL)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#06C755] px-3 py-2.5 text-[12px] font-semibold text-white hover:bg-[#05b34c] transition-colors"
                          >
                            <LineIconSvg className="w-3.5 h-3.5" />
                            開啟官方 LINE 傳影片
                          </a>
                        )}
                      </div>
                      {/* 商品推薦卡 */}
                      {!isUser && msg.shopCards && (
                        <ShopChatOffers items={msg.shopCards} />
                      )}
                      {!isUser && msg.affiliateCards && (
                        <AffiliateChatOffers items={msg.affiliateCards} />
                      )}
                      {!isUser && msg.productCards && (
                        <ProductCardCarousel cards={msg.productCards} />
                      )}
                      {/* 歡迎詞優惠／活動輪播 */}
                      {!isUser && msg.promoCards && (
                        <PromoCardCarousel cards={msg.promoCards} />
                      )}
                      {/* 轉專人客服：手機開 App；桌機改顯示 QR */}
                      {!isUser && (
                        <button
                          type="button"
                          onClick={handleContactAgent}
                          title="手機直接開 LINE；電腦顯示 QR 掃碼"
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-900 transition-colors select-none cursor-pointer bg-transparent border-0 p-0"
                        >
                          <LineIconSvg className="w-3 h-3 shrink-0" />
                          答不出來嗎？幫你轉專人客服
                        </button>
                      )}
                    </div>
                    {isUser && (
                      <AvatarBubble
                        src={isLoggedIn ? userAvatarUrl : null}
                        alt={userDisplayName}
                        className="mb-0.5"
                        fallback={
                          isLoggedIn ? (
                            <span className="text-[12px] font-bold text-[#0A6CD0]">
                              {userInitial}
                            </span>
                          ) : (
                            <UserRound className="w-4 h-4" />
                          )
                        }
                      />
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex items-end gap-2 justify-start">
                  <AvatarBubble
                    src={JEKO_LOGO}
                    alt="J寶"
                    className="mb-0.5 object-contain p-0.5"
                    fallback={<Bot className="w-4 h-4 text-[#0A6CD0]" />}
                  />
                  <div className="bg-white border border-slate-100 p-3 rounded-2xl flex gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                    <span
                      className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    />
                  </div>
                </div>
              )}

              <AnimatePresence>
                {showPlanForm && (
                  <div className="pt-1">
                    <PlanTripForm
                      disabled={isLoading}
                      onCancel={() => setShowPlanForm(false)}
                      onSubmit={handlePlanSubmit}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white px-2 pt-2 pb-1 border-t border-gray-50 shrink-0">
              <p className="px-2 pb-1.5 text-[10px] text-slate-400">
                試試這樣問 · 左右滑看更多
              </p>
              <div
                ref={scrollRef}
                onWheel={handleWheel}
                className="flex gap-2 overflow-x-auto pb-2 px-2 no-scrollbar"
                style={{
                  scrollBehavior: "smooth",
                  msOverflowStyle: "none",
                  scrollbarWidth: "none",
                }}
              >
                <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                <button
                  type="button"
                  onClick={() => {
                    stickToBottomRef.current = true;
                    setShowPlanForm(true);
                  }}
                  disabled={isLoading}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-bold border transition-all disabled:opacity-50 inline-flex items-center gap-1 ${
                    showPlanForm
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  幫你規劃
                </button>
                {QUICK_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setShowPlanForm(false);
                      processChat(q, null, { fromQuickButton: true });
                    }}
                    disabled={isLoading}
                    className="whitespace-nowrap px-3.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[12px] font-bold hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              {pendingMedia && (
                <div className="mb-2 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/80 px-2 py-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingMedia.dataUrl}
                    alt="預覽"
                    className="h-10 w-10 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[11px] font-medium text-slate-700">
                      {pendingMedia.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      將判讀截圖
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingMedia(null)}
                    className="rounded-full p-1 text-slate-500 hover:bg-white"
                    aria-label="移除附件"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSend}
                className="flex items-center mb-5 gap-1.5 bg-gray-50 border border-gray-200 p-1.5 rounded-full"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickMedia}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="shrink-0 rounded-full p-2.5 text-slate-500 hover:bg-white hover:text-blue-600 transition-colors"
                  title="上傳截圖"
                  aria-label="上傳截圖"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    pendingMedia
                      ? "補充說明（可選）..."
                      : "輸入問題或上傳截圖..."
                  }
                  aria-label="輸入訊息"
                  className="flex-1 bg-transparent px-2 border-none outline-none focus:ring-0 text-base text-slate-700"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  aria-label="送出訊息"
                  disabled={(!input.trim() && !pendingMedia) || isLoading}
                  className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <QuarterRing size="sm" className="text-white" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        initial="rest"
        whileHover="hover"
        animate="rest"
        className="pointer-events-auto hidden md:flex items-center gap-3 cursor-pointer group bg-transparent border-0 p-0"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="ai-chat-panel"
        aria-label={isOpen ? "關閉客服聊天" : "開啟客服聊天"}
      >
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              variants={{
                rest: { opacity: 0, x: 20, scale: 0.8 },
                hover: { opacity: 1, x: 0, scale: 1 },
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="bg-white text-blue-600 px-4 py-2 rounded-full text-[13px] font-bold border border-gray-300 whitespace-nowrap"
            >
              您的旅行小幫手
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`flex items-center justify-center w-14 h-14 rounded-full border border-gray-300 transition-all ${
            isOpen
              ? "bg-slate-800 text-white"
              : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6" aria-hidden="true" />
          ) : (
            <Bot className="w-7 h-7" aria-hidden="true" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}
