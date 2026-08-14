import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import PartnerBlogListView from "@/components/Shop/PartnerBlogListView";
import { loadPartnerBlogIndexProps } from "@/lib/partnerBlogPages";
import { getPartnerStorefrontDb } from "@/lib/partnerStorefront";

/**
 * 夥伴專屬 Blog 列表（ISR）
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

export async function getStaticPaths() {
  if (process.env.VERCEL || process.env.SKIP_PRODUCT_SSG === "1") {
    return { paths: [], fallback: "blocking" };
  }
  try {
    const db = getPartnerStorefrontDb();
    if (!db) return { paths: [], fallback: "blocking" };
    const { data } = await db
      .from("stores")
      .select("domain")
      .eq("status", "active")
      .eq("blog_custom_enabled", true)
      .limit(80);
    return {
      paths: (data || [])
        .map((s) => String(s.domain || "").trim().toLowerCase())
        .filter(Boolean)
        .map((partnerSlug) => ({ params: { partnerSlug } })),
      fallback: "blocking",
    };
  } catch {
    return { paths: [], fallback: "blocking" };
  }
}

export async function getStaticProps({ params }) {
  try {
    const result = await loadPartnerBlogIndexProps(params?.partnerSlug);
    if (result.notFound) {
      return { notFound: true, revalidate: 60 };
    }
    return { ...result, revalidate: 600 };
  } catch (err) {
    console.error("[PartnerBlogIndexPage]", err);
    return { notFound: true, revalidate: 60 };
  }
}
