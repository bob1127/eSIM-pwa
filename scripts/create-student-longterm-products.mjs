/**
 * 留學生／出差專區：各國「每日／總量／吃到飽」≥20 天變體整合成單一商品。
 * 「電信商」選項承載方案類型＋原電信，例如：
 *   吃到飽 不限流量 (OPTUS)／每日型 (OPTUS)／總量型 (OPTUS)
 *
 *   node scripts/create-student-longterm-products.mjs
 *   node scripts/create-student-longterm-products.mjs --rebuild
 *   node scripts/create-student-longterm-products.mjs --only=australia
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnv(path.join(__dirname, "..", ".env.local"));
loadEnv(path.join(__dirname, "..", "..", "esim-backend", ".env"));

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
const SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";
const MIN_DAYS = 20;
const BATCH = 20;
const REBUILD = process.argv.includes("--rebuild");
const SKU_SUFFIX = "#student-lt";

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = new Set(
  (onlyArg?.split("=")[1] || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

/** @typedef {"daily"|"total"|"unlimited"} PlanKind */

/**
 * @param {PlanKind} planKind
 * @param {string} carrier
 */
function formatStudentTelecomLabel(planKind, carrier) {
  const c = String(carrier || "").trim() || "—";
  if (planKind === "unlimited") return `吃到飽 不限流量 (${c})`;
  if (planKind === "daily") return `每日型 (${c})`;
  if (planKind === "total") return `總量型 (${c})`;
  return c;
}

/** 來源：每日／總量／吃到飽分開商品 → 合併進學生長天數 */
const TARGETS = [
  {
    key: "australia",
    displayName: "澳洲",
    handle: "australia-student-longterm-esim",
    categoryHandle: "australia",
    frontPath: "/product/australia/australia-student-longterm-esim/",
    sources: [
      { handle: "australia-daily-esim", planKind: "daily" },
      { handle: "australia-total-esim", planKind: "total" },
      { handle: "australia-unlimited-esim", planKind: "unlimited" },
    ],
  },
  {
    key: "japan",
    displayName: "日本",
    handle: "japan-student-longterm-esim",
    categoryHandle: "japan",
    frontPath: "/product/japan/japan-student-longterm-esim/",
    sources: [
      { handle: "daily-jp", planKind: "daily" },
      { handle: "japan-total-esim", planKind: "total" },
      { handle: "japan-unlimited-esim", planKind: "unlimited" },
    ],
  },
  {
    key: "uk",
    displayName: "英國",
    handle: "uk-student-longterm-esim",
    categoryHandle: "uk",
    frontPath: "/product/uk/uk-student-longterm-esim/",
    sources: [
      { handle: "uk-daily-esim", planKind: "daily" },
      { handle: "uk-total-esim", planKind: "total" },
      { handle: "uk-unlimited-esim", planKind: "unlimited" },
    ],
  },
  {
    key: "canada",
    displayName: "加拿大",
    handle: "canada-student-longterm-esim",
    categoryHandle: "canada",
    frontPath: "/product/canada/canada-student-longterm-esim/",
    sources: [
      { handle: "canada-daily-esim", planKind: "daily" },
      { handle: "canada-total-esim", planKind: "total" },
      { handle: "canada-unlimited-esim", planKind: "unlimited" },
    ],
  },
  {
    key: "korea",
    displayName: "韓國",
    handle: "korea-student-longterm-esim",
    categoryHandle: "korea",
    frontPath: "/product/korea/korea-student-longterm-esim/",
    sources: [
      { handle: "korea-daily-esim", planKind: "daily" },
      { handle: "korea-total-esim", planKind: "total" },
      { handle: "korea-unlimited-esim", planKind: "unlimited" },
    ],
  },
  {
    key: "singapore",
    displayName: "新加坡",
    handle: "singapore-student-longterm-esim",
    categoryHandle: "singapore",
    frontPath: "/product/singapore/singapore-student-longterm-esim/",
    note: "吃到飽無 ≥20 天 → 僅每日＋總量",
    sources: [
      { handle: "singapore-daily-esim", planKind: "daily" },
      { handle: "singapore-total-esim", planKind: "total" },
      { handle: "singapore-unlimited-esim", planKind: "unlimited" },
    ],
  },
];

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function variantDay(v) {
  const raw =
    v?.metadata?.days ??
    v?.metadata?.day ??
    v?.metadata?.attributes?.days ??
    v?.options?.find((o) => /天數|days/i.test(o?.option?.title || ""))?.value;
  const n = parseInt(String(raw || "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function uniqueSku(sku, planKind) {
  const base = String(sku || "sku").trim();
  const tag = `${SKU_SUFFIX}-${planKind === "daily" ? "d" : planKind === "total" ? "t" : "u"}`;
  if (base.includes(SKU_SUFFIX)) {
    return base.includes(tag) ? base : `${base.replace(/#student-lt.*$/, "")}${tag}`;
  }
  return `${base}${tag}`;
}

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`登入失敗: ${data.message || res.status}`);
  }
  return data.token;
}

async function admin(token, apiPath, options = {}, retries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${MEDUSA_URL}${apiPath}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`[${apiPath}] 非 JSON: ${text.slice(0, 300)}`);
      }
      if (!res.ok) {
        throw new Error(
          `[${apiPath}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 500)}`,
        );
      }
      return data;
    } catch (e) {
      lastErr = e;
      console.warn(`⚠️ ${apiPath} (${attempt}/${retries}): ${e.message}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1200 * attempt));
      }
    }
  }
  throw lastErr;
}

async function fetchProductByHandle(token, handle) {
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(handle)}&limit=1&fields=*categories,*sales_channels,*images,*options`,
  );
  const product = products?.[0];
  if (!product) return null;

  const variants = [];
  let offset = 0;
  for (;;) {
    const page = await admin(
      token,
      `/admin/products/${product.id}/variants?limit=100&offset=${offset}&fields=*options,*options.option,*prices`,
    );
    const rows = page.variants || [];
    variants.push(...rows);
    if (rows.length < 100) break;
    offset += 100;
  }
  return { ...product, variants };
}

/** 從 metadata／option_id 組出「使用天數／電信商／數據量」（電信商可覆寫） */
function resolveVariantOptionMap(sourceVariant, sourceProduct, telecomOverride) {
  const meta = sourceVariant.metadata || {};
  const attrs = meta.attributes || {};
  const day = variantDay(sourceVariant);
  const telecom =
    telecomOverride ||
    meta.carrier ||
    attrs.telecom ||
    sourceVariant.options?.find((o) =>
      /電信|telecom|carrier/i.test(o?.option?.title || o?.value || ""),
    )?.value ||
    "";
  const data =
    meta.data_amount ||
    meta.data ||
    attrs.data_amount ||
    attrs.data ||
    "吃到飽";

  const byOptionId = new Map(
    (sourceProduct.options || []).map((o) => [o.id, o.title]),
  );
  const fromApi = {};
  for (const opt of sourceVariant.options || []) {
    const title =
      opt.option?.title || byOptionId.get(opt.option_id) || null;
    if (title && opt.value) fromApi[title] = opt.value;
  }

  return {
    使用天數: fromApi["使用天數"] || (day ? `${day}天` : null),
    電信商: telecomOverride || fromApi["電信商"] || String(telecom || "").trim() || null,
    數據量: fromApi["數據量"] || String(data || "").trim() || null,
  };
}

function originalTelecom(sourceVariant, sourceProduct) {
  const map = resolveVariantOptionMap(sourceVariant, sourceProduct, null);
  return String(map.電信商 || "").trim();
}

function sortTelecomValues(values) {
  const rank = (v) => {
    const s = String(v);
    if (/吃到飽/.test(s)) return 0;
    if (/每日/.test(s)) return 1;
    if (/總量/.test(s)) return 2;
    return 3;
  };
  return [...values].sort(
    (a, b) => rank(a) - rank(b) || String(a).localeCompare(String(b), "zh-Hant"),
  );
}

function buildOptionsFromRows(rows) {
  const byTitle = new Map([
    ["使用天數", new Set()],
    ["電信商", new Set()],
    ["數據量", new Set()],
  ]);

  for (const row of rows) {
    for (const [title, value] of Object.entries(row.options)) {
      if (!value) continue;
      byTitle.get(title).add(String(value));
    }
  }

  return ["使用天數", "電信商", "數據量"].map((title) => {
    let values = [...byTitle.get(title)];
    if (!values.length) {
      throw new Error(`無法組出選項「${title}」`);
    }
    if (title === "使用天數") {
      values.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    } else if (title === "電信商") {
      values = sortTelecomValues(values);
    } else {
      values.sort((a, b) => String(a).localeCompare(String(b), "zh-Hant"));
    }
    return { title, values };
  });
}

function toCreateVariant(sourceVariant, sourceProduct, planKind, telecomLabel) {
  const map = resolveVariantOptionMap(
    sourceVariant,
    sourceProduct,
    telecomLabel,
  );
  const options = {};
  for (const [title, value] of Object.entries(map)) {
    if (!value) {
      throw new Error(
        `變體缺選項 ${title}: ${sourceVariant.sku || sourceVariant.title}`,
      );
    }
    options[title] = value;
  }

  const prices = (sourceVariant.prices || [])
    .filter((p) => p.currency_code && p.amount != null)
    .map((p) => ({
      currency_code: p.currency_code,
      amount: Number(p.amount),
    }));

  if (!prices.length) {
    throw new Error(`變體無價格: ${sourceVariant.sku || sourceVariant.title}`);
  }

  const carrier = originalTelecom(sourceVariant, sourceProduct);
  const prevMeta = sourceVariant.metadata || {};
  const prevAttrs = prevMeta.attributes || {};

  const metadata = {
    ...prevMeta,
    student_longterm: true,
    plan_kind: planKind,
    carrier,
    cloned_from_sku: sourceVariant.sku || null,
    cloned_from_handle: sourceProduct.handle,
    attributes: {
      ...prevAttrs,
      telecom: telecomLabel,
      days: prevAttrs.days || variantDay(sourceVariant),
      data_amount: options.數據量,
    },
  };

  return {
    title: `${telecomLabel} · ${options.使用天數} · ${options.數據量}`,
    sku: uniqueSku(sourceVariant.sku, planKind),
    manage_inventory: false,
    allow_backorder: true,
    options,
    prices,
    metadata,
  };
}

function pickMapValue(map, key) {
  if (!map || typeof map !== "object" || !key) return undefined;
  if (map[key] != null) return map[key];
  const hit = Object.keys(map).find(
    (k) => k.trim().toLowerCase() === String(key).trim().toLowerCase(),
  );
  return hit != null ? map[hit] : undefined;
}

/** 把來源電信 key 的 metadata 對應到新「電信商」標籤 */
function remapCarrierKeyedMap(srcMap, fromCarrier, toLabel) {
  const val = pickMapValue(srcMap, fromCarrier);
  if (val == null) return {};
  return { [toLabel]: val };
}

function buildMergedMetadata(target, primarySource, rows) {
  const profit = {};
  const profitLong = {};
  const profitLongMin = {};
  const subtitle = {};
  const specs = {};
  const notices = {};
  const hot = [];

  for (const row of rows) {
    const src = row.source;
    const srcMeta = src.metadata || {};
    const from = row.carrier;
    const to = row.telecomLabel;

    Object.assign(
      profit,
      remapCarrierKeyedMap(srcMeta.carrier_profit_by_carrier, from, to),
    );
    Object.assign(
      profitLong,
      remapCarrierKeyedMap(srcMeta.carrier_profit_long_by_carrier, from, to),
    );
    Object.assign(
      profitLongMin,
      remapCarrierKeyedMap(
        srcMeta.carrier_profit_long_min_days_by_carrier,
        from,
        to,
      ),
    );
    Object.assign(
      subtitle,
      remapCarrierKeyedMap(srcMeta.subtitle_by_carrier, from, to),
    );
    Object.assign(
      specs,
      remapCarrierKeyedMap(srcMeta.carrier_specs_by_carrier, from, to),
    );
    Object.assign(
      notices,
      remapCarrierKeyedMap(srcMeta.overview_notices_by_carrier, from, to),
    );

    const hotList = Array.isArray(srcMeta.hot_sale_telecoms)
      ? srcMeta.hot_sale_telecoms
      : [];
    const isHotSource = hotList.some((h) => String(h).trim() === from);
    // HOT SALE 只標原生 IP（勿把 SoftBank／KDDI 雙網漫遊當熱銷）
    const nativeHint = [
      from,
      to,
      specs[to]?.ip_type,
      specs[to]?.route_type,
      srcMeta.carrier_specs_by_carrier?.[from]?.ip_type,
      srcMeta.carrier_specs_by_carrier?.[from]?.route_type,
    ]
      .filter(Boolean)
      .join(" ");
    const isDualRoam = /\/|\+|雙/.test(from) && !/原生/.test(nativeHint);
    const isNative =
      /原生/.test(nativeHint) ||
      (/日本\s*IP|韓國\s*IP|本地\s*IP|Native\s*IP/i.test(nativeHint) &&
        !/漫遊|新加坡|香港/.test(nativeHint)) ||
      (/IIJ|Docomo|AU\s*\(?\s*KDDI|SK電信（韓國IP）/i.test(from) &&
        !isDualRoam);

    if (row.planKind === "unlimited" && isHotSource && isNative && !isDualRoam) {
      hot.push(to);
    }
  }

  // 若吃到飽沒標 hot，改標第一個原生 IP 吃到飽（沒有就不標）
  if (!hot.length) {
    const firstNativeUnlim = rows.find((r) => {
      if (r.planKind !== "unlimited") return false;
      const from = r.carrier;
      if (/\/|\+|雙/.test(from)) return false;
      return /IIJ|Docomo|AU\s*\(?\s*KDDI|原生|SK電信（韓國IP）/i.test(from);
    });
    if (firstNativeUnlim) hot.push(firstNativeUnlim.telecomLabel);
  }

  const src = primarySource.metadata || {};
  return {
    type: src.type || "esim",
    country: src.country || target.displayName,
    is_native: src.is_native,
    plan_kind: "mixed",
    student_longterm: true,
    student_business_zone: true,
    cloned_from_handles: [
      ...new Set(rows.map((r) => r.source.handle).filter(Boolean)),
    ],
    min_days: MIN_DAYS,
    hot_sale_telecoms: hot.length ? [...new Set(hot)] : undefined,
    carrier_profit_by_carrier: Object.keys(profit).length ? profit : undefined,
    carrier_profit_long_by_carrier: Object.keys(profitLong).length
      ? profitLong
      : undefined,
    carrier_profit_long_min_days_by_carrier: Object.keys(profitLongMin).length
      ? profitLongMin
      : undefined,
    subtitle_by_carrier: Object.keys(subtitle).length ? subtitle : undefined,
    carrier_specs_by_carrier: Object.keys(specs).length ? specs : undefined,
    overview_notices_by_carrier: Object.keys(notices).length
      ? notices
      : undefined,
    seo_title: `${target.displayName} eSIM｜學生｜留學｜出差長天數｜Jeko eSIM`,
    seo_description: `${target.displayName} 學生／留學／出差長天數 eSIM：同一商品可選每日型、總量型、吃到飽（${MIN_DAYS} 天以上），售價與利潤沿用原商品。`,
    seo_keywords: `${target.displayName}eSIM,留學eSIM,出差eSIM,學生eSIM,每日型,總量型,吃到飽,Jeko eSIM`,
  };
}

async function createOrUpdateStudentProduct(token, target, sourceProducts) {
  /** @type {Array<{source:any,variant:any,planKind:PlanKind,carrier:string,telecomLabel:string,options:Record<string,string>}>} */
  const rows = [];

  for (const srcDef of target.sources) {
    const source = sourceProducts.find((p) => p.handle === srcDef.handle);
    if (!source) {
      console.warn(`  ⚠️ 跳過缺來源 ${srcDef.handle}`);
      continue;
    }
    const longVariants = (source.variants || []).filter(
      (v) => variantDay(v) >= MIN_DAYS,
    );
    if (!longVariants.length) {
      console.warn(
        `  ⚠️ ${srcDef.handle} 無 ≥${MIN_DAYS} 天（${srcDef.planKind}）`,
      );
      continue;
    }
    for (const v of longVariants) {
      const carrier = originalTelecom(v, source);
      const telecomLabel = formatStudentTelecomLabel(srcDef.planKind, carrier);
      const options = resolveVariantOptionMap(v, source, telecomLabel);
      rows.push({
        source,
        variant: v,
        planKind: srcDef.planKind,
        carrier,
        telecomLabel,
        options,
      });
    }
  }

  if (!rows.length) {
    throw new Error(`找不到任何 ≥${MIN_DAYS} 天變體可合併`);
  }

  const variants = rows.map((row) =>
    toCreateVariant(row.variant, row.source, row.planKind, row.telecomLabel),
  );
  // 去重：同一 options 組合只留一筆（理論上不該撞）
  const seen = new Set();
  const deduped = [];
  for (const v of variants) {
    const key = ["使用天數", "電信商", "數據量"]
      .map((t) => v.options[t])
      .join("|");
    if (seen.has(key)) {
      console.warn(`  ⚠️ 跳過重複組合 ${key}`);
      continue;
    }
    seen.add(key);
    deduped.push(v);
  }

  const options = buildOptionsFromRows(
    deduped.map((v) => ({ options: v.options })),
  );

  const primary =
    sourceProducts.find((p) =>
      target.sources.some(
        (s) => s.planKind === "unlimited" && s.handle === p.handle,
      ),
    ) ||
    sourceProducts.find((p) => p) ||
    rows[0].source;

  const title = `${target.displayName} eSIM｜學生｜留學｜出差 長天數`;
  const subtitle = `每日型／總量型／吃到飽｜${MIN_DAYS}天以上｜同一商品選方案類型`;
  const description = [
    `${target.displayName} 留學／出差長天數 eSIM。同一個商品用「電信商」選項切換每日型、總量型、吃到飽（標示實際電信網路），再選天數與數據量。`,
    `僅收錄 ${MIN_DAYS} 天（含）以上方案；售價與利潤沿用原每日／總量／吃到飽商品對應變體。`,
  ].join("\n\n");

  const categoryIds = [
    ...new Set(
      sourceProducts
        .flatMap((p) => (p.categories || []).map((c) => c.id))
        .filter(Boolean),
    ),
  ];
  const salesChannels =
    primary.sales_channels?.length > 0
      ? primary.sales_channels.map((s) => ({ id: s.id }))
      : [{ id: SALES_CHANNEL_ID }];

  const payloadBase = {
    title,
    subtitle,
    handle: target.handle,
    description,
    status: "published",
    discountable: true,
    thumbnail: primary.thumbnail || undefined,
    images: (primary.images || [])
      .slice(0, 4)
      .map((img) => (typeof img === "string" ? { url: img } : { url: img.url }))
      .filter((img) => img.url),
    metadata: buildMergedMetadata(target, primary, rows),
    options,
    sales_channels: salesChannels,
    categories: categoryIds.map((id) => ({ id })),
  };

  const existing = await fetchProductByHandle(token, target.handle);
  let product = existing;

  if (!product) {
    console.log(`🆕 建立 ${target.handle}（${deduped.length} 變體）`);
    const first = deduped[0];
    const rest = deduped.slice(1);
    const created = await admin(token, "/admin/products", {
      method: "POST",
      body: JSON.stringify({ ...payloadBase, variants: [first] }),
    });
    product = created.product;
    for (const [i, batch] of chunk(rest, BATCH).entries()) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ create: batch }),
      });
      console.log(`  + batch ${i + 1}: ${batch.length}`);
    }
  } else {
    console.log(`♻️ 更新 ${target.handle} ${product.id}`);
    await admin(token, `/admin/products/${product.id}`, {
      method: "POST",
      body: JSON.stringify({
        title: payloadBase.title,
        subtitle: payloadBase.subtitle,
        description: payloadBase.description,
        status: "published",
        discountable: true,
        thumbnail: payloadBase.thumbnail,
        images: payloadBase.images,
        metadata: payloadBase.metadata,
        options: payloadBase.options,
        sales_channels: payloadBase.sales_channels,
        categories: payloadBase.categories,
      }),
    });

    if (!REBUILD) {
      console.log("  （未加 --rebuild，僅更新商品資訊；變體不變）");
      return {
        product,
        variants: product.variants || [],
        skippedVariants: true,
      };
    }

    const oldIds = (product.variants || []).map((v) => v.id).filter(Boolean);
    if (oldIds.length) {
      for (const batch of chunk(oldIds, BATCH)) {
        await admin(token, `/admin/products/${product.id}/variants/batch`, {
          method: "POST",
          body: JSON.stringify({ delete: batch }),
        });
      }
      console.log(`  🗑 刪舊變體 ${oldIds.length}`);
    }
    for (const [i, batch] of chunk(deduped, BATCH).entries()) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ create: batch }),
      });
      console.log(`  + batch ${i + 1}: ${batch.length}`);
    }
  }

  const check = await fetchProductByHandle(token, target.handle);
  return {
    product: check,
    variants: check?.variants || [],
    skippedVariants: false,
    telecomSample: sortTelecomValues([
      ...new Set(deduped.map((v) => v.options.電信商)),
    ]),
  };
}

async function main() {
  const list = TARGETS.filter((t) => !ONLY.size || ONLY.has(t.key));
  console.log(`🔐 ${EMAIL} @ ${MEDUSA_URL}`);
  console.log(
    `📅 合併每日／總量／吃到飽 ≥${MIN_DAYS} 天 · ${list.length} 國`,
  );
  if (REBUILD) console.log("♻️ --rebuild：會重建變體");

  const token = await login();
  const summary = [];

  for (const target of list) {
    console.log(`\n======== ${target.key} ========`);
    if (target.note) console.log(`ℹ️ ${target.note}`);

    const sourceProducts = [];
    for (const src of target.sources) {
      const p = await fetchProductByHandle(token, src.handle);
      if (!p) {
        console.error(`❌ 找不到來源商品 ${src.handle}`);
        continue;
      }
      sourceProducts.push(p);
      const n = (p.variants || []).filter((v) => variantDay(v) >= MIN_DAYS)
        .length;
      console.log(`  ← ${src.handle} (${src.planKind}) ≥${MIN_DAYS}天: ${n}`);
    }

    if (!sourceProducts.length) {
      summary.push({ key: target.key, ok: false, error: "all sources missing" });
      continue;
    }

    try {
      const { product, variants, skippedVariants, telecomSample } =
        await createOrUpdateStudentProduct(token, target, sourceProducts);
      const days = [
        ...new Set(variants.map(variantDay).filter((d) => d >= MIN_DAYS)),
      ].sort((a, b) => a - b);
      console.log(`✅ ${product.title}`);
      console.log(`   handle: ${product.handle}`);
      console.log(`   前台: ${target.frontPath}`);
      console.log(`   變體: ${variants.length} · 天數 ${days.join(",")}`);
      if (telecomSample?.length) {
        console.log(`   電信商選項: ${telecomSample.join(" | ")}`);
      }
      if (skippedVariants) console.log("   （變體未重建）");
      summary.push({
        key: target.key,
        ok: true,
        handle: product.handle,
        title: product.title,
        variants: variants.length,
        days,
        telecoms: telecomSample,
        frontPath: target.frontPath,
      });
    } catch (e) {
      console.error(`❌ ${target.key}: ${e.message}`);
      summary.push({ key: target.key, ok: false, error: e.message });
    }
  }

  console.log("\n======= 摘要 =======");
  for (const row of summary) {
    if (row.ok) {
      console.log(
        `✓ ${row.key}: ${row.handle} · ${row.variants} 變體 · ${row.days.join(",")}`,
      );
      if (row.telecoms?.length) {
        console.log(`    ${row.telecoms.join(" · ")}`);
      }
    } else {
      console.log(`✗ ${row.key}: ${row.error}`);
    }
  }

  const failed = summary.filter((s) => !s.ok);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
