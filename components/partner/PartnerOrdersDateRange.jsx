"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { CalendarIcon, ChevronDownIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import PartnerSelectMenu from "@/components/partner/PartnerSelectMenu";
import { partnerDropdownTriggerClass } from "@/components/partner/partnerDropdownStyles";
import {
  ORDER_DATE_PRESETS,
  detectOrderDatePreset,
  presetToDateRange,
} from "@/lib/partnerOrderFilters";

const PANEL_Z = 10100;

function formatRangeLabel(value) {
  if (!value?.from) return "選擇日期";
  if (value.to) {
    return `${format(value.from, "yyyy/MM/dd", { locale: zhTW })} – ${format(value.to, "yyyy/MM/dd", { locale: zhTW })}`;
  }
  return format(value.from, "yyyy/MM/dd", { locale: zhTW });
}

/**
 * 夥伴訂單分潤：期間預設 + 自訂日期區間（Portal 避免被 overflow 裁切）
 */
export default function PartnerOrdersDateRange({
  value,
  onChange,
  className = "",
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [monthCount, setMonthCount] = useState(2);
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [presetChoice, setPresetChoice] = useState(() =>
    detectOrderDatePreset(value),
  );
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const preset = presetChoice;

  useEffect(() => {
    const next = detectOrderDatePreset(value);
    setPresetChoice((cur) =>
      cur === "custom" && !value?.from ? "custom" : next,
    );
  }, [value]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setMonthCount(mq.matches ? 1 : 2);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const updatePanelPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelWidth = monthCount > 1 ? 560 : 320;
    const margin = 8;
    let left = rect.right - panelWidth;
    left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));
    const top = rect.bottom + margin;
    setPanelStyle({ top, left });
  }, [monthCount]);

  useLayoutEffect(() => {
    if (!calendarOpen) return undefined;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [calendarOpen, updatePanelPosition]);

  useEffect(() => {
    if (!calendarOpen) return undefined;
    const onPointerDown = (e) => {
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
  }, [calendarOpen]);

  const onPresetSelect = (id) => {
    setPresetChoice(id);
    if (id === "custom") {
      setPresetOpen(false);
      setCalendarOpen(true);
      return;
    }
    onChange(presetToDateRange(id));
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

  const presetOptions = ORDER_DATE_PRESETS.map((opt) => ({
    id: opt.id,
    label: opt.label,
  }));

  const calendarPanel =
    calendarOpen && mounted
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="選擇日期區間"
            className="fixed rounded-lg border border-slate-200 bg-white shadow-xl"
            style={{
              zIndex: PANEL_Z,
              top: panelStyle.top,
              left: panelStyle.left,
            }}
          >
            <Calendar
              mode="range"
              defaultMonth={value?.from}
              selected={value}
              onSelect={(next) => {
                onChange(next);
                setPresetChoice("custom");
                if (next?.from && next?.to) setCalendarOpen(false);
              }}
              numberOfMonths={monthCount}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <Field className={className}>
      <FieldLabel htmlFor="partner-orders-date-preset">期間</FieldLabel>
      <div ref={rootRef} className="flex flex-wrap items-center gap-1.5">
        <PartnerSelectMenu
          id="partner-orders-date-preset"
          value={preset}
          onChange={onPresetSelect}
          options={presetOptions}
          open={presetOpen}
          onOpenChange={onPresetOpenChange}
          className="min-w-[108px]"
        />

        <span ref={triggerRef} className="inline-flex">
          <button
            type="button"
            aria-expanded={calendarOpen}
            aria-haspopup="dialog"
            onClick={toggleCalendar}
            className={partnerDropdownTriggerClass({
              className:
                "min-w-[148px] justify-start gap-2 px-2.5 font-semibold",
            })}
          >
            <CalendarIcon className="size-4 shrink-0 text-slate-500" />
            <span className="truncate">{formatRangeLabel(value)}</span>
            <ChevronDownIcon className="size-4 shrink-0 opacity-60 ml-auto" />
          </button>
        </span>

        {value?.from ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              onChange(undefined);
              setPresetChoice("all");
              setCalendarOpen(false);
              setPresetOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600"
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
