/**
 * 流量提醒推播／LINE 共用文案（server-only）
 * 存於 platform_settings.key = traffic_alert_copy（JSON）
 *
 * 兩套模板：
 * - quota：固定流量偏低（建議加購）
 * - fup：高速額度將用完 → 之後維持 {{throttleSpeed}} 吃到飽
 *
 * 變數：{{productName}} {{remaining}} {{total}} {{totalPart}}
 *       {{highSpeedQuota}} {{throttleSpeed}} {{checkedAt}} {{url}} {{upsellUrl}} {{upsellLabel}} {{siteUrl}}
 */
import { getSupabaseAdminServer } from "./supabaseAdminServer";
import { formatMb, formatTrafficCheckedAt, ensureTrafficCheckedAtLine, appendTrafficCheckedAtToBody } from "./esimUsageFormat";
import { getPublicSiteUrl } from "./siteUrl";
import { resolveTrafficPlanProfile } from "./trafficPlanProfile";
import { buildFriendlyPlanDisplayName } from "./trafficPlanCatalog";
import { resolveTrafficUpsellOffers } from "./trafficUpsellLink";

export const TRAFFIC_ALERT_COPY_KEY = "traffic_alert_copy";

export const DEFAULT_TRAFFIC_ALERT_COPY = {
  /** 固定總量方案 */
  title: "⚠️ eSIM 流量偏低提醒",
  body: "{{productName}} 剩餘 {{remaining}}{{totalPart}}，建議盡快加購或充值。",
  lineExtra: "※ 監測時間 {{checkedAt}}；數據依供應商更新，可能有延遲",
  /** 高速額度＋降速吃到飽 */
  fupTitle: "⚠️ 高速流量即將用完",
  fupBody:
    "{{productName}} 高速剩餘 {{remaining}}{{totalPart}}。用完後仍可上網，將維持約 {{throttleSpeed}} 吃到飽。降速後速度依方案與現地網路而定。",
  fupLineExtra:
    "※ 高速額度約 {{highSpeedQuota}}；監測時間 {{checkedAt}}；數據依供應商更新，可能有延遲",
  linkPath: "/data-query/",
};

/** Web Push／LINE 內文結尾免責（FUP）；模板已含則不重複 */
export const FUP_SPEED_DISCLAIMER = "降速後速度依方案與現地網路而定";

export function ensureFupSpeedDisclaimer(body) {
  const t = String(body || "").trim();
  if (!t) return t;
  if (t.includes(FUP_SPEED_DISCLAIMER)) return t;
  const needsPeriod = !/[。！？.!?]$/.test(t);
  return `${t}${needsPeriod ? "。" : ""}${FUP_SPEED_DISCLAIMER}`;
}

const CACHE_TTL_MS = 30_000;
let cachedCopy = null;
let cachedAt = 0;

function asString(v, fallback = "") {
  if (v == null) return fallback;
  return String(v);
}

function clampField(label, value, max) {
  if (value.length > max) {
    return { ok: false, message: `${label}請控制在 ${max} 字以內` };
  }
  return null;
}

export function normalizeTrafficAlertCopy(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const d = DEFAULT_TRAFFIC_ALERT_COPY;

  const title = asString(src.title, d.title).trim();
  const body = asString(src.body, d.body).trim();
  const lineExtra = asString(src.lineExtra, d.lineExtra).trim();
  const fupTitle = asString(src.fupTitle, d.fupTitle).trim();
  const fupBody = asString(src.fupBody, d.fupBody).trim();
  const fupLineExtra = asString(src.fupLineExtra, d.fupLineExtra).trim();
  let linkPath = asString(src.linkPath, d.linkPath).trim();
  if (!linkPath.startsWith("/")) linkPath = `/${linkPath}`;

  if (!title || !body) {
    return { ok: false, message: "固定流量：標題與內文不可空白" };
  }
  if (!fupTitle || !fupBody) {
    return { ok: false, message: "吃到飽／FUP：標題與內文不可空白" };
  }

  for (const [label, val, max] of [
    ["固定流量標題", title, 80],
    ["固定流量內文", body, 500],
    ["固定流量 LINE 補充", lineExtra, 300],
    ["FUP 標題", fupTitle, 80],
    ["FUP 內文", fupBody, 500],
    ["FUP LINE 補充", fupLineExtra, 300],
  ]) {
    const err = clampField(label, val, max);
    if (err) return err;
  }

  return {
    ok: true,
    value: {
      title,
      body,
      lineExtra,
      fupTitle,
      fupBody,
      fupLineExtra,
      linkPath,
    },
  };
}

export function renderTrafficTemplate(template, vars = {}) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}

export function buildTrafficAlertVars(target = {}) {
  const remaining = formatMb(target.remainingMb) || "";
  const total = formatMb(target.totalMb) || "";
  const productName = buildFriendlyPlanDisplayName({
    sku: target.sku || null,
    productName: target.productName || target.product_label || "eSIM",
    day: target.day,
    specialDesc: target.specialDesc,
    ruleDesc: target.ruleDesc,
  });
  const siteUrl = getPublicSiteUrl().replace(/\/$/, "");
  const linkPath = target.linkPath || DEFAULT_TRAFFIC_ALERT_COPY.linkPath;
  const url = `${siteUrl}${linkPath.startsWith("/") ? linkPath : `/${linkPath}`}`;

  const profile =
    target.planProfile ||
    resolveTrafficPlanProfile({
      productName,
      totalMb: target.totalMb,
      ruleDesc: target.ruleDesc,
      specialDesc: target.specialDesc,
      speedDesc: target.speedDesc,
    });

  const highSpeedQuota =
    target.highSpeedQuotaLabel ||
    profile.highSpeedQuotaLabel ||
    total ||
    "方案高速額度";

  const throttleSpeed =
    target.throttleSpeedLabel ||
    profile.throttleSpeedLabel ||
    "方案標示速度";

  const checkedAt = formatTrafficCheckedAt(
    target.checkedAt || new Date().toISOString(),
  );

  return {
    productName,
    remaining,
    total,
    totalPart: total ? ` / ${total}` : "",
    highSpeedQuota,
    throttleSpeed,
    checkedAt,
    planKind: profile.kind,
    siteUrl,
    url,
    upsellUrl: "",
    upsellLabel: "",
    upsellPath: "",
    upsellStrategy: "",
    upsellOffers: [],
  };
}

/** 含快速加購連結（async；僅推播文案用） */
export async function buildTrafficAlertVarsAsync(target = {}) {
  const vars = buildTrafficAlertVars(target);
  const upsellOffers = resolveTrafficUpsellOffers({
    sku: target.sku,
    planId: target.planId,
    productName: vars.productName,
  });
  if (!upsellOffers.length) return { ...vars, upsellOffers: [] };
  const first = upsellOffers[0];
  return {
    ...vars,
    upsellOffers,
    upsellUrl: first.url,
    upsellPath: first.path,
    upsellLabel: first.label,
    upsellStrategy: first.id,
  };
}

function appendUpsellToLine(lines, vars) {
  for (const offer of vars.upsellOffers || []) {
    if (offer?.url) lines.push(offer.url);
  }
}

function pickTemplates(copy, kind) {
  if (kind === "fup") {
    return {
      title: copy.fupTitle || copy.title,
      body: copy.fupBody || copy.body,
      lineExtra: copy.fupLineExtra || copy.lineExtra,
    };
  }
  return {
    title: copy.title,
    body: copy.body,
    lineExtra: copy.lineExtra,
  };
}

export async function loadTrafficAlertCopy({ force = false } = {}) {
  if (!force && cachedCopy && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedCopy;
  }

  try {
    const supabase = getSupabaseAdminServer();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value, updated_at")
      .eq("key", TRAFFIC_ALERT_COPY_KEY)
      .maybeSingle();

    if (!error && data?.value) {
      let parsed = data.value;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          parsed = null;
        }
      }
      const norm = normalizeTrafficAlertCopy(parsed);
      if (norm.ok) {
        cachedCopy = {
          ...norm.value,
          source: "db",
          updatedAt: data.updated_at,
        };
        cachedAt = Date.now();
        return cachedCopy;
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[trafficAlertCopy] 讀取失敗，使用預設：",
        err?.message || err,
      );
    }
  }

  cachedCopy = {
    ...DEFAULT_TRAFFIC_ALERT_COPY,
    source: "default",
    updatedAt: null,
  };
  cachedAt = Date.now();
  return cachedCopy;
}

export async function saveTrafficAlertCopy(raw) {
  const norm = normalizeTrafficAlertCopy(raw);
  if (!norm.ok) return norm;

  try {
    const supabase = getSupabaseAdminServer();
    const { error } = await supabase.from("platform_settings").upsert(
      {
        key: TRAFFIC_ALERT_COPY_KEY,
        value: JSON.stringify(norm.value),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) return { ok: false, message: error.message };
  } catch (err) {
    return { ok: false, message: err?.message || "寫入失敗" };
  }

  cachedCopy = {
    ...norm.value,
    source: "db",
    updatedAt: new Date().toISOString(),
  };
  cachedAt = Date.now();
  return { ok: true, value: norm.value };
}

export async function describeTrafficAlertCopy() {
  const copy = await loadTrafficAlertCopy({ force: true });
  return {
    copy: {
      title: copy.title,
      body: copy.body,
      lineExtra: copy.lineExtra,
      fupTitle: copy.fupTitle,
      fupBody: copy.fupBody,
      fupLineExtra: copy.fupLineExtra,
      linkPath: copy.linkPath,
    },
    source: copy.source || "default",
    updatedAt: copy.updatedAt || null,
    defaults: DEFAULT_TRAFFIC_ALERT_COPY,
    placeholders: [
      "{{productName}}",
      "{{remaining}}",
      "{{total}}",
      "{{totalPart}}",
      "{{highSpeedQuota}}",
      "{{throttleSpeed}}",
      "{{checkedAt}}",
      "{{url}}",
      "{{upsellUrl}}",
      "{{upsellLabel}}",
      "{{siteUrl}}",
    ],
  };
}

function resolveKind(target) {
  if (target.planKind === "fup" || target.planKind === "quota") {
    return target.planKind;
  }
  return resolveTrafficPlanProfile({
    productName: target.productName || target.product_label,
    totalMb: target.totalMb,
    ruleDesc: target.ruleDesc,
    specialDesc: target.specialDesc,
    speedDesc: target.speedDesc,
  }).kind;
}

/** Web Push payload（JSON string） */
export async function buildLowTrafficWebPayload(target) {
  const copy = await loadTrafficAlertCopy();
  const kind = resolveKind(target);
  const tpl = pickTemplates(copy, kind);
  const vars = await buildTrafficAlertVarsAsync({
    ...target,
    linkPath: copy.linkPath,
  });
  let body = renderTrafficTemplate(tpl.body, vars);
  if (kind === "fup") body = ensureFupSpeedDisclaimer(body);
  body = appendTrafficCheckedAtToBody(body, vars.checkedAt);
  const siteUrl = getPublicSiteUrl().replace(/\/$/, "");
  const icon = `${siteUrl}/images/Logo/icon-192.png`;
  return JSON.stringify({
    title: renderTrafficTemplate(tpl.title, vars),
    body,
    url: vars.url || copy.linkPath,
    icon,
    badge: icon,
    upsellOffers: vars.upsellOffers || [],
    upsellUrl: vars.upsellUrl || null,
    upsellLabel: vars.upsellLabel || null,
    planKind: kind,
    isTest: Boolean(target.isTestPush),
  });
}

const LINE_BTN_LABEL_MAX = 20;

function trimLineButtonLabel(label, fallback = "快速加購") {
  const t = String(label || fallback).trim();
  if (t.length <= LINE_BTN_LABEL_MAX) return t;
  return t.slice(0, LINE_BTN_LABEL_MAX - 1) + "…";
}

/** LINE Flex：內文 + 可點擊 URI 按鈕（查用量／快速加購） */
export async function buildLowTrafficLineMessages(target) {
  const copy = await loadTrafficAlertCopy();
  const kind = resolveKind(target);
  const tpl = pickTemplates(copy, kind);
  const vars = await buildTrafficAlertVarsAsync({
    ...target,
    linkPath: copy.linkPath,
  });
  const title = renderTrafficTemplate(tpl.title, vars);
  let body = renderTrafficTemplate(tpl.body, vars);
  if (kind === "fup") body = ensureFupSpeedDisclaimer(body);
  const extra = ensureTrafficCheckedAtLine(
    renderTrafficTemplate(tpl.lineExtra || "", vars),
    vars.checkedAt,
  );

  const bodyContents = [
    {
      type: "text",
      text: title,
      weight: "bold",
      size: "md",
      wrap: true,
      color: "#111827",
    },
    {
      type: "text",
      text: body,
      size: "sm",
      wrap: true,
      margin: "md",
      color: "#374151",
    },
  ];
  if (extra) {
    bodyContents.push({
      type: "text",
      text: extra,
      size: "xs",
      wrap: true,
      margin: "md",
      color: "#6B7280",
    });
  }

  const footerButtons = [
    {
      type: "button",
      style: "primary",
      color: "#3768C7",
      action: {
        type: "uri",
        label: "查詢用量",
        uri: vars.url,
      },
    },
  ];
  for (const offer of vars.upsellOffers || []) {
    if (!offer?.url) continue;
    footerButtons.push({
      type: "button",
      style: "link",
      action: {
        type: "uri",
        label: trimLineButtonLabel(offer.label, "快速加購"),
        uri: offer.url,
      },
    });
  }

  return [
    {
      type: "flex",
      altText: `${title} ${body}`.slice(0, 400),
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: bodyContents,
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: footerButtons,
        },
      },
    },
  ];
}

/** LINE 純文字（預覽／後備） */
export async function buildLowTrafficLineText(target) {
  const copy = await loadTrafficAlertCopy();
  const kind = resolveKind(target);
  const tpl = pickTemplates(copy, kind);
  const vars = await buildTrafficAlertVarsAsync({
    ...target,
    linkPath: copy.linkPath,
  });
  const title = renderTrafficTemplate(tpl.title, vars);
  let body = renderTrafficTemplate(tpl.body, vars);
  if (kind === "fup") body = ensureFupSpeedDisclaimer(body);
  const extra = ensureTrafficCheckedAtLine(
    renderTrafficTemplate(tpl.lineExtra || "", vars),
    vars.checkedAt,
  );
  const lines = [title, "", body, "", vars.url];
  appendUpsellToLine(lines, vars);
  if (extra) lines.push(extra);
  return lines.filter((line) => line != null && line !== "").join("\n");
}
