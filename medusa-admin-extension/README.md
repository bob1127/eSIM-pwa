# Medusa Admin — 夥伴管理 iframe 擴充

在 Medusa 後台側欄加入「夥伴管理」，以 iframe 嵌入 Next.js `/admin-boss?embed=1`。

## 安裝（Medusa 後端專案）

1. 複製 `src/admin/routes/partner-management/` 到你的 Medusa 專案 `src/admin/routes/partner-management/`

2. 在 Medusa 後端 `.env` 設定：

```env
JEKO_PARTNER_DASHBOARD_URL=https://www.jeko-esim.com.tw/admin-boss?embed=1
# 本機測試：
# JEKO_PARTNER_DASHBOARD_URL=http://localhost:3000/admin-boss?embed=1
```

3. 在 Next.js `.env.local` 設定（允許被 Medusa iframe）：

```env
MEDUSA_ADMIN_ORIGIN=https://esim-backend-eight.vercel.app
# 或本機 Medusa Admin 網址
```

4. 重啟 Medusa backend + admin

## 登入流程

- iframe 載入後會 `postMessage({ type: 'jeko_boss_ready' })`
- Medusa 擴充頁讀取 admin session token 後 `postMessage({ type: 'jeko_boss_token', token, email })`
- 若 token 無法自動傳遞，可在 iframe 內用 Medusa 管理員帳密登入一次

## 底價設定（Medusa metadata）

「API 原始底價」的解析優先序（見 `lib/medusaPartnerPricing.js` 的
`resolveApiWholesalePriceLive`）：

1. **即時報價（優先）**：依 `variant.sku` 對照 MicroeSIM 目前的
   `esimDataplanList`（見 `lib/esim/livePlanCost.js`），SKU 格式與
   `lib/esim/planMap.ts` 相同，抓不到需要人工設定。
2. `metadata.b2b_price`（變體）：查不到即時報價時的手動固定值。
3. `metadata.b2b_cost_rate`（商品／變體）：都沒有時，用零售價估算（預設倍率 1）。

| 層級 | 欄位 | 說明 |
|------|------|------|
| 全域 | `PARTNER_B2B_COST_RATE=1.2`（Next.js env） | 夥伴底價 = API 底價 × 1.2（平台抽 20%），合理範圍 1~5 倍，超出會自動忽略退回 1 |
| 商品 | `metadata.b2b_cost_rate` | 最後手段：無即時報價也無固定 b2b_price 時，用零售價估算 API 底價 |
| 變體 | `metadata.b2b_price` | 即時報價查不到時的備援固定底價 |

即時報價只在「商品上架同步」（`lib/medusaProductSync.js`／
`pages/api/admin/sync-medusa-to-supabase.js`）與「後台批次刷新」
（`POST /api/admin/refresh-b2b-costs?secret=<ADMIN_SECRET>`）時呼叫，
寫回 Supabase `product_variations.b2b_price`；結帳（`/api/create-order`）
一律讀這個快照算價，不會在下單當下即時打供應商 API，避免供應商 API
忙線／逾時直接擋單。

**用量很小，不用擔心刷新頻率**：每次刷新只打「1 次」MicroeSIM 目錄 API
（一口氣抓全部方案清單），跟商品數量無關；匯率也改成固定保守值
（`ESIM_FX_RATE_USD`／`ESIM_FX_RATE_HKD`，預設 33.0／4.5，可用環境變數
調整），不再打第三方即時匯率 API，避免免費額度被排程打爆。建議排程
**一天 1 次**即可（eSIM 批發價不會頻繁變動），想更即時可以拉到每小時
1 次，成本差異可忽略。目錄本身也有記憶體快取（`ESIM_CATALOG_CACHE_MINUTES`，
預設 60 分鐘），只是避免同一個溫執行環境短時間內重複查詢而已，不影響
你排程刷新的頻率選擇。

夥伴店加價率仍在 Supabase `stores.markup_rate`。
