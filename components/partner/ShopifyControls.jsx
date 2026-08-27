"use client";

import { useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import PartnerButton from "@/components/partner/ui/PartnerButton";
import {
  partnerDropdownTriggerClass,
  accountDropdownTriggerClass,
  ACCOUNT_DROPDOWN_TRIGGER_STYLE,
} from "@/components/partner/partnerDropdownStyles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";

/**
 * 夥伴後台按鈕（UIAble / shadcn 風格）
 */
export function ShopifyButton({
  children,
  onClick,
  disabled,
  primary = false,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <PartnerButton
      type={type}
      onClick={onClick}
      disabled={disabled}
      variant={primary ? "default" : "secondary"}
      size="sm"
      className={className}
      {...props}
    >
      {children}
    </PartnerButton>
  );
}

function groupMenuItems(items = []) {
  const groups = [];
  let current = [];
  for (const item of items) {
    if (item.divider) {
      if (current.length) groups.push(current);
      current = [];
      continue;
    }
    current.push(item);
  }
  if (current.length) groups.push(current);
  return groups;
}

function isRadioMenu(items = []) {
  return items.some((item) => !item.divider && item.active != null);
}

function itemVariant(item) {
  if (item.variant === "destructive" || item.destructive) return "destructive";
  return "default";
}

function MenuItemIcon({ icon, destructive = false, show = false }) {
  if (!show || !icon) return null;
  return (
    <MaterialIcon
      name={icon}
      size={16}
      className={cn("shrink-0", destructive ? "text-red-500" : "text-slate-500")}
    />
  );
}

function FilterMenuItem({ item, active, onPick, showItemIcons = false }) {
  return (
    <DropdownMenuItem
      closeOnClick
      disabled={item.disabled}
      onClick={() => onPick(item)}
      className={cn(
        "cursor-pointer rounded-lg px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
        active
          ? "bg-[#1E4AD1] text-white data-highlighted:bg-[#1639a8] data-highlighted:text-white"
          : "text-slate-700 data-highlighted:bg-slate-100",
        showItemIcons && "gap-2",
      )}
    >
      <MenuItemIcon icon={item.icon} show={showItemIcons} />
      <span className="flex-1 truncate text-left">{item.label}</span>
      {active ? (
        <span className="ml-2 shrink-0 text-[10px] font-bold uppercase tracking-wide opacity-90">
          已選
        </span>
      ) : null}
    </DropdownMenuItem>
  );
}

/**
 * 夥伴後台下拉（Base UI Menu）
 * - 含 `active` 的項目 → 單選篩選（按鈕式項目）
 * - 其餘 → Action 選單（支援 destructive 項目）
 */
export function ShopifyDropdown({
  label,
  icon,
  items = [],
  disabled = false,
  align = "right",
  primary = false,
  /** partner＝後台樣式；account＝對齊會員頁 SecondaryBtn */
  variant = "partner",
  menuLabel,
  showItemIcons = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const radioMode = isRadioMenu(items);
  const groups = groupMenuItems(items);
  const contentAlign = align === "left" ? "start" : "end";

  const runItem = (item) => {
    if (!item || item.disabled) return;
    item.onClick?.();
    setOpen(false);
  };

  const triggerClass =
    variant === "account"
      ? accountDropdownTriggerClass({ className })
      : partnerDropdownTriggerClass({ primary, className });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        disabled={disabled}
        className={triggerClass}
        style={variant === "account" ? ACCOUNT_DROPDOWN_TRIGGER_STYLE : undefined}
      >
        {icon ? (
          <MaterialIcon
            name={icon}
            size={16}
            className={variant === "account" ? "text-[#303030]" : "text-slate-500"}
          />
        ) : null}
        <span>{label}</span>
        <ChevronDownIcon
          className={cn(
            "size-4",
            variant === "account" ? "opacity-70" : "opacity-60",
          )}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={contentAlign}
        className={cn(
          "min-w-[240px] p-2",
          radioMode && "max-h-[min(420px,70vh)] overflow-y-auto",
        )}
      >
        {menuLabel ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
          </DropdownMenuGroup>
        ) : null}

        {groups.map((group, groupIdx) => {
          const normal = group.filter(
            (item) => itemVariant(item) !== "destructive",
          );
          const destructive = group.filter(
            (item) => itemVariant(item) === "destructive",
          );

          return (
            <div key={group[0]?.id || `group-${groupIdx}`}>
              {groupIdx > 0 ? <DropdownMenuSeparator /> : null}

              {normal.length ? (
                <DropdownMenuGroup className={radioMode ? "space-y-1" : undefined}>
                  {radioMode
                    ? normal.map((item) => (
                        <FilterMenuItem
                          key={item.id || item.label}
                          item={item}
                          active={Boolean(item.active)}
                          onPick={runItem}
                          showItemIcons={showItemIcons}
                        />
                      ))
                    : normal.map((item) => (
                        <DropdownMenuItem
                          key={item.id || item.label}
                          closeOnClick
                          disabled={item.disabled}
                          onClick={() => runItem(item)}
                          className={cn(
                            "cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98] data-highlighted:bg-slate-100",
                            showItemIcons && "gap-2",
                          )}
                        >
                          <MenuItemIcon icon={item.icon} show={showItemIcons} />
                          <span className="flex-1 truncate">{item.label}</span>
                        </DropdownMenuItem>
                      ))}
                </DropdownMenuGroup>
              ) : null}

              {destructive.length ? (
                <>
                  {normal.length ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuGroup>
                    {destructive.map((item) => (
                      <DropdownMenuItem
                        key={item.id || item.label}
                        closeOnClick
                        variant="destructive"
                        disabled={item.disabled}
                        onClick={() => runItem(item)}
                        className={cn(
                          "cursor-pointer rounded-lg px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
                          showItemIcons && "gap-2",
                        )}
                      >
                        <MenuItemIcon
                          icon={item.icon}
                          destructive
                          show={showItemIcons}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </>
              ) : null}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Shopify 風格頁內 Tabs（全部／已付款／尚未付款…）
 */
export function ShopifyTabs({ tabs = [], value, onChange }) {
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
                ? "font-bold text-slate-900"
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
                      ? "border-[#1E4AD1]/20 bg-[#1E4AD1]/10 text-[#1E4AD1]"
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
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#1E4AD1]"
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 分頁（UIAble 風格）
 */
export function ShopifyPagination({
  page = 1,
  pageSize = 10,
  total = 0,
  onChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  const go = (p) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next !== safePage) onChange?.(next);
  };

  const pageItems = (() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items = [1];
    const left = Math.max(2, safePage - 1);
    const right = Math.min(totalPages - 1, safePage + 1);
    if (left > 2) items.push("…");
    for (let i = left; i <= right; i += 1) items.push(i);
    if (right < totalPages - 1) items.push("…");
    items.push(totalPages);
    return items;
  })();

  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">
        顯示第{" "}
        <span className="font-semibold text-slate-900">
          {from}–{to}
        </span>{" "}
        筆，共 {total} 筆
      </p>
      <div className="flex items-center gap-1">
        <PartnerButton
          type="button"
          variant="outline"
          size="icon"
          disabled={safePage <= 1}
          onClick={() => go(safePage - 1)}
          aria-label="上一頁"
          className="h-8 w-8"
        >
          <MaterialIcon name="chevron_left" size={18} />
        </PartnerButton>
        {pageItems.map((item, idx) =>
          item === "…" ? (
            <span
              key={`e-${idx}`}
              className="w-8 text-center text-xs text-slate-400"
            >
              …
            </span>
          ) : (
            <PartnerButton
              key={item}
              type="button"
              variant={item === safePage ? "default" : "outline"}
              size="sm"
              onClick={() => go(item)}
              className="min-w-8 px-2"
            >
              {item}
            </PartnerButton>
          ),
        )}
        <PartnerButton
          type="button"
          variant="outline"
          size="icon"
          disabled={safePage >= totalPages}
          onClick={() => go(safePage + 1)}
          aria-label="下一頁"
          className="h-8 w-8"
        >
          <MaterialIcon name="chevron_right" size={18} />
        </PartnerButton>
      </div>
    </div>
  );
}
