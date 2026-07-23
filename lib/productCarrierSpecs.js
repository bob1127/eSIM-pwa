/** Medusa metadata.carrier_specs_by_carrier — 商品頁方案規格 icon 區塊（依電信商） */

const SPEC_KEYS = ["ip_type", "route_type", "network", "speed_rule", "apps"];

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
    apps: String(obj.apps ?? "").trim(),
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
  const fromMeta = parseCarrierSpecsByCarrier(product?.carrier_specs_by_carrier);
  if (!fromMeta || !Object.keys(fromMeta).length) return null;

  const matched =
    findCarrierSpecEntry(fromMeta, carrierName) || fromMeta.default || null;
  if (!matched) return null;

  const normalized = normalizeCarrierSpecEntry(matched);

  // 若 metadata 未寫 apps，依變體屬性補上熱點／GPT／TikTok（對齊圖二「支援：…」）
  if (!normalized.apps) {
    const attrs = variation?.attributes || {};
    const parts = [];
    const hotspot =
      attrs.hotspot === true ||
      attrs.hotspot === "true" ||
      attrs.hotspot === 1;
    if (hotspot) parts.push("熱點分享");
    if (attrs.gpt === true || attrs.gpt === "true") parts.push("ChatGPT");
    if (attrs.tiktok === true || attrs.tiktok === "true") parts.push("TikTok");
    if (parts.length) normalized.apps = parts.join(",");
  }

  const hasAny = SPEC_KEYS.some((key) => normalized[key]);
  return hasAny ? normalized : null;
}

export function buildCarrierSpecDisplayItems(specs) {
  if (!specs) return [];

  const items = [];
  // 圖二風格：IP → 漫遊/原生 → 網速（優先這三項）
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
    const network = String(specs.network)
      .replace(/\s*\/\s*/g, "/")
      .replace(/極速/g, "")
      .replace(/CMCC\+?\s*/gi, "")
      .trim();
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
    items.push({
      key: "apps",
      icon: "check_circle",
      text: `支援： ${specs.apps}`,
      fullWidth: true,
      iconClass: "text-emerald-600",
    });
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
