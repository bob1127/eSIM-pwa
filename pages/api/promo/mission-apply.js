import { getSupabaseAdmin } from "../../../lib/refundAuth";
import { getMissionById, MISSION_IDENTITY_TYPES } from "../../../lib/missionWall";
import { loadMergedMissions } from "../../../lib/missionWallServer";
import {
  mailErrorMessage,
  notifySupportNewMissionApply,
  sendMissionApplyReceivedEmail,
} from "../../../lib/missionApplyEmail";
import { resolveMemberEmail } from "../push/_memberAuth";
import { getMemberLineFriendStatus, LINE_OA_URL } from "../../../lib/lineOaFriends";

function cleanStr(v, max = 500) {
  if (v == null) return null;
  return String(v).trim().slice(0, max) || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: "伺服器設定不完整" });
  }

  const body = req.body || {};
  const mission = getMissionById(body.missionId);
  if (!mission) {
    return res.status(400).json({ error: "找不到此任務" });
  }

  const email = cleanStr(body.email, 200);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "請填寫有效的 Email" });
  }
  const name = cleanStr(body.applicantName, 120);
  const company = cleanStr(body.company, 200);
  const phone = cleanStr(body.phone, 30);
  if (!name || !company || !phone) {
    return res.status(400).json({ error: "請填寫公司／頻道、姓名與電話" });
  }
  const confirmedAfterLine =
    body.confirmedAfterLineRedirect === true || body.joinedLine === "yes";
  if (!confirmedAfterLine) {
    let isFriend = false;
    try {
      const member = await resolveMemberEmail(req, res);
      if (member) {
        const lineStatus = await getMemberLineFriendStatus(supabase, member);
        isFriend = Boolean(lineStatus?.isFriend);
      }
    } catch (err) {
      console.warn(
        "[promo/mission-apply] line friend check",
        err?.message || err,
      );
    }
    if (!isFriend) {
      return res.status(403).json({
        error: "請先加入官方 LINE，加完後回到此頁再送出申請。",
        need_line_friend: true,
        line_oa_url: LINE_OA_URL,
      });
    }
  }

  const partnerType = cleanStr(body.partnerType, 50);
  const identity = MISSION_IDENTITY_TYPES.find((t) => t.value === partnerType);
  if (!identity) {
    return res.status(400).json({ error: "請選擇合作身份" });
  }
  const identityLabel =
    partnerType === "other"
      ? `其他（${cleanStr(body.partnerTypeOther, 80) || "未填"}）`
      : identity.label;

  try {
    const merged = await loadMergedMissions(supabase);
    const live = merged.find((m) => m.id === mission.id);
    if (!live?.isOpen) {
      const msg =
        live?.applyState === "full"
          ? "此任務已額滿，暫停接受申請。"
          : "此任務目前未開放申請。";
      return res.status(409).json({ error: msg, applyState: live?.applyState });
    }

    const { data: dup } = await supabase
      .from("mission_applications")
      .select("id, status")
      .eq("mission_id", mission.id)
      .ilike("email", email.toLowerCase())
      .in("status", ["pending", "approved"])
      .limit(1)
      .maybeSingle();
    if (dup) {
      return res.status(409).json({
        error:
          dup.status === "approved"
            ? "此 Email 已通過此任務，無需重複申請。"
            : "此 Email 已有一筆審核中的申請。",
      });
    }

    const payload = cleanStr(body.payload, 4000) || "";
    const row = {
      mission_id: mission.id,
      mission_title: mission.title,
      partner_type: partnerType,
      partner_type_label: identityLabel,
      company,
      name,
      email: email.toLowerCase(),
      phone,
      line_id: cleanStr(body.lineId, 80),
      resource_note: cleanStr(body.resourceNote, 2000),
      payload,
      status: "pending",
    };

    const { data, error } = await supabase
      .from("mission_applications")
      .insert([row])
      .select("id, created_at")
      .single();
    if (error) {
      console.error("[promo/mission-apply]", error);
      return res.status(500).json({ error: "提交失敗，請稍後再試" });
    }

    try {
      await sendMissionApplyReceivedEmail({
        to: row.email,
        name: row.name,
        missionTitle: mission.title,
      });
    } catch (mailErr) {
      console.warn("[promo/mission-apply] applicant mail", mailErrorMessage(mailErr));
    }
    try {
      await notifySupportNewMissionApply({
        missionTitle: mission.title,
        name: row.name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        identityLabel,
      });
    } catch (mailErr) {
      console.warn("[promo/mission-apply] support mail", mailErrorMessage(mailErr));
    }

    return res.status(200).json({
      success: true,
      id: data.id,
      message: "申請已送出，審核結果將以 Email 通知。",
    });
  } catch (err) {
    console.error("[promo/mission-apply]", err);
    return res.status(500).json({ error: "提交失敗，請稍後再試" });
  }
}
