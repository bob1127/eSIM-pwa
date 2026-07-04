import Link from "next/link";
import Image from "next/image";
import Layout from "../../pages/Layout";
import { SOCIAL_LINKS } from "@/lib/seo.config";

/**
 * 服務條款 / 隱私權等政策頁共用版型
 * 視覺風格對齊 register-distributor（藍白、底線感、圓角卡片）
 */
export default function LegalPageLayout({
  title,
  subtitle,
  lastUpdated,
  children,
  seo,
  siblingLink,
}) {
  return (
    <Layout seo={seo}>
      <div className="min-h-screen bg-white font-sans pt-28 md:pt-32 pb-16">
        <div className="max-w-2xl mx-auto pt-20 px-6">
          {/* 品牌標頭 */}
          <div className="text-center mb-10">
            <Link
              href="/"
              className="inline-flex flex-col items-center gap-2 group"
            >
              <Image
                src="/images/Logo/logo-no-bg.png"
                alt="JEKO eSIM"
                width={56}
                height={56}
                className="w-12 h-12 object-contain transition-transform group-hover:scale-105"
              />
              <span className="text-[22px] font-black tracking-tighter leading-none">
                <span className="text-[#0A6CD0]">Jeko</span>
                <span className="text-[#24A148]">.eSIM</span>
              </span>
            </Link>

            <h1 className="text-2xl font-black text-slate-900 mb-2">{title}</h1>
            {subtitle && (
              <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                {subtitle}
              </p>
            )}
            {lastUpdated && (
              <p className="inline-block mt-4 text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-3 py-1">
                最後更新：{lastUpdated}
              </p>
            )}
          </div>

          {/* 姊妹條款快速連結 */}
          {siblingLink && (
            <div className="flex justify-center gap-2 mb-8">
              <Link
                href={siblingLink.href}
                className="text-xs font-bold text-[#1a56db] border border-blue-100 bg-blue-50/50 rounded-full px-4 py-2 hover:bg-blue-50 transition"
              >
                → {siblingLink.label}
              </Link>
            </div>
          )}

          {/* 內文 */}
          <div className="flex flex-col gap-8">{children}</div>

          {/* 頁尾聯絡 */}
          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 mb-3">
              如有疑問，歡迎透過以下方式聯繫我們
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs font-bold">
              <a
                href={`mailto:support@re-media.com`}
                className="text-[#1a56db] hover:underline"
              >
                support@re-media.com
              </a>
              {SOCIAL_LINKS.line && (
                <>
                  <span className="text-slate-300">|</span>
                  <a
                    href={SOCIAL_LINKS.line}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#06C755] hover:underline"
                  >
                    LINE 官方帳號
                  </a>
                </>
              )}
            </div>
            <Link
              href="/"
              className="inline-block mt-6 text-sm font-bold text-slate-500 hover:text-[#1a56db] transition"
            >
              ← 返回首頁
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/** 條款章節區塊 */
export function LegalSection({ title, children }) {
  return (
    <section className="bg-blue-50/30 border border-blue-100 rounded-2xl p-5 md:p-6">
      <h2 className="text-[15px] font-black text-[#1a56db] mb-4 pb-2 border-b border-blue-100">
        {title}
      </h2>
      <div className="text-[13px] text-slate-600 leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:marker:text-[#1a56db] [&_strong]:text-slate-800 [&_a]:text-[#1a56db] [&_a]:underline">
        {children}
      </div>
    </section>
  );
}
