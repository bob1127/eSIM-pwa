/** Medusa metadata.key_features_by_carrier 解析（相容舊版 string[] 與新版物件） */

export function normalizeCarrierFeatureEntry(value) {
  if (Array.isArray(value)) {
    return {
      bullets: value.map(String).filter(Boolean),
      actualExperience: "",
    };
  }

  if (value && typeof value === "object") {
    const obj = value;
    const bullets = Array.isArray(obj.bullets)
      ? obj.bullets.map(String).filter(Boolean)
      : [];
    const actualExperience = String(
      obj.actual_experience ?? obj.actualExperience ?? "",
    ).trim();
    return { bullets, actualExperience };
  }

  return { bullets: [], actualExperience: "" };
}

export function parseKeyFeaturesByCarrier(raw) {
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
      normalizeCarrierFeatureEntry(value),
    ]),
  );
}

function carrierSpeedTier(label) {
  const t = String(label || "")
    .toLowerCase()
    .replace(/\s+/g, "");
  const is10 = /10mbps|10m(?:bps)?$|限速.?10/.test(t);
  const isHighSpeed =
    !is10 && /高速|真.?不限|highspeed|不限速吃到飽|真不限速/.test(t);
  return { is10, isHighSpeed };
}

export function findCarrierFeatureEntry(fromMeta, carrierName) {
  if (!fromMeta || !carrierName || carrierName === "default") return null;
  const carrier = String(carrierName).trim();
  if (fromMeta[carrier]) return fromMeta[carrier];
  const lower = carrier.toLowerCase();
  const key = Object.keys(fromMeta).find((k) => k.trim().toLowerCase() === lower);
  if (key) return fromMeta[key];

  const want = carrierSpeedTier(carrier);

  // SoftBank／IIJ／AU 等選項名含括號備註時，用前綴／包含比對
  let looseKeys = Object.keys(fromMeta).filter((k) => {
    if (!k || k.length < 2) return false;
    const a = k.trim().toLowerCase();
    const aCore = a.split("（")[0].split("(")[0].trim();
    return (
      a === lower ||
      a.startsWith(lower) ||
      lower.startsWith(a) ||
      a.includes(lower) ||
      lower.includes(a) ||
      (aCore.length >= 2 &&
        (lower.includes(aCore) || aCore.includes(lower.split(/\s+/)[0])))
    );
  });

  // 10Mbps 方案絕不可落到真不限速／高速數據文案（如福岡 600Mbps）
  if (want.is10) {
    const only10 = looseKeys.filter((k) => carrierSpeedTier(k).is10);
    if (only10.length) looseKeys = only10;
    else return null;
  } else if (want.isHighSpeed) {
    const onlyHs = looseKeys.filter((k) => !carrierSpeedTier(k).is10);
    if (onlyHs.length) looseKeys = onlyHs;
  } else if (looseKeys.length) {
    // 未標 10Mbps／高速時，優先非 10Mbps 鍵
    const non10 = looseKeys.filter((k) => !carrierSpeedTier(k).is10);
    if (non10.length) looseKeys = non10;
  }

  if (!looseKeys.length) return null;
  // 多筆命中取鍵名最長（較具體）
  looseKeys.sort((a, b) => b.length - a.length);
  return fromMeta[looseKeys[0]];
}

export function resolveIntroBullets(product, carrierName) {
  const fromMeta = parseKeyFeaturesByCarrier(product?.key_features_by_carrier);
  if (!fromMeta || !Object.keys(fromMeta).length) return [];
  const matched = findCarrierFeatureEntry(fromMeta, carrierName);
  if (matched?.bullets?.length) return matched.bullets;
  if (fromMeta.default?.bullets?.length) return fromMeta.default.bullets;
  return [];
}

export function resolveActualExperience(product, carrierName) {
  const fromMeta = parseKeyFeaturesByCarrier(product?.key_features_by_carrier);
  if (!fromMeta || !Object.keys(fromMeta).length) return "";
  const matched = findCarrierFeatureEntry(fromMeta, carrierName);
  if (matched?.actualExperience) return matched.actualExperience;
  return fromMeta.default?.actualExperience || "";
}

export function serializeKeyFeaturesByCarrier(map) {
  const out = {};
  Object.entries(map).forEach(([carrier, entry]) => {
    const bullets = (entry.bullets || [])
      .map((b) => b.replace(/^\s+|\s+$/g, ""))
      .filter(Boolean);
    const actualExperience = String(entry.actualExperience || "").trim();
    if (bullets.length || actualExperience) {
      out[carrier] = {
        bullets,
        actual_experience: actualExperience,
      };
    }
  });
  return out;
}
