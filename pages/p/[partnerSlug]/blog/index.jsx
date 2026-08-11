import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import PartnerBlogListView from "@/components/Shop/PartnerBlogListView";
import {
  fetchActiveStoreByDomain,
  fetchStoreProductsForStorefront,
} from "@/lib/partnerStorefront";
import { buildPartnerCountryNavItems } from "@/lib/partnerNavCountries";
import { fetchPartnerBlogPosts } from "@/lib/partnerBlog";
import {
  mergeBlogCms,
  resolveFeaturedProduct,
} from "@/lib/partnerBlogCms";

/**
 * 夥伴專屬 Blog 列表
 * /p/{partnerSlug}/blog/
 */
export default function PartnerBlogIndexPage({
  store,
  posts,
  products,
  blogCms,
  pickupProduct,
  navCountries,
}) {
  return (
    <PartnerShopLayout
      store={store}
      title="旅遊文章"
      description={`${store?.store_name || "夥伴賣場"}夥伴精選文章（非主站內容）`}
      navCountries={navCountries}
    >
      <PartnerBlogListView
        store={store}
        posts={posts}
        products={products}
        blogCms={blogCms}
        pickupProduct={pickupProduct}
      />
    </PartnerShopLayout>
  );
}

export async function getServerSideProps(context) {
  const partnerSlug = String(context.params?.partnerSlug || "")
    .trim()
    .toLowerCase();
  if (!partnerSlug) return { notFound: true };

  try {
    const store = await fetchActiveStoreByDomain(partnerSlug);
    if (!store) return { notFound: true };

    const [products, posts] = await Promise.all([
      fetchStoreProductsForStorefront(store),
      fetchPartnerBlogPosts({ store, perPage: 30 }),
    ]);

    const blogCms = mergeBlogCms(store.blog_cms);
    const navCountries = buildPartnerCountryNavItems(products, store.domain);
    const pickupProduct = resolveFeaturedProduct(products, blogCms);

    return {
      props: {
        store,
        posts,
        products,
        blogCms,
        pickupProduct,
        navCountries,
      },
    };
  } catch (err) {
    console.error("[PartnerBlogIndexPage]", err);
    return { notFound: true };
  }
}
