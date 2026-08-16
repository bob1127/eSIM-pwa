import Layout from "../Layout";
import CreatorProfileView from "@/components/creators/CreatorProfileView";
import { loadCreatorProfile } from "@/lib/creatorProfile";
import { creatorKeyFromPath } from "@/lib/blogCreator";

export default function CreatorPage({ profile }) {
  if (!profile) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center text-slate-500">
          找不到這位創作者
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      hideNavbar
      flushTop
      seo={{
        title: `${profile.name}｜創作者`,
        description: profile.bio,
        ogImage: profile.cover,
      }}
    >
      <CreatorProfileView profile={profile} />
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  const key = creatorKeyFromPath(params?.slug);
  const profile = await loadCreatorProfile(key, { postLimit: 16 });
  if (!profile) return { notFound: true };
  return { props: { profile: JSON.parse(JSON.stringify(profile)) } };
}
