import { createClient } from '@supabase/supabase-js'

// 🚀 關鍵修改：讀取帶有 NEXT_PUBLIC_ 的變數
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 這裡是防呆檢查
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ 找不到 Supabase 環境變數！請確認 .env.local 裡是否使用了 NEXT_PUBLIC_ 前綴。")
} else if (typeof window !== "undefined") {
  fetch("/api/auth/debug-config")
    .then((r) => r.json())
    .then((cfg) => {
      if (cfg.anonKeyValid === false) {
        console.error(
          "❌ Supabase anon key 無效（可能仍是舊專案的 key）:",
          cfg.anonKeyError,
          "\n→ 請到 Supabase Jeko-eSIM → Settings → API 更新 NEXT_PUBLIC_SUPABASE_ANON_KEY",
        );
      }
    })
    .catch(() => {});
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
})