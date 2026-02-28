// /pages/api/fetch-order.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const WC_API_URL = "https://inf.fjg.mybluehost.me/website_d17cf1ea/wp-json/wc/v3/orders";
const CONSUMER_KEY = "ck_ef9f4379124655ad946616864633bd37e3174bc2";
const CONSUMER_SECRET = "cs_3da596e08887d9c7ccbf8ee15213f83866c160d4";

type QrcodeInfo = { name: string; src: string };

function normalizeSrc(raw: any): string {
  const str = String(raw || "");
  if (!str) return "";
  return str.startsWith("http") || str.startsWith("data:image/")
    ? str
    : `data:image/png;base64,${str}`;
}

function computeIsPaid(order: any): boolean {
  const s = String(order?.status || "").toLowerCase();
  if (s === "processing" || s === "completed") return true;
  if (order?.date_paid) return true;

  const meta: any[] = order?.meta_data || [];
  const payTime = meta.find((m) => m?.key === "newebpay_pay_time")?.value;
  if (payTime) return true;

  const txn = order?.transaction_id;
  if (txn && String(txn).trim()) return true;

  return false;
}

function statusLabel(order: any): string {
  const s = String(order?.status || "").toLowerCase();
  switch (s) {
    case "processing":
    case "completed":
      return "SUCCESS";
    case "on-hold":
      return "PENDING";
    case "failed":
      return "FAILED";
    case "cancelled":
      return "CANCELLED";
    default:
      return s || "UNKNOWN";
  }
}

/** 從訂單備註（我們在 notify 裡寫的）解析出 offsite 取號資訊 */
function parseOffsiteFromNote(note: string) {
  // 範例（notify 寫入）：
  // 🔔 藍新金流 取號成功（VACC）
  // 銀行代碼：812
  // 轉帳帳號 / 繳費代碼：12345678901234
  // 超商別：7-11
  // 應繳金額：NT$ 299
  // 繳費期限：2025/09/20 23:59
  // 交易序號：12345678
  // 商店訂單號：ORDER123

  const get = (label: string) => {
    const re = new RegExp(`^${label}\\s*[:：]\\s*(.+)$`, "m");
    const m = note.match(re);
    return m ? m[1].trim() : "";
  };

  const firstLine = note.split("\n")[0] || "";
  const typeMatch = firstLine.match(/取號成功（(.+?)）/);
  const PaymentType = (typeMatch?.[1] || "").toUpperCase();

  const BankCode = get("銀行代碼");
  const code = get("轉帳帳號 / 繳費代碼") || get("繳費代碼") || get("轉帳帳號");
  const StoreType = get("超商別");
  const ExpireDate = get("繳費期限");
  const TradeNo = get("交易序號");
  const amtRaw = get("應繳金額");
  const Amt = amtRaw ? amtRaw.replace(/[^\d.]/g, "") : "";

  if (!PaymentType && !BankCode && !code && !ExpireDate && !TradeNo && !Amt) return null;

  return {
    PaymentType,
    BankCode,
    CodeNo: code,
    PaymentNo: code,
    StoreType,
    ExpireDate,
    TradeNo,
    Amt,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

  let { orderNo } = req.query as { orderNo?: string };
  if (!orderNo || typeof orderNo !== "string") {
    return res.status(400).json({ error: "缺少訂單編號（orderNo）" });
  }
  orderNo = orderNo.replace(/[&/\\]/g, "-");

  try {
    // 1) 用我們自訂 meta：newebpay_order_no 找訂單
    const { data: orders } = await axios.get(WC_API_URL, {
      auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
      params: { per_page: 50, order: "desc", orderby: "date" },
    });

    const orderLite = orders.find((o: any) =>
      o?.meta_data?.some((m: any) => m?.key === "newebpay_order_no" && m?.value === orderNo)
    );
    if (!orderLite) return res.status(404).json({ error: "找不到訂單" });

    // 2) 取詳情
    const { data: fullOrder } = await axios.get(`${WC_API_URL}/${orderLite.id}`, {
      auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
    });

    const meta: any[] = fullOrder?.meta_data || [];
    const lineItems: any[] = fullOrder?.line_items || [];

    // ====== 取號/代碼資料（ATM/超商/WebATM） ======
    let offsiteInfo: any = null;

    // 2.1 首選：整包 JSON
    const rawOffsite = meta.find((m) => m?.key === "newebpay_offsite_info")?.value;
    if (rawOffsite) {
      try { offsiteInfo = typeof rawOffsite === "string" ? JSON.parse(rawOffsite) : rawOffsite; } catch {}
    }

    // 2.2 備援：用拆散欄位拼回
    if (!offsiteInfo) {
      const PaymentType =
        meta.find((m) => m?.key === "newebpay_payment_type")?.value ||
        (fullOrder?.payment_method_title || "").toUpperCase();

      const CodeNo =
        meta.find((m) => m?.key === "newebpay_code_no")?.value || "";

      const BankCode =
        meta.find((m) => m?.key === "newebpay_bank_code")?.value || "";

      const ExpireDate =
        meta.find((m) => m?.key === "newebpay_expire_date")?.value || "";

      const TradeNo =
        meta.find((m) => m?.key === "newebpay_trade_no")?.value ||
        fullOrder?.transaction_id || "";

      const Amt = fullOrder?.total;

      if (PaymentType && (CodeNo || BankCode || ExpireDate || TradeNo)) {
        offsiteInfo = {
          PaymentType: String(PaymentType).toUpperCase(),
          BankCode: BankCode || "",
          CodeNo: CodeNo || "",
          PaymentNo: CodeNo || "",
          StoreType: "",
          ExpireDate: ExpireDate || "",
          TradeNo: TradeNo || "",
          Amt,
        };
      }
    }

    // 2.3 最後備援：讀訂單備註（notify 有寫一則「取號成功」）
    if (!offsiteInfo) {
      try {
        const { data: notes } = await axios.get(`${WC_API_URL}/${orderLite.id}/notes`, {
          auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
          params: { per_page: 20, order: "desc" },
        });
        const hit = (notes || []).find(
          (n: any) =>
            typeof n?.note === "string" &&
            (n.note.includes("取號成功") || n.note.includes("藍新金流 取號成功"))
        );
        if (hit?.note) {
          const parsed = parseOffsiteFromNote(hit.note);
          if (parsed) offsiteInfo = parsed;
        }
      } catch {
        // notes 取不到就略過
      }
    }

    // ====== 付款狀態、其他欄位 ======
    const isPaid = computeIsPaid(fullOrder);
    const paymentStatusLabel = statusLabel(fullOrder);
    const paymentType =
      meta.find((m) => m?.key === "newebpay_payment_type")?.value ||
      fullOrder?.payment_method_title || "";

    const payTime =
      meta.find((m) => m?.key === "newebpay_pay_time")?.value ||
      fullOrder?.date_paid || "";

    const tradeNo =
      meta.find((m) => m?.key === "newebpay_trade_no")?.value ||
      fullOrder?.transaction_id || "";

    const orderInfo = {
      status: paymentStatusLabel,
      isPaid,
      MerchantOrderNo: orderNo,
      PaymentType: paymentType,
      PayTime: payTime,
      TradeNo: tradeNo,
      wooStatus: String(fullOrder?.status || ""),
    };

    // ====== eSIM QRCodes（維持你的邏輯） ======
    let qrcodes: QrcodeInfo[] = [];
    const multi = meta.find((m: any) => m?.key === "esim_qrcodes")?.value;
    if (multi) {
      try {
        const parsed = typeof multi === "string" ? JSON.parse(multi) : multi;
        if (Array.isArray(parsed)) {
          qrcodes = parsed
            .map((it: any, idx: number) => {
              const name = (it?.name && String(it.name).trim()) ? it.name : `eSIM #${idx + 1}`;
              const src = normalizeSrc(it?.src ?? it);
              return src ? { name, src } : null;
            })
            .filter(Boolean) as QrcodeInfo[];
        }
      } catch {}
    }
    if (!qrcodes.length) {
      const single = meta.find((m: any) => m?.key === "esim_qrcode")?.value;
      const qtyStr = meta.find((m: any) => m?.key === "esim_quantity")?.value;
      const qty = Math.max(1, parseInt(String(qtyStr || "1"), 10));
      if (single) {
        const src = normalizeSrc(single);
        if (src) {
          qrcodes = Array.from({ length: qty }).map((_, i) => ({ name: `eSIM #${i + 1}`, src }));
        }
      }
    }
    if (!qrcodes.length && Array.isArray(lineItems)) {
      const fromItems: QrcodeInfo[] = [];
      for (const li of lineItems) {
        const name = li?.name || "eSIM";
        const metaArr: any[] = li?.meta_data || [];
        const itemMulti = metaArr.find((m: any) => m?.key === "esim_qrcodes")?.value;
        const itemSingle = metaArr.find((m: any) => m?.key === "esim_qrcode")?.value;

        if (itemMulti) {
          try {
            const parsed = typeof itemMulti === "string" ? JSON.parse(itemMulti) : itemMulti;
            if (Array.isArray(parsed)) {
              parsed.forEach((raw: any, idx: number) => {
                const src = normalizeSrc(raw?.src ?? raw);
                if (src) fromItems.push({ name: `${name} #${idx + 1}`, src });
              });
            }
          } catch {}
        } else if (itemSingle) {
          const qty = Math.max(1, parseInt(String(li?.quantity || "1"), 10));
          const src = normalizeSrc(itemSingle);
          if (src) for (let i = 0; i < qty; i++) fromItems.push({ name: `${name} #${i + 1}`, src });
        }
      }
      if (fromItems.length) qrcodes = fromItems;
    }

    return res.status(200).json({
      orderInfo,
      offsiteInfo,
      offsitePending: !isPaid && !!offsiteInfo,
      qrcodes,
      message: qrcodes.length ? undefined : "尚未找到任何 eSIM QRCode，請稍後再試或聯繫客服。",
    });
  } catch (err: any) {
    console.error("❌ WooCommerce 查詢失敗:", err?.response?.data || err.message);
    return res.status(500).json({ error: "WooCommerce 查詢失敗", details: err?.response?.data || err.message });
  }
}
