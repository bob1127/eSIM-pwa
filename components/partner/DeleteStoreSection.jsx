"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import PartnerDialog from "@/components/partner/ui/PartnerDialog";
import PartnerButton from "@/components/partner/ui/PartnerButton";
import { STORE_RETENTION_DAYS } from "@/lib/partnerStoreLifecycle";
import { supabase } from "@/lib/supabaseClient";

/**
 * 商店設定 — 危險區：刪除賣場（二次確認）與刪除後恢復
 */
export default function DeleteStoreSection({ store, onDeleted }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [confirmDomain, setConfirmDomain] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const isDeleted = store?.status === "deleted";

  const reset = () => {
    setOpen(false);
    setStep(1);
    setConfirmDomain("");
    setError("");
    setDeleting(false);
  };

  const handleOpen = () => {
    if (isDeleted) return;
    setStep(1);
    setConfirmDomain("");
    setError("");
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!store?.id || deleting) return;
    setDeleting(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("請重新登入後再試");
      }

      const res = await fetch("/api/partner/delete-store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          confirm: true,
          confirmDomain: confirmDomain.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "刪除失敗");
      }

      onDeleted?.(data.store);
      reset();
      router.replace("/partner/settings?store_deleted=1");
    } catch (err) {
      setError(err.message || "刪除失敗，請稍後再試");
      setDeleting(false);
    }
  };

  const domainOk =
    confirmDomain.trim().toLowerCase() ===
    String(store?.domain || "")
      .trim()
      .toLowerCase();

  return (
    <>
      <div className="border-t border-red-100 pt-6 mt-2">
        <h2 className="text-sm font-black text-red-700 mb-1">危險區域</h2>

        {isDeleted ? (
          <p className="text-xs text-slate-500 leading-relaxed">
            此賣場已關閉。請使用頁面上方的「重新開啟商店」或「建立新商店」。
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              刪除後賣場前台將立即下線；資料保留 {STORE_RETENTION_DAYS}{" "}
              天，期間可重新開啟或建立新商店。
            </p>
            <Button
              type="button"
              onClick={handleOpen}
              className="gap-2 bg-red-500 text-white hover:bg-red-600"
            >
              <ShieldAlert className="size-5" />
              刪除商店
            </Button>
          </>
        )}
      </div>

      <PartnerDialog
        open={open}
        onClose={reset}
        title={step === 1 ? "確定要刪除商店？" : "最後確認"}
        description={
          step === 1
            ? `將關閉「${store?.store_name || "您的賣場"}」並下架 ${store?.domain ? `/p/${store.domain}/` : "專屬賣場"}。`
            : `請輸入商店代碼確認。${STORE_RETENTION_DAYS} 天內可重新開啟。`
        }
        icon="warning"
        maxWidth="max-w-md"
        hideClose={deleting}
        footer={
          step === 1 ? (
            <>
              <PartnerButton
                type="button"
                variant="secondary"
                onClick={reset}
                disabled={deleting}
              >
                取消
              </PartnerButton>
              <PartnerButton
                type="button"
                variant="destructive"
                onClick={() => setStep(2)}
              >
                繼續刪除
              </PartnerButton>
            </>
          ) : (
            <>
              <PartnerButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
                disabled={deleting}
              >
                返回
              </PartnerButton>
              <PartnerButton
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || !domainOk}
                aria-busy={deleting}
                className="min-w-[7rem]"
              >
                {deleting ? "刪除中…" : "確認刪除商店"}
              </PartnerButton>
            </>
          )
        }
      >
        {step === 1 ? (
          <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
            <li>訪客將無法再進入您的賣場首頁</li>
            <li>歷史訂單與分潤紀錄仍保留供對帳</li>
            <li>
              {STORE_RETENTION_DAYS} 天內可「重新開啟」或「建立新商店」
            </li>
            <li>超過保留期限後資料將永久刪除</li>
          </ul>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              請輸入商店代碼{" "}
              <span className="font-mono font-bold text-slate-900">
                {store?.domain}
              </span>{" "}
              以確認刪除：
            </p>
            <input
              type="text"
              value={confirmDomain}
              onChange={(e) => setConfirmDomain(e.target.value)}
              placeholder={store?.domain || "商店代碼"}
              autoComplete="off"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition"
            />
            {error ? (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            ) : null}
          </div>
        )}
      </PartnerDialog>
    </>
  );
}
