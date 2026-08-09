import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Layout from "../Layout.js";
import CountryFilter from "../../components/NavbarTestSideBarToggle.jsx";
import FilterSideBar, {
  filterProductsByTags,
  buildFilterTagsFromProduct,
  buildDisplayTagsFromProduct,
} from "../../components/FilterSideBar";
import SafeImage from "../../components/SafeImage";
import {
  resolveMedusaImageUrl,
  shouldBypassImageOptimization,
} from "../../lib/resolveMedusaImageUrl";
import {
  getMedusaBackendUrl,
  getMedusaPublishableKey,
  isVisibleOnMainSite,
} from "../../lib/medusaStoreApi";

function getMedusaHeaders() {
  const publishableKey = getMedusaPublishableKey();
  return {
    "Content-Type": "application/json",
    ...(publishableKey && { "x-publishable-api-key": publishableKey }),
  };
}

function getVariantAmount(v) {
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
}

async function fetchAllMedusaProducts() {
  const backendUrl = getMedusaBackendUrl();
  const headers = getMedusaHeaders();
  const all = [];
  let offset = 0;
  const limit = 50;
  // 列表頁只要最低價／縮圖／標籤，勿拉全變體選項（日本無限流量等會拖垮 Vercel build）
  const fields =
    "+metadata,*tags,*categories,*variants.prices,*variants.calculated_price,thumbnail,title,handle";

  // calculated_price 需要 region_id，否則 API 回 invalid_data、列表變空
  let regionId = "";
  try {
    const regionRes = await fetch(`${backendUrl}/store/regions`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (regionRes.ok) {
      const regionData = await regionRes.json();
      const region =
        regionData.regions?.find(
          (r) => r.currency_code?.toLowerCase() === "twd",
        ) || regionData.regions?.[0];
      regionId = region?.id || "";
    }
  } catch {
    /* 沒 region 時下面仍可用 prices 欄位 */
  }

  while (true) {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      fields,
    });
    if (regionId) query.set("region_id", regionId);
    const res = await fetch(`${backendUrl}/store/products?${query}`, {
      headers,
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      throw new Error(`Medusa products ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data.products)) {
      throw new Error(
        `Medusa products invalid: ${data?.type || ""} ${data?.message || ""}`,
      );
    }
    const batch = data.products || [];
    all.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
    if (offset > 300) break;
  }

  return all.filter(isVisibleOnMainSite);
}

function formatListingProduct(p) {
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
  const categorySlug = p.categories?.[0]?.handle || "uncategorized";

  return {
    id: p.id,
    name: p.title,
    slug: p.handle,
    handle: p.handle,
    category_slug: categorySlug,
    price,
    original_price: originalPrice,
    image_url: resolveMedusaImageUrl(p.thumbnail),
    tags: filterTags,
    displayTags: buildDisplayTagsFromProduct(p, filterTags),
    isTestPlan,
  };
}

export async function getStaticProps() {
  try {
    const products = await fetchAllMedusaProducts();
    const formatted = products
      .map(formatListingProduct)
      .filter((p) => p.slug);

    formatted.sort((a, b) => Number(b.isTestPlan) - Number(a.isTestPlan));

    return {
      props: {
        initialProducts: formatted,
      },
      revalidate: 3600,
    };
  } catch (err) {
    console.error("[product/index] Medusa fetch failed:", err?.message || err);
    return {
      props: { initialProducts: [] },
      revalidate: 3600,
    };
  }
}

const AllProductsPage = ({ initialProducts }) => {
  const router = useRouter();
  const [activeTags, setActiveTags] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PRODUCTS_PER_PAGE = 15;

  useEffect(() => {
    const tagsFromQuery = router.query.tags?.split(",").filter(Boolean) || [];
    setActiveTags(tagsFromQuery);
  }, [router.query.tags]);

  const filteredProducts = useMemo(
    () => filterProductsByTags(initialProducts || [], activeTags),
    [activeTags, initialProducts],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTags]);

  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  return (
    <Layout>
      <div className="flex flex-col bg-[#f9f9fa]">
        <div className="filter-wrap flex lg:flex-row flex-col sm:px-4 px-3 md:px-8 lg:px-10 min-h-screen gap-0 lg:gap-3 max-w-[1400px] mx-auto w-full">
          <div className="filter_bar w-full lg:w-[22%] lg:max-w-[260px] lg:shrink-0 bg-white mt-[24px] lg:mt-[30px] rounded-xl border border-slate-100 lg:border-0 lg:self-start lg:sticky lg:top-28 lg:z-20 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
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

          <div className="bottom-content mt-[24px] lg:mt-[30px] overflow-hidden w-full lg:flex-1 flex flex-col gap-3 sm:gap-4 pb-8">
            <div className="top-navgation bg-white rounded-xl border border-slate-100 py-4 px-3 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="bread_crumb w-full text-gray-500 text-sm">
                <Link
                  href="/product"
                  className="hover:text-blue-600 transition-colors font-bold text-slate-800 text-[15px]"
                >
                  商店
                </Link>
              </div>
              <CountryFilter />
            </div>

            <div className="flex items-center justify-between px-1">
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

            {currentProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
                {currentProducts.map((product, index) => {
                  const productImage =
                    product.image_url || "/default-image.jpg";
                  const price = product.price;
                  const regularPrice = product.original_price;
                  const categorySlug =
                    product.category_slug || "uncategorized";
                  const productSlug = product.slug || product.handle;
                  const productLink = `/product/${categorySlug}/${productSlug}`;
                  const cardTags = product.displayTags || [];

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.04 }}
                    >
                      <Link href={productLink} className="block h-full group">
                        <div className="h-full flex flex-col overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-[#0071EB]/30 hover:shadow-md transition-all">
                          <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-50">
                            <SafeImage
                              src={productImage}
                              alt={product.name}
                              fill
                              sizes="(max-width: 768px) 50vw, 22vw"
                              unoptimized={shouldBypassImageOptimization(
                                productImage,
                              )}
                              className="object-contain p-3 sm:p-4 group-hover:scale-[1.03] transition-transform duration-500"
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
                                {price > 0 ? (
                                  <>
                                    NT${price}
                                    <span className="text-[10px] sm:text-[11px] font-bold ml-0.5">
                                      起
                                    </span>
                                  </>
                                ) : (
                                  "查看方案"
                                )}
                              </span>
                              {regularPrice &&
                                regularPrice !== price &&
                                regularPrice > 0 && (
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
              <div className="text-center text-slate-400 py-16 px-6 bg-white rounded-xl border border-slate-100 flex flex-col items-center justify-center min-h-[280px]">
                <p className="font-bold text-slate-700 mb-1 text-base">
                  暫無商品
                </p>
                <p className="text-sm text-slate-500">試試調整左側篩選條件</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center mt-4 mb-2 space-x-2">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 border transition-colors ${
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
