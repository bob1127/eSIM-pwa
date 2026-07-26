import { useEffect } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";
import SeoHead from "@/components/SeoHead";
import { SITE_NAME, SITE_URL } from "@/lib/seo.config";
import {
  normalizeReferralCode,
  resolveReferralOgImage,
  isSocialCrawlerUserAgent,
} from "@/lib/partnerReferral";

/**
 * 專屬推薦「分享網址」：/r/{code}
 * - 社群爬蟲：回傳獨立 OG 行銷圖（貼文預覽）
 * - 真人訪客：導向 /?ref=code 寫入 Cookie
 */
export async function getServerSideProps(ctx) {
  const code = normalizeReferralCode(ctx.params?.code || "");
  if (!code) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const ua = ctx.req?.headers?.["user-agent"] || "";

  if (!isSocialCrawlerUserAgent(ua)) {
    return {
      redirect: {
        destination: `/?ref=${encodeURIComponent(code)}`,
        permanent: false,
      },
    };
  }

  let partner = null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await admin
      .from("partners")
      .select("id, name, referral_code, status, cooperation_model")
      .eq("referral_code", code)
      .eq("status", "active")
      .eq("cooperation_model", "referral")
      .maybeSingle();
    partner = data || null;

    // 可選欄位：夥伴專屬 OG（migration 有 referral_og_image 才讀）
    if (partner?.id) {
      const { data: withOg } = await admin
        .from("partners")
        .select("referral_og_image")
        .eq("id", partner.id)
        .maybeSingle();
      if (withOg?.referral_og_image) {
        partner = { ...partner, referral_og_image: withOg.referral_og_image };
      }
    }
  }

  const ogImage = resolveReferralOgImage(partner, SITE_URL);
  const partnerName = partner?.name ? String(partner.name) : "";

  return {
    props: {
      code,
      partnerName,
      ogImage,
      sharePath: `/r/${code}`,
    },
  };
}

export default function ReferralSharePage({
  code,
  partnerName,
  ogImage,
  sharePath,
}) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/?ref=${encodeURIComponent(code)}`);
  }, [code, router]);

  const title = partnerName
    ? `${partnerName} 推薦｜${SITE_NAME} 旅遊 eSIM`
    : `${SITE_NAME}｜旅遊 eSIM 專屬推薦`;
  const description = partnerName
    ? `${partnerName} 推薦 Jeko eSIM：出國上網免換卡，官網同價購買，立即開通。`
    : `出國上網免換卡，Jeko eSIM 官網同價。點擊立即選購日本／韓國／全球方案。`;

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        canonical={`${SITE_URL}${sharePath}`}
        ogImage={ogImage}
        ogImageAlt={`${SITE_NAME} 專屬推薦`}
        noindex
      />
      <div className="min-h-[40vh] flex items-center justify-center p-8 text-center text-slate-600 text-sm">
        正在前往 {SITE_NAME}…
      </div>
    </>
  );
}
