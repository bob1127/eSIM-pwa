"use client";
import { useState, useEffect } from "react";
import Layout from "../Layout";
import { BellIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { PWA_LOGO } from "../../lib/pwaConfig";
import { LineAppIconSvg } from "@/components/social/SocialBrandIcons";
import LineBroadcastEditor, {
  LINE_TEMPLATES,
} from "@/components/admin/LineBroadcastEditor";
import { defaultLineCardStyle, emptyLineCard } from "@/lib/lineBroadcastCard";

export default function AdminPushPage() {
  const [channel, setChannel] = useState("web");
  const [lineTemplate, setLineTemplate] = useState("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("/");
  const [card, setCard] = useState(() => emptyLineCard({ url: "/" }));
  const [cards, setCards] = useState([]);
  const [cardStyle, setCardStyle] = useState(() => defaultLineCardStyle("hero"));
  const [secret, setSecret] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [lineFriendCount, setLineFriendCount] = useState(null);
  const [heroPresets, setHeroPresets] = useState([]);
  const [carouselPresets, setCarouselPresets] = useState([]);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch("/api/admin/line-broadcast/")
      .then((r) => r.json())
      .then((d) => {
        if (d.friendCount != null) setLineFriendCount(d.friendCount);
        if (d.presets?.heroImages) setHeroPresets(d.presets.heroImages);
        if (d.presets?.carouselProducts) {
          setCarouselPresets(d.presets.carouselProducts);
        }
      })
      .catch(() => {});
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!secret.trim()) {
      alert("請輸入內部密鑰（PUSH_INTERNAL_SECRET）");
      return;
    }

    if (channel === "line") {
      if (
        (lineTemplate === "hero" || lineTemplate === "text_hero") &&
        !card.imageUrl?.trim()
      ) {
        alert("DM 卡片請填圖片網址或選一鍵帶入");
        return;
      }
      if (
        (lineTemplate === "carousel" || lineTemplate === "text_carousel") &&
        !cards.length
      ) {
        alert("輪播請至少新增 1 張卡片");
        return;
      }
      if (
        (lineTemplate === "text_hero" || lineTemplate === "text_carousel") &&
        !title.trim() &&
        !body.trim()
      ) {
        alert("文字＋圖文版型請填前導標題或內容");
        return;
      }
    }

    const label = channel === "web" ? "Web Push" : "LINE";
    const templateLabel =
      channel === "line"
        ? LINE_TEMPLATES.find((t) => t.id === lineTemplate)?.label || ""
        : "";
    if (
      !confirm(
        channel === "line" && lineUserId.trim()
          ? `確定發送 LINE${templateLabel ? `（${templateLabel}）` : ""} 測試給 ${lineUserId.slice(0, 12)}…？`
          : `確定要${label}${templateLabel ? `（${templateLabel}）` : ""}廣播給所有${channel === "web" ? "已開啟日常推播" : "官方 LINE 好友"}？`,
      )
    ) {
      return;
    }

    setStatus("sending");
    setResult(null);

    try {
      const endpoint =
        channel === "web" ? "/api/send-push/" : "/api/admin/line-broadcast/";
      const payload = {
        secret: secret.trim(),
        title,
        body,
        url: channel === "line" ? card.url || linkUrl : linkUrl,
      };
      if (channel === "line") {
        payload.template = lineTemplate;
        payload.cardStyle = cardStyle;
        payload.card = card;
        payload.cards = cards;
        if (lineUserId.trim()) payload.lineUserId = lineUserId.trim();
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && (data.success || data.ok)) {
        setStatus("success");
        setResult(data);
        setTitle("");
        setBody("");
        setLinkUrl("/");
        setCard(emptyLineCard({ url: "/" }));
        setCards([]);
      } else {
        setStatus("error");
        setResult({
          error: data.error || "未知錯誤",
          detail: data.detail,
          hint: data.hint,
        });
      }
    } catch (err) {
      console.error("推播發送失敗:", err);
      setStatus("error");
      setResult({ error: "連線失敗" });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-stone-50 pb-20">
        <div className="max-w-2xl mx-auto w-[92%] pt-8">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#0A6CD0] rounded-xl flex items-center justify-center">
                <BellIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-black text-stone-900">日常推播廣播</h1>
            </div>
            <p className="text-sm text-stone-500 mb-6 pl-1 mt-2 leading-relaxed">
              Web Push 只發給<strong className="text-stone-700"> 日常推播 ON </strong>
              的訂閱者；LINE 發給<strong className="text-stone-700"> 官方 OA 好友 </strong>
              。LINE 可先發文字再接 DM／輪播，卡片圖片與文案皆可自訂。
            </p>

            <div className="flex gap-2 mb-6 p-1 bg-stone-100 rounded-xl">
              <button
                type="button"
                onClick={() => setChannel("web")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  channel === "web"
                    ? "bg-white text-[#0A6CD0] shadow-sm"
                    : "text-stone-600"
                }`}
              >
                Web Push
              </button>
              <button
                type="button"
                onClick={() => setChannel("line")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors inline-flex items-center justify-center gap-1.5 ${
                  channel === "line"
                    ? "bg-white text-[#06C755] shadow-sm"
                    : "text-stone-600"
                }`}
              >
                <LineAppIconSvg className="w-4 h-4" />
                LINE
                {lineFriendCount != null ? (
                  <span className="text-[10px] font-normal opacity-70">
                    ({lineFriendCount})
                  </span>
                ) : null}
              </button>
            </div>

            <form onSubmit={handleSend} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">
                  內部密鑰{" "}
                  <span className="text-stone-400 font-normal">（PUSH_INTERNAL_SECRET）</span>
                </label>
                <input
                  type="password"
                  required
                  autoComplete="off"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="貼上伺服器內部密鑰"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#0A6CD0]/30 transition-all text-sm"
                />
              </div>

              {channel === "line" ? (
                <LineBroadcastEditor
                  template={lineTemplate}
                  onTemplateChange={setLineTemplate}
                  lineUserId={lineUserId}
                  onLineUserIdChange={setLineUserId}
                  title={title}
                  body={body}
                  onTitleChange={setTitle}
                  onBodyChange={setBody}
                  card={card}
                  onCardChange={setCard}
                  cards={cards}
                  onCardsChange={setCards}
                  cardStyle={cardStyle}
                  onCardStyleChange={setCardStyle}
                  heroPresets={heroPresets}
                  carouselPresets={carouselPresets}
                />
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">
                      標題 <span className="text-stone-400 font-normal">（建議 20 字內）</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="例：⚡ Jeko eSIM 日本 5GB 限時特惠！"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#0A6CD0]/30 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">
                      內容
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="例：輸入折扣碼享全站 88 折，活動截止 6/30！"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#0A6CD0]/30 transition-all text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">
                      點擊後跳轉{" "}
                      <span className="text-stone-400 font-normal">（相對路徑）</span>
                    </label>
                    <input
                      type="text"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="/ 或 /promo/ 或 /product/japan/"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#0A6CD0]/30 transition-all text-sm"
                    />
                  </div>
                  {title ? (
                    <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                      <p className="text-xs font-bold text-stone-400 mb-2 uppercase tracking-widest">
                        預覽
                      </p>
                      <div className="flex items-start gap-3">
                        <img
                          src={PWA_LOGO}
                          className="w-10 h-10 rounded-xl shrink-0"
                          alt="icon"
                        />
                        <div>
                          <p className="font-bold text-stone-900 text-sm">{title}</p>
                          <p className="text-stone-600 text-sm mt-0.5">{body}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all ${
                  status === "sending"
                    ? "bg-stone-400 cursor-not-allowed"
                    : channel === "line"
                      ? "bg-[#06C755] hover:bg-[#05b34c] shadow-md"
                      : "bg-gradient-to-r from-[#0A6CD0] to-[#0851A8] hover:from-[#0851A8] hover:to-[#063d82] shadow-md"
                }`}
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                {status === "sending"
                  ? "發送中..."
                  : channel === "line"
                    ? "立即 LINE 廣播"
                    : "立即 Web Push 廣播"}
              </button>
            </form>

            {result ? (
              <div
                className={`mt-5 rounded-xl p-4 text-sm font-medium ${
                  status === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}
              >
                {status === "success" ? (
                  <>
                    ✅ 成功發送 <strong>{result.sent}</strong> 則 / 共{" "}
                    <strong>{result.total}</strong>{" "}
                    {channel === "line" ? "位好友" : "位訂閱者"}
                    {result.productCount ? (
                      <span className="block mt-1 text-stone-600">
                        輪播 {result.productCount} 張卡片
                      </span>
                    ) : null}
                    {result.removed > 0 ? (
                      <span className="ml-2 text-stone-500">
                        （清除 {result.removed} 筆失效訂閱）
                      </span>
                    ) : null}
                    {result.failed > 0 ? (
                      <span className="block mt-1 text-amber-700">
                        失敗 {result.failed} 則
                      </span>
                    ) : null}
                  </>
                ) : (
                  <div className="space-y-1">
                    <p>❌ 發送失敗：{result.error}</p>
                    {result.detail ? (
                      <p className="text-xs font-normal opacity-80">
                        詳細：{result.detail}
                      </p>
                    ) : null}
                    {result.hint ? (
                      <p className="text-xs font-normal opacity-80">
                        提示：{result.hint}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
}
