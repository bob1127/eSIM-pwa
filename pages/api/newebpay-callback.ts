// /pages/api/newebpay-callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import type { IncomingMessage } from "http";
import crypto from "crypto";
import qs from "qs";

/** 建議改 .env；此處沿用你的現值 */
const HASH_KEY = "OVB4Xd2HgieiLJJcj5RMx9W94sMKgHQx";
const HASH_IV  = "PKetlaZYZcZvlMmC";

/** ========== helpers ========== */
export const config = { api: { bodyParser: false } };

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sha(encrypted: string, key: string, iv: string) {
  const s = `HashKey=${key}&${encrypted}&HashIV=${iv}`;
  return crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
}

/** 先試 hex；失敗再試 base64（會做 +/空白 正規化） */
function decryptTradeInfo(ti: string, key: string, iv: string): string {
  const tryHex = () => {
    const d = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(key, "utf8"),
      Buffer.from(iv, "utf8")
    );
    d.setAutoPadding(true);
    let out = d.update(ti, "hex", "utf8");
    out += d.final("utf8");
    return out;
  };
  const tryB64 = () => {
    const norm = ti.replace(/\s+/g, "+").replace(/-/g, "+").replace(/_/g, "/");
    const padded = norm + "===".slice((norm.length + 3) % 4);
    const d = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(key, "utf8"),
      Buffer.from(iv, "utf8")
    );
    d.setAutoPadding(true);
    let out = d.update(padded, "base64", "utf8");
    out += d.final("utf8");
    return out;
  };

  if (/^[0-9a-fA-F]+$/.test(ti) && ti.length % 2 === 0) {
    try {
      return tryHex();
    } catch {
      return tryB64();
    }
  }
  try {
    return tryB64();
  } catch {
    return tryHex();
  }
}

function parseDecrypted(text: string): any {
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj.Result === "string") {
      try {
        obj.Result = JSON.parse(obj.Result);
      } catch {
        obj.Result = qs.parse(obj.Result);
      }
    }
    return obj;
  } catch {
    const r = qs.parse(text);
    if ((r as any).Result && typeof (r as any).Result === "string") {
      try {
        (r as any).Result = JSON.parse((r as any).Result as string);
      } catch {
        (r as any).Result = qs.parse((r as any).Result as string);
      }
    }
    return r;
  }
}

function hasPayMoment(result: any) {
  return !!(
    result?.PayTime ||
    result?.PaymentTime ||
    result?.PayDate ||
    result?.CloseTime
  );
}
function firstPayMoment(result: any) {
  return (
    result?.PayTime ||
    result?.PaymentTime ||
    result?.PayDate ||
    result?.CloseTime ||
    ""
  );
}
function isPaid(result: any, status?: string) {
  const t = String(result?.PaymentType || "").toUpperCase();
  const paid = hasPayMoment(result);
  if (t === "CREDIT") {
    // 信用卡以 Status 為準；若少數金流會回 PayTime，也一併視為已付
    return status === "SUCCESS" || paid;
  }
  return paid;
}
function isOffsitePending(result: any) {
  const t = String(result?.PaymentType || "").toUpperCase();
  return (t === "VACC" || t === "CVS" || t === "WEBATM") && !hasPayMoment(result);
}

/** ========== handler ========== */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 若被誤以 GET 方式存取，不要導去 error，直接結束即可（避免 ThankYou 拿不到 orderNo）
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  try {
    const raw = await readBody(req);
    const ct = String(req.headers["content-type"] || "");

    // 只為了讀取非加密欄位可解析，但 TI/TS 儘量從 raw 取，避免 + 被還原成空白
    const body: any = ct.includes("application/json")
      ? JSON.parse(raw || "{}")
      : qs.parse(raw);

    const getRawParam = (name: string): string | undefined => {
      const start = raw.indexOf(`${name}=`);
      if (start < 0) return undefined;
      const s = start + name.length + 1;
      const amp = raw.indexOf("&", s);
      return (amp === -1 ? raw.slice(s) : raw.slice(s, amp)).trim();
    };

    // 優先 raw，其次 body
    const TI_raw = getRawParam("TradeInfo") || String(body?.TradeInfo || "");
    const TS_raw = getRawParam("TradeSha") || String(body?.TradeSha || "");

    if (!TI_raw || !TS_raw) {
      return res.redirect(302, `/thank-you?status=error`);
    }

    // 產候選，找出 SHA 能過的一個
    const tiCandidates = (() => {
      const out: string[] = [];
      const hasPct = /%[0-9a-fA-F]{2}/.test(TI_raw);
      out.push(TI_raw);
      if (hasPct) {
        try { out.push(decodeURIComponent(TI_raw)); } catch {}
      }
      if (!hasPct && /\s/.test(TI_raw)) {
        const restored = TI_raw.replace(/\s/g, "+");
        out.push(restored);
        try { out.push(decodeURIComponent(restored)); } catch {}
      }
      return Array.from(new Set(out.filter(Boolean)));
    })();

    let TradeInfo = "";
    for (const c of tiCandidates) {
      if (sha(c, HASH_KEY, HASH_IV) === TS_raw) {
        TradeInfo = c;
        break;
      }
    }
    if (!TradeInfo) {
      return res.redirect(302, `/thank-you?status=error`);
    }

    // 解密 + 解析
    let payload: any = {};
    try {
      const plain = decryptTradeInfo(TradeInfo, HASH_KEY, HASH_IV);
      payload = parseDecrypted(plain) || {};
    } catch {
      return res.redirect(302, `/thank-you?status=error`);
    }

    // ⚠️ 信用卡流程常見：Status 不在解密後 payload，而在外層 body
    const status =
      (payload?.Status as string | undefined) ||
      (body?.Status as string | undefined) ||
      (body?.status as string | undefined);

    const result = payload?.Result || {};
    const orderNo =
      result?.MerchantOrderNo ||
      result?.MerchantOrderID ||
      body?.MerchantOrderNo ||
      body?.MerchantOrderID ||
      "";

    if (!orderNo) {
      return res.redirect(302, `/thank-you?status=error`);
    }

    // 只決定導向狀態；**不**做任何後端 fulfill（避免和 notify 重覆）
    let nextStatus = "fail";
    if (isPaid(result, status)) nextStatus = "success";
    else if (isOffsitePending(result)) nextStatus = "pending";

    // 把已知欄位帶回前端
    const qsExtra = new URLSearchParams({
      orderNo,
      status: nextStatus,
      paymentType: String(result?.PaymentType || ""),
      payTime: firstPayMoment(result),
      tradeNo: String(result?.TradeNo || ""),
    }).toString();

    return res.redirect(302, `/thank-you?${qsExtra}`);
  } catch {
    return res.redirect(302, `/thank-you?status=error`);
  }
}
