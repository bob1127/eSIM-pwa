/** Medusa metadata.carrier_specs_by_carrier — 商品頁方案規格 icon 區塊（依電信商） */

import { stripEuPackCountLabel } from "./productSubtitleByCarrier";

const SPEC_KEYS = ["ip_type", "route_type", "network", "speed_rule", "apps"];

/**
 * 從 API／介紹文字抽出有標明的速度（Mbps / kbps）
 * 無數字速度則回傳空字串
 */
export function extractSpeedLabel(...texts) {
  const blob = texts
    .filter((t) => t != null && String(t).trim())
    .map((t) => String(t))
    .join(" ");
  if (!blob) return "";

  let m = blob.match(
    /(?:speed\s*(?:of\s*4g[,，]?\s*)?speed\s*between|between|約)?\s*(\d+)\s*[~～\-–—到至]\s*(\d+)\s*Mbps/i,
  );
  if (m) return `約 ${m[1]}–${m[2]} Mbps`;

  m = blob.match(/(\d+)\s*Mbps/i);
  if (m) return `約 ${m[1]} Mbps`;

  m = blob.match(/unlimited\s+(\d+)\s*kbps/i);
  if (m) return `高速用完後降速至 ${m[1]} kbps`;

  m = blob.match(/(\d+)\s*kbps/i);
  if (m) return `${m[1]} kbps`;

  return "";
}

function looksLikeGenericSpeed(text) {
  const s = String(text || "").trim();
  if (!s) return true;
  if (/\d\s*(Mbps|kbps)/i.test(s)) return false;
  return /降速或用完斷網|用完斷網|未知|公平使用|FUP/i.test(s);
}

/** apps 可能是字串，或 { gpt, tiktok, gemini, hotspot, ... } 旗標物件 */
export function formatCarrierAppsLabel(apps) {
  if (apps == null || apps === "") return "";
  if (typeof apps === "string") {
    const s = apps.trim();
    if (!s || s === "[object Object]") return "";
    return s;
  }
  if (typeof apps === "object" && !Array.isArray(apps)) {
    const parts = [];
    const on = (v) => v === true || v === "true" || v === 1 || v === "1";
    if (on(apps.hotspot) || on(apps.hot_spot)) parts.push("熱點分享");
    if (on(apps.gpt) || on(apps.chatgpt) || on(apps.ChatGPT))
      parts.push("ChatGPT");
    if (on(apps.tiktok) || on(apps.TikTok)) parts.push("TikTok");
    if (on(apps.gemini) || on(apps.Gemini)) parts.push("Gemini");
    if (on(apps.line) || on(apps.line_app)) parts.push("LINE");
    if (on(apps.instagram) || on(apps.ig)) parts.push("IG");
    if (on(apps.facebook) || on(apps.fb)) parts.push("FB");
    if (on(apps.vpn_free)) parts.push("免VPN社群");
    // 若物件另帶字串欄位
    if (!parts.length && typeof apps.label === "string") {
      return apps.label.trim();
    }
    return parts.join("、");
  }
  if (Array.isArray(apps)) {
    return apps.map((x) => String(x).trim()).filter(Boolean).join("、");
  }
  return "";
}

export function normalizeCarrierSpecEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ip_type: "",
      route_type: "",
      network: "",
      speed_rule: "",
      apps: "",
    };
  }

  const obj = value;
  return {
    ip_type: String(obj.ip_type ?? "").trim(),
    route_type: String(obj.route_type ?? "").trim(),
    network: String(obj.network ?? "").trim(),
    speed_rule: String(obj.speed_rule ?? "").trim(),
    apps: formatCarrierAppsLabel(obj.apps),
  };
}

export function parseCarrierSpecsByCarrier(raw) {
  if (!raw) return null;

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([carrier, value]) => [
      carrier,
      normalizeCarrierSpecEntry(value),
    ]),
  );
}

export function findCarrierSpecEntry(fromMeta, carrierName) {
  if (!fromMeta || !carrierName || carrierName === "default") return null;
  const carrier = String(carrierName).trim();
  if (fromMeta[carrier]) return fromMeta[carrier];
  const key = Object.keys(fromMeta).find(
    (k) => k.trim().toLowerCase() === carrier.toLowerCase(),
  );
  return key ? fromMeta[key] : null;
}

export function resolveCarrierSpecs(product, carrierName, variation) {
  const fromMeta = parseCarrierSpecsByCarrier(
    product?.carrier_specs_by_carrier ||
      product?.metadata?.carrier_specs_by_carrier,
  );
  const matched = fromMeta
    ? findCarrierSpecEntry(fromMeta, carrierName) || fromMeta.default || null
    : null;

  const normalized = normalizeCarrierSpecEntry(matched || {});

  // 若 metadata 未寫 apps，依變體屬性補上熱點／GPT／TikTok（對齊圖二「支援：…」）
  if (!normalized.apps) {
    const attrs = variation?.attributes || {};
    const parts = [];
    const on = (v) => v === true || v === "true" || v === 1 || v === "1";
    if (on(attrs.hotspot)) parts.push("熱點分享");
    if (on(attrs.gpt) || on(attrs.chatgpt)) parts.push("ChatGPT");
    if (on(attrs.tiktok)) parts.push("TikTok");
    if (on(attrs.gemini)) parts.push("Gemini");
    if (parts.length) normalized.apps = parts.join("、");
  }

  // 變體／後台 API 若有標明數字速度，優先於電信商預設（同電信可能有 5Mbps / 128kbps 等）
  const attrs = variation?.attributes || {};
  const extracted = extractSpeedLabel(
    attrs.speed_rule,
    variation?.speed_desc,
    variation?.rule_desc,
    variation?.metadata?.speed_desc,
    variation?.metadata?.rule_desc,
    variation?.metadata?.attributes?.speed_rule,
  );
  const ruleBlob = [
    variation?.rule_desc,
    variation?.metadata?.rule_desc,
    attrs.speed_rule,
  ]
    .filter(Boolean)
    .join(" ");
  if (extracted) {
    normalized.speed_rule = extracted;
  } else if (/terminate|用完斷網/i.test(ruleBlob)) {
    // API 標 Terminate＝用完斷網，勿套用電信商預設降速文案
    normalized.speed_rule = "用完斷網";
  } else if (
    looksLikeGenericSpeed(normalized.speed_rule) &&
    attrs.speed_rule &&
    /\d\s*(Mbps|kbps)/i.test(String(attrs.speed_rule))
  ) {
    normalized.speed_rule = String(attrs.speed_rule).trim();
  } else {
    // 無變體速度時，再從商品介紹補抽（僅在目前仍是泛用文案時）
    const fromProduct = extractSpeedLabel(
      product?.description,
      product?.subtitle,
    );
    if (fromProduct && looksLikeGenericSpeed(normalized.speed_rule)) {
      normalized.speed_rule = fromProduct;
    }
  }

  if (!normalized.network && attrs.network) {
    normalized.network = String(attrs.network).trim();
  }
  if (!normalized.ip_type && attrs.ip_type) {
    normalized.ip_type = String(attrs.ip_type).trim();
  }
  if (!normalized.route_type && (attrs.route_type || attrs.line)) {
    normalized.route_type = String(attrs.route_type || attrs.line).trim();
  }

  const hasAny = SPEC_KEYS.some((key) => normalized[key]);
  return hasAny ? normalized : null;
}

export function buildCarrierSpecDisplayItems(specs) {
  if (!specs) return [];

  const items = [];
  // 圖二風格：IP → 漫遊/原生 → 網速 → 速度（有標明才顯示）
  if (specs.ip_type) {
    items.push({ key: "ip_type", icon: "public", text: specs.ip_type });
  }
  if (specs.route_type) {
    const route = String(specs.route_type)
      .replace(/線路$/u, "")
      .trim();
    items.push({
      key: "route_type",
      icon: "diamond",
      text: route || specs.route_type,
    });
  }
  if (specs.network) {
    const network = stripEuPackCountLabel(
      String(specs.network)
        .replace(/\s*\/\s*/g, "/")
        .replace(/極速/g, "")
        .replace(/CMCC\+?\s*/gi, "")
        .trim(),
    );
    items.push({
      key: "network",
      icon: "signal_cellular_alt",
      text: network || specs.network,
    });
  }
  if (specs.speed_rule) {
    items.push({ key: "speed_rule", icon: "bolt", text: specs.speed_rule });
  }
  if (specs.apps) {
    const apps = stripEuPackCountLabel(String(specs.apps).trim());
    if (apps) {
      // 「不一定支援熱點」等完整語句不再加「支援：」前綴
      const text = /^(支援|不一定|不支援)/u.test(apps)
        ? apps
        : `支援： ${apps}`;
      items.push({
        key: "apps",
        icon: "check_circle",
        text,
        fullWidth: true,
        iconClass: "text-emerald-600",
      });
    }
  }
  return items;
}

export function serializeCarrierSpecsByCarrier(map) {
  const out = {};
  Object.entries(map).forEach(([carrier, entry]) => {
    const normalized = normalizeCarrierSpecEntry(entry);
    const payload = {};
    SPEC_KEYS.forEach((key) => {
      if (normalized[key]) payload[key] = normalized[key];
    });
    if (Object.keys(payload).length) out[carrier] = payload;
  });
  return out;
}
