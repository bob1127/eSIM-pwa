/**
 * Boss 總部後台 — UIAble / shadcn 風格共用元件
 * @see https://uiable.com/components
 */
import { Children, isValidElement } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PartnerBadge from "@/components/partner/ui/PartnerBadge";
import { SHOPIFY_UI } from "@/lib/shopifyUi";
import { cn } from "@/lib/utils";

export const BOSS_UI = SHOPIFY_UI;

/** @see https://uiable.com/components/button */
export function BossButton({ variant = "default", size = "default", ...props }) {
  return <Button variant={variant} size={size} {...props} />;
}

const STATUS_VARIANT = {
  completed: "success",
  pending: "warning",
  refund_pending: "warning",
  refunded: "destructive",
  failed: "destructive",
  cancelled: "secondary",
};

export function BossStatusBadge({ status, label }) {
  const variant = STATUS_VARIANT[status] || "secondary";
  return (
    <PartnerBadge variant={variant} dot>
      {label}
    </PartnerBadge>
  );
}

export function BossCooperationBadge({ children }) {
  return <PartnerBadge variant="outline">{children}</PartnerBadge>;
}

export function BossKpiCard({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums tracking-tight">
        {value}
      </p>
      {sub ? <p className="text-[11px] text-slate-400 mt-1">{sub}</p> : null}
    </div>
  );
}

/** UIAble Tabs — 底線樣式，避免整排實心色塊 */
export function BossFilterTabs({ items = [], value, onChange }) {
  return (
    <div
      className="flex flex-wrap gap-0 border-b border-slate-200"
      role="tablist"
    >
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(item.value)}
            className={cn(
              "px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors",
              active
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** UIAble 分段控制 */
export function BossSegmented({ options = [], value, onChange, className }) {
  return (
    <div
      className={cn(
        "flex rounded-lg border border-slate-200 bg-slate-50 p-0.5",
        className,
      )}
    >
      {options.map(([v, label]) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange?.(v)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function BossField({ label, children, className }) {
  return (
    <label className={cn("block text-xs", className)}>
      <span className="font-medium text-slate-500 block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

/** @see https://uiable.com/components/select */
export function BossSelect({
  value,
  onChange,
  children,
  className,
  disabled,
  placeholder = "請選擇",
}) {
  const options = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type !== "option") return;
    options.push({
      value: String(child.props.value ?? ""),
      label: child.props.children,
    });
  });

  return (
    <Select
      value={value != null ? String(value) : null}
      onValueChange={(next) => {
        onChange?.({ target: { value: next ?? "" } });
      }}
      disabled={disabled}
    >
      <SelectTrigger className={className} size="sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BossCard({ children, className }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BossBreadcrumb({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      {children}
    </div>
  );
}

export function BossAlert({ variant = "error", children }) {
  const cls =
    variant === "error"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-slate-50 border-slate-200 text-slate-700";
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", cls)}>{children}</div>
  );
}

/** 訂單列表分頁 — 底線 + 中性計數標籤 */
export function BossOrderTabs({ tabs = [], value, onChange }) {
  return (
    <div
      className="flex items-center gap-1 overflow-x-auto border-b border-slate-200"
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-3.5 py-2.5 text-sm transition",
              active
                ? "font-semibold text-slate-900"
                : "font-medium text-slate-500 hover:text-slate-700",
            )}
          >
            <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
              {tab.label}
              {tab.count != null ? (
                <span
                  className={cn(
                    "rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                    active
                      ? "border-slate-300 bg-white text-slate-800 shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-500",
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
              {tab.amount != null && tab.amount !== "" ? (
                <span
                  className={cn(
                    "text-[11px] font-semibold tabular-nums",
                    active ? "text-slate-800" : "text-slate-500",
                  )}
                >
                  {tab.amount}
                </span>
              ) : null}
            </span>
            {active ? (
              <span
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-slate-900"
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** 表格數字 — 統一中性色，不另上色 */
export function BossNum({ children, className }) {
  return (
    <span className={cn("tabular-nums text-slate-800", className)}>{children}</span>
  );
}
