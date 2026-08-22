"use client";

import { useEffect, useState } from "react";
import { bossFetch } from "@/lib/bossAdminClient";
import { APPLY_STATE_COPY } from "@/lib/missionWall";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

const STATUS_LABEL = {
  pending: "待審核",
  approved: "已通過",
  rejected: "未通過",
};

export default function AdminMissionsPanel() {
  const [missions, setMissions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState("");
  const [noteById, setNoteById] = useState({});
  const [slotDraft, setSlotDraft] = useState({});

  const load = async (status = filter) => {
    setLoading(true);
    try {
      const data = await bossFetch(`/api/admin/missions?status=${status}`);
      setMissions(data.missions || []);
      setApplications(data.applications || []);
      const slots = {};
      for (const m of data.missions || []) {
        slots[m.id] = m.maxSlots == null ? "" : String(m.maxSlots);
      }
      setSlotDraft(slots);
    } catch (err) {
      setToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const saveControl = async (mission, isOpen) => {
    setBusyId(mission.id);
    setToast("");
    try {
      const data = await bossFetch("/api/admin/missions", {
        method: "PATCH",
        body: JSON.stringify({
          mission_id: mission.id,
          is_open: isOpen,
          max_slots: slotDraft[mission.id],
        }),
      });
      if (data.missions) setMissions(data.missions);
      setToast(isOpen ? `已開啟「${mission.title}」` : `已關閉「${mission.title}」`);
    } catch (err) {
      setToast(err.message);
    } finally {
      setBusyId("");
    }
  };

  const review = async (row, action) => {
    setBusyId(`app-${row.id}`);
    setToast("");
    try {
      const data = await bossFetch("/api/admin/missions", {
        method: "PATCH",
        body: JSON.stringify({
          application_id: row.id,
          action,
          admin_note: noteById[row.id] || "",
        }),
      });
      setToast(
        data.warned
          ? `已更新狀態，但信件未寄出：${data.warned}`
          : action === "approve"
            ? "已通過並寄出 Email"
            : "已拒絕並寄出 Email",
      );
      await load(filter);
    } catch (err) {
      setToast(err.message);
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-6">
      {toast ? (
        <p className="text-sm bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-700">
          {toast}
        </p>
      ) : null}

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-800">任務開關與名額</h2>
          <p className="text-xs text-slate-500 mt-1">
            關閉後前台會顯示「暫停申請」；名額留空＝不限。額滿自動停止。
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {missions.map((m) => {
            const copy = APPLY_STATE_COPY[m.applyState] || APPLY_STATE_COPY.paused;
            const controlOpen = m.applyState === "open" || m.applyState === "full";
            return (
              <div
                key={m.id}
                className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800">{m.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    前台狀態：{copy.cta}
                    {m.maxSlots != null
                      ? `｜名額 ${m.occupiedCount}/${m.maxSlots}`
                      : `｜目前申請 ${m.occupiedCount}（不限名額）`}
                  </p>
                </div>
                <label className="text-xs text-slate-500 font-bold flex items-center gap-2">
                  名額
                  <input
                    type="number"
                    min="1"
                    placeholder="不限"
                    value={slotDraft[m.id] ?? ""}
                    onChange={(e) =>
                      setSlotDraft((prev) => ({ ...prev, [m.id]: e.target.value }))
                    }
                    className="w-20 h-9 rounded-lg border border-slate-200 px-2 text-sm"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === m.id}
                    onClick={() => saveControl(m, true)}
                    className={`h-9 px-3 rounded-lg text-xs font-black ${
                      controlOpen && m.applyState !== "paused"
                        ? "bg-[#1a56db] text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    開啟
                  </button>
                  <button
                    type="button"
                    disabled={busyId === m.id}
                    onClick={() => saveControl(m, false)}
                    className="h-9 px-3 rounded-lg text-xs font-black border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    關閉
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <h2 className="text-sm font-black text-slate-800">申請審核</h2>
          <div className="flex gap-1">
            {["pending", "approved", "rejected", "all"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`h-8 px-3 rounded-full text-[11px] font-bold ${
                  filter === s
                    ? "bg-[#1a56db] text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {s === "all" ? "全部" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingIndicator layout="center" label="載入中…" className="px-5 py-10" />
        ) : applications.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-400 text-center">
            這個篩選目前沒有申請。
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {applications.map((row) => (
              <li key={row.id} className="px-5 py-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-slate-800">
                      {row.mission_title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {row.name} ｜ {row.email} ｜ {row.phone || "-"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {row.partner_type_label || row.partner_type} ｜{" "}
                      {row.company || "-"} ｜ LINE {row.line_id || "-"}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {STATUS_LABEL[row.status] || row.status}
                  </span>
                </div>
                {row.resource_note ? (
                  <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
                    {row.resource_note}
                  </p>
                ) : null}
                {row.status === "pending" ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={noteById[row.id] || ""}
                      onChange={(e) =>
                        setNoteById((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      placeholder="審核備註（會寫進通知信，可留空）"
                      className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-xs"
                    />
                    <button
                      type="button"
                      disabled={busyId === `app-${row.id}`}
                      onClick={() => review(row, "approve")}
                      className="h-9 px-4 rounded-lg bg-[#067A38] text-white text-xs font-black"
                    >
                      通過並通知
                    </button>
                    <button
                      type="button"
                      disabled={busyId === `app-${row.id}`}
                      onClick={() => review(row, "reject")}
                      className="h-9 px-4 rounded-lg bg-slate-700 text-white text-xs font-black"
                    >
                      未過並通知
                    </button>
                  </div>
                ) : row.admin_note ? (
                  <p className="text-[11px] text-slate-400">備註：{row.admin_note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
