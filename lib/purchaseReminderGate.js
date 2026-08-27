import { isDataExhaustTerminateVariant } from "@/components/product/DataExhaustReminderModal";
import { needsAuKddiManualApnReminder } from "@/components/product/AuKddiApnReminderModal";
import { isIijDocomoTelecom } from "@/components/product/IijApnReminderModal";
import { isSoftBankManualApnTelecom } from "@/components/product/SoftBankApnReminderModal";
import { hasCoverageAck } from "@/components/product/CoveragePromptModal";
import { resolveCoverageCountry } from "@/lib/networkCoverageCountries";

/**
 * @typedef {"terminate"|"au-apn"|"iij-apn"|"softbank-apn"|"coverage"} PurchaseReminderKind
 */

/**
 * 與商品頁 requestPurchase 相同順序
 * @param {{
 *   variation?: object,
 *   telecom?: string,
 *   days?: number|string,
 *   product?: object,
 *   categoryHandle?: string,
 *   skip?: Partial<Record<PurchaseReminderKind, boolean>>,
 * }} input
 * @returns {PurchaseReminderKind|null}
 */
export function getFirstPurchaseReminder(input = {}) {
  const { variation, telecom, days, product, categoryHandle, skip = {} } =
    input;

  if (!skip.terminate && isDataExhaustTerminateVariant(variation)) {
    return "terminate";
  }
  if (!skip["au-apn"] && needsAuKddiManualApnReminder(telecom, days)) {
    return "au-apn";
  }
  if (!skip["iij-apn"] && isIijDocomoTelecom(telecom)) {
    return "iij-apn";
  }
  if (!skip["softbank-apn"] && isSoftBankManualApnTelecom(telecom)) {
    return "softbank-apn";
  }
  if (!skip.coverage) {
    const country = resolveCoverageCountry(product, categoryHandle);
    if (country && product?.id && !hasCoverageAck(product.id)) {
      return "coverage";
    }
  }
  return null;
}

/** 涵蓋範圍確認後：再檢查 IIJ / SoftBank APN */
export function getPostCoverageReminder(input = {}) {
  const { telecom, skip = {} } = input;
  if (!skip["iij-apn"] && isIijDocomoTelecom(telecom)) return "iij-apn";
  if (!skip["softbank-apn"] && isSoftBankManualApnTelecom(telecom)) {
    return "softbank-apn";
  }
  return null;
}
