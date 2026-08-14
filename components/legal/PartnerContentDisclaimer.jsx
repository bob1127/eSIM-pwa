import Link from "next/link";
import { CONTENT_DISCLAIMER } from "@/lib/cooperationTermsContent";

/**
 * 合作夥伴文章／上傳內容免責：後台、前台、發布確認共用同一段文字。
 */
export default function PartnerContentDisclaimer({
  variant = "compact",
  className = "",
}) {
  const { title, short, bullets } = CONTENT_DISCLAIMER;

  if (variant === "full") {
    return (
      <div className={className}>
        <p className="font-black text-slate-900 mb-2">{title}</p>
        <ul className="space-y-2">
          {bullets.map((text) => (
            <li key={text} className="text-[13px] leading-relaxed text-slate-600">
              {text}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (variant === "notice") {
    return (
      <p
        className={`text-[11px] leading-relaxed text-amber-900/90 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2 ${className}`}
      >
        {short}{" "}
        <Link href="/terms" className="font-bold text-[#1E4AD1] hover:underline" target="_blank">
          完整條款
        </Link>
      </p>
    );
  }

  if (variant === "dark") {
    return (
      <p className={`text-[10px] leading-relaxed text-white/45 ${className}`}>
        {short}
      </p>
    );
  }

  return (
    <p className={`text-[11px] leading-relaxed text-slate-400 ${className}`}>
      {short}{" "}
      <Link href="/terms" className="text-[#0A6CD0] hover:underline">
        服務條款
      </Link>
    </p>
  );
}
