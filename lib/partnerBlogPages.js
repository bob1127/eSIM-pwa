/**
 * 夥伴文章公開頁 ISR 資料（接近靜態 HTML）
 */
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

function jsonSafe(value) {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value));
}

export async function loadPartnerBlogArticleProps(partnerSlug, slug) {
  const domain = String(partnerSlug || "")
    .trim()
    .toLowerCase();
  const postSlug = String(slug || "").trim();
  if (!domain || !postSlug) return { notFound: true };

  const store = await fetchActiveStoreByDomain(domain);
  if (!store) return { notFound: true };

  const [products, post, allPosts] = await Promise.all([
    fetchStoreProductsForStorefront(store),
    fetchPartnerBlogPostBySlug(postSlug, store),
    fetchPartnerBlogPosts({ store, perPage: 30 }),
  ]);

  if (!post) return { notFound: true };

  const blogCms = mergeBlogCms(store.blog_cms);
  const navCountries = buildPartnerCountryNavItems(products, store.domain);
  const latestPosts = (allPosts || []).filter((p) => p.slug !== post.slug);
  const relatedPosts = latestPosts.slice(0, 6);
  const prevPost = relatedPosts[0] || null;
  const pickupProduct = resolveFeaturedProduct(products, blogCms);

  return {
    props: {
      store: jsonSafe(store),
      post: jsonSafe(post),
      relatedPosts: jsonSafe(relatedPosts) || [],
      latestPosts: jsonSafe(latestPosts) || [],
      prevPost: prevPost ? jsonSafe(prevPost) : null,
      products: jsonSafe(products) || [],
      blogCms: jsonSafe(blogCms),
      pickupProduct: pickupProduct ? jsonSafe(pickupProduct) : null,
      navCountries: jsonSafe(navCountries) || [],
    },
  };
}

export async function loadPartnerBlogIndexProps(partnerSlug) {
  const domain = String(partnerSlug || "")
    .trim()
    .toLowerCase();
  if (!domain) return { notFound: true };

  const store = await fetchActiveStoreByDomain(domain);
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
      store: jsonSafe(store),
      posts: jsonSafe(posts) || [],
      products: jsonSafe(products) || [],
      blogCms: jsonSafe(blogCms),
      pickupProduct: pickupProduct ? jsonSafe(pickupProduct) : null,
      navCountries: jsonSafe(navCountries) || [],
    },
  };
}
