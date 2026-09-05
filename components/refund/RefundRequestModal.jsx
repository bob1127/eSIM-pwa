"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  REFUND_REASONS_FULL,
  REFUND_REASONS_DISPUTE,
  MAX_REFUND_IMAGES,
  getRefundEligibility,
} from "@/lib/refundPolicy";
import { ACCOUNT_UI } from "@/lib/accountUi";
import { refundBlockedFromApi } from "./RefundBlockedModal";

export default function RefundRequestModal({
  order,
  onClose,
  onSuccess,
  onBlocked,
  getAuthHeaders,
  /** precheck 結果：自動判開通 */
  precheck = null,
}) {
  const eligibility = getRefundEligibility(order);
  const isDispute = eligibility.requestType === "dispute";

  const [reasonType, setReasonType] = useState("");
  const [reasonNote, setReasonNote] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [activationClaim, setActivationClaim] = useState(
    isDispute ? "activated" : "not_activated",
  );
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    setActivationClaim(isDispute ? "activated" : "not_activated");
  }, [isDispute, order?.id]);

  const reasons = isDispute ? REFUND_REASONS_DISPUTE : REFUND_REASONS_FULL;
  const autoActivated = Boolean(precheck?.activated || isDispute);

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

    const res = await fetch("/api/refund/upload", {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "上傳失敗");
    return (data.files || []).map((f) => f.url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!reasonType) {
      setError("請選擇原因");
      return;
    }
    if (!agreedTerms) {
      setError("請勾選同意退換貨政策");
      return;
    }
    if (isDispute) {
      if (!deviceModel.trim()) {
        setError("請填寫手機型號");
        return;
      }
      if (reasonNote.trim().length < 10) {
        setError("請詳述問題（至少 10 字）");
        return;
      }
      if (imageFiles.length < 1) {
        setError("請上傳至少 1 張設定或錯誤畫面截圖");
        return;
      }
    }

    setSubmitting(true);
    try {
      let imageUrls = [];
      if (isDispute) {
        imageUrls = await uploadImages();
      }

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
      if (!res.ok) {
        if (data.blocked === "abuse" || data.code === "REFUND_ABUSE_LIMIT") {
          onBlocked?.(refundBlockedFromApi(data));
          onClose();
          return;
        }
        throw new Error(data.error || "提交失敗");
      }

      onSuccess?.(data.request);
      onClose();
    } catch (err) {
      setError(err.message || "提交失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={ACCOUNT_UI.modalOverlayBottom}>
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-sm shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-sky-600 uppercase tracking-wide">
              {isDispute ? "售後／爭議申請" : "未開通退款申請"}
            </p>
            <h3 className="text-lg font-bold text-slate-900">
              訂單 #{order.id}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{eligibility.hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-[24px] leading-none px-2"
            aria-label="關閉"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div
            className={`rounded-sm border px-3 py-2.5 text-sm ${
              autoActivated
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            <p className="font-bold text-[13px]">
              {autoActivated
                ? "系統判定：已開通／已使用"
                : "系統判定：尚未開通"}
            </p>
            <p className="text-[12px] mt-1 leading-relaxed opacity-90">
              {precheck?.message ||
                (autoActivated
                  ? "已依供應商用量自動切換為售後爭議表單，請上傳舉證。"
                  : "已向供應商查核，目前無使用證據，可申請未開通全額退款。無需再勾選開通狀態。")}
            </p>
          </div>

          {isDispute && (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  手機型號 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="例：iPhone 15 Pro、Samsung S24"
                  className="w-full border border-slate-200 rounded-sm px-3 py-2.5 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {isDispute ? "問題類型" : "退款原因"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <select
              value={reasonType}
              onChange={(e) => setReasonType(e.target.value)}
              className="w-full border border-slate-200 rounded-sm px-3 py-2.5 text-sm"
            >
              <option value="">請選擇</option>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {isDispute ? "問題說明" : "補充說明（選填）"}
              {isDispute && <span className="text-red-500"> *</span>}
            </label>
            <textarea
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              rows={4}
              placeholder={
                isDispute
                  ? "請描述設定步驟、錯誤訊息、無法連線的時間與地點等（至少 10 字）"
                  : "如有其他說明可填寫"
              }
              className="w-full border border-slate-200 rounded-sm px-3 py-2.5 text-sm resize-none"
            />
          </div>

          {isDispute && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                舉證截圖 <span className="text-red-500">*</span>
                <span className="font-normal text-slate-400 ml-1">
                  （1～{MAX_REFUND_IMAGES} 張，JPG/PNG，各 5MB 內）
                </span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {imagePreviews.map((src, i) => (
                  <div
                    key={src}
                    className="relative w-20 h-20 rounded-sm overflow-hidden border border-slate-200"
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1.5"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {imageFiles.length < MAX_REFUND_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-sm text-slate-400 text-[24px] hover:border-sky-400 hover:text-sky-500"
                  >
                    +
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleFiles}
              />
              <p className="text-xs text-slate-400">
                建議上傳：eSIM 設定畫面、APN／漫遊設定、錯誤提示或無訊號截圖。
              </p>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-100 rounded-sm p-3 text-xs text-slate-600 leading-relaxed space-y-2">
            <p className="font-bold text-slate-700">條款摘要</p>
            {isDispute ? (
              <>
                <p>
                  已開通 eSIM 原則不提供退款；本表單為售後爭議申請，將個案審核，
                  <strong>不保證退款</strong>。
                </p>
                <p>
                  請先配合客服排查（APN、數據漫遊等）；若 API
                  供應商確認為方案失效或我方錯誤，方可能部分或全額退款。
                </p>
              </>
            ) : (
              <>
                <p>
                  須於購買後 7 日內、QR Code 未掃描且 eSIM
                  未啟用、無流量使用，方可全額退款。
                </p>
                <p>
                  審核通過後約 7～14
                  個工作天退至原付款方式；金流手續費可能無法全額退回。
                </p>
              </>
            )}
            <Link
              href="/refund-policy"
              target="_blank"
              className="text-sky-600 font-bold hover:underline inline-block"
            >
              閱讀完整退換貨政策 →
            </Link>
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              我已閱讀並同意{" "}
              <Link
                href="/refund-policy"
                target="_blank"
                className="text-sky-600 font-bold hover:underline"
              >
                退換貨政策
              </Link>
              ，且所填資料真實有效。
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-100 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-sm text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-sky-600 text-white rounded-sm text-sm font-bold hover:bg-sky-700 disabled:opacity-50"
            >
              {submitting ? "提交中…" : "提交申請"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
