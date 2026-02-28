import Link from "next/link";
import Image from "next/image";
import Layout from "../Layout";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Svg from "../../components/SvgColor";

// 🔧 擷取文章內第一張圖片 URL
function extractFirstImageFromContent(content) {
  if (!content) return null;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// ✨ 動畫參數
const fadeUpVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export default function BlogPage({ posts }) {
  return (
    <Layout>
      {/* 1. 保留原始背景代碼 */}
      <div className="bg-svg fixed left-1/2 w-[70vw] -translate-x-1/2 pointer-events-none z-0">
        <img src="/images/6b328ed5b4de80217f388c6ed012feb8.png" alt="" />
      </div>

      {/* 2. 保留原始 SVG 代碼 */}
      <div className=" fixed left-[50%] w-[50vw]  z-20">
        {" "}
        <Svg />
      </div>

      {/* 3. 保留原始 Section 結構與樣式 */}
      <section className="flex relative z-40 justify-end w-full py-20 bg-white/30 backdrop-blur-2xl backdrop-saturate-150 shadow-lg  ">
        <div className="max-w-[1920px] pb-[100px] pt-[200px] w-[90%] xl:w-[85%] mx-auto px-4">
          <h1 className="text-3xl font-bold mb-12 text-center text-slate-800">
            部落格文章123
          </h1>

          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => {
              const previewImage = extractFirstImageFromContent(
                post.content.rendered,
              );
              const postUrl = `/blog/${post.slug}`;
              const postDate = new Date(post.date).toLocaleDateString();

              const [ref, inView] = useInView({
                triggerOnce: true,
                threshold: 0.1, // 稍微調低一點讓手機版更容易觸發
              });

              return (
                <motion.div
                  key={post.id}
                  ref={ref}
                  variants={fadeUpVariants}
                  initial="hidden"
                  animate={inView ? "visible" : "hidden"}
                  className="h-full"
                >
                  <Link href={postUrl} className="block h-full group">
                    {/* 卡片容器：Re.MEDIA 風格 - 淺灰藍背景 + 大圓角 + 內縮 Padding */}
                    <article
                      className="
                        h-full flex flex-col
                        bg-[#F5F7FA] hover:bg-white
                        rounded-[30px] p-5
                        transition-all duration-300 ease-in-out
                        hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)]
                        border border-transparent hover:border-gray-100
                      "
                    >
                      {/* 圖片區域：內縮 + 獨立圓角 + 白底襯托 */}
                      <div className="relative w-full aspect-[16/10] bg-white rounded-[20px] overflow-hidden mb-5 shadow-sm border border-gray-100/50">
                        {previewImage ? (
                          <Image
                            src={previewImage}
                            alt={post.title.rendered}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 33vw"
                            priority={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>

                      {/* 文字內容區 */}
                      <div className="flex flex-col flex-grow px-1">
                        <h2 className="text-[19px] leading-snug font-bold text-slate-800 mb-3 line-clamp-2 group-hover:text-[#3b82f6] transition-colors">
                          {post.title.rendered}
                        </h2>

                        {/* 摘要 */}
                        <div
                          className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-6 flex-grow"
                          dangerouslySetInnerHTML={{
                            __html: post.excerpt.rendered,
                          }}
                        />

                        {/* 底部資訊：標籤樣式按鈕 + 日期 */}
                        <div className="mt-auto flex items-center justify-between border-t border-gray-200/60 pt-4">
                          {/* 藍色外框標籤 */}
                          <span
                            className="
                            inline-flex items-center justify-center 
                            px-4 py-1.5 
                            rounded-full 
                            border border-[#3b82f6] 
                            text-[#3b82f6] text-xs font-bold 
                            bg-white group-hover:bg-[#3b82f6] group-hover:text-white transition-colors duration-300
                          "
                          >
                            閱讀更多
                          </span>

                          <p className="text-slate-400 text-xs font-medium">
                            {postDate}
                          </p>
                        </div>
                      </div>
                    </article>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
}

export async function getStaticProps() {
  try {
    const res = await fetch(
      `https://inf.fjg.mybluehost.me/website_d17cf1ea/wp-json/wp/v2/posts?per_page=20&_embed`,
    );
    const posts = await res.json();

    return {
      props: {
        posts,
      },
      revalidate: 10,
    };
  } catch (error) {
    return {
      props: {
        posts: [],
      },
      revalidate: 10,
    };
  }
}
