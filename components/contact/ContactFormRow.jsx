/** 幻冬舎風 — 左標籤 / 右輸入列 */
import { Children, cloneElement, isValidElement, useId } from "react";

export default function ContactFormRow({
  label,
  required,
  optional,
  hint,
  children,
  className = "",
}) {
  const autoId = useId();
  const enhanced = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const t = child.type;
    if (t !== "select" && t !== "input" && t !== "textarea") return child;
    return cloneElement(child, {
      id: child.props.id || autoId,
      "aria-label": child.props["aria-label"] || label,
    });
  });

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-[minmax(160px,220px)_1fr] border-b border-slate-200 last:border-b-0 bg-white ${className}`}
    >
      <div className="px-4 py-4 md:py-5 md:bg-slate-50/80 flex flex-col justify-center gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={autoId} className="text-sm font-bold text-slate-800">
            {label}
          </label>
          {required && (
            <span className="text-[10px] font-bold text-white bg-[#2b579a] px-1.5 py-0.5 leading-none">
              必須
            </span>
          )}
          {optional && (
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 leading-none">
              任意
            </span>
          )}
        </div>
        {hint && <p className="text-[11px] text-slate-500 leading-relaxed">{hint}</p>}
      </div>
      <div className="px-4 py-4 md:py-5 min-w-0">{enhanced}</div>
    </div>
  );
}

export const inputClass =
  "w-full border border-slate-200 rounded-sm px-3 py-2.5 text-sm text-slate-800 bg-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/25 focus:border-[#2563eb]";

export const selectClass = inputClass;

export const textareaClass = `${inputClass} resize-y min-h-[120px]`;
