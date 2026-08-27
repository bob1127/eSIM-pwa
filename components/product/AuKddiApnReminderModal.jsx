/**
 * 日本 AU(KDDI) 真不限速：天數 ≥ 10 時，購買前提醒可能需手動設定 APN
 */
import { AnimatePresence, motion } from "framer-motion";
import MaterialIcon from "../MaterialIcon";
import { reminderUi } from "@/lib/purchaseReminderModalUi";

const ACCENT = "#0A6CD0";

/** 真・不限速（高速數據），不含 10Mbps / SoftBank 雙網 */
export function isAuKddiHighSpeedTelecom(telecom) {
  const t = String(telecom || "").trim();
  if (!t) return false;
  if (/10\s*Mbps/i.test(t)) return false;
  if (/SoftBank/i.test(t)) return false;
  return /AU\s*\(?\s*KDDI\s*\)?/i.test(t) || /^AU\b/i.test(t);
}

export function needsAuKddiManualApnReminder(telecom, days) {
  if (!isAuKddiHighSpeedTelecom(telecom)) return false;
  const d = parseInt(days, 10);
  return Number.isFinite(d) && d >= 10;
}

const APN_PROFILES = [
  {
    label: "設定一（建議先試）",
    rows: [
      { k: "APN", v: "uad5gn.au-net.ne.jp" },
      { k: "用戶名", v: "au@uad5gn.au-net.ne.jp" },
      { k: "密碼", v: "au" },
      { k: "身份驗證類型", v: "CHAP" },
    ],
  },
  {
    label: "設定二（或改用此組）",
    rows: [
      { k: "APN", v: "au.5g.au-net.ne.jp" },
      { k: "用戶名", v: "user@au.5g.au-net.ne.jp" },
      { k: "密碼", v: "au" },
      { k: "身份驗證類型", v: "CHAP" },
    ],
  },
];

const APN_4G_FALLBACK = {
  label: "仍無法連線時：4G 專用 APN",
  rows: [
    { k: "APN", v: "uno.au-net.ne.jp" },
    { k: "用戶名", v: "685840734641020@uno.au-net.ne.jp" },
    { k: "密碼", v: "KpyrR6BP" },
    { k: "身份驗證類型", v: "CHAP" },
  ],
};

function ApnProfileCard({ profile, muted = false, squareCorners = false }) {
  const ui = reminderUi(squareCorners, "blue");
  return (
    <div className={muted ? ui.apnPanelMuted : ui.apnPanel}>
      <p
        className={`text-[11px] font-bold tracking-wide ${
          muted ? "text-amber-800/80" : "text-slate-500"
        }`}
      >
        {profile.label}
      </p>
      <dl className="mt-2 space-y-1.5">
        {profile.rows.map((row) => (
          <div
            key={row.k}
            className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
          >
            <dt className="shrink-0 text-[11px] font-semibold text-slate-500 w-[5.5rem]">
              {row.k}
            </dt>
            <dd className="text-[13px] font-bold text-slate-800 break-all select-all">
              {row.v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function AuKddiApnReminderModal({
  isOpen,
  onClose,
  onContinuePurchase,
  purchaseAction = "cart",
  squareCorners = false,
}) {
  const ui = reminderUi(squareCorners, "blue");
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
            aria-labelledby="au-apn-prompt-title"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[11010] flex items-center justify-center p-3 sm:p-4 pointer-events-none"
          >
            <div
              className={`${ui.shell} max-h-[min(92vh,720px)] flex flex-col`}
            >
              <div className={ui.headerClass} style={ui.headerStyle}>
                <div className="flex items-start justify-between gap-3">
                  <h3
                    id="au-apn-prompt-title"
                    className="text-[17px] md:text-lg font-bold text-white leading-snug pr-2"
                  >
                    重要：AU(KDDI) 可能需手動設定 APN
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
                <p className="mt-2 text-[13px] text-white/85 leading-relaxed">
                  您選的是 AU(KDDI) 真不限速、天數 10 天（含）以上方案。多數情況
                  APN 會自動設定；若安裝後無法上網，請依下方參數手動設定。
                </p>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 md:px-6 space-y-3">
                {APN_PROFILES.map((profile) => (
                  <ApnProfileCard
                    key={profile.label}
                    profile={profile}
                    squareCorners={squareCorners}
                  />
                ))}
                <ApnProfileCard
                  profile={APN_4G_FALLBACK}
                  muted
                  squareCorners={squareCorners}
                />

                <ul className="space-y-2 text-[12px] text-gray-500 leading-relaxed pt-1">
                  <li className="flex gap-2">
                    <MaterialIcon
                      name="info"
                      size={16}
                      className="shrink-0 text-[#0A6CD0] mt-0.5"
                    />
                    <span>
                      請在手機「行動數據」→ APN
                      設定中新增或修改；名稱可自訂，其餘欄位依上表填入，驗證類型選
                      CHAP；也可到 Email 信中查看。
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <MaterialIcon
                      name="wifi"
                      size={16}
                      className="shrink-0 text-[#0A6CD0] mt-0.5"
                    />
                    <span>
                      建議在有 Wi‑Fi 的環境完成安裝與 APN
                      設定後再啟用數據漫遊。
                    </span>
                  </li>
                </ul>
              </div>

              <div className="shrink-0 border-t border-slate-200 px-5 py-3.5 md:px-6 flex flex-col gap-2.5 bg-white">
                <button
                  type="button"
                  onClick={onContinuePurchase}
                  className={ui.btnPrimary}
                  style={ui.btnPrimaryStyle}
                >
                  {continueLabel}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={ui.btnSecondary}
                  style={ui.btnSecondaryStyle}
                >
                  先不要，我再想想
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
