/**
 * 日本 SoftBank 單網每日型（漫遊／日本 IP）：購買前提醒 Android 通常需手動設定 APN（plus.4g）
 */
import { AnimatePresence, motion } from "framer-motion";
import MaterialIcon from "../MaterialIcon";

const ACCENT = "#0A6CD0";

export const SOFTBANK_APN = "plus.4g";
export const SOFTBANK_APN_USER = "plus";
export const SOFTBANK_APN_PASS = "4g";
export const SOFTBANK_APN_AUTH = "CHAP";

/** SoftBank 單網（非 SoftBank／KDDI 雙網）：購買前提醒 Android 通常需手動 APN */
export function isSoftBankManualApnTelecom(telecom) {
  const t = String(telecom || "").trim();
  if (!t) return false;
  if (/SoftBank\s*\/\s*KDDI|KDDI\s*\/\s*SoftBank/i.test(t)) return false;
  return /^SoftBank\b/i.test(t);
}

export default function SoftBankApnReminderModal({
  isOpen,
  onClose,
  onContinuePurchase,
  purchaseAction = "cart",
}) {
  const continueLabel =
    purchaseAction === "buy"
      ? "我知道了，繼續立即購買"
      : "我知道了，繼續加入購物車";

  const rows = [
    { k: "APN", v: SOFTBANK_APN },
    { k: "用戶名", v: SOFTBANK_APN_USER },
    { k: "密碼", v: SOFTBANK_APN_PASS },
    { k: "身份驗證類型", v: SOFTBANK_APN_AUTH },
  ];

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
            aria-labelledby="softbank-apn-prompt-title"
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
                    id="softbank-apn-prompt-title"
                    className="text-[17px] md:text-lg font-bold text-white leading-snug pr-2"
                  >
                    重要：SoftBank 通常需手動設定 APN
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
                  Android 手機安裝後多半需手動設定 APN 才能上網；iPhone
                  多數會自動帶入，若無法上網也可依下列設定檢查。
                </p>
              </div>

              <div className="px-5 py-4 md:px-6 space-y-4">
                <div className="rounded-xl border border-[#0A6CD0]/20 bg-[#eef5fc] px-4 py-3.5">
                  <p className="text-[12px] font-bold text-slate-500 tracking-wide">
                    APN 設定值（需手動設定）
                  </p>
                  <dl className="mt-2 space-y-1.5">
                    {rows.map((r) => (
                      <div
                        key={r.k}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <dt className="text-[12px] text-slate-500 shrink-0">
                          {r.k}
                        </dt>
                        <dd className="text-[14px] font-bold text-[#0A6CD0] select-all text-right">
                          {r.v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-[12px] text-slate-600 leading-relaxed">
                    安裝 eSIM 後，請到手機「行動數據」網路設定新增或修改
                    APN，填入上方欄位後再啟用此線路；也可到 Email 信中查看。
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
                      若不想手動設定 APN，可改選 SoftBank／KDDI
                      雙網（APN 自動）或其他日本方案。
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
