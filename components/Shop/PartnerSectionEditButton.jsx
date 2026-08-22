"use client";

import MaterialIcon from "@/components/MaterialIcon";
import PartnerButton from "@/components/partner/ui/PartnerButton";
import { cn } from "@/lib/utils";

/** 夥伴首頁各區塊右上角「編輯」按鈕 */
export default function PartnerSectionEditButton({
  onClick,
  label = "編輯",
  className = "",
}) {
  return (
    <PartnerButton
      type="button"
      size="sm"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      className={cn("shadow-lg gap-1.5", className)}
    >
      <MaterialIcon name="edit" size={16} />
      {label}
    </PartnerButton>
  );
}
