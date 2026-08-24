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
 * @param {'ios'|'mac'|'android'|'windows'|'other'} os
 * @param {{ iosInstallUrl?: string, androidInstallUrl?: string }} urls
 */
export function pickInstallUrlForOs(os, urls = {}) {
  if (os === "ios") return String(urls.iosInstallUrl || "").trim();
  if (os === "android") return String(urls.androidInstallUrl || "").trim();
  return "";
}
