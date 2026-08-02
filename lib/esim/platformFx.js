/**
 * 平台內部換匯（夥伴底價／選品神器預設共用）
 * - 偏保守：寧可估高成本，避免低估導致定價賠錢
 * - 伺服器可用 ESIM_FX_RATE_USD / ESIM_FX_RATE_HKD 覆寫
 * - 瀏覽器可用 NEXT_PUBLIC_ESIM_FX_RATE_* 覆寫（需與伺服器一致）
 */

export const DEFAULT_PLATFORM_FX = {
  USD: 33.0,
  HKD: 4.5,
};

function readRate(keys, fallback) {
  for (const key of keys) {
    const raw = process.env[key];
    if (raw == null || raw === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

/** 伺服器端：夥伴底價快照、refresh-b2b-costs */
export function getPlatformFxRates() {
  return {
    USD: readRate(
      ["ESIM_FX_RATE_USD", "NEXT_PUBLIC_ESIM_FX_RATE_USD"],
      DEFAULT_PLATFORM_FX.USD,
    ),
    HKD: readRate(
      ["ESIM_FX_RATE_HKD", "NEXT_PUBLIC_ESIM_FX_RATE_HKD"],
      DEFAULT_PLATFORM_FX.HKD,
    ),
  };
}

/** 瀏覽器端：選品神器預設（僅看得到 NEXT_PUBLIC_*） */
export function getClientPlatformFxRates() {
  return {
    USD: readRate(["NEXT_PUBLIC_ESIM_FX_RATE_USD"], DEFAULT_PLATFORM_FX.USD),
    HKD: readRate(["NEXT_PUBLIC_ESIM_FX_RATE_HKD"], DEFAULT_PLATFORM_FX.HKD),
  };
}
