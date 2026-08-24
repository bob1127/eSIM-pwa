"use client";
import { useState, useEffect, useCallback } from "react";
import Layout from "../Layout";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

const SECRET = process.env.NEXT_PUBLIC_CHAT_LOGS_SECRET || "";

const ROLE_COLOR = {
  user: "bg-blue-100 text-blue-700",
  ai: "bg-emerald-100 text-emerald-700",
  agent: "bg-amber-100 text-amber-700",
};

const PROVIDER_LABEL = {
  groq: "Groq",
  "gemini-vision": "Gemini 視覺",
  "gemini-advanced": "Gemini 進階",
  preset: "預設",
  human: "真人",
};

export default function AdminChatLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [backupNote, setBackupNote] = useState(null);
  const [oldest, setOldest] = useState(null);
  const [deleteMonth, setDeleteMonth] = useState("3");
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchLogs = useCallback(async () => {
    if (!SECRET) {
      alert("未設定 NEXT_PUBLIC_CHAT_LOGS_SECRET，無法載入聊天紀錄");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        secret: SECRET,
        page: String(page),
        limit: String(limit),
        ...(q ? { q } : {}),
      });
      const res = await fetch(`/api/admin/chat-logs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setBackupNote(data.backupNote || null);
      setOldest(data.oldest || null);
    } catch (e) {
      alert("載入失敗：" + e.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, q]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setQ(searchInput);
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      secret: SECRET,
      export: "csv",
      ...(q ? { q } : {}),
    });
    window.open(`/api/admin/chat-logs?${params}`, "_blank");
  };

  const handleDeleteOld = async () => {
    const months = parseInt(deleteMonth, 10) || 3;
    const before = new Date();
    before.setMonth(before.getMonth() - months);
    const beforeStr = before.toISOString().slice(0, 10);

    if (
      !confirm(
        `確定刪除 ${beforeStr} 之前的所有對話紀錄嗎？\n建議先匯出 CSV 備份！`
      )
    )
      return;

    setDeleteStatus("deleting");
    try {
      const res = await fetch(
        `/api/admin/chat-logs?secret=${SECRET}&before=${beforeStr}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (res.ok) {
        setDeleteStatus(`已刪除 ${data.deleted} 筆`);
        fetchLogs();
      } else {
        setDeleteStatus("刪除失敗：" + data.error);
      }
    } catch (e) {
      setDeleteStatus("刪除失敗：" + e.message);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        {/* 標題 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">J寶 對話紀錄</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              共 {total.toLocaleString()} 筆
              {oldest && (
                <span className="ml-1">・最早：{oldest.slice(0, 10)}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            ↓ 匯出 CSV
          </button>
        </div>

        {/* 備份提醒橫幅 */}
        {backupNote && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-bold mb-0.5">建議備份並清理舊資料</p>
              <p>{backupNote}</p>
            </div>
          </div>
        )}

        {/* 搜尋 + 刪除 */}
        <div className="flex flex-wrap gap-3 mb-5">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜尋對話內容..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700"
            >
              搜尋
            </button>
          </form>

          {/* 刪除舊資料 */}
          <div className="flex items-center gap-2">
            <select
              value={deleteMonth}
              onChange={(e) => setDeleteMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none"
            >
              {["1", "2", "3", "6", "12"].map((m) => (
                <option key={m} value={m}>
                  {m} 個月前
                </option>
              ))}
            </select>
            <button
              onClick={handleDeleteOld}
              className="px-3 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors"
            >
              🗑 刪除舊資料
            </button>
            {deleteStatus && (
              <span className="text-xs text-slate-500">{deleteStatus}</span>
            )}
          </div>
        </div>

        {/* 資料表 */}
        {loading ? (
          <LoadingIndicator layout="center" label="載入中…" className="py-16" />
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            {q ? "找不到相關紀錄" : "尚無對話紀錄"}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-slate-500 font-semibold w-[130px]">時間</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-semibold w-[70px]">身份</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-semibold w-[80px]">模型</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-semibold">內容</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-semibold w-[90px]">Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const preview = log.content.length > 80 && !isExpanded
                    ? log.content.slice(0, 80) + "…"
                    : log.content;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                        {log.created_at?.slice(0, 16).replace("T", " ")}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            ROLE_COLOR[log.role] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {log.role === "user" ? "用戶" : log.role === "ai" ? "J寶" : "客服"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">
                        {PROVIDER_LABEL[log.provider] || log.provider || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        <span
                          className="cursor-pointer"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : log.id)
                          }
                        >
                          {preview}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs font-mono truncate max-w-[90px]">
                        {(log.session_id || "").slice(0, 8)}…
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 分頁 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-slate-100"
            >
              ← 上一頁
            </button>
            <span className="text-sm text-slate-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-slate-100"
            >
              下一頁 →
            </button>
          </div>
        )}

        {/* 備份說明 */}
        <div className="mt-8 bg-white rounded-xl border border-gray-100 p-5 text-sm text-slate-600">
          <p className="font-bold text-slate-800 mb-2">📦 對話紀錄管理建議</p>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>建議每 <strong>1～3 個月</strong> 按上方「匯出 CSV」備份一次，存入本機或 Google Drive。</li>
            <li>備份後，使用「刪除舊資料」清掉 3 個月前的紀錄，減少 Supabase 儲存量。</li>
            <li>CSV 可用 Excel 開啟（已加 BOM），方便搜尋 J寶 常答錯的問題，手動整理 FAQ。</li>
            <li>免費方案 Supabase 限制 500 MB，每筆紀錄約 500 bytes，500 MB ≈ <strong>100 萬筆</strong>，平常使用量不用太擔心。</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
