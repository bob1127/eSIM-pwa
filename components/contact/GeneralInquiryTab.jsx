"use client";

import { useState } from "react";
import Link from "next/link";
import ContactFormRow, { inputClass, selectClass, textareaClass } from "./ContactFormRow";
import { GENERAL_CATEGORIES } from "@/lib/contactUi";
import MaterialIcon from "@/components/MaterialIcon";

export default function GeneralInquiryTab() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    category: "",
    message: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("請填寫姓名");
    if (!form.email.trim()) return setError("請填寫 Email");
    if (!form.category) return setError("請選擇諮詢類別");
    if (form.message.trim().length < 5) return setError("請填寫諮詢內容（至少 5 字）");
    if (!agreed) return setError("請同意個人資料處理方式");

    const catLabel =
      GENERAL_CATEGORIES.find((c) => c.value === form.category)?.label || form.category;

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "general",
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
          subject: catLabel,
          message: form.message.trim(),
          metadata: { category: form.category },
          agreed_privacy: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失敗");
      setDone(true);
    } catch (err) {
      setError(err.message || "提交失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white">
        <MaterialIcon name="check_circle" size={48} className="text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">已收到您的諮詢</h2>
        <p className="text-sm text-slate-500 mb-6">我們將於 1～3 個工作天內以 Email 回覆。</p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setForm({ name: "", email: "", phone: "", company: "", category: "", message: "" });
            setAgreed(false);
          }}
          className="text-sm font-bold text-[#2563eb] hover:underline"
        >
          再送一則諮詢
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="border border-slate-200 border-t-0 overflow-hidden">
        <ContactFormRow label="姓名" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="例）王小明"
            className={inputClass}
          />
        </ContactFormRow>

        <ContactFormRow label="Email 地址" required hint="回覆將寄至此信箱">
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="example@mail.com"
            className={inputClass}
          />
        </ContactFormRow>

        <ContactFormRow label="聯絡電話" optional>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="例）0912345678"
            className={inputClass}
          />
        </ContactFormRow>

        <ContactFormRow label="公司／組織名稱" optional>
          <input
            type="text"
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="個人可留空"
            className={inputClass}
          />
        </ContactFormRow>

        <ContactFormRow label="諮詢類別" required>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className={selectClass}
          >
            <option value="">請選擇</option>
            {GENERAL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </ContactFormRow>

        <ContactFormRow label="諮詢內容" required>
          <textarea
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            rows={6}
            placeholder="請詳述您的問題或需求，以便我們更快協助您。"
            className={textareaClass}
          />
        </ContactFormRow>
      </div>

      <div className="px-4 sm:px-6 py-5 bg-white border-t border-slate-200 space-y-4">
        <label className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            我已閱讀並同意{" "}
            <Link href="/privacy" target="_blank" className="text-[#2563eb] font-bold hover:underline">
              隱私權政策
            </Link>
            之個人資料蒐集與使用方式。
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto min-w-[240px] flex items-center justify-center gap-2 px-8 py-3.5 bg-[#2b579a] hover:bg-[#1e4578] text-white text-sm font-bold rounded-sm disabled:opacity-50 transition"
        >
          {submitting ? "送出中…" : "同意並送出諮詢"}
          <MaterialIcon name="arrow_forward" size={18} />
        </button>
      </div>
    </form>
  );
}
