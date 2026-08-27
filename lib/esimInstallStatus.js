/**
 * 從用量／供應商 status 推斷 eSIM 是否「已在使用」（瀏覽器無法讀本機 eSIM 清單）
 * @returns {boolean|null} true=有使用證據, false=明確未用, null=未知
 *
 * 正確性原則：
 * - 不可單靠 deviceDetail.active_time / activation_date（常在出貨或系統側寫入，使用者可能還沒掃 QR）
 * - 可信證據：已用流量 > 0、剩餘 < 總量、或 status 明確 In use
 */
export function inferEsimInstalled(usage = null) {
  if (!usage || typeof usage !== "object") return null;

  const s = String(usage.status || usage.state || "").toLowerCase().trim();
  if (s) {
    if (/in[\s_-]?use|using|使用中/.test(s)) return true;
    if (
      /unused|available|ready|got|not[\s_-]?use|pending|process|new|issued|未安裝|未啟用|未|待|新發|發放/.test(
        s,
      )
    ) {
      return false;
    }
  }

  const used = Number(usage.usedMb);
  if (Number.isFinite(used) && used > 0) return true;

  const rem = Number(usage.remainingMb);
  const tot = Number(usage.totalMb);
  if (Number.isFinite(rem) && Number.isFinite(tot) && tot > 0 && rem < tot) {
    return true;
  }

  // active_time／success／rem===tot 皆不足證明本機已安裝
  return null;
}
