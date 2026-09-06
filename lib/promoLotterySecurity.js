/**
 * 拉霸抽獎 API 資安：同源、蜜罐、安全標頭（沿用夥伴登入同款工具）。
 */
export {
  assertSameSiteRequest,
  authFailureDelay,
  getClientIp,
  isHoneypotTriggered,
  applyPartnerAuthSecurityHeaders as applyLotterySecurityHeaders,
} from "./partnerLoginSecurity";

/** POST body 僅允許空物件／蜜罐；拒絕塞入 prize／amount 等偽造欄位 */
export function hasForbiddenLotteryClientFields(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const forbidden = [
    "prize",
    "prize_id",
    "amount",
    "weight",
    "code",
    "email",
    "userId",
    "user_id",
    "lineUserId",
    "line_user_id",
  ];
  return forbidden.some((k) =>
    Object.prototype.hasOwnProperty.call(body, k),
  );
}
