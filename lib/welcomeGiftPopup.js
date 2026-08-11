/** 登入／註冊成功後顯示「新會員 50」彈窗的 session 旗標 */

export const WELCOME_GIFT_POPUP_KEY = "jeko_show_welcome_gift_popup";

/**
 * 僅在「註冊成功」時彈出歡迎禮（勿設 true 上正式站：會變成每次登入都跳）。
 * 本機若要測歡迎禮 UI，可暫時改 true。
 */
export const WELCOME_GIFT_TRIGGER_ON_LOGIN = false;

export function markWelcomeGiftPopup() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(WELCOME_GIFT_POPUP_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** 同一瀏覽器只自動彈一次「首次發券」歡迎禮（避免每次進會員中心都跳） */
export const WELCOME_GIFT_CLAIMED_SHOWN_KEY = "jeko_welcome_gift_claimed_shown";

export function markWelcomeGiftShownForClaim() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WELCOME_GIFT_CLAIMED_SHOWN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasShownWelcomeGiftForClaim() {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(WELCOME_GIFT_CLAIMED_SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * 會員首次被系統發放 welcome 券時呼叫：標示彈窗（若尚未顯示過）。
 */
export function maybeMarkWelcomeGiftOnFirstClaim(welcomePayload) {
  if (!welcomePayload || welcomePayload.alreadyClaimed) return false;
  if (!welcomePayload.coupon) return false;
  if (hasShownWelcomeGiftForClaim()) return false;
  markWelcomeGiftPopup();
  markWelcomeGiftShownForClaim();
  return true;
}

export function consumeWelcomeGiftPopupFlag() {
  if (typeof window === "undefined") return false;
  try {
    const v = sessionStorage.getItem(WELCOME_GIFT_POPUP_KEY);
    if (v !== "1") return false;
    sessionStorage.removeItem(WELCOME_GIFT_POPUP_KEY);
    return true;
  } catch {
    return false;
  }
}

export function peekWelcomeGiftPopupFlag() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(WELCOME_GIFT_POPUP_KEY) === "1";
  } catch {
    return false;
  }
}
