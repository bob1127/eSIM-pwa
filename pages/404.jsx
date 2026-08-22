import Head from "next/head";
import NotFoundPageView from "@/components/errors/NotFoundPageView";

export default function Custom404() {
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
