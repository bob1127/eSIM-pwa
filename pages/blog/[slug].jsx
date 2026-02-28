import Head from "next/head";
import { useRouter } from "next/router";
import parse from "html-react-parser";
import dynamic from "next/dynamic";
import Layout from "../Layout";
import Link from "next/link";
import Image from "next/image";

// 動態載入其他文章輪播組件
const OtherPostsCarousel = dynamic(
  () => import("../../components/OtherPostsCarousel"),
);

export default function PostPage({ post, relatedPosts = [] }) {
  const router = useRouter();

  // 如果正在產生靜態頁面，顯示載入中
  if (router.isFallback) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
          <div className="text-xl text-gray-500 font-medium">Loading...</div>
        </div>
      </Layout>
    );
  }

  // SEO 資料處理
  const seo = post.yoast_head_json || {};
  const canonicalUrl =
    seo?.canonical?.replace(
      "https://dyx.wxv.mybluehost.me/website_a8bfc44c",
      "https://www.wmesim.com",
    ) || `https://www.wmesim.com/blog/${post.slug}`;

  // 麵包屑結構化資料
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "首頁",
        item: "https://www.wmesim.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "部落格",
        item: "https://www.wmesim.com/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title.rendered,
        item: canonicalUrl,
      },
    ],
  };

  // 抓取文章第一張圖片
  const firstImageMatch = post.content.rendered.match(
    /<img[^>]+src="([^">]+)"/,
  );
  const firstImage =
    firstImageMatch?.[1]?.replace(
      "https://dyx.wxv.mybluehost.me/website_a8bfc44c",
      "https://www.wmesim.com",
    ) || "/logo.png"; // 建議放一個預設圖

  // 解析並渲染 HTML 內容
  const renderContent = (html) =>
    parse(html, {
      replace: (node) => {
        if (node.name === "img" && node.attribs?.src) {
          const src = node.attribs.src.replace(
            "https://dyx.wxv.mybluehost.me/website_a8bfc44c",
            "https://www.wmesim.com",
          );
          return (
            <div className="my-8 rounded-[16px] overflow-hidden shadow-sm border border-gray-100">
              <img
                src={src}
                alt={node.attribs.alt || ""}
                className="w-full h-auto block"
                loading="lazy"
              />
            </div>
          );
        }
      },
    });

  return (
    <Layout>
      <Head>
        {/* 基本 SEO */}
        <title>{seo?.title || `${post.title.rendered}｜WMESIM`}</title>
        <meta
          name="description"
          content={
            seo?.description || "台灣 eSIM、免簽、自由行教學與最新旅遊資訊"
          }
        />
        <link rel="canonical" href={canonicalUrl} />
        {/* ... (其他 meta tags 可視需要補回) ... */}

        {/* 麵包屑結構化資料 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd),
          }}
        />
      </Head>

      {/* 整體背景：淺灰藍色，營造現代感 */}
      <div className="bg-[#F5F7FA] min-h-screen pt-[100px] pb-20">
        {/* 背景裝飾：模仿截圖中的 SVG 漸層光暈 (可選) */}
        <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-white to-[#F5F7FA] z-0 pointer-events-none" />

        <div className="relative z-10 max-w-[1280px] w-[92%] mx-auto">
          {/* 麵包屑導航 */}
          <nav className="text-sm text-gray-500 mb-6 flex flex-wrap items-center gap-2">
            <Link href="/" className="hover:text-[#1757ff] transition-colors">
              首頁
            </Link>
            <span className="text-gray-300">/</span>
            <Link
              href="/blog"
              className="hover:text-[#1757ff] transition-colors"
            >
              部落格文章
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800 font-medium truncate max-w-[200px] sm:max-w-none">
              {post.title.rendered}
            </span>
          </nav>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* 左側：文章主體卡片 */}
            <main className="w-full lg:w-[72%]">
              <article className="bg-white rounded-[32px] p-6 md:p-10 lg:p-14 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white">
                {/* 文章標頭區 */}
                <header className="mb-10 border-b border-gray-100 pb-8">
                  {/* 分類標籤 (如果有) */}
                  <div className="flex gap-2 mb-4">
                    <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-[#1757ff] text-xs font-bold tracking-wide">
                      NEWS
                    </span>
                    <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold tracking-wide">
                      {new Date(post.date).toLocaleDateString()}
                    </span>
                  </div>

                  <h1 className="text-3xl md:text-4xl lg:text-[42px] font-bold text-gray-900 leading-tight mb-6">
                    {post.title.rendered}
                  </h1>

                  {/* 作者或更新資訊 */}
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                      {/* 這裡可以放作者頭像 */}
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        A
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">WMESIM 編輯部</p>
                      <p className="text-xs text-gray-400">
                        最後更新：{new Date(post.modified).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </header>

                {/* 文章內容區 (Gutenberg Content) */}
                <div className="entry-content prose prose-lg prose-blue max-w-none">
                  {renderContent(post.content.rendered)}
                </div>

                {/* 文章底部操作區 */}
                <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-center">
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1757ff] font-medium transition-colors"
                  >
                    ← 回文章列表
                  </Link>
                  {/* 社群分享按鈕可放這裡 */}
                </div>
              </article>
            </main>

            {/* 右側：側邊欄 (Sidebar) */}
            <aside className="w-full lg:w-[28%] space-y-6 sticky top-24">
              {/* 推薦文章卡片 */}
              <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-[#1757ff] rounded-full"></span>
                  相關文章推薦
                </h3>

                <div className="space-y-6">
                  {relatedPosts.length > 0 ? (
                    relatedPosts.map((item) => {
                      const imageMatch = item.content.rendered.match(
                        /<img[^>]+src="([^">]+)"/,
                      );
                      const previewImg = imageMatch?.[1];

                      return (
                        <Link
                          href={`/blog/${item.slug}`}
                          key={item.id}
                          className="group block"
                        >
                          <div className="flex gap-4 items-start">
                            {/* 小縮圖 */}
                            <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-100 relative">
                              {previewImg ? (
                                <img
                                  src={previewImg}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200" />
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-800 leading-snug group-hover:text-[#1757ff] transition-colors line-clamp-2 mb-1">
                                {item.title.rendered}
                              </h4>
                              <span className="text-xs text-gray-400">
                                {new Date(item.date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-400">暫無相關文章</p>
                  )}
                </div>
              </div>

              {/* 廣告或 CTA 區塊 */}
              <div className="bg-gradient-to-br from-[#1757ff] to-[#003cc0] rounded-[24px] p-6 text-white text-center shadow-lg">
                <h3 className="font-bold text-xl mb-2">出國上網首選 eSIM</h3>
                <p className="text-white/80 text-sm mb-6">
                  免換卡、掃碼即用，暢遊日本韓國歐洲！
                </p>
                <Link
                  href="/"
                  className="inline-block bg-white text-[#1757ff] px-6 py-2 rounded-full font-bold text-sm hover:shadow-lg transition-shadow"
                >
                  立即購買 &rarr;
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* 底部輪播 */}
      <section className="bg-white py-20 border-t border-gray-100">
        <div className="max-w-[1280px] w-[92%] mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">更多精選內容</h2>
          <OtherPostsCarousel />
        </div>
      </section>

      {/* Global Style for Content Typography */}
      <style jsx global>{`
        /* 調整文章內文樣式，使其更易閱讀 */
        .entry-content {
          color: #374151; /* gray-700 */
          font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            "Helvetica Neue", Arial, sans-serif;
        }

        /* 標題優化 */
        .entry-content h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827; /* gray-900 */
          margin-top: 3rem;
          margin-bottom: 1.5rem;
          line-height: 1.3;
          position: relative;
          padding-left: 1rem;
        }

        /* H2 旁邊的裝飾線 (模仿 Re.MEDIA 風格) */
        .entry-content h2::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.25em;
          bottom: 0.25em;
          width: 4px;
          background-color: #1757ff;
          border-radius: 4px;
        }

        .entry-content h3 {
          font-size: 1.4rem;
          font-weight: 600;
          color: #1f2937; /* gray-800 */
          margin-top: 2.5rem;
          margin-bottom: 1rem;
        }

        /* 內文段落 */
        .entry-content p {
          margin-bottom: 1.5rem;
          line-height: 1.8;
          font-size: 1.05rem;
        }

        /* 列表 */
        .entry-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .entry-content li {
          margin-bottom: 0.5rem;
        }

        /* 引用塊 */
        .entry-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          color: #6b7280;
          font-style: italic;
          margin: 2rem 0;
        }
      `}</style>
    </Layout>
  );
}

// 靜態路徑與Props獲取邏輯維持不變
export async function getStaticPaths() {
  const res = await fetch(
    `https://inf.fjg.mybluehost.me/website_d17cf1ea/wp-json/wp/v2/posts?_fields=slug&per_page=20`,
  );
  const posts = await res.json();
  const paths = posts.map((post) => ({ params: { slug: post.slug } }));
  return { paths, fallback: true };
}

export async function getStaticProps({ params }) {
  const res = await fetch(
    `https://inf.fjg.mybluehost.me/website_d17cf1ea/wp-json/wp/v2/posts?slug=${params.slug}&_embed`,
  );
  const posts = await res.json();

  if (!posts[0]) return { notFound: true };
  const post = posts[0];

  // 獲取相關文章
  const categoryId = post.categories?.[0];
  let relatedPosts = [];
  if (categoryId) {
    const relRes = await fetch(
      `https://inf.fjg.mybluehost.me/website_d17cf1ea/wp-json/wp/v2/posts?categories=${categoryId}&exclude=${post.id}&per_page=4&_embed`,
    );
    relatedPosts = await relRes.json();
  }

  return {
    props: { post, relatedPosts },
    revalidate: 10,
  };
}
