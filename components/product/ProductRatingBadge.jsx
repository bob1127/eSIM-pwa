"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MaterialIcon from "@/components/MaterialIcon";
import { supabase } from "@/lib/supabaseClient";

/**
 * 星級評論標籤：有真實已核准評價才顯示。
 * 搜尋用 4.9 仍走 JSON-LD，不在這裡寫死。
 */
export default function ProductRatingBadge({
  productId,
  href = "#product-reviews",
  size = "md",
  className = "",
  starColor = "text-amber-400",
  showLinkLabel = true,
}) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!productId) return undefined;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("rating, parent_id")
        .eq("product_id", productId)
        .eq("status", "approved");

      if (cancelled) return;
      if (error) {
        setStats({ count: 0, avg: 0 });
        return;
      }

      const main = (data || []).filter((r) => !r.parent_id);
      const count = main.length;
      const avg =
        count > 0
          ? main.reduce((s, r) => s + (Number(r.rating) || 5), 0) / count
          : 0;
      setStats({ count, avg });
    })();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!stats || stats.count < 1) return null;

  const ratingValue = Math.round(stats.avg * 10) / 10;
  const filled = Math.round(stats.avg);
  const starPx = size === "sm" ? 12 : 16;
  const textClass = size === "sm" ? "text-[11px] sm:text-xs" : "text-sm";

  const inner = (
    <span className={`product-rating-badge inline-flex items-center gap-1.5 ${textClass}`}>
      <span className={`inline-flex items-center gap-px ${starColor}`}>
        {[...Array(5)].map((_, i) => (
          <MaterialIcon
            key={i}
            name="star"
            size={starPx}
            filled={i < filled}
            className={i < filled ? undefined : "text-slate-200"}
          />
        ))}
      </span>
      <span className="font-black text-slate-800 tabular-nums">
        {ratingValue.toFixed(1)}
      </span>
      <span className="text-slate-400 font-medium">
        （{stats.count.toLocaleString("zh-TW")} 則評價）
      </span>
      {showLinkLabel ? (
        <span className="underline underline-offset-2 decoration-slate-300 text-slate-500">
          查看評論
        </span>
      ) : null}
    </span>
  );

  if (!href) return <span className={className}>{inner}</span>;

  if (href.startsWith("#")) {
    return (
      <a
        href={href}
        className={`inline-flex w-fit hover:opacity-80 transition-opacity ${className}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex w-fit hover:opacity-80 transition-opacity ${className}`}
    >
      {inner}
    </Link>
  );
}
