import Link from "next/link";

/**
 * 簡潔 404：黑字 + 回官網
 */
export default function NotFoundPageView({ showHomeLink = true }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16 text-center text-black">
      <p className="text-6xl sm:text-7xl font-semibold tracking-tight">404</p>
      <h1 className="mt-6 text-lg sm:text-xl font-medium">找不到這個頁面</h1>
      <p className="mt-3 text-sm sm:text-base text-black/70 max-w-sm leading-relaxed">
        連結可能已失效，或頁面暫時無法載入。請返回官網繼續瀏覽。
      </p>
      {showHomeLink ? (
        <Link
          href="/"
          className="mt-10 inline-flex items-center justify-center min-h-11 px-8 text-sm font-medium text-black border border-black hover:bg-black hover:text-white transition-colors"
        >
          回到官網
        </Link>
      ) : null}
    </div>
  );
}
