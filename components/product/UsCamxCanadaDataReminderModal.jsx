/**
 * 北美 AT&T 美國號碼（USCAMX）吃到飽：加拿大僅 25GB 高速，加入購物車／立即購買前提醒
 */
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import MaterialIcon from "../MaterialIcon";
import { reminderUi } from "@/lib/purchaseReminderModalUi";

const US_CAMX_HANDLES = new Set([
  "north-america-att-unlimited-esim",
  "usa-native-unlimited-longterm-esim",
]);

/** 變體／商品是否為 USCAMX 美加墨吃到飽（加拿大 25GB 限制） */
export function isUsCamxCanadaLimitedVariant(variation, product) {
  const sku = String(variation?.sku || "").trim();
  if (/^USCAMX-Local-unlimited-\d+-A0$/i.test(sku)) return true;

  const handle = String(product?.handle || product?.slug || "").trim();
  if (US_CAMX_HANDLES.has(handle)) return true;

  const md = variation?.metadata || {};
  const attrs = md.attributes || variation?.attributes || {};
  const blob = [
    md.special_desc,
    md.speed_desc,
    attrs.speed_rule,
    variation?.title,
  ]
    .filter(Boolean)
    .join(" ");
  return /25\s*GB\s*\(?\s*CA\s*\)?|25GB.*CA/i.test(blob);
}

export default function UsCamxCanadaDataReminderModal({
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
            aria-labelledby="us-camx-ca-data-prompt-title"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[11010] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className={ui.shell}>
              <div
                className={ui.headerClass}
                style={ui.headerStyle}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3
                    id="us-camx-ca-data-prompt-title"
                    className="text-[17px] md:text-lg font-bold text-white leading-snug pr-2"
                  >
                    重要：加拿大流量與美／墨不同
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
                  本方案並非美加墨三國皆無限高速；請確認您在加拿大的用量需求。
                </p>
              </div>

              <div className="px-5 py-4 md:px-6 space-y-4">
                <div className={ui.infoPanel}>
                  <ul
                    className={`space-y-1.5 text-[12px] leading-relaxed ${
                      squareCorners ? "text-slate-600" : "text-slate-700"
                    }`}
                  >
                    <li>
                      ・<strong>美國／墨西哥</strong>：無限數據
                    </li>
                    <li>
                      ・<strong>加拿大</strong>：僅含{" "}
                      <strong>25GB 高速數據</strong>
                    </li>
                    <li>
                      ・25GB 用盡後：降速續航（非加拿大全速吃到飽；實際速度依
                      當地網路，常見約 512Kbps 等級，僅適合傳訊／輕量上網）
                    </li>
                  </ul>
                </div>

                <ul className="space-y-2 text-[12px] text-gray-500 leading-relaxed">
                  <li className="flex gap-2">
                    <MaterialIcon
                      name="info"
                      size={16}
                      className={`shrink-0 mt-0.5 ${
                        squareCorners ? "text-slate-500" : "text-[#0A6CD0]"
                      }`}
                    />
                    <span>
                      若您在加拿大需要更多高速或吃到飽，請改選{" "}
                      <Link
                        href="/product/canada/canada-unlimited-esim/"
                        className="font-semibold text-[#0A6CD0] underline underline-offset-2 hover:text-[#0856a8]"
                        onClick={onClose}
                      >
                        加拿大吃到飽
                      </Link>
                      方案。
                    </span>
                  </li>
                </ul>

                <div className="flex flex-col gap-2.5">
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
