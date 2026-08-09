/**
 * 全站統一密碼原則：最少 8 碼，且需同時包含字母與數字。
 * 前端（即時提示）與後端（signUp / createUser / updateUser 前）都必須呼叫，
 * 避免只靠前端檢查被繞過。
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HINT = `至少 ${PASSWORD_MIN_LENGTH} 位，需包含字母與數字`;

/** @returns {string|null} 錯誤訊息；通過驗證時回傳 null */
export function validatePassword(password) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `密碼長度至少需 ${PASSWORD_MIN_LENGTH} 位`;
  }
  if (password.length > 128) {
    return "密碼長度過長";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "密碼需同時包含字母與數字";
  }
  return null;
}

export function isPasswordValid(password) {
  return validatePassword(password) === null;
}
