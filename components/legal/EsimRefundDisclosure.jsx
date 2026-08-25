"use client";

import { useState } from "react";
import Link from "next/link";
import MaterialIcon from "@/components/MaterialIcon";

const LINE_OA_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn";

const ROAMING_ITEMS = [
  {
    label: "a.",
    text: "如 eSIM 未安裝，我們將全額退款。",
  },
  {
    label: "b.",
    text: "如 eSIM 已安裝但未激活，我們將全額退款。",
  },
  {
    label: "c.",
    text: "如 eSIM 已激活，則不予退款。",
  },
  {
    label: "d.",
    text: "如果您遇到任何連線問題，請聯絡我們的客戶支援。我們將協助您進行故障排除，並根據具體情況提供更換 eSIM 或部分退款。",
  },
];

/**
 * 結帳／商品頁可展開的 eSIM 退換貨條款摘要
 */
export default function EsimRefundDisclosure({
  defaultOpen = false,
  compact = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 py-2 text-left group"
        aria-expanded={open}
      >
        <span className="text-xs text-slate-500 group-hover:text-slate-700 transition leading-snug">
          {compact
            ? "退換貨：非原生可退；原生 eSIM 售出後不退不換"
            : "數位 eSIM 退換貨說明（原生／非原生不同）"}
        </span>
        <MaterialIcon
          name={open ? "expand_less" : "expand_more"}
          size={18}
          className="text-slate-400 shrink-0"
        />
      </button>

      {open && (
        <div className="pb-3 space-y-3 border-t border-slate-100 pt-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">
              非原生／漫遊 eSIM
            </p>
            <ul className="space-y-2">
              {ROAMING_ITEMS.map((item) => (
                <li
                  key={item.label}
                  className="text-xs leading-relaxed text-slate-500 flex gap-1.5"
                >
                  <span className="font-semibold text-slate-600 shrink-0">
                    {item.label}
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-slate-700">原生 eSIM</p>
            <p className="text-xs leading-relaxed text-slate-500">
              售出後概不退款或換貨。
            </p>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            完整說明請見
            <Link
              href="/refund-policy"
              target="_blank"
              className="text-slate-600 underline hover:text-slate-800 mx-0.5"
            >
              退換貨政策
            </Link>
            。若尚未加入會員，請先
            <a
              href={LINE_OA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 underline hover:text-slate-800 mx-0.5"
            >
              加入官方 LINE
            </a>
            後提交退款或售後審核申請。
          </p>
        </div>
      )}
    </div>
  );
}
