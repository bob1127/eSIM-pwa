import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import PartnerBlogArticleView from "@/components/Shop/PartnerBlogArticleView";
import { loadPartnerBlogArticleProps } from "@/lib/partnerBlogPages";
import { fetchPublishedPartnerArticlePaths } from "@/lib/partnerBlogMain";
import { SITE_URL } from "@/lib/seo.config";

/**
 * 夥伴專屬 Blog 文章內頁（ISR）
 * 真實供稿：canonical → 主站 /blog/{slug}/（主站吃 SEO，夥伴頁互聯）
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
      title={post.ogTitle || post.title}
      description={post.metaDescription || post.excerpt || post.title}
      canonicalUrl={canonicalUrl}
      navCountries={navCountries}
      seo={{
        pageType: "Article",
        ogType: "article",
        path: `blog/${post.slug}`,
        ogImage: post.ogImage || post.image,
        keywords: post.metaKeywords || null,
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

export async function getStaticPaths() {
  if (process.env.VERCEL || process.env.SKIP_PRODUCT_SSG === "1") {
    return { paths: [], fallback: "blocking" };
  }
  try {
    const list = await fetchPublishedPartnerArticlePaths({ limit: 80 });
    return {
      paths: list.map((p) => ({
        params: { partnerSlug: p.partnerSlug, slug: p.slug },
      })),
      fallback: "blocking",
    };
  } catch (err) {
    console.error("[PartnerBlogArticlePage] getStaticPaths", err);
    return { paths: [], fallback: "blocking" };
  }
}

export async function getStaticProps({ params }) {
  try {
    const result = await loadPartnerBlogArticleProps(
      params?.partnerSlug,
      params?.slug,
    );
    if (result.notFound) {
      return { notFound: true, revalidate: 60 };
    }
    return { ...result, revalidate: 3600 };
  } catch (err) {
    console.error("[PartnerBlogArticlePage]", err);
    return { notFound: true, revalidate: 60 };
  }
}
