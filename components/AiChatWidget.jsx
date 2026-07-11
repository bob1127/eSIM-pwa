"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
} from "lucide-react";

import { getPublicSiteUrl } from "../lib/siteUrl";
import { useAuth } from "../hooks/useAuth";

const LINE_OA_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn";

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

const PRESET_ANSWERS = {
  "怎麼安裝 eSIM？": `安裝步驟：\n1. Email 接收 QR Code。\n2. 手機設定 > 行動服務 > 加入 eSIM。\n3. 掃描 QR Code 即可。\n教學：${SITE}/operation-shopee/`,
  "我的手機支援嗎？": `請檢查：\n- iPhone：設定 > 一般 > 關於本機，查看是否有 EID。\n- Android：撥號輸入 *#06# 查看 EID。\n清單：${SITE}/compatibility`,
  "日本推薦哪一款？": `首選「KDDI/SoftBank 原生卡」，低延遲、速度快！\n購買：${SITE}/product/japan/`,
  "韓國有吃到飽嗎？": `有的！「韓國純日用吃到飽」方案不降速。\n詳情：${SITE}/product/korea/`,
};

const QUICK_QUESTIONS = Object.keys(PRESET_ANSWERS);

/** 商品推薦卡（單張） */
function ProductCard({ card }) {
  const priceLabel =
    card.minPrice && card.maxPrice && card.minPrice !== card.maxPrice
      ? `NT$${card.minPrice} 起`
      : card.minPrice
      ? `NT$${card.minPrice}`
      : null;

  return (
    <a
      href={card.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-[160px] rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
    >
      <div className="h-[90px] bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center overflow-hidden">
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl}
            alt={card.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ShoppingCart className="w-8 h-8 text-blue-300" />
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2 mb-1">
          {card.name}
        </p>
        {priceLabel && (
          <p className="text-[11px] font-bold text-blue-600">{priceLabel}</p>
        )}
        {card.variantCount > 0 && (
          <p className="text-[10px] text-slate-400 mt-0.5">{card.variantCount} 種方案</p>
        )}
        <div className="mt-2 w-full text-center text-[10px] bg-blue-600 text-white rounded-full py-1 font-bold group-hover:bg-blue-700 transition-colors">
          立即購買
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
      className="mt-2 -mx-0.5"
    >
      <p className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1">
        <ShoppingCart className="w-3 h-3" /> 為你推薦
      </p>
      <div className="relative">
        {cards.length > 1 && (
          <>
            <button
              onClick={() => scroll(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 border border-slate-200 rounded-full p-0.5 shadow-sm hover:bg-slate-50"
              aria-label="上一張"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <button
              onClick={() => scroll(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 border border-slate-200 rounded-full p-0.5 shadow-sm hover:bg-slate-50"
              aria-label="下一張"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </>
        )}
        <div
          ref={trackRef}
          className="flex gap-2 overflow-x-auto scroll-smooth pb-1 px-0.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {cards.map((card, i) => (
            <ProductCard key={i} card={card} />
          ))}
        </div>
      </div>
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
  const { user, session, isLoggedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "ai",
      content:
        "🌼 您好！我是 J寶。\n想了解旅行技巧或 eSIM 安裝嗎？可點下方按鈕、直接輸入，或上傳設定截圖／短影片讓我幫你看。",
    },
  ]);

  // 每個對話視窗有唯一 sessionId（刷新頁面會重置）
  const sessionIdRef = useRef(null);
  if (!sessionIdRef.current) {
    sessionIdRef.current =
      (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
      Math.random().toString(36).slice(2);
  }
  const guestIdRef = useRef(null);
  useEffect(() => {
    guestIdRef.current = getOrCreateGuestId();
  }, []);

  const messagesEndRef = useRef(null);
  const scrollRef = useRef(null);
  const [handoffToast, setHandoffToast] = useState(null); // { hasMedia: bool }

  /**
   * 點「聯繫真人客服」時：
   * 1. 把近期對話文字格式化並複製到剪貼簿
   * 2. 開啟 LINE OA
   * 3. 顯示 toast 提示「貼上即可」
   */
  const handleContactAgent = useCallback(
    (e) => {
      e.preventDefault();

      // 取最近 8 則（跳過系統 preset 歡迎語）
      const recent = messages.slice(-8);
      const hasMedia = recent.some((m) => m.mediaPreview || m.mediaKind === "video");

      const lines = recent
        .filter((m) => m.role === "user" || m.role === "ai")
        .map((m) => {
          const label = m.role === "user" ? "【我】" : "【J寶】";
          const text =
            m.content.length > 300 ? m.content.slice(0, 300) + "…" : m.content;
          return `${label} ${text}`;
        });

      const summary =
        `--- J寶 AI 對話摘要 ---\n` +
        lines.join("\n\n") +
        (hasMedia ? "\n\n（對話中含截圖，請在 LINE 中另行上傳）" : "");

      // 複製到剪貼簿
      navigator.clipboard?.writeText(summary).catch(() => {});

      // 開啟 LINE
      window.open(LINE_OA_URL, "_blank", "noopener");

      // 顯示提示 toast 3 秒
      setHandoffToast({ hasMedia });
      setTimeout(() => setHandoffToast(null), 4000);
    },
    [messages]
  );
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

  const userInitial = (userDisplayName || "會").trim().charAt(0).toUpperCase();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, pendingMedia]);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener("jeko:open-ai-chat", open);
    return () => window.removeEventListener("jeko:open-ai-chat", open);
  }, []);

  const handleWheel = (e) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const renderMessageContent = (content) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline hover:text-blue-700 break-all font-bold mx-1"
          >
            {part}
          </a>
        );
      }
      return part;
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
        { id: Date.now(), role: "ai", content: "無法讀取此檔案，請換一張再試。" },
      ]);
    }
  };

  const processChat = async (text, mediaOverride = null) => {
    const media = mediaOverride || pendingMedia;
    const trimmed = (text || "").trim();
    if ((!trimmed && !media) || isLoading) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        content: trimmed || (media?.kind === "video" ? "（已上傳影片）" : "（已上傳截圖）"),
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
          { role: "user", content: trimmed, provider: "preset" },
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
        content: msg.content,
      }));

    try {
      const payload = {
        message: trimmed,
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
            content:
              trimmed || (media?.kind === "video" ? "（已上傳影片）" : "（已上傳截圖）"),
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

  return (
    <div
      className={`fixed z-[999999] flex flex-col items-end font-sans ${
        isOpen
          ? "inset-x-3 bottom-[130px] md:inset-auto md:bottom-6 md:right-6"
          : "bottom-6 right-6"
      }`}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white w-full md:w-[400px] h-[min(600px,70vh)] max-h-[80vh] rounded-2xl shadow-2xl border border-gray-100 flex flex-col mb-0 md:mb-4 overflow-hidden origin-bottom-right"
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
                  <h3 className="font-bold text-[14px]">
                    J寶 - 您的旅行小幫手
                  </h3>
                  <div className="text-[11px] opacity-80 flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />{" "}
                    {isLoggedIn
                      ? `Hi，${userDisplayName}`
                      : "文字 Groq · 截圖 Gemini"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 交接 LINE 客服 Toast */}
            {handoffToast && (
              <div className="mx-3 mt-2 flex items-start gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5 text-[12px] text-green-800 shadow-sm">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-600 shrink-0 mt-0.5" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.062 2 11.063c0 2.742 1.313 5.194 3.381 6.853-.148.548-.96 3.302-.99 3.538-.038.283.103.56.372.68.083.037.172.056.26.056.195 0 .378-.078.51-.217.175-.183 3.028-2.018 3.685-2.456.566.08 1.141.12 1.72.12 5.523 0 10-4.06 10-9.063S17.523 2 12 2z" />
                </svg>
                <div>
                  <p className="font-bold">對話摘要已複製！</p>
                  <p className="mt-0.5 leading-snug">
                    LINE 開啟後，在輸入框長按貼上（Ctrl+V）即可傳送給客服。
                    {handoffToast.hasMedia && (
                      <span className="block mt-0.5 text-green-700">截圖請在 LINE 中另行上傳。</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
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
                    <div className={`max-w-[80%] flex flex-col gap-0`}>
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
                      {!isUser && msg.productCards && (
                        <ProductCardCarousel cards={msg.productCards} />
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
                          J寶答不出來？聯繫真人客服
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
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white px-2 pt-3 pb-1 border-t border-gray-50">
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
                {QUICK_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => processChat(q)}
                    disabled={isLoading}
                    className="whitespace-nowrap px-4 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[12px] font-bold hover:bg-blue-600 hover:text-white transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
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
                className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 p-1.5 rounded-full"
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
                    pendingMedia ? "補充說明（可選）..." : "輸入問題或上傳截圖..."
                  }
                  className="flex-1 bg-transparent px-2 border-none outline-none focus:ring-0 text-sm text-slate-700"
                  disabled={isLoading}
                />
                <button
                  type="submit"
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
              <div className="text-center mt-2 text-[9px] text-gray-400">
                <Sparkles className="w-3 h-3 inline mr-1" /> J寶 ·
                簡單問題免費文字模型 · 截圖視覺判讀
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial="rest"
        whileHover="hover"
        animate="rest"
        className="hidden md:flex items-center gap-3 cursor-pointer group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              variants={{
                rest: { opacity: 0, x: 20, scale: 0.8 },
                hover: { opacity: 1, x: 0, scale: 1 },
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="bg-white text-blue-600 px-4 py-2 rounded-full shadow-xl text-[13px] font-bold border border-blue-50 whitespace-nowrap"
            >
              您的旅行小幫手
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all ${
            isOpen
              ? "bg-slate-800 text-white"
              : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
          }`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
        </motion.div>
      </motion.div>
    </div>
  );
}
