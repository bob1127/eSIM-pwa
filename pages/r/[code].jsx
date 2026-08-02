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
 * - 真人訪客：導向 /?ref=code[&coupon=CODE]（啟用折扣時帶碼）
 */
async function loadReferralPartner(code) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("partners")
    .select(
      "id, name, referral_code, status, cooperation_model, referral_discount_enabled, referral_discount_percent, referral_og_image",
    )
    .eq("referral_code", code)
    .eq("status", "active")
    .eq("cooperation_model", "referral")
    .maybeSingle();

  if (!error) return data || null;

  // 遷移未跑時降級查詢
  const fallback = await admin
    .from("partners")
    .select("id, name, referral_code, status, cooperation_model")
    .eq("referral_code", code)
    .eq("status", "active")
    .eq("cooperation_model", "referral")
    .maybeSingle();
  let row = fallback.data || null;
  if (row?.id) {
    const { data: withOg } = await admin
      .from("partners")
      .select("referral_og_image")
      .eq("id", row.id)
      .maybeSingle();
    if (withOg?.referral_og_image) {
      row = { ...row, referral_og_image: withOg.referral_og_image };
    }
  }
  return row;
}

function landingDestination(code, partner) {
  const q = new URLSearchParams({ ref: code });
  if (partner?.referral_discount_enabled !== false) {
    // 預設開啟；欄位缺失時也帶 coupon（遷移後會生效）
    q.set("coupon", code.toUpperCase());
  }
  return `/?${q.toString()}`;
}

export async function getServerSideProps(ctx) {
  const code = normalizeReferralCode(ctx.params?.code || "");
  if (!code) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const ua = ctx.req?.headers?.["user-agent"] || "";
  const partner = await loadReferralPartner(code);

  if (!isSocialCrawlerUserAgent(ua)) {
    return {
      redirect: {
        destination: landingDestination(code, partner),
        permanent: false,
      },
    };
  }

  const ogImage = resolveReferralOgImage(partner, SITE_URL);
  const partnerName = partner?.name ? String(partner.name) : "";

  return {
    props: {
      code,
      partnerName,
      ogImage,
      sharePath: `/r/${code}`,
      withCoupon: partner?.referral_discount_enabled !== false,
    },
  };
}

export default function ReferralSharePage({
  code,
  partnerName,
  ogImage,
  sharePath,
  withCoupon = true,
}) {
  const router = useRouter();

  useEffect(() => {
    const q = new URLSearchParams({ ref: code });
    if (withCoupon) q.set("coupon", code.toUpperCase());
    router.replace(`/?${q.toString()}`);
  }, [code, withCoupon, router]);

  const title = partnerName
    ? `${partnerName} 推薦｜${SITE_NAME} 旅遊 eSIM`
    : `${SITE_NAME}｜旅遊 eSIM 專屬推薦`;
  const description = partnerName
    ? withCoupon
      ? `${partnerName} 專屬優惠：輸入折扣碼即可折抵，出國上網免換卡。`
      : `${partnerName} 推薦 Jeko eSIM：出國上網免換卡，官網同價購買，立即開通。`
    : `出國上網免換卡，Jeko eSIM。點擊立即選購日本／韓國／全球方案。`;

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
