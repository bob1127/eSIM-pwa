import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import { usePartnerSession } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import MaterialIcon from "@/components/MaterialIcon";
import { fmt } from "@/components/partner/DobermanWidgets";

const TABS = [
  { id: "pool", label: "商品池", icon: "inventory" },
  { id: "listed", label: "已上架管理", icon: "check_circle" },
];

const SORT_OPTS = [
  { value: "newest", label: "最新上架" },
  { value: "name_asc", label: "名稱 A→Z" },
  { value: "price_asc", label: "底價（低→高）" },
  { value: "price_desc", label: "底價（高→低）" },
];

function getCategory(name = "") {
  const m = name.match(/^(JP|KR|US|CN|TH|SG|HK|TW|EU|AU)/i);
  if (m) return m[1].toUpperCase();
  if (name.includes("日本")) return "日本";
  if (name.includes("韓國")) return "韓國";
  if (name.includes("美國")) return "美國";
  return "eSIM";
}

function sortProducts(list, sortKey) {
  const arr = [...list];
  if (sortKey === "name_asc") return arr.sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));
  if (sortKey === "price_asc") return arr.sort((a, b) => a.minB2B - b.minB2B);
  if (sortKey === "price_desc") return arr.sort((a, b) => b.minB2B - a.minB2B);
  return arr.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export default function PartnerCatalogPage() {
  const { store } = usePartnerSession();
  const [activeTab, setActiveTab] = useState("pool");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [listedMap, setListedMap] = useState({});
  const [search, setSearch] = useState("");
  const [poolFilter, setPoolFilter] = useState("all");
  const [listedFilter, setListedFilter] = useState("all");
  const [sortKey, setSortKey] = useState("newest");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
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
          const isListed = listedMedusaIds.has(p.medusa_product_id);
          return {
            id: p.medusa_product_id,
            medusaProductId: p.medusa_product_id,
            handle: p.handle,
            name: p.name,
            description: p.description,
            category: getCategory(p.name),
            planCount: p.planCount,
            minB2B,
            sellPrice,
            profit: sellPrice - minB2B,
            createdAt: p.created_at || "",
            listedAt: map[p.medusa_product_id]?.created_at || null,
            isListed,
            supabaseProductId: map[p.medusa_product_id]?.product_id || null,
          };
        });

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

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  const poolList = useMemo(() => {
    let list = products;
    if (poolFilter === "unlisted") list = list.filter((p) => !p.isListed);
    if (poolFilter === "listed") list = list.filter((p) => p.isListed);
    if (categoryFilter) list = list.filter((p) => p.category === categoryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q));
    }
    return sortProducts(list, sortKey);
  }, [products, poolFilter, categoryFilter, search, sortKey]);

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
      total: products.length,
      listed: products.filter((p) => p.isListed).length,
      unlisted: products.filter((p) => !p.isListed).length,
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
                  ? "border-[#1a56db] text-[#1a56db] bg-blue-50/30"
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
            className={`px-5 py-4 flex items-center gap-3 ${i < 2 ? "border-r border-slate-200" : ""}`}
          >
            <MaterialIcon name={s.icon} size={24} className="text-[#1a56db]" />
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-black text-slate-800">
                {loading ? "…" : s.value}
                <span className="text-xs font-bold text-slate-400 ml-1">{s.unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-sm">
            {error}
          </div>
        )}
        {/* ── Tab 1：商品池（生徒一覧風格） ── */}
        {activeTab === "pool" && (
          <>
            <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
              {/* 工具列 */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-5 py-4 border-b border-slate-200">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <span className="text-xs font-bold text-slate-500 shrink-0">篩選條件：</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1a56db] border border-[#1a56db] rounded-sm px-3 py-1.5 hover:bg-blue-50"
                  >
                    進階篩選
                    <MaterialIcon name="expand_more" size={14} />
                  </button>
                  {categoryFilter && (
                    <span className="inline-flex items-center gap-1 text-xs bg-[#1a56db] text-white px-2.5 py-1 rounded-sm font-bold">
                      {categoryFilter}
                      <button type="button" onClick={() => setCategoryFilter("")}>
                        <MaterialIcon name="close" size={12} />
                      </button>
                    </span>
                  )}
                  {categories.slice(0, 4).map((c) =>
                    categoryFilter !== c ? (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategoryFilter(c)}
                        className="text-xs border border-slate-300 text-slate-600 px-2.5 py-1 rounded-sm hover:border-[#1a56db] hover:text-[#1a56db] font-bold"
                      >
                        {c}
                      </button>
                    ) : null,
                  )}
                </div>
                <Link
                  href="/partner/products"
                  className="inline-flex items-center gap-1.5 bg-[#1a56db] hover:bg-[#1e40af] text-white text-sm font-bold px-5 py-2 rounded-sm transition shrink-0"
                >
                  <MaterialIcon name="price_change" size={18} />
                  管理已上架商品
                </Link>
              </div>

              {/* 篩選 + 排序列 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xs text-slate-500 font-bold">顯示切換</span>
                  {[
                    ["all", "全部商品"],
                    ["unlisted", "未上架"],
                    ["listed", "已上架"],
                  ].map(([v, l]) => (
                    <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="pool_filter"
                        checked={poolFilter === v}
                        onChange={() => setPoolFilter(v)}
                        className="accent-[#1a56db] w-3.5 h-3.5"
                      />
                      <span className="text-xs text-slate-700">{l}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <MaterialIcon
                      name="search"
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="搜尋商品名稱..."
                      className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-sm w-44 focus:border-[#1a56db] outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <MaterialIcon name="swap_vert" size={14} />
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value)}
                      className="text-xs border border-slate-300 rounded-sm px-2 py-1 focus:outline-none focus:border-[#1a56db]"
                    >
                      {SORT_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 表格 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
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
                      poolList.map((p, i) => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-800">{p.name}</p>
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
                          <td className="px-5 py-4 text-right text-slate-600">{fmt(p.minB2B)}</td>
                          <td className="px-5 py-4 text-right font-bold text-slate-800">
                            {fmt(p.sellPrice)}
                          </td>
                          <td className="px-5 py-4 text-right font-black text-[#1a56db]">
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
                          <td className="px-5 py-4 text-center relative">
                            <div className="flex items-center justify-center gap-2">
                              {!p.isListed ? (
                                <button
                                  type="button"
                                  disabled={busyId === p.id}
                                  onClick={() => handleAdd(p.id)}
                                  className="inline-flex items-center gap-1 text-xs font-bold bg-[#1a56db] text-white px-3 py-1.5 rounded-sm hover:bg-[#1e40af] disabled:opacity-50 transition"
                                >
                                  <MaterialIcon name="add" size={14} />
                                  加入店鋪
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 font-bold">已加入</span>
                              )}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenMenu(openMenu === i ? null : i)}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-400"
                                >
                                  <MaterialIcon name="more_vert" size={18} />
                                </button>
                                {openMenu === i && (
                                  <div className="absolute right-0 top-8 z-30 w-40 bg-white border border-slate-200 shadow-lg rounded-sm py-1 text-xs text-left">
                                    {!p.isListed && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleAdd(p.id);
                                          setOpenMenu(null);
                                        }}
                                        className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-2"
                                      >
                                        <MaterialIcon name="add_shopping_cart" size={14} />
                                        加入店鋪
                                      </button>
                                    )}
                                    {p.isListed && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setConfirmRemove(p);
                                          setOpenMenu(null);
                                        }}
                                        className="w-full px-4 py-2 hover:bg-red-50 text-red-600 font-bold flex items-center gap-2"
                                      >
                                        <MaterialIcon name="link_off" size={14} />
                                        停止連結
                                      </button>
                                    )}
                                    <Link
                                      href="/partner/products"
                                      className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-2"
                                      onClick={() => setOpenMenu(null)}
                                    >
                                      <MaterialIcon name="price_change" size={14} />
                                      編輯定價
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmRemove(p);
                                        setOpenMenu(null);
                                      }}
                                      className="w-full px-4 py-2 hover:bg-red-50 text-red-600 font-bold flex items-center gap-2 border-t border-slate-100"
                                    >
                                      <MaterialIcon name="delete" size={14} />
                                      移除商品
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-slate-400 px-1">
              商品池即時同步 Medusa 主站商品。底價依 Medusa metadata{" "}
              <code className="text-[10px] bg-slate-100 px-1">b2b_cost_rate</code> 或變體{" "}
              <code className="text-[10px] bg-slate-100 px-1">b2b_price</code> 計算。
              預估售價依您目前加價率 {markup}% 計算，可至
              <Link href="/partner/settings" className="text-[#1a56db] font-bold mx-1 hover:underline">
                商店設定
              </Link>
              調整，或至商品管理個別修改。
              {pricingHint && <span className="block mt-1 text-slate-400">{pricingHint}</span>}
            </p>
          </>
        )}

        {/* ── Tab 2：已上架管理（アカウント一覧風格） ── */}
        {activeTab === "listed" && (
          <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-black text-slate-800">已上架商品</h2>
              <Link
                href="/partner/products"
                className="inline-flex items-center gap-1.5 bg-[#1a56db] hover:bg-[#1e40af] text-white text-sm font-bold px-4 py-2 rounded-sm transition"
              >
                <MaterialIcon name="add" size={18} />
                前往定價管理
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500 font-bold">顯示切換</span>
                {[["all", "全部已上架"]].map(([v, l]) => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="listed_filter"
                      checked={listedFilter === v}
                      onChange={() => setListedFilter(v)}
                      className="accent-[#1a56db] w-3.5 h-3.5"
                    />
                    <span className="text-xs text-slate-700">{l}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MaterialIcon
                    name="search"
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜尋商品名稱..."
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-sm w-44 focus:border-[#1a56db] outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <MaterialIcon name="swap_vert" size={14} />
                  <span>排序</span>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="text-xs border border-slate-300 rounded-sm px-2 py-1 focus:outline-none"
                  >
                    {SORT_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold">商品名稱</th>
                    <th className="px-5 py-3 text-center font-bold">方案數</th>
                    <th className="px-5 py-3 text-right font-bold">底價</th>
                    <th className="px-5 py-3 text-right font-bold">預設售價</th>
                    <th className="px-5 py-3 text-right font-bold">預估分潤</th>
                    <th className="px-5 py-3 text-center font-bold">上架狀態</th>
                    <th className="px-5 py-3 text-center font-bold">啟用 / 停用</th>
                    <th className="px-5 py-3 text-center font-bold">上架日期</th>
                    <th className="px-5 py-3 text-center font-bold">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        載入中...
                      </td>
                    </tr>
                  ) : listedList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        尚未上架任何商品，請至「商品池」Tab 選擇商品加入
                      </td>
                    </tr>
                  ) : (
                    listedList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.category}</p>
                        </td>
                        <td className="px-5 py-4 text-center font-bold">{p.planCount}</td>
                        <td className="px-5 py-4 text-right text-slate-600">{fmt(p.minB2B)}</td>
                        <td className="px-5 py-4 text-right font-bold">{fmt(p.sellPrice)}</td>
                        <td className="px-5 py-4 text-right font-black text-[#1a56db]">
                          +{fmt(p.profit)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-sm bg-[#e0f2fe] text-[#0369a1]">
                            已開設
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="inline-flex rounded-sm overflow-hidden border border-slate-200 text-xs font-bold">
                            <span className="px-3 py-1 bg-[#1a56db] text-white">啟用</span>
                            <button
                              type="button"
                              onClick={() => setConfirmRemove(p)}
                              className="px-3 py-1 bg-white text-slate-500 hover:bg-slate-50 border-l border-slate-200"
                            >
                              停用
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center text-xs text-slate-500">
                          {fmtDate(p.listedAt)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href="/partner/products"
                              className="text-xs border border-slate-300 rounded-sm px-3 py-1 text-slate-600 hover:border-[#1a56db] hover:text-[#1a56db] font-bold"
                            >
                              編輯定價
                            </Link>
                            <button
                              type="button"
                              onClick={() => setConfirmRemove(p)}
                              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
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
                onClick={() => setConfirmRemove(null)}
                className="px-5 py-2 text-sm text-slate-600 border border-slate-300 rounded-sm hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={busyId === confirmRemove.id}
                onClick={() => handleRemove(confirmRemove.id)}
                className="px-5 py-2 text-sm font-bold text-white bg-[#1a56db] rounded-sm hover:bg-[#1e40af] disabled:opacity-50"
              >
                確定移除
              </button>
            </div>
          </div>
        </div>
      )}
    </PartnerAdminLayout>
  );
}
