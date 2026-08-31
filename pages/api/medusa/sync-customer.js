// 檔案位置: pages/api/medusa/sync-customer.js
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]"; // 請確認你的 NextAuth 設定路徑

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const { email, id, token, provider } = req.body;
  let validatedEmail = null;
  let validatedId = null;

  try {
    // 🛡️ 驗證邏輯 A：如果是 Supabase 用戶 (Google / Email)
    if (token && provider !== "line") {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        validatedEmail = user.email;
        validatedId = user.id;
      }
    } 
    // 🛡️ 驗證邏輯 B：如果是 LINE 用戶 (NextAuth)
    else {
      const session = await getServerSession(req, res, authOptions);
      if (session && session.user) {
        validatedEmail = session.user.email;
        // LINE 用戶若無 email，使用我們在前端生成的虛擬 Email
        if (!validatedEmail && email) validatedEmail = email; 
        validatedId = id; // 傳入的 LINE 唯一識別碼
      }
    }

    if (!validatedEmail) {
      return res.status(401).json({ message: "身分驗證失敗，無法同步至商店" });
    }

    // 🚀 向 Medusa 查詢或建立顧客
    // 1. 先查
    const checkRes = await fetch(`${MEDUSA_URL}/store/customers?email=${validatedEmail}`);
    const checkData = await checkRes.json();
    let customer = checkData.customers?.[0];

    // 2. 沒找到就建一筆
    if (!customer) {
      const createRes = await fetch(`${MEDUSA_URL}/store/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: validatedEmail,
          first_name: "Jeko User",
          password: `Jeko_Partner_${validatedId.substring(0, 8)}` // 生成預設密碼
        })
      });
      const createData = await createRes.json();
      customer = createData.customer;
    }

    return res.status(200).json({ 
      success: true, 
      medusaCustomerId: customer?.id,
      email: validatedEmail 
    });

  } catch (error) {
    console.error("[Medusa Sync Error]:", error);
    return res.status(500).json({ message: "系統同步錯誤" });
  }
}