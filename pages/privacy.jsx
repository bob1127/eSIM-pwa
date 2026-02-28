"use client";

import Layout from "./Layout";
import { motion } from "framer-motion";

const PrivacyPolicy = () => {
  const lastUpdated = "2026 年 2 月 28 日";

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 py-24 sm:py-32 px-4">
        <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="prose prose-slate max-w-none"
          >
            <h1 className="text-3xl font-black text-slate-800 mb-2">
              隱私權政策
            </h1>
            <p className="text-sm text-slate-400 mb-8">
              最後更新日期：{lastUpdated}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-[#1C82E0] pl-4">
                1. 資訊收集
              </h2>
              <p className="text-slate-600 leading-relaxed">
                當您使用我們的服務、註冊帳號或進行購買時，我們可能會收集以下資訊：
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mt-2">
                <li>基本資料：姓名、電子郵件地址。</li>
                <li>
                  社群登入資訊：當您使用 Google、Facebook 或 LINE
                  登入時，我們會取得您授權提供的公開資訊。
                </li>
                <li>交易紀錄：購買的 eSIM 方案、付款狀態與訂單編號。</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-[#1C82E0] pl-4">
                2. 資訊使用方式
              </h2>
              <p className="text-slate-600 leading-relaxed">
                收集到的資訊將用於以下用途：
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mt-2">
                <li>發送您購買的 eSIM QR Code 郵件。</li>
                <li>維護您的會員帳戶權益與歷史訂單查詢。</li>
                <li>提供客戶支援與售後服務。</li>
                <li>確保交易安全與防止詐欺。</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-[#1C82E0] pl-4">
                3. 資料安全性與第三方服務
              </h2>
              <p className="text-slate-600 leading-relaxed">
                我們致力於保護您的個人資料，並使用業界標準的技術（如 Supabase
                安全驗證）來保護您的帳密與資訊。
              </p>
              <p className="text-slate-600 leading-relaxed mt-2">
                我們不會將您的個人資料出售或出租給第三方。但在必要情況下，我們會與以下服務商合作以完成交易：
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mt-2">
                <li>
                  <strong>Supabase</strong>：負責帳號驗證與資料庫儲存。
                </li>
                <li>
                  <strong>藍新金流</strong>：負責處理付款程序。
                </li>
                <li>
                  <strong>MicroEsim</strong>：負責發送與啟用您的數位網卡。
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-[#1C82E0] pl-4">
                4. 您的權利
              </h2>
              <p className="text-slate-600 leading-relaxed">
                您隨時可以登入會員中心修改您的個人資訊。若您希望刪除帳號及相關所有個人資料，請透過官方
                LINE 或電子郵件與我們聯繫。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-l-4 border-[#1C82E0] pl-4">
                5. 聯絡我們
              </h2>
              <p className="text-slate-600 leading-relaxed">
                如果您對本隱私權政策有任何疑問，請聯繫：
              </p>
              <div className="bg-slate-50 p-4 rounded-xl mt-4 text-sm text-slate-600">
                <p>極客網頁設計 - Jeko eSIM 團隊</p>
                <p>官方 LINE: @jeko_esim (範例)</p>
                <p>Email: support@jeko.esim (範例)</p>
              </div>
            </section>

            <div className="mt-12 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
              © 2026 極客網頁設計. All rights reserved.
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;
