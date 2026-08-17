import { getSupabaseAdmin } from "../../../lib/refundAuth";
import { applyControlToMission, MOCK_MISSIONS } from "../../../lib/missionWall";
import { loadMergedMissions } from "../../../lib/missionWallServer";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(200).json({
      missions: MOCK_MISSIONS.map((m) => applyControlToMission(m, null, 0)),
    });
  }

  try {
    const missions = await loadMergedMissions(supabase);
    return res.status(200).json({ missions });
  } catch (err) {
    console.error("[promo/missions]", err);
    return res.status(200).json({
      missions: MOCK_MISSIONS.map((m) => applyControlToMission(m, null, 0)),
    });
  }
}
