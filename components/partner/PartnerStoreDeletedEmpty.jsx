"use client";

import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { STORE_RETENTION_DAYS } from "@/lib/partnerStoreLifecycle";

/**
 * 刪除商店成功後的過渡畫面（使用者按「知道了」後才進入恢復選項）
 */
export default function PartnerStoreDeletedEmpty({ store, onAcknowledge }) {
  const name = store?.store_name || "您的賣場";

  return (
    <Empty className="min-h-[min(520px,75vh)] rounded-xl border-slate-200 bg-white shadow-sm">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="text-amber-600 ring-amber-100 bg-amber-50">
          <Store className="size-7" strokeWidth={1.75} />
        </EmptyMedia>
        <EmptyTitle>商店已刪除</EmptyTitle>
        <EmptyDescription className="max-w-sm text-pretty">
          「{name}」已關閉，前台已立即下線。歷史訂單與分潤紀錄仍保留供對帳。
          <span className="mt-2 block text-slate-600">
            資料保留 {STORE_RETENTION_DAYS} 天，期間可重新開啟或建立新商店。
          </span>
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" size="lg" className="min-w-[8rem]" onClick={onAcknowledge}>
          知道了
        </Button>
      </EmptyContent>
    </Empty>
  );
}
