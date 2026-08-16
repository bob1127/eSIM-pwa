import Layout from "../Layout";
import CreatorFollowFeed from "@/components/creators/CreatorFollowFeed";
import { loadCreatorProfile } from "@/lib/creatorProfile";

function asFollow(profile) {
  if (!profile) return null;
  return {
    creator_key: profile.key,
    creator_name: profile.name,
    created_at: null,
    profile,
  };
}

export default function CreatorsExplorePage({ follows }) {
  return (
    <Layout
      flushTop
      seo={{
        title: "創作者｜Jeko eSIM",
        description: "追蹤旅遊與 eSIM 創作者，依分類瀏覽最新文章。",
      }}
    >
      <div className="bg-[#ececef] min-h-screen pb-16">
        <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-5 lg:px-8 py-5 lg:py-8">
          <div className="bg-white rounded-3xl px-4 py-5 sm:px-8 sm:py-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
            <CreatorFollowFeed
              follows={follows}
              heading="創作者"
              emptyHint={
                <p className="text-sm text-slate-500">目前沒有可顯示的創作者。</p>
              }
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  const profile = await loadCreatorProfile("jeko", { postLimit: 16 });
  const follows = [asFollow(profile)].filter(Boolean);
  return { props: { follows: JSON.parse(JSON.stringify(follows)) } };
}
