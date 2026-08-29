"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { CalendarIcon, ChevronDownIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import PartnerSelectMenu from "@/components/partner/PartnerSelectMenu";
import PartnerButton from "@/components/partner/ui/PartnerButton";
import {
  partnerDropdownTriggerClass,
  PARTNER_PILL_RADIUS_STYLE,
} from "@/components/partner/partnerDropdownStyles";
import {
  ORDER_DATE_PRESETS,
  detectOrderDatePreset,
  presetToDateRange,
} from "@/lib/partnerOrderFilters";

const PANEL_Z = 10100;
const MOBILE_MQ = "(max-width: 639px)";

function formatRangeLabel(value) {
  if (!value?.from) return "選擇日期";
  if (value.to) {
    return `${format(value.from, "yyyy/MM/dd", { locale: zhTW })} – ${format(value.to, "yyyy/MM/dd", { locale: zhTW })}`;
  }
  return format(value.from, "yyyy/MM/dd", { locale: zhTW });
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

/**
 * 夥伴後台日期區間：桌面錨點彈層、手機底部抽屜（防破版／好點選）
 */
export default function PartnerOrdersDateRange({
  value,
  onChange,
  className = "",
  label = "期間",
}) {
  const isMobile = useIsMobile();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState(value);
  const [presetChoice, setPresetChoice] = useState(() =>
    detectOrderDatePreset(value),
  );
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const preset = presetChoice;
  const monthCount = isMobile ? 1 : 2;

  useEffect(() => {
    const next = detectOrderDatePreset(value);
    setPresetChoice((cur) =>
      cur === "custom" && !value?.from ? "custom" : next,
    );
  }, [value]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (calendarOpen) setDraft(value);
  }, [calendarOpen, value]);

  // 手機開啟時鎖捲動，避免背景滑動
  useEffect(() => {
    if (!calendarOpen || !isMobile) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [calendarOpen, isMobile]);

  const updatePanelPosition = useCallback(() => {
    if (isMobile) return;
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelWidth = monthCount > 1 ? 560 : 320;
    const margin = 8;
    const estHeight = 360;
    let left = rect.right - panelWidth;
    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - panelWidth - margin),
    );
    let top = rect.bottom + margin;
    if (top + estHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - estHeight - margin);
    }
    setPanelStyle({ top, left });
  }, [isMobile, monthCount]);

  useLayoutEffect(() => {
    if (!calendarOpen || isMobile) return undefined;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [calendarOpen, isMobile, updatePanelPosition]);

  useEffect(() => {
    if (!calendarOpen) return undefined;
    const onPointerDown = (e) => {
      if (isMobile) return; // 手機用 backdrop / 按鈕關閉
      const t = e.target;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setCalendarOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setCalendarOpen(false);
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
      document.addEventListener("keydown", onKeyDown);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [calendarOpen, isMobile]);

  const closeCalendar = () => setCalendarOpen(false);

  const applyDraftAndClose = () => {
    onChange(draft);
    setPresetChoice(draft?.from ? "custom" : "all");
    setCalendarOpen(false);
  };

  const onPresetSelect = (id) => {
    setPresetChoice(id);
    if (id === "custom") {
      setPresetOpen(false);
      setCalendarOpen(true);
      return;
    }
    onChange(presetToDateRange(id));
    setDraft(presetToDateRange(id));
    setCalendarOpen(false);
  };

  const onPresetOpenChange = (next) => {
    setPresetOpen(next);
    if (next) setCalendarOpen(false);
  };

  const toggleCalendar = () => {
    setPresetOpen(false);
    setCalendarOpen((v) => !v);
  };

  const clearRange = () => {
    onChange(undefined);
    setDraft(undefined);
    setPresetChoice("all");
    setCalendarOpen(false);
    setPresetOpen(false);
  };

  const onCalendarSelect = (next) => {
    if (isMobile) {
      setDraft(next);
      setPresetChoice("custom");
      return;
    }
    onChange(next);
    setPresetChoice("custom");
    if (next?.from && next?.to) setCalendarOpen(false);
  };

  const presetOptions = ORDER_DATE_PRESETS.map((opt) => ({
    id: opt.id,
    label: opt.label,
  }));

  const calendarInner = (
    <Calendar
      mode="range"
      defaultMonth={draft?.from || value?.from || new Date()}
      selected={isMobile ? draft : value}
      onSelect={onCalendarSelect}
      numberOfMonths={monthCount}
      className={isMobile ? "w-full max-w-full p-2 sm:p-3" : undefined}
    />
  );

  const calendarPanel =
    calendarOpen && mounted
      ? createPortal(
          isMobile ? (
            <div
              className="fixed inset-0 flex flex-col justify-end"
              style={{ zIndex: PANEL_Z }}
              role="presentation"
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="關閉日期選擇"
                onClick={closeCalendar}
              />
              <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="選擇日期區間"
                className="relative flex max-h-[min(88dvh,640px)] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl"
                style={{
                  paddingBottom: "max(12px, env(safe-area-inset-bottom))",
                }}
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">選擇期間</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {formatRangeLabel(draft)}
                      {draft?.from && !draft?.to ? "（請再選結束日）" : ""}
                    </p>
                  </div>
                  <PartnerButton
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={closeCalendar}
                    aria-label="關閉"
                    className="shrink-0 text-slate-500"
                  >
                    <X className="size-5" />
                  </PartnerButton>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
                  {calendarInner}
                </div>

                <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-white px-4 pt-3">
                  <PartnerButton
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setDraft(undefined);
                      onChange(undefined);
                      setPresetChoice("all");
                      setCalendarOpen(false);
                    }}
                  >
                    清除
                  </PartnerButton>
                  <PartnerButton
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={applyDraftAndClose}
                    disabled={draft?.from && !draft?.to}
                  >
                    完成
                  </PartnerButton>
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={panelRef}
              role="dialog"
              aria-label="選擇日期區間"
              className="fixed overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
              style={{
                zIndex: PANEL_Z,
                top: panelStyle.top,
                left: panelStyle.left,
                maxWidth: "calc(100vw - 16px)",
              }}
            >
              {calendarInner}
            </div>
          ),
          document.body,
        )
      : null;

  return (
    <Field className={`w-full min-w-0 sm:w-auto ${className}`}>
      {label ? (
        <FieldLabel htmlFor="partner-orders-date-preset">{label}</FieldLabel>
      ) : null}
      <div
        ref={rootRef}
        className="flex w-full min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center"
      >
        <div className="grid w-full grid-cols-1 gap-1.5 min-[380px]:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <PartnerSelectMenu
            id="partner-orders-date-preset"
            value={preset}
            onChange={onPresetSelect}
            options={presetOptions}
            open={presetOpen}
            onOpenChange={onPresetOpenChange}
            className="w-full min-w-0 sm:min-w-[108px] sm:w-auto"
          />

          <span ref={triggerRef} className="inline-flex min-w-0 w-full sm:w-auto">
            <button
              type="button"
              aria-expanded={calendarOpen}
              aria-haspopup="dialog"
              onClick={toggleCalendar}
              className={partnerDropdownTriggerClass({
                className:
                  "w-full min-w-0 justify-start gap-2 px-2.5 font-semibold sm:min-w-[148px]",
              })}
              style={PARTNER_PILL_RADIUS_STYLE}
            >
              <CalendarIcon className="size-4 shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1 truncate text-left">
                {formatRangeLabel(value)}
              </span>
              <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
            </button>
          </span>
        </div>

        {value?.from ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={clearRange}
            className="self-start text-slate-400 hover:text-slate-600 sm:self-auto"
            aria-label="清除日期篩選"
            title="清除日期篩選"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      {calendarPanel}
    </Field>
  );
}
