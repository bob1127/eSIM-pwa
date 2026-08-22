import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 夥伴賣場首頁／方案區：依上架商品動態顯示國家分類 Tab
 * categories: buildPartnerCountryNavItems() 回傳值
 */
export default function PartnerStoreCategoryTabs({
  domain,
  categories = [],
  activeKey = null,
  totalCount = 0,
  className = "",
}) {
  if (!categories.length) return null;

  const base = `/p/${String(domain || "").trim()}/`;
  const items = [
    { key: "", label: "全部", count: totalCount, href: `${base}#plans` },
    ...categories.map((c) => ({
      key: c.key,
      label: c.label,
      count: c.count || 0,
      href: `${base}?country=${encodeURIComponent(c.key)}#plans`,
    })),
  ];

  return (
    <nav
      className={cn(
        "flex items-center gap-1 overflow-x-auto border-b border-slate-200 -mx-1 px-1 mb-6",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label="商品分類"
    >
      {items.map((tab) => {
        const active = (activeKey || "") === (tab.key || "");
        return (
          <Link
            key={tab.key || "all"}
            href={tab.href}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-3.5 py-2.5 text-sm transition",
              active
                ? "font-bold text-slate-900"
                : "font-medium text-slate-500 hover:text-slate-700",
            )}
            aria-current={active ? "page" : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              {tab.label}
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
            </span>
            {active ? (
              <span
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#1E4AD1]"
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
