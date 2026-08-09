/**
 * 總量用完斷網方案：加入購物車／立即購買前提醒
 */
import { AnimatePresence, motion } from "framer-motion";
import MaterialIcon from "../MaterialIcon";

const ACCENT = "#0A6CD0";
const WARN = "#b45309";

/** 變體是否為「用完斷網」（非僅降速） */
export function isDataExhaustTerminateVariant(variation) {
  if (!variation) return false;
  const m = variation.metadata || {};
  const attrs = m.attributes || variation.attributes || {};
  const blob = [
    m.throttle_kind,
    m.rule_desc,
    attrs.speed_rule,
    attrs.data_amount,
    attrs.data,
    m.data_amount,
    variation.data_amount,
    variation.title,
    variation.sku,
  ]
    .filter(Boolean)
    .join(" ");
  if (/terminate|用完斷網|用完即斷網/i.test(blob)) return true;
  // 中國總量 CMCC B0：規則為 terminate（勿用吃到飽 -B0 誤判）
  if (
    /^China-Total/i.test(String(variation.sku || "")) &&
    /-B0$/i.test(String(variation.sku || ""))
  ) {
    return true;
  }
  return false;
}

export default function DataExhaustReminderModal({
  isOpen,
  onClose,
  onContinuePurchase,
  purchaseAction = "cart",
  dataLabel = "",
}) {
  const continueLabel =
    purchaseAction === "buy"
      ? "我知道了，繼續立即購買"
      : "我知道了，繼續加入購物車";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 z-[11000] backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="data-exhaust-prompt-title"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[11010] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="px-5 py-4 md:px-6" style={{ background: WARN }}>
                <div className="flex items-start justify-between gap-3">
                  <h3
                    id="data-exhaust-prompt-title"
                    className="text-[17px] md:text-lg font-bold text-white leading-snug pr-2"
                  >
                    重要：此方案流量用完會斷網
                  </h3>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-full p-1 text-white/80 hover:bg-white/15 hover:text-white transition"
                    aria-label="關閉"
                  >
                    <MaterialIcon name="close" size={20} />
                  </button>
                </div>
                <p className="mt-2 text-[13px] text-white/90 leading-relaxed">
                  與「用完後降速續用」不同，本方案總量用盡後將無法上網，請確認行程用量是否足夠。
                </p>
              </div>

              <div className="px-5 py-4 md:px-6 space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                  <p className="text-[13px] font-bold text-amber-900">
                    用完即斷網
                    {dataLabel ? `｜目前選擇：${dataLabel}` : ""}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[12px] text-amber-950/80 leading-relaxed">
                    <li>・總流量歸零後，地圖、傳訊、熱點都無法使用</li>
                    <li>・不會自動降速續用，需另購方案或改選「用完降速」類型</li>
                    <li>・建議依天數預留餘量，避免旅途中突然沒網</li>
                  </ul>
                </div>

                <ul className="space-y-2 text-[12px] text-gray-500 leading-relaxed">
                  <li className="flex gap-2">
                    <MaterialIcon
                      name="info"
                      size={16}
                      className="shrink-0 text-[#0A6CD0] mt-0.5"
                    />
                    <span>
                      若希望用完後仍可低速上網，請改選標示「降速至約
                      128kbps」的總量方案。
                    </span>
                  </li>
                </ul>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={onContinuePurchase}
                    className="w-full h-11 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                    style={{ background: ACCENT }}
                  >
                    {continueLabel}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-11 rounded-xl text-sm font-bold border-2 transition-colors hover:bg-[#eef5fc]"
                    style={{ borderColor: ACCENT, color: ACCENT }}
                  >
                    先不要，我再選其他方案
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
