import Link from "next/link";
import Head from "next/head";
import NotFoundPageView from "@/components/errors/NotFoundPageView";

function ErrorPage({ statusCode }) {
  const code = statusCode || 500;
  const is404 = code === 404;

  if (is404) {
    return (
      <>
        <Head>
          <title>404 Error Page | Jeko eSIM</title>
          <meta name="robots" content="noindex" />
        </Head>
        <NotFoundPageView />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>發生錯誤 | Jeko eSIM</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[11px] font-bold tracking-[0.32em] text-[#B5B5B5] uppercase">
          {code} Error
        </p>
        <h1 className="mt-6 text-xl font-bold text-[#555555]">
          系統暫時無法處理請求
        </h1>
        <p className="mt-3 text-sm text-[#888888] leading-relaxed max-w-md">
          請稍後再試，或返回首頁繼續瀏覽。
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-11 px-6 text-sm font-bold text-[#666666] border border-[#E0E0E0] rounded-full hover:text-[#1E4AD1] hover:border-[#1E4AD1] transition-colors"
          >
            返回首頁
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center min-h-11 px-6 text-sm font-bold text-[#666666] border border-[#E0E0E0] rounded-full hover:bg-[#FAFAFA] transition-colors"
          >
            重新整理
          </button>
        </div>
      </div>
    </>
  );
}

ErrorPage.getInitialProps = ({ res, err }) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
  return { statusCode };
};

export default ErrorPage;
