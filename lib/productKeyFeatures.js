/** Medusa metadata.key_features_by_carrier 解析（相容舊版 string[] 與新版物件） */

import { soleCarrierFallback } from "./productCarrierMetaFallback";

/** 單國商品頁不要寫歐包／含歐洲 N 國（批發包已當成該國 eSIM 上架） */
export function stripEuPackCopy(text) {
  if (!text) return text;
  return String(text)
    .replace(/同一張也可在[^。]*。/g, "")
    .replace(/同一張含歐包\s*\d+\s*國。?/g, "")
    .replace(/同一張含歐洲\s*\d+\s*國(?:（[^）]*）)?。?/g, "")
    .replace(/同一張含歐洲多國[^。]*。?/g, "")
    .replace(/\*{0,2}歐包\s*\d+(?:\s*[／/]\s*\d+)?\s*國\*{0,2}[：:][^\n<。]*同一張可在[^。]*。?/g, "")
    .replace(/歐包\s*\d+(?:\s*[／/]\s*\d+)?\s*國[：:][^\n<。]*。?/g, "")
    .replace(/同一張可在[^。]*等地使用。?/g, "")
    .replace(/[，、]?以[^，。、]{1,16}為主[，、]含歐[洲包]\s*\d+\s*國(?:（[^）]*）)?。?/g, "")
    .replace(/[，、]?[^，。、]{1,16}為主[，、]含歐[洲包]\s*\d+\s*國(?:（[^）]*）)?。?/g, "")
    .replace(/[，、]?並含歐洲\s*\d+\s*國(?:（[^）]*）)?。?/g, "")
    .replace(/[，、]?含歐洲\s*\d+\s*國(?:（[^）]*）)?。?/g, "")
    .replace(/[，、]?含歐包\s*\d+\s*國(?:（[^）]*）)?。?/g, "")
    .replace(/兩種方案：歐包\s*\d+\s*國（[^）]*）與歐包\s*\d+\s*國（[^）]*）[，、]?/g, "")
    .replace(/可選歐包\s*\d+\s*國（[^）]*）(?:或歐包\s*\d+\s*國（[^）]*）)?[，、]?/g, "")
    .replace(/或歐包覆蓋範圍/g, "覆蓋範圍")
    .replace(/歐包\s*\d+(?:\s*[／/]\s*\d+)?\s*國/g, "")
    .replace(/歐包多國/g, "")
    .replace(/歐包/g, "")
    .replace(/（批發 SKU `[^`]+`）/g, "")
    .replace(/選品標示支援/g, "支援")
    .replace(/（[、，\s]+/g, "（")
    .replace(/[、，\s]+）/g, "）")
    .replace(/（\s*）/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/。[。]+/g, "。")
    .replace(/，+/g, "，")
    .replace(/、+/g, "、")
    .replace(/eSIM，\s*。/g, "eSIM。")
    .replace(/\s+。/g, "。")
    .replace(/^[，、。\s]+/g, "")
    .trim();
}

export function stripExitIpFromExperience(text) {
  if (!text) return text;
  return stripEuPackCopy(text)
    .replace(/出網為[^。；]*IP(?:（APN [^）]+）)?(?:漫遊節點)?[，；]?/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/。[。]+/g, "。")
    .trim();
}

function shouldDropFeatureBullet(text) {
  const s = String(text || "").trim();
  const plain = s.replace(/\*/g, "").trim();
  if (/^歐包\s*\d+(?:\s*[／/]\s*\d+)?\s*國/.test(plain)) return true;
  if (/為主/.test(plain) && /含歐[洲包]/.test(plain)) return true;
  if (/^含歐洲\s*\d+\s*國/.test(plain)) return true;
  if (/同一張可在/.test(s) && /等地使用/.test(s)) return true;
  if (/^\*\*漫遊出口\*\*/.test(s)) return true;
  return false;
}

export function normalizeCarrierFeatureEntry(value) {
  if (Array.isArray(value)) {
    return {
      bullets: value
        .map(String)
        .filter((b) => b && !shouldDropFeatureBullet(b))
        .map((b) => stripEuPackCopy(b))
        .filter(Boolean),
      actualExperience: "",
    };
  }

  if (value && typeof value === "object") {
    const obj = value;
    const bullets = Array.isArray(obj.bullets)
      ? obj.bullets
          .map(String)
          .filter((b) => b && !shouldDropFeatureBullet(b))
          .map((b) => stripEuPackCopy(b))
          .filter(Boolean)
      : [];
    const actualExperience = stripExitIpFromExperience(
      String(obj.actual_experience ?? obj.actualExperience ?? "").trim(),
    );
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

  // 「吃到飽 不限流量 (SoftBank / KDDI 10Mbps)」→ SoftBank / KDDI 10Mbps
  const paren = carrier.match(/\(([^)]+)\)\s*$/);
  const nested = paren ? String(paren[1]).trim() : "";
  if (nested && nested !== carrier) {
    const nestedHit = findCarrierFeatureEntry(fromMeta, nested);
    if (nestedHit) return nestedHit;
  }

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
  const sole = soleCarrierFallback(fromMeta, carrierName);
  if (sole?.bullets?.length) return sole.bullets;
  return [];
}

export function resolveActualExperience(product, carrierName) {
  const fromMeta = parseKeyFeaturesByCarrier(product?.key_features_by_carrier);
  if (!fromMeta || !Object.keys(fromMeta).length) return "";
  const matched = findCarrierFeatureEntry(fromMeta, carrierName);
  if (matched?.actualExperience) return matched.actualExperience;
  if (fromMeta.default?.actualExperience) return fromMeta.default.actualExperience;
  const sole = soleCarrierFallback(fromMeta, carrierName);
  return sole?.actualExperience || "";
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
