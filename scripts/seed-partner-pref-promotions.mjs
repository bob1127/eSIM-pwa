#!/usr/bin/env node
/**
 * ⚠️ 已停用 — 資安修補後不再使用此腳本。
 *
 * 本腳本原本會在 Medusa 建立共用、規律可猜的折扣碼
 * （JEKO_PREF_5 / 10 / 15 / 20），任何人只要在結帳頁直接輸入這些字串，
 * 就能繞過「必須經由夥伴專屬連結」的商業邏輯直接折抵，且一旦外流，
 * 影響的是所有使用該趴數的夥伴。
 *
 * 現在「專屬折扣碼連結」改用每位夥伴獨立、高熵亂數的 Medusa 折扣碼，
 * 由管理者後台（/admin-boss → 夥伴審核 → 詳情）存設定時自動建立／更新／
 * 停用，完全不需要再手動跑腳本或進 Medusa 後台建碼。
 * 邏輯見 lib/medusaPartnerPromotions.js、pages/api/admin/partners.js。
 *
 * 若你的 Medusa 環境曾經跑過舊版本腳本、還留著 JEKO_PREF_* 折扣碼，
 * 請改跑 scripts/deactivate-legacy-partner-pref-codes.mjs 清除。
 */
console.log(
  "此腳本已停用。請改用 /admin-boss 後台調整夥伴折扣趴數（會自動建立高熵亂數碼），" +
    "或執行 scripts/deactivate-legacy-partner-pref-codes.mjs 清除舊版共用碼。",
);
process.exit(0);
