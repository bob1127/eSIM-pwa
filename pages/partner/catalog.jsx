import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import { usePartnerSession } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import MaterialIcon from "@/components/MaterialIcon";
import { fmt } from "@/components/partner/DobermanWidgets";
import { ShopifyDropdown, ShopifyPagination } from "@/components/partner/ShopifyControls";
import PartnerSelectMenu from "@/components/partner/PartnerSelectMenu";
import { inferProductCountry } from "@/lib/partnerNavCountries";
import { QuarterRing } from "@/components/ui/QuarterRing";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import PartnerButton from "@/components/partner/ui/PartnerButton";
import PartnerDialog from "@/components/partner/ui/PartnerDialog";
import PublishToggle from "@/components/partner/blog-builder/PublishToggle";

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

const POOL_PAGE_SIZE = 12;

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

function formatListedDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const am = h < 12 ? "上午" : "下午";
  const hh = h % 12 || 12;
  return `${y}年 ${m}月 ${day}日 ${am} ${hh}:${min}`;
}

function listingToggleLabel(isListed) {
  return isListed ? "上架" : "下架";
}

function ListingPublishCell({ p, busyId, onToggle }) {
  const busy = busyId === p.id;
  const disabled =
    busy ||
    (!!busyId && !busy) ||
    (p.catalogAvailable === false && !p.isListed);

  return (
    <div className="inline-flex flex-col items-start">
      <div className="flex items-center gap-2">
        <PublishToggle
          on={p.isListed}
          disabled={disabled}
          title={
            p.catalogAvailable === false && !p.isListed
              ? "主站已下架，無法上架"
              : undefined
          }
          onChange={(next) => onToggle(p, next)}
        />
        <span className="text-[11px] font-bold text-slate-600">
          {listingToggleLabel(p.isListed)}
        </span>
      </div>
      {p.isListed ? (
        <p className="text-[11px] text-slate-400 mt-1">
          {formatListedDate(p.listedAt)}
        </p>
      ) : null}
    </div>
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
  onToggle,
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
          <p className="text-sm font-bold text-slate-800 leading-snug break-words">
            {p.name}
          </p>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {p.description || "eSIM 漫遊方案"}
          </p>
        </div>
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
          <p className="text-xs font-bold text-[#1E4AD1] mt-0.5 tabular-nums">
            +{fmt(p.profit)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">上架</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {listingToggleLabel(p.isListed)}
          </p>
          {p.isListed ? (
            <p className="text-[11px] text-slate-400 mt-1">
              {formatListedDate(p.listedAt)}
            </p>
          ) : null}
        </div>
        <PublishToggle
          on={p.isListed}
          disabled={
            busy ||
            (!!busyId && !busy) ||
            (p.catalogAvailable === false && !p.isListed)
          }
          title={
            p.catalogAvailable === false && !p.isListed
              ? "主站已下架，無法上架"
              : undefined
          }
          onChange={(next) => onToggle(p, next)}
        />
      </div>

      {p.isListed ? (
        <div className="mt-3">
          <Link
            href="/partner/products?tab=pricing"
            className="w-full min-h-11 inline-flex items-center justify-center text-sm font-bold border border-slate-200 rounded-lg text-slate-700"
          >
            編輯定價
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function ListedProductCard({ p, busyId, onToggle }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 leading-snug break-words">
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
          <p className="text-xs font-bold text-[#1E4AD1] mt-0.5">+{fmt(p.profit)}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        {fmtPlans(p.planCount)}
      </p>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">上架</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {listingToggleLabel(p.isListed)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {formatListedDate(p.listedAt)}
          </p>
        </div>
        <PublishToggle
          on={p.isListed}
          disabled={busyId === p.id || !!busyId}
          onChange={(next) => onToggle(p, next)}
        />
      </div>
      <div className="mt-3">
        <Link
          href="/partner/products?tab=pricing"
          className="w-full min-h-11 inline-flex items-center justify-center text-sm font-bold border border-slate-200 rounded-lg text-slate-700"
        >
          編輯定價
        </Link>
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
  const [poolPage, setPoolPage] = useState(1);

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

  const poolTotalPages = Math.max(1, Math.ceil(poolList.length / POOL_PAGE_SIZE));
  const safePoolPage = Math.min(Math.max(1, poolPage), poolTotalPages);
  const poolPageItems = poolList.slice(
    (safePoolPage - 1) * POOL_PAGE_SIZE,
    safePoolPage * POOL_PAGE_SIZE,
  );

  useEffect(() => {
    setPoolPage(1);
  }, [
    search,
    poolFilter,
    countryFilter,
    priceFilter,
    planFilter,
    catalogFilter,
    sortKey,
  ]);

  useEffect(() => {
    if (poolPage !== safePoolPage) setPoolPage(safePoolPage);
  }, [poolPage, safePoolPage]);

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
        active: !countryFilter,
        onClick: () => setCountryFilter(""),
      },
      { divider: true },
      ...countryOptions.map((c) => ({
        id: c.key,
        label: `${c.label}（${c.count}）`,
        active: countryFilter === c.key,
        onClick: () => setCountryFilter(c.key),
      })),
    ],
    [countryOptions, countryFilter],
  );

  const advancedMenuItems = useMemo(() => {
    const section = (prefix, opts, value, setter) =>
      opts.map((o) => ({
        id: `${prefix}-${o.value}`,
        label: o.label,
        active: value === o.value,
        onClick: () => setter(o.value),
      }));

    return [
      ...section("list", LIST_STATUS_OPTS, poolFilter, setPoolFilter),
      { divider: true },
      ...section("price", PRICE_OPTS, priceFilter, setPriceFilter),
      { divider: true },
      ...section("plan", PLAN_OPTS, planFilter, setPlanFilter),
      { divider: true },
      ...section("catalog", CATALOG_OPTS, catalogFilter, setCatalogFilter),
      ...(advancedActiveCount
        ? [
            { divider: true },
            {
              id: "clear-advanced",
              label: "清除進階篩選",
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

  const handleListingToggle = (p, next) => {
    if (next) {
      handleAdd(p.id);
      return;
    }
    setConfirmRemove(p);
  };

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
              <p className="text-base sm:text-xl font-bold text-slate-800 tabular-nums">
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
                    <h2 className="text-base font-bold text-slate-800">商品池</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      依國家與條件篩選後加入店鋪 · 共{" "}
                      {loading ? "…" : poolList.length} 項
                      {!loading && poolList.length > 0
                        ? ` · 第 ${safePoolPage} / ${poolTotalPages} 頁`
                        : ""}
                    </p>
                  </div>
                  <PartnerButton asChild size="default">
                    <Link
                      href="/partner/products?tab=products"
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5"
                    >
                      <MaterialIcon name="price_change" size={18} />
                      管理已上架商品
                    </Link>
                  </PartnerButton>
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

                {/* 圖二風格：白底描邊下拉 */}
                <div className="flex flex-wrap items-center gap-2">
                  <ShopifyDropdown
                    label={
                      countryFilter
                        ? `國家：${countryLabel}`
                        : "國家分類"
                    }
                    align="left"
                    items={countryMenuItems}
                  />
                  <ShopifyDropdown
                    label={
                      advancedActiveCount
                        ? `進階篩選（${advancedActiveCount}）`
                        : "進階篩選"
                    }
                    align="left"
                    items={advancedMenuItems}
                  />
                  <ShopifyDropdown
                    label={`排序：${sortLabel}`}
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
                  <LoadingIndicator
                    layout="center"
                    label="載入商品池中..."
                    className="py-10"
                  />
                ) : poolList.length === 0 ? (
                  <p className="py-10 text-center text-slate-400 text-sm">
                    目前沒有符合條件的商品
                  </p>
                ) : (
                  poolPageItems.map((p) => (
                    <PoolProductCard
                      key={p.id}
                      p={p}
                      busyId={busyId}
                      onToggle={handleListingToggle}
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
                      <th className="px-5 py-3 text-center font-bold">上架</th>
                      <th className="px-5 py-3 text-center font-bold">定價</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <LoadingIndicator
                            layout="center"
                            label="載入商品池中..."
                          />
                        </td>
                      </tr>
                    ) : poolList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          目前沒有符合條件的商品
                        </td>
                      </tr>
                    ) : (
                      poolPageItems.map((p) => (
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
                          <td className="px-5 py-4 text-right font-bold text-[#1E4AD1]">
                            +{fmt(p.profit)}
                          </td>
                          <td className="px-5 py-4 align-top">
                            <ListingPublishCell
                              p={p}
                              busyId={busyId}
                              onToggle={handleListingToggle}
                            />
                          </td>
                          <td className="px-5 py-4 text-center align-top">
                            {p.isListed ? (
                              <Link
                                href="/partner/products?tab=pricing"
                                className="text-xs border border-slate-300 rounded-sm px-3 py-1 text-slate-600 hover:border-[#1E4AD1] hover:text-[#1E4AD1] transition font-bold"
                              >
                                編輯定價
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && poolList.length > 0 ? (
                <ShopifyPagination
                  page={safePoolPage}
                  pageSize={POOL_PAGE_SIZE}
                  total={poolList.length}
                  onChange={setPoolPage}
                />
              ) : null}
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
                <h2 className="text-base font-bold text-slate-800">已上架商品</h2>
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
              <PartnerSelectMenu
                value={sortKey}
                onChange={setSortKey}
                options={SORT_OPTS.map((o) => ({
                  id: o.value,
                  label: o.label,
                }))}
                prefix="排序："
                className="w-full"
              />
            </div>

            <div className="md:hidden p-3 space-y-3 bg-slate-50/40">
              {loading ? (
                <LoadingIndicator layout="center" label="載入中..." className="py-10" />
              ) : listedList.length === 0 ? (
                <p className="py-10 text-center text-slate-400 text-sm px-4 leading-relaxed">
                  尚未上架任何商品，請至「商品池」選擇商品加入
                </p>
              ) : (
                listedList.map((p) => (
                  <ListedProductCard
                    key={p.id}
                    p={p}
                    busyId={busyId}
                    onToggle={handleListingToggle}
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
                    <th className="px-4 py-3 text-center font-bold">主站狀態</th>
                    <th className="px-4 py-3 text-center font-bold">上架</th>
                    <th className="px-4 py-3 text-center font-bold">定價</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <LoadingIndicator layout="center" label="載入中..." />
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
                        <td className="px-4 py-4 align-top text-right tabular-nums font-bold text-[#1E4AD1] whitespace-nowrap">
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
                        <td className="px-4 py-4 align-top text-center">
                          <ListingPublishCell
                            p={p}
                            busyId={busyId}
                            onToggle={handleListingToggle}
                          />
                        </td>
                        <td className="px-4 py-4 align-top text-center">
                          <Link
                            href="/partner/products?tab=pricing"
                            className="text-xs border border-slate-300 rounded-sm px-2.5 py-1 text-slate-600 hover:border-[#1E4AD1] hover:text-[#1E4AD1] font-bold"
                          >
                            編輯定價
                          </Link>
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
        <PartnerDialog
          open={!!confirmRemove}
          onClose={() => !busyId && setConfirmRemove(null)}
          title="確認下架商品"
          description={`下架後，「${confirmRemove.name}」將不再顯示於您的賣場。`}
          icon="warning"
          footer={
            <>
              <PartnerButton
                type="button"
                variant="secondary"
                disabled={!!busyId}
                onClick={() => setConfirmRemove(null)}
              >
                取消
              </PartnerButton>
              <PartnerButton
                type="button"
                variant="destructive"
                disabled={!!busyId}
                onClick={() => handleRemove(confirmRemove.id)}
                className="min-w-[6.5rem]"
              >
                {busyId === confirmRemove.id ? (
                  <>
                    <QuarterRing size="xs" className="text-white" />
                    下架中…
                  </>
                ) : (
                  "確定下架"
                )}
              </PartnerButton>
            </>
          }
        >
          <p className="text-sm font-semibold text-slate-800">確定要下架嗎？此操作無法復原。</p>
        </PartnerDialog>
      )}
    </PartnerAdminLayout>
  );
}
