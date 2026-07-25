import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Layout from "../Layout.js";
import CountryFilter from "../../components/NavbarTestSideBarToggle.jsx";
import FilterSideBar from "../../components/FilterSideBar";
import { supabase } from "../../lib/supabaseClient";
import SafeImage from "../../components/SafeImage";
import { shouldBypassImageOptimization } from "../../lib/resolveMedusaImageUrl";

// --- getStaticProps (從 Supabase 抓取所有資料) ---
export async function getStaticProps() {
  try {
    // 1. 抓取所有分類 (給側邊欄用)
    const { data: categories } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    // 2. 抓取所有商品，並聯集 (Join) 分類資料以取得分類 slug
    // 💡 這裡的 '*, categories(slug)' 會自動幫你把分類的 slug 帶進來，方便產生網址
    const { data: products, error } = await supabase
      .from("products")
      .select("*, categories(slug)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      props: {
        categories: categories || [],
        initialProducts: products || [],
      },
      revalidate: 60, // 💡 ISR: 每 60 秒在背景更新一次
    };
  } catch (e) {
    console.error("❌ Supabase getStaticProps 錯誤：", e);
    return {
      props: { categories: [], initialProducts: [] },
      revalidate: 60,
    };
  }
}

const AllProductsPage = ({ categories, initialProducts }) => {
  const router = useRouter();
  const [filteredProducts, setFilteredProducts] = useState(initialProducts);
  const [activeTags, setActiveTags] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PRODUCTS_PER_PAGE = 15; // 調整每頁顯示數量

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
        // 1. 檢查商品標籤 (tags 欄位需為字串陣列)
        const tagMatch = activeTags.every((tag) => product.tags?.includes(tag));

        // 2. 檢查商品分類 (針對總覽頁的側邊欄分類點擊)
        const categoryMatch = activeTags.some(
          (tag) => product.categories?.slug === tag,
        );

        return tagMatch || categoryMatch;
      });
      setFilteredProducts(filtered);
      setCurrentPage(1);
    }
  }, [activeTags, initialProducts]);

  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  return (
    <Layout>
      <div className="flex flex-col bg-[#f9f9fa]">
        <section className="section_Hero w-full mx-auto">
          <SwiperCarousel />
        </section>

        <div className="filter-wrap flex lg:flex-row flex-col sm:px-5 px-4 md:px-10 min-h-screen">
          {/* 左側篩選欄 */}
          <div className="filter_bar rounded-xl overflow-hidden w-full lg:w-[25%] bg-white mt-[30px] mr-4">
            <FilterSideBar
              products={initialProducts}
              activeTags={activeTags}
              setActiveTags={(tags) => {
                setActiveTags(tags);
                const tagQuery = tags.join(",");
                router.push(
                  {
                    pathname: "/product",
                    query: { ...router.query, tags: tagQuery },
                  },
                  undefined,
                  { scroll: false },
                );
              }}
            />
          </div>

          {/* 右側商品列表 */}
          <div className="bottom-content mt-[30px] rounded-xl overflow-hidden w-full lg:w-[75%] flex flex-col">
            <div className="top-navgation bg-white max-w-[1920px] border-b border-gray-200 py-5 flex flex-col sm:flex-row items-center pl-4 sm:pl-10">
              <div className="bread_crumb w-full text-gray-500">
                <Link
                  href="/"
                  className="hover:text-blue-600 transition-colors"
                >
                  Homes
                </Link>
                <span className="mx-2">/</span>
                <span className="text-[16px] font-bold text-slate-800">
                  所有商品 (All Products)
                </span>
              </div>
              <CountryFilter />
            </div>

            {currentProducts.length > 0 ? (
              <div className="grid grid-cols-1 bg-white rounded-bl-xl rounded-br-xl sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-2 sm:p-6">
                {currentProducts.map((product, index) => {
                  // 🚀 直接讀取 Supabase 欄位
                  const productImage =
                    product.image_url || "/default-image.jpg";
                  const price = product.price;
                  const regularPrice = product.original_price;

                  // 💡 動態產生連結：/product/[分類slug]/[商品slug]
                  const categorySlug =
                    product.categories?.slug || "uncategorized";
                  const productLink = `/product/${categorySlug}/${product.slug}`;

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
                            <SafeImage
                              src={productImage}
                              alt={product.name}
                              fill
                              sizes="(max-width: 768px) 50vw, 20vw"
                              unoptimized={shouldBypassImageOptimization(
                                productImage,
                              )}
                              className="rounded-[20px] border-2 border-gray-100 group-hover:shadow-lg group-hover:border-blue-100 object-cover transition-all"
                            />
                          </div>
                          <span className="font-bold text-sm text-slate-800 block mb-1 line-clamp-2 min-h-[40px]">
                            {product.name}
                          </span>
                          <div className="text-stone-900 mt-2">
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
              <div className="text-center text-gray-500 p-10 bg-white rounded-b-xl min-h-[300px] flex items-center justify-center">
                暫無商品。
              </div>
            )}

            {/* 分頁 */}
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

export default AllProductsPage;
