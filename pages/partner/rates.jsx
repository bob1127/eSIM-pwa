import { useEffect, useMemo, useState } from "react";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import MaterialIcon from "@/components/MaterialIcon";
import {
  ShopifyTabs,
  ShopifyDropdown,
  ShopifyPagination,
} from "@/components/partner/ShopifyControls";
import { usePartnerSession } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import { PARTNER_UI } from "@/lib/partnerUi";
import { SHOPIFY_UI, SHOPIFY_BADGE } from "@/lib/shopifyUi";
import { resolveMedusaImageUrl } from "@/lib/resolveMedusaImageUrl";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { SITE_URL } from "@/lib/seo.config";
import PartnerSelectMenu from "@/components/partner/PartnerSelectMenu";
import { partnerButtonVariants, PARTNER_PILL_RADIUS_STYLE } from "@/components/partner/ui/PartnerButton";
import { cn } from "@/lib/utils";
import {
  buildCountryGroupsFromProducts,
  inferProductCountry,
} from "@/lib/partnerNavCountries";

/** 分潤梯次：方便夥伴辨識優先推廣方案 */
const HIGH_COMMISSION_PCT = 35;
const MID_COMMISSION_PCT = 25;
const PAGE_SIZE = 20;

const TABS = [
  { id: "all", label: "全部" },
  { id: "high", label: `高分潤 ≥${HIGH_COMMISSION_PCT}%` },
  { id: "with_discount", label: "已開放折扣" },
  { id: "without_discount", label: "未開放折扣" },
];

function productMaxRate(p) {
  const vals = p.carriers
    .map((c) => c.partner_rate_percent)
    .filter((n) => n != null);
  return vals.length ? Math.max(...vals) : -1;
}

function carriersByRateDesc(carriers) {
  return [...carriers].sort(
    (a, b) => (b.partner_rate_percent ?? -1) - (a.partner_rate_percent ?? -1),
  );
}

function commissionTier(rate) {
  if (rate == null || rate < 0) return "none";
  if (rate >= HIGH_COMMISSION_PCT) return "high";
  if (rate >= MID_COMMISSION_PCT) return "mid";
  return "default";
}

function buildProductPromoUrl(referralCode, product) {
  const base = String(SITE_URL || "").replace(/\/$/, "");
  const code = String(referralCode || "").trim().toLowerCase();
  if (!base || !code) return "";
  const path =
    product.category_handle && product.handle
      ? `/product/${product.category_handle}/${product.handle}/`
      : "/";
  const url = new URL(path, base);
  url.searchParams.set("ref", code);
  return url.toString();
}

/** 供 inferProductCountry 使用（title → name、category_handle → categories） */
function productCountryInput(p) {
  return {
    name: p.title,
    handle: p.handle,
    categories: p.category_handle
      ? [{ handle: p.category_handle, name: p.category_handle }]
      : [],
  };
}

function resolveProductCountry(p) {
  return (
    inferProductCountry(productCountryInput(p)) || {
      key: "other",
      label: "其他",
    }
  );
}

/** 分潤％視覺：梯次標籤 + 徽章 */
function CommissionCell({ rate }) {
  if (rate == null) {
    return <span style={{ color: "#c9cccf" }}>—</span>;
  }
  const tier = commissionTier(rate);
  const tone =
    tier === "high" ? "warning" : tier === "mid" ? "info" : "neutral";
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      {tier === "high" ? (
        <span
          className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
          style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
        >
          高分潤
        </span>
      ) : null}
      <Badge tone={tone}>{rate}%</Badge>
    </div>
  );
}

function ProductThumb({ product }) {
  if (product.thumbnail) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolveMedusaImageUrl(product.thumbnail) || product.thumbnail}
        alt=""
        className="w-10 h-10 rounded-md object-cover shrink-0"
        style={{ backgroundColor: SHOPIFY_UI.canvasBg }}
      />
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
      style={{ backgroundColor: SHOPIFY_UI.canvasBg }}
    >
      <MaterialIcon name="sim_card" size={18} style={{ color: SHOPIFY_UI.textTertiary }} />
    </div>
  );
}

/** 每列都顯示完整商品名（條列式，不合併儲存格） */
function ProductNameCell({ product, promoUrl }) {
  const country = resolveProductCountry(product).label;
  return (
    <div className="flex items-start gap-3 min-w-[220px] max-w-[320px]">
      <ProductThumb product={product} />
      <div className="min-w-0">
        {promoUrl ? (
          <a
            href={promoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold leading-snug hover:underline inline-flex items-start gap-1 group"
            style={{ color: SHOPIFY_UI.accentBg }}
            title="開啟商品頁（已帶您的 ref）"
          >
            <span className="min-w-0">{product.title}</span>
            <MaterialIcon
              name="open_in_new"
              size={14}
              className="shrink-0 mt-0.5 opacity-60 group-hover:opacity-100"
            />
          </a>
        ) : (
          <p
            className="text-sm font-bold leading-snug"
            style={{ color: SHOPIFY_UI.textPrimary }}
          >
            {product.title}
          </p>
        )}
        <p
          className="text-[10px] font-semibold mt-0.5"
          style={{ color: SHOPIFY_UI.textTertiary }}
        >
          {country}
          {product.handle ? ` · ${product.handle}` : ""}
        </p>
      </div>
    </div>
  );
}

function DiscountCell({ carrier: c, discountEnabled }) {
  if (!discountEnabled) {
    return <Badge tone="neutral">未開放</Badge>;
  }
  if (c.referral_discount_percent == null) {
    return <span style={{ color: "#c9cccf" }}>—</span>;
  }
  return (
    <Badge tone="success">{c.referral_discount_percent}%</Badge>
  );
}

/** Shopify Polaris 風格的膠囊徽章：色塊 + 圓點 + 文字 */
function Badge({ tone = "neutral", children }) {
  const t = SHOPIFY_BADGE[tone] || SHOPIFY_BADGE.neutral;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums"
      style={{ backgroundColor: t.bg, color: t.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: t.dot }}
      />
      {children}
    </span>
  );
}

/** 獨立白卡統計（比照 Shopify Products 頁 Total Products / Revenue 卡片） */
function StatCard({ label, value, sub }) {
  return (
    <div
      className="flex-1 min-w-[140px] rounded-lg px-4 py-3.5"
      style={{ backgroundColor: SHOPIFY_UI.cardBg, border: `1px solid ${SHOPIFY_UI.cardBorder}` }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color: SHOPIFY_UI.textTertiary }}
      >
        {label}
      </p>
      <p
        className="text-xl sm:text-[24px] font-bold mt-1 tabular-nums"
        style={{ color: SHOPIFY_UI.textPrimary }}
      >
        {value}
      </p>
      {sub ? (
        <p className="text-[11px] mt-0.5" style={{ color: SHOPIFY_UI.textTertiary }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function toCsvValue(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function PartnerRatesPage() {
  const { partner } = usePartnerSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [discountEnabled, setDiscountEnabled] = useState(true);
  const [defaultPartnerRate, setDefaultPartnerRate] = useState(25);
  const [defaultDiscount, setDefaultDiscount] = useState(10);
  const [query, setQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [tab, setTab] = useState("all");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [toast, setToast] = useState("");
  const [catalogMeta, setCatalogMeta] = useState({
    productCount: 0,
    lineCount: 0,
    catalogVersion: null,
  });

  const referralCode = partner?.referral_code || partner?.slug || "";

  const load = async () => {
    if (!partner) return;
    if (partner.cooperation_model !== "referral") {
      setLoading(false);
      setError("此頁面僅供專屬連結夥伴使用");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("請重新登入");

      const res = await fetch(
        `/api/partner/product-terms/?v=2&_=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Cache-Control": "no-cache",
          },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "讀取失敗");
      const rows = data.products || [];
      setProducts(rows);
      setCatalogMeta({
        productCount: Number(data.product_count) || rows.length,
        lineCount: Number(data.line_count) || 0,
        catalogVersion: data.catalog_version ?? null,
      });
      setDiscountEnabled(data.discount_enabled !== false);
      setDefaultPartnerRate(Number(data.default_partner_rate) || 25);
      setDefaultDiscount(
        data.default_referral_discount_percent != null
          ? Number(data.default_referral_discount_percent)
          : 10,
      );
      setSelected(new Set());
    } catch (err) {
      setError(err.message || "讀取失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [query, countryFilter, tab, sortDir]);

  const countryOptions = useMemo(() => {
    const groups = buildCountryGroupsFromProducts(
      products.map(productCountryInput),
    );
    return [
      { id: "all", label: "全部國家" },
      ...groups.map((g) => ({
        id: g.key,
        label: `${g.label}（${g.count}）`,
      })),
    ];
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter(
      (p) =>
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.carriers.some((c) => c.carrier?.toLowerCase().includes(q)),
    );
    if (countryFilter !== "all") {
      list = list.filter(
        (p) => resolveProductCountry(p).key === countryFilter,
      );
    }
    if (tab === "high") {
      list = list.filter((p) =>
        p.carriers.some(
          (c) =>
            c.partner_rate_percent != null &&
            c.partner_rate_percent >= HIGH_COMMISSION_PCT,
        ),
      );
    } else if (tab === "with_discount") {
      list = list.filter((p) =>
        p.carriers.some(
          (c) => discountEnabled && Number(c.referral_discount_percent) > 0,
        ),
      );
    } else if (tab === "without_discount") {
      list = list.filter((p) =>
        p.carriers.every(
          (c) => !discountEnabled || !(Number(c.referral_discount_percent) > 0),
        ),
      );
    }
    list = [...list].sort((a, b) => {
      const diff = productMaxRate(a) - productMaxRate(b);
      return sortDir === "desc" ? -diff : diff;
    });
    return list;
  }, [products, query, tab, sortDir, countryFilter, discountEnabled]);

  const flatRows = useMemo(() => {
    const rows = filtered.flatMap((p) =>
      carriersByRateDesc(p.carriers).map((c) => ({
        key: `${p.id}::${c.carrier}`,
        product: p,
        carrier: c,
        rate: c.partner_rate_percent ?? -1,
      })),
    );
    if (tab === "high") {
      return rows.filter((r) => r.rate >= HIGH_COMMISSION_PCT);
    }
    return rows.sort((a, b) =>
      sortDir === "desc" ? b.rate - a.rate : a.rate - b.rate,
    );
  }, [filtered, tab, sortDir]);

  const totalPages = Math.max(1, Math.ceil(flatRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedFlatRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return flatRows.slice(start, start + PAGE_SIZE);
  }, [flatRows, safePage]);

  const stats = useMemo(() => {
    const carrierRows = products.reduce((s, p) => s + p.carriers.length, 0);
    const rates = products.flatMap((p) =>
      p.carriers.map((c) => c.partner_rate_percent).filter((n) => n != null),
    );
    const discounts = products.flatMap((p) =>
      p.carriers
        .map((c) => c.referral_discount_percent)
        .filter((n) => n != null),
    );
    const highCount = rates.filter((n) => n >= HIGH_COMMISSION_PCT).length;
    const maxRate = rates.length ? Math.max(...rates) : null;
    const avg = (arr) =>
      arr.length
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : null;
    return {
      productCount: products.length,
      carrierRows,
      maxRate,
      highCount,
      avgRate: avg(rates),
      avgDiscount: avg(discounts),
    };
  }, [products]);

  const copyPromoLink = async (product) => {
    const url = buildProductPromoUrl(referralCode, product);
    if (!url) {
      setToast("無法產生推廣連結");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("已複製商品推廣連結");
    } catch {
      setToast("複製失敗，請手動複製");
    }
  };

  const allChecked = flatRows.length > 0 && selected.size === flatRows.length;
  const someChecked = selected.size > 0 && !allChecked;

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(flatRows.map((r) => r.key)));
  };

  const toggleRow = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedRows = flatRows.filter((r) => selected.has(r.key));

  const exportCsv = (rows) => {
    const header = ["商品", "電信商", "分潤％", "旅客折扣％"];
    const body = rows.map((r) => [
      r.product.title,
      r.carrier.carrier,
      r.carrier.partner_rate_percent != null ? `${r.carrier.partner_rate_percent}%` : "",
      discountEnabled && r.carrier.referral_discount_percent != null
        ? `${r.carrier.referral_discount_percent}%`
        : "",
    ]);
    downloadCsv(`方案分潤_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body]);
    setToast(`已匯出 ${rows.length} 筆`);
  };

  const copySummary = async (rows) => {
    const text = rows
      .map(
        (r) =>
          `${r.product.title} - ${r.carrier.carrier}：分潤 ${
            r.carrier.partner_rate_percent != null ? `${r.carrier.partner_rate_percent}%` : "—"
          }／折扣 ${
            discountEnabled && r.carrier.referral_discount_percent != null
              ? `${r.carrier.referral_discount_percent}%`
              : "—"
          }`,
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setToast(`已複製 ${rows.length} 筆摘要`);
    } catch {
      setToast("複製失敗，請手動選取文字複製");
    }
  };

  const hasData = !loading && !error && products.length > 0;

  return (
    <PartnerAdminLayout title="方案分潤一覽">
      <div className={`${PARTNER_UI.pageFlush} flex flex-col flex-1 min-h-0`}>
        {/* 頁首：標題 + 說明 + 動作按鈕（比照 Shopify Products 頁頭） */}
        <div
          className="px-4 sm:px-6 pt-5 pb-4"
          style={{ backgroundColor: SHOPIFY_UI.cardBg, borderBottom: `1px solid ${SHOPIFY_UI.cardBorder}` }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ color: SHOPIFY_UI.textPrimary }}
              >
                方案分潤一覽
              </h1>
              <p
                className="text-xs sm:text-sm mt-1 leading-relaxed max-w-2xl"
                style={{ color: SHOPIFY_UI.textSecondary }}
              >
                總部可針對「商品 × 電信商」另外提高分潤％；未特別標示者適用您的預設分潤 {defaultPartnerRate}%
                {discountEnabled
                  ? `、旅客折扣 ${defaultDiscount}%`
                  : ""}
                。列表含主站全部可售方案，建議優先推廣 ≥{HIGH_COMMISSION_PCT}% 者。
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ShopifyDropdown
                label="匯出"
                icon="download"
                disabled={!flatRows.length}
                items={[
                  {
                    id: "csv-all",
                    label: "匯出全部 CSV",
                    icon: "download",
                    disabled: !flatRows.length,
                    onClick: () => exportCsv(flatRows),
                  },
                  {
                    id: "csv-selected",
                    label: selected.size
                      ? `匯出所選 ${selected.size} 筆`
                      : "先勾選方案再匯出",
                    icon: "checklist",
                    disabled: !selected.size,
                    onClick: () => exportCsv(selectedRows),
                  },
                  { divider: true },
                  {
                    id: "copy",
                    label: selected.size
                      ? `複製所選摘要（${selected.size}）`
                      : "複製全部摘要",
                    icon: "content_copy",
                    disabled: !flatRows.length,
                    onClick: () =>
                      copySummary(selected.size ? selectedRows : flatRows),
                  },
                ]}
              />
              <ShopifyDropdown
                label="更多操作"
                items={[
                  {
                    id: "refresh",
                    label: loading ? "重新整理中…" : "重新整理",
                    icon: "refresh",
                    disabled: loading,
                    onClick: load,
                  },
                ]}
              />
            </div>
          </div>

          {!discountEnabled ? (
            <div
              className="mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs font-semibold"
              style={{ backgroundColor: SHOPIFY_BADGE.warning.bg, color: SHOPIFY_BADGE.warning.text }}
            >
              <MaterialIcon name="info" size={16} className="shrink-0 mt-0.5" />
              您的專屬折扣碼目前為關閉狀態：連結仍可歸因分潤，但旅客不會有折扣。
            </div>
          ) : (
            <div
              className="mt-3 flex items-start gap-2 rounded-lg px-3.5 py-2.5 text-xs leading-relaxed"
              style={{
                backgroundColor: "rgba(30, 74, 209, 0.06)",
                border: `1px solid rgba(30, 74, 209, 0.15)`,
                color: SHOPIFY_UI.textSecondary,
              }}
            >
              <MaterialIcon
                name="campaign"
                size={18}
                className="shrink-0 mt-0.5"
                style={{ color: SHOPIFY_UI.accentBg }}
              />
              <span>
                <strong style={{ color: SHOPIFY_UI.textPrimary }}>推廣小提示：</strong>
                點「分潤％」可從高到低排序；標示
                <span className="font-bold mx-1" style={{ color: "#92400e" }}>
                  高分潤
                </span>
                為優先推廣。可複製單品連結（已帶您的 ref）直接貼文。
              </span>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 flex-1 overflow-auto space-y-4">
          {/* 統計卡片列 */}
          {hasData ? (
            <div className="flex flex-wrap sm:flex-nowrap gap-3">
              <StatCard label="可售商品" value={stats.productCount} />
              <StatCard
                label="最高分潤"
                value={stats.maxRate != null ? `${stats.maxRate}%` : "—"}
                sub={
                  stats.highCount > 0
                    ? `${stats.highCount} 個方案 ≥${HIGH_COMMISSION_PCT}%`
                    : undefined
                }
              />
              <StatCard
                label="電信商方案數"
                value={stats.carrierRows}
              />
              <StatCard
                label="預設分潤／折扣"
                value={`${defaultPartnerRate}%`}
                sub={
                  discountEnabled
                    ? `旅客折扣 ${defaultDiscount}%（未特別標示者）`
                    : "折扣碼未開放"
                }
              />
            </div>
          ) : null}

          {hasData && catalogMeta.catalogVersion !== 2 ? (
            <div
              className="rounded-lg px-3.5 py-2.5 text-xs font-semibold leading-relaxed"
              style={{
                backgroundColor: SHOPIFY_BADGE.warning.bg,
                color: SHOPIFY_BADGE.warning.text,
              }}
            >
              偵測到舊版分潤資料（僅顯示有個別設定的商品）。請確認網址為{" "}
              <strong>http://localhost:3000</strong> 開發站，或重新整理；正式站需部署新版後才會顯示全部{" "}
              {catalogMeta.productCount > 0 ? `${catalogMeta.productCount} 筆` : "可售商品"}。
            </div>
          ) : null}

          {hasData && catalogMeta.catalogVersion === 2 ? (
            <p className="text-[11px]" style={{ color: SHOPIFY_UI.textTertiary }}>
              已載入 {stats.productCount} 個商品、{stats.carrierRows} 個電信商方案列
              {flatRows.length !== stats.carrierRows
                ? `（篩選後 ${flatRows.length} 列）`
                : ""}
              。
            </p>
          ) : null}

          {/* 標籤列（比照 Shopify All / Active / Draft 分頁籤） */}
          {hasData ? (
            <ShopifyTabs tabs={TABS} value={tab} onChange={setTab} />
          ) : null}

          {/* 搜尋 + 排序列（比照 Shopify 搜尋／篩選／排序列） */}
          {hasData ? (
            <div
              className="flex flex-wrap items-center gap-2 rounded-lg px-3.5 py-2.5"
              style={{ backgroundColor: SHOPIFY_UI.cardBg, border: `1px solid ${SHOPIFY_UI.cardBorder}` }}
            >
              <MaterialIcon name="search" size={18} style={{ color: SHOPIFY_UI.textTertiary }} className="shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋商品名稱或電信商…"
                className="flex-1 text-sm outline-none min-w-[140px] bg-transparent"
                style={{ color: SHOPIFY_UI.textPrimary }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  style={{ color: SHOPIFY_UI.textTertiary }}
                  className="shrink-0"
                >
                  <MaterialIcon name="close" size={16} />
                </button>
              ) : null}
              <div className="w-px h-5 shrink-0 hidden sm:block" style={{ backgroundColor: SHOPIFY_UI.cardBorder }} />
              <PartnerSelectMenu
                value={countryFilter}
                onChange={(id) => {
                  setCountryFilter(id);
                  setSelected(new Set());
                }}
                options={countryOptions}
                placeholder="全部國家"
                prefix=""
                icon="public"
                className="shrink-0 min-w-[132px]"
                triggerClassName="h-9 text-xs font-bold"
              />
              <div className="w-px h-5 shrink-0" style={{ backgroundColor: SHOPIFY_UI.cardBorder }} />
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                className="inline-flex items-center gap-1 text-xs font-bold shrink-0 whitespace-nowrap h-9 px-2 rounded-md hover:bg-slate-50 transition"
                style={{ color: SHOPIFY_UI.textSecondary }}
                title="依分潤％排序（高→低）"
              >
                <MaterialIcon
                  name={sortDir === "desc" ? "arrow_downward" : "arrow_upward"}
                  size={16}
                />
                分潤％
              </button>
            </div>
          ) : null}

          {/* 內容 */}
          {loading ? (
            <div
              className="rounded-lg py-16 flex items-center justify-center"
              style={{ backgroundColor: SHOPIFY_UI.cardBg, border: `1px solid ${SHOPIFY_UI.cardBorder}` }}
            >
              <LoadingIndicator layout="center" label="載入方案分潤中…" />
            </div>
          ) : error ? (
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{ backgroundColor: SHOPIFY_BADGE.critical.bg, color: SHOPIFY_BADGE.critical.text }}
            >
              {error}
            </div>
          ) : !products.length ? (
            <div
              className="rounded-lg px-4 py-14 text-center"
              style={{ backgroundColor: SHOPIFY_UI.cardBg, border: `1px solid ${SHOPIFY_UI.cardBorder}` }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: SHOPIFY_UI.canvasBg }}
              >
                <MaterialIcon name="percent" size={22} style={{ color: SHOPIFY_UI.textTertiary }} />
              </div>
              <p className="text-sm font-bold" style={{ color: SHOPIFY_UI.textSecondary }}>
                尚無可售商品
              </p>
              <p className="text-xs mt-1" style={{ color: SHOPIFY_UI.textTertiary }}>
                主站商品同步後會顯示在此；預設分潤 {defaultPartnerRate}%
                {discountEnabled ? `、預設折扣 ${defaultDiscount}%` : ""}
              </p>
            </div>
          ) : !flatRows.length ? (
            <div
              className="rounded-lg px-4 py-14 text-center text-sm"
              style={{ backgroundColor: SHOPIFY_UI.cardBg, border: `1px solid ${SHOPIFY_UI.cardBorder}`, color: SHOPIFY_UI.textTertiary }}
            >
              找不到符合條件的商品
            </div>
          ) : (
            <div
              className="rounded-lg overflow-hidden relative"
              style={{ backgroundColor: SHOPIFY_UI.cardBg, border: `1px solid ${SHOPIFY_UI.cardBorder}` }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr
                      className="text-[10px] uppercase tracking-wider"
                      style={{ backgroundColor: SHOPIFY_UI.canvasBg, borderBottom: `1px solid ${SHOPIFY_UI.cardBorder}`, color: SHOPIFY_UI.textTertiary }}
                    >
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-black cursor-pointer"
                          checked={allChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = someChecked;
                          }}
                          onChange={toggleAll}
                          aria-label="全選"
                        />
                      </th>
                      <th className="text-left font-bold px-4 py-3 min-w-[240px]">商品</th>
                      <th className="text-left font-bold px-4 py-3">電信商</th>
                      <th className="text-right font-bold px-4 py-3">您的分潤％</th>
                      <th className="text-right font-bold px-4 py-3">旅客折扣％</th>
                      <th className="text-right font-bold px-4 py-3 w-28">推廣</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFlatRows.map((row) => {
                      const { key, product: p, carrier: c } = row;
                      const checked = selected.has(key);
                      const promoUrl = buildProductPromoUrl(referralCode, p);
                      const isHigh =
                        c.partner_rate_percent != null &&
                        c.partner_rate_percent >= HIGH_COMMISSION_PCT;
                      return (
                        <tr
                          key={key}
                          className="transition"
                          style={{
                            borderBottom: `1px solid ${SHOPIFY_UI.divider}`,
                            backgroundColor: checked
                              ? "#f6f6f7"
                              : isHigh
                                ? "rgba(254, 243, 199, 0.35)"
                                : "transparent",
                          }}
                        >
                          <td className="px-4 py-3 align-top">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded accent-black cursor-pointer"
                              checked={checked}
                              onChange={() => toggleRow(key)}
                              aria-label={`選取 ${p.title} - ${c.carrier}`}
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <ProductNameCell product={p} promoUrl={promoUrl} />
                          </td>
                          <td
                            className="px-4 py-3 font-semibold align-top whitespace-nowrap"
                            style={{ color: SHOPIFY_UI.textSecondary }}
                          >
                            {c.carrier}
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <CommissionCell rate={c.partner_rate_percent} />
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <DiscountCell carrier={c} discountEnabled={discountEnabled} />
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                              {promoUrl ? (
                                <a
                                  href={promoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    partnerButtonVariants({
                                      variant: "secondary",
                                      size: "sm",
                                    }),
                                    "whitespace-nowrap",
                                  )}
                                  style={PARTNER_PILL_RADIUS_STYLE}
                                  title="開啟商品頁"
                                >
                                  <MaterialIcon name="open_in_new" size={14} />
                                  開啟
                                </a>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => copyPromoLink(p)}
                                className={cn(
                                  partnerButtonVariants({
                                    variant: "secondary",
                                    size: "sm",
                                  }),
                                  "whitespace-nowrap",
                                )}
                                style={PARTNER_PILL_RADIUS_STYLE}
                                title="複製含 ref 的商品連結"
                              >
                                <MaterialIcon name="link" size={14} />
                                複製
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {flatRows.length > 0 ? (
                <ShopifyPagination
                  page={safePage}
                  pageSize={PAGE_SIZE}
                  total={flatRows.length}
                  onChange={setPage}
                />
              ) : null}

              {/* 浮動批次操作列（比照 Shopify 選取列後的底部工具列） */}
              {selectedRows.length > 0 ? (
                <div className="sticky bottom-0 inset-x-0 flex justify-center pb-3 pt-2 pointer-events-none">
                  <div
                    className="pointer-events-auto flex items-center gap-1 rounded-full shadow-lg px-2 py-1.5"
                    style={{ backgroundColor: SHOPIFY_UI.chromeBg }}
                  >
                    <span className="text-white text-xs font-bold px-2.5">
                      已選取 {selectedRows.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => copySummary(selectedRows)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold text-white hover:bg-white/10 transition"
                    >
                      <MaterialIcon name="content_copy" size={14} />
                      複製摘要
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCsv(selectedRows)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold text-white hover:bg-white/10 transition"
                    >
                      <MaterialIcon name="download" size={14} />
                      匯出 CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white hover:bg-white/10 transition"
                      title="取消選取"
                    >
                      <MaterialIcon name="close" size={16} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Toast 通知 */}
      {toast ? (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div
            className="rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg"
            style={{ backgroundColor: SHOPIFY_UI.chromeBg }}
          >
            {toast}
          </div>
        </div>
      ) : null}
    </PartnerAdminLayout>
  );
}
