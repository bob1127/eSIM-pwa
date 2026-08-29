"use client";

import { useEffect, useState } from "react";

const FALLBACK = "#1E4AD1";
const numCls =
  "w-full min-w-0 bg-[#2b2c31] border border-white/10 rounded px-1 py-1 text-[11px] text-white text-center font-mono tabular-nums focus:outline-none focus:border-[#e2498e]";

function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function normalizeHex(raw) {
  let s = String(raw || "").trim();
  if (!s || s.toLowerCase() === "transparent") return "";
  if (s.startsWith("#")) s = s.slice(1);
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    s = s
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return `#${s.toUpperCase()}`;
}

function hexToRgb(hex) {
  const n = normalizeHex(hex);
  if (!n) return null;
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const h = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

function rgbToCmyk({ r, g, b }) {
  const R = clamp(r, 0, 255) / 255;
  const G = clamp(g, 0, 255) / 255;
  const B = clamp(b, 0, 255) / 255;
  const k = 1 - Math.max(R, G, B);
  if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - R - k) / (1 - k)) * 100),
    m: Math.round(((1 - G - k) / (1 - k)) * 100),
    y: Math.round(((1 - B - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

function cmykToRgb({ c, m, y, k }) {
  const C = clamp(c, 0, 100) / 100;
  const M = clamp(m, 0, 100) / 100;
  const Y = clamp(y, 0, 100) / 100;
  const K = clamp(k, 0, 100) / 100;
  return {
    r: Math.round(255 * (1 - C) * (1 - K)),
    g: Math.round(255 * (1 - M) * (1 - K)),
    b: Math.round(255 * (1 - Y) * (1 - K)),
  };
}

function colorState(value) {
  const rgb = hexToRgb(value);
  if (!rgb) {
    return {
      hex: "",
      rgb: { r: 30, g: 74, b: 209 },
      cmyk: rgbToCmyk({ r: 30, g: 74, b: 209 }),
      empty: true,
      transparent: String(value || "").toLowerCase() === "transparent",
    };
  }
  return {
    hex: rgbToHex(rgb),
    rgb,
    cmyk: rgbToCmyk(rgb),
    empty: false,
    transparent: false,
  };
}

export default function ColorPickerField({ value, onChange }) {
  const parsed = colorState(value);
  const pickerHex = parsed.empty ? FALLBACK : parsed.hex;
  const [hexDraft, setHexDraft] = useState(parsed.hex || "");
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    setHexDraft(parsed.hex || (parsed.transparent ? "transparent" : ""));
  }, [parsed.hex, parsed.transparent]);

  const applyHex = (hex) => onChange(hex);

  const commitHexDraft = (raw) => {
    const t = String(raw || "").trim();
    if (!t) {
      onChange("");
      return;
    }
    if (t.toLowerCase() === "transparent") {
      onChange("transparent");
      return;
    }
    const hex = normalizeHex(t);
    if (hex) applyHex(hex);
    else setHexDraft(parsed.hex || "");
  };

  const applyRgb = (next) => applyHex(rgbToHex({ ...parsed.rgb, ...next }));
  const applyCmyk = (next) =>
    applyHex(rgbToHex(cmykToRgb({ ...parsed.cmyk, ...next })));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label
          className="relative w-9 h-9 shrink-0 rounded-md overflow-hidden border border-white/20 cursor-pointer"
          title="點擊選色"
          style={{
            background:
              parsed.transparent || parsed.empty
                ? "repeating-conic-gradient(#888 0 25%, #222 0 50%) 50% / 10px 10px"
                : parsed.hex,
          }}
        >
          <input
            type="color"
            value={pickerHex}
            onChange={(e) => applyHex(normalizeHex(e.target.value) || FALLBACK)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
        <input
          value={hexDraft}
          onChange={(e) => {
            const raw = e.target.value;
            setHexDraft(raw);
            const hex = normalizeHex(raw);
            if (hex) applyHex(hex);
          }}
          onBlur={(e) => commitHexDraft(e.target.value)}
          placeholder="點左方色塊選色"
          spellCheck={false}
          autoCapitalize="none"
          className="flex-1 min-w-0 bg-[#2b2c31] border border-white/10 rounded px-2.5 py-1.5 text-[12px] text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-[#e2498e]"
        />
        {value ? (
          <button
            type="button"
            className="shrink-0 text-[10px] text-white/40 hover:text-white"
            onClick={() => onChange("")}
          >
            清除
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        className="text-[10px] font-bold text-white/40 hover:text-white/70"
      >
        {advanced ? "收合進階色碼" : "進階色碼（RGB／CMYK）"}
      </button>

      {advanced ? (
        <>
          <div>
            <p className="text-[9px] font-bold tracking-wider text-white/35 mb-1">
              RGB
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                ["R", "r"],
                ["G", "g"],
                ["B", "b"],
              ].map(([label, key]) => (
                <label key={key} className="block">
                  <span className="block text-center text-[9px] text-white/40 mb-0.5">
                    {label}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={parsed.rgb[key]}
                    onChange={(e) =>
                      applyRgb({ [key]: clamp(Number(e.target.value), 0, 255) })
                    }
                    className={numCls}
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-bold tracking-wider text-white/35 mb-1">
              CMYK %
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                ["C", "c"],
                ["M", "m"],
                ["Y", "y"],
                ["K", "k"],
              ].map(([label, key]) => (
                <label key={key} className="block">
                  <span className="block text-center text-[9px] text-white/40 mb-0.5">
                    {label}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={parsed.cmyk[key]}
                    onChange={(e) =>
                      applyCmyk({ [key]: clamp(Number(e.target.value), 0, 100) })
                    }
                    className={numCls}
                  />
                </label>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
