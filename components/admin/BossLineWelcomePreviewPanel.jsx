"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { bossFetch } from "@/lib/bossAdminClient";
import {
  LINE_WELCOME_SCENARIOS,
  getWelcomeQuickReplyLabels,
  getWelcomeScenarioState,
} from "@/lib/lineWelcomeCopy";
import {
  DEFAULT_LINE_WELCOME_SETTINGS,
  buildWelcomeFollowTextFromSettings,
  flexPreviewFromSettings,
} from "@/lib/lineWelcomeSettings";
import { QuarterRing } from "@/components/ui/QuarterRing";

const IMAGE_PRESETS = [
  { id: "jp-mobile", label: "日本・手機版", url: "/images/banner04-mobile.png" },
  { id: "jp-laptop", label: "日本・筆電版", url: "/images/banner04-loptap.png" },
  { id: "jp-dm", label: "日本・寬版DM", url: "/images/九州01.png" },
  { id: "kr-mobile", label: "韓國・手機版", url: "/images/韓國01-mobile.png" },
  { id: "kr-dm", label: "韓國・寬版DM", url: "/images/韓國01.png" },
  { id: "th-mobile", label: "泰國・手機版", url: "/images/泰國原生eSIM-mobile.png" },
  { id: "th-dm", label: "泰國・寬版DM", url: "/images/泰國原生eSIM.png" },
];

const inputCls =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]/25";
const labelCls = "block text-xs font-bold text-slate-700";

/**
 * Boss：LINE 加好友歡迎設計預覽＋文案／圖片可編輯
 * URL：/admin-boss?tab=line-welcome
 */
export default function BossLineWelcomePreviewPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("good");
  const [meta, setMeta] = useState(null);
  const [draft, setDraft] = useState(() =>
    structuredClone(DEFAULT_LINE_WELCOME_SETTINGS),
  );
  const [scenario, setScenario] = useState("first");
  const [showOffHours, setShowOffHours] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setToast("");
    try {
      const data = await bossFetch("/api/admin/line-welcome/");
      setMeta(data);
      setDraft(
        structuredClone(data.copy || DEFAULT_LINE_WELCOME_SETTINGS),
      );
    } catch (err) {
      setToast(err.message || "載入失敗");
      setToastType("bad");
      setDraft(structuredClone(DEFAULT_LINE_WELCOME_SETTINGS));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const state = useMemo(() => getWelcomeScenarioState(scenario), [scenario]);
  const welcomeText = useMemo(
    () =>
      buildWelcomeFollowTextFromSettings(draft, {
        siteUrl: "https://www.jeko-esim.com.tw",
        ...state,
      }),
    [draft, state],
  );
  const chips = useMemo(
    () =>
      getWelcomeQuickReplyLabels({
        code: state.code,
        alreadyRedeemed: state.alreadyRedeemed,
      }),
    [state],
  );
  const iccidPreview = useMemo(
    () => flexPreviewFromSettings(draft.iccid),
    [draft.iccid],
  );
  const offPreview = useMemo(
    () => flexPreviewFromSettings(draft.offHours),
    [draft.offHours],
  );

  const messageCount = 4 + (showOffHours ? 1 : 0);

  const patch = (partial) => setDraft((prev) => ({ ...prev, ...partial }));
  const patchCard = (idx, partial) => {
    setDraft((prev) => {
      const cards = [...(prev.cards || [])];
      cards[idx] = { ...cards[idx], ...partial };
      return { ...prev, cards };
    });
  };
  const patchIccid = (partial) =>
    setDraft((prev) => ({ ...prev, iccid: { ...prev.iccid, ...partial } }));
  const patchOff = (partial) =>
    setDraft((prev) => ({
      ...prev,
      offHours: { ...prev.offHours, ...partial },
    }));

  const save = async () => {
    setSaving(true);
    setToast("");
    try {
      const data = await bossFetch("/api/admin/line-welcome/", {
        method: "PUT",
        body: JSON.stringify({ copy: draft }),
      });
      setMeta(data);
      setDraft(structuredClone(data.copy || draft));
      setToast("已儲存，加好友歡迎會使用此設定");
      setToastType("good");
    } catch (err) {
      setToast(err.message || "儲存失敗");
      setToastType("bad");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!window.confirm("還原成預設文案與圖片？已儲存內容會被覆蓋。")) return;
    setSaving(true);
    setToast("");
    try {
      const data = await bossFetch("/api/admin/line-welcome/", {
        method: "PUT",
        body: JSON.stringify({ reset: true }),
      });
      setMeta(data);
      setDraft(structuredClone(data.copy || DEFAULT_LINE_WELCOME_SETTINGS));
      setToast("已還原預設");
      setToastType("good");
    } catch (err) {
      setToast(err.message || "還原失敗");
      setToastType("bad");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-slate-600">
        <QuarterRing size="sm" className="text-[#06C755]" />
        <span className="text-sm">載入 LINE 歡迎設定…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#06C755]">
              LINE Official Account
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-900">
              加好友歡迎訊息 · 設計與編輯
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed max-w-2xl">
              左側即時預覽，右側可改文案與圖片。儲存後寫入{" "}
              <code className="text-[11px] bg-slate-100 px-1 rounded">
                platform_settings
              </code>
              ，webhook 加好友時會套用。
            </p>
            {meta?.updatedAt ? (
              <p className="mt-1 text-[11px] text-slate-400">
                上次儲存：{new Date(meta.updatedAt).toLocaleString("zh-TW")}
                {meta.source === "default" ? "（目前為預設）" : ""}
              </p>
            ) : null}
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            共 {messageCount} 則訊息
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {LINE_WELCOME_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScenario(s.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold border transition ${
                scenario === s.id
                  ? "bg-[#06C755] text-white border-[#06C755]"
                  : "bg-white text-slate-700 border-slate-200 hover:border-[#06C755]"
              }`}
              title={s.desc}
            >
              {s.label}
            </button>
          ))}
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showOffHours}
            onChange={(e) => setShowOffHours(e.target.checked)}
            className="rounded border-slate-300 text-[#06C755] focus:ring-[#06C755]"
          />
          <span>
            模擬<strong className="mx-1">非人工客服時段</strong>
          </span>
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="rounded-full bg-[#06C755] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#05b34c] disabled:opacity-40"
          >
            {saving ? "儲存中…" : "儲存設定"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={resetDefaults}
            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            還原預設
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={load}
            className="rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            重新載入
          </button>
        </div>
        {toast ? (
          <p
            className={`mt-3 text-sm font-bold ${
              toastType === "bad" ? "text-rose-600" : "text-emerald-700"
            }`}
          >
            {toast}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* 預覽 */}
        <div className="flex justify-center xl:justify-start xl:sticky xl:top-4 xl:self-start">
          <PhonePreview
            welcomeText={welcomeText}
            chips={chips}
            carouselTitle={draft.carouselTitle || "Jeko 推薦 原生eSIM"}
            cards={draft.cards || []}
            iccidPreview={iccidPreview}
            offPreview={offPreview}
            showOffHours={showOffHours}
          />
        </div>

        {/* 編輯器 */}
        <div className="space-y-4">
          <EditorCard title="① 歡迎詞文字">
            <Field label="開頭問候">
              <input
                className={inputCls}
                value={draft.greetingLead || ""}
                onChange={(e) => patch({ greetingLead: e.target.value })}
              />
            </Field>
            <Field
              label="優惠區塊（首次）"
              hint="可用 {{code}} 代入折扣碼"
            >
              <textarea
                className={`${inputCls} min-h-[110px] font-sans`}
                value={draft.promoFirst || ""}
                onChange={(e) => patch({ promoFirst: e.target.value })}
              />
            </Field>
            <Field label="優惠區塊（重加好友）" hint="可用 {{code}}">
              <textarea
                className={`${inputCls} min-h-[110px] font-sans`}
                value={draft.promoRefollow || ""}
                onChange={(e) => patch({ promoRefollow: e.target.value })}
              />
            </Field>
            <Field label="已核銷／發券失敗">
              <div className="grid sm:grid-cols-2 gap-3">
                <textarea
                  className={`${inputCls} min-h-[90px] font-sans`}
                  value={draft.promoRedeemed || ""}
                  onChange={(e) => patch({ promoRedeemed: e.target.value })}
                  placeholder="已核銷"
                />
                <textarea
                  className={`${inputCls} min-h-[90px] font-sans`}
                  value={draft.promoNocode || ""}
                  onChange={(e) => patch({ promoNocode: e.target.value })}
                  placeholder="發券失敗"
                />
              </div>
            </Field>
            <Field label="怎麼查流量說明">
              <textarea
                className={`${inputCls} min-h-[100px] font-sans`}
                value={draft.howtoText || ""}
                onChange={(e) => patch({ howtoText: e.target.value })}
              />
            </Field>
            <Field label="結尾（三種花 emoji）">
              <input
                className={inputCls}
                value={draft.closingLine || ""}
                onChange={(e) => patch({ closingLine: e.target.value })}
                placeholder="🌼🌻🌼"
              />
            </Field>
          </EditorCard>

          <EditorCard title="② Jeko 推薦 原生eSIM 輪播">
            <Field label="輪播標題（使用者看到的名稱）">
              <input
                className={inputCls}
                value={draft.carouselTitle || ""}
                onChange={(e) => patch({ carouselTitle: e.target.value })}
                placeholder="Jeko 推薦 原生eSIM"
              />
            </Field>
            {(draft.cards || []).map((card, idx) => (
              <div
                key={`card-${idx}`}
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2"
              >
                <p className="text-xs font-black text-slate-600">
                  卡片 {idx + 1}
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Field label="標題">
                    <input
                      className={inputCls}
                      value={card.title || ""}
                      onChange={(e) =>
                        patchCard(idx, { title: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="副標">
                    <input
                      className={inputCls}
                      value={card.subtitle || ""}
                      onChange={(e) =>
                        patchCard(idx, { subtitle: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="說明">
                  <textarea
                    className={`${inputCls} min-h-[72px]`}
                    value={card.body || ""}
                    onChange={(e) => patchCard(idx, { body: e.target.value })}
                  />
                </Field>
                <Field label="圖片網址" hint="HTTPS 或 /images/…">
                  <input
                    className={inputCls}
                    value={card.imageUrl || ""}
                    onChange={(e) =>
                      patchCard(idx, { imageUrl: e.target.value })
                    }
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {IMAGE_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => patchCard(idx, { imageUrl: p.url })}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:border-[#06C755]"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {card.imageUrl ? (
                    <div className="mt-2 w-full max-w-[160px] aspect-square rounded-lg overflow-hidden bg-slate-100 border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.imageUrl}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : null}
                </Field>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Field label="連結路徑">
                    <input
                      className={inputCls}
                      value={card.url || ""}
                      onChange={(e) =>
                        patchCard(idx, { url: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="按鈕文字">
                    <input
                      className={inputCls}
                      value={card.buttonLabel || ""}
                      onChange={(e) =>
                        patchCard(idx, { buttonLabel: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
            ))}
          </EditorCard>

          <EditorCard title="③ ICCID 流量提醒 Flex">
            <div className="grid sm:grid-cols-2 gap-2">
              <Field label="標題">
                <input
                  className={inputCls}
                  value={draft.iccid?.headerTitle || ""}
                  onChange={(e) =>
                    patchIccid({ headerTitle: e.target.value })
                  }
                />
              </Field>
              <Field label="按鈕文字">
                <input
                  className={inputCls}
                  value={draft.iccid?.buttonLabel || ""}
                  onChange={(e) =>
                    patchIccid({ buttonLabel: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="副標">
              <input
                className={inputCls}
                value={draft.iccid?.headerSub || ""}
                onChange={(e) => patchIccid({ headerSub: e.target.value })}
              />
            </Field>
            <Field label="內文">
              <textarea
                className={`${inputCls} min-h-[90px]`}
                value={draft.iccid?.bodyText || ""}
                onChange={(e) => patchIccid({ bodyText: e.target.value })}
              />
            </Field>
          </EditorCard>

          <EditorCard title="④ 非營業時間引導">
            <div className="grid sm:grid-cols-2 gap-2">
              <Field label="標題">
                <input
                  className={inputCls}
                  value={draft.offHours?.headerTitle || ""}
                  onChange={(e) =>
                    patchOff({ headerTitle: e.target.value })
                  }
                />
              </Field>
              <Field label="副標">
                <input
                  className={inputCls}
                  value={draft.offHours?.headerSub || ""}
                  onChange={(e) => patchOff({ headerSub: e.target.value })}
                />
              </Field>
            </div>
            <Field label="內文">
              <textarea
                className={`${inputCls} min-h-[90px]`}
                value={draft.offHours?.bodyText || ""}
                onChange={(e) => patchOff({ bodyText: e.target.value })}
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-2">
              <Field label="主按鈕">
                <input
                  className={inputCls}
                  value={draft.offHours?.primaryLabel || ""}
                  onChange={(e) =>
                    patchOff({ primaryLabel: e.target.value })
                  }
                />
              </Field>
              <Field label="次按鈕">
                <input
                  className={inputCls}
                  value={draft.offHours?.secondaryLabel || ""}
                  onChange={(e) =>
                    patchOff({ secondaryLabel: e.target.value })
                  }
                />
              </Field>
            </div>
          </EditorCard>
        </div>
      </div>
    </div>
  );
}

function PhonePreview({
  welcomeText,
  chips,
  carouselTitle,
  cards,
  iccidPreview,
  offPreview,
  showOffHours,
}) {
  return (
    <div className="w-full max-w-[390px] rounded-[2rem] border-[10px] border-slate-800 bg-[#7494B4] shadow-xl overflow-hidden">
      <div className="bg-[#425F85] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
          J
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">Jeko eSIM</p>
          <p className="text-[10px] text-white/70">官方帳號 · 預覽</p>
        </div>
      </div>
      <div className="h-[640px] overflow-y-auto px-3 py-4 space-y-4 bg-[linear-gradient(180deg,#8BA4BE_0%,#7494B4_40%,#6A8AAB_100%)]">
        <MsgLabel n={1} title="歡迎詞＋快捷按鈕" />
        <TextBubble text={welcomeText} chips={chips} />
        <MsgLabel n={2} title={carouselTitle} />
        <div className="max-w-[92%]">
          <div className="rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 shadow-sm">
            <p className="text-[13px] font-bold text-slate-900">
              {carouselTitle}
            </p>
          </div>
        </div>
        <CarouselPreview cards={cards} />
        <MsgLabel n={3} title={iccidPreview.headerTitle || "流量提醒"} />
        <FlexCardPreview data={iccidPreview} />
        {showOffHours ? (
          <>
            <MsgLabel n={4} title={offPreview.headerTitle || "非營業時間"} />
            <FlexCardPreview data={offPreview} secondary />
          </>
        ) : null}
        <p className="text-center text-[10px] text-white/80 pt-2 pb-4">
          以上為設計預覽，儲存後才會套用到真實加好友
        </p>
      </div>
    </div>
  );
}

function EditorCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <p className="text-sm font-black text-slate-900">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {hint ? (
          <span className="text-slate-400 font-normal"> · {hint}</span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

function MsgLabel({ n, title }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/25 px-1.5 text-[10px] font-bold text-white">
        {n}
      </span>
      <span className="text-[11px] font-bold text-white/90 drop-shadow-sm">
        {title}
      </span>
    </div>
  );
}

function TextBubble({ text, chips }) {
  return (
    <div className="max-w-[92%]">
      <div className="rounded-2xl rounded-tl-md bg-white px-3.5 py-3 shadow-sm">
        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-800">
          {linkifyText(text)}
        </pre>
      </div>
      {chips?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((label) => (
            <span
              key={label}
              className="rounded-full border border-white/80 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-[#3768C7] shadow-sm"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function linkifyText(text) {
  const parts = String(text || "").split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (/^https?:\/\//i.test(part)) {
      const href = part.replace(/[)\].,，。]+$/g, "");
      const trail = part.slice(href.length);
      return (
        <span key={`u-${i}`}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0A6CD0] underline underline-offset-2 break-all"
          >
            {href}
          </a>
          {trail}
        </span>
      );
    }
    return <span key={`t-${i}`}>{part}</span>;
  });
}

function CarouselPreview({ cards }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <div className="flex gap-2 w-max">
        {(cards || []).map((card) => (
          <div
            key={card.title + card.imageUrl}
            className="w-[280px] shrink-0 rounded-2xl bg-white overflow-hidden shadow-sm border border-white/40"
          >
            <div className="aspect-square w-full bg-slate-100">
              {card.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.imageUrl}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : null}
            </div>
            <div className="p-3 space-y-1">
              <p className="text-[13px] font-bold text-slate-900 leading-snug">
                {card.title}
              </p>
              <p className="text-[11px] font-bold text-[#06C755]">
                {card.subtitle}
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                {card.body}
              </p>
              <div className="pt-2">
                <div className="rounded-2xl bg-[#06C755] text-white text-center text-[12px] font-bold py-2.5 shadow-sm">
                  {card.buttonLabel || "查看方案"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlexCardPreview({ data, secondary = false }) {
  return (
    <div className="max-w-[92%] rounded-2xl overflow-hidden bg-white shadow-sm">
      <div
        className="px-4 py-3"
        style={{ backgroundColor: data.headerBg || "#3768C7" }}
      >
        <p className="text-[15px] font-bold text-white leading-snug">
          {data.headerTitle}
        </p>
        <p className="mt-1 text-[11px] text-[#D6E4FF] leading-relaxed">
          {data.headerSub}
        </p>
      </div>
      <div className="px-4 py-3 space-y-2">
        {(data.body || []).map((line) => (
          <p
            key={line.slice(0, 24)}
            className="text-[12px] text-slate-700 leading-relaxed"
          >
            {line}
          </p>
        ))}
      </div>
      <div className="px-3 pb-3 space-y-2">
        <div
          className="rounded-2xl text-center text-[13px] font-bold py-2.5 text-white shadow-sm"
          style={{ backgroundColor: data.buttonBg || "#3768C7" }}
        >
          {data.primaryLabel || data.buttonLabel}
        </div>
        {secondary && data.secondaryLabel ? (
          <div className="rounded-2xl text-center text-[13px] font-bold py-2.5 text-slate-700 bg-slate-100 border border-slate-200">
            {data.secondaryLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}
