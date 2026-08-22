"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import { QuarterRing } from "@/components/ui/QuarterRing";
import {
  WIDGET_GROUPS,
  createBlock,
  sanitizeBlocks,
  widgetLabel,
  isLayoutType,
  layoutCellCount,
} from "@/lib/partnerBlogBlocks";
import { PartnerBlogBlockView, blockStackGapClass } from "./PartnerBlogBlocksRender";
import { SettingsFields, WIDGET_CHROME } from "./PartnerBlogWidgetEditors";
import PartnerBlogEditorStage from "./PartnerBlogEditorStage";
import PartnerEditorStoreChrome from "./PartnerEditorStoreChrome";
import PartnerBlogPostSettings, {
  LivePreviewOverlay,
} from "./PartnerBlogPostSettings";
import PartnerBlogBlocksRender from "./PartnerBlogBlocksRender";
import { BlogBuilderMediaProvider } from "./MediaUploadField";
import { supabase } from "@/lib/supabaseClient";
import { validatePartnerBlogMeta } from "@/lib/partnerBlog";
import { fireCelebrationConfettiFromElement } from "@/lib/fireCelebrationConfetti";
import { mergeBlogCms } from "@/lib/partnerBlogCms";
import PublishToggle from "./PublishToggle";

const VIEWPORTS = [
  { id: "desktop", label: "桌機", icon: "desktop_windows", width: null },
  { id: "tablet", label: "平板", icon: "tablet_mac", width: 768 },
  { id: "mobile", label: "手機", icon: "smartphone", width: 390 },
];

function findBlock(blocks, id) {
  for (const b of blocks || []) {
    if (b.id === id) return { block: b, parent: blocks };
    if (b.columns) {
      for (const col of b.columns) {
        const hit = findBlock(col, id);
        if (hit) return hit;
      }
    }
  }
  return null;
}

function mapBlocks(blocks, fn) {
  return (blocks || []).map((b) => {
    const next = fn(b);
    if (next.columns) {
      return {
        ...next,
        columns: next.columns.map((col) => mapBlocks(col, fn)),
      };
    }
    return next;
  });
}

function removeBlock(blocks, id) {
  const out = [];
  for (const b of blocks || []) {
    if (b.id === id) continue;
    if (b.columns) {
      out.push({
        ...b,
        columns: b.columns.map((col) => removeBlock(col, id)),
      });
    } else {
      out.push(b);
    }
  }
  return out;
}

function moveBlock(blocks, id, dir) {
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx >= 0) {
    const j = idx + dir;
    if (j < 0 || j >= blocks.length) return blocks;
    const copy = [...blocks];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    return copy;
  }
  return blocks.map((b) =>
    b.columns
      ? { ...b, columns: b.columns.map((col) => moveBlock(col, id, dir)) }
      : b,
  );
}

function insertInto(blocks, selectedId, newBlock, isRoot = true) {
  if (!selectedId) return [...blocks, newBlock];
  const idx = blocks.findIndex((b) => b.id === selectedId);
  if (idx >= 0) {
    const copy = [...blocks];
    const sel = copy[idx];
    if (sel.type === "columns" || sel.type === "grid") {
      const cols = (sel.columns || []).map((c) => [...c]);
      if (!cols.length) cols.push([]);
      const empty = cols.findIndex((c) => !c.length);
      const at = empty >= 0 ? empty : 0;
      cols[at] = [...(cols[at] || []), newBlock];
      copy[idx] = { ...sel, columns: cols };
      return copy;
    }
    copy.splice(idx + 1, 0, newBlock);
    return copy;
  }
  const next = blocks.map((b) =>
    b.columns
      ? {
          ...b,
          columns: b.columns.map((col) =>
            insertInto(col, selectedId, newBlock, false),
          ),
        }
      : b,
  );
  if (isRoot && !findBlock(next, newBlock.id)) return [...blocks, newBlock];
  return next;
}

/** 移除並回傳 [新陣列, 被移除的 block] */
function removeById(blocks, id) {
  let removed = null;
  const walk = (list) => {
    const out = [];
    for (const b of list || []) {
      if (b.id === id) {
        removed = b;
        continue;
      }
      if (b.columns) out.push({ ...b, columns: b.columns.map(walk) });
      else out.push(b);
    }
    return out;
  };
  const next = walk(blocks);
  return [next, removed];
}

/** containerId：null=根；`${blockId}#${colIdx}`=某欄位 */
function insertIntoContainer(blocks, containerId, index, block) {
  if (!containerId) {
    const copy = [...blocks];
    copy.splice(Math.max(0, Math.min(index, copy.length)), 0, block);
    return copy;
  }
  const [cid, colStr] = containerId.split("#");
  const colIdx = Number(colStr);
  const walk = (list) =>
    list.map((b) => {
      if (b.id === cid && b.columns) {
        const cols = b.columns.map((c) => [...c]);
        const target = cols[colIdx] ? [...cols[colIdx]] : [];
        target.splice(Math.max(0, Math.min(index, target.length)), 0, block);
        cols[colIdx] = target;
        return { ...b, columns: cols };
      }
      if (b.columns) return { ...b, columns: b.columns.map(walk) };
      return b;
    });
  return walk(blocks);
}

function duplicateById(blocks, id) {
  const clone = (b) => ({
    ...b,
    id: newLocalId(),
    columns: b.columns ? b.columns.map((c) => c.map(clone)) : undefined,
  });
  const walk = (list) => {
    const out = [];
    for (const b of list || []) {
      if (b.columns) out.push({ ...b, columns: b.columns.map(walk) });
      else out.push(b);
      if (b.id === id) out.push(clone(b));
    }
    return out;
  };
  return walk(blocks);
}

function newLocalId() {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 畫布拖曳插入線 */
function DropLine({ active, onDragOver, onDrop }) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="relative"
      style={{ height: active ? 10 : 8 }}
    >
      <div
        className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded transition-all ${
          active ? "h-1 bg-[#93003c]" : "h-px bg-transparent"
        }`}
      />
    </div>
  );
}

/** 可拖曳、可點擊選取的編輯畫布（遞迴支援欄位） */
function EditableCanvas({
  blocks,
  containerId = null,
  selectedId,
  onSelect,
  drag,
  dragOverKey,
  setDragOverKey,
  onDropZone,
  onStartMoveDrag,
  viewport = "desktop",
  onPatchBlock,
}) {
  const renderNested = (list, cId) => (
    <EditableCanvas
      blocks={list}
      containerId={cId}
      selectedId={selectedId}
      onSelect={onSelect}
      drag={drag}
      dragOverKey={dragOverKey}
      setDragOverKey={setDragOverKey}
      onDropZone={onDropZone}
      onStartMoveDrag={onStartMoveDrag}
      viewport={viewport}
      onPatchBlock={onPatchBlock}
    />
  );

  const zoneKey = (i) => `${containerId || "root"}:${i}`;
  const allowDrop = (e) => {
    if (!drag.current) return;
    e.preventDefault();
    e.stopPropagation();
  };

  if (!blocks?.length) {
    const key = zoneKey(0);
    return (
      <div
        onDragOver={(e) => {
          allowDrop(e);
          setDragOverKey(key);
        }}
        onDrop={(e) => {
          e.stopPropagation();
          onDropZone(containerId, 0);
        }}
        className={`rounded-lg py-12 text-center text-sm transition ${
          dragOverKey === key
            ? "border-2 border-[#93003c] bg-[#93003c]/5 text-[#93003c]"
            : "border-2 border-dashed border-slate-300 text-slate-400"
        }`}
      >
        {containerId ? "拖曳元件到此欄" : "從左側拖曳或點擊元件加入文章"}
      </div>
    );
  }

  return (
    <div>
      <DropLine
        active={dragOverKey === zoneKey(0)}
        onDragOver={(e) => {
          allowDrop(e);
          setDragOverKey(zoneKey(0));
        }}
        onDrop={(e) => {
          e.stopPropagation();
          onDropZone(containerId, 0);
        }}
      />
      {blocks.map((block, i) => {
        const selected = selectedId === block.id;
        return (
          <div key={block.id} className={`${blockStackGapClass(block.type, blocks[i + 1]?.type)}`}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelect(block.id);
              }}
              data-block-id={block.id}
              className={`group relative w-full min-w-0 rounded-md transition cursor-pointer ${
                selected
                  ? "ring-2 ring-[#93003c] ring-offset-2"
                  : "hover:ring-1 hover:ring-sky-400"
              }`}
            >
              <span
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  onStartMoveDrag(block.id, containerId, i, e);
                }}
                className="absolute -left-2 -top-2 z-10 hidden group-hover:flex items-center gap-1 rounded bg-[#93003c] px-1.5 py-0.5 text-[10px] font-bold text-white cursor-grab active:cursor-grabbing"
              >
                <MaterialIcon name="drag_indicator" size={12} />
                拖曳
              </span>
              <button
                type="button"
                title="編輯"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(block.id);
                }}
                className="absolute -right-2 -top-2 z-10 hidden group-hover:flex items-center rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white"
              >
                編輯
              </button>
              {isLayoutType(block.type) ? (
                <div
                  className="w-full min-w-0"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      viewport === "mobile"
                        ? "minmax(0, 1fr)"
                        : `repeat(${
                            block.type === "grid"
                              ? Math.min(4, Number(block.props?.cols) || 2)
                              : Number(block.props?.count) === 3
                                ? 3
                                : 2
                          }, minmax(0, 1fr))`,
                    gap:
                      block.props?.gap === "none"
                        ? 0
                        : block.props?.gap === "sm"
                          ? 8
                          : block.props?.gap === "lg"
                            ? 24
                            : 16,
                  }}
                >
                  {(block.columns || []).map((col, ci) => (
                    <div
                      key={ci}
                      className="min-w-0 w-full min-h-[80px] rounded border border-dashed border-slate-200 p-1.5"
                    >
                      {renderNested(col, `${block.id}#${ci}`)}
                    </div>
                  ))}
                </div>
              ) : (
                <PartnerBlogBlockView
                  block={block}
                  renderBlocks={() => null}
                  editable
                  onChangeProps={(props) => onPatchBlock?.(block.id, props)}
                />
              )}
            </div>
            <DropLine
              active={dragOverKey === zoneKey(i + 1)}
              onDragOver={(e) => {
                allowDrop(e);
                setDragOverKey(zoneKey(i + 1));
              }}
              onDrop={(e) => {
                e.stopPropagation();
                onDropZone(containerId, i + 1);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function PartnerBlogElementorEditor({
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
  postId = "",
  meta = null,
  onChangeMeta,
  dirty = false,
  saveHint = "",
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [selectNonce, setSelectNonce] = useState(0);
  const [viewport, setViewport] = useState("desktop");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(null);
  const [livePreview, setLivePreview] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishOk, setPublishOk] = useState(false);
  const [dragOverKey, setDragOverKey] = useState(null);
  const drag = useRef(null);
  const canvasRef = useRef(null);
  const history = useRef({ past: [], future: [] });
  const lastPushAt = useRef(0);
  const skipHist = useRef(false);
  const [histTick, setHistTick] = useState({ undo: 0, redo: 0 });

  const recordHistory = useCallback(() => {
    if (skipHist.current) return;
    const now = Date.now();
    if (now - lastPushAt.current < 500 && history.current.past.length) {
      lastPushAt.current = now;
      return;
    }
    lastPushAt.current = now;
    history.current.past.push(JSON.stringify({ blocks, meta }));
    if (history.current.past.length > 80) history.current.past.shift();
    history.current.future = [];
    setHistTick({ undo: history.current.past.length, redo: 0 });
  }, [blocks, meta]);

  const applyBlocks = useCallback(
    (next) => {
      recordHistory();
      onChangeBlocks(next);
    },
    [onChangeBlocks, recordHistory],
  );

  const applyMeta = useCallback(
    (next) => {
      recordHistory();
      onChangeMeta?.(next);
    },
    [onChangeMeta, recordHistory],
  );

  const undo = useCallback(() => {
    if (!history.current.past.length) return;
    history.current.future.push(JSON.stringify({ blocks, meta }));
    const prev = JSON.parse(history.current.past.pop());
    skipHist.current = true;
    onChangeBlocks(prev.blocks);
    if (prev.meta && onChangeMeta) onChangeMeta(prev.meta);
    skipHist.current = false;
    lastPushAt.current = Date.now();
    setHistTick({
      undo: history.current.past.length,
      redo: history.current.future.length,
    });
  }, [blocks, meta, onChangeBlocks, onChangeMeta]);

  const redo = useCallback(() => {
    if (!history.current.future.length) return;
    history.current.past.push(JSON.stringify({ blocks, meta }));
    const next = JSON.parse(history.current.future.pop());
    skipHist.current = true;
    onChangeBlocks(next.blocks);
    if (next.meta && onChangeMeta) onChangeMeta(next.meta);
    skipHist.current = false;
    lastPushAt.current = Date.now();
    setHistTick({
      undo: history.current.past.length,
      redo: history.current.future.length,
    });
  }, [blocks, meta, onChangeBlocks, onChangeMeta]);

  const selectBlock = useCallback((id) => {
    setSelectedId(id);
    setSelectNonce((n) => n + 1);
    setLivePreview(false);
    setSettingsOpen(false);
    setMobileDrawer(null);
  }, []);

  const selected = useMemo(
    () => (selectedId ? findBlock(blocks, selectedId)?.block : null),
    [blocks, selectedId],
  );

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setAuthToken(data?.session?.access_token || "");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      if (mq.matches) {
        setViewport((v) => (v === "desktop" ? "mobile" : v));
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) onSave();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [saving, onSave, undo, redo]);

  const requestBack = () => {
    if (dirty) setLeaveOpen(true);
    else onBack();
  };

  const addWidget = (type) => {
    const next = createBlock(type);
    applyBlocks(sanitizeBlocks(insertInto(blocks, selectedId, next)));
    selectBlock(next.id);
  };

  // 從左側元件庫開始拖曳
  const startPaletteDrag = (type, e) => {
    drag.current = { kind: "new", type };
    e.dataTransfer.effectAllowed = "copy";
    try {
      e.dataTransfer.setData("text/plain", type);
    } catch {
      /* ignore */
    }
  };

  // 拖曳畫布上既有元件
  const startMoveDrag = (id, containerId, index, e) => {
    drag.current = { kind: "move", id, containerId, index };
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {
      /* ignore */
    }
  };

  const handleDropZone = (containerId, index) => {
    const info = drag.current;
    drag.current = null;
    setDragOverKey(null);
    if (!info) return;

    if (info.kind === "new") {
      const block = createBlock(info.type);
      applyBlocks(
        sanitizeBlocks(insertIntoContainer(blocks, containerId, index, block)),
      );
      selectBlock(block.id);
      return;
    }

    // move：先移除再插入，同容器且來源在前時索引 -1
    const [without, moved] = removeById(blocks, info.id);
    if (!moved) return;
    let targetIndex = index;
    if (info.containerId === containerId && info.index < index) {
      targetIndex = index - 1;
    }
    applyBlocks(
      sanitizeBlocks(insertIntoContainer(without, containerId, targetIndex, moved)),
    );
    selectBlock(moved.id);
  };

  const updateSelectedProps = (props) => {
    applyBlocks(
      mapBlocks(blocks, (b) => (b.id === selectedId ? { ...b, props } : b)),
    );
  };

  const patchBlockProps = (id, props) => {
    applyBlocks(
      mapBlocks(blocks, (b) => (b.id === id ? { ...b, props } : b)),
    );
  };

  const changeLayout = (partial) => {
    applyBlocks(
      mapBlocks(blocks, (b) => {
        if (b.id !== selectedId) return b;
        const props = { ...b.props, ...partial };
        const n = layoutCellCount(props, b.type);
        const cols = [...(b.columns || [])];
        while (cols.length < n) cols.push([]);
        return {
          ...b,
          props,
          columns: cols.slice(0, n),
        };
      }),
    );
  };

  const changeColumnsCount = (count) => changeLayout({ count });

  return (
    <BlogBuilderMediaProvider
      token={authToken}
      store={store}
      postId={postId}
      blocks={blocks}
      editingBlockId={selectedId || ""}
    >
    <div className="h-[100dvh] flex flex-col bg-[#1f2124] text-white overflow-hidden">
      <header className="h-12 shrink-0 flex items-center gap-1 sm:gap-2 px-1 sm:px-2 border-b border-white/10 overflow-x-auto">
        <button
          type="button"
          onClick={requestBack}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-white/80 hover:text-white"
        >
          <MaterialIcon name="close" size={18} />
          退出
        </button>
        <button
          type="button"
          title="文章設定（SEO）"
          onClick={() => {
            setLivePreview(false);
            setSettingsOpen((v) => !v);
            setMobileDrawer(null);
          }}
          className={`p-1.5 rounded ${
            settingsOpen ? "bg-[#93003c] text-white" : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          <MaterialIcon name="settings" size={18} />
        </button>
        <button
          type="button"
          title="上一步 (Ctrl+Z)"
          disabled={!histTick.undo}
          onClick={undo}
          className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
          <MaterialIcon name="undo" size={18} />
        </button>
        <button
          type="button"
          title="下一步 (Ctrl+Shift+Z)"
          disabled={!histTick.redo}
          onClick={redo}
          className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
          <MaterialIcon name="redo" size={18} />
        </button>
        <p className="min-w-0 max-w-[120px] sm:max-w-[180px] text-sm font-bold truncate">
          {meta?.title || title}
        </p>
        {dirty ? (
          <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-900">
            未儲存
          </span>
        ) : saveHint ? (
          <span className="shrink-0 text-[10px] text-emerald-300/80 hidden sm:inline">
            {saveHint}
          </span>
        ) : null}
        <div className="flex-1" />
        <div className="flex items-center rounded-lg bg-black/30 p-0.5">
          {VIEWPORTS.map((v) => (
            <button
              key={v.id}
              type="button"
              title={v.label}
              onClick={() => setViewport(v.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                viewport === v.id
                  ? "bg-white text-slate-900"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <MaterialIcon name={v.icon} size={16} />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          title="即時預覽"
          onClick={() => {
            setSettingsOpen(false);
            setSelectedId(null);
            setLivePreview((v) => !v);
          }}
          className={`p-1.5 rounded ${
            livePreview ? "bg-white text-slate-900" : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          <MaterialIcon name="visibility" size={20} />
        </button>
        {previewHref ? (
          <a
            href={previewHref}
            target="_blank"
            rel="noreferrer"
            title="開新分頁看已發布頁"
            className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10"
          >
            <MaterialIcon name="open_in_new" size={18} />
          </a>
        ) : null}
        <div className="flex items-center gap-2 mr-1">
          <span className="hidden sm:inline text-[11px] font-bold text-white/70">
            前台
          </span>
          <PublishToggle
            tone="dark"
            on={status === "published"}
            disabled={saving}
            onChange={(next) => {
              if (next) {
                const { ok } = validatePartnerBlogMeta(meta, { requireImage: true });
                if (!ok) {
                  setSettingsOpen(true);
                  return;
                }
                setPublishOpen(true);
                return;
              }
              onUnpublish?.();
            }}
          />
        </div>
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={() => onSave()}
          className="shrink-0 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded bg-white/10 hover:bg-white/15 disabled:opacity-50"
        >
          {saving ? "儲存中…" : "儲存草稿"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            const { ok } = validatePartnerBlogMeta(meta, { requireImage: true });
            if (!ok) {
              setSettingsOpen(true);
              return;
            }
            setPublishOpen(true);
          }}
          className="shrink-0 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-black rounded bg-[#93003c] hover:bg-[#b0104c] disabled:opacity-50"
        >
          {saving ? (
            <span className="inline-flex items-center gap-1">
              <QuarterRing size="xs" className="text-white" />
              {status === "published" ? "更新中…" : "發布中…"}
            </span>
          ) : status === "published" ? (
            "更新發布"
          ) : (
            "發布"
          )}
        </button>
      </header>

      <div className="flex flex-1 min-h-0 min-w-0 relative">
        {mobileDrawer === "widgets" ? (
          <button
            type="button"
            className="lg:hidden fixed inset-0 z-30 bg-black/50"
            aria-label="關閉元件庫"
            onClick={() => setMobileDrawer(null)}
          />
        ) : null}

        <aside
          className={`${
            mobileDrawer === "widgets"
              ? "fixed inset-y-12 left-0 z-40 flex w-[min(280px,88vw)]"
              : "hidden"
          } lg:relative lg:inset-auto lg:flex lg:w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#1f2124]`}
        >
          <div className="flex text-[11px] font-black border-b border-white/10">
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(false);
                setMobileDrawer("widgets");
              }}
              className={`flex-1 py-2.5 ${!settingsOpen ? "bg-[#93003c]" : "bg-black/30 text-white/60"}`}
            >
              元件
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(true);
                setMobileDrawer(null);
              }}
              className={`flex-1 py-2.5 ${settingsOpen ? "bg-[#93003c]" : "bg-black/30 text-white/60"}`}
            >
              文章設定
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {WIDGET_GROUPS.map((g) => (
              <div key={g.id} className="mb-4">
                <p className="text-[10px] font-black tracking-widest text-white/40 mb-2">
                  {g.label}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {g.widgets.map((w) => (
                    <button
                      key={w.type}
                      type="button"
                      draggable
                      onDragStart={(e) => startPaletteDrag(w.type, e)}
                      onDragEnd={() => {
                        drag.current = null;
                        setDragOverKey(null);
                      }}
                      onClick={() => {
                        addWidget(w.type);
                        setMobileDrawer(null);
                      }}
                      className="flex flex-col items-center gap-1.5 py-3 rounded bg-[#2b2c31] hover:bg-[#34353b] text-white/90 cursor-grab active:cursor-grabbing"
                    >
                      <MaterialIcon name={w.icon} size={20} />
                      <span className="text-[10px] font-bold">{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {settingsOpen && meta && onChangeMeta ? (
          <>
            <button
              type="button"
              className="lg:hidden fixed inset-0 z-30 bg-black/50"
              aria-label="關閉設定"
              onClick={() => setSettingsOpen(false)}
            />
            <aside className="fixed inset-y-12 inset-x-0 z-40 flex flex-col bg-[#1f2124] lg:absolute lg:left-[260px] lg:right-auto lg:bottom-0 lg:w-[340px] lg:max-w-[calc(100%-260px)] shadow-2xl border-r border-white/10">
              <div className="absolute right-2 top-2 z-10">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="p-1 rounded bg-black/40 text-white/80 hover:text-white"
                  title="關閉設定"
                >
                  <MaterialIcon name="close" size={16} />
                </button>
              </div>
              <PartnerBlogPostSettings
                meta={meta}
                onChange={applyMeta}
                storeDomain={store?.domain}
                categories={mergeBlogCms(store?.blog_cms).categories}
              />
            </aside>
          </>
        ) : null}

        <main
          ref={canvasRef}
          className={`flex-1 min-w-0 overflow-y-auto overflow-x-hidden ${
            viewport === "desktop" ? "bg-white" : "bg-[#cfd3da] p-2 sm:p-4 lg:p-8"
          }`}
          onClick={() => setSelectedId(null)}
          onDragEnd={() => {
            drag.current = null;
            setDragOverKey(null);
          }}
        >
          <div
            className={`bg-white min-h-full w-full max-w-full ${
              viewport === "desktop"
                ? ""
                : viewport === "tablet"
                  ? "mx-auto min-h-[70vh] shadow-2xl rounded-xl overflow-hidden"
                  : "mx-auto min-h-[70vh] shadow-2xl rounded-[28px] overflow-hidden ring-4 sm:ring-8 ring-black/10"
            }`}
            style={
              viewport === "desktop"
                ? undefined
                : {
                    width: VIEWPORTS.find((v) => v.id === viewport)?.width,
                    maxWidth: "100%",
                  }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <PartnerEditorStoreChrome store={store} viewport={viewport}>
              <PartnerBlogEditorStage
                meta={meta}
                title={title}
                viewport={viewport}
              >
                <EditableCanvas
                  blocks={blocks}
                  selectedId={selectedId}
                  onSelect={selectBlock}
                  drag={drag}
                  dragOverKey={dragOverKey}
                  setDragOverKey={setDragOverKey}
                  onDropZone={handleDropZone}
                  onStartMoveDrag={startMoveDrag}
                  viewport={viewport}
                  onPatchBlock={patchBlockProps}
                />
              </PartnerBlogEditorStage>
            </PartnerEditorStoreChrome>
          </div>
        </main>

        {selected && !livePreview ? (
          <>
            <button
              type="button"
              className="lg:hidden fixed inset-0 z-40 bg-black/40"
              aria-label="關閉元件設定"
              onClick={() => setSelectedId(null)}
            />
            <InlineEditPopover
              block={selected}
              onChangeProps={updateSelectedProps}
              onChangeColumnsCount={changeColumnsCount}
              onChangeLayout={changeLayout}
              onMoveUp={() => applyBlocks(moveBlock(blocks, selectedId, -1))}
              onMoveDown={() => applyBlocks(moveBlock(blocks, selectedId, 1))}
              onDuplicate={() => applyBlocks(duplicateById(blocks, selectedId))}
              onDelete={() => {
                applyBlocks(removeBlock(blocks, selectedId));
                setSelectedId(null);
              }}
              onClose={() => setSelectedId(null)}
            />
          </>
        ) : null}

        {livePreview ? (
          <LivePreviewOverlay viewport={viewport} onClose={() => setLivePreview(false)}>
            <PartnerEditorStoreChrome store={store} viewport={viewport}>
              <PartnerBlogEditorStage
                meta={meta}
                title={title}
                viewport={viewport}
              >
                <PartnerBlogBlocksRender blocks={blocks} />
              </PartnerBlogEditorStage>
            </PartnerEditorStoreChrome>
          </LivePreviewOverlay>
        ) : null}
      </div>

      <nav
        className="lg:hidden shrink-0 flex items-stretch border-t border-white/10 bg-[#1a1c1f]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          type="button"
          onClick={() => {
            setSettingsOpen(false);
            setMobileDrawer((v) => (v === "widgets" ? null : "widgets"));
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold ${
            mobileDrawer === "widgets" ? "text-white bg-[#93003c]/30" : "text-white/60"
          }`}
        >
          <MaterialIcon name="widgets" size={20} />
          元件
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedId(null);
            setSettingsOpen(false);
            setMobileDrawer(null);
          }}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold text-white/60"
        >
          <MaterialIcon name="edit_note" size={20} />
          畫布
        </button>
        <button
          type="button"
          onClick={() => {
            setSettingsOpen(true);
            setMobileDrawer(null);
            setSelectedId(null);
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold ${
            settingsOpen ? "text-white bg-[#93003c]/30" : "text-white/60"
          }`}
        >
          <MaterialIcon name="settings" size={20} />
          設定
        </button>
        {selected ? (
          <button
            type="button"
            onClick={() => {
              setSettingsOpen(false);
              setMobileDrawer(null);
            }}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold text-white bg-[#93003c]/40"
          >
            <MaterialIcon name="tune" size={20} />
            編輯
          </button>
        ) : null}
      </nav>

      {leaveOpen ? (
        <GuardModal
          title="有尚未儲存的變更"
          body="離開後未儲存的內容會遺失。要先存成草稿再退出嗎？"
          onCancel={() => setLeaveOpen(false)}
        >
          <button
            type="button"
            className="px-3 py-2 text-xs font-bold rounded bg-white/10"
            onClick={() => {
              setLeaveOpen(false);
              onBack();
            }}
          >
            不儲存離開
          </button>
          <button
            type="button"
            disabled={saving}
            className="px-3 py-2 text-xs font-black rounded bg-[#93003c]"
            onClick={async () => {
              const ok = await onSave();
              if (ok !== false) {
                setLeaveOpen(false);
                onBack();
              }
            }}
          >
            儲存並離開
          </button>
        </GuardModal>
      ) : null}

      {publishOpen ? (
        <GuardModal
          title={status === "published" ? "更新已發布文章？" : "確定發布？"}
          body={
            status === "published"
              ? "會覆蓋前台目前的文章內容。"
              : "發布後主站與夥伴商店都會出現此文。請確認標題、slug、精選圖與內容無誤。"
          }
          onCancel={() => !saving && setPublishOpen(false)}
          hideCancel={saving}
        >
          <button
            type="button"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded bg-[#93003c] disabled:opacity-80 min-w-[96px] justify-center"
            onClick={async (e) => {
              const btn = e.currentTarget;
              const ok = await onPublish();
              if (ok !== false) {
                fireCelebrationConfettiFromElement(btn);
                setPublishOpen(false);
                setPublishOk(true);
                window.setTimeout(() => setPublishOk(false), 3200);
              }
            }}
          >
            {saving ? (
              <>
                <QuarterRing size="xs" className="text-white" />
                發布中…
              </>
            ) : (
              "確定發布"
            )}
          </button>
        </GuardModal>
      ) : null}

      {publishOk ? (
        <PublishRibbon onClose={() => setPublishOk(false)} />
      ) : null}
    </div>
    </BlogBuilderMediaProvider>
  );
}

function InlineEditPopover({
  block,
  onChangeProps,
  onChangeColumnsCount,
  onChangeLayout,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onClose,
}) {
  const chrome = WIDGET_CHROME[block.type] || {
    accent: "#93003c",
    icon: "widgets",
    width: 320,
    hint: "",
  };

  return (
    <aside className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(78dvh,640px)] flex-col rounded-t-2xl border-t border-white/10 bg-[#1f2124] text-white shadow-2xl lg:static lg:inset-auto lg:z-auto lg:max-h-none lg:w-[360px] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none min-h-0">
      <div
        className="shrink-0 px-3 py-2.5 select-none"
        style={{ background: chrome.accent }}
      >
        <div className="flex items-center gap-1">
          <MaterialIcon name={chrome.icon} size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black truncate">{widgetLabel(block.type)}</p>
            {chrome.hint ? (
              <p className="text-[10px] text-white/80 truncate">{chrome.hint}</p>
            ) : null}
          </div>
          <button type="button" title="上移" onClick={onMoveUp} className="p-1 rounded hover:bg-black/20">
            <MaterialIcon name="arrow_upward" size={15} />
          </button>
          <button type="button" title="下移" onClick={onMoveDown} className="p-1 rounded hover:bg-black/20">
            <MaterialIcon name="arrow_downward" size={15} />
          </button>
          <button type="button" title="複製" onClick={onDuplicate} className="p-1 rounded hover:bg-black/20">
            <MaterialIcon name="content_copy" size={15} />
          </button>
          <button type="button" title="刪除" onClick={onDelete} className="p-1 rounded hover:bg-black/30">
            <MaterialIcon name="delete" size={15} />
          </button>
          <button type="button" title="關閉" onClick={onClose} className="p-1 rounded hover:bg-black/20">
            <MaterialIcon name="close" size={15} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        <SettingsFields
          block={block}
          onChangeProps={onChangeProps}
          onChangeColumnsCount={onChangeColumnsCount}
          onChangeLayout={onChangeLayout}
        />
      </div>
    </aside>
  );
}

function GuardModal({ title, body, onCancel, children, hideCancel = false }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-[#1f2124] border border-white/10 p-4 text-white shadow-2xl">
        <p className="text-sm font-black">{title}</p>
        <p className="text-[12px] text-white/60 mt-2 leading-relaxed">{body}</p>
        <div className="flex justify-end gap-2 mt-4">
          {!hideCancel ? (
            <button
              type="button"
              className="px-3 py-2 text-xs font-bold rounded bg-white/5"
              onClick={onCancel}
            >
              取消
            </button>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

function PublishRibbon({ onClose }) {
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#1f2124] border border-white/10 text-white shadow-2xl px-6 pt-10 pb-6 text-center">
        <div className="pointer-events-none absolute -right-12 top-5 rotate-45 bg-[#FADE2B] text-slate-900 text-[11px] font-black tracking-[0.28em] px-14 py-1.5 shadow-md">
          成功發布
        </div>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
          <MaterialIcon name="check_circle" size={32} />
        </div>
        <p className="text-base font-black">文章已發布</p>
        <p className="text-[12px] text-white/55 mt-1.5 leading-relaxed">
          主站與夥伴商店前台都會出現此文。
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 px-5 py-2 text-xs font-black rounded-lg bg-white text-slate-900"
        >
          完成
        </button>
      </div>
    </div>
  );
}
