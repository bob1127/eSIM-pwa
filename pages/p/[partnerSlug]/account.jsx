import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getSupabaseAdminServer } from "@/lib/supabaseAdminServer";
import { useSession, signOut } from "next-auth/react";
import PartnerLayout from "@/components/PartnerLayout"; // 🌟 引入統一版型
import {
  QrCodeIcon,
  ArrowRightOnRectangleIcon,
  ClockIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

// 狀態標籤轉換工具
const statusConfig = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "completed")
    return {
      label: "已發貨",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  if (s === "pending")
    return {
      label: "待付款",
      color: "bg-amber-100 text-amber-700 border-amber-200",
    };
  if (s === "cancelled")
    return {
      label: "已取消",
      color: "bg-slate-100 text-slate-600 border-slate-200",
    };
  if (s === "failed")
    return {
      label: "付款失敗",
      color: "bg-red-100 text-red-700 border-red-200",
    };
  return {
    label: status,
    color: "bg-slate-100 text-slate-700 border-slate-200",
  };
};

export default function PartnerCustomerAccount({ store }) {
  const router = useRouter();
  const { data: session, status: navStatus } = useSession();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 驗證身分並撈取訂單
  useEffect(() => {
    if (navStatus === "loading") return;

    const checkUser = async () => {
      const {
        data: { user: supaUser },
      } = await supabase.auth.getUser();
      const currentUser = supaUser || session?.user;

      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser({
        email: currentUser.email,
        name:
          currentUser.user_metadata?.full_name ||
          currentUser.name ||
          currentUser.email.split("@")[0],
      });

      // 撈取該客人的訂單
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_email", currentUser.email)
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);
      setLoading(false);
    };

    checkUser();
  }, [navStatus, session, router]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    await supabase.auth.signOut();
    router.push(`/p/${store.domain}`);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-blue-600 font-bold">
        驗證身分中...
      </div>
    );
  }

  return (
    // 🌟 使用 PartnerLayout 包裹，Navbar 與 Footer 全自動生成！
    <PartnerLayout store={store} title="會員中心">
      <main className="max-w-5xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-8 w-full">
        {/* 左側：Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="text-center mb-6 border-b border-gray-100 pb-6">
              <div className="w-16 h-16 mx-auto bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-black mb-3">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="font-bold text-lg">{user.name}</h2>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            <nav className="flex flex-col gap-2">
              <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold bg-blue-50 text-blue-600">
                <QrCodeIcon className="w-5 h-5" /> 我的行李箱 (訂單)
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" /> 安全登出
              </button>
            </nav>
          </div>
        </aside>

        {/* 右側：訂單列表 */}
        <div className="flex-1 space-y-6">
          <h1 className="text-2xl font-black text-slate-800">
            我的行李箱 (訂單與 QR Code)
          </h1>

          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
              <p className="text-gray-500 mb-4">
                您目前還沒有購買任何 eSIM 方案喔！
              </p>
              <Link
                href={`/p/${store.domain}#shop`}
                className="inline-block px-6 py-2 bg-[#0064e0] text-white rounded-full font-bold hover:bg-[#0054bd] transition"
              >
                前往選購
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const conf = statusConfig(order.status);
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <ClockIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-bold text-gray-600">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border ${conf.color}`}
                        >
                          {conf.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono">
                        訂單編號: {order.id}
                      </p>
                    </div>

                    <div className="flex flex-col items-start md:items-end justify-between">
                      <p className="font-black text-lg text-slate-800">
                        NT$ {order.total_amount}
                      </p>
                      {order.status === "completed" ? (
                        <button className="mt-2 text-sm font-bold text-[#0064e0] hover:underline">
                          查看 QR Code &rarr;
                        </button>
                      ) : order.status === "pending" ? (
                        <button
                          onClick={() =>
                            router.push(`/checkout?orderId=${order.id}`)
                          }
                          className="mt-2 text-sm font-bold text-amber-600 flex items-center gap-1 hover:underline"
                        >
                          <CreditCardIcon className="w-4 h-4" /> 前往付款
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </PartnerLayout>
  );
}

export async function getServerSideProps(context) {
  const { partnerSlug } = context.params;
  const db = getSupabaseAdminServer();
  const { data: store, error } = await db
    .from("stores")
    .select("*")
    .eq("domain", partnerSlug)
    .eq("status", "active")
    .single();
  if (error || !store) return { notFound: true };
  return { props: { store } };
}
