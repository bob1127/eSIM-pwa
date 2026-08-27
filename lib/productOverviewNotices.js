/** 解析 Medusa metadata.overview_notices_by_carrier */

import { stripEuPackCopy } from "./productKeyFeatures";
import { soleCarrierFallback } from "./productCarrierMetaFallback";

export const OVERVIEW_NOTICES_METADATA_KEY = "overview_notices_by_carrier";

export function parseOverviewNoticesByCarrier(raw) {
  if (!raw) return {};
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};

  const out = {};
  for (const [carrier, notice] of Object.entries(data)) {
    if (!notice || typeof notice !== "object") continue;
    const fup = stripEuPackCopy(String(notice.fup_notice || "").trim());
    const activation = stripEuPackCopy(
      String(notice.activation_notice || "").trim(),
    );
    const special = stripEuPackCopy(String(notice.special_notice || "").trim());
    if (fup || activation || special) {
      out[carrier] = {
        ...(fup ? { fup_notice: fup } : {}),
        ...(activation ? { activation_notice: activation } : {}),
        ...(special ? { special_notice: special } : {}),
      };
    }
  }
  return out;
}

function findCarrierEntry(map, carrierName) {
  if (!map || !carrierName || carrierName === "default") return null;
  const carrier = String(carrierName).trim();
  if (map[carrier]) return map[carrier];
  const key = Object.keys(map).find(
    (k) => k.trim().toLowerCase() === carrier.toLowerCase(),
  );
  return key ? map[key] : null;
}

/** 依電信商取得概覽說明（含 default 後備） */
export function resolveOverviewNotices(product, carrierName) {
  const fromMeta = parseOverviewNoticesByCarrier(
    product?.overview_notices_by_carrier,
  );
  if (!fromMeta || !Object.keys(fromMeta).length) return null;

  const matched = findCarrierEntry(fromMeta, carrierName);
  if (matched) return matched;
  if (fromMeta.default) return fromMeta.default;
  if (fromMeta._default) return fromMeta._default;
  return soleCarrierFallback(fromMeta, carrierName);
}
