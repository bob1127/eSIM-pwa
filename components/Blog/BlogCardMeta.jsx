const DEFAULT_AVATAR = "/images/Logo/icon-192.png";

export function BlogDotTags({ tags = [] }) {
  const shownTags = (tags || []).filter(Boolean).slice(0, 3);
  if (!shownTags.length) return null;
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
      {shownTags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate-500"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1f57b8]" />
          {tag}
        </span>
      ))}
    </div>
  );
}

export default function BlogCardMeta({
  date,
  authorName,
  authorAvatar,
  tags = [],
  showTags = true,
  showByline = true,
}) {
  const name = authorName || "Jeko eSIM";
  const avatar = authorAvatar || DEFAULT_AVATAR;

  return (
    <>
      {showTags ? <BlogDotTags tags={tags} /> : null}
      {showByline && (date || name) ? (
        <div className="mt-auto flex items-center gap-2.5 pt-4">
          <img
            src={avatar}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover bg-slate-100 ring-1 ring-slate-200"
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[12px] font-semibold text-slate-800">
              {name}
            </p>
            {date ? (
              <p className="mt-0.5 text-[11px] text-slate-400">{date}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
