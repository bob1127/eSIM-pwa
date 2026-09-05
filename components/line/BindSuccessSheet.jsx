"use client";

/**
 * 綁定成功：由下方彈出的成功 sheet（Success.gif 無限循環）
 */
export default function BindSuccessSheet({
  open,
  message,
  title = "綁定成功",
  doneLabel = "完成",
  onClose,
  onDone,
}) {
  if (!open) return null;

  const finish = () => {
    (onDone || onClose)?.();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="關閉"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bind-success-title"
        className="relative z-[1] w-full max-w-[430px] animate-[slideUpSheet_0.32s_cubic-bezier(0.32,0.72,0,1)] rounded-t-[32px] bg-white px-6 pb-10 pt-8 shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-1/2 top-0 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#8A94A6] shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
          aria-label="關閉成功視窗"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="mx-auto flex w-full max-w-[220px] flex-col items-center text-center">
          <img
            src="/Lottie/Success.gif"
            alt=""
            className="h-36 w-36 object-contain"
          />
          <h2
            id="bind-success-title"
            className="mt-2 text-[28px] font-bold tracking-tight text-[#111111]"
          >
            {title}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#8A94A6]">
            {message ||
              "已成功連結官網會員與 LINE。若有多張 eSIM，請選一張再開啟流量提醒。"}
          </p>
        </div>

        <button
          type="button"
          onClick={finish}
          className="mt-8 w-full rounded-full bg-[#2B2B2B] py-4 text-[16px] font-bold text-white"
        >
          {doneLabel}
        </button>
      </div>

      <style jsx global>{`
        @keyframes slideUpSheet {
          from {
            transform: translateY(100%);
            opacity: 0.6;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
