"use client";

import { useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { partnerDropdownTriggerClass } from "@/components/partner/partnerDropdownStyles";

/**
 * 單選下拉（Base UI Menu）
 * options: [{ id, label, icon?, disabled? }]
 */
export default function PartnerSelectMenu({
  value,
  onChange,
  options = [],
  placeholder = "請選擇",
  prefix = "",
  icon,
  disabled = false,
  align = "start",
  className,
  triggerClassName,
  primary = false,
  id,
  open: openProp,
  onOpenChange,
  showItemIcons = false,
}) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = onOpenChange ?? setOpenInternal;
  const selected = options.find((o) => o.id === value);
  const displayLabel = prefix
    ? `${prefix}${selected?.label ?? placeholder}`
    : selected?.label ?? placeholder;

  const pick = (next) => {
    onChange?.(next);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        id={id}
        disabled={disabled}
        className={partnerDropdownTriggerClass({
          primary,
          className: cn(className, triggerClassName),
        })}
      >
        {icon ? (
          <MaterialIcon name={icon} size={16} className="shrink-0 text-slate-500" />
        ) : null}
        <span className="truncate max-w-[200px]">{displayLabel}</span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align === "end" ? "end" : "start"}
        className="min-w-[220px] p-2"
      >
        <DropdownMenuGroup className="space-y-1">
          {options.map((opt) => {
            const active = opt.id === value;
            return (
              <DropdownMenuItem
                key={opt.id}
                closeOnClick
                disabled={opt.disabled}
                onClick={() => {
                  if (opt.disabled) return;
                  pick(opt.id);
                }}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
                  active
                    ? "bg-[#1E4AD1] text-white data-highlighted:bg-[#1639a8] data-highlighted:text-white"
                    : "text-slate-700 data-highlighted:bg-slate-100",
                  showItemIcons && "gap-2",
                )}
              >
                {showItemIcons && opt.icon ? (
                  <MaterialIcon name={opt.icon} size={16} className="text-slate-500" />
                ) : null}
                <span className="flex-1 truncate text-left">{opt.label}</span>
                {active ? (
                  <span className="ml-2 shrink-0 text-[10px] font-bold uppercase tracking-wide opacity-90">
                    已選
                  </span>
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
