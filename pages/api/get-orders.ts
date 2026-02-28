// /pages/api/get-orders.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const WC_API_URL = "https://inf.fjg.mybluehost.me/website_d17cf1ea/wp-json/wc/v3/orders";

// 建議在 .env 內用非 NEXT_PUBLIC 前綴（避免意外被前端引用）
const CONSUMER_KEY = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY!;
const CONSUMER_SECRET = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET!;

type WooOrderLite = {
  id: number;
  status: string;
  customer_id?: number;
  billing?: { email?: string };
};

const auth = { username: CONSUMER_KEY, password: CONSUMER_SECRET };

async function fetchOrdersPage(params: Record<string, any>, page = 1) {
  const { data, headers } = await axios.get<WooOrderLite[]>(WC_API_URL, {
    auth,
    params: { ...params, page },
  });
  const totalPages = parseInt(String(headers["x-wp-totalpages"] || "1"), 10) || 1;
  return { data, totalPages };
}

async function fetchAllOrders(params: Record<string, any>) {
  // 先抓第 1 頁，讀 totalPages 再把其餘頁面抓回來
  const first = await fetchOrdersPage(params, 1);
  let all = first.data;
  if (first.totalPages > 1) {
    const pages = Array.from({ length: first.totalPages - 1 }, (_, i) => i + 2);
    const rest = await Promise.all(
      pages.map((p) =>
        axios
          .get<WooOrderLite[]>(WC_API_URL, { auth, params: { ...params, page: p } })
          .then((r) => r.data)
          .catch(() => [] as WooOrderLite[])
      )
    );
    for (const arr of rest) all = all.concat(arr);
  }
  return all;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

  const { userId, email } = req.query as { userId?: string; email?: string };

  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    return res.status(500).json({ error: "缺少 WooCommerce API 金鑰環境變數" });
  }

  try {
    // 基本查詢參數（帶 status:any 讓所有狀態都抓得到）
    const baseParams: Record<string, any> = {
      per_page: 30,
      orderby: "date",
      order: "desc",
      status: "any",
    };

    let list: WooOrderLite[] = [];

    // 1) 優先用 userId 查（官方支援）
    if (userId && /^\d+$/.test(String(userId))) {
      list = await fetchAllOrders({ ...baseParams, customer: userId });
    }

    // 2) 若查不到 & 有 email → 用 email 後端過濾（Woo 沒原生 email 篩選）
    if ((!list || list.length === 0) && email) {
      const recent = await fetchAllOrders({ ...baseParams, per_page: 40 });
      const em = String(email).toLowerCase();
      list = (recent || []).filter(
        (o) => String(o?.billing?.email || "").toLowerCase() === em
      );
    }

    if (!Array.isArray(list)) list = [];

    // 除錯列印
    console.log("✅ WooCommerce 訂單清單（列表）:");
    list.forEach((o) =>
      console.log(`- #${o.id} | 狀態：${o.status} | customer_id: ${o.customer_id}`)
    );

    // 3) 逐筆抓「單筆詳情」，確保 meta_data / line_items 完整
    const full = await Promise.all(
      list.map(async (o) => {
        try {
          const { data } = await axios.get(`${WC_API_URL}/${o.id}`, { auth });
          return data;
        } catch (e) {
          console.warn(`[get-orders] 單筆詳情抓取失敗 #${o.id}:`, (e as any)?.message);
          return o; // 至少回列表項
        }
      })
    );

    // 4) 回傳前端實際需要的欄位
    const slim = full.map((o: any) => ({
      id: o.id,
      status: o.status,
      total: o.total,
      date_created: o.date_created,
      payment_method_title: o.payment_method_title,
      billing: o.billing,
      line_items: o.line_items,
      meta_data: o.meta_data, // 這裡會帶到 newebpay_offsite_info / esim_qrcodes 等
    }));

    return res.status(200).json(slim);
  } catch (error: any) {
    console.error("❌ WooCommerce 訂單查詢錯誤:", error?.response?.data || error.message);
    return res
      .status(500)
      .json({ error: "訂單查詢失敗", detail: error?.response?.data || error.message });
  }
}
