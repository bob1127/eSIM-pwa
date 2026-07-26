import { createClient } from "@supabase/supabase-js";
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

const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({
      error: "伺服器未設定 SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("partners")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ partners: data || [] });
  }

  if (req.method === "PATCH") {
    const { id, status } = req.body || {};
    if (!id || !status) {
      return res.status(400).json({ error: "缺少 id 或 status" });
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
      if (partner.referral_rate == null) {
        patch.referral_rate = DEFAULT_REFERRAL_RATE;
      }
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
            user_id: null,
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
          .update({ status: "active", store_name: partner.name })
          .eq("id", existingStore.id);
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
