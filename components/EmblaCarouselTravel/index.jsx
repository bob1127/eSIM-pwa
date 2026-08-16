import Head from "next/head";
import EmblaCarousel from "./EmblaCarousel";
import { fetchWpPosts } from "../../lib/wordpress";
import { stripHtml } from "@/lib/stripHtml";

function extractFirstImageFromContent(content) {
  if (!content) return null;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

export default function Home({ slides }) {
  // 輪播設定
  const OPTIONS = { dragFree: true, loop: true };

  return (
    <>
      <main className=" py-8  flex flex-col justify-center relative z-10">
        {/* 背景裝飾 (保留你的風格) */}
        <div className="bg-svg fixed left-1/2 w-[70vw] -translate-x-1/2 pointer-events-none z-0 opacity-50">
          {/* 這裡可以放你的背景圖 */}
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* 傳入處理好的 slides 資料 */}
          <EmblaCarousel slides={slides} options={OPTIONS} />
        </div>
      </main>
    </>
  );
}

// 🚀 Server-Side Data Fetching (完全參考你的 BlogPage)
export async function getStaticProps() {
  try {
    // 1. 使用你的 API URL
    const posts = await fetchWpPosts({ per_page: 20 });

    // 2. 資料轉換 (Data Transformation)
    // 把 WP 的原始資料轉成 Carousel 需要的格式
    const slides = posts.map((post) => {
      // A. 抓圖片 (使用你的正則邏輯)
      const contentImage = extractFirstImageFromContent(post.content.rendered);
      // 如果文章內沒圖，嘗試抓特色圖片，再沒有就給預設圖
      const featureImage =
        post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;

      const finalImage =
        contentImage ||
        featureImage ||
        "https://via.placeholder.com/800x600?text=No+Image";

      // B. 抓分類 (假設第一個分類是主要分類)
      // 注意：WP API 預設回傳的是分類 ID，若要名稱通常需要額外處理
      // 這裡我們先寫死或根據 ID 判斷，或者依賴 _embedded['wp:term']
      let categoryName = "Travel";
      if (post._embedded && post._embedded["wp:term"]) {
        const categories = post._embedded["wp:term"][0];
        if (categories && categories.length > 0) {
          categoryName = categories[0].name;
        }
      }

      return {
        id: post.id,
        title: post.title.rendered,
        // 摘要處理：移除 HTML 標籤並限制長度
        description: stripHtml(post.excerpt.rendered).substring(0, 80) + "...",
        image: finalImage,
        category: categoryName,
        date: new Date(post.date).toLocaleDateString(),
        link: `/blog/${post.slug}`, // 設定點擊後的連結
      };
    });

    return {
      props: {
        slides,
      },
      // ISR: 每 10 秒重新生成一次頁面，確保資料不過太舊
      revalidate: 10,
    };
  } catch (error) {
    console.error("Fetch Error:", error);
    return {
      props: {
        slides: [],
      },
      revalidate: 10,
    };
  }
}
