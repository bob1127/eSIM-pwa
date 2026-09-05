"use client";

import { useState } from "react";
import Link from "next/link";
import AccountIcon from "@/components/account/AccountIcon";
import { setBossSession } from "@/lib/bossAdminClient";
import { ACCENT } from "./AccountShell";

/** 系統總控內嵌 — Medusa 總部登入 */
export default function BossInlineLogin({ onLoginSuccess }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/medusa-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "登入失敗");
      }
      setBossSession(data.token, data.user?.email || form.email);
      onLoginSuccess?.(data.user);
    } catch (err) {
      setError(err.message || "登入失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div
        className="rounded-sm text-white p-6 mb-4"
        style={{ backgroundColor: ACCENT.sidebar }}
      >
        <div className="flex items-center gap-3 mb-3">
          <AccountIcon name="admin_panel_settings" size={28} className="text-blue-200" />
          <div>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">
              Medusa 總部驗證
            </p>
            <h3 className="text-lg font-bold">夥伴審核需先登入</h3>
          </div>
        </div>
        <p className="text-sm text-blue-100 leading-relaxed">
          請使用與 Medusa 後台<strong className="text-white">相同的一組帳密</strong>
          ，才能審核合作夥伴、處理退款。
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
              帳號（Medusa 管理員 Email）
            </label>
            <input
              required
              type="text"
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="與 Medusa 後台登入相同"
              className="w-full border border-slate-200 rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071EB]/30"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
              密碼
            </label>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071EB]/30"
            />
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-sm px-3 py-2 leading-relaxed">
            Medusa 登入畫面可能只寫「帳號」，API 實際使用的是管理員的{" "}
            <strong>email 欄位</strong>。可在 Medusa Admin → Settings → Users 查看。
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-white text-sm font-bold rounded-sm disabled:opacity-60"
            style={{ backgroundColor: ACCENT.primary }}
          >
            {loading ? "驗證中…" : "登入總部後台"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400 text-center">
          亦可使用{" "}
          <Link href="/admin-boss" className="text-[#0071EB] font-bold hover:underline">
            獨立 /admin-boss 頁面
          </Link>
          {" · "}
          <Link href="/partner/login" className="text-[#0071EB] hover:underline">
            夥伴後台
          </Link>
        </p>
      </div>
    </div>
  );
}
