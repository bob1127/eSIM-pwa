import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import { usePartnerSession } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import MaterialIcon from "@/components/MaterialIcon";
import { fmt } from "@/components/partner/DobermanWidgets";
import { ShopifyDropdown } from "@/components/partner/ShopifyControls";
import { inferProductCountry } from "@/lib/partnerNavCountries";

const TABS = [
  { id: "pool", label: "商品池", icon: "inventory" },
  { id: "listed", label: "已上架管理", icon: "check_circle" },
];

const SORT_OPTS = [
  { value: "newest", label: "最新上架" },
  { value: "name_asc", label: "名稱 A→Z" },
  { value: "price_asc", label: "底價（低→高）" },
  { value: "price_desc", label: "底價（高→低）" },
  { value: "profit_desc", label: "分潤（高→低）" },
];

const LIST_STATUS_OPTS = [
  { value: "all", label: "全部狀態" },
  { value: "unlisted", label: "未上架" },
  { value: "listed", label: "已上架" },
];

const PRICE_OPTS = [
  { value: "all", label: "全部底價" },
  { value: "has_cost", label: "已有底價" },
  { value: "no_cost", label: "尚無底價" },
];

const PLAN_OPTS = [
  { value: "all", label: "全部方案數" },
  { value: "has_plans", label: "已有方案" },
  { value: "pending_plans", label: "方案待同步" },
];

const CATALOG_OPTS = [
  { value: "all", label: "主站全部" },
  { value: "available", label: "主站可售" },
  { value: "off", label: "主站已下架" },
];

function resolveCountry(product) {
  return (
    inferProductCountry(product) || {
      key: "other",
      label: "其他",
    }
  );
}

const fmtCost = (n) => (Number(n) > 0 ? fmt(n) : "—");
const fmtPlans = (n) => (Number(n) > 0 ? `${n} 個方案` : "方案待同步");

function LoadingSpinner({ size = 14, className = "" }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-white/35 border-t-white animate-spin shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

function AddToStoreButton({
  busy,
  anyBusy,
  onClick,
  size = "md",
  className = "",
}) {
  const sm = size === "sm";
  return (
    <button
      type="button"
      disabled={anyBusy}
      onClick={onClick}
      aria-busy={busy}
      className={
        className ||
        (sm
          ? "inline-flex items-center justify-center gap-1.5 min-w-[7.5rem] text-xs font-bold bg-[#1E4AD1] text-white px-3 py-1.5 rounded-sm hover:bg-[#0071EB] disabled:opacity-60 disabled:cursor-wait transition"
          : "flex-1 min-h-11 inline-flex items-center justify-center gap-1.5 text-sm font-bold bg-[#1E4AD1] text-white rounded-lg hover:bg-[#0071EB] disabled:opacity-60 disabled:cursor-wait transition")
      }
    >
      {busy ? (
        <>
          <LoadingSpinner size={sm ? 12 : 14} />
          上架中…
        </>
      ) : (
        <>
          <MaterialIcon name="add" size={sm ? 14 : 16} />
          加入店鋪
        </>
      )}
    </button>
  );
}

function sortProducts(list, sortKey) {
  const arr = [...list];
  if (sortKey === "name_asc") return arr.sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));
  if (sortKey === "price_asc") return arr.sort((a, b) => a.minB2B - b.minB2B);
  if (sortKey === "price_desc") return arr.sort((a, b) => b.minB2B - a.minB2B);
  if (sortKey === "profit_desc") return arr.sort((a, b) => (b.profit || 0) - (a.profit || 0));
  return arr.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function FilterChip({ label, onClear }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
    >
      {label}
      <MaterialIcon name="close" size={14} />
    </button>
  );
}

function PoolProductCard({
  p,
  busyId,
  onAdd,
  onRemove,
}) {
  const busy = busyId === p.id;
  return (
    <article
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition ${
        busy ? "ring-2 ring-[#1E4AD1]/25 bg-blue-50/30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-800 leading-snug break-words">
            {p.name}
          </p>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {p.description || "eSIM 漫遊方案"}
          </p>
        </div>
        <span
          className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-md ${
            p.isListed
              ? "bg-[#d1fae5] text-[#065f46]"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {p.isListed ? "已上架" : "未上架"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
          {p.category}
        </span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#1E4AD1]">
          {fmtPlans(p.planCount)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <p className="text-[10px] text-slate-400 font-bold">底價</p>
          <p className="text-xs font-bold text-slate-700 mt-0.5 tabular-nums">
            {fmtCost(p.minB2B)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <p className="text-[10px] text-slate-400 font-bold">售價</p>
          <p className="text-xs font-bold text-slate-800 mt-0.5 tabular-nums">
            {fmt(p.sellPrice)}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 px-2 py-2">
          <p className="text-[10px] text-slate-400 font-bold">分潤</p>
          <p className="text-xs font-black text-[#1E4AD1] mt-0.5 tabular-nums">
            +{fmt(p.profit)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {!p.isListed ? (
          <AddToStoreButton
            busy={busyId === p.id}
            anyBusy={!!busyId}
            onClick={() => onAdd(p.id)}
          />
        ) : (
          <>
            <Link
              href="/partner/products?tab=pricing"
              className="flex-1 min-h-11 inline-flex items-center justify-center text-sm font-bold border border-slate-200 rounded-lg text-slate-700"
            >
              編輯定價
            </Link>
            <button
              type="button"
              disabled={!!busyId}
              onClick={() => onRemove(p)}
              className="min-h-11 px-3 inline-flex items-center justify-center text-sm font-bold text-red-500 border border-red-100 rounded-lg disabled:opacity-50"
            >
              移除
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function ListedProductCard({ p, onRemove }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-800 leading-snug break-words">
            {p.name}
          </p>
          <p className="text-xs text-slate-400 mt-1">{p.category}</p>
        </div>
        <span
          className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-md ${
            p.catalogAvailable === false
              ? "bg-red-50 text-red-700"
              : "bg-[#e0f2fe] text-[#0369a1]"
          }`}
        >
          {p.catalogAvailable === false ? "主站已下架" : "已開設"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <p className="text-[10px] text-slate-400 font-bold">底價</p>
          <p className="text-xs font-bold text-slate-700 mt-0.5">{fmtCost(p.minB2B)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <p className="text-[10px] text-slate-400 font-bold">售價</p>
          <p className="text-xs font-bold text-slate-800 mt-0.5">{fmt(p.sellPrice)}</p>
        </div>
        <div className="rounded-lg bg-blue-50 px-2 py-2">
          <p className="text-[10px] text-slate-400 font-bold">分潤</p>
          <p className="text-xs font-black text-[#1E4AD1] mt-0.5">+{fmt(p.profit)}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        {fmtPlans(p.planCount)} · 上架 {p.listedAt ? new Date(p.listedAt).toLocaleDateString("zh-TW") : "—"}
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          href="/partner/products?tab=pricing"
          className="flex-1 min-h-11 inline-flex items-center justify-center text-sm font-bold border border-slate-200 rounded-lg text-slate-700"
        >
          編輯定價
        </Link>
        <button
          type="button"
          onClick={() => onRemove(p)}
          className="min-h-11 px-3 inline-flex items-center justify-center text-sm font-bold text-red-500 border border-red-100 rounded-lg"
        >
          停用
        </button>
      </div>
    </article>
  );
}

export default function PartnerCatalogPage() {
  const router = useRouter();
  const { store } = usePartnerSession();
  const tabFromQuery = String(router.query.tab || "");
  const [activeTab, setActiveTabState] = useState(
    tabFromQuery === "listed" ? "listed" : "pool",
  );

  useEffect(() => {
    if (tabFromQuery === "listed" || tabFromQuery === "pool") {
      setActiveTabState(tabFromQuery);
    }
  }, [tabFromQuery]);

  const setActiveTab = (id) => {
    setActiveTabState(id);
    router.replace(
      { pathname: "/partner/catalog", query: { tab: id } },
      undefined,
      { shallow: true },
    );
  };

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [listedMap, setListedMap] = useState({});
  const [search, setSearch] = useState("");
  const [poolFilter, setPoolFilter] = useState("all");
  const [sortKey, setSortKey] = useState("newest");
  const [countryFilter, setCountryFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [catalogFilter, setCatalogFilter] = useState("all");
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [pricingHint, setPricingHint] = useState("");

  const markup = store?.markup_rate ?? 20;

  useEffect(() => {
    if (!store) return;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [poolRes, listRes] = await Promise.all([
          fetch("/api/partner/product-pool"),
          fetch("/api/partner/store-listings", {
            headers: {
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
            },
          }),
        ]);

        const poolData = await poolRes.json();
        if (!poolRes.ok) throw new Error(poolData.error || "無法載入商品池");

        let listings = [];
        if (listRes.ok) {
          const listData = await listRes.json();
          listings = listData.listings || [];
        }

        const map = {};
        const listedMedusaIds = new Set();
        for (const row of listings) {
          if (row.medusa_product_id) {
            listedMedusaIds.add(row.medusa_product_id);
            map[row.medusa_product_id] = row;
          } else if (row.product_id) {
            map[`legacy_${row.product_id}`] = row;
          }
        }

        const enriched = (poolData.products || []).map((p) => {
          const minB2B = p.minB2B || 0;
          const sellPrice = Math.round(minB2B * (1 + markup / 100));
          const listing = map[p.medusa_product_id];
          const isListed = listedMedusaIds.has(p.medusa_product_id);
          const catalogAvailable = listing
            ? listing.catalog_available !== false
            : true;
          const country = resolveCountry(p);
          return {
            id: p.medusa_product_id,
            medusaProductId: p.medusa_product_id,
            handle: p.handle,
            name: p.name,
            description: p.description,
            category: country.label,
            countryKey: country.key,
            countryLabel: country.label,
            planCount: p.planCount,
            minB2B,
            sellPrice,
            profit: sellPrice - minB2B,
            createdAt: p.created_at || "",
            listedAt: listing?.created_at || null,
            isListed,
            catalogAvailable,
            orphanOffCatalog: false,
            listingStatus: listing?.status || null,
            supabaseProductId: listing?.product_id || null,
          };
        });

        // 主站已下架 → 不在商品池，但仍在 store_products：顯示於「已上架」並標示不可售
        const poolIds = new Set(enriched.map((p) => p.id));
        for (const row of listings) {
          const mid = row.medusa_product_id;
          if (!mid || poolIds.has(mid)) continue;
          const minB2B = Number(row.min_b2b) || 0;
          const sellPrice = Math.round(minB2B * (1 + markup / 100));
          const orphanName =
            row.product_name || `已下架商品（${String(mid).slice(0, 10)}）`;
          const country = resolveCountry({
            name: orphanName,
            handle: row.product_handle,
          });
          enriched.push({
            id: mid,
            medusaProductId: mid,
            handle: row.product_handle || null,
            name: orphanName,
            description: "主站已下架或刪除，無法繼續販售",
            category: "主站已下架",
            countryKey: country.key,
            countryLabel: country.label,
            planCount: row.plan_count || 0,
            minB2B,
            sellPrice,
            profit: Math.max(0, sellPrice - minB2B),
            createdAt: row.created_at || "",
            listedAt: row.created_at || null,
            isListed: true,
            catalogAvailable: false,
            listingStatus: row.status || "paused",
            supabaseProductId: row.product_id || null,
            orphanOffCatalog: true,
          });
        }

        setProducts(enriched);
        setListedMap(map);
        setPricingHint(poolData.pricing?.hint || "");
      } catch (err) {
        setError(err.message || "載入失敗");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [store, markup]);

  const countryOptions = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      const key = p.countryKey || "other";
      const label = p.countryLabel || "其他";
      const prev = map.get(key) || { key, label, count: 0 };
      prev.count += 1;
      map.set(key, prev);
    }
    return [...map.values()].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-TW"),
    );
  }, [products]);

  const poolList = useMemo(() => {
    let list = [...products];

    if (catalogFilter === "off") {
      list = list.filter(
        (p) => p.orphanOffCatalog || p.catalogAvailable === false,
      );
    } else if (catalogFilter === "available") {
      list = list.filter((p) => !p.orphanOffCatalog && p.catalogAvailable !== false);
    } else {
      list = list.filter((p) => !p.orphanOffCatalog);
    }

    if (poolFilter === "unlisted") list = list.filter((p) => !p.isListed);
    if (poolFilter === "listed") list = list.filter((p) => p.isListed);

    if (countryFilter) {
      list = list.filter((p) => (p.countryKey || "other") === countryFilter);
    }

    if (priceFilter === "has_cost") list = list.filter((p) => Number(p.minB2B) > 0);
    if (priceFilter === "no_cost") list = list.filter((p) => !(Number(p.minB2B) > 0));

    if (planFilter === "has_plans") list = list.filter((p) => Number(p.planCount) > 0);
    if (planFilter === "pending_plans") {
      list = list.filter((p) => !(Number(p.planCount) > 0));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q));
    }
    return sortProducts(list, sortKey);
  }, [
    products,
    poolFilter,
    countryFilter,
    priceFilter,
    planFilter,
    catalogFilter,
    search,
    sortKey,
  ]);

  const advancedActiveCount = [
    poolFilter !== "all",
    priceFilter !== "all",
    planFilter !== "all",
    catalogFilter !== "all",
  ].filter(Boolean).length;

  const clearAdvancedFilters = () => {
    setPoolFilter("all");
    setPriceFilter("all");
    setPlanFilter("all");
    setCatalogFilter("all");
  };

  const countryLabel =
    countryOptions.find((c) => c.key === countryFilter)?.label ||
    (countryFilter ? "已選國家" : "");

  const sortLabel =
    SORT_OPTS.find((o) => o.value === sortKey)?.label || "最新上架";

  const countryMenuItems = useMemo(
    () => [
      {
        id: "all",
        label: "全部國家",
        icon: "public",
        active: !countryFilter,
        onClick: () => setCountryFilter(""),
      },
      { divider: true },
      ...countryOptions.map((c) => ({
        id: c.key,
        label: `${c.label}（${c.count}）`,
        icon: "flag",
        active: countryFilter === c.key,
        onClick: () => setCountryFilter(c.key),
      })),
    ],
    [countryOptions, countryFilter],
  );

  const advancedMenuItems = useMemo(() => {
    const section = (prefix, opts, value, setter, icon) =>
      opts.map((o) => ({
        id: `${prefix}-${o.value}`,
        label: o.label,
        icon,
        active: value === o.value,
        onClick: () => setter(o.value),
      }));

    return [
      ...section("list", LIST_STATUS_OPTS, poolFilter, setPoolFilter, "storefront"),
      { divider: true },
      ...section("price", PRICE_OPTS, priceFilter, setPriceFilter, "payments"),
      { divider: true },
      ...section("plan", PLAN_OPTS, planFilter, setPlanFilter, "layers"),
      { divider: true },
      ...section("catalog", CATALOG_OPTS, catalogFilter, setCatalogFilter, "inventory_2"),
      ...(advancedActiveCount
        ? [
            { divider: true },
            {
              id: "clear-advanced",
              label: "清除進階篩選",
              icon: "filter_alt_off",
              onClick: clearAdvancedFilters,
            },
          ]
        : []),
    ];
  }, [poolFilter, priceFilter, planFilter, catalogFilter, advancedActiveCount]);

  const sortMenuItems = useMemo(
    () =>
      SORT_OPTS.map((o) => ({
        id: o.value,
        label: o.label,
        icon: "swap_vert",
        active: sortKey === o.value,
        onClick: () => setSortKey(o.value),
      })),
    [sortKey],
  );

  const listedList = useMemo(() => {
    let list = products.filter((p) => p.isListed);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q));
    }
    return sortProducts(list, sortKey);
  }, [products, search, sortKey]);

  const stats = useMemo(
    () => ({
      total: products.filter((p) => !p.orphanOffCatalog).length,
      listed: products.filter((p) => p.isListed).length,
      unlisted: products.filter((p) => !p.isListed && !p.orphanOffCatalog)
        .length,
    }),
    [products],
  );

  const handleAdd = async (medusaProductId) => {
    if (!store || busyId) return;
    setBusyId(medusaProductId);
    try {
      const session = await supabase.auth.getSession();
      const res = await fetch("/api/partner/store-listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token || ""}`,
        },
        body: JSON.stringify({ medusa_product_id: medusaProductId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加入失敗");
      setProducts((prev) =>
        prev.map((p) =>
          p.id === medusaProductId
            ? { ...p, isListed: true, listedAt: data.listedAt || new Date().toISOString() }
            : p,
        ),
      );
      setListedMap((prev) => ({
        ...prev,
        [medusaProductId]: { medusa_product_id: medusaProductId, product_id: data.productId },
      }));
    } catch (err) {
      alert(err.message || "加入失敗");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (medusaProductId) => {
    if (!store || busyId) return;
    setBusyId(medusaProductId);
    try {
      const session = await supabase.auth.getSession();
      const res = await fetch("/api/partner/store-listings", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token || ""}`,
        },
        body: JSON.stringify({ medusa_product_id: medusaProductId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "移除失敗");
      setConfirmRemove(null);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === medusaProductId ? { ...p, isListed: false, listedAt: null } : p,
        ),
      );
      setListedMap((prev) => {
        const next = { ...prev };
        delete next[medusaProductId];
        return next;
      });
    } catch (err) {
      alert(err.message || "移除失敗");
    } finally {
      setBusyId(null);
    }
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("zh-TW", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "—";

  return (
    <PartnerAdminLayout title="選品管理">
      {/* Tab 導覽 */}
      <div className="flex bg-white border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition ${
                active
                  ? "border-[#1E4AD1] text-[#1E4AD1] bg-blue-50/30"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <MaterialIcon name={t.icon} size={18} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 統計摘要 */}
      <div className="grid grid-cols-3 border-x border-b border-slate-200 bg-white">
        {[
          { label: "可選商品", value: stats.total, unit: "項", icon: "inventory_2" },
          { label: "已上架", value: stats.listed, unit: "項", icon: "check_circle" },
          { label: "待選商品", value: stats.unlisted, unit: "項", icon: "add_shopping_cart" },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`px-2.5 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3 ${i < 2 ? "border-r border-slate-200" : ""}`}
          >
            <MaterialIcon
              name={s.icon}
              size={20}
              className="text-[#1E4AD1] hidden sm:block"
            />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-500 truncate">{s.label}</p>
              <p className="text-base sm:text-xl font-black text-slate-800 tabular-nums">
                {loading ? "…" : s.value}
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5 sm:ml-1">
                  {s.unit}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 sm:p-5 space-y-4 pb-24 md:pb-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-sm">
            {error}
          </div>
        )}
        {activeTab === "pool" && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex flex-col gap-3 px-4 py-4 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-800">商品池</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      依國家與條件篩選後加入店鋪 · 目前 {loading ? "…" : poolList.length} 項
                    </p>
                  </div>
                  <Link
                    href="/partner/products?tab=products"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 min-h-10 bg-[#1E4AD1] hover:bg-[#0071EB] text-white text-sm font-bold px-4 py-2 rounded-lg transition"
                  >
                    <MaterialIcon name="price_change" size={18} />
                    管理已上架商品
                  </Link>
                </div>

                <div className="relative">
                  <MaterialIcon
                    name="search"
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜尋商品名稱..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-[#1E4AD1] outline-none bg-white"
                  />
                </div>

                {/* 圖一風格：白底描邊下拉 */}
                <div className="flex flex-wrap items-center gap-2">
                  <ShopifyDropdown
                    label={
                      countryFilter
                        ? `國家：${countryLabel}`
                        : "國家分類"
                    }
                    icon="public"
                    align="left"
                    items={countryMenuItems}
                  />
                  <ShopifyDropdown
                    label={
                      advancedActiveCount
                        ? `進階篩選（${advancedActiveCount}）`
                        : "進階篩選"
                    }
                    icon="tune"
                    align="left"
                    items={advancedMenuItems}
                  />
                  <ShopifyDropdown
                    label={`排序：${sortLabel}`}
                    icon="swap_vert"
                    align="left"
                    items={sortMenuItems}
                  />
                </div>

                {(countryFilter || advancedActiveCount > 0) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {countryFilter ? (
                      <FilterChip
                        label={`國家：${countryLabel}`}
                        onClear={() => setCountryFilter("")}
                      />
                    ) : null}
                    {poolFilter !== "all" ? (
                      <FilterChip
                        label={
                          LIST_STATUS_OPTS.find((o) => o.value === poolFilter)
                            ?.label || poolFilter
                        }
                        onClear={() => setPoolFilter("all")}
                      />
                    ) : null}
                    {priceFilter !== "all" ? (
                      <FilterChip
                        label={
                          PRICE_OPTS.find((o) => o.value === priceFilter)?.label ||
                          priceFilter
                        }
                        onClear={() => setPriceFilter("all")}
                      />
                    ) : null}
                    {planFilter !== "all" ? (
                      <FilterChip
                        label={
                          PLAN_OPTS.find((o) => o.value === planFilter)?.label ||
                          planFilter
                        }
                        onClear={() => setPlanFilter("all")}
                      />
                    ) : null}
                    {catalogFilter !== "all" ? (
                      <FilterChip
                        label={
                          CATALOG_OPTS.find((o) => o.value === catalogFilter)
                            ?.label || catalogFilter
                        }
                        onClear={() => setCatalogFilter("all")}
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setCountryFilter("");
                        clearAdvancedFilters();
                      }}
                      className="text-[11px] font-bold text-[#1E4AD1] hover:underline px-1"
                    >
                      全部清除
                    </button>
                  </div>
                )}
              </div>

              {/* 手機卡片 */}
              <div className="md:hidden p-3 space-y-3 bg-slate-50/40">
                {loading ? (
                  <p className="py-10 text-center text-slate-400 text-sm">載入商品池中...</p>
                ) : poolList.length === 0 ? (
                  <p className="py-10 text-center text-slate-400 text-sm">
                    目前沒有符合條件的商品
                  </p>
                ) : (
                  poolList.map((p) => (
                    <PoolProductCard
                      key={p.id}
                      p={p}
                      busyId={busyId}
                      onAdd={handleAdd}
                      onRemove={setConfirmRemove}
                    />
                  ))
                )}
              </div>

              {/* 桌機表格 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead className="bg-slate-50 text-slate-500 text-xs">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold">商品名稱</th>
                      <th className="px-5 py-3 text-left font-bold">分類</th>
                      <th className="px-5 py-3 text-center font-bold">方案數</th>
                      <th className="px-5 py-3 text-right font-bold">底價</th>
                      <th className="px-5 py-3 text-right font-bold">預估售價</th>
                      <th className="px-5 py-3 text-right font-bold">預估分潤</th>
                      <th className="px-5 py-3 text-center font-bold">狀態</th>
                      <th className="px-5 py-3 text-center font-bold">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          載入商品池中...
                        </td>
                      </tr>
                    ) : poolList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          目前沒有符合條件的商品
                        </td>
                      </tr>
                    ) : (
                      poolList.map((p) => (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50/60 ${
                            busyId === p.id ? "bg-blue-50/40" : ""
                          }`}
                        >
                          <td className="px-5 py-4 max-w-[280px]">
                            <p className="font-bold text-slate-800 break-words">{p.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                              {p.description || "eSIM 漫遊方案"}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-600">
                              {p.category}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-slate-700">
                            {p.planCount}
                          </td>
                          <td className="px-5 py-4 text-right text-slate-600">{fmtCost(p.minB2B)}</td>
                          <td className="px-5 py-4 text-right font-bold text-slate-800">
                            {fmt(p.sellPrice)}
                          </td>
                          <td className="px-5 py-4 text-right font-black text-[#1E4AD1]">
                            +{fmt(p.profit)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-sm ${
                                p.isListed
                                  ? "bg-[#d1fae5] text-[#065f46]"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {p.isListed ? "已上架" : "未上架"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {!p.isListed ? (
                              <AddToStoreButton
                                size="sm"
                                busy={busyId === p.id}
                                anyBusy={!!busyId}
                                onClick={() => handleAdd(p.id)}
                              />
                            ) : (
                              <div className="inline-flex items-center justify-center gap-2 min-w-[7.5rem]">
                                <Link
                                  href="/partner/products?tab=pricing"
                                  className="text-xs font-bold text-[#1E4AD1] hover:underline"
                                >
                                  定價
                                </Link>
                                <button
                                  type="button"
                                  disabled={!!busyId}
                                  onClick={() => setConfirmRemove(p)}
                                  className="text-xs font-bold text-red-500 hover:underline disabled:opacity-50"
                                >
                                  移除
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-slate-400 px-1 leading-relaxed">
              商品池即時同步主站商品。預估售價依目前加價率 {markup}% 計算，可至
              <Link href="/partner/settings" className="text-[#1E4AD1] font-bold mx-1 hover:underline">
                商店設定
              </Link>
              調整。
              {pricingHint && <span className="block mt-1 text-slate-400">{pricingHint}</span>}
            </p>
          </>
        )}

        {activeTab === "listed" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-black text-slate-800">已上架商品</h2>
                <p className="text-xs text-slate-500 mt-1">
                  主站下架或刪除的方案會自動標示「主站已下架」並從賣場下架；請移除選品或待主站恢復後再啟用。
                </p>
              </div>
              <Link
                href="/partner/products?tab=pricing"
                className="inline-flex items-center justify-center gap-1.5 min-h-11 bg-[#1E4AD1] hover:bg-[#0071EB] text-white text-sm font-bold px-4 py-2.5 rounded-lg transition"
              >
                <MaterialIcon name="add" size={18} />
                前往定價管理
              </Link>
            </div>

            <div className="flex flex-col gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <div className="relative">
                <MaterialIcon
                  name="search"
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜尋商品名稱..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-[#1E4AD1] outline-none"
                />
              </div>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none min-h-11"
              >
                {SORT_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    排序：{o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:hidden p-3 space-y-3 bg-slate-50/40">
              {loading ? (
                <p className="py-10 text-center text-slate-400 text-sm">載入中...</p>
              ) : listedList.length === 0 ? (
                <p className="py-10 text-center text-slate-400 text-sm px-4 leading-relaxed">
                  尚未上架任何商品，請至「商品池」選擇商品加入
                </p>
              ) : (
                listedList.map((p) => (
                  <ListedProductCard
                    key={p.id}
                    p={p}
                    onRemove={setConfirmRemove}
                  />
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm table-fixed min-w-[920px]">
                <colgroup>
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                </colgroup>
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold">商品名稱</th>
                    <th className="px-4 py-3 text-center font-bold">方案數</th>
                    <th className="px-4 py-3 text-right font-bold">底價</th>
                    <th className="px-4 py-3 text-right font-bold">預設售價</th>
                    <th className="px-4 py-3 text-right font-bold">預估分潤</th>
                    <th className="px-4 py-3 text-center font-bold">上架狀態</th>
                    <th className="px-4 py-3 text-center font-bold">上架日期</th>
                    <th className="px-4 py-3 text-right font-bold">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        載入中...
                      </td>
                    </tr>
                  ) : listedList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        尚未上架任何商品，請至「商品池」Tab 選擇商品加入
                      </td>
                    </tr>
                  ) : (
                    listedList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-4 align-top">
                          <p className="font-bold text-slate-800 break-words leading-snug">
                            {p.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {p.category || "eSIM"}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top text-center tabular-nums font-bold text-slate-700">
                          {p.planCount}
                        </td>
                        <td className="px-4 py-4 align-top text-right tabular-nums text-slate-600 whitespace-nowrap">
                          {fmtCost(p.minB2B)}
                        </td>
                        <td className="px-4 py-4 align-top text-right tabular-nums font-bold text-slate-800 whitespace-nowrap">
                          {fmt(p.sellPrice)}
                        </td>
                        <td className="px-4 py-4 align-top text-right tabular-nums font-black text-[#1E4AD1] whitespace-nowrap">
                          +{fmt(p.profit)}
                        </td>
                        <td className="px-4 py-4 align-top text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[5.75rem] text-xs font-bold px-2.5 py-1 rounded-sm ${
                              p.catalogAvailable === false
                                ? "bg-red-50 text-red-700"
                                : "bg-[#e0f2fe] text-[#0369a1]"
                            }`}
                          >
                            {p.catalogAvailable === false
                              ? "主站已下架"
                              : "已開設"}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top text-center text-xs text-slate-500 whitespace-nowrap">
                          {fmtDate(p.listedAt)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <Link
                              href="/partner/products?tab=pricing"
                              className="text-xs border border-slate-300 rounded-sm px-2.5 py-1 text-slate-600 hover:border-[#1E4AD1] hover:text-[#1E4AD1] font-bold"
                            >
                              編輯定價
                            </Link>
                            <button
                              type="button"
                              onClick={() => setConfirmRemove(p)}
                              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                              aria-label="移除商品"
                            >
                              <MaterialIcon name="delete" size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 刪除確認 */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <MaterialIcon name="warning" size={28} className="text-amber-500" />
              <h3 className="font-black text-slate-800">確認移除商品</h3>
            </div>
            <p className="text-sm text-slate-600 mb-1">
              移除後，「{confirmRemove.name}」將不再顯示於您的賣場，此操作無法復原。
            </p>
            <p className="text-sm font-bold text-slate-800 mb-5">確定要移除嗎？</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={!!busyId}
                onClick={() => setConfirmRemove(null)}
                className="px-5 py-2 text-sm text-slate-600 border border-slate-300 rounded-sm hover:bg-slate-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!!busyId}
                onClick={() => handleRemove(confirmRemove.id)}
                className="inline-flex items-center justify-center gap-1.5 min-w-[6.5rem] px-5 py-2 text-sm font-bold text-white bg-[#1E4AD1] rounded-sm hover:bg-[#0071EB] disabled:opacity-60 disabled:cursor-wait"
              >
                {busyId === confirmRemove.id ? (
                  <>
                    <LoadingSpinner size={14} />
                    移除中…
                  </>
                ) : (
                  "確定移除"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PartnerAdminLayout>
  );
}
