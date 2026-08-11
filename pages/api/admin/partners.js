import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSiteUrl } from "../../../lib/siteUrl";
import {
  sendPartnerApprovalEmail,
  mailErrorMessage,
} from "../../../lib/partnerApprovalEmail";
import {
  buildReferralShareUrl,
  DEFAULT_REFERRAL_RATE,
  normalizeReferralCode,
  allocateUniquePartnerCode,
  suggestCodeFromName,
} from "../../../lib/partnerReferral";
import { getSupabaseAdmin } from "../../../lib/partnerServer";
import { findAuthUserIdByEmail } from "../../../lib/partnerBind";
import { clampReferralDiscountPercent } from "../../../lib/partnerReferralDiscount";
import {
  generateReferralMedusaCode,
  reconcilePartnerDiscountPromotion,
} from "../../../lib/medusaPartnerPromotions";

async function resolvePartnerStoreDomain(partner) {
  const raw = String(partner.slug || partner.referral_code || "").trim();
  if (!raw) return null;
  // 店鋪 domain 可能含既有格式；推薦碼再做正規化
  const normalized = normalizeReferralCode(raw);
  return normalized || raw.toLowerCase();
}

/**
 * 確保夥伴有 stores 列，並設定 blog_custom_enabled
 * （連結夥伴也可開通文章；會建立／綁定輕量店鋪供 Blog 使用）
 */
async function setPartnerBlogEnabled(supabaseAdmin, partner, enabled) {
  const domain = await resolvePartnerStoreDomain(partner);
  if (!domain) {
    return { ok: false, error: "夥伴缺少 slug／推薦碼，無法開通文章" };
  }

  let authUserId = partner.auth_user_id || null;
  if (!authUserId && partner.email) {
    authUserId = await findAuthUserIdByEmail(supabaseAdmin, partner.email);
  }

  const { data: existing } = await supabaseAdmin
    .from("stores")
    .select("id, domain, blog_custom_enabled, user_id, status")
    .eq("domain", domain)
    .maybeSingle();

  if (!existing) {
    const { data: created, error: createErr } = await supabaseAdmin
      .from("stores")
      .insert([
        {
          domain,
          store_name: partner.name,
          status: "active",
          markup_rate: 20,
          user_id: authUserId,
          blog_custom_enabled: !!enabled,
        },
      ])
      .select("id, domain, blog_custom_enabled")
      .single();

    if (createErr) {
      return { ok: false, error: createErr.message };
    }
    return { ok: true, store: created, created: true };
  }

  const patch = { blog_custom_enabled: !!enabled };
  if (existing.status !== "active") patch.status = "active";
  if (authUserId && !existing.user_id) patch.user_id = authUserId;

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("stores")
    .update(patch)
    .eq("id", existing.id)
    .select("id, domain, blog_custom_enabled")
    .single();

  if (updErr) {
    return { ok: false, error: updErr.message };
  }
  return { ok: true, store: updated, created: false };
}

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({
      error: "伺服器未設定 SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    const { data, error } = await supabaseAdmin
      .from("partners")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const partners = data || [];
    const domains = [
      ...new Set(
        partners
          .map((p) => p.slug || p.referral_code)
          .filter(Boolean)
          .map(String),
      ),
    ];
    const partnerIds = partners.map((p) => p.id).filter(Boolean);

    let storeByDomain = {};
    if (domains.length) {
      const { data: stores } = await supabaseAdmin
        .from("stores")
        .select(
          "id, domain, store_name, blog_custom_enabled, status, logo_url, footer_phone, footer_email, updated_at",
        )
        .in("domain", domains);
      storeByDomain = Object.fromEntries(
        (stores || []).map((s) => [s.domain, s]),
      );
    }

    const bankByPartner = {};
    if (partnerIds.length) {
      let { data: banks, error: bankErr } = await supabaseAdmin
        .from("partner_bank_accounts")
        .select(
          "partner_id, payout_method, bank_name, account_name, account_number, payout_note, updated_at",
        )
        .in("partner_id", partnerIds);
      if (
        bankErr &&
        /payout_method|payout_note|column/i.test(bankErr.message || "")
      ) {
        ({ data: banks } = await supabaseAdmin
          .from("partner_bank_accounts")
          .select(
            "partner_id, bank_name, account_name, account_number, updated_at",
          )
          .in("partner_id", partnerIds));
        banks = (banks || []).map((b) => ({
          ...b,
          payout_method: "tw_bank",
          payout_note: "",
        }));
      }
      for (const b of banks || []) bankByPartner[b.partner_id] = b;
    }

    const enriched = partners.map((p) => {
      const key = p.slug || p.referral_code;
      const store = key ? storeByDomain[String(key)] : null;
      const bank = bankByPartner[p.id] || null;
      return {
        ...p,
        blog_custom_enabled: !!store?.blog_custom_enabled,
        store_id: store?.id || null,
        store_domain: store?.domain || null,
        store_name: store?.store_name || null,
        store_logo_url: store?.logo_url || null,
        store_phone: store?.footer_phone || null,
        store_contact_email: store?.footer_email || null,
        store_updated_at: store?.updated_at || null,
        bank,
        bank_updated_at: bank?.updated_at || null,
      };
    });

    return res.status(200).json({ partners: enriched });
  }

  if (req.method === "PATCH") {
    const {
      id,
      status,
      blog_custom_enabled,
      referral_rate,
      referral_discount_enabled,
      referral_discount_percent,
      regenerate_discount_code,
    } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: "缺少 id" });
    }

    const siteUrl = getSiteUrl(req);

    const { data: partner, error: fetchErr } = await supabaseAdmin
      .from("partners")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !partner) {
      return res.status(404).json({ error: "找不到夥伴資料" });
    }

    // ── 一鍵開通／關閉自訂文章 ──
    if (typeof blog_custom_enabled === "boolean" && status == null) {
      if (partner.status !== "active") {
        return res.status(400).json({
          error: "僅已開通夥伴可設定文章加值，請先批准該夥伴",
        });
      }
      const result = await setPartnerBlogEnabled(
        supabaseAdmin,
        partner,
        blog_custom_enabled,
      );
      if (!result.ok) {
        return res.status(500).json({ error: result.error });
      }
      return res.status(200).json({
        ok: true,
        blog_custom_enabled: !!result.store?.blog_custom_enabled,
        store: result.store,
        storeCreated: !!result.created,
        blogUrl: result.store?.domain
          ? `${siteUrl}/p/${result.store.domain}/blog/`
          : null,
        partner,
      });
    }

    // ── 調整專屬折扣碼連結：分潤趴數／折扣趴數／是否開放折扣／重新產生折扣碼
    //    （全部由管理者自訂，隨時可改；折扣碼一律是每位夥伴獨立的高熵亂數） ──
    const hasDiscountPatch =
      referral_rate !== undefined ||
      referral_discount_enabled !== undefined ||
      referral_discount_percent !== undefined ||
      regenerate_discount_code === true;

    if (hasDiscountPatch && status == null && typeof blog_custom_enabled !== "boolean") {
      if (partner.cooperation_model !== "referral") {
        return res.status(400).json({
          error: "僅『專屬折扣碼連結』夥伴可設定分潤／折扣趴數",
        });
      }

      const patch = {};
      if (referral_rate !== undefined) {
        const rate = Number(referral_rate);
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
          return res.status(400).json({ error: "分潤趴數需為 0-100 的數字" });
        }
        patch.referral_rate = rate;
      }
      if (referral_discount_enabled !== undefined) {
        patch.referral_discount_enabled = !!referral_discount_enabled;
      }
      if (referral_discount_percent !== undefined) {
        const percent = clampReferralDiscountPercent(referral_discount_percent);
        if (!percent) {
          return res.status(400).json({ error: "折扣趴數需為 1-50 的數字" });
        }
        patch.referral_discount_percent = percent;
      }

      // 是否需要重新產生折扣碼（首次開啟折扣尚無碼／管理者主動要求輪替）
      const willBeEnabled =
        referral_discount_enabled !== undefined
          ? !!referral_discount_enabled
          : partner.referral_discount_enabled !== false;
      const needsNewCode =
        regenerate_discount_code === true ||
        (willBeEnabled && !partner.referral_medusa_code);

      let oldCodeToRetire = null;
      if (needsNewCode) {
        if (regenerate_discount_code === true && partner.referral_medusa_code) {
          oldCodeToRetire = partner.referral_medusa_code;
        }
        patch.referral_medusa_code = generateReferralMedusaCode();
      }

      let updatedRows = null;
      let updateErr = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = await supabaseAdmin
          .from("partners")
          .update(patch)
          .eq("id", id)
          .select("*");
        updatedRows = result.data;
        updateErr = result.error;
        // 極低機率的亂數碼撞號：換一個新碼重試（unique index 衝突）
        if (
          updateErr &&
          needsNewCode &&
          /duplicate|unique/i.test(String(updateErr.message))
        ) {
          patch.referral_medusa_code = generateReferralMedusaCode();
          continue;
        }
        break;
      }

      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }

      const updatedPartner = updatedRows?.[0] || { ...partner, ...patch };

      // 重新產生時先停用舊碼，再讓 Medusa 端狀態與夥伴目前設定一致；
      // 管理者全程不需要手動進 Medusa 後台建碼／改碼。
      let medusaWarning = null;
      if (oldCodeToRetire) {
        await reconcilePartnerDiscountPromotion(admin.token, {
          ...updatedPartner,
          referral_medusa_code: oldCodeToRetire,
          referral_discount_enabled: false,
        }).catch(() => {});
      }
      const reconciled = await reconcilePartnerDiscountPromotion(
        admin.token,
        updatedPartner,
      );
      if (!reconciled.ok) {
        medusaWarning = `分潤／折扣設定已儲存，但 Medusa 折扣碼同步失敗：${reconciled.error}`;
      }

      return res.status(200).json({
        ok: true,
        partner: updatedPartner,
        warning: medusaWarning,
      });
    }

    if (!status) {
      return res.status(400).json({ error: "缺少 id 或 status" });
    }

    const wasPending = partner.status === "pending";
    const cooperationModel = partner.cooperation_model || "store";
    const isReferral = cooperationModel === "referral";

    const patch = { status };
    if (status === "active" && isReferral) {
      let code =
        normalizeReferralCode(partner.referral_code) ||
        normalizeReferralCode(partner.slug);
      if (!code) {
        code = await allocateUniquePartnerCode(supabaseAdmin, {
          preferredBase: suggestCodeFromName(partner.name),
          forReferral: true,
        });
      }
      patch.referral_code = code;
      if (!normalizeReferralCode(partner.slug)) {
        patch.slug = code;
      }
      if (
        partner.referral_rate == null ||
        Number(partner.referral_rate) === 20
      ) {
        patch.referral_rate = DEFAULT_REFERRAL_RATE;
      }
    }

    if (status === "active" && !partner.auth_user_id) {
      const authUserId = await findAuthUserIdByEmail(
        supabaseAdmin,
        partner.email,
      );
      if (authUserId) patch.auth_user_id = authUserId;
    }

    const { data: updatedRows, error: updateErr } = await supabaseAdmin
      .from("partners")
      .update(patch)
      .eq("id", id)
      .select("*");

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    const updatedPartner = updatedRows?.[0] || { ...partner, ...patch };

    // 夥伴狀態改變（批准／停用）時，讓其專屬折扣碼在 Medusa 的啟用狀態同步跟上：
    // 停用／退件的夥伴，其折扣碼應立即失效，即使代碼外流也無法折抵。
    if (isReferral && updatedPartner.referral_medusa_code) {
      await reconcilePartnerDiscountPromotion(admin.token, updatedPartner).catch(
        () => {},
      );
    }

    let storeCreated = false;
    if (status === "active" && !isReferral) {
      const { data: existingStore } = await supabaseAdmin
        .from("stores")
        .select("id, status")
        .eq("domain", partner.slug)
        .maybeSingle();

      if (!existingStore) {
        const { error: storeErr } = await supabaseAdmin.from("stores").insert([
          {
            domain: partner.slug,
            store_name: partner.name,
            status: "active",
            markup_rate: 20,
            user_id: updatedPartner.auth_user_id || null,
          },
        ]);
        if (storeErr) {
          return res.status(200).json({
            ok: true,
            warning: `夥伴已批准，但建立店鋪失敗：${storeErr.message}`,
            partner: updatedPartner,
            storeUrl: `${siteUrl}/p/${partner.slug}`,
            referralUrl: null,
          });
        }
        storeCreated = true;
      } else if (existingStore.status !== "active") {
        await supabaseAdmin
          .from("stores")
          .update({
            status: "active",
            store_name: partner.name,
            ...(updatedPartner.auth_user_id
              ? { user_id: updatedPartner.auth_user_id }
              : {}),
          })
          .eq("id", existingStore.id);
      } else if (updatedPartner.auth_user_id) {
        await supabaseAdmin
          .from("stores")
          .update({ user_id: updatedPartner.auth_user_id })
          .eq("id", existingStore.id)
          .is("user_id", null);
      }
    }

    let emailSent = false;
    let emailError = null;
    if (status === "active" && wasPending) {
      try {
        await sendPartnerApprovalEmail({
          partner: updatedPartner,
          siteUrl,
        });
        emailSent = true;
      } catch (err) {
        console.error("[partners] approval email failed:", err?.message || err);
        emailError = mailErrorMessage(err);
      }
    }

    const referralUrl =
      status === "active" && isReferral
        ? buildReferralShareUrl(
            siteUrl,
            updatedPartner.referral_code || updatedPartner.slug,
          )
        : null;

    return res.status(200).json({
      ok: true,
      partner: updatedPartner,
      storeCreated,
      emailSent,
      emailError,
      storeUrl:
        status === "active" && !isReferral
          ? `${siteUrl}/p/${partner.slug}`
          : null,
      referralUrl,
    });
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  return res.status(405).end("Method Not Allowed");
}
