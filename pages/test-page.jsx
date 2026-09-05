"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchProducts() {
      // 從 Supabase 抓取所有 eSIM 方案
      const { data, error } = await supabase.from("products").select("*");
      if (!error) setProducts(data);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  const handleBuy = (product) => {
    // 這裡可以導向詳細購買頁，或直接觸發購買邏輯
    alert(`您選購了：${product.name}，正在前往結案流程...`);
    // 之後這裡會串接金流
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* --- 1. 導覽列 Navbar --- */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto border-b border-gray-50">
        <div className="text-[24px] font-bold tracking-tighter text-blue-600">
          JEKO eSIM
        </div>
        <div className="hidden md:flex space-x-8 font-medium text-gray-600">
          <a href="#" className="hover:text-blue-600 transition">
            全球方案
          </a>
          <a href="#" className="hover:text-blue-600 transition">
            使用教學
          </a>
          <a
            href="/my-esim"
            className="hover:text-blue-600 transition font-bold text-slate-900 underline underline-offset-4"
          >
            我的行李箱 🧳
          </a>
        </div>
        <button className="bg-slate-900 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-600 transition">
          合作夥伴登入
        </button>
      </nav>

      {/* --- 2. 主視覺 Hero Section --- */}
      <section className="px-8 py-20 bg-gradient-to-b from-blue-50 to-white text-center">
        <div className="max-w-4xl mx-auto">
          <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest">
            Global Connection
          </span>
          <h1 className="text-[28px] font-bold mt-6 mb-8 leading-tight">
            環遊世界，
            <br />
            <span className="text-blue-600">網路不間斷</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
            Jeko eSIM 提供超過 150 個國家的 5G
            高速方案。免換卡、免排隊、即買即用，讓您的旅程更輕鬆。
          </p>
          <div className="flex justify-center space-x-4">
            <button className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:scale-105 transition">
              立即挑選方案
            </button>
          </div>
        </div>
      </section>

      {/* --- 3. 產品列表 Section --- */}
      <section className="px-8 py-20 max-w-7xl mx-auto" id="shop">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-[28px] font-bold">熱門目的地</h2>
            <p className="text-gray-400 mt-2">根據台灣旅人最愛的出國選擇</p>
          </div>
          <button className="text-blue-600 font-bold hover:underline">
            查看全部 150+ 國家
          </button>
        </div>

        {loading ? (
          <LoadingIndicator
            layout="center"
            label="正在連線至全球網路..."
            className="py-20"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="group bg-white rounded-3xl border border-gray-100 p-4 shadow-sm hover:shadow-2xl transition-all duration-300"
              >
                <div className="h-40 bg-gray-100 rounded-2xl mb-4 overflow-hidden">
                  <img
                    src={
                      product.image_url ||
                      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800"
                    }
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                  />
                </div>
                <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                <p className="text-gray-400 text-xs mb-4">
                  {product.description}
                </p>
                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <span className="text-xl font-bold text-slate-900">
                    NT$ {product.price}
                  </span>
                  <button
                    onClick={() => handleBuy(product)}
                    className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- 4. 頁尾 Footer --- */}
      <footer className="bg-slate-950 text-white py-20 px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-[24px] font-bold mb-6">JEKO eSIM</h3>
            <p className="text-slate-400 max-w-xs">
              極客數位企業社旗下品牌。我們致力於提供全球旅人最穩定、最快速的數位
              SIM 卡體驗。
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6">服務項目</h4>
            <ul className="text-slate-400 space-y-4 text-sm">
              <li>亞洲漫遊方案</li>
              <li>歐美漫遊方案</li>
              <li>合作夥伴計畫</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">聯繫我們</h4>
            <p className="text-slate-400 text-sm">
              地址：台中市烏日區溪南路一段348巷33號
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Email: support@jeko-esim.com.tw
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
