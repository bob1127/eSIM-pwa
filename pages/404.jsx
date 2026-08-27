import Head from "next/head";
import NotFoundPageView from "@/components/errors/NotFoundPageView";

export default function Custom404() {
  return (
    <>
      <Head>
        <title>找不到頁面｜Jeko eSIM</title>
        <meta name="robots" content="noindex" />
      </Head>
      <NotFoundPageView />
    </>
  );
}
