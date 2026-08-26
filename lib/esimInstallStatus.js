/**
 * 從用量／供應商 status 推斷 eSIM 是否已安裝（瀏覽器無法讀本機 eSIM 清單）
 * @returns {boolean|null} true=已安裝／已開通, false=尚未, null=未知
 */
export function inferEsimInstalled(usage = null) {
  if (!usage || typeof usage !== "object") return null;

  const s = String(usage.status || usage.state || "").toLowerCase().trim();
  if (s) {
    if (
      /install|download|enable|activ|in[\s_-]?use|got|used|開通|安裝|啟用|已用/.test(
        s,
      )
    ) {
      return true;
    }
    if (
      /unused|available|ready|not[\s_-]?use|pending|process|未|待|新發|發放/.test(
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
  if (Number.isFinite(rem) && Number.isFinite(tot) && tot > 0) {
    if (rem < tot) return true;
    // 額度尚未動用 → 多半尚未安裝或尚未激活
    return false;
  }

  return null;
}
