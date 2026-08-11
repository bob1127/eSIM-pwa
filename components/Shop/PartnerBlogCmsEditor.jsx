"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePartnerStoreOwner } from "@/components/Shop/PartnerHomepageEditor";
import {
  BLOG_CMS_MAX_IG,
  mergeBlogCms,
  parseInstagramPostUrl,
} from "@/lib/partnerBlogCms";

/**
 * 夥伴部落格前台編輯：IG 貼文、精選商品
 */
export default function PartnerBlogCmsEditor({
  store,
  products = [],
  blogCms,
  onCmsChange,
  openSignal = 0,
}) {
  const { isOwner, token, checking } = usePartnerStoreOwner(store);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("ig");
  const [draft, setDraft] = useState(() => mergeBlogCms(blogCms));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newIgUrl, setNewIgUrl] = useState("");

  useEffect(() => {
    setDraft(mergeBlogCms(blogCms));
  }, [blogCms]);

  useEffect(() => {
    if (openSignal > 0 && isOwner) setOpen(true);
  }, [openSignal, isOwner]);

  if (checking || !isOwner) return null;

  const addIg = () => {
    const parsed = parseInstagramPostUrl(newIgUrl);
    if (!parsed) {
      setMessage("請貼上有效的 Instagram 貼文或 Reels 網址");
      return;
    }
    setDraft((prev) => {
      const next = mergeBlogCms(prev);
      if (next.ig_posts.some((p) => p.url === parsed.url)) {
        setMessage("此貼文已在列表中");
        return prev;
      }
      if (next.ig_posts.length >= BLOG_CMS_MAX_IG) {
        setMessage(`最多 ${BLOG_CMS_MAX_IG} 則`);
        return prev;
      }
      setMessage("");
      setNewIgUrl("");
      return {
        ...next,
        ig_posts: [...next.ig_posts, { url: parsed.url }],
      };
    });
  };

  const removeIg = (url) => {
    setDraft((prev) => {
      const next = mergeBlogCms(prev);
      return {
        ...next,
        ig_posts: next.ig_posts.filter((p) => p.url !== url),
      };
    });
  };

  const save = async () => {
    if (!token || !store?.id) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/partner/blog-cms", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          store_id: store.id,
          blog_cms: draft,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "儲存失敗");
        return;
      }
      const cleaned = mergeBlogCms(data.blog_cms);
      setDraft(cleaned);
      onCmsChange?.(cleaned);
      setMessage("已儲存，訪客重整後即可看到");
    } catch {
      setMessage("網路錯誤，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9500] flex flex-col items-end gap-3 max-w-[min(100vw-2rem,360px)]">
      {open ? (
        <div className="w-[min(100vw-2rem,360px)] max-h-[min(78vh,640px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between z-10">
            <div>
              <p className="text-sm font-black text-slate-900">編輯部落格</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                僅店主可見 · 需按儲存才生效
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[12px] font-bold text-slate-500 hover:text-slate-800"
            >
              關閉
            </button>
          </div>

          <div className="flex border-b border-slate-100">
            {[
              { key: "ig", label: "IG 貼文" },
              { key: "product", label: "精選商品" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 text-[12px] font-bold ${
                  tab === t.key
                    ? "text-[#0A6CD0] border-b-2 border-[#0A6CD0]"
                    : "text-slate-500"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {tab === "ig" ? (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  貼上 Instagram 貼文或 Reels 完整網址，文章中段會自動輪播顯示。
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newIgUrl}
                    onChange={(e) => setNewIgUrl(e.target.value)}
                    placeholder="https://www.instagram.com/p/…"
                    className="flex-1 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#3B9EFF]"
                  />
                  <button
                    type="button"
                    onClick={addIg}
                    className="shrink-0 px-3 py-2 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800"
                  >
                    加入
                  </button>
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    輪播間隔（秒）
                  </span>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={Math.round((draft.ig_autoplay_ms || 6000) / 1000)}
                    onChange={(e) => {
                      const sec = Math.min(
                        20,
                        Math.max(3, Number(e.target.value) || 6),
                      );
                      setDraft((prev) => ({
                        ...mergeBlogCms(prev),
                        ig_autoplay_ms: sec * 1000,
                      }));
                    }}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs"
                  />
                </label>

                <ul className="space-y-2">
                  {draft.ig_posts.length === 0 ? (
                    <li className="text-[11px] text-slate-400 py-2">
                      尚無貼文
                    </li>
                  ) : (
                    draft.ig_posts.map((p, i) => (
                      <li
                        key={p.url}
                        className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2"
                      >
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {i + 1}
                        </span>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-[11px] text-[#0A6CD0] break-all hover:underline"
                        >
                          {p.url}
                        </a>
                        <button
                          type="button"
                          onClick={() => removeIg(p.url)}
                          className="text-[10px] font-bold text-rose-500 shrink-0"
                        >
                          移除
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}

            {tab === "product" ? (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  選擇側欄「精選商品」要顯示的方案。未選則顯示賣場第一件商品。
                </p>
                {products.length === 0 ? (
                  <p className="text-[11px] text-slate-400">
                    尚無上架商品，請先至後台商品目錄加入方案。
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-[320px] overflow-y-auto">
                    <li>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...mergeBlogCms(prev),
                            featured_product_id: "",
                          }))
                        }
                        className={`w-full text-left rounded-lg border px-3 py-2.5 text-[12px] ${
                          !draft.featured_product_id
                            ? "border-[#0A6CD0] bg-sky-50 text-slate-900 font-bold"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        自動（第一件商品）
                      </button>
                    </li>
                    {products.map((p) => {
                      const selected =
                        String(draft.featured_product_id) === String(p.id);
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...mergeBlogCms(prev),
                                featured_product_id: String(p.id),
                              }))
                            }
                            className={`w-full flex items-center gap-3 text-left rounded-lg border px-2.5 py-2 ${
                              selected
                                ? "border-[#0A6CD0] bg-sky-50"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="relative w-12 h-12 shrink-0 bg-[#efeee9] overflow-hidden">
                              {p.image ? (
                                <Image
                                  src={p.image}
                                  alt=""
                                  fill
                                  className="object-contain p-1"
                                  sizes="48px"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-bold text-slate-800 line-clamp-2">
                                {p.name}
                              </p>
                              {p.displayPrice > 0 ? (
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  NT${Number(p.displayPrice).toLocaleString()} 起
                                </p>
                              ) : null}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}

            {message ? (
              <p className="text-[11px] font-bold text-slate-600">{message}</p>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="w-full py-2.5 rounded-xl bg-[#0f172a] text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "儲存中…" : "儲存變更"}
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="shadow-lg rounded-full bg-[#1a56db] hover:bg-[#1e40af] text-white text-sm font-bold px-5 py-3"
      >
        {open ? "收合" : "編輯部落格"}
      </button>
    </div>
  );
}
