"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { zhTW } from "react-day-picker/locale";
import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={zhTW}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-4 w-full",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-semibold text-slate-800",
        nav: "flex items-center gap-1",
        button_previous:
          "absolute left-1 inline-flex size-8 sm:size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 touch-manipulation",
        button_next:
          "absolute right-1 inline-flex size-8 sm:size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 touch-manipulation",
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full",
        weekday:
          "flex-1 min-w-0 rounded-md text-[0.7rem] font-medium text-slate-500 text-center",
        week: "mt-1 flex w-full",
        day: "relative flex-1 min-w-0 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button:
          "inline-flex size-10 sm:size-9 w-full max-w-10 mx-auto items-center justify-center rounded-md font-normal text-slate-700 hover:bg-slate-100 aria-selected:opacity-100 touch-manipulation",
        range_start: "rounded-l-md bg-slate-900 text-white",
        range_end: "rounded-r-md bg-slate-900 text-white",
        selected:
          "bg-slate-900 text-white hover:bg-slate-900 hover:text-white focus:bg-slate-900 focus:text-white",
        today: "bg-slate-100 text-slate-900",
        outside: "text-slate-400 opacity-50",
        disabled: "text-slate-300 opacity-50",
        range_middle: "rounded-none bg-slate-100 text-slate-900",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
