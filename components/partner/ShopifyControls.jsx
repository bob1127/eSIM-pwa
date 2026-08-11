import { useEffect, useRef, useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import { SHOPIFY_UI } from "@/lib/shopifyUi";

/**
 * Shopify Polaris 風格按鈕（次要／主要）
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
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[13px] font-semibold transition disabled:opacity-40 ${className}`}
      style={
        primary
          ? {
              backgroundColor: SHOPIFY_UI.primaryBtnBg,
              color: SHOPIFY_UI.primaryBtnText,
              borderRadius: "0.5rem",
            }
          : {
              backgroundColor: "#fafafa",
              color: "#303030",
              border: "1px solid #8a8a8a",
              borderRadius: "0.5rem",
            }
      }
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Shopify Polaris 風格下拉（比照圖二 Print ▾ ActionList）
 * items: [{ id, label, icon?, onClick, disabled?, divider? }]
 */
export function ShopifyDropdown({
  label,
  icon,
  items = [],
  disabled = false,
  align = "right",
  primary = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** Polaris secondary / primary 觸發鈕 */
  const triggerStyle = primary
    ? {
        backgroundColor: open ? "#000" : SHOPIFY_UI.primaryBtnBg,
        color: SHOPIFY_UI.primaryBtnText,
        border: "1px solid transparent",
        borderRadius: "0.5rem",
      }
    : {
        backgroundColor: open ? "#f1f1f1" : "#ffffff",
        color: "#303030",
        border: "1px solid #8a8a8a",
        borderRadius: "0.5rem",
      };

  return (
    <div className="relative inline-block" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1 h-8 px-3 text-[13px] font-semibold transition disabled:opacity-40 hover:bg-[#f1f1f1]"
        style={triggerStyle}
      >
        {icon ? <MaterialIcon name={icon} size={16} /> : null}
        <span>{label}</span>
        <MaterialIcon
          name="keyboard_arrow_down"
          size={18}
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute z-50 mt-1.5 min-w-[200px] py-2 overflow-hidden ${
            align === "left" ? "left-0" : "right-0"
          }`}
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e3e3e3",
            borderRadius: "0.75rem",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)",
          }}
        >
          {items.map((item, idx) => {
            if (item.divider) {
              return (
                <div
                  key={`div-${idx}`}
                  className="my-1.5 mx-0 h-px"
                  style={{ backgroundColor: "#e3e3e3" }}
                />
              );
            }
            return (
              <button
                key={item.id || item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  setOpen(false);
                  item.onClick?.();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-[13px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  color: "#303030",
                  backgroundColor: item.active ? "#f1f1f1" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!item.disabled) e.currentTarget.style.backgroundColor = "#f6f6f7";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = item.active
                    ? "#f1f1f1"
                    : "transparent";
                }}
              >
                {item.icon ? (
                  <MaterialIcon
                    name={item.icon}
                    size={18}
                    style={{ color: "#5c5f62", flexShrink: 0 }}
                  />
                ) : (
                  <span className="w-[18px] shrink-0" />
                )}
                <span className="flex-1 truncate leading-snug">{item.label}</span>
                {item.active ? (
                  <MaterialIcon
                    name="check"
                    size={18}
                    style={{ color: "#008060", flexShrink: 0 }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Shopify 風格頁內 Tabs（全部／已付款／尚未付款…）
 * tabs: [{ id, label, count?, amount? }]
 * amount 可為字串（如 "NT$1,234"）顯示於筆數旁
 */
export function ShopifyTabs({ tabs = [], value, onChange }) {
  return (
    <div
      className="flex items-center gap-0.5 overflow-x-auto"
      style={{ borderBottom: `1px solid ${SHOPIFY_UI.cardBorder}` }}
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
            className="relative px-3.5 py-2.5 text-sm whitespace-nowrap transition shrink-0"
            style={{
              color: active ? SHOPIFY_UI.textPrimary : SHOPIFY_UI.textTertiary,
              fontWeight: active ? 700 : 500,
            }}
          >
            <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
              {tab.label}
              {tab.count != null ? (
                <span
                  className="tabular-nums text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: active ? "#e3e3e3" : SHOPIFY_UI.canvasBg,
                    color: active
                      ? SHOPIFY_UI.textPrimary
                      : SHOPIFY_UI.textTertiary,
                  }}
                >
                  {tab.count}
                </span>
              ) : null}
              {tab.amount != null && tab.amount !== "" ? (
                <span
                  className="tabular-nums text-[11px] font-bold"
                  style={{
                    color: active
                      ? SHOPIFY_UI.textPrimary
                      : SHOPIFY_UI.textTertiary,
                  }}
                >
                  {tab.amount}
                </span>
              ) : null}
            </span>
            {active ? (
              <span
                className="absolute left-2 right-2 -bottom-px h-[2.5px] rounded-full"
                style={{ backgroundColor: SHOPIFY_UI.textPrimary }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Shopify 風格分頁（小圓角）
 * page 從 1 開始；顯示「第 x–y 筆，共 z 筆」+ 上一頁／頁碼／下一頁
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

  /** 產生頁碼陣列，過長時插入省略號 */
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

  const btnBase =
    "inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-md text-xs font-bold transition disabled:opacity-35";

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3"
      style={{
        borderTop: `1px solid ${SHOPIFY_UI.cardBorder}`,
        backgroundColor: SHOPIFY_UI.cardBg,
      }}
    >
      <p className="text-xs" style={{ color: SHOPIFY_UI.textTertiary }}>
        顯示第{" "}
        <span className="font-bold" style={{ color: SHOPIFY_UI.textPrimary }}>
          {from}–{to}
        </span>{" "}
        筆，共 {total} 筆
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => go(safePage - 1)}
          className={btnBase}
          style={{
            border: `1px solid ${SHOPIFY_UI.secondaryBorder}`,
            color: SHOPIFY_UI.textPrimary,
            backgroundColor: "#f1f1f1",
          }}
          aria-label="上一頁"
        >
          <MaterialIcon name="chevron_left" size={18} />
        </button>
        {pageItems.map((item, idx) =>
          item === "…" ? (
            <span
              key={`e-${idx}`}
              className="w-8 text-center text-xs"
              style={{ color: SHOPIFY_UI.textTertiary }}
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => go(item)}
              className={btnBase}
              style={
                item === safePage
                  ? {
                      backgroundColor: SHOPIFY_UI.primaryBtnBg,
                      color: "#fff",
                    }
                  : {
                      border: `1px solid ${SHOPIFY_UI.secondaryBorder}`,
                      color: SHOPIFY_UI.textPrimary,
                      backgroundColor: "#fff",
                    }
              }
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => go(safePage + 1)}
          className={btnBase}
          style={{
            border: `1px solid ${SHOPIFY_UI.secondaryBorder}`,
            color: SHOPIFY_UI.textPrimary,
            backgroundColor: "#f1f1f1",
          }}
          aria-label="下一頁"
        >
          <MaterialIcon name="chevron_right" size={18} />
        </button>
      </div>
    </div>
  );
}
