"use client";

/**
 * 夥伴後台說明卡：時間軸 + 藍卡／白卡（取代黃底提示）
 */
const BLUE = "#2563eb";

export default function PartnerInfoTimeline({ items = [] }) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return null;

  return (
    <ol className="relative pl-7 space-y-3">
      <span
        className="absolute left-[7px] top-4 bottom-4 w-px bg-slate-200"
        aria-hidden
      />
      {list.map((item, i) => {
        const primary = item.variant !== "notice";
        const isLast = i === list.length - 1;
        return (
          <li key={item.title || i} className="relative">
            <span
              className={`absolute -left-7 top-6 h-3.5 w-3.5 rounded-full ${
                primary
                  ? "bg-[#2563eb]"
                  : "border-2 border-slate-300 bg-white"
              }`}
              aria-hidden
            />
            {primary ? (
              <article
                className="rounded-2xl px-4 py-4 sm:px-5 sm:py-4"
                style={{ backgroundColor: BLUE }}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[15px] font-bold text-white">{item.title}</h3>
                  {item.tag ? (
                    <span className="text-[10px] font-medium tracking-wide text-white/70 shrink-0 pt-0.5">
                      {item.tag}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 text-[13px] leading-relaxed text-white/95">
                  {item.body}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {(item.icons || []).map((Icon, idx) => (
                      <span
                        key={idx}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/50 text-white"
                      >
                        <Icon size={16} color="white" strokeWidth={1.8} />
                      </span>
                    ))}
                  </div>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#2563eb] text-sm font-bold shrink-0"
                      aria-label={item.footerLabel || "查看"}
                    >
                      →
                    </a>
                  ) : null}
                </div>
              </article>
            ) : (
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[15px] font-bold text-slate-900">
                    {item.title}
                  </h3>
                  {item.tag ? (
                    <span className="text-[10px] font-medium tracking-wide text-slate-400 shrink-0 pt-0.5">
                      {item.tag}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 text-[13px] leading-relaxed text-slate-700">
                  {item.body}
                </div>
                {item.footerHref ? (
                  <a
                    href={item.footerHref}
                    className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#2563eb]"
                  >
                    {item.footerLabel || "查看說明"}
                    <span aria-hidden>→</span>
                  </a>
                ) : null}
              </article>
            )}
            {isLast ? null : <span className="sr-only"> </span>}
          </li>
        );
      })}
    </ol>
  );
}
