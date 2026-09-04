"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import Layout from "../Layout";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import BossInlineLogin from "@/components/account/BossInlineLogin";
import { QuarterRing } from "@/components/ui/QuarterRing";
import {
  bossFetch,
  clearBossSession,
  getBossEmail,
  getBossToken,
} from "@/lib/bossAdminClient";

const emptyForm = {
  id: null,
  question: "",
  answer: "",
  keywords: "",
  source_note: "",
  enabled: true,
  sort_order: 0,
};

export default function AdminAiFaqPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState("");
  const [scanDays, setScanDays] = useState("14");
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState({});
  const [scanMeta, setScanMeta] = useState(null);

  useEffect(() => {
    const token = getBossToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }
    fetch("/api/admin/session", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          setAdminEmail(data.user?.email || getBossEmail() || "");
        } else {
          clearBossSession();
        }
      })
      .finally(() => setAuthChecking(false));
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setToast("");
    try {
      const data = await bossFetch("/api/admin/ai-faq?all=1");
      setEntries(data.entries || []);
    } catch (e) {
      setToast(e.message || "載入失敗");
      if (e.code === "UNAUTHORIZED") setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchEntries();
  }, [isAuthenticated, fetchEntries]);

  // 從聊天紀錄「加入 FAQ」帶入單筆
  useEffect(() => {
    const id = router.query?.fromUserLog;
    if (!id || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await bossFetch(
          `/api/admin/ai-faq?userLogId=${encodeURIComponent(String(id))}`,
        );
        if (cancelled || !data.candidate) return;
        setForm({
          id: null,
          question: data.candidate.question || "",
          answer: data.candidate.answer || "",
          keywords: "",
          source_note: data.candidate.source_note || "",
          enabled: false,
          sort_order: 0,
        });
        setToast("已從聊天紀錄載入，請檢查後按「新增」（預設停用草稿）");
        router.replace("/admin/ai-faq/", undefined, { shallow: true });
      } catch (err) {
        if (!cancelled) {
          setToast(err.message || "無法從該則紀錄配對 AI 回覆");
          if (err.code === "UNAUTHORIZED") setIsAuthenticated(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.query?.fromUserLog, isAuthenticated, router]);

  const scanFromLogs = async () => {
    setScanning(true);
    setToast("");
    try {
      const data = await bossFetch(
        `/api/admin/ai-faq?fromLogs=1&days=${encodeURIComponent(scanDays)}&limit=40`,
      );
      const list = data.candidates || [];
      setCandidates(list);
      setScanMeta({
        days: data.days,
        scannedUsers: data.scannedUsers,
      });
      const next = {};
      list.forEach((_, i) => {
        next[i] = true;
      });
      setSelected(next);
      setToast(
        list.length
          ? `找到 ${list.length} 組可匯入（已略過重複／短句）`
          : "這段期間沒有可匯入的新提問（或都已在知識庫）",
      );
    } catch (err) {
      setToast(err.message || "掃描失敗");
      if (err.code === "UNAUTHORIZED") setIsAuthenticated(false);
    } finally {
      setScanning(false);
    }
  };

  const importSelected = async ({ enableOnImport = false } = {}) => {
    const items = candidates.filter((_, i) => selected[i]);
    if (!items.length) {
      setToast("請至少勾選一筆");
      return;
    }
    if (
      !window.confirm(
        enableOnImport
          ? `將匯入 ${items.length} 筆並立即啟用給 J寶？建議先以草稿匯入後人工改答案。`
          : `將匯入 ${items.length} 筆為「草稿（停用）」？審核後再開啟即可讓 J寶 使用。`,
      )
    ) {
      return;
    }
    setImporting(true);
    setToast("");
    try {
      const data = await bossFetch("/api/admin/ai-faq", {
        method: "POST",
        body: JSON.stringify({
          action: "importFromLogs",
          enableOnImport,
          items: items.map((c) => ({
            question: c.question,
            answer: c.answer,
            source_note: c.source_note,
          })),
        }),
      });
      setToast(
        `已匯入 ${data.imported} 筆${data.asDraft ? "（草稿／停用，請審核後啟用）" : "（已啟用）"}`,
      );
      setCandidates([]);
      setSelected({});
      await fetchEntries();
    } catch (err) {
      setToast(err.message || "匯入失敗");
      if (err.code === "UNAUTHORIZED") setIsAuthenticated(false);
    } finally {
      setImporting(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setToast("");
    try {
      const method = form.id ? "PUT" : "POST";
      await bossFetch("/api/admin/ai-faq", {
        method,
        body: JSON.stringify({
          ...form,
          id: form.id || undefined,
        }),
      });
      setForm(emptyForm);
      setToast(form.id ? "已更新" : "已新增");
      await fetchEntries();
    } catch (err) {
      setToast(err.message || "儲存失敗");
      if (err.code === "UNAUTHORIZED") setIsAuthenticated(false);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`確定刪除 FAQ #${id}？`)) return;
    try {
      await bossFetch("/api/admin/ai-faq", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      setToast("已刪除");
      if (form.id === id) setForm(emptyForm);
      await fetchEntries();
    } catch (err) {
      setToast(err.message || "刪除失敗");
      if (err.code === "UNAUTHORIZED") setIsAuthenticated(false);
    }
  };

  const logout = () => {
    clearBossSession();
    setIsAuthenticated(false);
    setAdminEmail("");
  };

  if (authChecking) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <QuarterRing size="md" className="text-[#0A6CD0]" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <Head>
          <title>FAQ 知識庫登入 | JEKO eSIM</title>
        </Head>
        <div className="min-h-screen bg-[#eef1f6] flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <p className="text-center text-sm text-slate-600 mb-4">
              請使用 <strong>Medusa 後台帳號密碼</strong> 登入（與 /admin-boss 相同）
            </p>
            <BossInlineLogin
              onLoginSuccess={(user) => {
                setAdminEmail(user?.email || "");
                setIsAuthenticated(true);
              }}
            />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>FAQ 知識庫 | JEKO eSIM</title>
      </Head>
      <div className="min-h-screen bg-stone-50 pb-20">
        <div className="max-w-3xl mx-auto w-[94%] pt-8 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-stone-900">FAQ 知識庫</h1>
              <p className="mt-1 text-sm text-stone-500 leading-relaxed">
                人工貼上 Q&A，或從聊天紀錄匯入後，J寶 會用關鍵字比對注入回答。
                可從{" "}
                <Link
                  href="/admin/chat-logs/"
                  className="text-[#0A6CD0] font-bold underline"
                >
                  聊天紀錄
                </Link>{" "}
                挑常見問題整理進來。
              </p>
              {adminEmail ? (
                <p className="mt-1 text-[11px] text-stone-400">
                  已登入：{adminEmail}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={fetchEntries}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50"
              >
                重新載入
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-500 hover:bg-stone-50"
              >
                登出
              </button>
            </div>
          </div>

          {toast ? (
            <p className="text-sm font-bold text-[#0A6CD0]">{toast}</p>
          ) : null}

          <div className="rounded-2xl border border-[#0A6CD0]/25 bg-[#0A6CD0]/5 p-5 space-y-3">
            <p className="text-sm font-black text-stone-900">
              從聊天紀錄自動抓取
            </p>
            <p className="text-xs text-stone-600 leading-relaxed">
              系統會讀取 chat_logs 裡的「用戶提問 → 下一則 AI 回覆」。寫入時已略過快捷／preset、問候、規劃表單題等；掃描時再過濾短句／型號關鍵字、重複與已存在
              FAQ。建議先匯入為草稿，改完答案再啟用。
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-bold text-stone-600 inline-flex items-center gap-1.5">
                最近
                <select
                  value={scanDays}
                  onChange={(e) => setScanDays(e.target.value)}
                  className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm"
                >
                  {["7", "14", "30", "60"].map((d) => (
                    <option key={d} value={d}>
                      {d} 天
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={scanning}
                onClick={scanFromLogs}
                className="rounded-full bg-[#0A6CD0] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#095bb8] disabled:opacity-40"
              >
                {scanning ? "掃描中…" : "掃描聊天紀錄"}
              </button>
              {scanMeta ? (
                <span className="text-[11px] text-stone-500">
                  掃描 {scanMeta.scannedUsers} 則用戶訊息（{scanMeta.days} 天內）
                </span>
              ) : null}
            </div>

            {candidates.length ? (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => importSelected({ enableOnImport: false })}
                    className="rounded-full border border-[#0A6CD0] bg-white px-4 py-2 text-xs font-bold text-[#0A6CD0] disabled:opacity-40"
                  >
                    {importing ? "匯入中…" : "匯入勾選為草稿（停用）"}
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => importSelected({ enableOnImport: true })}
                    className="rounded-full border border-amber-400 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 disabled:opacity-40"
                  >
                    匯入並立即啟用
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allOn = candidates.every((_, i) => selected[i]);
                      const next = {};
                      candidates.forEach((_, i) => {
                        next[i] = !allOn;
                      });
                      setSelected(next);
                    }}
                    className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600"
                  >
                    全選／取消
                  </button>
                </div>
                <ul className="max-h-[420px] overflow-y-auto divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
                  {candidates.map((c, i) => (
                    <li key={`${c.userLogId}-${i}`} className="p-3 space-y-1.5">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={!!selected[i]}
                          onChange={(e) =>
                            setSelected((prev) => ({
                              ...prev,
                              [i]: e.target.checked,
                            }))
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-stone-900">
                            Q：{c.question}
                          </span>
                          <span className="block mt-1 text-xs text-stone-600 whitespace-pre-wrap line-clamp-4">
                            A：{c.answer}
                          </span>
                          <span className="block mt-1 text-[10px] text-stone-400">
                            log #{c.userLogId} ·{" "}
                            {c.createdAt?.slice(0, 16)?.replace("T", " ")}
                          </span>
                        </span>
                      </label>
                      <button
                        type="button"
                        className="ml-6 text-[11px] font-bold text-[#0A6CD0]"
                        onClick={() =>
                          setForm({
                            id: null,
                            question: c.question,
                            answer: c.answer,
                            keywords: "",
                            source_note: c.source_note || "",
                            enabled: false,
                            sort_order: 0,
                          })
                        }
                      >
                        載入到上方表單再改
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <form
            onSubmit={save}
            className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3"
          >
            <p className="text-sm font-black text-stone-900">
              {form.id ? `編輯 #${form.id}` : "新增 FAQ"}
            </p>
            <label className="block">
              <span className="text-xs font-bold text-stone-600">
                問題（客人常問法）
              </span>
              <textarea
                required
                rows={2}
                value={form.question}
                onChange={(e) =>
                  setForm((f) => ({ ...f, question: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                placeholder="例：eSIM 安裝後沒有訊號怎麼辦？"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-stone-600">標準答案</span>
              <textarea
                required
                rows={5}
                value={form.answer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, answer: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                placeholder="請寫清楚步驟與注意事項…"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-stone-600">
                關鍵字（選填，逗號分隔，提高命中）
              </span>
              <input
                value={form.keywords}
                onChange={(e) =>
                  setForm((f) => ({ ...f, keywords: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                placeholder="沒訊號, APN, 飛航模式"
              />
            </label>
            <div className="flex flex-wrap gap-3 items-center">
              <label className="inline-flex items-center gap-2 text-sm font-bold text-stone-700">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, enabled: e.target.checked }))
                  }
                />
                啟用（關閉則不進入檢索）
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-stone-600">
                排序
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sort_order: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-20 rounded-lg border border-stone-200 px-2 py-1"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-bold text-stone-600">
                來源備註（選填）
              </span>
              <input
                value={form.source_note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, source_note: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                placeholder="例：整理自 8/20 聊天紀錄"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#0A6CD0] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#095bb8] disabled:opacity-40"
              >
                {saving ? "儲存中…" : form.id ? "更新" : "新增"}
              </button>
              {form.id ? (
                <button
                  type="button"
                  onClick={() => setForm(emptyForm)}
                  className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-bold text-stone-700"
                >
                  取消編輯
                </button>
              ) : null}
            </div>
          </form>

          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <p className="text-sm font-black text-stone-900">
                已登錄 {entries.length} 筆
              </p>
              {loading ? <LoadingIndicator size="sm" /> : null}
            </div>
            <ul className="divide-y divide-stone-100">
              {entries.map((row) => (
                <li key={row.id} className="px-4 py-3 space-y-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-bold text-stone-900">
                      #{row.id}{" "}
                      {!row.enabled ? (
                        <span className="text-amber-600 text-xs">（已停用）</span>
                      ) : null}
                      {row.question}
                    </p>
                    <p className="text-[11px] text-stone-400 shrink-0">
                      命中 {row.hit_count || 0}
                    </p>
                  </div>
                  <p className="text-xs text-stone-600 whitespace-pre-wrap line-clamp-3">
                    {row.answer}
                  </p>
                  {row.keywords ? (
                    <p className="text-[11px] text-stone-400">
                      關鍵字：{row.keywords}
                    </p>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          id: row.id,
                          question: row.question || "",
                          answer: row.answer || "",
                          keywords: row.keywords || "",
                          source_note: row.source_note || "",
                          enabled: row.enabled !== false,
                          sort_order: row.sort_order || 0,
                        })
                      }
                      className="text-xs font-bold text-[#0A6CD0]"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(row.id)}
                      className="text-xs font-bold text-rose-600"
                    >
                      刪除
                    </button>
                  </div>
                </li>
              ))}
              {!loading && !entries.length ? (
                <li className="px-4 py-10 text-center text-sm text-stone-400">
                  尚無 FAQ。請先執行 migration 後新增第一筆。
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
