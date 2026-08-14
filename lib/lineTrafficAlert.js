import { fetchEsimsByLineUserId, fetchMemberEsims } from "./memberEsims";

/**
 * 寫入／更新 LINE 流量監控（會員訂單或 ICCID）
 */
export async function upsertLineTrafficAlert(admin, row) {
  if (!admin || !row?.line_user_id) {
    return { ok: false, error: "missing_line_user" };
  }
  if (!row.topup_id && !row.iccid) {
    return { ok: false, error: "missing_target" };
  }

  const now = new Date().toISOString();
  const payload = {
    line_user_id: String(row.line_user_id),
    topup_id: row.topup_id || null,
    iccid: row.iccid || null,
    product_label: row.product_label || null,
    order_id: row.order_id || null,
    guest_email: row.guest_email || null,
    monitor_enabled: true,
    updated_at: now,
  };

  // 省推播費用：同一 LINE 同時只監控一張卡
  await admin
    .from("line_traffic_alerts")
    .update({ monitor_enabled: false, updated_at: now })
    .eq("line_user_id", payload.line_user_id);

  if (payload.topup_id) {
    const { error } = await admin.from("line_traffic_alerts").upsert(payload, {
      onConflict: "line_user_id,topup_id",
    });
    if (!error) return { ok: true, productName: payload.product_label };
  }

  if (payload.iccid) {
    const { data: existing } = await admin
      .from("line_traffic_alerts")
      .select("id")
      .eq("line_user_id", payload.line_user_id)
      .eq("iccid", payload.iccid)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await admin
        .from("line_traffic_alerts")
        .update(payload)
        .eq("id", existing.id);
      if (!error) return { ok: true, productName: payload.product_label };
      return { ok: false, error: error.message };
    }
  }

  const { error: insertErr } = await admin
    .from("line_traffic_alerts")
    .insert(payload);

  if (insertErr) {
    return { ok: false, error: insertErr.message };
  }
  return { ok: true, productName: payload.product_label };
}

export async function enableLineTrafficAlertForEsim(
  admin,
  lineUserId,
  esim,
  guestEmail,
) {
  if (!esim?.topupId && !esim?.iccid) {
    return { ok: false, error: "no_esim" };
  }
  return upsertLineTrafficAlert(admin, {
    line_user_id: lineUserId,
    topup_id: esim.topupId || null,
    iccid: esim.iccid || null,
    product_label: esim.productName || null,
    order_id: esim.orderId || null,
    guest_email: guestEmail || null,
  });
}

/** 僅在剛好一張卡時自動開監控；多張須到 LIFF 頁選擇 */
export async function enableLineTrafficAlertForLineUser(admin, lineUserId) {
  const esims = await fetchEsimsByLineUserId(lineUserId);
  if (!esims.length) {
    return { ok: false, code: "no_order" };
  }
  if (esims.length > 1) {
    return { ok: false, code: "need_select", esimCount: esims.length };
  }
  const target = esims[0];
  const guestEmail =
    target.customerEmail ||
    (await lookupLinkedEmail(admin, lineUserId)) ||
    null;
  const result = await enableLineTrafficAlertForEsim(
    admin,
    lineUserId,
    target,
    guestEmail,
  );
  return {
    ...result,
    productName: target.productName || result.productName,
  };
}

/** 綁定後：只有一張才自動開；多張留給使用者在提醒頁選 */
export async function enableLineTrafficAlertForMemberEmail(
  admin,
  lineUserId,
  email,
) {
  if (!email) return { ok: false, code: "no_email" };
  const esims = await fetchMemberEsims(email);
  if (!esims.length) {
    return { ok: false, code: "no_order" };
  }
  if (esims.length > 1) {
    return { ok: false, code: "need_select", esimCount: esims.length };
  }
  return enableLineTrafficAlertForEsim(
    admin,
    lineUserId,
    esims[0],
    String(email).toLowerCase(),
  );
}

export async function lookupLinkedEmail(admin, lineUserId) {
  const { data } = await admin
    .from("line_account_links")
    .select("email")
    .eq("line_user_id", String(lineUserId))
    .maybeSingle();
  return data?.email || null;
}

export async function listLineUserEsims(lineUserId) {
  return fetchEsimsByLineUserId(lineUserId);
}

export async function getActiveLineTrafficAlert(admin, lineUserId) {
  if (!admin || !lineUserId) return null;
  const { data } = await admin
    .from("line_traffic_alerts")
    .select("topup_id, iccid, product_label, monitor_enabled")
    .eq("line_user_id", String(lineUserId))
    .eq("monitor_enabled", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

export async function resolveLineUserIdFromMemberLink(admin, email) {
  if (!admin || !email) return null;
  const { data } = await admin
    .from("line_account_links")
    .select("line_user_id")
    .ilike("email", String(email).trim())
    .maybeSingle();
  return data?.line_user_id || null;
}
