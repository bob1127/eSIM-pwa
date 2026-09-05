"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import MaterialIcon from "@/components/MaterialIcon";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import JekoPillButton from "@/components/ui/JekoPillButton";
import { useCart } from "@/components/context/CartContext";
import { sortUniqueDataAmountLabels } from "@/lib/dataAmountSort";
import { getVariationOptionAttrs } from "@/lib/dataAmountLabel";
import { mapMedusaStoreVariant } from "@/lib/formatMedusaProductPage";
import {
  buildHeroCountries,
  MOCK_COUNTRIES,
  searchHeroCountryPlans,
} from "@/lib/heroCountryPlans";
import { clientWarn } from "@/lib/clientLogger";
import { getCountryProductImagePath } from "@/lib/countryProductImages";
import {
  parseHotSaleTelecoms,
  isHotSaleTelecom,
} from "@/lib/productHotSale";
import {
  parseSubtitleByCarrier,
  stripInternalMarginFromSubtitle,
} from "@/lib/productSubtitleByCarrier";
import { resolveProductListingImage } from "@/lib/resolveProductListingImage";
import {
  buildDisplayTagsFromProduct,
  buildFilterTagsFromProduct,
} from "@/components/FilterSideBar";
import {
  canonicalCategoryHandle,
  categoryHandlesForProductFetch,
} from "@/lib/categoryAliases";
import {
  parseCarrierSpecsByCarrier,
  resolveCarrierSpecs,
  buildCarrierSpecDisplayItems,
  extractPreThrottleSpeedLabel,
  extractThrottleSpeedLabel,
} from "@/lib/productCarrierSpecs";
import DataExhaustReminderModal from "@/components/product/DataExhaustReminderModal";
import AuKddiApnReminderModal from "@/components/product/AuKddiApnReminderModal";
import IijApnReminderModal from "@/components/product/IijApnReminderModal";
import SoftBankApnReminderModal from "@/components/product/SoftBankApnReminderModal";
import CoveragePromptModal, {
  markCoverageAck,
} from "@/components/product/CoveragePromptModal";
import {
  getFirstPurchaseReminder,
  getPostCoverageReminder,
} from "@/lib/purchaseReminderGate";
import { resolveCoverageCountry } from "@/lib/networkCoverageCountries";

/** iOS UINavigationController 風格：純位移、不透明、同步進出 */
const IOS_EASE = [0.32, 0.72, 0, 1];
const slideTransition = { duration: 0.35, ease: IOS_EASE };

const slideVariants = {
  enter: (dir) => ({
    x: dir > 0 ? "100%" : "-33%",
    zIndex: dir > 0 ? 3 : 1,
  }),
  center: {
    x: 0,
    zIndex: 2,
  },
  exit: (dir) => ({
    x: dir > 0 ? "-33%" : "100%",
    zIndex: dir > 0 ? 1 : 3,
  }),
};

function formatPrice(amount) {
  if (amount == null || Number(amount) <= 0) return "—";
  return `NT$${Math.round(Number(amount)).toLocaleString("zh-TW")}`;
}

function daysLabel(days) {
  if (days == null || days === "") return "";
  const n = parseInt(days, 10);
  if (Number.isFinite(n)) return `${n} 天`;
  return String(days);
}

function uniqueTelecoms(variations = []) {
  const set = new Set();
  variations.forEach((v) => {
    const t = getVariationOptionAttrs(v).telecom;
    if (t) set.add(t);
  });
  return [...set];
}

function productFromMockPlan(plan, country) {
  const daysNum = parseInt(String(plan.days || ""), 10);
  const telecom = plan.telecom || country.name;
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    categoryHandle: plan.categoryHandle || country.handle,
    href:
      plan.href ||
      `/product/${plan.categoryHandle || country.handle}/${plan.slug}`,
    image: getCountryProductImagePath(country.handle),
    isReal: Boolean(plan.isReal),
    minPrice: plan.price || 0,
    telecoms: [telecom],
    displayTags: [telecom],
    hotSaleTelecoms: [],
    subtitleByCarrier: {},
    variations: [
      {
        id: plan.variant_id || plan.id,
        title: plan.name,
        sku: plan.sku || "",
        price: plan.price || 0,
        plan_id: plan.planId || "",
        attributes: {
          telecom,
          days: Number.isFinite(daysNum) ? daysNum : plan.days || null,
          data_amount: plan.data || null,
        },
      },
    ],
  };
}

function formatQuickBuyProduct(product, categoryHandle) {
  const handle = canonicalCategoryHandle(categoryHandle) || categoryHandle;
  const variations = (product.variants || [])
    .map((v) => mapMedusaStoreVariant(v, product.metadata || {}))
    .filter((v) => v?.id);
  const prices = variations
    .map((v) => Number(v.price) || 0)
    .filter((n) => n > 0);
  const telecoms = uniqueTelecoms(variations);
  const hotSaleTelecoms = parseHotSaleTelecoms(
    product.metadata?.hot_sale_telecoms,
  );
  const subtitleByCarrier = Object.fromEntries(
    Object.entries(
      parseSubtitleByCarrier(product.metadata?.subtitle_by_carrier),
    ).map(([k, v]) => [k, stripInternalMarginFromSubtitle(v)]),
  );
  const filterTags = buildFilterTagsFromProduct(product);
  const displayTags =
    buildDisplayTagsFromProduct(product, filterTags) || telecoms;
  const isTestPlan = !!(
    product.metadata?.microesim_test ||
    product.metadata?.test_plan ||
    String(product.title || "").includes("測試購買")
  );

  return {
    id: product.id,
    name: product.title,
    slug: product.handle,
    categoryHandle: handle,
    href: `/product/${handle}/${product.handle}`,
    image: resolveProductListingImage(product.thumbnail, {
      categorySlug: handle,
      handle: product.handle,
      categories: product.categories,
    }),
    isReal: true,
    minPrice: prices.length ? Math.min(...prices) : 0,
    telecoms: telecoms.length ? telecoms : displayTags,
    displayTags,
    hotSaleTelecoms,
    subtitleByCarrier,
    subtitle: stripInternalMarginFromSubtitle(product.subtitle || ""),
    description: product.description || "",
    carrier_specs_by_carrier:
      parseCarrierSpecsByCarrier(product.metadata?.carrier_specs_by_carrier) ||
      {},
    variations,
    isTestPlan,
  };
}

function attachProductsToCountries(countries, rawProducts = []) {
  const byCatId = new Map();
  const byCatHandle = new Map();

  rawProducts.forEach((product) => {
    (product.categories || []).forEach((cat) => {
      const handle = canonicalCategoryHandle(cat.handle || cat.id);
      const formatted = formatQuickBuyProduct(product, handle);
      const idList = byCatId.get(cat.id) || [];
      idList.push(formatted);
      byCatId.set(cat.id, idList);
      const handleList = byCatHandle.get(handle) || [];
      handleList.push(formatted);
      byCatHandle.set(handle, handleList);
    });
  });

  const dedupe = (list) => {
    const seen = new Set();
    return list.filter((p) => {
      if (!p?.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  };

  return countries.map((country) => {
    const handle = canonicalCategoryHandle(country.handle);
    const fromApi = dedupe([
      ...(byCatId.get(country.id) || []),
      ...(byCatHandle.get(handle) || []),
    ]);
    const products =
      fromApi.length > 0
        ? fromApi.sort((a, b) => Number(b.isTestPlan) - Number(a.isTestPlan))
        : (country.plans || []).map((p) => productFromMockPlan(p, country));
    return { ...country, handle, products, productsLoaded: fromApi.length > 0 };
  });
}

async function fetchMedusaHeaders() {
  const publishableKey =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  return {
    "Content-Type": "application/json",
    ...(publishableKey && { "x-publishable-api-key": publishableKey }),
  };
}

async function fetchRegionId(backendUrl, headers) {
  try {
    const regionRes = await fetch(`${backendUrl}/store/regions`, { headers });
    if (!regionRes.ok) return "";
    const regionData = await regionRes.json();
    const region =
      regionData.regions?.find(
        (r) => r.currency_code?.toLowerCase() === "twd",
      ) || regionData.regions?.[0];
    return region?.id || "";
  } catch {
    return "";
  }
}

/** 與分類頁相同：依 category_id + region 拉真實商品 */
async function fetchProductsForCountry(country, allCategories = []) {
  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  const headers = await fetchMedusaHeaders();
  const handle = canonicalCategoryHandle(country.handle);
  const fetchHandles = categoryHandlesForProductFetch(handle);

  const categoryIds = [];
  for (const h of fetchHandles) {
    const match =
      allCategories.find(
        (c) =>
          canonicalCategoryHandle(c.handle || c.slug) === h ||
          c.id === country.id,
      ) || null;
    if (match?.id && !categoryIds.includes(match.id)) {
      categoryIds.push(match.id);
    }
  }
  if (country.id && !categoryIds.includes(country.id)) {
    categoryIds.unshift(country.id);
  }
  if (!categoryIds.length) return [];

  const regionId = await fetchRegionId(backendUrl, headers);
  const productFields =
    "+metadata,*categories,*options,*options.values,*tags,*variants,*variants.calculated_price,*variants.prices,*variants.metadata,*variants.options,*variants.options.option,thumbnail,title,handle,subtitle,description";
  const prodQuery = new URLSearchParams({
    fields: productFields,
    limit: "100",
  });
  for (const id of categoryIds) {
    prodQuery.append("category_id[]", id);
  }
  if (regionId) prodQuery.set("region_id", regionId);

  const prodRes = await fetch(
    `${backendUrl}/store/products?${prodQuery}`,
    { headers },
  );
  if (!prodRes.ok) return [];
  const prodData = await prodRes.json();
  const seen = new Set();
  return (prodData.products || [])
    .filter((p) => {
      if (!p?.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .map((p) => formatQuickBuyProduct(p, handle))
    .sort((a, b) => Number(b.isTestPlan) - Number(a.isTestPlan));
}

function StackPage({ direction, children, className = "" }) {
  return (
    <motion.div
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={slideTransition}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#ffffff",
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        boxShadow: " -8px 0 16px rgba(0,0,0,0.06)",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
      className={`overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {children}
    </motion.div>
  );
}

function CountryTile({ country, onSelect }) {
  const img = getCountryProductImagePath(country.handle);
  return (
    <button
      type="button"
      onClick={() => onSelect(country)}
      className="flex aspect-square flex-col items-stretch overflow-hidden rounded-none bg-[#F7F9FB] p-0.5 text-center ring-1 ring-slate-200/90 transition active:scale-[0.98]"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center bg-white px-0.5 pt-0.5">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            className="h-[58px] w-[58px] max-h-full max-w-full object-contain"
          />
        ) : (
          <MaterialIcon name="public" size={32} className="text-slate-400" />
        )}
      </div>
      <span className="shrink-0 line-clamp-2 w-full px-0.5 pb-0.5 text-[13px] font-bold leading-tight text-slate-800">
        {country.name}
      </span>
    </button>
  );
}

/** L2：長條式產品卡（左圖右文，對齊分類頁資訊） */
function ListingProductCard({ product, onSelect }) {
  const img =
    product.image || getCountryProductImagePath(product.categoryHandle);
  const tags = product.displayTags || product.telecoms || [];
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="flex w-full items-stretch gap-3.5 border border-slate-200/90 bg-white p-3 text-left transition active:border-[#1E4AD1]/50"
    >
      <div className="flex h-[96px] w-[96px] shrink-0 items-center justify-center overflow-hidden bg-[#F9FAFB]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-full w-full object-contain p-2" />
        ) : (
          <MaterialIcon name="sim_card" size={36} className="text-slate-300" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <p className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-800">
          {product.name}
        </p>
        {tags.length > 0 ? (
          <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-[#1E4AD1]">
            {tags.join(" · ")}
          </p>
        ) : null}
        <p className="mt-auto pt-1.5 text-[17px] font-bold tabular-nums leading-none text-[#0071EB]">
          {formatPrice(product.minPrice)}
          <span className="ml-0.5 text-[12px] font-bold">起</span>
        </p>
      </div>
      <MaterialIcon
        name="chevron_right"
        size={22}
        className="mt-8 shrink-0 self-start text-slate-300"
      />
    </button>
  );
}

function SpecSelect({ label, value, options, onChange, disabled }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-bold text-slate-500">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          disabled={disabled || options.length === 0}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-none border border-slate-200 bg-white px-3 py-3 pr-9 text-[15px] font-bold text-slate-800 outline-none disabled:bg-slate-50 disabled:text-slate-400"
        >
          {options.length === 0 ? (
            <option value="">無可選項目</option>
          ) : (
            options.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))
          )}
        </select>
        <MaterialIcon
          name="expand_more"
          size={18}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </label>
  );
}

/** L3：電信／變體家族 */
function TelecomList({ product, onSelect }) {
  const telecoms = product.telecoms?.length
    ? product.telecoms
    : uniqueTelecoms(product.variations);

  if (!telecoms.length) {
    return (
      <p className="px-1 py-10 text-center text-[15px] text-slate-500">
        此商品尚無可選電信
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="px-0.5 text-[12px] font-semibold text-slate-400">
        選擇電信商變體
      </p>
      {telecoms.map((telecom) => {
        const hot = isHotSaleTelecom(product.hotSaleTelecoms, telecom);
        const prices = (product.variations || [])
          .filter((v) => getVariationOptionAttrs(v).telecom === telecom)
          .map((v) => Number(v.price) || 0)
          .filter((n) => n > 0);
        const min = prices.length ? Math.min(...prices) : 0;
        return (
          <button
            key={telecom}
            type="button"
            onClick={() => onSelect(telecom)}
            className="relative flex w-full items-center gap-3 border border-slate-200 bg-white px-4 py-4 text-left transition active:border-[#1E4AD1]"
          >
            {hot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/images/hot-sale.png"
                alt="熱銷推薦"
                className="pointer-events-none absolute -right-1 -top-2.5 z-10 h-9 w-auto drop-shadow-sm"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold text-slate-900">{telecom}</p>
              {hot ? (
                <p className="mt-0.5 text-[11px] font-bold text-[#E11D48]">
                  熱銷推薦
                </p>
              ) : (
                <p className="mt-0.5 text-[12px] font-semibold text-slate-400">
                  點擊選擇天數與數據
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[15px] font-bold text-[#0071EB]">
                {min > 0 ? `${formatPrice(min)}起` : ""}
              </p>
              <MaterialIcon
                name="chevron_right"
                size={22}
                className="ml-auto text-slate-300"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatSupportFlag(v) {
  if (v === true || v === "true" || v === 1 || v === "1") return "支援";
  if (v === false || v === "false" || v === 0 || v === "0") return "不支援";
  return null;
}

function VariantSpecInfo({ product, telecom, variant }) {
  const rows = useMemo(() => {
    if (!variant) return [];
    const specs = resolveCarrierSpecs(
      {
        carrier_specs_by_carrier: product?.carrier_specs_by_carrier,
        description: product?.description,
        subtitle: product?.subtitle,
        metadata: product?.metadata,
      },
      telecom,
      variant,
    );
    const items = buildCarrierSpecDisplayItems(specs);
    const byKey = Object.fromEntries(items.map((i) => [i.key, i.text]));

    const attrs = variant.attributes || {};
    const preThrottle = extractPreThrottleSpeedLabel(variant, specs);
    const throttleRule = extractThrottleSpeedLabel(variant, specs);
    const network = byKey.network || attrs.network || null;
    const gpt =
      formatSupportFlag(attrs.gpt ?? attrs.chatgpt) ||
      (byKey.apps?.includes("ChatGPT") ? "支援" : null) ||
      (byKey.apps?.includes("不支援") && byKey.apps.includes("ChatGPT")
        ? "不支援"
        : null);
    const tiktok =
      formatSupportFlag(attrs.tiktok) ||
      (byKey.apps?.includes("TikTok") ? "支援" : null);

    const out = [];
    const ipLine = [byKey.ip_type, byKey.route_type].filter(Boolean).join(" · ");
    if (ipLine) out.push({ label: "IP／線路", value: ipLine });
    if (preThrottle) {
      out.push({ label: "高速速度", value: preThrottle });
    }
    if (throttleRule) {
      out.push({ label: "降速規則", value: throttleRule });
    }
    if (network) {
      const netNorm = String(network).replace(/\s*\/\s*/g, "/");
      const preNorm = String(preThrottle || "").replace(/\s*\/\s*/g, "/");
      const redundant =
        preThrottle &&
        (preNorm.includes(netNorm) ||
          netNorm.split(/\s+/).every((w) => preNorm.includes(w)));
      if (!redundant) {
        out.push({ label: "速度", value: network });
      }
    }
    if (gpt) out.push({ label: "ChatGPT", value: gpt });
    if (tiktok) out.push({ label: "TikTok", value: tiktok });
    if (!gpt && !tiktok && byKey.apps) {
      out.push({ label: "App 支援", value: byKey.apps });
    }
    return out;
  }, [product, telecom, variant]);

  if (!rows.length) return null;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="text-[12px] font-bold text-slate-500">方案規格</p>
      <dl className="mt-2 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-2 text-[13px] leading-snug">
            <dt className="w-[76px] shrink-0 font-bold text-slate-500">
              {row.label}
            </dt>
            <dd className="min-w-0 flex-1 font-semibold text-slate-800">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** L4：簡介 + 天數／數據下拉 + 購買 */
function CheckoutSpecPanel({
  product,
  telecom,
  country,
  buyingId,
  onBuy,
  onDetail,
}) {
  const variations = useMemo(
    () =>
      (product?.variations || []).filter(
        (v) => getVariationOptionAttrs(v).telecom === telecom,
      ),
    [product, telecom],
  );

  const [days, setDays] = useState("");
  const [dataAmount, setDataAmount] = useState("");

  const availableDays = useMemo(() => {
    const set = new Set();
    variations.forEach((v) => {
      const d = getVariationOptionAttrs(v).days;
      if (d) set.add(String(d));
    });
    return [...set].sort((a, b) => Number(a) - Number(b));
  }, [variations]);

  useEffect(() => {
    if (!availableDays.length) {
      setDays("");
      return;
    }
    setDays((prev) =>
      availableDays.includes(prev) ? prev : availableDays[0],
    );
  }, [availableDays, telecom]);

  const availableData = useMemo(() => {
    const filtered = variations.filter((v) => {
      const a = getVariationOptionAttrs(v);
      if (days && String(a.days) !== String(days)) return false;
      return true;
    });
    return sortUniqueDataAmountLabels(
      filtered.map((v) => getVariationOptionAttrs(v).data_amount),
    );
  }, [variations, days]);

  useEffect(() => {
    if (!availableData.length) {
      setDataAmount("");
      return;
    }
    setDataAmount((prev) =>
      availableData.includes(prev) ? prev : availableData[0],
    );
  }, [availableData]);

  const selectedVariant = useMemo(() => {
    return (
      variations.find((v) => {
        const a = getVariationOptionAttrs(v);
        if (days && String(a.days) !== String(days)) return false;
        if (dataAmount && a.data_amount !== dataAmount) return false;
        return true;
      }) ||
      variations[0] ||
      null
    );
  }, [variations, days, dataAmount]);

  const attrs = selectedVariant
    ? getVariationOptionAttrs(selectedVariant)
    : { telecom };
  const specLine = [attrs.telecom || telecom, daysLabel(attrs.days), attrs.data_amount]
    .filter(Boolean)
    .join(" · ");

  const intro =
    product.subtitleByCarrier?.[telecom] ||
    product.subtitle ||
    `${product.name} · ${telecom}`;

  const canBuy = Boolean(
    product?.isReal &&
      selectedVariant?.id &&
      !String(selectedVariant.id).startsWith("mock-"),
  );
  const busy = buyingId === selectedVariant?.id;
  const img =
    product.image ||
    getCountryProductImagePath(product.categoryHandle || country?.handle);

  return (
    <div className="space-y-3 pb-4">
      <div className="border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden bg-slate-50 ring-1 ring-slate-100">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="h-14 w-14 object-contain" />
            ) : (
              <MaterialIcon name="sim_card" size={28} className="text-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold leading-snug text-slate-900">
              {product.name}
            </p>
            <p className="mt-0.5 text-[13px] font-bold text-[#1E4AD1]">
              {telecom}
            </p>
            <p className="mt-1.5 text-[20px] font-bold text-[#1E4AD1]">
              {formatPrice(selectedVariant?.price)}
            </p>
          </div>
        </div>

        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-[12px] font-bold text-slate-500">方案簡介</p>
          <p className="mt-1 text-[14px] leading-relaxed text-slate-600">
            {intro}
          </p>
        </div>

        <VariantSpecInfo
          product={product}
          telecom={telecom}
          variant={selectedVariant}
        />

        <div className="mt-3 space-y-2.5">
          <SpecSelect
            label="使用天數"
            value={days}
            options={availableDays.map((d) => ({
              value: d,
              label: daysLabel(d),
            }))}
            onChange={setDays}
          />
          <SpecSelect
            label="數據量"
            value={dataAmount}
            options={availableData.map((d) => ({ value: d, label: d }))}
            onChange={setDataAmount}
          />
        </div>

        {specLine ? (
          <p className="mt-2 text-[12px] font-semibold text-slate-400">
            已選：{specLine}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <JekoPillButton
          type="button"
          size="sm"
          className="min-w-0 flex-1 !min-h-[48px] !rounded-none text-[15px]"
          disabled={busy || !selectedVariant}
          onClick={() =>
            onBuy({
              product,
              variant: selectedVariant,
              specLabel: specLine,
              attrs: { ...attrs, telecom: attrs.telecom || telecom },
            })
          }
        >
          {busy ? "處理中…" : canBuy ? "立即購買" : "選規格購買"}
        </JekoPillButton>
        <button
          type="button"
          onClick={() =>
            onDetail(product, selectedVariant, {
              ...attrs,
              telecom: attrs.telecom || telecom,
            })
          }
          className="min-w-0 flex-1 border border-slate-200 bg-white px-3 py-3 text-[15px] font-bold text-slate-700 transition active:bg-slate-50"
        >
          查看詳情
        </button>
      </div>
    </div>
  );
}

/**
 * 快速購買：L1 國家 → L2 產品 → L3 電信變體 → L4 規格／購買
 */
export default function EsimQuickBuyPanel({ onCloseSheet } = {}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [countries, setCountries] = useState(() =>
    attachProductsToCountries(MOCK_COUNTRIES, []),
  );
  const [rawCategories, setRawCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("countries");
  const [direction, setDirection] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedTelecom, setSelectedTelecom] = useState(null);
  const [buyingId, setBuyingId] = useState(null);
  const [countryProducts, setCountryProducts] = useState([]);
  const [pendingBuy, setPendingBuy] = useState(null);
  const [reminderKind, setReminderKind] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
        const headers = await fetchMedusaHeaders();

        const [catRes, ranksRes] = await Promise.all([
          fetch(`${backendUrl}/store/product-categories`, { headers }),
          fetch("/api/hero-product-ranks").catch(() => null),
        ]);

        if (!catRes.ok) throw new Error("categories fetch failed");

        const catData = await catRes.json();
        const ranksData =
          ranksRes && ranksRes.ok
            ? await ranksRes.json()
            : { byHandle: {}, byName: {} };
        if (cancelled) return;

        const cats = catData.product_categories || [];
        setRawCategories(cats);

        const merged = buildHeroCountries(cats, [], ranksData);
        setCountries(
          attachProductsToCountries(
            merged.length ? merged : MOCK_COUNTRIES,
            [],
          ),
        );
      } catch (err) {
        clientWarn("[EsimQuickBuyPanel] 使用假資料:", err);
        setCountries(attachProductsToCountries(MOCK_COUNTRIES, []));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCountryProducts = useCallback(
    async (country) => {
      setDirection(1);
      setSelectedCountry(country);
      setSelectedProduct(null);
      setSelectedTelecom(null);
      setLevel("products");

      // 已載入過真實分類商品 → 直接用快取，避免再閃錯資料
      if (country.productsLoaded && country.products?.length) {
        setCountryProducts(country.products);
        setProductsLoading(false);
        return;
      }

      // 載入中不顯示 mock／舊 plans，避免短暫錯誤內容
      setCountryProducts([]);
      setProductsLoading(true);
      try {
        const list = await fetchProductsForCountry(country, rawCategories);
        const next = list.length > 0 ? list : [];
        setCountryProducts(next);
        setCountries((prev) =>
          prev.map((c) =>
            c.id === country.id || c.handle === country.handle
              ? {
                  ...c,
                  products: next.length ? next : c.products,
                  productsLoaded: true,
                }
              : c,
          ),
        );
      } catch (err) {
        clientWarn("[EsimQuickBuyPanel] 分類商品載入失敗:", err);
        setCountryProducts([]);
      } finally {
        setProductsLoading(false);
      }
    },
    [rawCategories],
  );

  const search = useMemo(
    () =>
      searchHeroCountryPlans(
        countries,
        selectedCountry?.handle || "",
        query,
      ),
    [countries, selectedCountry?.handle, query],
  );

  const listedCountries = query.trim() ? search.countries : countries;
  const products = countryProducts;

  const push = useCallback((nextLevel, patch = {}) => {
    setDirection(1);
    if (patch.country !== undefined) setSelectedCountry(patch.country);
    if (patch.product !== undefined) setSelectedProduct(patch.product);
    if (patch.telecom !== undefined) setSelectedTelecom(patch.telecom);
    setLevel(nextLevel);
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    if (level === "checkout") {
      setSelectedTelecom(null);
      setLevel("telecoms");
      return;
    }
    if (level === "telecoms") {
      setSelectedProduct(null);
      setLevel("products");
      return;
    }
    if (level === "products") {
      setSelectedCountry(null);
      setCountryProducts([]);
      setLevel("countries");
    }
  }, [level]);

  const openDetail = useCallback(
    (product, variant, attrs) => {
      let href =
        product?.href ||
        (product?.slug && product?.categoryHandle
          ? `/product/${product.categoryHandle}/${product.slug}/`
          : "/product/");
      const q = new URLSearchParams();
      if (attrs?.telecom) q.set("telecom", attrs.telecom);
      if (attrs?.days) q.set("days", String(attrs.days));
      if (attrs?.data_amount) q.set("data_amount", attrs.data_amount);
      const qs = q.toString();
      if (qs) href += (href.includes("?") ? "&" : "?") + qs;
      if (attrs?._hash) href += `#${attrs._hash}`;
      onCloseSheet?.();
      router.push(href);
    },
    [onCloseSheet, router],
  );

  const buyNow = useCallback(
    async ({ product, variant, specLabel, attrs }) => {
      if (!product || !variant) return;
      const canDirect = Boolean(
        product.isReal &&
          variant.id &&
          !String(variant.id).startsWith("mock-"),
      );
      if (!canDirect) {
        openDetail(product, variant, attrs);
        return;
      }

      setBuyingId(variant.id);
      try {
        const ok = await addToCart(
          {
            id: variant.id,
            variant_id: variant.id,
            parentId: product.id,
            name: product.name,
            price: variant.price,
            sku: variant.sku,
            planId: variant.plan_id || variant.planId,
            image:
              product.image ||
              getCountryProductImagePath(product.categoryHandle) ||
              "/images/jeko-esim.png",
            slug: product.slug,
            categorySlug: product.categoryHandle,
            quantity: 1,
            options: specLabel,
            specLabel,
            type: "esim",
            telecom: attrs?.telecom,
            days: attrs?.days,
            data_amount: attrs?.data_amount,
          },
          { open: false },
        );
        if (!ok) return;
        onCloseSheet?.();
        router.push("/Cart");
      } finally {
        setBuyingId(null);
      }
    },
    [addToCart, onCloseSheet, openDetail, router],
  );

  const closeReminder = useCallback(() => {
    setReminderKind(null);
    setPendingBuy(null);
  }, []);

  const finalizeBuy = useCallback(() => {
    const payload = pendingBuy;
    closeReminder();
    if (payload) buyNow(payload);
  }, [pendingBuy, closeReminder, buyNow]);

  const openReminder = useCallback((kind, payload) => {
    setPendingBuy(payload);
    setReminderKind(kind);
  }, []);

  const requestBuy = useCallback(
    (payload) => {
      const { product, variant, attrs } = payload;
      const kind = getFirstPurchaseReminder({
        variation: variant,
        telecom: attrs?.telecom,
        days: attrs?.days,
        product,
        categoryHandle: product?.categoryHandle,
      });
      if (kind) {
        openReminder(kind, payload);
        return;
      }
      buyNow(payload);
    },
    [buyNow, openReminder],
  );

  const continueAfterCoverage = useCallback(() => {
    if (!pendingBuy) return;
    const { product, variant, attrs } = pendingBuy;
    if (product?.id) markCoverageAck(product.id);
    const next = getPostCoverageReminder({
      telecom: attrs?.telecom,
      variation: variant,
      product,
    });
    if (next) {
      setReminderKind(next);
      return;
    }
    finalizeBuy();
  }, [pendingBuy, finalizeBuy]);

  const continueAfterAck = useCallback(() => {
    finalizeBuy();
  }, [finalizeBuy]);

  const coverageCountry = useMemo(() => {
    if (!pendingBuy?.product) return null;
    return resolveCoverageCountry(
      pendingBuy.product,
      pendingBuy.product.categoryHandle,
    );
  }, [pendingBuy]);

  const pendingDataLabel = pendingBuy?.specLabel || "";

  const title =
    level === "checkout"
      ? selectedTelecom || "選擇規格"
      : level === "telecoms"
        ? "選擇電信"
        : level === "products"
          ? selectedCountry?.name || "選擇商品"
          : "快速購買";

  return (
    <div className="relative flex h-full min-h-[52vh] flex-col bg-white px-3 pb-4">
      <div className="relative z-20 mb-2 flex shrink-0 items-center gap-2 bg-white px-1">
        {level !== "countries" ? (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-0.5 py-1 pr-2 text-[15px] font-bold text-[#1E4AD1]"
            aria-label="返回上一層"
          >
            <MaterialIcon name="chevron_left" size={24} />
            返回
          </button>
        ) : (
          <span className="w-[52px]" />
        )}
        <p className="min-w-0 flex-1 truncate text-center text-[17px] font-bold text-slate-900">
          {title}
        </p>
        <span className="w-[52px]" />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
        <AnimatePresence initial={false} custom={direction} mode="sync">
          {level === "countries" ? (
            <StackPage key="countries" direction={direction}>
              <div className="px-0.5 pb-6">
                <div className="mb-3 flex items-center bg-[#f7f8fa] px-3 py-2.5 ring-1 ring-slate-200/80 focus-within:ring-slate-200/80">
                  <MaterialIcon
                    name="search"
                    size={20}
                    className="text-slate-400"
                  />
                  <input
                    type="text"
                    inputMode="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜尋國家或關鍵字"
                    autoComplete="off"
                    className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1.5 text-[15px] font-semibold text-slate-800 shadow-none outline-none ring-0 placeholder:font-medium placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0"
                  />
                </div>
                {loading ? (
                  <LoadingIndicator
                    layout="center"
                    label="載入國家…"
                    className="py-16"
                  />
                ) : listedCountries.length === 0 ? (
                  <p className="px-2 py-10 text-center text-[15px] text-slate-500">
                    找不到符合的國家
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {listedCountries.map((c) => (
                      <CountryTile
                        key={c.id || c.handle}
                        country={c}
                        onSelect={openCountryProducts}
                      />
                    ))}
                  </div>
                )}
              </div>
            </StackPage>
          ) : null}

          {level === "products" ? (
            <StackPage
              key={`products-${selectedCountry?.handle || "x"}`}
              direction={direction}
            >
              <div className="min-h-full bg-[#F7F9FB] px-0.5 pb-6 pt-1">
                <p className="mb-2 px-1 text-[13px] text-slate-500">
                  共{" "}
                  <span className="font-bold text-slate-800">
                    {productsLoading && !products.length ? "…" : products.length}
                  </span>{" "}
                  件商品
                </p>
                {productsLoading && !products.length ? (
                  <LoadingIndicator
                    layout="center"
                    label="載入商品…"
                    className="py-16"
                  />
                ) : products.length === 0 ? (
                  <div className="px-2 py-10 text-center">
                    <p className="text-[15px] font-bold text-slate-700">
                      此國家暫無商品
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {products.map((product) => (
                      <ListingProductCard
                        key={product.id || product.slug}
                        product={product}
                        onSelect={(p) =>
                          push("telecoms", { product: p, telecom: null })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </StackPage>
          ) : null}

          {level === "telecoms" ? (
            <StackPage
              key={`telecoms-${selectedProduct?.id || "x"}`}
              direction={direction}
            >
              <div className="px-0.5 pb-6">
                <p className="mb-2 px-1 text-[15px] font-bold text-slate-800">
                  {selectedProduct?.name}
                </p>
                {selectedProduct ? (
                  <TelecomList
                    product={selectedProduct}
                    onSelect={(telecom) =>
                      push("checkout", { telecom })
                    }
                  />
                ) : null}
              </div>
            </StackPage>
          ) : null}

          {level === "checkout" ? (
            <StackPage
              key={`checkout-${selectedTelecom || "x"}`}
              direction={direction}
            >
              <div className="px-0.5 pb-6">
                {selectedProduct && selectedTelecom ? (
                  <CheckoutSpecPanel
                    product={selectedProduct}
                    telecom={selectedTelecom}
                    country={selectedCountry}
                    buyingId={buyingId}
                    onBuy={requestBuy}
                    onDetail={openDetail}
                  />
                ) : null}
              </div>
            </StackPage>
          ) : null}
        </AnimatePresence>
      </div>

      <DataExhaustReminderModal
        squareCorners
        isOpen={reminderKind === "terminate"}
        purchaseAction="buy"
        dataLabel={pendingDataLabel}
        onClose={closeReminder}
        onContinuePurchase={continueAfterAck}
      />
      <AuKddiApnReminderModal
        squareCorners
        isOpen={reminderKind === "au-apn"}
        purchaseAction="buy"
        onClose={closeReminder}
        onContinuePurchase={continueAfterAck}
      />
      <IijApnReminderModal
        squareCorners
        isOpen={reminderKind === "iij-apn"}
        purchaseAction="buy"
        onClose={closeReminder}
        onContinuePurchase={continueAfterAck}
      />
      <SoftBankApnReminderModal
        squareCorners
        isOpen={reminderKind === "softbank-apn"}
        purchaseAction="buy"
        onClose={closeReminder}
        onContinuePurchase={continueAfterAck}
      />
      <CoveragePromptModal
        squareCorners
        isOpen={reminderKind === "coverage"}
        country={coverageCountry}
        purchaseAction="buy"
        onClose={closeReminder}
        onViewCoverage={() => {
          if (!pendingBuy) return;
          const { product, variant, attrs } = pendingBuy;
          closeReminder();
          openDetail(product, variant, {
            ...attrs,
            _hash: "network-coverage",
          });
        }}
        onContinuePurchase={continueAfterCoverage}
      />
    </div>
  );
}
