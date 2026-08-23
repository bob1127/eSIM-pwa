/**
 * 日本 IIJ Docomo：購買前提醒需手動設定 APN
 */
import { AnimatePresence, motion } from "framer-motion";
import MaterialIcon from "../MaterialIcon";

const ACCENT = "#0A6CD0";
export const IIJ_DOCOMO_APN = "vmobile.jp";

export function isIijDocomoTelecom(telecom) {
  const t = String(telecom || "");
  // 供應商特殊說明：Need manually set APN to "vmobile.jp"
  return /IIJ/i.test(t);
}

export default function IijApnReminderModal({
  isOpen,
  onClose,
  onContinuePurchase,
  purchaseAction = "cart",
}) {
  const continueLabel =
    purchaseAction === "buy" ? "我知道了，繼續立即購買" : "我知道了，繼續加入購物車";

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
            aria-labelledby="iij-apn-prompt-title"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[11010] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="px-5 py-4 md:px-6" style={{ background: ACCENT }}>
                <div className="flex items-start justify-between gap-3">
                  <h3
                    id="iij-apn-prompt-title"
                    className="text-[17px] md:text-lg font-bold text-white leading-snug pr-2"
                  >
                    重要：IIJ Docomo 需手動設定 APN
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
                  供應商標示需手動將 APN 設為「vmobile.jp」。抵達日本後，連上網路時才會啟用；未設 APN
                  常見有訊號但無法上網。
                </p>
              </div>

              <div className="px-5 py-4 md:px-6 space-y-4">
                <div className="rounded-xl border border-[#0A6CD0]/20 bg-[#eef5fc] px-4 py-3.5">
                  <p className="text-[12px] font-bold text-slate-500 tracking-wide">
                    APN 設定值
                  </p>
                  <p className="mt-1 text-xl font-black text-[#0A6CD0] tracking-wide select-all">
                    {IIJ_DOCOMO_APN}
                  </p>
                  <p className="mt-2 text-[12px] text-slate-600 leading-relaxed">
                    安裝 eSIM 後，請到手機「行動數據」網路設定中新增或修改
                    APN，名稱可自訂，APN 欄位填入上方值後再啟用此線路；也可到
                    Email 信中查看。
                  </p>
                </div>

                <ul className="space-y-2 text-[12px] text-gray-500 leading-relaxed">
                  <li className="flex gap-2">
                    <MaterialIcon
                      name="info"
                      size={16}
                      className="shrink-0 text-[#0A6CD0] mt-0.5"
                    />
                    <span>
                      若不想手動設定 APN，可改選其他日本電信商方案（如 SoftBank／KDDI、AU）。
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
                    先不要，我再想想
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
