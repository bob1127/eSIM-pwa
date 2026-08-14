"use client";

import { useEffect, useState } from "react";
import {
  RADIUS_OPTIONS,
  WIDTH_OPTIONS,
  HEIGHT_OPTIONS,
  GAP_OPTIONS,
  CARD_DESIGN_TYPES,
  designControlStyle,
} from "@/lib/partnerBlogDesign";
import ColorPickerField from "./ColorPickerField";
import { parseSocialPostUrl } from "@/lib/partnerBlogBlocks";
import {
  SHARE_BUTTON_CATALOG,
  parseShareItems,
} from "@/components/Shop/PartnerShareButtons";
import MaterialIcon from "@/components/MaterialIcon";
import MediaUploadField, { useBlogBuilderMedia } from "./MediaUploadField";

export const WIDGET_CHROME = {
  heading: { accent: "#e2498e", icon: "title", width: 380, hint: "標題層級與對齊" },
  text: { accent: "#3b82f6", icon: "notes", width: 420, hint: "文章內文" },
  image: { accent: "#0ea5e9", icon: "image", width: 340, hint: "上傳或貼網址" },
  video: { accent: "#ef4444", icon: "videocam", width: 340, hint: "上傳或 YouTube" },
  button: { accent: "#2563eb", icon: "smart_button", width: 380, hint: "按鈕顏色、圓角、寬度" },
  divider: { accent: "#64748b", icon: "horizontal_rule", width: 280, hint: "分隔線" },
  spacer: { accent: "#94a3b8", icon: "expand", width: 280, hint: "垂直間距" },
  html: { accent: "#22c55e", icon: "code", width: 420, hint: "自訂 HTML" },
  columns: { accent: "#a855f7", icon: "view_column", width: 340, hint: "2 或 3 欄，可拖元件進去" },
  grid: { accent: "#7c3aed", icon: "grid_view", width: 360, hint: "自由列×欄格子，像 Elementor" },
  table: { accent: "#0f766e", icon: "table", width: 380, hint: "可編輯儲存格" },
  gallery: { accent: "#06b6d4", icon: "photo_library", width: 360, hint: "多圖上傳" },
  "photo-wall": { accent: "#0f766e", icon: "grid_on", width: 380, hint: "並排拼貼，點擊開幻燈片" },
  "icon-box": { accent: "#f59e0b", icon: "dashboard", width: 340, hint: "圖示＋說明" },
  "icon-list": { accent: "#10b981", icon: "format_list_bulleted", width: 360, hint: "每列一則重點" },
  accordion: { accent: "#6366f1", icon: "unfold_more", width: 400, hint: "FAQ 摺疊" },
  tabs: { accent: "#8b5cf6", icon: "tab", width: 400, hint: "分頁內容" },
  alert: { accent: "#f97316", icon: "info", width: 340, hint: "提示色塊" },
  quote: { accent: "#78716c", icon: "format_quote", width: 360, hint: "引言" },
  testimonial: { accent: "#ec4899", icon: "record_voice_over", width: 360, hint: "旅客推薦" },
  cta: { accent: "#93003c", icon: "campaign", width: 380, hint: "行動呼籲" },
  counter: { accent: "#14b8a6", icon: "pin", width: 300, hint: "數字重點" },
  progress: { accent: "#84cc16", icon: "linear_scale", width: 300, hint: "進度條" },
  rating: { accent: "#eab308", icon: "star", width: 300, hint: "星等" },
  social: { accent: "#38bdf8", icon: "share", width: 360, hint: "社群連結按鈕" },
  share: { accent: "#1877F2", icon: "ios_share", width: 380, hint: "分享到社群、複製連結" },
  "social-post": { accent: "#e1306c", icon: "photo_camera", width: 400, hint: "自動排版或輪播" },
  map: { accent: "#16a34a", icon: "map", width: 340, hint: "Google 地圖" },
  carousel: { accent: "#f43f5e", icon: "view_carousel", width: 380, hint: "輪播樣式與效果" },
  products: { accent: "#0ea5e9", icon: "inventory_2", width: 400, hint: "卡片／分頁／輪播" },
};

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full bg-[#2b2c31] border border-white/10 rounded px-2.5 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#e2498e]";

function Seg({ value, onChange, options }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-white/15">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 py-1.5 text-[11px] font-black ${
            value === o.id ? "bg-white text-slate-900" : "text-white/60 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ItemStackEditor({ items, onChange }) {
  const list = items || [];
  return (
    <div className="space-y-2">
      {list.map((it, i) => (
        <div key={i} className="rounded-lg bg-black/30 border border-white/10 p-2">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] font-black text-white/40">#{i + 1}</span>
            <button
              type="button"
              className="ml-auto p-0.5 text-white/40 hover:text-red-300"
              onClick={() => onChange(list.filter((_, j) => j !== i))}
            >
              <MaterialIcon name="close" size={14} />
            </button>
          </div>
          <input
            className={`${inputCls} mb-1.5`}
            value={it.title || ""}
            placeholder="標題"
            onChange={(e) => {
              const next = [...list];
              next[i] = { ...next[i], title: e.target.value };
              onChange(next);
            }}
          />
          <textarea
            className={`${inputCls} min-h-[56px]`}
            value={it.body || ""}
            placeholder="內容"
            onChange={(e) => {
              const next = [...list];
              next[i] = { ...next[i], body: e.target.value };
              onChange(next);
            }}
          />
        </div>
      ))}
      <button
        type="button"
        className="w-full py-1.5 text-[11px] font-bold rounded border border-dashed border-white/20 text-white/70 hover:bg-white/5"
        onClick={() => onChange([...list, { title: "新項目", body: "" }])}
      >
        + 新增一則
      </button>
    </div>
  );
}

function ProductPicker({ items, onChange }) {
  const { token } = useBlogBuilderMedia();
  const [catalog, setCatalog] = useState([]);
  const selected = new Set((items || []).map((it) => it.handle));

  useEffect(() => {
    if (!token) return;
    fetch("/api/partner/blog-catalog", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setCatalog(Array.isArray(data?.products) ? data.products : []))
      .catch(() => setCatalog([]));
  }, [token]);

  const toggle = (p) => {
    if (selected.has(p.handle)) {
      onChange((items || []).filter((it) => it.handle !== p.handle));
      return;
    }
    if ((items || []).length >= 12) return;
    onChange([
      ...(items || []),
      {
        handle: p.handle,
        name: p.name,
        image: p.image,
        price: p.price ? String(Math.round(p.price)) : "",
        href: p.href,
      },
    ]);
  };

  return (
    <div className="max-h-56 overflow-y-auto space-y-1">
      {!catalog.length ? (
        <p className="text-[11px] text-white/40">沒有可選商品，或尚未載入</p>
      ) : (
        catalog.map((p) => (
          <button
            key={p.handle}
            type="button"
            onClick={() => toggle(p)}
            className={`w-full text-left flex items-center gap-2 rounded px-2 py-1.5 text-[12px] ${
              selected.has(p.handle) ? "bg-sky-500/30" : "bg-white/5 hover:bg-white/10"
            }`}
          >
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt="" className="w-8 h-8 object-cover rounded" />
            ) : (
              <span className="w-8 h-8 rounded bg-white/10" />
            )}
            <span className="flex-1 truncate">{p.name}</span>
          </button>
        ))
      )}
    </div>
  );
}

function ColorAccordion({ items }) {
  const list = (items || []).filter(Boolean);
  const [openId, setOpenId] = useState(list[0]?.id || "");

  if (!list.length) return null;

  return (
    <div className="mb-3 rounded-lg border border-white/10 overflow-hidden">
      {list.map((item) => {
        const open = openId === item.id;
        const hex =
          item.value && item.value !== "transparent" ? item.value : "";
        return (
          <div key={item.id} className="border-b border-white/10 last:border-b-0">
            <button
              type="button"
              onClick={() => setOpenId(open ? "" : item.id)}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-white/5"
            >
              <span
                className="w-3.5 h-3.5 rounded-sm border border-white/25 shrink-0"
                style={{
                  background: hex
                    ? hex
                    : "repeating-conic-gradient(#888 0 25%, #222 0 50%) 50% / 6px 6px",
                }}
              />
              <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {item.label}
              </span>
              <MaterialIcon
                name={open ? "expand_less" : "expand_more"}
                size={16}
                className="text-white/40"
              />
            </button>
            {open ? (
              <div className="px-2.5 pb-2.5">
                <ColorPickerField value={item.value} onChange={item.onChange} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DesignFields({ p, set, type }) {
  const showMinH = !["carousel", "spacer", "video"].includes(type);
  const showGap = ["social-post", "gallery", "icon-list", "products", "social"].includes(
    type,
  );
  const splitCard = CARD_DESIGN_TYPES.has(type);
  return (
    <div className="mt-4 pt-3 border-t border-white/10">
      <p className="text-[10px] font-black tracking-widest text-white/35 mb-2">
        {splitCard ? "外觀 · 整體" : "外觀"}
      </p>
      <ColorAccordion
        items={[
          !splitCard
            ? {
                id: "fill",
                label: type === "table" ? "表頭底色" : "主色／填滿",
                value: p.fill || "",
                onChange: (v) => set("fill", v),
              }
            : null,
          {
            id: "color",
            label: "文字色",
            value: p.color || "",
            onChange: (v) => set("color", v),
          },
          {
            id: "bg",
            label: type === "table" ? "表格底色" : "底色",
            value: p.bg || "",
            onChange: (v) => set("bg", v),
          },
          {
            id: "border",
            label: type === "table" ? "格線色" : "邊框色",
            value: p.border || "",
            onChange: (v) => set("border", v),
          },
        ]}
      />
      <Field label={`${type === "table" ? "格線粗細" : "邊框粗細"} ${p.border_w || (type === "table" ? 1 : 0)}px`}>
        <input
          type="range"
          min="0"
          max="6"
          value={p.border_w ?? (type === "table" ? 1 : 0)}
          onChange={(e) => set("border_w", Number(e.target.value))}
          className="w-full"
        />
      </Field>
      <Field label="對齊">
        <Seg
          value={p.align || "left"}
          onChange={(id) => set("align", id)}
          options={[
            { id: "left", label: "左" },
            { id: "center", label: "中" },
            { id: "right", label: "右" },
          ]}
        />
      </Field>
      <Field label={splitCard ? "整體圓角" : "圓角"}>
        <Seg
          value={String(p.radius || "0")}
          onChange={(id) => {
            if (splitCard && !p.card_radius) {
              set({ card_radius: p.radius || "0", radius: id });
            } else {
              set("radius", id);
            }
          }}
          options={RADIUS_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        />
      </Field>
      <Field label="寬度">
        <div className="grid grid-cols-3 gap-1">
          {WIDTH_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => set("width", o.id)}
              className={`py-1.5 text-[11px] font-black rounded ${
                (p.width || "full") === o.id
                  ? "bg-white text-slate-900"
                  : "bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Field>
      {p.width === "custom" ? (
        <Field label={`自訂寬度 ${p.width_px || 480}px`}>
          <input
            type="range"
            min="160"
            max="1200"
            value={p.width_px || 480}
            onChange={(e) => set("width_px", Number(e.target.value))}
            className="w-full"
          />
        </Field>
      ) : null}
      {showMinH ? (
        <>
          <Field label="高度">
            <div className="grid grid-cols-3 gap-1">
              {HEIGHT_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => set("height_mode", o.id)}
                  className={`py-1.5 text-[11px] font-black rounded ${
                    (p.height_mode || "auto") === o.id
                      ? "bg-white text-slate-900"
                      : "bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Field>
          {p.height_mode === "custom" ? (
            <Field label={`自訂高度 ${p.min_h || 240}px`}>
              <input
                type="range"
                min="80"
                max="800"
                value={p.min_h || 240}
                onChange={(e) => set("min_h", Number(e.target.value))}
                className="w-full"
              />
            </Field>
          ) : null}
        </>
      ) : null}
      {showGap ? (
        <Field label="子元件間距">
          <Seg
            value={p.gap || "md"}
            onChange={(id) => set("gap", id)}
            options={GAP_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
          />
        </Field>
      ) : null}
      <Field label="內距">
        <Seg
          value={p.pad || "none"}
          onChange={(id) => set("pad", id)}
          options={[
            { id: "none", label: "無" },
            { id: "sm", label: "小" },
            { id: "md", label: "中" },
            { id: "lg", label: "大" },
          ]}
        />
      </Field>
      <Field label="陰影">
        <Seg
          value={p.shadow || "none"}
          onChange={(id) => set("shadow", id)}
          options={[
            { id: "none", label: "無" },
            { id: "sm", label: "輕" },
            { id: "md", label: "重" },
          ]}
        />
      </Field>

      {splitCard ? (
        <div className="mt-4 pt-3 border-t border-white/10">
          <p className="text-[10px] font-black tracking-widest text-white/35 mb-2">
            外觀 · 卡片
          </p>
          <ColorAccordion
            items={[
              {
                id: "card_bg",
                label: "卡片底色",
                value: p.card_bg || "",
                onChange: (v) => set("card_bg", v),
              },
              {
                id: "card_border",
                label: "卡片邊框",
                value: p.card_border || "",
                onChange: (v) => set("card_border", v),
              },
            ]}
          />
          <Field label={`卡片邊框 ${p.card_border_w || 0}px`}>
            <input
              type="range"
              min="0"
              max="6"
              value={p.card_border_w || 0}
              onChange={(e) => set("card_border_w", Number(e.target.value))}
              className="w-full"
            />
          </Field>
          <Field label="卡片圓角">
            <Seg
              value={String(p.card_radius || p.radius || "0")}
              onChange={(id) => set("card_radius", id)}
              options={RADIUS_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
            />
          </Field>
          <Field label="卡片陰影">
            <Seg
              value={p.card_shadow || "none"}
              onChange={(id) => set("card_shadow", id)}
              options={[
                { id: "none", label: "無" },
                { id: "sm", label: "輕" },
                { id: "md", label: "重" },
              ]}
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}

const SKIP_DESIGN = new Set(["spacer", "html", "columns", "grid"]);

function GapField({ value, onChange }) {
  return (
    <Field label="間距">
      <Seg
        value={value || "md"}
        onChange={onChange}
        options={[
          { id: "none", label: "無" },
          { id: "sm", label: "小" },
          { id: "md", label: "中" },
          { id: "lg", label: "大" },
        ]}
      />
    </Field>
  );
}

function SettingsCore({ block, onChangeProps, onChangeColumnsCount, onChangeLayout }) {
  const p = block.props || {};
  const set = (key, value) => onChangeProps({ ...p, [key]: value });
  const { store } = useBlogBuilderMedia();
  const resizeLayout = (partial) => {
    if (onChangeLayout) onChangeLayout(partial);
    else if (partial.count && onChangeColumnsCount) onChangeColumnsCount(partial.count);
    else onChangeProps({ ...p, ...partial });
  };

  switch (block.type) {
    case "heading":
      return (
        <>
          <textarea
            className={`${inputCls} min-h-[72px] text-lg font-black leading-snug`}
            value={p.text || ""}
            onChange={(e) => set("text", e.target.value)}
          />
          <Field label="層級">
            <Seg
              value={p.tag || "h2"}
              onChange={(id) => set("tag", id)}
              options={[
                { id: "h1", label: "H1" },
                { id: "h2", label: "H2" },
                { id: "h3", label: "H3" },
                { id: "h4", label: "H4" },
              ]}
            />
          </Field>
          <Field label="對齊">
            <Seg
              value={p.align || "left"}
              onChange={(id) => set("align", id)}
              options={[
                { id: "left", label: "左" },
                { id: "center", label: "中" },
                { id: "right", label: "右" },
              ]}
            />
          </Field>
        </>
      );
    case "text":
      return (
        <textarea
          className={`${inputCls} min-h-[220px] text-[13px] leading-relaxed`}
          value={p.html || ""}
          onChange={(e) => set("html", e.target.value)}
          placeholder="撰寫段落，可貼簡易 HTML"
        />
      );
    case "image":
      return (
        <>
          <MediaUploadField
            kind="image"
            value={p.src}
            onUploaded={(url) => set("src", url)}
          />
          <Field label="或貼圖片網址">
            <input className={inputCls} value={p.src || ""} onChange={(e) => set("src", e.target.value)} placeholder="https://" />
          </Field>
          <Field label="替代文字">
            <input className={inputCls} value={p.alt || ""} onChange={(e) => set("alt", e.target.value)} />
          </Field>
          <Field label="圖說">
            <input className={inputCls} value={p.caption || ""} onChange={(e) => set("caption", e.target.value)} />
          </Field>
        </>
      );
    case "video":
      return (
        <>
          <MediaUploadField
            kind="video"
            value={p.fileUrl}
            onUploaded={(url) => set("fileUrl", url)}
          />
          {p.fileUrl ? (
            <p className="text-[10px] text-emerald-300 mb-2 truncate">已上傳本機影片</p>
          ) : null}
          <Field label="或 YouTube / Vimeo 網址">
            <input className={inputCls} value={p.url || ""} onChange={(e) => set("url", e.target.value)} placeholder="https://youtu.be/…" />
          </Field>
        </>
      );
    case "button":
      return (
        <>
          <div className="mb-3 flex justify-center py-3 rounded-lg bg-white">
            <span
              className="px-5 py-2 text-sm font-bold"
              style={designControlStyle(p, { outline: p.style === "outline" })}
            >
              {p.label || "按鈕"}
            </span>
          </div>
          <Field label="按鈕文字">
            <input className={inputCls} value={p.label || ""} onChange={(e) => set("label", e.target.value)} />
          </Field>
          <Field label="連結">
            <input className={inputCls} value={p.href || ""} onChange={(e) => set("href", e.target.value)} placeholder="/ 或 https://" />
          </Field>
          <Field label="樣式">
            <Seg
              value={p.style || "solid"}
              onChange={(id) => set("style", id)}
              options={[
                { id: "solid", label: "填滿" },
                { id: "outline", label: "外框" },
              ]}
            />
          </Field>
        </>
      );
    case "spacer":
      return (
        <>
          <div className="rounded-lg bg-white/5 border border-dashed border-white/20 py-2 mb-2">
            <div className="mx-auto bg-[#94a3b8]/40" style={{ height: p.height || 32, width: "70%" }} />
          </div>
          <p className="text-center text-xs font-black mb-1">{p.height || 32}px</p>
          <input
            type="range"
            min="8"
            max="160"
            value={p.height || 32}
            onChange={(e) => set("height", Number(e.target.value))}
            className="w-full"
          />
        </>
      );
    case "html":
      return (
        <textarea
          className={`${inputCls} min-h-[220px] font-mono text-[11px] leading-relaxed text-emerald-200`}
          value={p.html || ""}
          onChange={(e) => set("html", e.target.value)}
          placeholder="<div>…</div>"
        />
      );
    case "columns":
      return (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => resizeLayout({ count: n })}
                className={`rounded-lg p-3 border ${
                  Number(p.count || 2) === n
                    ? "border-white bg-white/10"
                    : "border-white/15 hover:border-white/40"
                }`}
              >
                <div className={`grid gap-1 ${n === 3 ? "grid-cols-3" : "grid-cols-2"} h-10`}>
                  {Array.from({ length: n }).map((_, i) => (
                    <div key={i} className="rounded bg-violet-400/70" />
                  ))}
                </div>
                <p className="mt-2 text-[11px] font-black">{n} 欄</p>
              </button>
            ))}
          </div>
          <GapField value={p.gap} onChange={(id) => set("gap", id)} />
        </>
      );
    case "grid":
      return (
        <>
          <Field label="結構">
            <div className="grid grid-cols-3 gap-1">
              {[
                { rows: 1, cols: 2, label: "1×2" },
                { rows: 1, cols: 3, label: "1×3" },
                { rows: 2, cols: 2, label: "2×2" },
                { rows: 2, cols: 3, label: "2×3" },
                { rows: 3, cols: 3, label: "3×3" },
                { rows: 4, cols: 1, label: "4×1" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => resizeLayout({ rows: o.rows, cols: o.cols })}
                  className={`py-1.5 text-[11px] font-black rounded ${
                    Number(p.rows) === o.rows && Number(p.cols) === o.cols
                      ? "bg-white text-slate-900"
                      : "bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Field>
          <GapField value={p.gap} onChange={(id) => set("gap", id)} />
          <p className="text-[10px] text-white/40 mb-2">
            把圖片、文字拖進格子。滿版會填滿該格。
          </p>
        </>
      );
    case "table":
      return (
        <>
          <Field label={`列 ${p.rows || 3}`}>
            <input
              type="range"
              min="1"
              max="12"
              value={p.rows || 3}
              onChange={(e) => {
                const rows = Number(e.target.value);
                const cols = Number(p.cols) || 3;
                const src = Array.isArray(p.cells) ? p.cells : [];
                const cells = Array.from({ length: rows }, (_, r) =>
                  Array.from({ length: cols }, (_, c) => src[r]?.[c] || ""),
                );
                onChangeProps({ ...p, rows, cells });
              }}
              className="w-full"
            />
          </Field>
          <Field label={`欄 ${p.cols || 3}`}>
            <input
              type="range"
              min="1"
              max="6"
              value={p.cols || 3}
              onChange={(e) => {
                const cols = Number(e.target.value);
                const rows = Number(p.rows) || 3;
                const src = Array.isArray(p.cells) ? p.cells : [];
                const cells = Array.from({ length: rows }, (_, r) =>
                  Array.from({ length: cols }, (_, c) => src[r]?.[c] || ""),
                );
                onChangeProps({ ...p, cols, cells });
              }}
              className="w-full"
            />
          </Field>
          <label className="flex items-center gap-2 text-[12px] mb-3">
            <input
              type="checkbox"
              checked={p.header !== false}
              onChange={(e) => set("header", e.target.checked)}
            />
            第一列當表頭
          </label>
        </>
      );
    case "gallery": {
      const urls = String(p.urls || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      return (
        <>
          <MediaUploadField
            kind="image"
            multiple
            onUploaded={(url) => set("urls", [...urls, url].join("\n"))}
          />
          {urls.length ? (
            <div className="grid grid-cols-3 gap-1 mb-3">
              {urls.slice(0, 6).map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="" className="h-14 w-full object-cover rounded" />
              ))}
            </div>
          ) : null}
          <textarea
            className={`${inputCls} min-h-[80px] font-mono text-xs`}
            value={p.urls || ""}
            onChange={(e) => set("urls", e.target.value)}
            placeholder="也可每行貼一個網址"
          />
        </>
      );
    }
    case "photo-wall": {
      const urls = String(p.urls || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      return (
        <>
          <Field label="拼貼樣式">
            <Seg
              value={p.layout === "square" ? "square" : "mosaic"}
              onChange={(id) => set("layout", id)}
              options={[
                { id: "mosaic", label: "比例" },
                { id: "square", label: "正方形" },
              ]}
            />
          </Field>
          <Field label="拼貼寬度">
            <Seg
              value={p.wide ? "wide" : "normal"}
              onChange={(id) => set("wide", id === "wide")}
              options={[
                { id: "normal", label: "一般" },
                { id: "wide", label: "寬版" },
              ]}
            />
          </Field>
          <Field label={p.layout === "square" ? "格子大小" : "顯示大小"}>
            <Seg
              value={p.size || "md"}
              onChange={(id) => set("size", id)}
              options={[
                { id: "sm", label: "小" },
                { id: "md", label: "中" },
                { id: "lg", label: "大" },
                { id: "full", label: "更大" },
              ]}
            />
          </Field>
          <Field label="區塊寬度">
            <Seg
              value={p.width || "full"}
              onChange={(id) => set("width", id)}
              options={[
                { id: "full", label: "閱讀寬" },
                { id: "75", label: "75%" },
                { id: "50", label: "50%" },
                { id: "custom", label: "自訂" },
              ]}
            />
          </Field>
          {p.width === "custom" ? (
            <Field label={`自訂寬度 ${p.width_px || 720}px`}>
              <input
                type="range"
                min="160"
                max="1200"
                value={p.width_px || 720}
                onChange={(e) => set("width_px", Number(e.target.value))}
                className="w-full"
              />
            </Field>
          ) : null}
          <Field label="對齊">
            <Seg
              value={p.align || "left"}
              onChange={(id) => set("align", id)}
              options={[
                { id: "left", label: "靠左" },
                { id: "center", label: "置中" },
                { id: "right", label: "靠右" },
              ]}
            />
          </Field>
          <p className="text-[10px] text-white/40 mb-2">
            {p.layout === "square"
              ? "外層對齊、內層定寬，格子切成正方形。最多 24 張。"
              : "盡量維持原圖比例，同一列撐滿對齊，不夠齊再微裁。最多 24 張。"}
          </p>
          <MediaUploadField
            kind="image"
            multiple
            onUploaded={(url) => set("urls", [...urls, url].slice(0, 24).join("\n"))}
          />
          {urls.length ? (
            <div className="grid grid-cols-4 gap-1 mb-3">
              {urls.slice(0, 8).map((u, i) => (
                <div key={`${u}-${i}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-12 w-full object-cover rounded" />
                  <button
                    type="button"
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded bg-black/60 text-white text-[10px] leading-none"
                    onClick={() =>
                      set("urls", urls.filter((_, j) => j !== i).join("\n"))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <textarea
            className={`${inputCls} min-h-[80px] font-mono text-xs`}
            value={p.urls || ""}
            onChange={(e) => set("urls", e.target.value)}
            placeholder="也可每行貼一個網址"
          />
        </>
      );
    }
    case "icon-box":
      return (
        <>
          <div className="flex items-center gap-3 mb-3 rounded-lg bg-amber-500/15 p-3">
            <MaterialIcon name={p.icon || "travel_explore"} size={28} />
            <div className="min-w-0">
              <p className="text-sm font-black truncate">{p.title || "標題"}</p>
              <p className="text-[11px] text-white/60 truncate">{p.text}</p>
            </div>
          </div>
          <Field label="Material 圖示名稱">
            <input className={inputCls} value={p.icon || ""} onChange={(e) => set("icon", e.target.value)} />
          </Field>
          <Field label="標題">
            <input className={inputCls} value={p.title || ""} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="說明">
            <textarea className={`${inputCls} min-h-[80px]`} value={p.text || ""} onChange={(e) => set("text", e.target.value)} />
          </Field>
        </>
      );
    case "icon-list": {
      const lines = String(p.items || "").split("\n");
      return (
        <div className="space-y-1.5">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-emerald-400 shrink-0">✓</span>
              <input
                className={inputCls}
                value={line}
                onChange={(e) => {
                  const next = [...lines];
                  next[i] = e.target.value;
                  set("items", next.join("\n"));
                }}
              />
              <button
                type="button"
                className="text-white/30 hover:text-red-300"
                onClick={() => set("items", lines.filter((_, j) => j !== i).join("\n"))}
              >
                <MaterialIcon name="close" size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="w-full py-1.5 text-[11px] font-bold rounded border border-dashed border-white/20 text-white/70"
            onClick={() => set("items", `${p.items || ""}\n新項目`.replace(/^\n/, ""))}
          >
            + 新增一列
          </button>
        </div>
      );
    }
    case "accordion":
    case "tabs":
      return <ItemStackEditor items={p.items} onChange={(items) => set("items", items)} />;
    case "alert": {
      const toneBg =
        p.tone === "warning"
          ? "bg-amber-500/20 text-amber-100"
          : p.tone === "success"
            ? "bg-emerald-500/20 text-emerald-100"
            : "bg-sky-500/20 text-sky-100";
      return (
        <>
          <div className={`rounded-lg px-3 py-2 mb-3 text-xs ${toneBg}`}>{p.text || "提示文字"}</div>
          <Field label="類型">
            <Seg
              value={p.tone || "info"}
              onChange={(id) => set("tone", id)}
              options={[
                { id: "info", label: "資訊" },
                { id: "warning", label: "警告" },
                { id: "success", label: "成功" },
              ]}
            />
          </Field>
          <textarea className={`${inputCls} min-h-[80px]`} value={p.text || ""} onChange={(e) => set("text", e.target.value)} />
        </>
      );
    }
    case "quote":
      return (
        <>
          <div className="rounded-lg border-l-4 border-stone-400 bg-white/5 px-3 py-2 mb-3 italic text-sm text-white/80">
            {p.text || "引言"}
          </div>
          <textarea className={`${inputCls} min-h-[90px]`} value={p.text || ""} onChange={(e) => set("text", e.target.value)} />
          <Field label="出處">
            <input className={inputCls} value={p.cite || ""} onChange={(e) => set("cite", e.target.value)} />
          </Field>
        </>
      );
    case "testimonial":
      return (
        <>
          <div className="rounded-2xl bg-pink-500/15 p-3 mb-3">
            <p className="text-sm italic">「{p.text || "推薦語"}」</p>
            <p className="text-[11px] mt-2 font-bold text-pink-200">
              {p.name || "旅客"} · {p.role || ""}
            </p>
          </div>
          <textarea className={`${inputCls} min-h-[80px]`} value={p.text || ""} onChange={(e) => set("text", e.target.value)} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Field label="姓名">
              <input className={inputCls} value={p.name || ""} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="身分">
              <input className={inputCls} value={p.role || ""} onChange={(e) => set("role", e.target.value)} />
            </Field>
          </div>
        </>
      );
    case "cta":
      return (
        <>
          <div className="rounded-xl bg-[#93003c] p-4 mb-3 text-center">
            <p className="font-black">{p.title || "標題"}</p>
            <p className="text-[11px] text-white/80 mt-1">{p.text}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-white text-[#93003c] text-[11px] font-black">
              {p.button || "按鈕"}
            </span>
          </div>
          <Field label="標題">
            <input className={inputCls} value={p.title || ""} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="說明">
            <textarea className={`${inputCls} min-h-[70px]`} value={p.text || ""} onChange={(e) => set("text", e.target.value)} />
          </Field>
          <Field label="按鈕">
            <input className={inputCls} value={p.button || ""} onChange={(e) => set("button", e.target.value)} />
          </Field>
          <Field label="連結">
            <input className={inputCls} value={p.href || ""} onChange={(e) => set("href", e.target.value)} />
          </Field>
        </>
      );
    case "counter":
      return (
        <>
          <p className="text-center mb-3">
            <span className="text-4xl font-black text-teal-300">{p.value || "0"}</span>
            <span className="text-lg text-white/50">{p.suffix}</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="數字">
              <input className={inputCls} value={p.value || ""} onChange={(e) => set("value", e.target.value)} />
            </Field>
            <Field label="後綴">
              <input className={inputCls} value={p.suffix || ""} onChange={(e) => set("suffix", e.target.value)} />
            </Field>
          </div>
          <Field label="標籤">
            <input className={inputCls} value={p.label || ""} onChange={(e) => set("label", e.target.value)} />
          </Field>
        </>
      );
    case "progress":
      return (
        <>
          <div className="mb-3">
            <div className="flex justify-between text-[11px] mb-1">
              <span>{p.label}</span>
              <span>{p.percent || 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-lime-400" style={{ width: `${p.percent || 0}%` }} />
            </div>
          </div>
          <Field label="標籤">
            <input className={inputCls} value={p.label || ""} onChange={(e) => set("label", e.target.value)} />
          </Field>
          <input
            type="range"
            min="0"
            max="100"
            value={p.percent || 0}
            onChange={(e) => set("percent", Number(e.target.value))}
            className="w-full"
          />
        </>
      );
    case "rating":
      return (
        <>
          <div className="flex justify-center gap-1 mb-3 text-yellow-400">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => set("value", n)}>
                <MaterialIcon name={n <= (p.value || 5) ? "star" : "star_border"} size={28} />
              </button>
            ))}
          </div>
          <Field label="標籤">
            <input className={inputCls} value={p.label || ""} onChange={(e) => set("label", e.target.value)} />
          </Field>
        </>
      );
    case "social": {
      return (
        <>
          <Field label="版型">
            <Seg
              value={p.style || "icons"}
              onChange={(id) => set("style", id)}
              options={[
                { id: "icons", label: "圖示" },
                { id: "cards", label: "卡片" },
                { id: "banner", label: "橫幅" },
              ]}
            />
          </Field>
          <Field label="標題">
            <input className={inputCls} value={p.title || ""} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="說明">
            <input className={inputCls} value={p.text || ""} onChange={(e) => set("text", e.target.value)} />
          </Field>
          <button
            type="button"
            className="w-full mb-3 py-1.5 text-[11px] font-bold rounded bg-white/10"
            onClick={() =>
              onChangeProps({
                ...p,
                instagram: store?.social_instagram || p.instagram,
                facebook: store?.social_facebook || p.facebook,
                line: store?.social_line || p.line,
              })
            }
          >
            帶入商店社群連結
          </button>
          <Field label="Instagram">
            <input className={inputCls} value={p.instagram || ""} onChange={(e) => set("instagram", e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Facebook">
            <input className={inputCls} value={p.facebook || ""} onChange={(e) => set("facebook", e.target.value)} />
          </Field>
          <Field label="LINE">
            <input className={inputCls} value={p.line || ""} onChange={(e) => set("line", e.target.value)} />
          </Field>
        </>
      );
    }
    case "share": {
      const order = parseShareItems(p.items);
      const move = (id, dir) => {
        const i = order.indexOf(id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= order.length) return;
        const next = [...order];
        [next[i], next[j]] = [next[j], next[i]];
        set("items", next.join(","));
      };
      const toggle = (id, on) => {
        if (on) {
          set("items", [...order.filter((x) => x !== id), id].join(","));
        } else {
          const next = order.filter((x) => x !== id);
          set("items", (next.length ? next : ["copy"]).join(","));
        }
      };
      return (
        <>
          <Field label="左側文字">
            <input
              className={inputCls}
              value={p.label ?? "分享"}
              onChange={(e) => set("label", e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-[12px] text-white/80 mb-3">
            <input
              type="checkbox"
              checked={p.show_label !== false}
              onChange={(e) => set("show_label", e.target.checked)}
            />
            顯示「分享」標籤
          </label>
          <Field label="圖示樣式">
            <Seg
              value={p.look || "brand"}
              onChange={(id) => set("look", id)}
              options={[
                { id: "brand", label: "品牌色" },
                { id: "outline", label: "線框" },
              ]}
            />
          </Field>
          <Field label="形狀">
            <Seg
              value={p.shape || "circle"}
              onChange={(id) => set("shape", id)}
              options={[
                { id: "circle", label: "圓形" },
                { id: "rounded", label: "圓角方" },
              ]}
            />
          </Field>
          <Field label="大小">
            <Seg
              value={p.size || "md"}
              onChange={(id) => set("size", id)}
              options={[
                { id: "sm", label: "小" },
                { id: "md", label: "中" },
              ]}
            />
          </Field>
          <Field label="按鈕（顯示／排序）">
            <div className="space-y-1.5">
              {[
                ...order
                  .map((id) => SHARE_BUTTON_CATALOG.find((x) => x.id === id))
                  .filter(Boolean),
                ...SHARE_BUTTON_CATALOG.filter((x) => !order.includes(x.id)),
              ].map((item) => {
                const on = order.includes(item.id);
                const idx = order.indexOf(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => toggle(item.id, e.target.checked)}
                    />
                    <span className="flex-1 text-[12px] text-white">{item.label}</span>
                    {on ? (
                      <span className="flex gap-0.5">
                        <button
                          type="button"
                          className="px-1.5 text-[11px] text-white/50 hover:text-white disabled:opacity-30"
                          onClick={() => move(item.id, -1)}
                          disabled={idx <= 0}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="px-1.5 text-[11px] text-white/50 hover:text-white disabled:opacity-30"
                          onClick={() => move(item.id, 1)}
                          disabled={idx === order.length - 1}
                        >
                          ↓
                        </button>
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Field>
          <p className="text-[10px] text-white/40 mb-2">
            對齊請用下方「外觀」的左／中／右。文章網址會自動用目前頁面。
          </p>
        </>
      );
    }
    case "social-post": {
      const lines = String(p.urls || "").split("\n");
      return (
        <>
          <Field label="版型">
            <Seg
              value={p.layout || "carousel"}
              onChange={(id) => set("layout", id)}
              options={[
                { id: "auto", label: "自動排版" },
                { id: "carousel", label: "輪播" },
                { id: "stack", label: "直列" },
              ]}
            />
          </Field>
          {p.layout !== "stack" ? (
            <>
              <Field
                label={
                  p.layout === "carousel"
                    ? `一次最多 ${Math.min(4, p.visible || 4)} 則`
                    : `一列最多 ${Math.min(4, p.visible || 4)} 則`
                }
              >
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set("visible", n)}
                      className={`py-1.5 text-[11px] font-black rounded ${
                        Number(p.visible || 4) === n
                          ? "bg-white text-slate-900"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </Field>
              <label className="flex items-center gap-2 text-[12px] mb-2">
                <input
                  type="checkbox"
                  checked={p.autoplay !== false}
                  onChange={(e) => set("autoplay", e.target.checked)}
                />
                自動輪播（{p.interval || 4} 秒）・前台可拖曳
              </label>
              <input
                type="range"
                min="2"
                max="12"
                value={p.interval || 4}
                onChange={(e) => set("interval", Number(e.target.value))}
                className="w-full mb-3"
              />
            </>
          ) : null}
          <p className="text-[11px] text-white/50 mb-2 leading-relaxed">
            每行一個貼文網址，最多 12 則。畫面一次最多顯示 4 則，前台可拖曳與自動輪播。
          </p>
          <Field label="貼文網址">
            <textarea
              className={`${inputCls} min-h-[110px] font-mono text-[12px]`}
              value={p.urls || ""}
              placeholder={"https://www.instagram.com/p/xxxxx/\nhttps://www.facebook.com/.../posts/..."}
              onChange={(e) => set("urls", e.target.value)}
            />
          </Field>
          <div className="space-y-1">
            {lines
              .map((s) => s.trim())
              .filter(Boolean)
              .map((line) => {
                const hit = parseSocialPostUrl(line);
                return (
                  <p
                    key={line}
                    className={`text-[11px] font-bold ${
                      hit ? "text-emerald-300" : "text-amber-300"
                    }`}
                  >
                    {hit ? `已辨識 ${hit.label}` : "無法辨識，請貼完整 IG／FB 貼文連結"}
                  </p>
                );
              })}
          </div>
        </>
      );
    }
    case "map":
      return (
        <>
          <div className="rounded-lg bg-emerald-900/40 h-24 mb-3 flex items-center justify-center text-emerald-200 text-xs font-bold">
            {p.query || "輸入地點"}
          </div>
          <Field label="地點關鍵字">
            <input className={inputCls} value={p.query || ""} onChange={(e) => set("query", e.target.value)} />
          </Field>
        </>
      );
    case "carousel": {
      const urls = String(p.urls || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      return (
        <>
          <Field label="同時顯示張數">
            <div className="grid grid-cols-6 gap-1">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("visible", n)}
                  className={`py-1.5 text-[11px] font-black rounded ${
                    Number(p.visible || 1) === n
                      ? "bg-white text-slate-900"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/40 mt-1">
              淡入／縮放固定 1 張；滑動與側露可用 1–6 張
            </p>
          </Field>
          <Field label={`高度 ${p.height || 320}px`}>
            <input
              type="range"
              min="160"
              max="640"
              value={p.height || 320}
              onChange={(e) => set("height", Number(e.target.value))}
              className="w-full"
            />
          </Field>
          <Field label="輪播效果">
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: "slide", label: "滑動" },
                { id: "fade", label: "淡入" },
                { id: "zoom", label: "縮放淡入" },
                { id: "peek", label: "絲滑側露" },
                { id: "cards", label: "層疊卡片" },
                { id: "marquee", label: "無限跑馬" },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => set("effect", o.id)}
                  className={`py-1.5 text-[11px] font-black rounded ${
                    (p.effect || "slide") === o.id
                      ? "bg-white text-slate-900"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-[12px] mb-3">
            <input
              type="checkbox"
              checked={p.autoplay !== false}
              onChange={(e) => set("autoplay", e.target.checked)}
            />
            自動播放（{p.interval || 4} 秒）
          </label>
          <input
            type="range"
            min="2"
            max="12"
            value={p.interval || 4}
            onChange={(e) => set("interval", Number(e.target.value))}
            className="w-full mb-3"
          />
          <MediaUploadField
            kind="image"
            multiple
            onUploaded={(url) => set("urls", [...urls, url].join("\n"))}
          />
          <textarea
            className={`${inputCls} min-h-[80px] font-mono text-xs`}
            value={p.urls || ""}
            onChange={(e) => set("urls", e.target.value)}
            placeholder="每行一個圖片網址"
          />
        </>
      );
    }
    case "products":
      return (
        <>
          <Field label="區塊標題">
            <input className={inputCls} value={p.title || ""} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="版型">
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "cards", label: "卡片" },
                { id: "grid", label: "宮格" },
                { id: "row", label: "直列" },
                { id: "pages", label: "分頁" },
                { id: "carousel", label: "輪播" },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => set("layout", o.id)}
                  className={`py-1.5 text-[11px] font-black rounded ${
                    (p.layout || "cards") === o.id
                      ? "bg-white text-slate-900"
                      : "bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Field>
          {p.layout === "pages" ? (
            <Field label={`每頁 ${p.per_page || 2} 件`}>
              <Seg
                value={String(p.per_page || 2)}
                onChange={(id) => set("per_page", Number(id))}
                options={[
                  { id: "1", label: "1" },
                  { id: "2", label: "2" },
                  { id: "3", label: "3" },
                  { id: "4", label: "4" },
                ]}
              />
            </Field>
          ) : null}
          {p.layout === "carousel" ? (
            <>
              <Field label={`一次顯示 ${p.visible || 2} 張`}>
                <div className="grid grid-cols-6 gap-1">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set("visible", n)}
                      className={`py-1.5 text-[11px] font-black rounded ${
                        Number(p.visible || 2) === n
                          ? "bg-white text-slate-900"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </Field>
              <label className="flex items-center gap-2 text-[12px] mb-2">
                <input
                  type="checkbox"
                  checked={p.autoplay !== false}
                  onChange={(e) => set("autoplay", e.target.checked)}
                />
                自動輪播（{p.interval || 4} 秒）
              </label>
              <input
                type="range"
                min="2"
                max="12"
                value={p.interval || 4}
                onChange={(e) => set("interval", Number(e.target.value))}
                className="w-full mb-3"
              />
            </>
          ) : null}
          <p className="text-[10px] text-white/40 mb-1">勾選賣場商品（最多 12）</p>
          <ProductPicker items={p.items || []} onChange={(items) => set("items", items)} />
        </>
      );
    case "divider":
      return (
        <>
          <div className="py-4 mb-2">
            <hr className={p.style === "dashed" ? "border-dashed border-white/40" : "border-white/40"} />
          </div>
          <Seg
            value={p.style || "solid"}
            onChange={(id) => set("style", id)}
            options={[
              { id: "solid", label: "實線" },
              { id: "dashed", label: "虛線" },
            ]}
          />
        </>
      );
    default:
      return <p className="text-xs text-white/50">此元件無需額外設定</p>;
  }
}

export function SettingsFields({
  block,
  onChangeProps,
  onChangeColumnsCount,
  onChangeLayout,
}) {
  const p = block.props || {};
  return (
    <>
      <SettingsCore
        block={block}
        onChangeProps={onChangeProps}
        onChangeColumnsCount={onChangeColumnsCount}
        onChangeLayout={onChangeLayout}
      />
      {!SKIP_DESIGN.has(block.type) ? (
        <DesignFields
          type={block.type}
          p={p}
          set={(key, value) =>
            onChangeProps(
              typeof key === "object" ? { ...p, ...key } : { ...p, [key]: value },
            )
          }
        />
      ) : null}
    </>
  );
}
