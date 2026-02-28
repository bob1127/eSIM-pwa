import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Head from "next/head.js";
import Layout from "../../Layout.js";
import CountryFilter from "../../../components/NavbarTestSideBarToggle.jsx";
import SwiperCarousel from "../../../components/SwiperCarousel/SwiperCard.jsx";
import FilterSideBar from "../../../components/FilterSideBar";

// 🚀 導入你剛剛建立的 Supabase Client
import { supabase } from "../../../lib/supabaseClient";

// --- getStaticPaths (從 Supabase 產生所有分類網址) ---
export async function getStaticPaths() {
  try {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("slug");

    if (error) throw error;

    const paths = categories.map((cat) => ({
      params: { category: cat.slug },
    }));

    return { paths, fallback: "blocking" };
  } catch (error) {
    console.error("Supabase getStaticPaths 錯誤：", error);
    return { paths: [], fallback: "blocking" };
  }
}

// --- getStaticProps (從 Supabase 抓取資料) ---
export async function getStaticProps({ params }) {
  try {
    const { category: categorySlug } = params;

    // 1. 抓取當前分類資料
    const { data: categoryData, error: catError } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", categorySlug)
      .single();

    if (catError || !categoryData) return { notFound: true };

    // 2. 抓取該分類下的所有商品
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("*")
      .eq("category_id", categoryData.id);

    // 3. 抓取所有分類表 (供側邊欄使用)
    const { data: allCategories } = await supabase
      .from("categories")
      .select("*");

    return {
      props: {
        currentCategory: categoryData,
        categories: allCategories || [],
        initialProducts: products || [],
      },
      revalidate: 60, // 💡 保持 ISR: 每 60 秒在背景更新一次頁面
    };
  } catch (e) {
    console.error("❌ Supabase getStaticProps 錯誤：", e);
    return { notFound: true };
  }
}

const CategoryPage = ({ currentCategory, categories, initialProducts }) => {
  const router = useRouter();
  const [filteredProducts, setFilteredProducts] = useState(initialProducts);
  const [activeTags, setActiveTags] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PRODUCTS_PER_PAGE = 12;

  useEffect(() => {
    const tagsFromQuery = router.query.tags?.split(",").filter(Boolean) || [];
    setActiveTags(tagsFromQuery);
  }, [router.query.tags]);

  // 前端篩選邏輯 (假設 Supabase 產品表中有一個 tags 欄位，格式為字串陣列)
  useEffect(() => {
    if (!initialProducts) return;

    if (!activeTags || activeTags.length === 0) {
      setFilteredProducts(initialProducts);
    } else {
      const filtered = initialProducts.filter((product) => {
        // 假設你的 Supabase tags 儲存為 ['SoftBank', '5GB']
        return activeTags.every((tag) => product.tags?.includes(tag));
      });
      setFilteredProducts(filtered);
      setCurrentPage(1);
    }
  }, [activeTags, initialProducts]);

  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  if (router.isFallback)
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          載入中...
        </div>
      </Layout>
    );

  return (
    <Layout>
      <Head>
        <title>{currentCategory?.name} eSIM 推薦 | 極客網頁設計</title>
        <meta
          name="description"
          content={
            currentCategory?.description ||
            `精選 ${currentCategory?.name} 旅遊 eSIM，隨插即用。`
          }
        />
      </Head>

      <div className="flex flex-col bg-[#f9f9fa]">
        <section className="section_Hero w-full mx-auto">
          <SwiperCarousel />
        </section>

        <div className="filter-wrap flex lg:flex-row flex-col sm:px-5 px-4 md:px-10 min-h-screen">
          <div className="filter_bar rounded-xl overflow-hidden w-full lg:w-[25%] bg-white mt-[30px] mr-4">
            <FilterSideBar
              products={initialProducts}
              activeTags={activeTags}
              setActiveTags={(tags) => {
                setActiveTags(tags);
                const tagQuery = tags.join(",");
                router.push(
                  {
                    pathname: `/product/${currentCategory.slug}`,
                    query: { ...router.query, tags: tagQuery },
                  },
                  undefined,
                  { scroll: false },
                );
              }}
            />
          </div>

          <div className="bottom-content mt-[30px] rounded-xl overflow-hidden w-full lg:w-[75%] flex flex-col">
            <div className="top-navgation bg-white max-w-[1920px] border-b border-gray-200 py-5 flex flex-col sm:flex-row items-center pl-4 sm:pl-10">
              <div className="bread_crumb w-full text-gray-500">
                <Link
                  href="/"
                  className="hover:text-blue-600 transition-colors"
                >
                  Home
                </Link>
                <span className="mx-2">/</span>
                <Link
                  href="/product"
                  className="hover:text-blue-600 transition-colors"
                >
                  所有商品
                </Link>
                <span className="mx-2">/</span>
                <span className="text-[16px] font-bold text-slate-800">
                  {currentCategory?.name}
                </span>
              </div>
              <CountryFilter />
            </div>

            {currentProducts.length > 0 ? (
              <div className="grid grid-cols-1 bg-white rounded-bl-xl rounded-br-xl sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-2 sm:p-6">
                {currentProducts.map((product, index) => {
                  // 🚀 直接從 Supabase 欄位抓取圖片與價格
                  const productImage =
                    product.image_url || "/default-image.jpg";
                  const price = product.price;
                  const regularPrice = product.original_price;
                  const productLink = `/product/${currentCategory.slug}/${product.slug}`;

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="group"
                    >
                      <Link
                        href={productLink}
                        className="hover:scale-105 duration-200 block"
                      >
                        <div className="card overflow-hidden rounded-xl p-4 bg-white">
                          <div className="relative w-full aspect-[3/4] mb-3">
                            <Image
                              src={productImage}
                              alt={product.name}
                              fill
                              className="rounded-[20px] border-2 border-gray-100 group-hover:shadow-lg group-hover:border-blue-100 object-cover transition-all"
                            />
                          </div>
                          <span className="font-bold text-sm text-slate-800 block mb-1 line-clamp-2 min-h-[40px]">
                            {product.name}
                          </span>
                          <div className="text-gray-700 mt-2">
                            <div className="flex items-end gap-2">
                              <span className="text-blue-600 font-bold text-lg">
                                NT${price}
                              </span>
                              {regularPrice && regularPrice !== price && (
                                <del className="text-gray-400 text-xs mb-0.5">
                                  NT${regularPrice}
                                </del>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 p-10 bg-white rounded-b-xl flex flex-col items-center justify-center min-h-[300px]">
                <span className="text-4xl mb-3">📭</span>
                <p>這個分類目前還沒有商品喔！</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center mt-8 mb-8 space-x-2">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 rounded border transition-colors ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white border-blue-600 font-bold"
                        : "bg-white text-blue-600 border-gray-300 hover:bg-gray-50"
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
