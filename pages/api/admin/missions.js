import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSupabaseAdmin } from "../../../lib/refundAuth";
import { getMissionById } from "../../../lib/missionWall";
import { loadMergedMissions } from "../../../lib/missionWallServer";
import {
  mailErrorMessage,
  sendMissionReviewEmail,
} from "../../../lib/missionApplyEmail";

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: "伺服器設定不完整" });
  }

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    const status = String(req.query.status || "pending");
    try {
      const missions = await loadMergedMissions(supabase);
      let query = supabase
        .from("mission_applications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({
        missions,
        applications: data || [],
      });
    } catch (err) {
      console.error("[admin/missions GET]", err);
      return res.status(500).json({
        error: err.message || "讀取失敗",
        hint: "請先執行 supabase migration：20260817_mission_wall.sql",
      });
    }
  }

  if (req.method === "PATCH") {
    const body = req.body || {};

    if (body.mission_id && typeof body.is_open === "boolean") {
      const mission = getMissionById(body.mission_id);
      if (!mission) {
        return res.status(400).json({ error: "找不到此任務" });
      }
      const maxSlots =
        body.max_slots === "" || body.max_slots == null
          ? null
          : Number(body.max_slots);
      if (maxSlots != null && (!Number.isFinite(maxSlots) || maxSlots < 1)) {
        return res.status(400).json({ error: "名額請留空（不限）或填 1 以上" });
      }
      const { error } = await supabase.from("mission_wall_controls").upsert(
        {
          mission_id: body.mission_id,
          is_open: body.is_open,
          max_slots: maxSlots,
          closed_reason: String(body.closed_reason || "").trim() || null,
          updated_at: new Date().toISOString(),
          updated_by: admin.user?.email || null,
        },
        { onConflict: "mission_id" },
      );
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      const missions = await loadMergedMissions(supabase);
      return res.status(200).json({ success: true, missions });
    }

    if (body.application_id && (body.action === "approve" || body.action === "reject")) {
      const approved = body.action === "approve";
      const adminNote = String(body.admin_note || "").trim().slice(0, 1000);
      const { data: row, error: findErr } = await supabase
        .from("mission_applications")
        .select("*")
        .eq("id", body.application_id)
        .maybeSingle();
      if (findErr) return res.status(500).json({ error: findErr.message });
      if (!row) return res.status(404).json({ error: "找不到申請" });
      if (row.status !== "pending") {
        return res.status(409).json({ error: "此申請已審核過" });
      }

      const { error: updErr } = await supabase
        .from("mission_applications")
        .update({
          status: approved ? "approved" : "rejected",
          admin_note: adminNote || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin.user?.email || null,
        })
        .eq("id", row.id);
      if (updErr) return res.status(500).json({ error: updErr.message });

      try {
        await sendMissionReviewEmail({
          to: row.email,
          name: row.name,
          missionTitle: row.mission_title,
          approved,
          adminNote,
        });
      } catch (mailErr) {
        return res.status(200).json({
          success: true,
          warned: mailErrorMessage(mailErr),
        });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "缺少有效參數" });
  }

  res.setHeader("Allow", ["GET", "PATCH"]);
  return res.status(405).end("Method Not Allowed");
}
