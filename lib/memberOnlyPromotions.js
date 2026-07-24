/**
 * 「限新會員 / 首購」折扣碼設定。
 *
 * FIRST50 / NEW50：新會員第一筆訂單折 50（須登入且無已付款訂單）
 * 與 welcome 個人券擇一主打即可，避免重複折抵。
 */
export const MEMBER_ONLY_PROMO_CODES = ["NEW50", "FIRST50"];

export function isMemberOnlyPromoCode(code) {
  if (!code) return false;
  return MEMBER_ONLY_PROMO_CODES.includes(String(code).trim().toUpperCase());
}
