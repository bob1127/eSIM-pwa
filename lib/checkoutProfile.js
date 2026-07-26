/**
 * 結帳表單預填：合併 NextAuth（LINE 等社群）、Supabase（Email 密碼／OAuth）、
 * 以及本機「儲存資料以便下次快速結帳」設定。
 */

export const CHECKOUT_PROFILE_KEY = "jeko_checkout_profile";

function pickStr(...candidates) {
  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (s) return s;
  }
  return "";
}

/** 從各種登入來源抽出可填入結帳欄位的資料 */
export function extractCheckoutIdentity({
  supabaseUser = null,
  nextAuthUser = null,
  legacyLocalUser = null,
} = {}) {
  const meta = supabaseUser?.user_metadata || {};
  const email = pickStr(
    supabaseUser?.email,
    nextAuthUser?.email,
    legacyLocalUser?.email,
  );
  const name = pickStr(
    meta.full_name,
    meta.name,
    meta.display_name,
    nextAuthUser?.name,
    legacyLocalUser?.name,
    legacyLocalUser?.full_name,
  );
  const phone = pickStr(
    meta.phone,
    meta.mobile,
    supabaseUser?.phone,
    nextAuthUser?.phone,
    legacyLocalUser?.phone,
  );

  const id = pickStr(
    supabaseUser?.id,
    nextAuthUser?.id,
    legacyLocalUser?.id,
  );

  return {
    id: id || null,
    email,
    name,
    phone,
    city: pickStr(meta.checkout_city, legacyLocalUser?.city),
    address: pickStr(meta.checkout_address, legacyLocalUser?.address),
    postalCode: pickStr(
      meta.checkout_postal_code,
      legacyLocalUser?.postalCode,
      legacyLocalUser?.postal_code,
    ),
    image: pickStr(meta.avatar_url, nextAuthUser?.image, legacyLocalUser?.image),
    source: supabaseUser
      ? "supabase"
      : nextAuthUser
        ? "nextauth"
        : legacyLocalUser
          ? "legacy"
          : null,
  };
}

export function loadSavedCheckoutProfile() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHECKOUT_PROFILE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return {
      name: pickStr(data.name),
      email: pickStr(data.email),
      phone: pickStr(data.phone),
      country: pickStr(data.country) || "Taiwan",
      city: pickStr(data.city),
      address: pickStr(data.address),
      postalCode: pickStr(data.postalCode, data.postal_code),
      newsOffers: data.newsOffers !== false,
    };
  } catch {
    return null;
  }
}

export function saveCheckoutProfile(formData) {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      name: pickStr(formData.name),
      email: pickStr(formData.email),
      phone: pickStr(formData.phone),
      country: pickStr(formData.country) || "Taiwan",
      city: pickStr(formData.city),
      address: pickStr(formData.address),
      postalCode: pickStr(formData.postalCode),
      newsOffers: formData.newsOffers !== false,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(CHECKOUT_PROFILE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

/**
 * 合併身分資料 + 本機儲存：只填目前仍空白的欄位，避免覆蓋使用者已輸入內容。
 */
export function mergeCheckoutForm(prev, patches = []) {
  const next = { ...prev };
  let changed = false;
  for (const patch of patches) {
    if (!patch) continue;
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") continue;
      if (typeof next[key] === "boolean") continue;
      if (String(next[key] || "").trim()) continue;
      next[key] = value;
      changed = true;
    }
  }
  return changed ? next : prev;
}

export function buildCheckoutAutofillPatches({
  supabaseUser,
  nextAuthUser,
  legacyLocalUser,
} = {}) {
  const identity = extractCheckoutIdentity({
    supabaseUser,
    nextAuthUser,
    legacyLocalUser,
  });
  const saved = loadSavedCheckoutProfile();

  const identityPatch = {
    email: identity.email,
    name: identity.name,
    phone: identity.phone,
    city: identity.city,
    address: identity.address,
    postalCode: identity.postalCode,
  };

  return {
    identity,
    patches: [saved, identityPatch].filter(Boolean),
  };
}
