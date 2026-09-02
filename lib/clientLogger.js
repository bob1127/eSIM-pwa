/**
 * 瀏覽器端 log：正式站預設靜音，避免客人 Console 出現除錯訊息。
 * 本機 dev 或 NEXT_PUBLIC_CLIENT_DEBUG=1 時才輸出。
 */

function clientDebugEnabled() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_CLIENT_DEBUG === "1"
  );
}

export function clientLog(...args) {
  if (clientDebugEnabled()) console.log(...args);
}

export function clientWarn(...args) {
  if (clientDebugEnabled()) console.warn(...args);
}

/** 非預期錯誤：正式站預設靜音（與 log/warn 相同；除錯時設 NEXT_PUBLIC_CLIENT_DEBUG=1） */
export function clientError(...args) {
  if (clientDebugEnabled()) console.error(...args);
}
