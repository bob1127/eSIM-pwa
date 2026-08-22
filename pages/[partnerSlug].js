import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Head from "next/head";

/**
 * 舊版根路徑夥伴頁（/:slug）。
 * 正式夥伴賣場已改為 /p/[partnerSlug]，此檔僅相容舊連結。
 * 國家分類（/japan 等）不可被此動態路由吃掉 → 轉到 /product/{slug}/。
 */
const RESERVED_PRODUCT_CATEGORY_SLUGS = new Set([
  "japan",
  "jp",
  "korea",
  "kr",
  "china",
  "cn",
  "thailand",
  "th",
  "vietnam",
  "vn",
  "malaysia",
  "my",
  "hong-kong",
  "hk",
  "taiwan",
  "tw",
  "singapore",
  "sg",
  "usa",
  "us",
  "canada",
  "ca",
  "australia",
  "au",
  "anz",
  "au-nz",
  "australia-new-zealand",
  "new-zealand",
  "newzealand",
  "nz",
  "france",
  "fr",
  "turkey",
  "tr",
  "turkiye",
  "europe",
  "asia",
  "global",
]);

/** 非夥伴店的一字路徑：避免被誤導向 /p/{slug} */
const RESERVED_APP_ROUTE_REDIRECTS = {
  boss: "/admin-boss/",
  "admin-boss": "/admin-boss/",
  partner: "/partner/dashboard/",
  admin: "/admin-boss/",
};

export default function PartnerLandingPage({ partner, products }) {
  const [buying, setBuying] = useState(false);

  const handleBuy = async (product) => {
    setBuying(true);

    const { error } = await supabase.from("orders").insert([
      {
        customer_email: "guest@example.com",
        total_price: product.price,
        status: "pending",
        referrer_slug: partner.slug,
        plan_name: product.name,
      },
    ]);

    if (error) {
      alert("下單失敗：" + error.message);
    } else {
      alert(`🎉 成功！您已透過 ${partner.name} 的專屬連結下單！`);
    }
    setBuying(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Head>
        <title>{partner.name} 推薦專區 | JEKO eSIM</title>
      </Head>

      <nav className="bg-white border-b px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {partner.name[0]}
          </div>
          <div>
            <h1 className="font-bold text-slate-900">{partner.name}</h1>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
              Jeko 官方認證夥伴
            </p>
          </div>
        </div>
        <div className="text-xl font-black text-slate-900 tracking-tighter">
          JEKO <span className="text-blue-600">eSIM</span>
        </div>
      </nav>

      <header className="py-16 px-8 bg-gradient-to-br from-slate-900 to-blue-900 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-black mb-4 leading-tight">
            跟著 {partner.name} 一起環遊世界 🌍
          </h2>
          <p className="text-blue-100/80 text-lg">
            {partner.description ||
              "在此專屬頁面下單，確保您獲得最優質的連線服務！"}
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.length === 0 ? (
            <p className="text-center col-span-3 text-gray-400">
              目前沒有上架的產品
            </p>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-all"
              >
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {product.name}
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  {product.description}
                </p>
                <div className="flex items-end justify-between border-t pt-6">
                  <div>
                    <span className="text-slate-400 text-xs block mb-1">
                      夥伴特惠價
                    </span>
                    <span className="text-3xl font-black text-slate-900">
                      NT$ {product.price}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuy(product)}
                    disabled={buying}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-900 transition"
                  >
                    {buying ? "處理中..." : "立即購買"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  const partnerSlug = String(context.params?.partnerSlug || "")
    .trim()
    .toLowerCase();

  if (!partnerSlug) {
    return { notFound: true };
  }

  // /japan、/korea… 應進商品分類，不是舊夥伴頁（避免卡住轉圈）
  if (RESERVED_PRODUCT_CATEGORY_SLUGS.has(partnerSlug)) {
    return {
      redirect: {
        destination: `/product/${partnerSlug}/`,
        permanent: false,
      },
    };
  }

  const appRedirect = RESERVED_APP_ROUTE_REDIRECTS[partnerSlug];
  if (appRedirect) {
    return {
      redirect: {
        destination: appRedirect,
        permanent: false,
      },
    };
  }

  // 正式夥伴賣場在 /p/:slug
  return {
    redirect: {
      destination: `/p/${encodeURIComponent(partnerSlug)}/`,
      permanent: false,
    },
  };
}
