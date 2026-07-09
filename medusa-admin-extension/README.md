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

| 層級 | 欄位 | 說明 |
|------|------|------|
| 全域 | `PARTNER_B2B_COST_RATE=0.85`（Next.js env） | 底價 = 零售價 × 85% |
| 商品 | `metadata.b2b_cost_rate` | 覆寫該商品全部變體 |
| 變體 | `metadata.b2b_price` | 固定底價（優先） |

夥伴店加價率仍在 Supabase `stores.markup_rate`。
