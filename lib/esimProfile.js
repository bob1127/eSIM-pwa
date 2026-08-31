/**
 * eSIM 啟用資料解析：只使用供應商 topupDetail／esimDataplanList 真實欄位。
 * 不做 APN 帳密／CHAP／網路名稱的推測補齊。
 *
 * QR 圖解碼刻意不用 sharp（native binary）：Vercel serverless 常漏帶
 * linux-x64 的 @img/sharp-*，一載入就讓 fulfill-order 500。
 * 改用純 JS：pngjs / jpeg-js + jsqr。
 */

import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import jsQRImport from "jsqr";

const jsQR = typeof jsQRImport === "function" ? jsQRImport : jsQRImport?.default;

const LPA_RE = /LPA:1\$([^$\s]+)\$([^$\s]+)/i;

function detectImageKind(buf) {
  if (!buf || buf.length < 3) return "";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpeg";
  return "";
}

/** RGBA buffer → 最近鄰放大（小圖 QR 解碼用） */
function nearestUpscale(rgba, width, height, targetWidth) {
  const scale = targetWidth / width;
  const tw = Math.max(1, Math.round(targetWidth));
  const th = Math.max(1, Math.round(height * scale));
  const out = new Uint8ClampedArray(tw * th * 4);
  for (let y = 0; y < th; y++) {
    const sy = Math.min(height - 1, Math.floor(y / scale));
    for (let x = 0; x < tw; x++) {
      const sx = Math.min(width - 1, Math.floor(x / scale));
      const si = (sy * width + sx) * 4;
      const di = (y * tw + x) * 4;
      out[di] = rgba[si];
      out[di + 1] = rgba[si + 1];
      out[di + 2] = rgba[si + 2];
      out[di + 3] = rgba[si + 3];
    }
  }
  return { data: out, width: tw, height: th };
}

function toGreyscale(rgba, width, height) {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const y = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
    out[i] = y;
    out[i + 1] = y;
    out[i + 2] = y;
    out[i + 3] = rgba[i + 3];
  }
  return { data: out, width, height };
}

function decodeImageToRgba(buf) {
  const kind = detectImageKind(buf);
  if (kind === "png") {
    const png = PNG.sync.read(buf);
    return {
      data: new Uint8ClampedArray(png.data),
      width: png.width,
      height: png.height,
    };
  }
  if (kind === "jpeg") {
    const jpg = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
    return {
      data: new Uint8ClampedArray(jpg.data),
      width: jpg.width,
      height: jpg.height,
    };
  }
  return null;
}

/** 正規化 QR 圖：http URL 或 data URI 或純 base64 */
export function normalizeQrSrc(raw) {
  const str = String(raw || "").trim();
  if (!str) return "";
  if (str.startsWith("http") || str.startsWith("data:image/")) return str;
  if (str.startsWith("LPA:")) return ""; // 文字 LPA 不是圖
  return `data:image/png;base64,${str}`;
}

/** 解析 LPA:1$smdp$activationCode */
export function parseLpaString(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(LPA_RE);
  if (!m) return null;
  return {
    lpa: `LPA:1$${m[1]}$${m[2]}`,
    smdp: m[1],
    activationCode: m[2],
  };
}

function firstString(...vals) {
  for (const v of vals) {
    if (v == null || v === "") continue;
    // 供應商常回 ["LPA:..."] / [""] / ["8986..."]
    if (Array.isArray(v)) {
      const nested = firstString(...v);
      if (nested) return nested;
      continue;
    }
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

/** 供應商 networks 原文（不去截斷；信件／頁面預設顯示完整） */
export function trimOfficialNetworks(raw, max = 0) {
  const s = String(raw || "")
    .replace(/\|+$/g, "")
    .trim();
  if (!s) return "";
  if (!max || s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/**
 * 從 PNG／JPEG buffer 解讀 QR 文字（失敗回空字串）
 * 小圖／壓縮圖會再放大／灰階重試（純 JS，不依賴 sharp）
 */
export async function decodeQrFromImageBuffer(buf) {
  let base;
  try {
    base = decodeImageToRgba(buf);
  } catch {
    return "";
  }
  if (!base?.data?.length || !base.width || !base.height) return "";

  const attempts = [
    base,
    base.width < 800
      ? nearestUpscale(base.data, base.width, base.height, 800)
      : null,
    (() => {
      const grey = toGreyscale(base.data, base.width, base.height);
      return grey.width < 1000
        ? nearestUpscale(grey.data, grey.width, grey.height, 1000)
        : grey;
    })(),
  ];

  for (const frame of attempts) {
    if (!frame) continue;
    try {
      const code = jsQR(frame.data, frame.width, frame.height, {
        inversionAttempts: "attemptBoth",
      });
      if (code?.data) return String(code.data).trim();
    } catch {
      /* try next */
    }
  }
  return "";
}

async function decodeQrFromSrc(src) {
  if (!src) return "";
  try {
    let buf;
    if (src.startsWith("data:image/")) {
      const b64 = src.split(",")[1] || "";
      buf = Buffer.from(b64, "base64");
    } else if (src.startsWith("http")) {
      const res = await fetch(src, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) return "";
      buf = Buffer.from(await res.arrayBuffer());
    } else {
      return "";
    }
    return decodeQrFromImageBuffer(buf);
  } catch {
    return "";
  }
}

function buildInstallUrls(lpa) {
  if (!lpa) return { iosInstallUrl: "", androidInstallUrl: "" };
  const card = encodeURIComponent(lpa);
  return {
    iosInstallUrl: `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${card}`,
    androidInstallUrl: `https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${card}`,
  };
}

/**
 * 把供應商 topupDetail.result + 方案清單真實欄位整理成統一 profile
 * （僅透傳官方欄位；帳密／驗證類型沒有就不寫）
 */
export async function buildEsimProfileFromTopupDetail({
  productName,
  detailResult = {},
  planMeta = {},
  topupId = "",
} = {}) {
  const r = detailResult || {};
  const p = planMeta || {};

  const rawQr = firstString(r.qrcode, r.qr_code, r.QRCode, r.qrCode);
  let lpaInfo =
    parseLpaString(rawQr) ||
    parseLpaString(r.lpa) ||
    parseLpaString(r.LPA) ||
    parseLpaString(r.lpa_str) ||
    parseLpaString(r.activation_code) ||
    parseLpaString(r.ac) ||
    parseLpaString(r.code) ||
    parseLpaString(r.android_activation_code) ||
    parseLpaString(r.android_code) ||
    parseLpaString(r.androidActivationCode);

  const src = normalizeQrSrc(
    rawQr && rawQr.toUpperCase().startsWith("LPA:") ? "" : rawQr,
  );

  if (!lpaInfo && src) {
    const decoded = await decodeQrFromSrc(src);
    lpaInfo = parseLpaString(decoded);
  }

  const smdp = firstString(
    lpaInfo?.smdp,
    r.smdp,
    r.smdp_address,
    r.sm_dp,
    r.sm_dp_address,
    r.SMDP,
    r.SM_DP_Address,
  );
  const activationCode = firstString(
    lpaInfo?.activationCode,
    r.matching_id,
    r.matchingId,
    r.activation_code,
    r.activationCode,
    r.ac_token,
  );
  const lpa =
    lpaInfo?.lpa ||
    (smdp && activationCode ? `LPA:1$${smdp}$${activationCode}` : "");

  const iccid = firstString(
    r.iccid,
    r.ICCID,
    r.eid,
    r.EID,
    r.device_id,
    r.device_ids,
  );
  const androidCode = firstString(
    r.android_activation_code,
    r.android_code,
    r.androidActivationCode,
    lpa,
  );

  // APN：只取供應商／方案清單明文；不預設 CHAP、不補 SoftBank 帳密
  const apnName = firstString(r.apn, p.apn, r.APN, p.APN);
  const apnUser = firstString(
    r.apn_username,
    r.apn_user,
    p.apn_username,
    p.apn_user,
  );
  const apnPass = firstString(
    r.apn_password,
    r.apn_pass,
    p.apn_password,
    p.apn_pass,
  );
  const apnAuth = firstString(r.apn_auth, r.auth_type, p.apn_auth, p.auth_type);

  const apn = apnName
    ? {
        apn: apnName,
        username: apnUser,
        password: apnPass,
        // 僅在供應商有給、或已有帳密時才帶驗證類型
        auth: apnAuth || "",
      }
    : null;

  const setupNotes = firstString(
    r.special_desc,
    r.rule_desc,
    r.setup_notes,
    r.notes,
    p.special_desc,
    p.rule_desc,
    p.setup_notes,
    p.notes,
    p.remark,
  );

  const ruleDesc = firstString(r.rule_desc, p.rule_desc);
  const specialDesc = firstString(r.special_desc, p.special_desc);
  const dataAllowance = firstString(r.flow, r.data, p.flow, p.data);
  const serviceDays = firstString(r.day, r.days, p.day, p.days);
  const validityPeriod = firstString(
    r.validity_period,
    p.validity_period,
  );
  const networks = trimOfficialNetworks(
    firstString(r.networks, p.networks, p.operator, p.operator_list),
  );
  const exitIp = firstString(r.ip, p.ip);
  const planOfficialName = firstString(
    p.channel_dataplan_name,
    p.name,
    r.product_name,
    r.plan_name,
  );
  const planId = firstString(
    p.channel_dataplan_id,
    r.channel_dataplan_id,
    p.id,
  );

  const { iosInstallUrl, androidInstallUrl } = buildInstallUrls(lpa);

  let resolvedIccid = iccid;
  if (!resolvedIccid && src) {
    const m = String(src).match(/\/(\d{18,22})(?:\?|$)/);
    if (m) resolvedIccid = m[1];
  }

  return {
    name: productName || planOfficialName || "eSIM",
    src,
    topupId: String(topupId || r.topup_id || ""),
    planId,
    planOfficialName,
    iccid: resolvedIccid,
    smdp,
    activationCode,
    androidCode: androidCode || activationCode,
    lpa,
    apn,
    setupNotes,
    ruleDesc,
    specialDesc,
    dataAllowance,
    iosInstallUrl,
    androidInstallUrl,
    serviceDays,
    validityPeriod,
    networks,
    exitIp,
  };
}
