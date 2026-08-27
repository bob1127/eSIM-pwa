/**
 * eSIM：加入購物車／立即購買前的涵蓋範圍詢問（多國共用）
 */
import { AnimatePresence, motion } from "framer-motion";
import MaterialIcon from "../MaterialIcon";
import { NETWORK_COVERAGE_ACCENT as ACCENT } from "@/lib/networkCoverageCountries";
import { reminderUi } from "@/lib/purchaseReminderModalUi";

const STORAGE_PREFIX = "jeko_coverage_ack:";

export function hasCoverageAck(productId) {
  if (typeof window === "undefined" || !productId) return false;
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${productId}`) === "1";
  } catch {
    return false;
  }
}

export function markCoverageAck(productId) {
  if (typeof window === "undefined" || !productId) return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${productId}`, "1");
  } catch {
    /* ignore */
  }
}

/** @deprecated 相容舊日本命名 */
export const hasJapanCoverageAck = hasCoverageAck;
/** @deprecated 相容舊日本命名 */
export const markJapanCoverageAck = markCoverageAck;

export default function CoveragePromptModal({
  isOpen,
  country,
  onClose,
  onViewCoverage,
  onContinuePurchase,
  purchaseAction = "cart",
  squareCorners = false,
}) {
  if (!country) return null;

  const ui = reminderUi(squareCorners, "blue");
  const continueLabel =
    purchaseAction === "buy" ? "不用，繼續立即購買" : "不用，繼續加入購物車";
  const imgSrc = country.heatmapImage
    ? encodeURI(country.heatmapImage)
    : null;

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
            aria-labelledby="coverage-prompt-title"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[11010] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className={ui.shell}>
              <div
                className={ui.headerClass}
                style={
                  ui.headerStyle ??
                  (squareCorners ? undefined : { background: ACCENT })
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <h3
                    id="coverage-prompt-title"
                    className="text-[17px] md:text-lg font-bold text-white leading-snug pr-2"
                  >
                    {country.promptTitle}
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
                <p className="mt-2 text-[13px] text-white/80 leading-relaxed">
                  {country.promptBody}
                </p>
              </div>

              <div className="px-5 py-4 md:px-6 space-y-4">
                <a
                  href={country.nperfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ui.coverageLink}
                >
                  {imgSrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgSrc}
                        alt={`${country.nameZh}收訊熱點範例`}
                        className="w-full h-36 object-cover object-center bg-slate-50"
                        loading="lazy"
                        decoding="async"
                      />
                    </>
                  ) : (
                    <div
                      className="flex h-36 flex-col items-center justify-center gap-2 px-4"
                      style={{
                        background:
                          "linear-gradient(145deg, #eef5fc 0%, #ffffff 70%)",
                      }}
                    >
                      <MaterialIcon
                        name="signal_cellular_alt"
                        size={32}
                        style={{ color: ACCENT }}
                      />
                      <p className="text-sm font-bold text-slate-800">
                        {country.nameZh} nPerf 收訊熱點圖
                      </p>
                    </div>
                  )}
                  <span className="block px-3 py-2 text-[11px] text-gray-500 bg-slate-50">
                    點圖開啟 nPerf {country.nameZh}收訊熱點圖（新分頁）
                  </span>
                </a>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={onViewCoverage}
                    className={ui.btnPrimary}
                    style={
                      ui.btnPrimaryStyle ??
                      (squareCorners ? undefined : { background: ACCENT })
                    }
                  >
                    先看涵蓋範圍
                  </button>
                  <button
                    type="button"
                    onClick={onContinuePurchase}
                    className={ui.btnSecondary}
                    style={
                      ui.btnSecondaryStyle ??
                      (squareCorners
                        ? undefined
                        : { borderColor: ACCENT, color: ACCENT })
                    }
                  >
                    {continueLabel}
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
