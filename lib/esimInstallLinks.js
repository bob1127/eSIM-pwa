/**
 * eSIM 一鍵安裝連結（client／server 皆可；不含 sharp）
 */

const LPA_RE = /LPA:1\$([^$\s]+)\$([^$\s]+)/i;

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

export function buildInstallUrlsFromLpa(lpa) {
  const s = String(lpa || "").trim();
  if (!s) return { iosInstallUrl: "", androidInstallUrl: "" };
  const card = encodeURIComponent(s);
  return {
    iosInstallUrl: `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${card}`,
    androidInstallUrl: `https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${card}`,
  };
}

function looksOfficial(u) {
  return /esimsetup\.(apple|android)\.com/i.test(u) && /carddata=/i.test(u);
}

/**
 * 從 profile／訂單 qrcode 列組出官方安裝連結
 */
export function resolveInstallUrls(profile = {}) {
  const existingIos = String(profile.iosInstallUrl || "").trim();
  const existingAndroid = String(profile.androidInstallUrl || "").trim();

  let lpa = String(profile.lpa || "").trim();
  if (!lpa) {
    const parsed =
      parseLpaString(profile.androidCode) ||
      parseLpaString(profile.activationCode) ||
      parseLpaString(profile.qrcodeUrl) ||
      parseLpaString(profile.src);
    if (parsed) lpa = parsed.lpa;
  }
  if (!lpa) {
    const smdp = String(profile.smdp || "").trim();
    const code = String(
      profile.activationCode || profile.androidCode || "",
    ).trim();
    if (smdp && code) lpa = `LPA:1$${smdp}$${code}`;
  }

  const fromLpa = buildInstallUrlsFromLpa(lpa);
  return {
    lpa,
    iosInstallUrl: looksOfficial(existingIos)
      ? existingIos
      : fromLpa.iosInstallUrl,
    androidInstallUrl: looksOfficial(existingAndroid)
      ? existingAndroid
      : fromLpa.androidInstallUrl,
  };
}

/**
 * 補齊缺漏的 smdp／激活碼／LPA／一鍵安裝連結
 * （舊補單或供應商只回完整 LPA 時，畫面上會只看到 Android／LPA）
 */
export function hydrateEsimProfileFields(profile = {}) {
  const p = profile && typeof profile === "object" ? profile : {};
  const parsed =
    parseLpaString(p.lpa) ||
    parseLpaString(p.androidCode) ||
    parseLpaString(p.activationCode) ||
    parseLpaString(p.qrcodeUrl) ||
    parseLpaString(p.src);

  const smdp = String(p.smdp || parsed?.smdp || "").trim();
  const activationCode = String(
    p.activationCode || parsed?.activationCode || "",
  ).trim();
  const lpa =
    String(p.lpa || parsed?.lpa || "").trim() ||
    (smdp && activationCode ? `LPA:1$${smdp}$${activationCode}` : "");
  const androidCode = String(p.androidCode || lpa || "").trim();
  const urls = resolveInstallUrls({
    ...p,
    lpa,
    smdp,
    activationCode,
    androidCode,
  });

  return {
    ...p,
    smdp,
    activationCode,
    lpa,
    androidCode,
    iosInstallUrl: urls.iosInstallUrl,
    androidInstallUrl: urls.androidInstallUrl,
  };
}

/**
 * @param {'ios'|'mac'|'android'|'windows'|'other'} os
 * @param {{ iosInstallUrl?: string, androidInstallUrl?: string }} urls
 */
export function pickInstallUrlForOs(os, urls = {}) {
  if (os === "ios") return String(urls.iosInstallUrl || "").trim();
  if (os === "android") return String(urls.androidInstallUrl || "").trim();
  return "";
}
