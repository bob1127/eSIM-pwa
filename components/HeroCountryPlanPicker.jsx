"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {
  buildHeroCountries,
  MOCK_COUNTRIES,
  searchHeroCountryPlans,
} from "@/lib/heroCountryPlans";
import { clientWarn } from "@/lib/clientLogger";

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
  const [query, setQuery] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

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
        clientWarn("[HeroCountryPlanPicker] 使用假資料:", err);
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

  const search = useMemo(
    () => searchHeroCountryPlans(countries, selectedHandle, query),
    [countries, selectedHandle, query],
  );

  useEffect(() => {
    const next = search.suggestedHandle;
    if (!next || next === selectedHandle) return;
    setSelectedHandle(next);
  }, [search.suggestedHandle, selectedHandle]);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.handle === selectedHandle) || countries[0],
    [countries, selectedHandle],
  );

  const listedCountries = query.trim()
    ? search.countries
    : countries;
  const plans = search.plans || [];
  const showCountryOnPlan = search.crossCountry;

  return (
    <div className="bg-[#1a5fb4] rounded-lg md:rounded-xl p-5 md:p-6 shadow-[0_8px_32px_rgba(26,95,180,0.35)]">
      <h3 className="text-white font-bold text-base md:text-lg mb-4 tracking-wide">
        選擇國家方案
      </h3>

      <div ref={dropdownRef} className="relative">
        <div className="flex items-center bg-white rounded-lg border-0 px-3 py-2.5 text-[#1d5cc5] shadow-none focus-within:ring-0">
          <MaterialIcon name="search" size={20} className="shrink-0 text-[#1d5cc5]" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDropdownOpen(false);
                inputRef.current?.blur();
              }
              if (e.key === "Enter" && listedCountries[0]) {
                setSelectedHandle(listedCountries[0].handle);
                setQuery(listedCountries[0].name);
                setDropdownOpen(false);
              }
            }}
            placeholder={
              loading
                ? "載入中…"
                : selectedCountry?.name
                  ? `搜尋國家或關鍵字，例如 ${selectedCountry.name}、吃到飽`
                  : "輸入國家名稱或關鍵字"
            }
            autoComplete="off"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            aria-label="搜尋國家或方案關鍵字"
            className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1 text-sm font-bold text-[#1d5cc5] placeholder:font-medium placeholder:text-slate-600 outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="shrink-0 p-0.5 text-slate-500 hover:text-slate-700"
              aria-label="清除搜尋"
            >
              <MaterialIcon name="close" size={18} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setDropdownOpen((v) => !v);
              inputRef.current?.focus();
            }}
            className="shrink-0 p-0.5 text-[#1d5cc5]"
            aria-label={dropdownOpen ? "收合國家列表" : "展開國家列表"}
          >
            <MaterialIcon
              name={dropdownOpen ? "expand_less" : "expand_more"}
              size={22}
            />
          </button>
        </div>

        {dropdownOpen && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-[80] max-h-52 overflow-y-auto bg-white rounded-lg shadow-xl border border-slate-100 py-1"
          >
            {listedCountries.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-500">沒有符合的國家</li>
            ) : (
              listedCountries.map((country) => (
                <li key={country.id} role="option">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHandle(country.handle);
                      setQuery(country.name);
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
              ))
            )}
          </ul>
        )}
      </div>

      <div className="mt-3 bg-white rounded-lg overflow-hidden">
        {loading ? (
          <LoadingIndicator layout="center" label="方案載入中…" className="px-4 py-8" />
        ) : plans.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            {query.trim() ? "沒有符合的方案" : "此國家暫無方案"}
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
              <li key={`${plan.countryHandle || ""}-${plan.id}`}>
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
                      {[
                        showCountryOnPlan ? plan.countryName : null,
                        plan.days,
                        plan.data,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
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
                      className="text-slate-500 inline-block group-hover:translate-x-0.5 transition-transform"
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
            {search.crossCountry
              ? "查看更多國家方案"
              : `查看 ${selectedCountry.name} 全部方案`}
            <MaterialIcon name="arrow_forward" size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}
