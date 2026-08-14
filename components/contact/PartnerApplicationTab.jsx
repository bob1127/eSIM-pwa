"use client";

import { useState } from "react";
import Link from "next/link";
import ContactFormRow, {
  inputClass,
  selectClass,
  textareaClass,
} from "./ContactFormRow";
import { PARTNER_TYPES_SHORT } from "@/lib/contactUi";
import MaterialIcon from "@/components/MaterialIcon";

const BENEFITS = [
  { icon: "storefront", title: "專屬賣場", desc: "取得個人化 eSIM 賣場連結" },
  { icon: "payments", title: "分潤機制", desc: "每筆成交自動計算分潤" },
  { icon: "inventory_2", title: "完整品項", desc: "日韓泰等多國 eSIM 方案" },
  { icon: "campaign", title: "行銷素材", desc: "提供高畫質產品圖與文案" },
  { icon: "support_agent", title: "專人審核", desc: "1～3 工作天完成審核" },
];

export default function PartnerApplicationTab() {
  const [form, setForm] = useState({
    partnerType: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    lineId: "",
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

    if (!form.partnerType) return setError("請選擇合作身份");
    if (!form.name.trim()) return setError("請填寫聯絡人姓名");
    if (!form.email.trim()) return setError("請填寫 Email");
    if (!form.phone.trim()) return setError("請填寫聯絡電話");
    if (!form.company.trim()) return setError("請填寫公司／頻道名稱");
    if (form.message.trim().length < 10)
      return setError("請簡述您的推廣資源（至少 10 字）");
    if (!agreed) return setError("請同意合作條款與隱私權政策");

    const typeLabel =
      PARTNER_TYPES_SHORT.find((t) => t.value === form.partnerType)?.label ||
      form.partnerType;

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "partner",
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          company: form.company.trim(),
          partner_type: form.partnerType,
          subject: `合作夥伴洽詢 — ${typeLabel}`,
          message: form.message.trim(),
          metadata: {
            partner_type: form.partnerType,
            partner_type_label: typeLabel,
            line_id: form.lineId.trim() || null,
          },
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
        <MaterialIcon
          name="verified"
          size={48}
          className="text-[#2b579a] mx-auto mb-4"
        />
        <h2 className="text-xl font-black text-[#1e3a5f] mb-2">洽詢已送出</h2>
        <p className="text-sm text-slate-500 mb-2 max-w-md mx-auto">
          我們已收到您的合作意向，專人將與您聯繫。若希望立即建立賣場，也可直接完成線上申請。
        </p>
        <Link
          href="/register-distributor"
          className="inline-flex items-center gap-1 mt-4 px-6 py-3 bg-[#2563eb] text-white text-sm font-bold rounded-sm hover:bg-[#1d4ed8]"
        >
          前往完整申請流程
          <MaterialIcon name="arrow_forward" size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* 雙欄介紹 — 參考幻冬舎登入頁 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-b border-slate-200">
        <div className="p-6 sm:p-8 bg-white border-b lg:border-b-0 lg:border-r border-slate-200">
          <h2 className="text-lg font-black text-[#1e3a5f] mb-2">
            Jeko eSIM 合作夥伴計畫
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            加入 Jeko eSIM
            合作夥伴，取得專屬賣場連結，推廣日本、韓國、泰國等多國 eSIM
            方案，每筆成交享有分潤。
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 mb-6">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="text-center p-3 border border-slate-100 rounded-sm bg-slate-50/50"
              >
                <MaterialIcon
                  name={b.icon}
                  size={24}
                  className="text-[#2b579a] mx-auto mb-1.5"
                />
                <p className="text-xs font-bold text-[#1e3a5f]">{b.title}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/register-distributor"
            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-[#2b579a] text-[#2b579a] text-sm font-bold rounded-sm hover:bg-[#2b579a]/5 transition"
          >
            <MaterialIcon name="rocket_launch" size={18} />
            立即開始完整線上申請
          </Link>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            含 Email 驗證、賣場代碼設定，審核通過即可登入夥伴後台
          </p>
        </div>

        <div className="p-6 sm:p-8 bg-white">
          <h3 className="text-sm font-black text-[#1e3a5f] mb-1">
            還不確定？先留下洽詢
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            填寫右側表單，我們的 BD 團隊將主動與您聯繫，說明分潤方案與合作細節。
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            {[
              "KOL、團媽、旅行社、包車業者均歡迎",
              "無需先建立帳號，快速留下聯絡方式",
              "審核通過後可隨時補完正式申請",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <MaterialIcon
                  name="check_circle"
                  size={16}
                  className="text-[#2563eb] shrink-0 mt-0.5"
                />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="border-b border-slate-200 overflow-hidden">
          <ContactFormRow label="合作身份" required>
            <select
              value={form.partnerType}
              onChange={(e) => set("partnerType", e.target.value)}
              className={selectClass}
            >
              <option value="">請選擇最符合的類別</option>
              {PARTNER_TYPES_SHORT.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </ContactFormRow>

          <ContactFormRow label="公司／頻道名稱" required>
            <input
              type="text"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              placeholder="例）旅遊頻道名稱、公司名稱"
              className={inputClass}
            />
          </ContactFormRow>

          <ContactFormRow label="聯絡人姓名" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="例）王小明"
              className={inputClass}
            />
          </ContactFormRow>

          <ContactFormRow label="Email" required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="審核結果將寄至此信箱"
              className={inputClass}
            />
          </ContactFormRow>

          <ContactFormRow label="聯絡電話" required>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="例）0912345678"
              className={inputClass}
            />
          </ContactFormRow>

          <ContactFormRow label="LINE ID" optional>
            <input
              type="text"
              value={form.lineId}
              onChange={(e) => set("lineId", e.target.value)}
              placeholder="方便我們與您聯繫"
              className={inputClass}
            />
          </ContactFormRow>

          <ContactFormRow
            label="推廣資源說明"
            required
            hint="粉絲數、月流量、開團頻率等，幫助我們評估合作潛力"
          >
            <textarea
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              rows={5}
              placeholder="例）IG 粉絲 2 萬，主要分享日本旅遊，每月約開團 3 次…"
              className={textareaClass}
            />
          </ContactFormRow>
        </div>

        <div className="px-4 sm:px-6 py-5 bg-white space-y-4">
          <label className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              我已閱讀並同意{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-[#2563eb] font-bold hover:underline"
              >
                服務條款
              </Link>
              、
              <Link
                href="/privacy"
                target="_blank"
                className="text-[#2563eb] font-bold hover:underline"
              >
                隱私權政策
              </Link>
              及合作夥伴相關約定（含自訂文章與上傳內容免責：非法用途或無版權資產由夥伴自行負責）。
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#2b579a] hover:bg-[#1e4578] text-white text-sm font-bold rounded-sm disabled:opacity-50"
            >
              {submitting ? "送出中…" : "送出合作洽詢"}
            </button>
            <Link
              href="/register-distributor"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 border border-[#2563eb] text-[#2563eb] text-sm font-bold rounded-sm hover:bg-blue-50"
            >
              完整線上申請
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
