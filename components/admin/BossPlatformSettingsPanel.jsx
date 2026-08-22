"use client";

import { useEffect, useMemo, useState } from "react";
import { bossFetch } from "@/lib/bossAdminClient";
import { QuarterRing } from "@/components/ui/QuarterRing";

const SOURCE_LABEL = {
  db: "後台設定（DB）",
  env: "環境變數",
  default: "系統預設",
};

/** 倍率 → 抽成百分比文字，例如 1.2 → 「抽 20%」 */
function markupPercentText(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) return "";
  const pct = Math.round((n - 1) * 1000) / 10;
  return pct >= 0 ? `在成本上加 ${pct}%（你的利潤）` : "";
}

export default function BossPlatformSettingsPanel() {
  const [info, setInfo] = useState(null);
  const [limits, setLimits] = useState({ min: 1, max: 5 });
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("good");

  const load = async () => {
    setLoading(true);
    try {
      const data = await bossFetch("/api/admin/platform-settings");
      setInfo(data.b2bMarkup);
      if (data.limits) setLimits(data.limits);
      setDraft(String(data.b2bMarkup?.effective ?? ""));
    } catch (err) {
      setToast(err.message);
      setToastType("bad");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const previewPercent = useMemo(() => markupPercentText(draft), [draft]);

  const dirty =
    info != null && String(info.effective) !== String(Number(draft));

  const save = async () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < limits.min || n > limits.max) {
      setToast(`抽成倍率需為 ${limits.min} ~ ${limits.max} 之間的數字`);
      setToastType("bad");
      return;
    }
    setSaving(true);
    setToast("");
    try {
      const data = await bossFetch("/api/admin/platform-settings", {
        method: "PUT",
        body: JSON.stringify({ b2b_cost_rate: n }),
      });
      setInfo(data.b2bMarkup);
      setDraft(String(data.b2bMarkup?.effective ?? n));
      setToast(`已儲存，全站抽成倍率為 ${data.value}（${markupPercentText(data.value)}）`);
      setToastType("good");
    } catch (err) {
      setToast(err.message);
      setToastType("bad");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <QuarterRing size="md" className="text-[#1a56db]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-black text-slate-900 mb-1">
          平台抽成（你的利潤）
        </h2>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">
          全站所有商品的「夥伴底價」＝供應商原始成本 × 這個倍率。倍率越高，你的利潤越高、夥伴的進貨底價也越高。
          <br />
          例如設 <span className="font-bold">1.2</span> 代表在成本上加兩成（抽 20%）、
          <span className="font-bold">1.5</span> 代表加五成（抽 50%）。此設定即時全站生效。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-400 mb-1">目前生效倍率</div>
            <div className="text-xl font-black text-slate-900">
              {info?.effective}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              來源：{SOURCE_LABEL[info?.source] || info?.source}
            </div>
          </div>
          <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-400 mb-1">環境變數值</div>
            <div className="text-xl font-black text-slate-900">
              {info?.envValue ?? "—"}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              PARTNER_B2B_COST_RATE
            </div>
          </div>
          <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-400 mb-1">系統預設值</div>
            <div className="text-xl font-black text-slate-900">
              {info?.defaultValue}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">未設定時採用</div>
          </div>
        </div>

        <label className="block text-sm font-bold text-slate-700 mb-2">
          設定新的抽成倍率（{limits.min} ~ {limits.max}）
        </label>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="number"
            step="0.01"
            min={limits.min}
            max={limits.max}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full sm:w-40 px-4 py-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#1a56db] outline-none font-bold text-lg"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="px-6 py-3 rounded-md bg-[#1a56db] text-white font-bold text-sm hover:bg-[#1e40af] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "儲存中…" : "儲存並全站套用"}
          </button>
        </div>
        {previewPercent && (
          <p className="text-sm text-emerald-600 font-medium mt-3">
            預覽：{previewPercent}
          </p>
        )}

        {toast && (
          <div
            className={`mt-4 text-sm rounded-md px-4 py-3 ${
              toastType === "bad"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {toast}
          </div>
        )}

        {info?.dbUpdatedAt && (
          <p className="text-[11px] text-slate-400 mt-4">
            上次調整：{new Date(info.dbUpdatedAt).toLocaleString("zh-TW")}
          </p>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4 leading-relaxed">
        說明：這裡調整的是「平台抽成（你的利潤）」，不是夥伴的售價。夥伴可在自己的後台設定售價，
        但底價（此倍率算出的成本）由你掌控、夥伴無法竄改。若資料表尚未建立，系統會自動沿用環境變數或預設值。
      </p>
    </div>
  );
}
