import Link from "next/link";
import Image from "next/image";

/**
 * 404 頁（依設計稿：白底、404 ERROR PAGE、機器人插圖、uh-oh! Nothing here...）
 */
export default function NotFoundPageView({ showHomeLink = true }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
      <div className="w-full max-w-[860px] mx-auto text-center">
        <Image
          src="/images/404-robot-illustration.png"
          alt="404 Error Page — uh-oh! Nothing here..."
          width={1200}
          height={900}
          priority
          className="w-full h-auto mx-auto"
          sizes="(max-width:860px) 100vw, 860px"
        />

        {showHomeLink ? (
          <Link
            href="/"
            className="mt-6 sm:mt-8 inline-flex items-center justify-center min-h-11 px-6 text-sm font-bold text-[#666666] border border-[#E0E0E0] rounded-full hover:text-[#1E4AD1] hover:border-[#1E4AD1] transition-colors"
          >
            返回首頁
          </Link>
        ) : null}
      </div>
    </div>
  );
}
