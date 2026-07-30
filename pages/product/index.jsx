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
  const limit = 100;
  const fields =
    "+metadata,*tags,*categories,*options,*variants,*variants.options,*variants.prices,*variants.calculated_price";

  while (true) {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      fields,
    });
    const res = await fetch(`${backendUrl}/store/products?${query}`, {
      headers,
    });
    if (!res.ok) {
      throw new Error(`Medusa products ${res.status}`);
    }
    const data = await res.json();
    const batch = data.products || [];
    all.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
    if (offset > 500) break;
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
        <div className="filter-wrap flex lg:flex-row flex-col sm:px-5 px-4 md:px-10 min-h-screen">
          <div className="filter_bar overflow-hidden w-full lg:w-[25%] bg-white mt-[30px] mr-4">
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

          <div className="bottom-content mt-[30px] overflow-hidden w-full lg:w-[75%] flex flex-col">
            <div className="top-navgation bg-white max-w-[1920px] border-b border-gray-200 py-5 flex flex-col sm:flex-row items-center pl-4 sm:pl-10">
              <div className="bread_crumb w-full text-gray-500">
                <Link
                  href="/"
                  className="hover:text-blue-600 transition-colors"
                >
                  Home
                </Link>
                <span className="mx-2">/</span>
                <span className="text-[16px] font-bold text-slate-800">
                  所有商品
                </span>
              </div>
              <CountryFilter />
            </div>

            {currentProducts.length > 0 ? (
              <div className="grid grid-cols-1 bg-white sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-2 sm:p-6">
                {currentProducts.map((product, index) => {
                  const productImage =
                    product.image_url || "/default-image.jpg";
                  const price = product.price;
                  const regularPrice = product.original_price;
                  const categorySlug =
                    product.category_slug || "uncategorized";
                  const productSlug = product.slug || product.handle;
                  const productLink = `/product/${categorySlug}/${productSlug}`;

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                    >
                      <Link href={productLink} className="block">
                        <div className="card overflow-hidden p-4 bg-white">
                          <div className="relative w-full aspect-[4/3] mb-3 overflow-hidden rounded-lg bg-slate-50">
                            <SafeImage
                              src={productImage}
                              alt={product.name}
                              fill
                              sizes="(max-width: 768px) 50vw, 20vw"
                              unoptimized={shouldBypassImageOptimization(
                                productImage,
                              )}
                              className="object-contain p-5 sm:p-6"
                            />
                          </div>
                          <span className="font-bold text-sm text-slate-800 block mb-1 line-clamp-2 min-h-[40px]">
                            {product.name}
                          </span>
                          <div className="text-stone-900 mt-2">
                            <div className="flex items-end gap-2">
                              <span className="text-blue-600 font-bold text-lg">
                                {price > 0 ? `NT$${price}` : "查看方案"}
                              </span>
                              {regularPrice &&
                                regularPrice !== price &&
                                regularPrice > 0 && (
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
              <div className="text-center text-gray-500 p-10 bg-white min-h-[300px] flex items-center justify-center">
                暫無商品。
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center mt-8 mb-8 space-x-2">
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
