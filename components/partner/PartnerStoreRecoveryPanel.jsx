"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { RotateCcw, Sparkles, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PartnerButton from "@/components/partner/ui/PartnerButton";
import { supabase } from "@/lib/supabaseClient";
import {
  STORE_RETENTION_DAYS,
  getStoreDeletionMeta,
} from "@/lib/partnerStoreLifecycle";

/**
 * 已刪除賣場：重新開啟（30 天內）或建立新商店（智慧選品 wizard）
 */
export default function PartnerStoreRecoveryPanel({
  store,
  onStoreChange,
  onOpenWizard,
  className = "",
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  const meta = useMemo(() => getStoreDeletionMeta(store), [store]);

  if (!meta.isDeleted) return null;

  const callRecovery = async (action) => {
    setLoading(action);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("請重新登入後再試");
      }

      const res = await fetch("/api/partner/store-recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "操作失敗");
      }

      onStoreChange?.(data.store);

      if (data.openWizard) {
        onOpenWizard?.(data.store);
        return;
      }

      router.replace("/partner/settings?store_reopened=1");
    } catch (err) {
      setError(err.message || "操作失敗，請稍後再試");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={className}>
      <Alert variant="destructive" className="mb-4">
        <ShieldAlert />
        <AlertTitle>商店已關閉</AlertTitle>
        <AlertDescription>
          {meta.isExpired ? (
            <>
              此賣場已超過 {STORE_RETENTION_DAYS} 天保留期限，資料已無法還原。
              您可以使用「建立新商店」重新走智慧選品開店流程。
            </>
          ) : (
            <>
              刪除後保留 {STORE_RETENTION_DAYS} 天（剩餘約{" "}
              <strong>{meta.daysLeft}</strong> 天），期滿將自動永久刪除。
              可重新開啟原賣場，或以智慧選品建立全新上架清單。
            </>
          )}
        </AlertDescription>
      </Alert>

      {error ? (
        <p className="text-sm text-red-600 font-medium mb-3">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {meta.canReopen ? (
          <PartnerButton
            type="button"
            onClick={() => callRecovery("reopen")}
            disabled={Boolean(loading)}
            aria-busy={loading === "reopen"}
            className="gap-2"
          >
            <RotateCcw className="size-4" />
            {loading === "reopen" ? "處理中…" : "重新開啟商店"}
          </PartnerButton>
        ) : null}
        <PartnerButton
          type="button"
          variant={meta.canReopen ? "secondary" : "default"}
          onClick={() => callRecovery("create_new")}
          disabled={Boolean(loading)}
          aria-busy={loading === "create_new"}
          className="gap-2"
        >
          <Sparkles className="size-4" />
          {loading === "create_new" ? "準備中…" : "建立新商店"}
        </PartnerButton>
      </div>
      <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
        「建立新商店」會啟動智慧選品流程
        {meta.canReopen ? "，並清空目前上架商品後重新上架" : ""}。
      </p>
    </div>
  );
}
