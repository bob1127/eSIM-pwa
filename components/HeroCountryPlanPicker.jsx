"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MaterialIcon from "@/components/MaterialIcon";
import { buildHeroCountries, MOCK_COUNTRIES } from "@/lib/heroCountryPlans";

function formatPrice(amount) {
  if (!amount) return "—";
  return `NT$ ${Math.round(Number(amount)).toLocaleString("zh-TW")}`;
}

export default function HeroCountryPlanPicker() {
  const [countries, setCountries] = useState(MOCK_COUNTRIES);
  const [loading, setLoading] = useState(true);
  const [selectedHandle, setSelectedHandle] = useState(
    MOCK_COUNTRIES[0]?.handle || "",
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
        const publishableKey =
          process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
        const headers = {
          "Content-Type": "application/json",
          ...(publishableKey && { "x-publishable-api-key": publishableKey }),
        };

        const productFields =
          "+metadata,*categories,*variants,*variants.calculated_price,*variants.prices";
        const [catRes, prodRes, ranksRes] = await Promise.all([
          fetch(`${backendUrl}/store/product-categories`, { headers }),
          fetch(
            `${backendUrl}/store/products?limit=100&fields=${encodeURIComponent(productFields)}`,
            { headers },
          ),
          fetch("/api/hero-product-ranks").catch(() => null),
        ]);

        if (!catRes.ok) throw new Error("categories fetch failed");

        const catData = await catRes.json();
        const prodData = prodRes.ok
          ? await prodRes.json()
          : { products: [] };
        const ranksData =
          ranksRes && ranksRes.ok
            ? await ranksRes.json()
            : { byHandle: {}, byName: {} };

        if (cancelled) return;

        const merged = buildHeroCountries(
          catData.product_categories || [],
          prodData.products || [],
          ranksData,
        );

        if (merged.length > 0) {
          setCountries(merged);
          setSelectedHandle((prev) =>
            merged.some((c) => c.handle === prev)
              ? prev
              : merged[0].handle,
          );
        }
      } catch (err) {
        console.warn("[HeroCountryPlanPicker] 使用假資料:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;

    const onPointerDown = (e) => {
      if (dropdownRef.current?.contains(e.target)) return;
      setDropdownOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [dropdownOpen]);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.handle === selectedHandle) || countries[0],
    [countries, selectedHandle],
  );

  const plans = selectedCountry?.plans || [];

  return (
    <div className="bg-[#1a5fb4] rounded-lg md:rounded-xl p-5 md:p-6 shadow-[0_8px_32px_rgba(26,95,180,0.35)]">
      <h3 className="text-white font-bold text-base md:text-lg mb-4 tracking-wide">
        選擇國家方案
      </h3>

      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-white rounded-lg px-4 py-3.5 text-left text-[#1d5cc5] font-bold text-sm hover:bg-white/95 transition-colors"
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
        >
          <span className="flex items-center gap-2 min-w-0">
            <MaterialIcon name="public" size={20} className="shrink-0" />
            <span className="truncate">
              {loading ? "載入中…" : selectedCountry?.name || "請選擇國家"}
            </span>
          </span>
          <MaterialIcon
            name={dropdownOpen ? "expand_less" : "expand_more"}
            size={22}
            className="shrink-0"
          />
        </button>

        {dropdownOpen && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-[80] max-h-52 overflow-y-auto bg-white rounded-lg shadow-xl border border-slate-100 py-1"
          >
            {countries.map((country) => (
              <li key={country.id} role="option">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHandle(country.handle);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors border-b border-slate-100 last:border-b-0 ${
                    country.handle === selectedHandle
                      ? "bg-[#eef4ff] text-[#1d5cc5]"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {country.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 bg-white rounded-lg overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400 font-medium animate-pulse">
            方案載入中…
          </div>
        ) : plans.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            此國家暫無方案
            <Link
              href={`/product/${selectedCountry?.handle || ""}`}
              className="block mt-2 text-[#1d5cc5] font-bold hover:underline"
            >
              查看全部 →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={plan.href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#eef4ff]/60 transition-colors group"
                >
                  <span className="shrink-0 w-9 h-9 rounded-full bg-[#eef4ff] flex items-center justify-center">
                    <MaterialIcon
                      name="sim_card"
                      size={18}
                      className="text-[#1d5cc5]"
                    />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-slate-800 truncate">
                      {plan.name}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {[plan.days, plan.data].filter(Boolean).join(" · ")}
                      {plan.isReal && (
                        <span className="ml-1.5 text-[10px] text-emerald-600 font-bold">
                          現貨
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-black text-[#1d5cc5]">
                      {formatPrice(plan.price)}
                    </span>
                    <MaterialIcon
                      name="chevron_right"
                      size={18}
                      className="text-slate-400 inline-block group-hover:translate-x-0.5 transition-transform"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {selectedCountry && (
          <Link
            href={`/product/${selectedCountry.handle}`}
            className="flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-bold text-[#1d5cc5] bg-slate-50 hover:bg-slate-100 border-t border-slate-100 transition-colors"
          >
            查看 {selectedCountry.name} 全部方案
            <MaterialIcon name="arrow_forward" size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}
