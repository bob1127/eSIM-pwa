/**
 * 「限新會員 / 首購」折扣碼設定。
 *
 * 背景：Medusa 的促銷（Promotion）規則引擎本身沒有原生的
 * 「僅限第一次下單」條件，只能用 Customer Group / Product / 金額等規則。
 * 因此像 NEW50 這種「新會員優惠」必須由前台自行檢查：
 *   1. 使用者必須已登入（Supabase）
 *   2. 該會員 email 過去沒有任何已完成付款（status = success）的訂單
 * 只要符合以上條件，才允許把折扣碼送進 Medusa 購物車。
 *
 * 之後如果要新增其他「限新會員」折扣碼，把代碼加進下面陣列即可。
 */
export const MEMBER_ONLY_PROMO_CODES = ["NEW50"];

export function isMemberOnlyPromoCode(code) {
  if (!code) return false;
  return MEMBER_ONLY_PROMO_CODES.includes(String(code).trim().toUpperCase());
}
