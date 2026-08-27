/** 快速購買等直角 popup：藍／白／灰 */
const QUICK_BUY_BLUE = "#1E4AD1";
const DEFAULT_BLUE = "#0A6CD0";
const DEFAULT_WARN = "#b45309";

/**
 * @param {boolean} squareCorners
 * @param {"blue"|"warn"} headerTone
 */
export function reminderUi(squareCorners, headerTone = "blue") {
  const accent = squareCorners ? QUICK_BUY_BLUE : DEFAULT_BLUE;
  return {
    accent,
    shell: squareCorners
      ? "pointer-events-auto w-full max-w-md overflow-hidden rounded-none bg-white shadow-xl border border-slate-200"
      : "pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl",
    headerClass: squareCorners
      ? headerTone === "warn"
        ? "shrink-0 px-5 py-4 bg-slate-700"
        : "shrink-0 px-5 py-4 bg-[#1E4AD1]"
      : "shrink-0 px-5 py-4 md:px-6",
    headerStyle: squareCorners
      ? undefined
      : headerTone === "warn"
        ? { background: DEFAULT_WARN }
        : { background: DEFAULT_BLUE },
    infoPanel: squareCorners
      ? "rounded-none border border-slate-200 bg-slate-50 px-4 py-3.5"
      : headerTone === "warn"
        ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5"
        : "rounded-xl border border-[#0A6CD0]/20 bg-[#eef5fc] px-4 py-3.5",
    apnPanel: squareCorners
      ? "rounded-none border border-slate-200 bg-slate-50 px-3.5 py-3"
      : "rounded-xl border border-[#0A6CD0]/20 bg-[#eef5fc] px-3.5 py-3",
    apnPanelMuted: squareCorners
      ? "rounded-none border border-slate-300 bg-slate-100 px-3.5 py-3"
      : "rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-3",
    btnPrimary: squareCorners
      ? "w-full h-11 rounded-none text-sm font-bold text-white bg-[#1E4AD1] transition-opacity hover:opacity-90"
      : "w-full h-11 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90",
    btnPrimaryStyle: squareCorners ? undefined : { background: accent },
    btnSecondary: squareCorners
      ? "w-full h-11 rounded-none text-sm font-bold border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50"
      : "w-full h-11 rounded-xl text-sm font-bold border-2 transition-colors hover:bg-[#eef5fc]",
    btnSecondaryStyle: squareCorners
      ? undefined
      : { borderColor: accent, color: accent },
    coverageLink: squareCorners
      ? "block w-full overflow-hidden rounded-none border border-slate-200 text-left transition hover:border-[#1E4AD1]"
      : "block w-full overflow-hidden rounded-xl border border-gray-200 text-left transition hover:border-[#0A6CD0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A6CD0]",
  };
}
