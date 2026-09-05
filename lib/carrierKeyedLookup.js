/**
 * 依電信商 key 查 metadata map（相容「吃到飽 不限流量 (IIJ Docomo)」對 IIJ Docomo）
 */

export function extractCarrierFromLabel(label) {
  const s = String(label || "").trim();
  if (!s) return "";
  const m = s.match(/\(([^)]+)\)\s*$/);
  return m ? String(m[1]).trim() : "";
}

/**
 * @param {Record<string, any>|null|undefined} map
 * @param {string} carrierName
 * @returns {any|null}
 */
export function findCarrierKeyedValue(map, carrierName) {
  if (!map || !carrierName || carrierName === "default") return null;
  const carrier = String(carrierName).trim();
  if (map[carrier] != null) return map[carrier];

  const lower = carrier.toLowerCase();
  const exact = Object.keys(map).find(
    (k) => k.trim().toLowerCase() === lower,
  );
  if (exact) return map[exact];

  const nested = extractCarrierFromLabel(carrier);
  if (nested && nested !== carrier) {
    const hit = findCarrierKeyedValue(map, nested);
    if (hit != null) return hit;
  }

  // map key 在 label 括號內／label 包含 key
  const loose = Object.keys(map)
    .filter((k) => {
      if (!k || k === "default" || k === "_default" || /^\d+$/.test(k)) {
        return false;
      }
      const a = k.trim().toLowerCase();
      return (
        lower.includes(a) ||
        a.includes(lower) ||
        (nested && nested.toLowerCase().includes(a))
      );
    })
    .sort((a, b) => b.length - a.length);
  if (loose[0]) return map[loose[0]];

  return null;
}

/**
 * 電信選項是否視為「原生 IP」線路（供 HOT SALE；不用整商品 is_native）
 */
export function isNativeIpTelecomLabel(telecom, carrierSpec = {}) {
  const t = String(telecom || "").trim();
  if (!t) return false;
  const core = extractCarrierFromLabel(t) || t;
  const hay = [t, core, carrierSpec?.ip_type, carrierSpec?.route_type]
    .filter(Boolean)
    .join(" ");

  if (/漫遊/.test(hay) && !/原生/.test(hay)) return false;
  if (/原生\s*IP|本地\s*IP|當地\s*IP|Native\s*IP/i.test(hay)) return true;
  if (/原生/.test(String(carrierSpec?.route_type || "")) && !/漫遊/.test(hay)) {
    return true;
  }

  // 日本：IIJ Docomo／AU(KDDI) 單網視為原生
  if (/IIJ|Docomo|DOCOMO/i.test(core) && !/SoftBank|KDDI\s*\/|\/\s*KDDI/i.test(core)) {
    return true;
  }
  if (/AU\s*\(?\s*KDDI\s*\)?/i.test(core) && !/\//.test(core.replace(/AU\s*\(?\s*KDDI\s*\)?/i, ""))) {
    return true;
  }

  // 韓國原生 IP 標籤
  if (/韓國\s*IP|SK電信（韓國IP）|原生/i.test(t) && !/漫遊|雙切換/i.test(t)) {
    return true;
  }

  // 雙網（含／）多半漫遊
  if (core.includes("/")) return false;

  return false;
}
