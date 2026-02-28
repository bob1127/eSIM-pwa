import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Layout from "../Layout";
import CountryFilter from "../../components/NavbarTestSideBarToggle.jsx";
import { useRouter } from "next/router";
import SwiperCarousel from "../../components/SwiperCarousel/SwiperCard.jsx";
import FilterSideBar from "../../components/FilterSideBar";
import { motion } from "framer-motion";

// 輔助函式：建立 WooCommerce API 請求 URL (僅在伺服器端使用)
const getWooCommerceUrl = (endpoint, params = {}) => {
  const baseUrl = process.env.WORDPRESS_URL;
  const ck = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  const queryString = new URLSearchParams({
    consumer_key: ck,
    consumer_secret: cs,
    ...params,
  }).toString();

  return `${baseUrl}/wp-json/wc/v3/${endpoint}?${queryString}`;
};

// 修改 pages/category/[slug].js 的 getStaticPaths 區塊

export async function getStaticPaths() {
  try {
    const apiUrl = getWooCommerceUrl("products/categories", { per_page: 100 });
    const res = await fetch(apiUrl);

    // 1. 先檢查 API 回傳狀態
    if (!res.ok) {
      console.error(`❌ API 請求失敗: ${res.status} ${res.statusText}`);
      // 遇到錯誤，回傳空陣列讓 Build 繼續通過 (前端會轉為 fallback)
      return { paths: [], fallback: "blocking" };
    }

    const categories = await res.json();

    // 2. 關鍵修正：檢查 categories 到底是不是陣列
    if (!Array.isArray(categories)) {
      console.error(
        "❌ API 回傳格式錯誤 (不是陣列):",
        JSON.stringify(categories, null, 2)
      );
      // 如果 API 回傳錯誤訊息 (例如 401 Unauthorized)，不要讓 .map() 炸掉程式
      return { paths: [], fallback: "blocking" };
    }

    const paths = categories.map((cat) => ({
      params: { slug: cat.slug },
    }));

    return { paths, fallback: "blocking" };
  } catch (error) {
    console.error("❌ getStaticPaths 發生例外錯誤:", error);
    return { paths: [], fallback: "blocking" };
  }
}
export async function getStaticProps({ params }) {
  try {
    // 1. 抓取所有分類
    const categoryUrl = getWooCommerceUrl("products/categories", {
      per_page: 100,
    });
    const catRes = await fetch(categoryUrl);
    const categories = await catRes.json();

    // 2. 找到當前 Slug 對應的分類 ID
    const matchedCategory = categories.find((cat) => cat.slug === params.slug);

    // 如果找不到分類，回傳 404
    if (!matchedCategory) return { notFound: true };

    // 3. 根據分類 ID 抓取產品
    const productUrl = getWooCommerceUrl("products", {
      category: matchedCategory.id,
      per_page: 50, // 可以根據需求調整數量
    });

    const productRes = await fetch(productUrl);
    const products = await productRes.json();

    return {
      props: {
        slug: params.slug,
        categories,
        initialProducts: products,
      },
      revalidate: 60, // 每 60 秒重新驗證一次資料 (ISR)
    };
  } catch (e) {
    console.error("❌ getStaticProps 錯誤：", e);
    return { notFound: true };
  }
}

const CategoryPage = ({ slug, categories, initialProducts }) => {
  const router = useRouter();
  // 使用 initialProducts 作為初始資料，避免在前端再次 fetch 暴露金鑰
  const [filteredProducts, setFilteredProducts] = useState(
    initialProducts || []
  );
  const [activeTags, setActiveTags] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PRODUCTS_PER_PAGE = 12;

  // 當路由變更時，確保產品列表更新 (主要依賴 getStaticProps 的資料)
  useEffect(() => {
    setFilteredProducts(initialProducts || []);
  }, [initialProducts]);

  useEffect(() => {
    const tagsFromQuery = router.query.tags?.split(",").filter(Boolean) || [];
    setActiveTags(tagsFromQuery);
  }, [router.query.tags]);

  // 前端篩選邏輯
  useEffect(() => {
    if (!initialProducts) return;

    if (!activeTags || activeTags.length === 0) {
      setFilteredProducts(initialProducts);
    } else {
      const filtered = initialProducts.filter((product) => {
        const tagMatch = activeTags.every((tag) =>
          product.tags?.some((t) => t.slug === tag || t.name === tag)
        );
        const categoryMatch = activeTags.every((tag) =>
          product.categories?.some((cat) => cat.slug === tag)
        );
        return tagMatch || categoryMatch;
      });
      setFilteredProducts(filtered);
      setCurrentPage(1); // 篩選後重置頁碼
    }
  }, [activeTags, initialProducts]);

  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  // 取得當前分類名稱
  const currentCategoryName =
    categories?.find((cat) => cat.slug === slug)?.name || "All Products";

  return (
    <Layout>
      <div className="flex flex-col bg-[#f9f9fa]">
        <section className="section_Hero w-full mx-auto">
          <SwiperCarousel />
        </section>

        <div className="filter-wrap flex lg:flex-row flex-col sm:px-5 px-4 md:px-10 min-h-screen">
          <div className="filter_bar rounded-xl overflow-hidden w-full lg:w-[25%] bg-white mt-[30px] mr-4">
            {/* 傳遞完整的 categories 給 Sidebar，如果 Sidebar 需要 */}
            <FilterSideBar
              products={initialProducts}
              activeTags={activeTags}
              setActiveTags={(tags) => {
                setActiveTags(tags);
                const tagQuery = tags.join(",");
                router.push(
                  {
                    pathname: router.pathname,
                    query: { ...router.query, tags: tagQuery },
                  },
                  undefined,
                  { scroll: false }
                );
              }}
            />
          </div>

          <div className="bottom-content mt-[30px] rounded-xl overflow-hidden w-full lg:w-[75%] flex flex-col">
            <div className="top-navgation bg-white max-w-[1920px] border-b border-gray-200 py-5 flex flex-col sm:flex-row items-center pl-4 sm:pl-10">
              <div className="bread_crumb w-full">
                <Link href="/">Home</Link> ←{" "}
                <span className="text-[16px]">{currentCategoryName}</span>
              </div>
              <CountryFilter />
            </div>

            {currentProducts.length > 0 ? (
              <div className="grid grid-cols-1 bg-white rounded-bl-xl rounded-br-xl sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-2 sm:p-6">
                {currentProducts.map((product, index) => {
                  // 解析圖片邏輯
                  const match = product?.description?.match(
                    /<img[^>]+src="([^">]+)"/
                  );
                  const extractedImg = match?.[1];
                  const productImage =
                    product?.images?.[0]?.src ||
                    extractedImg ||
                    "/default-image.jpg";

                  const price =
                    product?.prices?.sale_price ||
                    product?.prices?.price ||
                    product.price ||
                    null;
                  const regularPrice =
                    product?.prices?.regular_price ||
                    product.regular_price ||
                    null;

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="group"
                    >
                      <Link
                        href={`/product/${product.slug}`}
                        prefetch={false}
                        className="hover:scale-105 duration-200 block"
                      >
                        <div className="card overflow-hidden rounded-xl p-4 bg-white">
                          <Image
                            src={productImage}
                            alt={product.name}
                            width={300}
                            height={300}
                            className="w-full rounded-[30px] border-2 border-gray-300 group-hover:shadow-lg object-contain mb-3"
                          />
                          <span className="font-bold text-[16px] block mb-1">
                            {product.name}
                          </span>
                          <div className="text-gray-700">
                            {price ? (
                              <>
                                {regularPrice && regularPrice !== price && (
                                  <del className="mr-1 text-gray-400 text-sm">
                                    NT${regularPrice}
                                  </del>
                                )}
                                <span className="text-blue-600 font-bold">
                                  NT${price}
                                </span>
                              </>
                            ) : (
                              <span className="text-red-500 text-sm">
                                價格未設定
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 p-10 bg-white rounded-b-xl">
                此分類暫無產品。
              </div>
            )}

            {/* 分頁按鈕 */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8 mb-8 space-x-2">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 rounded border ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-blue-600 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CategoryPage;
