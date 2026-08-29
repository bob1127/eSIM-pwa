"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MaterialIcon from "@/components/MaterialIcon";

const SIZES = [
  { id: "12px", label: "12" },
  { id: "14px", label: "14" },
  { id: "16px", label: "16" },
  { id: "18px", label: "18" },
  { id: "20px", label: "20" },
  { id: "24px", label: "24" },
  { id: "32px", label: "32" },
];

const WEIGHTS = [
  { id: "400", label: "細" },
  { id: "500", label: "中" },
  { id: "700", label: "粗" },
  { id: "900", label: "特粗" },
];

const COLORS = [
  "#111827",
  "#1E4AD1",
  "#93003c",
  "#0A6CD0",
  "#ef4444",
  "#f97316",
  "#10b981",
  "#8b5cf6",
  "#64748b",
  "#ffffff",
];

const HEADS = ["P", "H1", "H2", "H3", "H4", "H5", "H6"];

function selectionInside(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const node = sel.anchorNode;
  if (!node || !root) return false;
  return root.contains(node.nodeType === 1 ? node : node.parentNode);
}

function wrapInline(style) {
  const sel = window.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  try {
    const span = document.createElement("span");
    Object.assign(span.style, style);
    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
    const next = document.createRange();
    next.selectNodeContents(span);
    sel.addRange(next);
  } catch {
    /* 選區跨標籤時改用指令 */
    if (style.color) document.execCommand("foreColor", false, style.color);
    if (style.fontWeight === "700" || style.fontWeight === "900") {
      document.execCommand("bold");
    }
  }
}

function cmd(name, value) {
  document.execCommand("styleWithCSS", false, true);
  document.execCommand(name, false, value);
}

/**
 * 圈選文字後出現在選區上方的格式列。
 */
export default function TextFormatToolbar({ rootRef, onEdit }) {
  const barRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const sync = () => {
      const root = rootRef.current;
      if (!root || !selectionInside(root)) {
        setPos(null);
        return;
      }
      const range = window.getSelection().getRangeAt(0);
      const r = range.getBoundingClientRect();
      if (!r.width && !r.height) {
        setPos(null);
        return;
      }
      const w = Math.min(420, window.innerWidth - 16);
      const left = Math.min(
        window.innerWidth - w - 8,
        Math.max(8, r.left + r.width / 2 - w / 2),
      );
      // 優先放選區下方，避免蓋住上一行文字（小白編輯時最常抱怨）
      const below = r.bottom + 10;
      const above = r.top - 56;
      const top =
        below + 56 < window.innerHeight - 8
          ? below
          : Math.max(8, above);
      setPos({ top, left, width: w });
    };

    const onSel = () => {
      window.requestAnimationFrame(sync);
    };
    document.addEventListener("selectionchange", onSel);
    document.addEventListener("mouseup", onSel);
    document.addEventListener("keyup", onSel);
    return () => {
      document.removeEventListener("selectionchange", onSel);
      document.removeEventListener("mouseup", onSel);
      document.removeEventListener("keyup", onSel);
    };
  }, [rootRef]);

  if (!pos || typeof document === "undefined") return null;

  const apply = (fn) => {
    fn();
    onEdit?.();
  };

  const setLink = () => {
    const cur = document.queryCommandValue("createLink");
    const url = window.prompt("超連結網址", cur || "https://");
    if (url === null) return;
    if (!url.trim()) {
      cmd("unlink");
      return;
    }
    cmd("createLink", url.trim());
  };

  return createPortal(
    <div
      ref={barRef}
      className="fixed z-[9800] rounded-lg bg-[#1f2124] text-white shadow-2xl border border-white/10 px-1.5 py-1"
      style={{ top: pos.top, left: pos.left, width: pos.width || 420 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex flex-wrap items-center gap-0.5">
        {HEADS.map((h) => (
          <button
            key={h}
            type="button"
            title={h === "P" ? "段落" : h}
            className="h-7 min-w-[28px] px-1 rounded text-[10px] font-black hover:bg-white/15"
            onClick={() =>
              apply(() =>
                cmd("formatBlock", h === "P" ? "<p>" : `<${h.toLowerCase()}>`),
              )
            }
          >
            {h}
          </button>
        ))}
        <span className="w-px h-5 bg-white/20 mx-0.5" />
        <button
          type="button"
          title="粗體"
          className="h-7 w-7 rounded font-black hover:bg-white/15"
          onClick={() => apply(() => cmd("bold"))}
        >
          B
        </button>
        <button
          type="button"
          title="斜體"
          className="h-7 w-7 rounded italic hover:bg-white/15"
          onClick={() => apply(() => cmd("italic"))}
        >
          I
        </button>
        <button
          type="button"
          title="底線"
          className="h-7 w-7 rounded underline hover:bg-white/15"
          onClick={() => apply(() => cmd("underline"))}
        >
          U
        </button>
        <span className="w-px h-5 bg-white/20 mx-0.5" />
        <label className="relative h-7 flex items-center px-1 rounded hover:bg-white/15 text-[10px] font-bold cursor-pointer">
          大小
          <select
            className="absolute inset-0 opacity-0 cursor-pointer"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) apply(() => wrapInline({ fontSize: v }));
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              大小
            </option>
            {SIZES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="relative h-7 flex items-center px-1 rounded hover:bg-white/15 text-[10px] font-bold cursor-pointer">
          粗細
          <select
            className="absolute inset-0 opacity-0 cursor-pointer"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) apply(() => wrapInline({ fontWeight: v }));
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              粗細
            </option>
            {WEIGHTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          title="超連結"
          className="h-7 w-7 rounded hover:bg-white/15 flex items-center justify-center"
          onClick={() => apply(setLink)}
        >
          <MaterialIcon name="link" size={16} />
        </button>
      </div>
      <div className="flex items-center gap-1 px-1 pb-0.5 pt-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            className="w-4 h-4 rounded-full border border-white/30"
            style={{ background: c }}
            onClick={() => apply(() => wrapInline({ color: c }))}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}
