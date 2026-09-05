"use client";

import { useEffect, useMemo, useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import {
  emptyDay,
  emptyStop,
  getItineraryProps,
  isItineraryBlocks,
  firstItineraryImage,
} from "@/lib/partnerBlogItinerary";
import { validatePartnerBlogMeta } from "@/lib/partnerBlog";
import { mergeBlogCms } from "@/lib/partnerBlogCms";
import { itineraryDestinationsMissing } from "@/lib/itineraryAffiliate";
import ItineraryDestinationPicker from "./ItineraryDestinationPicker";
import { supabase } from "@/lib/supabaseClient";
import PartnerBlogPostSettings from "./PartnerBlogPostSettings";
import MediaUploadField, { BlogBuilderMediaProvider } from "./MediaUploadField";
import WpPhotoWall from "@/components/Blog/WpPhotoWall";
import CanvasEditable from "./CanvasEditable";
import PublishToggle from "./PublishToggle";

const DURATIONS = ["停留 30 分", "停留 1 小時", "停留 2 小時", "半天", "住宿"];

function patchItinerary(blocks, nextProps) {
  const has = isItineraryBlocks(blocks);
  if (!has) {
    return [{ id: `t_${Date.now()}`, type: "itinerary", props: nextProps }];
  }
  return (blocks || []).map((b) =>
    b?.type === "itinerary" ? { ...b, props: nextProps } : b,
  );
}

export default function PartnerBlogItineraryEditor({
  title,
  blocks,
  onChangeBlocks,
  onBack,
  onSave,
  onPublish,
  onUnpublish,
  saving,
  status,
  previewHref,
  store = null,
  meta = null,
  onChangeMeta,
  dirty = false,
  saveHint = "",
}) {
  const props = getItineraryProps(blocks);
  const days = props.days || [];
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [selected, setSelected] = useState(() => {
    const first = days[0]?.stops?.[0];
    return first
      ? { dayId: days[0].id, stopId: first.id }
      : { dayId: days[0]?.id, stopId: null };
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token || "");
    });
  }, []);

  useEffect(() => {
    const still =
      days.some((d) =>
        d.stops?.some((s) => s.id === selected.stopId && d.id === selected.dayId),
      );
    if (still) return;
    const d = days[0];
    const s = d?.stops?.[0];
    setSelected({ dayId: d?.id, stopId: s?.id || null });
  }, [days, selected.dayId, selected.stopId]);

  const current = useMemo(() => {
    const day = days.find((d) => d.id === selected.dayId) || days[0];
    const stop = day?.stops?.find((s) => s.id === selected.stopId) || day?.stops?.[0];
    return { day, stop };
  }, [days, selected.dayId, selected.stopId]);

  const setProps = (next) => onChangeBlocks(patchItinerary(blocks, next));

  const updateDay = (dayId, patch) => {
    setProps({
      ...props,
      days: days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)),
    });
  };

  const updateStop = (dayId, stopId, patch) => {
    setProps({
      ...props,
      days: days.map((d) =>
        d.id !== dayId
          ? d
          : {
              ...d,
              stops: (d.stops || []).map((s) =>
                s.id === stopId ? { ...s, ...patch } : s,
              ),
            },
      ),
    });
  };

  const addDay = () => {
    const day = emptyDay(days.length + 1);
    setProps({ ...props, days: [...days, day] });
    setSelected({ dayId: day.id, stopId: day.stops[0].id });
  };

  const addStop = (dayId) => {
    const stop = emptyStop("新景點");
    setProps({
      ...props,
      days: days.map((d) =>
        d.id === dayId ? { ...d, stops: [...(d.stops || []), stop] } : d,
      ),
    });
    setSelected({ dayId, stopId: stop.id });
  };

  const removeDay = (dayId) => {
    if (days.length <= 1) return;
    setProps({ ...props, days: days.filter((d) => d.id !== dayId) });
  };

  const removeStop = (dayId, stopId) => {
    const day = days.find((d) => d.id === dayId);
    if (!day || (day.stops || []).length <= 1) return;
    setProps({
      ...props,
      days: days.map((d) =>
        d.id !== dayId
          ? d
          : { ...d, stops: d.stops.filter((s) => s.id !== stopId) },
      ),
    });
  };

  const { day, stop } = current;
  const published = status === "published";

  const requestPublish = () => {
    const { ok, errors } = validatePartnerBlogMeta(
      {
        ...meta,
        og_image_url:
          meta?.og_image_url || firstItineraryImage(blocks) || "",
      },
      { requireImage: true },
    );
    if (!ok) {
      setSettingsOpen(true);
      alert(Object.values(errors).join("\n"));
      return;
    }
    if (itineraryDestinationsMissing(props)) {
      alert("請先選擇至少一個行程地區。");
      return;
    }
    onPublish?.();
  };

  return (
    <BlogBuilderMediaProvider token={authToken} store={store}>
      <div className="h-[100dvh] flex flex-col bg-[#1f2124] text-white">
        <header className="h-12 shrink-0 flex items-center gap-2 px-2 border-b border-white/10">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-white/80 hover:text-white"
          >
            <MaterialIcon name="close" size={18} />
            退出
          </button>
          <button
            type="button"
            title="文章設定（SEO）"
            onClick={() => setSettingsOpen((v) => !v)}
            className={`p-1.5 rounded ${
              settingsOpen
                ? "bg-[#93003c] text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <MaterialIcon name="settings" size={18} />
          </button>
          <p className="min-w-0 max-w-[200px] text-sm font-bold truncate">
            {meta?.title || title}
          </p>
          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#e2498e] text-white">
            行程規劃
          </span>
          {dirty ? (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-900">
              未儲存
            </span>
          ) : saveHint ? (
            <span className="shrink-0 text-[10px] text-emerald-300/80 hidden sm:inline">
              {saveHint}
            </span>
          ) : published ? (
            <span className="shrink-0 text-[10px] font-bold text-emerald-300/80 hidden sm:inline">
              已同步
            </span>
          ) : null}
          <div className="flex-1" />
          {previewHref ? (
            <a
              href={previewHref}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10"
              title="前台預覽"
            >
              <MaterialIcon name="visibility" size={18} />
            </a>
          ) : null}
          <div className="flex items-center gap-2 pr-1">
            <span className="hidden sm:inline text-[10px] text-white/50">
              前台
            </span>
            <PublishToggle
              tone="dark"
              on={published}
              disabled={saving}
              onChange={(on) => (on ? requestPublish() : onUnpublish?.())}
            />
          </div>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={onSave}
            className="px-3 py-1.5 rounded text-[12px] font-bold bg-white/10 hover:bg-white/15 disabled:opacity-40"
          >
            {saving ? "儲存中…" : "儲存草稿"}
          </button>
          <button
            type="button"
            disabled={saving || (published ? !dirty : false)}
            title={
              published && !dirty
                ? "沒有未儲存變更，已與前台同步"
                : dirty
                  ? "有未儲存變更，點此寫入前台"
                  : undefined
            }
            onClick={requestPublish}
            className={`px-3 py-1.5 rounded text-[12px] font-bold disabled:opacity-40 ${
              dirty
                ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
                : "bg-[#c62828] hover:bg-[#b71c1c] text-white"
            }`}
          >
            {saving
              ? "更新中…"
              : published
                ? dirty
                  ? "更新 *"
                  : "已同步"
                : "發布"}
          </button>
        </header>

        <div className="flex-1 min-h-0 flex">
          <aside className="w-[240px] shrink-0 border-r border-white/10 overflow-y-auto p-3">
            <p className="text-[10px] font-bold tracking-wider text-white/40 uppercase mb-2">
              行程大綱
            </p>
            {days.map((d, di) => (
              <div key={d.id} className="mb-3">
                <div className="flex items-center gap-1 mb-1">
                  <input
                    value={d.title}
                    onChange={(e) => updateDay(d.id, { title: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-[12px] font-bold text-white/90 border-b border-transparent focus:border-white/30 outline-none"
                  />
                  <button
                    type="button"
                    className="text-white/30 hover:text-rose-300"
                    title="刪除此天"
                    onClick={() => removeDay(d.id)}
                  >
                    <MaterialIcon name="close" size={14} />
                  </button>
                </div>
                <ul className="space-y-0.5">
                  {(d.stops || []).map((s) => {
                    const on = s.id === stop?.id;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelected({ dayId: d.id, stopId: s.id })
                          }
                          className={`w-full text-left px-2 py-1.5 rounded text-[12px] truncate ${
                            on
                              ? "bg-[#e2498e]/25 text-[#ffb3d4] font-bold"
                              : "text-white/70 hover:bg-white/5"
                          }`}
                        >
                          {s.name || "未命名景點"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => addStop(d.id)}
                  className="mt-1 text-[11px] font-bold text-[#e2498e] hover:underline"
                >
                  + 景點
                </button>
                {di === days.length - 1 ? null : (
                  <div className="mt-2 h-px bg-white/10" />
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addDay}
              className="w-full mt-1 py-2 rounded-lg border border-dashed border-white/20 text-[12px] font-bold text-white/70 hover:bg-white/5"
            >
              + 新增一天
            </button>
          </aside>

          {settingsOpen ? (
            <aside className="w-[320px] shrink-0 border-r border-white/10 overflow-y-auto p-3">
              <PartnerBlogPostSettings
                meta={meta}
                onChange={onChangeMeta}
                storeDomain={store?.domain}
                categories={mergeBlogCms(store?.blog_cms).categories}
              />
            </aside>
          ) : null}

          <main className="flex-1 min-w-0 overflow-y-auto bg-white text-slate-900">
            <div className="max-w-[720px] mx-auto px-5 py-8">
              <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[13px] font-bold text-slate-800 mb-3">
                  行程地區 *必選至少一個。
                </p>
                <ItineraryDestinationPicker
                  value={props.destinations || []}
                  onChange={(destinations) =>
                    setProps({ ...props, destinations })
                  }
                  missingHint="尚未選擇地區，無法發布"
                />
              </div>
              <label className="block mb-8">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  行程前言（選填）
                </span>
                <CanvasEditable
                  enabled
                  html
                  as="div"
                  className="mt-2 min-h-[4.5rem] text-[15px] leading-relaxed text-slate-700"
                  value={props.intro || ""}
                  onChange={(intro) => setProps({ ...props, intro })}
                  placeholder="這趟行程怎麼排、適合誰…"
                />
              </label>

              {!stop ? (
                <p className="text-slate-400 text-sm">請在左側新增景點</p>
              ) : (
                <article>
                  <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-slate-400 mb-2">
                    {day?.title}
                  </p>
                  <div className="mb-4">
                    <p className="text-[11px] font-bold text-slate-500 mb-2">
                      這天推薦地區
                    </p>
                    <ItineraryDestinationPicker
                      value={day.destinations || []}
                      onChange={(destinations) =>
                        updateDay(day.id, { destinations })
                      }
                      inheritLabel="與全文相同"
                    />
                  </div>
                  <CanvasEditable
                    enabled
                    as="h2"
                    singleLine
                    className="text-[24px] font-bold text-slate-900"
                    value={stop.name}
                    onChange={(name) =>
                      updateStop(day.id, stop.id, { name })
                    }
                    placeholder="景點名稱"
                  />
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {DURATIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          updateStop(day.id, stop.id, { duration: d })
                        }
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          stop.duration === d
                            ? "bg-slate-900 text-white border-slate-900"
                            : "border-slate-200 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                    <input
                      value={stop.duration || ""}
                      onChange={(e) =>
                        updateStop(day.id, stop.id, {
                          duration: e.target.value,
                        })
                      }
                      placeholder="自訂停留時間"
                      className="text-[11px] px-2 py-1 rounded-full border border-slate-200 w-32"
                    />
                  </div>

                  {stop.photos?.length ? (
                    <div className="mt-6">
                      <WpPhotoWall
                        images={stop.photos.map((src) => ({
                          src,
                          href: src,
                          alt: stop.name,
                        }))}
                        size="md"
                        align="left"
                        layout="mosaic"
                      />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {stop.photos.map((src) => (
                          <button
                            key={src}
                            type="button"
                            title="移除此圖"
                            onClick={() =>
                              updateStop(day.id, stop.id, {
                                photos: stop.photos.filter((u) => u !== src),
                              })
                            }
                            className="relative w-10 h-10 rounded overflow-hidden border border-slate-200"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute inset-0 bg-black/40 text-white text-[10px] font-bold flex items-center justify-center opacity-0 hover:opacity-100">
                              ×
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-3">
                    <p className="text-[11px] font-bold text-slate-500 mb-1">
                      圖片牆（可上傳多張）
                    </p>
                    <MediaUploadField
                      kind="image"
                      multiple
                      maxFiles={12}
                      variant="light"
                      onUploaded={(incoming) => {
                        const add = (
                          Array.isArray(incoming) ? incoming : [incoming]
                        )
                          .map((s) => String(s || "").trim())
                          .filter(Boolean);
                        updateStop(day.id, stop.id, {
                          photos: [...(stop.photos || []), ...add].slice(0, 12),
                        });
                      }}
                    />
                  </div>

                  <CanvasEditable
                    enabled
                    html
                    as="div"
                    className="mt-6 min-h-[8rem] text-[15px] leading-[1.85] text-slate-700"
                    value={stop.body || ""}
                    onChange={(body) =>
                      updateStop(day.id, stop.id, { body })
                    }
                    placeholder="這個景點怎麼玩…"
                  />

                  <label className="block mt-8">
                    <span className="text-[11px] font-bold text-slate-500">
                      Google 地圖地點（選填）
                    </span>
                    <input
                      value={stop.map || ""}
                      onChange={(e) =>
                        updateStop(day.id, stop.id, { map: e.target.value })
                      }
                      placeholder="例如：由布院金鱗湖"
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                  {stop.map ? (
                    <iframe
                      title="map"
                      className="mt-3 w-full h-56 rounded-lg border-0"
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(
                        stop.map,
                      )}&output=embed`}
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => removeStop(day.id, stop.id)}
                    className="mt-8 text-[12px] text-rose-500 hover:underline"
                  >
                    刪除此景點
                  </button>
                </article>
              )}
            </div>
          </main>
        </div>
      </div>
    </BlogBuilderMediaProvider>
  );
}
