"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import MaterialIcon from "../MaterialIcon";
import {
  SPEED_SCENARIOS,
  resolveSpeedScenarioId,
  splitSpeedMentions,
  wrapSpeedMentionsInHtml,
  SPEED_BTN_CLASS,
} from "../../lib/speedScenarioInfo";

const SpeedScenarioContext = createContext({
  openSpeed: (_id) => {},
});

/** 蓋過 Navbar(1000)、商品底欄、聊天浮層入口 */
const Z_BACKDROP = "z-[12000]";
const Z_DIALOG = "z-[12010]";

export function useSpeedScenario() {
  return useContext(SpeedScenarioContext);
}

function ScenarioList({ title, items, tone }) {
  if (!items?.length) return null;
  const icon =
    tone === "good" ? "check_circle" : tone === "ok" ? "remove" : "block";
  const iconClass =
    tone === "good"
      ? "text-slate-800"
      : tone === "ok"
        ? "text-slate-500"
        : "text-slate-400";
  return (
    <section className="py-3.5 first:pt-0 last:pb-0">
      <div className="mb-2.5 flex items-center gap-2">
        <MaterialIcon name={icon} size={18} className={iconClass} />
        <h5 className="text-[13px] font-bold tracking-wide text-slate-800">
          {title}
        </h5>
      </div>
      <ul className="space-y-2 pl-7 text-[13.5px] leading-relaxed text-slate-600">
        {items.map((line) => (
          <li key={line} className="relative">
            <span
              className="absolute -left-4 top-[0.55em] h-1 w-1 rounded-full bg-slate-300"
              aria-hidden
            />
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SpeedScenarioModal({ speedId, onClose }) {
  const info = speedId ? SPEED_SCENARIOS[speedId] : null;

  useEffect(() => {
    if (!info) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [info, onClose]);

  return (
    <AnimatePresence>
      {info ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`fixed inset-0 ${Z_BACKDROP} bg-black/50`}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="speed-scenario-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={`fixed inset-0 ${Z_DIALOG} flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none`}
          >
            <div className="pointer-events-auto flex w-full sm:max-w-md max-h-[88vh] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
              <div className="shrink-0 border-b border-slate-100 px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">
                      速度使用場景
                    </p>
                    <h3
                      id="speed-scenario-title"
                      className="mt-1 text-xl font-bold tracking-tight text-slate-900"
                    >
                      {info.label}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{info.headline}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label="關閉"
                  >
                    <MaterialIcon name="close" size={20} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <p className="mb-1 text-sm leading-relaxed text-slate-600">
                  {info.summary}
                </p>

                <div className="mt-4 divide-y divide-slate-100">
                  <ScenarioList title="適合" items={info.good} tone="good" />
                  <ScenarioList title="勉強可以" items={info.ok} tone="ok" />
                  <ScenarioList
                    title="不太建議"
                    items={info.limited}
                    tone="limited"
                  />
                </div>

                <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-400">
                  {info.note}
                </p>
              </div>

              <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.99]"
                >
                  知道了
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function SpeedScenarioProvider({ children }) {
  const [speedId, setSpeedId] = useState(null);
  const openSpeed = useCallback((id) => {
    const resolved =
      typeof id === "string" && SPEED_SCENARIOS[id]
        ? id
        : resolveSpeedScenarioId(id);
    if (resolved && SPEED_SCENARIOS[resolved]) setSpeedId(resolved);
  }, []);
  const value = useMemo(() => ({ openSpeed }), [openSpeed]);

  return (
    <SpeedScenarioContext.Provider value={value}>
      {children}
      <SpeedScenarioModal
        speedId={speedId}
        onClose={() => setSpeedId(null)}
      />
    </SpeedScenarioContext.Provider>
  );
}

/** 點擊可開 popup 的速率標籤（徽章／按鈕旁） */
export function SpeedInfoChip({
  label,
  speedId: speedIdProp,
  className = "",
  children,
}) {
  const { openSpeed } = useSpeedScenario();
  const id = speedIdProp || resolveSpeedScenarioId(label || children);
  if (!id) {
    return <span className={className}>{children ?? label}</span>;
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openSpeed(id);
      }}
      className={`inline-flex items-center gap-0.5 ${className}`}
      aria-label={`查看 ${label || children} 使用場景`}
    >
      <span>{children ?? label}</span>
      <MaterialIcon name="help" size={14} className="opacity-70" />
    </button>
  );
}

/** 純文字中的速率自動變成可點擊 */
export function SpeedAwareText({ text, className = "" }) {
  const { openSpeed } = useSpeedScenario();
  const parts = useMemo(() => splitSpeedMentions(text), [text]);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.id ? (
          <button
            key={`${part.id}-${i}`}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openSpeed(part.id);
            }}
            className={`${SPEED_BTN_CLASS} text-inherit`}
          >
            {part.text}
          </button>
        ) : (
          <React.Fragment key={i}>{part.text}</React.Fragment>
        ),
      )}
    </span>
  );
}

/**
 * 給 dangerouslySetInnerHTML 容器用：把速率包成 button，並用事件委派開 popup
 */
export function useSpeedHtml(html) {
  return useMemo(() => wrapSpeedMentionsInHtml(html || ""), [html]);
}

export function handleSpeedHtmlClick(e, openSpeed) {
  const el = e.target?.closest?.("[data-speed-id]");
  if (!el) return;
  e.preventDefault();
  e.stopPropagation();
  openSpeed(el.getAttribute("data-speed-id"));
}

export { wrapSpeedMentionsInHtml, resolveSpeedScenarioId };
