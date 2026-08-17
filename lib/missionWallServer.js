import {
  applyControlToMission,
  MOCK_MISSIONS,
} from "./missionWall";

export async function loadMissionOccupancy(supabase) {
  const { data, error } = await supabase
    .from("mission_applications")
    .select("mission_id, status");
  if (error) throw error;
  const counts = {};
  for (const row of data || []) {
    if (row.status === "rejected") continue;
    counts[row.mission_id] = (counts[row.mission_id] || 0) + 1;
  }
  return counts;
}

export async function loadMergedMissions(supabase) {
  const [{ data: controls, error: controlErr }, occupancy] = await Promise.all([
    supabase.from("mission_wall_controls").select("*"),
    loadMissionOccupancy(supabase),
  ]);
  if (controlErr) throw controlErr;
  const controlMap = Object.fromEntries(
    (controls || []).map((row) => [row.mission_id, row]),
  );
  return MOCK_MISSIONS.map((mission) =>
    applyControlToMission(
      mission,
      controlMap[mission.id] || null,
      occupancy[mission.id] || 0,
    ),
  );
}
