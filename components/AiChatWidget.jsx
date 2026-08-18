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
  Loader2,
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
import { useAuth } from "../hooks/useAuth";
import AffiliateChatOffers from "./affiliate/AffiliateChatOffers";
import ShopChatOffers from "./Shop/ShopChatOffers";
import { LineIconSvg } from "@/components/social/SocialBrandIcons";
import { useRouter } from "next/router";

/** LINE OA Basic ID（含 @），用於 oaMessage 預填文字 */
const LINE_OA_ID = process.env.NEXT_PUBLIC_LINE_OA_ID || "@593gvyzn";

/**
 * MicroeSIM WhatsApp（選填國際號碼，無 + 號，例：8615999587946）。
 * 未設定時開啟 WhatsApp 僅帶預填文字，由客服自行選群組貼上。
 */
const MICROESIM_WA =
  (process.env.NEXT_PUBLIC_MICROESIM_WHATSAPP || "").replace(/\D/g, "");


const WELCOME_TEXT =
  "🌼 嗨！我是 J寶，Jeko 的旅行小幫手～\n" +
  "目前最拿手的是 eSIM 上網與景點行程相關問題，需要什麼直接跟我說～\n" +
  "（備註：住宿、包車、3C 與旅行用品即將上線，敬請期待。）";

const WELCOME_TEXT_VERSION = 3; // 變更歡迎詞時 +1，自動替換快取中的舊歡迎詞

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
 * 官方文件：https://developers.line.biz/en/docs/messaging-api/using-line-url-scheme/
 */
function buildLineOaMessageUrl(text) {
  // Android Intent / URL 長度有限，摘要壓在約 900 字內
  const body = String(text || "").slice(0, 900);
  const id = encodeURIComponent(LINE_OA_ID);
  return `https://line.me/R/oaMessage/${id}/?${encodeURIComponent(body)}`;
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
const MAX_VIDEO_BYTES = 10 * 1024 * 1024;

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

const PRESET_ANSWERS = {
  "怎麼安裝 eSIM？": `安裝步驟：\n1. Email 接收 QR Code。\n2. 手機設定 > 行動服務 > 加入 eSIM。\n3. 掃描 QR Code 即可。\n教學：${SITE}/operation-shopee/`,
  "我的手機支援嗎？": `請檢查：\n- iPhone：設定 > 一般 > 關於本機，查看是否有 EID。\n- Android：撥號輸入 *#06# 查看 EID。\n清單：${SITE}/compatibility`,
  "日本推薦哪一款？": `首選「KDDI/SoftBank 原生卡」，低延遲、速度快！\n購買：${SITE}/product/japan/`,
  "韓國有吃到飽嗎？": `有的！「韓國純日用吃到飽」方案不降速。\n詳情：${SITE}/product/korea/`,
};

/** 快捷關鍵字（含 eSIM／商城／住宿票券／文章）；無 preset 的會走 AI＋推薦卡） */
const QUICK_QUESTIONS = [
  // eSIM
  "怎麼安裝 eSIM？",
  "我的手機支援嗎？",
  "日本推薦哪一款？",
  "韓國有吃到飽嗎？",
  "歐洲 eSIM 怎麼選？",
  // 住宿／門票／交通（聯盟卡）
  "大阪推薦飯店",
  "環球影城門票",
  "韓國交通票券",
  "東京迪士尼門票",
  // 商城
  "出國要帶什麼充電器",
  "推薦旅行收納包",
  "有沒有萬用轉接頭",
  // 旅遊文章／規定
  "中國大陸登機行動電源規定",
  "日本通關要注意什麼",
  "出國前要準備什麼",
];

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
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
        if (saved.pendingMedia) setPendingMedia(saved.pendingMedia);
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
   * 點「聯繫真人客服」：開啟半自動交接面板
   * - 產生對話摘要
   * - 一鍵複製 / 開 WhatsApp（貼 MicroeSIM 群）
   * - 可同時開 LINE 官方客服給客人
   */
  const handleContactAgent = useCallback(
    (e) => {
      e.preventDefault();
      const summary = buildHandoffSummary(messages, {
        userLabel: userDisplayName || "訪客",
      });
      setHandoffSummary(summary);
      setHandoffCopied(false);
      setHandoffOpen(true);
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
    window.location.href = url;
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
    if (!isImage && !isVideo) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "ai",
          content: "目前僅支援圖片截圖或短影片（建議 15 秒內）。",
        },
      ]);
      return;
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
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

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "ai",
          content: "影片太大了，請裁成短片（建議 10MB／約 15 秒內）。",
        },
      ]);
      return;
    }

    try {
      const dataUrl = isImage
        ? await compressImageFile(file)
        : await fileToDataUrl(file);
      setPendingMedia({
        dataUrl,
        mimeType: isImage ? "image/jpeg" : file.type,
        name: file.name,
        kind: isImage ? "image" : "video",
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

    const displayContent =
      typeof options.displayContent === "string" && options.displayContent.trim()
        ? options.displayContent.trim()
        : trimmed ||
          (media?.kind === "video" ? "（已上傳影片）" : "（已上傳截圖）");

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
      if (media?.kind === "video") {
        payload.video = media.dataUrl;
      }

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
      // 儲存 user + ai 兩則紀錄
      persistChatLog({
        sessionId: sessionIdRef.current,
        userId: user?.id || null,
        guestId: guestIdRef.current,
        messages: [
          {
            role: "user",
            content: displayContent,
          },
          { role: "ai", content: aiReply, provider: data.provider || null },
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
                        可到 WhatsApp MicroeSIM 客服群直接貼上。
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
                      <p className="font-bold">已開啟 WhatsApp</p>
                      <p className="mt-0.5 leading-snug">
                        請選擇 MicroeSIM 客服群後送出；摘要也已複製到剪貼簿備援。
                      </p>
                    </>
                  )}
                  {handoffToast.kind === "line" && (
                    <>
                      <p className="font-bold">已開啟 LINE 客服</p>
                      <p className="mt-0.5 leading-snug">
                        對話摘要已預填在輸入框，直接按送出即可。
                        {handoffToast.hasMedia && (
                          <span className="block mt-0.5 text-emerald-800">
                            截圖請在 LINE 中另行上傳。
                          </span>
                        )}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 半自動交接面板 */}
            {handoffOpen && (
              <div className="mx-3 mt-2 rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border-b border-slate-100">
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">
                      轉真人客服（半自動）
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      產生摘要 → 複製／開 WhatsApp 貼群，或開 LINE 給客人
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
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                    開啟 LINE 官方客服（給客人）
                  </button>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    WhatsApp
                    無法自動進群，請開啟後選「MicroeSIM 客服群」再送出。摘要會一併複製。
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
                      {/* 聯繫客服按鈕 — 每則 AI 訊息底部 */}
                      {!isUser && (
                        <button
                          onClick={handleContactAgent}
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-green-600 transition-colors select-none cursor-pointer bg-transparent border-0 p-0"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="w-3 h-3 fill-current"
                            aria-hidden="true"
                          >
                            <path d="M12 2C6.477 2 2 6.062 2 11.063c0 2.742 1.313 5.194 3.381 6.853-.148.548-.96 3.302-.99 3.538-.038.283.103.56.372.68.083.037.172.056.26.056.195 0 .378-.078.51-.217.175-.183 3.028-2.018 3.685-2.456.566.08 1.141.12 1.72.12 5.523 0 10-4.06 10-9.063S17.523 2 12 2z" />
                          </svg>
                          J寶答不出來？轉真人客服
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
                      processChat(q);
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
                  {pendingMedia.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pendingMedia.dataUrl}
                      alt="預覽"
                      className="h-10 w-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-blue-600">
                      <Film className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[11px] font-medium text-slate-700">
                      {pendingMedia.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {pendingMedia.kind === "video"
                        ? "將使用進階視覺模型"
                        : "將使用 Gemini 判讀截圖"}
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
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={onPickMedia}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="shrink-0 rounded-full p-2.5 text-slate-500 hover:bg-white hover:text-blue-600 transition-colors"
                  title="上傳截圖或短影片"
                  aria-label="上傳截圖或短影片"
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
                  className="flex-1 bg-transparent px-2 border-none outline-none focus:ring-0 text-sm text-slate-700"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  aria-label="送出訊息"
                  disabled={(!input.trim() && !pendingMedia) || isLoading}
                  className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
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
