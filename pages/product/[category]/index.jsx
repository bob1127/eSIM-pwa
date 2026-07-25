import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import SafeImage from "../../../components/SafeImage";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../../Layout.js";
import { buildCategorySeo } from "../../../lib/seo.config";
import {
  resolveMedusaImageUrl,
  shouldBypassImageOptimization,
} from "../../../lib/resolveMedusaImageUrl";
import { sortCategoriesByRank } from "../../../lib/sortCategoriesByRank";
import CountryFilter from "../../../components/NavbarTestSideBarToggle.jsx";
import FilterSideBar, { filterProductsByTags } from "../../../components/FilterSideBar";
import { SlidersHorizontal, X } from "lucide-react";
// SwiperCarousel / Slider 已從分類頁移除（進入分類後不再顯示首頁上方 Hero）
// ==========================================
// 🚀 Medusa API 輔助設定
// ==========================================
const getMedusaHeaders = () => {
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  return {
    "Content-Type": "application/json",
    ...(publishableKey && { "x-publishable-api-key": publishableKey }),
  };
};

const backendUrl =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

// ==========================================
// 🚀 1. getStaticPaths
// ==========================================
export async function getStaticPaths() {
  try {
    const res = await fetch(`${backendUrl}/store/product-categories`, {
      headers: getMedusaHeaders(),
    });
    if (!res.ok) throw new Error("無法取得 Medusa 分類路徑");
    const { product_categories } = await res.json();
    const paths = product_categories.map((cat) => ({
      params: { category: cat.handle },
    }));
    return { paths, fallback: "blocking" };
  } catch (error) {
    return { paths: [], fallback: "blocking" };
  }
}

export async function getStaticProps({ params }) {
  try {
    const { category: categoryHandle } = params;
    const headers = getMedusaHeaders();

    const catUrl = `${backendUrl}/store/product-categories?handle=${categoryHandle}`;
    const catRes = await fetch(catUrl, { headers });
    const catData = await catRes.json();
    const currentCategory = catData.product_categories?.[0];

    if (!currentCategory) {
      return { notFound: true };
    }

    const prodUrl = `${backendUrl}/store/products?category_id[]=${currentCategory.id}&fields=*variants,*variants.prices,*variants.calculated_price&limit=100`;
    const prodRes = await fetch(prodUrl, { headers });
    const prodData = await prodRes.json();

    const allCatRes = await fetch(`${backendUrl}/store/product-categories`, {
      headers,
    });
    const allCatData = await allCatRes.json();

    const formattedCurrentCategory = {
      id: currentCategory.id,
      name: currentCategory.name,
      slug: currentCategory.handle,
      description: currentCategory.description || "",
    };

    const formattedAllCategories = sortCategoriesByRank(
      allCatData.product_categories || [],
    ).map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.handle,
    }));

    const getVariantAmount = (v) => {
      if (
        v?.calculated_price &&
        typeof v.calculated_price.calculated_amount === "number"
      ) {
        return v.calculated_price.calculated_amount;
      }
      if (typeof v?.calculated_price === "number") {
        return v.calculated_price;
      }
      if (v?.prices?.length > 0) {
        const twd = v.prices.find(
          (pr) =>
            pr.currency_code?.toLowerCase() === "twd" ||
            pr.currency_code?.toLowerCase() === "ntd",
        );
        return twd ? twd.amount : v.prices[0].amount;
      }
      return null;
    };

    const formattedProducts = (prodData.products || []).map((p) => {
      const amounts = (p.variants || [])
        .map(getVariantAmount)
        .filter((n) => typeof n === "number" && n > 0);
      const price = amounts.length > 0 ? Math.min(...amounts) : 0;
      const firstVariant = p.variants?.[0];
      const originalPrice = firstVariant?.original_price || price;

      return {
        id: p.id,
        name: p.title,
        slug: p.handle,
        price,
        original_price: originalPrice,
        image_url: resolveMedusaImageUrl(p.thumbnail),
        tags: p.tags?.map((t) => t.value) || [],
      };
    });

    return {
      props: {
        currentCategory: formattedCurrentCategory,
        categories: formattedAllCategories,
        initialProducts: formattedProducts,
      },
      revalidate: 60,
    };
  } catch (e) {
    console.error("❌ Medusa getStaticProps 發生致命錯誤：", e);
    return { notFound: true };
  }
}

// ==========================================
// 3. UI 元件
// ==========================================
const CategoryPage = ({ currentCategory, categories, initialProducts }) => {
  const router = useRouter();
  const [activeTags, setActiveTags] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const PRODUCTS_PER_PAGE = 12;

  useEffect(() => {
    const tagsFromQuery = router.query.tags?.split(",").filter(Boolean) || [];
    setActiveTags(tagsFromQuery);
  }, [router.query.tags]);

  // 用 filterProductsByTags 做正確的範圍/模糊比對
  const filteredProducts = useMemo(
    () => filterProductsByTags(initialProducts || [], activeTags),
    [activeTags, initialProducts],
  );

  // 篩選變動時重置到第一頁
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTags]);

  const pageSeo = useMemo(
    () => buildCategorySeo(currentCategory, initialProducts),
    [currentCategory, initialProducts],
  );

  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  if (router.isFallback)
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">
          載入中，請稍候...
        </div>
      </Layout>
    );

  const handleSetActiveTags = (tags) => {
    setActiveTags(tags);
    const tagQuery = tags.join(",");
    const newQuery = { ...router.query };
    if (tagQuery) {
      newQuery.tags = tagQuery;
    } else {
      delete newQuery.tags;
    }
    router.push(
      { pathname: `/product/${currentCategory.slug}`, query: newQuery },
      undefined,
      { scroll: false },
    );
  };

  return (
    <Layout seo={pageSeo}>
      <div className="flex flex-col bg-[#f9f9fa]">
        {/* ── 手機版：篩選抽屜 overlay ── */}
        <AnimatePresence>
          {mobileFilterOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-[9000] lg:hidden"
                onClick={() => setMobileFilterOpen(false)}
              />
              <motion.div
                key="drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 260 }}
                className="fixed left-0 top-0 bottom-0 w-[85vw] max-w-[340px] bg-[#f9f9fa] z-[9001] overflow-y-auto pb-10 lg:hidden"
              >
                <div className="flex items-center justify-between px-4 pt-16 pb-3 border-b border-slate-200 bg-white sticky top-0">
                  <p className="font-black text-slate-800">篩選方案</p>
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    className="p-1.5 rounded-full hover:bg-slate-100"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <div className="p-3">
                  <FilterSideBar
                    products={initialProducts}
                    activeTags={activeTags}
                    setActiveTags={(tags) => {
                      handleSetActiveTags(tags);
                    }}
                  />
                </div>
                {activeTags.length > 0 && (
                  <div className="px-4 pb-4">
                    <button
                      type="button"
                      onClick={() => {
                        handleSetActiveTags([]);
                        setMobileFilterOpen(false);
                      }}
                      className="w-full py-3 bg-[#0A6CD0] text-white rounded-xl font-bold text-sm"
                    >
                      套用篩選（{filteredProducts.length} 件）
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="filter-wrap flex lg:flex-row flex-col sm:px-5 px-4 md:px-10 min-h-screen pt-28 md:pt-36">
          {/* ── 桌面版左側篩選欄 ── */}
          <div className="filter_bar hidden lg:block w-[260px] shrink-0 mt-[30px] mr-5 self-start sticky top-32">
            <FilterSideBar
              products={initialProducts}
              activeTags={activeTags}
              setActiveTags={handleSetActiveTags}
            />
          </div>

          <div className="bottom-content mt-[30px] rounded-xl overflow-hidden w-full flex flex-col">
            {/* ── 麵包屑列（含手機篩選入口） ── */}
            <div className="top-navgation bg-white max-w-[1920px] border-b border-gray-200 py-4 flex items-center gap-3 px-4 sm:px-6">
              {/* 手機篩選按鈕 */}
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 bg-white hover:border-blue-400 hover:text-blue-600 transition-colors shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4" />
                篩選
                {activeTags.length > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-black bg-[#0A6CD0] text-white rounded-full">
                    {activeTags.length}
                  </span>
                )}
              </button>

              <div className="bread_crumb text-gray-500 text-sm flex-1 min-w-0">
                <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                <span className="mx-1.5">/</span>
                <Link href="/product" className="hover:text-blue-600 transition-colors">所有商品</Link>
                <span className="mx-1.5">/</span>
                <span className="font-bold text-slate-800">{currentCategory?.name}</span>
              </div>

              <CountryFilter />
            </div>

            {/* ── 已篩選標籤（桌面版 + 手機顯示在商品上方） ── */}
            {activeTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                <span className="text-[12px] text-slate-500 shrink-0">已篩選：</span>
                {activeTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[12px] bg-[#0A6CD0] text-white rounded-full px-2.5 py-0.5 font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleSetActiveTags(activeTags.filter((t) => t !== tag))}
                      className="hover:bg-white/20 rounded-full leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => handleSetActiveTags([])}
                  className="ml-auto text-[12px] text-slate-400 hover:text-red-500 transition-colors"
                >
                  清除全部
                </button>
              </div>
            )}

            {/* ── 結果數量提示 ── */}
            <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100 text-[12px] text-slate-400">
              共 {filteredProducts.length} 件商品
              {activeTags.length > 0 && `（已套用 ${activeTags.length} 個篩選）`}
            </div>

            {/* ── 商品格 ── */}
            {currentProducts.length > 0 ? (
              <div className="grid grid-cols-2 bg-white rounded-bl-xl rounded-br-xl sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-3 sm:p-6">
                {currentProducts.map((product, index) => {
                  const productImage = product.image_url || "/default-image.jpg";
                  const price = product.price;
                  const regularPrice = product.original_price;
                  const productLink = `/product/${currentCategory.slug}/${product.slug}`;

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.04 }}
                      className="group"
                    >
                      <Link href={productLink} className="block">
                        <div className="card overflow-hidden p-3 bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all">
                          <div className="relative w-full aspect-[3/4] mb-3">
                            <SafeImage
                              src={productImage}
                              alt={product.name}
                              fill
                              sizes="(max-width: 768px) 50vw, 25vw"
                              unoptimized={shouldBypassImageOptimization(
                                productImage,
                              )}
                              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                          </div>
                          <span className="font-bold text-sm text-slate-800 block mb-1 line-clamp-2 min-h-[40px]">
                            {product.name}
                          </span>
                          {/* 商品 tags 標籤 */}
                          {product.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {product.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full leading-tight"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-end gap-2 mt-1">
                            <span className="text-[#0A6CD0] font-black text-base">
                              NT${price}
                              <span className="text-[12px] font-bold ml-0.5">
                                起
                              </span>
                            </span>
                            {regularPrice && regularPrice !== price && (
                              <del className="text-gray-400 text-xs mb-0.5">
                                NT${regularPrice}
                              </del>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-400 p-14 bg-white rounded-b-xl flex flex-col items-center justify-center min-h-[300px]">
                <p className="font-bold text-slate-600 mb-1">找不到符合篩選條件的商品</p>
                <p className="text-sm">試試調整篩選條件，或</p>
                <button
                  type="button"
                  onClick={() => handleSetActiveTags([])}
                  className="mt-3 text-[#0A6CD0] text-sm font-bold underline underline-offset-2"
                >
                  清除所有篩選
                </button>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center mt-8 mb-8 gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg border text-sm font-bold transition-colors ${
                      currentPage === i + 1
                        ? "bg-[#0A6CD0] text-white border-[#0A6CD0]"
                        : "bg-white text-slate-600 border-gray-200 hover:bg-gray-50"
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
