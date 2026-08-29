"use client";

import { useEffect, useRef, useState } from "react";
import TextFormatToolbar from "./TextFormatToolbar";

/**
 * 畫布內直接改文字（Elementor 式）。未聚焦時才把 props 同步回 DOM，避免游標跳動。
 */
export default function CanvasEditable({
  enabled = false,
  value = "",
  onChange,
  as: Tag = "span",
  className = "",
  style,
  html = false,
  singleLine = false,
  placeholder = "點此編輯",
}) {
  const ref = useRef(null);
  const focused = useRef(false);
  const display = value ?? "";
  const [seed] = useState(display);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    if (!enabled || focused.current || !ref.current) return;
    if (html) {
      if (ref.current.innerHTML !== display) ref.current.innerHTML = display;
    } else if ((ref.current.innerText || "") !== display) {
      ref.current.innerText = display;
    }
  }, [display, enabled, html]);

  if (!enabled) {
    if (html) {
      return (
        <Tag
          className={className}
          style={style}
          dangerouslySetInnerHTML={{ __html: display }}
        />
      );
    }
    return (
      <Tag className={className} style={style}>
        {display}
      </Tag>
    );
  }

  const commit = (el) => {
    const next = html
      ? el.innerHTML
      : singleLine
        ? el.textContent || ""
        : el.innerText || "";
    if (next !== display) onChange?.(next);
  };

  return (
    <>
      <Tag
        ref={ref}
        style={style}
        className={`${className} outline-none cursor-text rounded-[2px] break-words ${
          html ? "" : "whitespace-pre-wrap "
        }empty:before:content-[attr(data-placeholder)] empty:before:opacity-40 focus:ring-1 focus:ring-[#93003c]/50 focus:bg-black/[0.03]`.trim()}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={html ? { __html: seed } : undefined}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onFocus={() => {
          focused.current = true;
          if (html && !singleLine) setShowBar(true);
        }}
        onBlur={(e) => {
          focused.current = false;
          commit(e.currentTarget);
          window.setTimeout(() => setShowBar(false), 180);
        }}
        onInput={(e) => commit(e.currentTarget)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (singleLine && e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        onPaste={(e) => {
          if (html) return;
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand(
            "insertText",
            false,
            singleLine ? text.replace(/\s+/g, " ") : text,
          );
        }}
      >
        {html ? undefined : seed}
      </Tag>
      {showBar && html && !singleLine ? (
        <TextFormatToolbar
          rootRef={ref}
          onEdit={() => {
            if (ref.current) commit(ref.current);
          }}
        />
      ) : null}
    </>
  );
}
