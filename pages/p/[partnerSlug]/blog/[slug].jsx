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
import {
  mergeBlogCms,
  resolveFeaturedProduct,
} from "@/lib/partnerBlogCms";
import { SITE_URL } from "@/lib/seo.config";

/**
 * 夥伴專屬 Blog 文章內頁
 * 真實供稿：canonical → 主站 /blog/{slug}（主站吃 SEO，夥伴頁互聯）
 * 示範文：canonical → 夥伴本身
 */
export default function PartnerBlogArticlePage({
  store,
  post,
  relatedPosts,
  prevPost,
  products,
  blogCms,
  pickupProduct,
  navCountries,
}) {
  const isDemo = post?.source === "partner-demo";
  const partnerUrl = `${SITE_URL}/p/${store.domain}/blog/${post.slug}/`;
  const mainUrl = `${SITE_URL}/blog/${post.slug}/`;
  const canonicalUrl = isDemo ? partnerUrl : mainUrl;

  return (
    <PartnerShopLayout
      store={store}
      title={post.title}
      description={post.excerpt || post.title}
      canonicalUrl={canonicalUrl}
      navCountries={navCountries}
      seo={{
        pageType: "Article",
        ogType: "article",
        path: `blog/${post.slug}`,
        article: post,
        mainArticleUrl: isDemo ? null : mainUrl,
        articlePublishedTime: post.dateIso || post.date,
        articleModifiedTime: post.updatedAtIso || post.dateIso,
        articleSection: post.categoryLabel || "旅遊文章",
        articleTags: post.tags || [],
        articleAuthor: post.editorName || store.store_name,
        breadcrumbs: [
          { name: "Jeko eSIM", path: "/" },
          { name: store.store_name, path: `/p/${store.domain}/` },
          { name: "旅遊文章", path: `/p/${store.domain}/blog/` },
          { name: post.title, path: `/p/${store.domain}/blog/${post.slug}/` },
        ],
      }}
    >
      <PartnerBlogArticleView
        store={store}
        post={post}
        relatedPosts={relatedPosts}
        prevPost={prevPost}
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

    const blogCms = mergeBlogCms(store.blog_cms);
    const navCountries = buildPartnerCountryNavItems(products, store.domain);
    const relatedPosts = allPosts
      .filter((p) => p.slug !== post.slug)
      .slice(0, 6);
    const prevPost = relatedPosts[0] || null;
    const pickupProduct = resolveFeaturedProduct(products, blogCms);

    return {
      props: {
        store,
        post,
        relatedPosts,
        prevPost,
        products,
        blogCms,
        pickupProduct,
        navCountries,
      },
    };
  } catch (err) {
    console.error("[PartnerBlogArticlePage]", err);
    return { notFound: true };
  }
}
