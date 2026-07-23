import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import PartnerBlogListView from "@/components/Shop/PartnerBlogListView";
import {
  fetchActiveStoreByDomain,
  fetchStoreProductsForStorefront,
} from "@/lib/partnerStorefront";
import { buildPartnerCountryNavItems } from "@/lib/partnerNavCountries";
import { fetchPartnerBlogPosts } from "@/lib/partnerBlog";

/**
 * 夥伴專屬 Blog 列表
 * /p/{partnerSlug}/blog/
 */
export default function PartnerBlogIndexPage({
  store,
  posts,
  pickupProduct,
  navCountries,
}) {
  return (
    <PartnerShopLayout
      store={store}
      title="旅遊文章"
      description={`${store?.store_name || "夥伴賣場"}精選出國攻略與 eSIM 實用文章`}
      navCountries={navCountries}
    >
      <PartnerBlogListView
        store={store}
        posts={posts}
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

    const navCountries = buildPartnerCountryNavItems(products, store.domain);
    const pickupProduct = products[0] || null;

    return {
      props: {
        store,
        posts,
        pickupProduct,
        navCountries,
      },
    };
  } catch (err) {
    console.error("[PartnerBlogIndexPage]", err);
    return { notFound: true };
  }
}
