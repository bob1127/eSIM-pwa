/**
 * @deprecated 請改用 `@/lib/ezpay/invoice`（讀環境變數，勿寫死金鑰）
 */
export {
  issueEzpayInvoice,
  getEzpayConfig,
  isEzpayConfigured,
  splitTaxIncludedTotal,
} from "../../../lib/ezpay/invoice";
