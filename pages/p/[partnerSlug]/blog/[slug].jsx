import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import PartnerBlogArticleView from "@/components/Shop/PartnerBlogArticleView";
import {
  fetchActiveStoreByDomain,
  fetchStoreProductsForStorefront,
} from "@/lib/partnerStorefront";
import { buildPartnerCountryNavItems } from "@/lib/partnerNavCountries";
import {
  fetchPartnerBlogPostBySlug,
  fetchPartnerBlogPosts,
} from "@/lib/partnerBlog";

/**
 * 夥伴專屬 Blog 文章內頁
 * /p/{partnerSlug}/blog/{slug}/
 */
export default function PartnerBlogArticlePage({
  store,
  post,
  relatedPosts,
  prevPost,
  pickupProduct,
  navCountries,
}) {
  return (
    <PartnerShopLayout
      store={store}
      title={post.title}
      description={post.excerpt || post.title}
      navCountries={navCountries}
    >
      <PartnerBlogArticleView
        store={store}
        post={post}
        relatedPosts={relatedPosts}
        prevPost={prevPost}
        pickupProduct={pickupProduct}
      />
    </PartnerShopLayout>
  );
}

export async function getServerSideProps(context) {
  const partnerSlug = String(context.params?.partnerSlug || "")
    .trim()
    .toLowerCase();
  const slug = String(context.params?.slug || "").trim();
  if (!partnerSlug || !slug) return { notFound: true };

  try {
    const store = await fetchActiveStoreByDomain(partnerSlug);
    if (!store) return { notFound: true };

    const [products, post, allPosts] = await Promise.all([
      fetchStoreProductsForStorefront(store),
      fetchPartnerBlogPostBySlug(slug, store),
      fetchPartnerBlogPosts({ store, perPage: 16 }),
    ]);

    if (!post) return { notFound: true };

    const navCountries = buildPartnerCountryNavItems(products, store.domain);
    const relatedPosts = allPosts
      .filter((p) => p.slug !== post.slug)
      .slice(0, 6);
    const prevPost = relatedPosts[0] || null;
    const pickupProduct = products[0] || null;

    return {
      props: {
        store,
        post,
        relatedPosts,
        prevPost,
        pickupProduct,
        navCountries,
      },
    };
  } catch (err) {
    console.error("[PartnerBlogArticlePage]", err);
    return { notFound: true };
  }
}
