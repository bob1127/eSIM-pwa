import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "./supabaseClient";
import { getOrLinkPartnerStore } from "./partnerStoreHelper";
import {
  normalizePartnerEmail,
  partnerLoginBlockMessage,
} from "./partnerUtils";
import { isSettledOrderStatus } from "./refundPolicy";

export { normalizePartnerEmail, partnerLoginBlockMessage } from "./partnerUtils";

export { SITE_URL } from "./seo.config";

/** 依 email 查 partners；若有多筆，優先回傳 active（僅 client 直查，登入請用 verifyPartnerAccess） */
export async function fetchPartnerByEmail(email, client = supabase) {
  const normalized = normalizePartnerEmail(email);
  if (!normalized) return null;

  const { data: partnerRows, error } = await client
    .from("partners")
    .select(
      "id, name, slug, email, status, created_at, cooperation_model, referral_code, referral_rate, auth_user_id, line_user_id",
    )
    .ilike("email", normalized)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !partnerRows?.length) return null;
  return partnerRows.find((r) => r.status === "active") || partnerRows[0];
}

/** 透過 API 驗證；若 API 尚未部署則 fallback 至 client 查詢（支援重複 email） */
export async function verifyPartnerAccess() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { ok: false, code: "NO_SESSION", message: "請先登入" };
  }

  try {
    const res = await fetch("/api/partner/verify-access", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      return res.json();
    }
  } catch {
    /* API 未部署或網路錯誤 → 使用 client fallback */
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "NO_SESSION", message: "請先登入" };
  }

  const partner = await fetchPartnerByEmail(user.email);
  if (!partner || partner.status !== "active") {
    return {
      ok: false,
      code: partner ? "NOT_ACTIVE" : "NOT_FOUND",
      message: partnerLoginBlockMessage(partner),
      partner: partner || null,
      store: null,
    };
  }

  const store = await getOrLinkPartnerStore(user.id, user.email);
  return { ok: true, partner, store };
}

/**
 * 合作夥伴後台專用 Auth Hook
 * 與一般會員 /account 完全分離，只允許 partners 表 active 用戶進入
 */
export function usePartnerSession({ redirect = true } = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [store, setStore] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!authUser) {
          if (redirect) router.replace("/partner/login");
          return;
        }

        const access = await verifyPartnerAccess();

        if (!access?.ok) {
          if (redirect) {
            router.replace("/partner/login?error=not_partner");
          }
          return;
        }

        if (cancelled) return;

        setUser(authUser);
        setPartner(access.partner);
        setStore(access.store);
      } catch (err) {
        console.error("[usePartnerSession]", err);
        if (!cancelled && redirect) {
          router.replace("/partner/login");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [redirect, router]);

  return { loading, user, partner, store, setStore };
}

export async function fetchPartnerStats(partnerId, storeId) {
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  const valid = (orders || []).filter((o) => isSettledOrderStatus(o.status));

  const totalProfit = valid.reduce(
    (sum, o) => sum + (Number(o.partner_profit) || 0),
    0,
  );
  const totalRevenue = valid.reduce(
    (sum, o) => sum + (Number(o.total_amount) || 0),
    0,
  );
  const totalCost = valid.reduce(
    (sum, o) => sum + (Number(o.b2b_cost) || 0),
    0,
  );

  let productCount = 0;
  if (storeId) {
    const { count } = await supabase
      .from("store_products")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId);
    productCount = count || 0;
  }

  return {
    orders: orders || [],
    validOrders: valid,
    totalProfit,
    totalRevenue,
    totalCost,
    orderCount: valid.length,
    productCount,
  };
}

export async function partnerLogout(router) {
  await supabase.auth.signOut();
  router.push("/partner/login");
}
