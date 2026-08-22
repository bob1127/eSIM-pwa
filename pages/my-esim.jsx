"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

export default function MyEsimPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 測試 Email
  const testEmail = "bob112722761236tom@gmail.com";

  useEffect(() => {
    async function fetchMyOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_email", testEmail)
        .order("created_at", { ascending: false }); // 讓新訂單排在上面

      if (!error) setOrders(data);
      setLoading(false);
    }
    fetchMyOrders();
  }, []);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <LoadingIndicator
          layout="center"
          label="系統載入中..."
          labelClassName="text-gray-500"
        />
      </div>
    );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* --- 左側側邊欄 (Sidebar) --- */}
      <div className="w-64 bg-slate-900 text-white hidden md:block">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-widest text-blue-400">
            JEKO eSIM
          </h1>
          <p className="text-xs text-slate-400 mt-1">極客數位企業社</p>
        </div>
        <nav className="mt-6">
          <a
            href="#"
            className="flex items-center px-6 py-4 bg-blue-600 text-white border-r-4 border-blue-400"
          >
            <span className="mr-3">📦</span> 我的 eSIM 訂單
          </a>
          <a
            href="#"
            className="flex items-center px-6 py-4 text-slate-400 hover:bg-slate-800 transition"
          >
            <span className="mr-3">👤</span> 個人帳號設定
          </a>
          <a
            href="#"
            className="flex items-center px-6 py-4 text-slate-400 hover:bg-slate-800 transition"
          >
            <span className="mr-3">❓</span> 使用教學 / 客服
          </a>
        </nav>
      </div>

      {/* --- 右側主要內容區 --- */}
      <div className="flex-1">
        {/* 頂部 Header */}
        <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">會員中心</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">{testEmail}</span>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
              J
            </div>
          </div>
        </header>

        {/* 內容區域 */}
        <main className="p-8">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900">
              我的 eSIM 行李箱
            </h3>
            <p className="text-gray-500">查看您購買的所有上網方案與安裝代碼</p>
          </div>

          {/* 數據表格 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    方案內容
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    訂單日期
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    金額
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    付款狀態
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-blue-50/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {order.customer_name}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        ID: #{order.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      TWD ${order.total_price}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          order.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {order.status === "completed" ? "● 已完成" : "● 處理中"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.status === "completed" ? (
                        <button className="bg-slate-900 text-white text-xs px-4 py-2 rounded shadow-sm hover:bg-blue-600 transition">
                          獲取 QR Code
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">等待確認</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {orders.length === 0 && (
              <div className="p-20 text-center text-gray-400">
                目前沒有訂單紀錄
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
