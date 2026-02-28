import { createClient } from '@supabase/supabase-js'

// 🚀 關鍵修改：讀取帶有 NEXT_PUBLIC_ 的變數
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 這裡是防呆檢查
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ 找不到 Supabase 環境變數！請確認 .env.local 裡是否使用了 NEXT_PUBLIC_ 前綴。")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)