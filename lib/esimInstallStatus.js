/**
 * 從用量／供應商 status 推斷 eSIM 是否「已在使用」（瀏覽器無法讀本機 eSIM 清單）
 * @returns {boolean|null} true=有使用證據, false=明確未用, null=未知
 *
 * 正確性原則：
 * - 不可單靠 deviceDetail.active_time / activation_date（常在出貨或系統側寫入，使用者可能還沒掃 QR）
 * - 不可把 topupDetail 的「全額流量／SUCCESS」當成已安裝
 * - 可信證據：已用流量 > 0、剩餘 < 總量、或 status 明確 In use
 */
export function inferEsimInstalled(usage = null) {
  if (!usage || typeof usage !== "object") return null;

  const used = Number(usage.usedMb);
  const rem = Number(usage.remainingMb);
  const tot = Number(usage.totalMb);

  const s = String(usage.status || usage.state || "").toLowerCase().trim();
  if (s) {
    if (/in[\s_-]?use|using|使用中|activated|active/.test(s)) return true;
    if (/^success$/i.test(s)) {
      if (Number.isFinite(used) && used > 0) return true;
      if (Number.isFinite(rem) && Number.isFinite(tot) && tot > 0 && rem < tot) {
        return true;
      }
      return false;
    }
    if (
      /unused|available|ready|got|not[\s_-]?use|pending|process|new|issued|未安裝|未啟用|未|待|新發|發放/.test(
        s,
      )
    ) {
      return false;
    }
  }

  if (Number.isFinite(used) && used > 0) return true;

  if (Number.isFinite(rem) && Number.isFinite(tot) && tot > 0 && rem < tot) {
    return true;
  }

  if (
    Number.isFinite(rem) &&
    Number.isFinite(tot) &&
    tot > 0 &&
    rem >= tot - 0.01 &&
    (!Number.isFinite(used) || used <= 0)
  ) {
    return false;
  }

  return null;
}

/**
 * @returns {'installed'|'not_installed'|'unknown'}
 */
export function resolveEsimInstallState(usage = null) {
  if (!usage || typeof usage !== "object") return "unknown";

  if (typeof usage.installState === "string") {
    const v = usage.installState;
    if (v === "installed" || v === "not_installed" || v === "unknown") return v;
  }

  const direct = inferEsimInstalled(usage);
  if (direct === true) return "installed";
  if (direct === false) return "not_installed";

  const used = Number(usage.usedMb);
  if (Number.isFinite(used) && used > 0) return "installed";

  const rem = Number(usage.remainingMb);
  const tot = Number(usage.totalMb);
  if (Number.isFinite(rem) && Number.isFinite(tot) && tot > 0 && rem < tot) {
    return "installed";
  }

  if (
    Number.isFinite(rem) &&
    Number.isFinite(tot) &&
    tot > 0 &&
    rem >= tot - 0.01 &&
    (!Number.isFinite(used) || used <= 0)
  ) {
    return "not_installed";
  }

  const s = String(usage.status || usage.state || "").toLowerCase().trim();
  if (
    /^success$/.test(s) ||
    /got|available|ready|issued|pending|new|unused|not[\s_-]?use/.test(s)
  ) {
    return "not_installed";
  }

  if (String(usage.source || "") === "topup_id") {
    return "not_installed";
  }

  return "unknown";
}

export function isEsimNotInstalledForUsage(usage) {
  return resolveEsimInstallState(usage) === "not_installed";
}

/** 可否展示／信任用量數字（查詢結果、圖表、偏低標籤） */
export function canShowEsimUsageStats(usage) {
  return resolveEsimInstallState(usage) === "installed";
}

export function canEnableTrafficAlertForUsage(usage) {
  return canShowEsimUsageStats(usage);
}

export const ESIM_NOT_INSTALLED_USAGE_MESSAGE =
  "此 eSIM 尚未安裝或尚未啟用，無法查詢流量。請先安裝到手機並開啟行動數據／漫遊，約 30–60 分鐘後再查。";
