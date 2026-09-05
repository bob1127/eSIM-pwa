"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  REFUND_REASONS_FULL,
  REFUND_REASONS_DISPUTE,
  ACTIVATION_CLAIMS,
  MAX_REFUND_IMAGES,
  getRefundEligibility,
  orderItemSummary,
} from "@/lib/refundPolicy";
import ContactFormRow, { inputClass, selectClass, textareaClass } from "./ContactFormRow";
import MaterialIcon from "@/components/MaterialIcon";

export default function RefundInlineForm({ order, getAuthHeaders, onSuccess }) {
  const eligibility = getRefundEligibility(order);
  const isDispute = eligibility.requestType === "dispute";

  const [reasonType, setReasonType] = useState("");
  const [reasonNote, setReasonNote] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [activationClaim, setActivationClaim] = useState("not_activated");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const reasons = isDispute ? REFUND_REASONS_DISPUTE : REFUND_REASONS_FULL;

  if (!eligibility.canApply) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-sm text-sm text-amber-900">
        <p className="font-bold mb-1">此訂單目前無法線上申請</p>
        <p className="text-xs text-amber-800">{eligibility.hint || "請改用下方表單聯繫客服，或至會員中心查看詳情。"}</p>
      </div>
    );
  }

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    const combined = [...imageFiles, ...picked].slice(0, MAX_REFUND_IMAGES);
    setImageFiles(combined);
    setImagePreviews(combined.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  };

  const removeImage = (idx) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadImages = async () => {
    if (!imageFiles.length) return [];
    const formData = new FormData();
    imageFiles.forEach((f) => formData.append("files", f));
    const headers = await getAuthHeaders();
    delete headers["Content-Type"];
    const res = await fetch("/api/refund/upload", { method: "POST", headers, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "上傳失敗");
    return (data.files || []).map((f) => f.url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!reasonType) return setError("請選擇原因");
    if (!agreedTerms) return setError("請勾選同意退換貨政策");
    if (isDispute) {
      if (!deviceModel.trim()) return setError("請填寫手機型號");
      if (reasonNote.trim().length < 10) return setError("請詳述問題（至少 10 字）");
      if (imageFiles.length < 1) return setError("請上傳至少 1 張截圖");
    } else if (activationClaim !== "not_activated") {
      return setError("未開通退款須確認尚未掃描 QR Code");
    }

    setSubmitting(true);
    try {
      let imageUrls = [];
      if (isDispute) imageUrls = await uploadImages();

      const headers = {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      };

      const res = await fetch("/api/refund/request", {
        method: "POST",
        headers,
        body: JSON.stringify({
          order_id: order.id,
          request_type: eligibility.requestType,
          reason_type: reasonType,
          reason_note: reasonNote.trim() || null,
          device_model: isDispute ? deviceModel.trim() : null,
          activation_claim: isDispute ? activationClaim : "not_activated",
          image_urls: imageUrls,
          agreed_terms: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失敗");
      onSuccess?.(data.request);
    } catch (err) {
      setError(err.message || "提交失敗");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-slate-200 rounded-sm overflow-hidden bg-white">
      <div className="px-4 py-3 bg-[#2b579a]/5 border-b border-slate-100 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[#2b579a]">
            {isDispute ? "售後／爭議申請" : "未開通退款申請"}
          </p>
          <p className="text-sm font-bold text-[#1e3a5f]">
            訂單 #{order.id} · {orderItemSummary(order)}
          </p>
        </div>
        <Link href="/refund-policy" target="_blank" className="text-[11px] font-bold text-[#2563eb] hover:underline shrink-0">
          退換貨政策
        </Link>
      </div>

      <div className="divide-y divide-slate-200">
        {!isDispute && (
          <ContactFormRow label="開通狀態" required>
            <label className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={activationClaim === "not_activated"}
                onChange={(e) => setActivationClaim(e.target.checked ? "not_activated" : "")}
                className="mt-0.5"
              />
              <span>我尚未掃描 QR Code／未安裝 eSIM</span>
            </label>
          </ContactFormRow>
        )}

        {isDispute && (
          <>
            <ContactFormRow label="開通狀態" required>
              <select value={activationClaim} onChange={(e) => setActivationClaim(e.target.value)} className={selectClass}>
                {ACTIVATION_CLAIMS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </ContactFormRow>
            <ContactFormRow label="手機型號" required>
              <input
                type="text"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                placeholder="例：iPhone 15 Pro"
                className={inputClass}
              />
            </ContactFormRow>
          </>
        )}

        <ContactFormRow label={isDispute ? "問題類型" : "退款原因"} required>
          <select value={reasonType} onChange={(e) => setReasonType(e.target.value)} className={selectClass}>
            <option value="">請選擇</option>
            {reasons.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </ContactFormRow>

        <ContactFormRow label={isDispute ? "問題說明" : "補充說明"} required={isDispute} optional={!isDispute}>
          <textarea
            value={reasonNote}
            onChange={(e) => setReasonNote(e.target.value)}
            rows={4}
            placeholder={isDispute ? "請描述設定步驟、錯誤訊息等（至少 10 字）" : "如有其他說明可填寫"}
            className={textareaClass}
          />
        </ContactFormRow>

        {isDispute && (
          <ContactFormRow label="舉證截圖" required hint={`1～${MAX_REFUND_IMAGES} 張，JPG/PNG，各 5MB 內`}>
            <div className="flex flex-wrap gap-2">
              {imagePreviews.map((src, i) => (
                <div key={src} className="relative w-20 h-20 rounded-sm overflow-hidden border border-slate-200">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1.5">×</button>
                </div>
              ))}
              {imageFiles.length < MAX_REFUND_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-sm text-slate-400 text-[24px] hover:border-[#2563eb]"
                >
                  +
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFiles} />
          </ContactFormRow>
        )}
      </div>

      <div className="px-4 py-4 space-y-3 border-t border-slate-100">
        <label className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} className="mt-0.5" />
          <span>
            我已閱讀並同意{" "}
            <Link href="/refund-policy" target="_blank" className="text-[#2563eb] font-bold hover:underline">退換貨政策</Link>
          </span>
        </label>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-sm px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[#2b579a] hover:bg-[#1e4578] text-white text-sm font-bold rounded-sm disabled:opacity-50"
        >
          {submitting ? "提交中…" : "提交退換款申請"}
        </button>
      </div>
    </form>
  );
}
