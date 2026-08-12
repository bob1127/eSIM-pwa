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
import { withUsEsimDefaultImage } from "../../../lib/usEsimDefaultImage";
import { sortCategoriesByRank } from "../../../lib/sortCategoriesByRank";
import {
  canonicalCategoryHandle,
  categoryHandlesForProductFetch,
  dedupeCategoriesForNav,
} from "../../../lib/categoryAliases";
import FilterSideBar, {
  filterProductsByTags,
  buildFilterTagsFromProduct,
  buildDisplayTagsFromProduct,
} from "../../../components/FilterSideBar";
import { SlidersHorizontal, X, ChevronRight, MapPin } from "lucide-react";
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

async function findCategoryByHandle(headers, handle) {
  const catUrl = `${backendUrl}/store/product-categories?handle=${encodeURIComponent(handle)}`;
  const catRes = await fetch(catUrl, { headers });
  const catData = await catRes.json();
  return catData.product_categories?.[0] || null;
}

// ==========================================
// 🚀 1. getStaticPaths
// ==========================================
export async function getStaticPaths() {
  // Vercel build 不預建全部分類頁，避免 Medusa 慢查拖垮 collect page data
  if (process.env.VERCEL || process.env.SKIP_PRODUCT_SSG === "1") {
    return { paths: [], fallback: "blocking" };
  }

  try {
    const res = await fetch(`${backendUrl}/store/product-categories`, {
      headers: getMedusaHeaders(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error("無法取得 Medusa 分類路徑");
    const { product_categories } = await res.json();
    const seen = new Set();
    const paths = [];
    for (const cat of product_categories || []) {
      const slug = canonicalCategoryHandle(cat.handle);
      if (seen.has(slug)) continue;
      seen.add(slug);
      paths.push({ params: { category: slug } });
    }
    return { paths, fallback: "blocking" };
  } catch (error) {
    return { paths: [], fallback: "blocking" };
  }
}

export async function getStaticProps({ params }) {
  try {
    const rawHandle = String(params.category || "");
    const categoryHandle = canonicalCategoryHandle(rawHandle);
    const headers = getMedusaHeaders();

    // 別名（如 tailand）→ 正規分類；若正規不存在再回退別名本身
    let currentCategory =
      (await findCategoryByHandle(headers, categoryHandle)) ||
      (await findCategoryByHandle(headers, rawHandle));

    if (!currentCategory) {
      // 不設 revalidate 的話，Medusa 一次暫時性失敗就會被永久快取成 404
      return { notFound: true, revalidate: 60 };
    }

    // calculated_price 必須帶 region_id，否則 Medusa 回 invalid_data，products 變空陣列
    const regionRes = await fetch(`${backendUrl}/store/regions`, { headers });
    const regionData = regionRes.ok ? await regionRes.json() : { regions: [] };
    const region =
      regionData.regions?.find(
        (r) => r.currency_code?.toLowerCase() === "twd",
      ) || regionData.regions?.[0];

    // 合併別名分類下的商品（泰國：thailand + 歷史 typo tailand）
    const fetchHandles = categoryHandlesForProductFetch(
      currentCategory.handle || categoryHandle,
    );
    const aliasCats = await Promise.all(
      fetchHandles.map((h) => findCategoryByHandle(headers, h)),
    );
    const categoryIds = [
      ...new Set(aliasCats.filter(Boolean).map((c) => c.id)),
    ];
    if (!categoryIds.includes(currentCategory.id)) {
      categoryIds.unshift(currentCategory.id);
    }

    const prodQuery = new URLSearchParams({
      fields:
        "+metadata,*tags,*options,*variants,*variants.options,*variants.prices,*variants.calculated_price",
      limit: "100",
    });
    for (const id of categoryIds) {
      prodQuery.append("category_id[]", id);
    }
    if (region?.id) prodQuery.set("region_id", region.id);

    const prodUrl = `${backendUrl}/store/products?${prodQuery}`;
    const prodRes = await fetch(prodUrl, { headers });
    const prodData = await prodRes.json();
    if (!prodRes.ok || !Array.isArray(prodData.products)) {
      console.error("❌ Medusa products 失敗：", prodData?.type, prodData?.message);
    }

    const allCatRes = await fetch(`${backendUrl}/store/product-categories`, {
      headers,
    });
    const allCatData = await allCatRes.json();

    const displaySlug = canonicalCategoryHandle(currentCategory.handle);
    const formattedCurrentCategory = {
      id: currentCategory.id,
      name: currentCategory.name,
      slug: displaySlug,
      description: currentCategory.description || "",
    };

    const formattedAllCategories = dedupeCategoriesForNav(
      sortCategoriesByRank(allCatData.product_categories || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.handle,
      })),
    );

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

    const seenProductIds = new Set();
    const formattedProducts = (prodData.products || [])
      .filter((p) => {
        if (!p?.id || seenProductIds.has(p.id)) return false;
        seenProductIds.add(p.id);
        return true;
      })
      .map((p) => {
        const amounts = (p.variants || [])
          .map(getVariantAmount)
          .filter((n) => typeof n === "number" && n > 0);
        const price = amounts.length > 0 ? Math.min(...amounts) : 0;
        const firstVariant = p.variants?.[0];
        const originalPrice = firstVariant?.original_price || price;
        const isTestPlan = !!(
          p.metadata?.microesim_test ||
          p.metadata?.test_plan ||
          String(p.title || "").includes("測試購買")
        );

        const filterTags = buildFilterTagsFromProduct(p);
        const primaryCategory = p.categories?.[0];
        const categorySlug =
          primaryCategory?.handle || currentCategory.handle;
        return {
          id: p.id,
          name: p.title,
          slug: p.handle,
          price,
          original_price: originalPrice,
          image_url: withUsEsimDefaultImage(resolveMedusaImageUrl(p.thumbnail), {
            categorySlug,
            handle: p.handle,
          }),
          tags: filterTags,
          displayTags: buildDisplayTagsFromProduct(p, filterTags),
          category_slug: categorySlug,
          category_name: primaryCategory?.name || currentCategory.name,
          isTestPlan,
        };
      });

    // MicroeSIM 測試購買商品置頂，方便串接驗證
    formattedProducts.sort(
      (a, b) => Number(b.isTestPlan) - Number(a.isTestPlan),
    );

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
    return { notFound: true, revalidate: 60 };
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
  const currentProducts = filteredProducts.slice(
    startIndex,
    startIndex + PRODUCTS_PER_PAGE,
  );
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
                className="fixed left-0 top-0 bottom-0 w-[85vw] max-w-[340px] bg-[#F7F9FB] z-[9001] overflow-y-auto pb-24 lg:hidden"
              >
                <div className="flex items-center justify-between px-4 pt-16 pb-3 border-b border-slate-200 bg-white sticky top-0 z-10">
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
                <div className="fixed bottom-0 left-0 w-[85vw] max-w-[340px] p-3 bg-white border-t border-slate-100 z-[9002]">
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    className="w-full py-3.5 bg-[#1E4AD1] text-white rounded-full font-bold text-sm shadow-md"
                  >
                    看結果（{filteredProducts.length} 件）
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="filter-wrap flex lg:flex-row flex-col px-4 sm:px-5 md:px-8 min-h-screen pt-6 md:pt-10 pb-16 bg-[#F7F9FB] max-w-[1440px] mx-auto w-full">
          {/* ── 桌面版左側篩選欄 ── */}
          <div className="filter_bar hidden lg:block w-[240px] shrink-0 mt-6 mr-6 self-start sticky top-32">
            <FilterSideBar
              products={initialProducts}
              activeTags={activeTags}
              setActiveTags={handleSetActiveTags}
            />
          </div>

          <div className="bottom-content mt-4 lg:mt-6 w-full min-w-0 flex flex-col gap-3">
            {/* 麵包屑 — 橫向不換行 */}
            <nav
              aria-label="麵包屑"
              className="flex items-center gap-1 text-[12px] sm:text-[13px] text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5"
            >
              <Link href="/product" className="hover:text-[#0071EB] shrink-0">
                商店
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="font-bold text-[#1E4AD1] shrink-0">
                {currentCategory?.name}
              </span>
            </nav>

            {/* 分類標題區 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-[22px] sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight">
                    {currentCategory?.name}
                  </h1>
                  {currentCategory?.description ? (
                    <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed line-clamp-2 max-w-2xl">
                      {currentCategory.description}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">
                      選擇適合的天數與流量方案，下單後即可收到 QR Code 開通。
                    </p>
                  )}
                </div>

                {/* 切換國家（Medusa 分類） */}
                {categories?.length > 0 && (
                  <label className="flex items-center gap-2 shrink-0 text-[13px] text-slate-600">
                    <MapPin className="w-4 h-4 text-[#0071EB]" />
                    <select
                      className="appearance-none bg-slate-50 border border-slate-200 rounded-full pl-3 pr-8 py-2 text-[13px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0071EB]/30 cursor-pointer"
                      value={currentCategory?.slug || ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          router.push(`/product/${e.target.value}`);
                        }
                      }}
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </div>

            {/* 手機：固定篩選工具列 */}
            <div className="lg:hidden sticky top-[72px] z-30 -mx-4 px-4 sm:-mx-6 sm:px-6">
              <div className="flex items-center gap-2 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-sm px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white bg-[#1E4AD1] rounded-full px-3.5 py-2 shrink-0"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  篩選
                  {activeTags.length > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black bg-[#FADE2B] text-[#111] rounded-full">
                      {activeTags.length}
                    </span>
                  )}
                </button>
                <p className="text-[12px] text-slate-500 truncate flex-1">
                  共{" "}
                  <span className="font-bold text-slate-800">
                    {filteredProducts.length}
                  </span>{" "}
                  件
                  {activeTags.length > 0 && (
                    <span className="text-[#0071EB]">
                      {" "}
                      · 已篩 {activeTags.length} 項
                    </span>
                  )}
                </p>
                {activeTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSetActiveTags([])}
                    className="text-[12px] font-bold text-slate-400 hover:text-red-500 shrink-0"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>

            {/* 已篩選 chips */}
            {activeTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-1">
                <span className="text-[12px] text-slate-400 shrink-0 hidden sm:inline">
                  已篩選
                </span>
                {activeTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      handleSetActiveTags(activeTags.filter((t) => t !== tag))
                    }
                    className="inline-flex items-center gap-1 text-[12px] bg-[#1E4AD1] text-white rounded-full px-2.5 py-1 font-medium"
                  >
                    {tag}
                    <span aria-hidden>×</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleSetActiveTags([])}
                  className="text-[12px] text-slate-400 hover:text-red-500 ml-auto sm:ml-0"
                >
                  清除全部
                </button>
              </div>
            )}

            {/* 桌面結果數 */}
            <div className="hidden lg:flex items-center justify-between px-1">
              <p className="text-[13px] text-slate-500">
                共{" "}
                <span className="font-bold text-slate-800">
                  {filteredProducts.length}
                </span>{" "}
                件商品
                {activeTags.length > 0 && (
                  <span className="text-slate-400">
                    （已套用 {activeTags.length} 個篩選）
                  </span>
                )}
              </p>
            </div>

            {/* 商品格 — 卡片固定較窄寬度；外層 max-w-[1200px] 限制整體 */}
            {currentProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(220px,280px))] gap-2.5 sm:gap-3.5 justify-start">
                {currentProducts.map((product, index) => {
                  const productImage =
                    product.image_url || "/default-image.jpg";
                  const price = product.price;
                  const regularPrice = product.original_price;
                  const productLink = `/product/${currentCategory.slug}/${product.slug}`;
                  const cardTags = product.displayTags || [];

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.04 }}
                      className="min-w-0 w-full"
                    >
                      <Link href={productLink} className="block h-full group">
                        <div className="h-full flex flex-col overflow-hidden rounded-xl bg-white border border-slate-200/90 lg:hover:border-[#0071EB]/30 lg:hover:shadow-md transition-all">
                          {/* 圖片區維持原設計 */}
                          <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-50 rounded-t-xl">
                            <SafeImage
                              src={productImage}
                              alt={product.name}
                              fill
                              sizes="(max-width: 768px) 50vw, 25vw"
                              unoptimized={shouldBypassImageOptimization(
                                productImage,
                              )}
                              className="object-contain p-5 sm:p-6 lg:group-hover:scale-[1.03] lg:transition-transform lg:duration-500"
                            />
                          </div>
                          <div className="flex flex-col flex-1 p-2.5 sm:p-3.5">
                            <h2 className="font-bold text-[12px] sm:text-[13px] text-slate-800 leading-snug line-clamp-2 min-h-[2.5em]">
                              {product.name}
                            </h2>
                            {cardTags.length > 0 && (
                              <p className="mt-1.5 text-[10px] sm:text-[11px] text-[#1E4AD1] font-medium leading-snug line-clamp-2">
                                {cardTags.join(" · ")}
                              </p>
                            )}
                            <div className="flex items-end gap-1.5 mt-auto pt-2.5">
                              <span className="text-[#0071EB] font-black text-[15px] sm:text-base tabular-nums leading-none">
                                NT${price}
                                <span className="text-[10px] sm:text-[11px] font-bold ml-0.5">
                                  起
                                </span>
                              </span>
                              {regularPrice && regularPrice !== price && (
                                <del className="text-slate-400 text-[10px] mb-px">
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
              <div className="text-center text-slate-400 py-16 px-6 bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center min-h-[280px]">
                <p className="font-bold text-slate-700 mb-1 text-base">
                  找不到符合條件的商品
                </p>
                <p className="text-sm text-slate-500">試試放寬天數或流量條件</p>
                <button
                  type="button"
                  onClick={() => handleSetActiveTags([])}
                  className="mt-4 px-5 py-2.5 rounded-full bg-[#1E4AD1] text-white text-sm font-bold"
                >
                  清除所有篩選
                </button>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center mt-4 gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCurrentPage(i + 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-9 h-9 rounded-full border text-sm font-bold transition-colors ${
                      currentPage === i + 1
                        ? "bg-[#1E4AD1] text-white border-[#1E4AD1]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
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
