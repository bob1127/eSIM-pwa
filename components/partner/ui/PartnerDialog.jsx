import MaterialIcon from "@/components/MaterialIcon";
import { cn } from "@/lib/utils";
import PartnerButton from "@/components/partner/ui/PartnerButton";
import { PARTNER_OVERLAY_Z } from "@/lib/partnerOverlayZ";

/**
 * UIAble 風格 Dialog — 僅內容／按鈕層，不動外層版面
 */
export default function PartnerDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "max-w-lg",
  icon,
  hideClose = false,
  className,
  bodyClassName,
  shellClassName,
  overlayZIndex = PARTNER_OVERLAY_Z.dialog,
}) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-4 sm:p-6",
        shellClassName,
      )}
      style={{ zIndex: overlayZIndex }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "partner-dialog-title" : undefined}
        className={cn(
          "relative flex max-h-[min(88vh,720px)] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl",
          maxWidth,
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || !hideClose) && (
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0 flex items-start gap-2.5">
              {icon ? (
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1E4AD1]/10 text-[#1E4AD1]">
                  <MaterialIcon name={icon} size={20} />
                </span>
              ) : null}
              <div className="min-w-0">
                {title ? (
                  <h2
                    id="partner-dialog-title"
                    className="text-base font-bold text-slate-900 leading-snug"
                  >
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
            {!hideClose ? (
              <PartnerButton
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="關閉"
                className="shrink-0 text-slate-500"
              >
                <MaterialIcon name="close" size={20} />
              </PartnerButton>
            ) : null}
          </div>
        )}

        <div
          className={cn(
            "flex-1 overflow-y-auto px-5 py-4",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
