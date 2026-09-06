"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import { LineAppIconSvg } from "@/components/social/SocialBrandIcons";
import { CONTACT_INFO } from "@/lib/contactUi";
import {
  APPLY_STATE_COPY,
  ELIGIBILITY_COPY,
  MISSION_IDENTITY_TYPES,
  MISSION_TAGS,
  MOCK_MISSIONS,
  applyControlToMission,
} from "@/lib/missionWall";

const STEPS = [
  {
    n: "1",
    title: "加入官方 LINE",
    desc: "加好友即可具備申請資格，不一定要先註冊網站會員。",
  },
  {
    n: "2",
    title: "挑選任務",
    desc: "依 tag 篩選互惠、有酬、送 eSIM 或永久分潤方案。",
  },
  {
    n: "3",
    title: "完成並領獎",
    desc: "後台審核通過後，以 Email 通知；也可在官方 LINE 回覆。",
  },
];

const TAG_TONE = {
  line: "bg-[#E8F8EE] text-[#06C755]",
  mutual: "bg-[#EEF3FB] text-[#2b579a]",
  paid: "bg-[#FFF4E5] text-[#B45309]",
  esim: "bg-[#FDECEC] text-[#C24141]",
  profit: "bg-[#F4EEFB] text-[#6D28D9]",
};

export default function MissionWallSection({ headingAs = "h2" }) {
  const Heading = headingAs === "h1" ? "h1" : "h2";
  const [tag, setTag] = useState("all");
  const [activeMission, setActiveMission] = useState(null);
  const [catalog, setCatalog] = useState(() =>
    MOCK_MISSIONS.map((m) => applyControlToMission(m, null, 0)),
  );

  const restoredLineReturnRef = useRef(false);
  const activeMissionRef = useRef(null);
  activeMissionRef.current = activeMission;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/promo/missions")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.missions)) {
          setCatalog(data.missions);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (restoredLineReturnRef.current || activeMissionRef.current) return;
    const draft = peekApplyDraft();
    if (!draft?.linePrompted || !draft.missionId) return;
    const match = catalog.find((item) => item.id === draft.missionId);
    if (!match) return;
    restoredLineReturnRef.current = true;
    setActiveMission(match);
  }, [catalog]);

  const missions = useMemo(() => {
    if (tag === "all") return catalog;
    return catalog.filter((item) => item.tags.includes(tag));
  }, [tag, catalog]);

  return (
    <section
      id="mission-wall"
      aria-labelledby="mission-wall-heading"
      className="relative min-h-screen pb-20 overflow-hidden"
      style={{
        backgroundColor: "#2b579a",
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }}
    >
      <div className="content-wrap py-12 md:py-16">
        <header className="text-center text-white mb-8 md:mb-10">
          <Heading
            id="mission-wall-heading"
            className="text-[28px] md:text-[24px] font-bold tracking-tight"
          >
            任務牆
          </Heading>
          <p className="mt-3 text-sm md:text-[15px] text-white/80 leading-relaxed max-w-xl mx-auto">
            體驗實測、互惠曝光、有酬合作與永久分潤，都集中在這裡申請。
            資格可設為「加入官方 LINE 即可」，單純加好友也能參加。
          </p>
        </header>

        <div className="bg-white rounded-2xl md:rounded-[28px] shadow-[0_20px_50px_rgba(12,32,70,0.22)] overflow-hidden">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <a
              href={CONTACT_INFO.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="成為官方帳號好友，立即接任務"
              className="relative flex items-center justify-center bg-[#7ED957] overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/接任務吧.png"
                alt="成為官方帳號好友，立即接任務，領取報酬、優惠、獎金"
                className="block w-full h-auto object-contain"
              />
            </a>
            <div className="p-6 md:p-8">
              <span className="inline-flex items-center rounded-full bg-[#06C755] text-white text-[11px] font-bold px-3 py-1 mb-4">
                LINE
              </span>
              <h3 className="text-lg font-bold text-[#1e3a5f] mb-2">
                官方帳號
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                任務可單獨設定門檻。預設只要成為官方帳號好友即可，不必先註冊網站會員；若任務需要會員身分，卡片上會另外標示。
              </p>
              <a
                href={CONTACT_INFO.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group"
              >
                <LineAppIconSvg className="w-12 h-12 shrink-0" />
                <div>
                  <p className="text-xl font-bold text-[#2b579a] leading-none group-hover:underline">
                    {CONTACT_INFO.lineDisplay}
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {CONTACT_INFO.lineHint}
                  </p>
                </div>
              </a>
            </div>
          </div>

          <div className="px-6 md:px-10 py-8 bg-[#F7F5F0] border-t border-slate-100">
            <div className="text-center mb-6">
              <span className="inline-flex items-center rounded-full bg-[#2b579a] text-white text-[11px] font-bold px-3 py-1">
                參加流程
              </span>
              <p className="mt-3 text-sm font-bold text-[#1e3a5f]">
                三步驟完成任務申請
              </p>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 relative">
              {STEPS.map((step, i) => (
                <li key={step.n} className="relative">
                  {i < STEPS.length - 1 ? (
                    <span
                      aria-hidden
                      className="hidden md:block absolute top-5 left-[calc(50%+28px)] right-[calc(-50%+28px)] border-t-2 border-dashed border-[#9BB6E0]"
                    />
                  ) : null}
                  <div className="relative bg-white rounded-2xl border border-slate-200/80 p-5 pt-8 text-center shadow-sm h-full">
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-[#2b579a] text-white text-sm font-bold flex items-center justify-center shadow">
                      {step.n}
                    </span>
                    <p className="text-sm font-bold text-[#2b579a] mb-1.5">
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="px-5 sm:px-8 md:px-10 py-8 md:py-10">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {MISSION_TAGS.map((item) => {
                const selected = tag === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTag(item.id)}
                    className={`h-8 px-3.5 rounded-full text-[12px] font-bold border transition ${
                      selected
                        ? "bg-[#2b579a] text-white border-[#2b579a]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#2b579a] hover:text-[#2b579a]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {missions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-12">
                這個分類暫時沒有任務。
              </p>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {missions.map((mission) => (
                  <li key={mission.id}>
                    <MissionCard
                      mission={mission}
                      onApply={(item) => setActiveMission(item)}
                    />
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-8 text-center text-[11px] text-slate-400">
              任務內容、酬勞與內頁版型將另行規劃；資料之後改由 WordPress 提供。
            </p>
          </div>
        </div>
      </div>
      <MissionApplyModal
        mission={activeMission}
        onClose={() => setActiveMission(null)}
        onSubmitted={() => {
          fetch("/api/promo/missions")
            .then((r) => r.json())
            .then((data) => {
              if (Array.isArray(data.missions)) setCatalog(data.missions);
            })
            .catch(() => {});
        }}
      />
    </section>
  );
}

function MissionCard({ mission, onApply }) {
  const eligibility = ELIGIBILITY_COPY[mission.eligibility] || ELIGIBILITY_COPY.line;
  const applyCopy = APPLY_STATE_COPY[mission.applyState] || APPLY_STATE_COPY.coming;
  const canApply = mission.isOpen && !applyCopy.disabled;
  const tagMeta = Object.fromEntries(MISSION_TAGS.map((t) => [t.id, t.label]));

  return (
    <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_6px_20px_rgba(15,23,42,0.04)] flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-[#EEF3FB] text-[#2b579a] flex items-center justify-center shrink-0">
          <MaterialIcon name={mission.icon} size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {mission.tags.map((id) => (
              <span
                key={id}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  TAG_TONE[id] || "bg-slate-100 text-slate-500"
                }`}
              >
                {tagMeta[id] || id}
              </span>
            ))}
            {!canApply && mission.applyState !== "coming" ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500">
                {applyCopy.cta}
              </span>
            ) : null}
            {mission.applyState === "coming" ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500">
                即將開放
              </span>
            ) : null}
          </div>
          <h3 className="text-[15px] font-bold text-[#1e3a5f] leading-snug">
            {mission.title}
          </h3>
        </div>
      </div>

      <p className="text-sm text-slate-500 leading-relaxed flex-1">
        {mission.summary}
      </p>

      <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-600">
        <MaterialIcon name="group" size={18} className="text-[#2b579a]" />
        <span>
          {Number(mission.occupiedCount) || 0}
          {mission.maxSlots != null ? ` / ${mission.maxSlots}` : ""} 人已申請
        </span>
      </p>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
          Reward
        </p>
        <p className="text-lg font-bold text-[#2b579a] leading-none mb-3">
          {mission.reward}
        </p>
        <p className="text-[11px] text-slate-400 mb-4">{eligibility.hint}</p>

        {canApply ? (
          <button
            type="button"
            onClick={() => onApply(mission)}
            className="inline-flex items-center justify-center gap-1.5 w-full h-10 rounded-full bg-[#06C755] text-white text-sm font-bold hover:brightness-110 active:scale-[0.98] transition"
          >
            接任務吧
            <MaterialIcon name="arrow_forward" size={16} />
          </button>
        ) : (
          <button
            type="button"
            disabled
            title={mission.closedReason || applyCopy.cta}
            className="inline-flex items-center justify-center w-full h-10 rounded-full bg-slate-100 text-slate-400 text-sm font-bold cursor-not-allowed"
          >
            {applyCopy.cta}
          </button>
        )}
      </div>
    </article>
  );
}

const EMPTY_APPLY_FORM = {
  isMember: "",
  partnerType: "",
  partnerTypeOther: "",
  company: "",
  applicantName: "",
  email: "",
  phone: "",
  lineId: "",
  resourceNote: "",
};

const APPLY_DRAFT_KEY = "jeko_mission_apply_draft";
const LINE_WINDOW_NAME = "jekoOfficialLine";
const LINE_RETURN_HINT =
  "請在新分頁加入官方 LINE，加完後回到這個視窗，再按一次「送出申請」。你填的資料已保留。";
const LINE_BACK_HINT =
  "歡迎回來。若已加入官方 LINE，請再按一次「送出申請」。你填的資料還在。";

function peekApplyDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(APPLY_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readApplyDraft(missionId) {
  if (typeof window === "undefined" || !missionId) return null;
  try {
    const raw = sessionStorage.getItem(APPLY_DRAFT_KEY);
    const draft = raw ? JSON.parse(raw) : null;
    if (!draft || draft.missionId !== missionId || !draft.form) return null;
    return draft;
  } catch {
    return null;
  }
}

function writeApplyDraft(missionId, { form, step, linePrompted }) {
  if (typeof window === "undefined" || !missionId) return;
  try {
    sessionStorage.setItem(
      APPLY_DRAFT_KEY,
      JSON.stringify({ missionId, form, step, linePrompted }),
    );
  } catch {
    // ignore quota
  }
}

function clearApplyDraft(missionId) {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(APPLY_DRAFT_KEY);
    const draft = raw ? JSON.parse(raw) : null;
    if (!draft || !missionId || draft.missionId === missionId) {
      sessionStorage.removeItem(APPLY_DRAFT_KEY);
    }
  } catch {
    sessionStorage.removeItem(APPLY_DRAFT_KEY);
  }
}

function markLineWindowPending(win) {
  if (!win) return;
  try {
    win.document.open();
    win.document.write(
      "<!doctype html><title>Jeko LINE</title><body style=\"font-family:sans-serif;padding:32px;color:#1e3a5f;background:#f8fafd\">正在確認官方 LINE 資格，請稍候…</body>",
    );
    win.document.close();
  } catch {
    // 跨網域後無法寫入，忽略
  }
}

function navigateLineWindow(win, url) {
  const target = url || CONTACT_INFO.lineUrl;
  if (win && !win.closed) {
    try {
      win.location.replace(target);
      win.focus();
      return win;
    } catch {
      // fall through
    }
  }
  return window.open(target, LINE_WINDOW_NAME);
}

function closeLineWindow(win) {
  window.setTimeout(() => {
    try {
      if (win && !win.closed) win.close();
    } catch {
      // ignore
    }
  }, 80);
}

function MissionApplyModal({ mission, onClose, onSubmitted }) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [lineNotice, setLineNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [form, setForm] = useState(EMPTY_APPLY_FORM);
  const [linePrompted, setLinePrompted] = useState(false);
  const skipPersistRef = useRef(true);
  const linePromptedRef = useRef(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!mission) {
      skipPersistRef.current = true;
      return;
    }
    skipPersistRef.current = true;
    const draft = readApplyDraft(mission.id);
    if (draft) {
      setForm({ ...EMPTY_APPLY_FORM, ...draft.form });
      const nextStep = Number(draft.step);
      setStep(nextStep >= 1 && nextStep <= 3 ? nextStep : 1);
      const prompted = Boolean(draft.linePrompted);
      linePromptedRef.current = prompted;
      setLinePrompted(prompted);
      setLineNotice(prompted ? LINE_BACK_HINT : "");
      setError("");
    } else {
      setForm(EMPTY_APPLY_FORM);
      setStep(1);
      linePromptedRef.current = false;
      setLinePrompted(false);
      setLineNotice("");
      setError("");
    }
    setCopied(false);
    setSubmitted(false);
    setSuccessMsg("");
  }, [mission?.id]);

  useEffect(() => {
    if (!mission) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    writeApplyDraft(mission.id, { form, step, linePrompted });
  }, [mission?.id, form, step, linePrompted]);

  useEffect(() => {
    if (!mission || !linePrompted || submitted) return;
    const onBack = () => {
      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }
      setLineNotice(LINE_BACK_HINT);
    };
    window.addEventListener("focus", onBack);
    document.addEventListener("visibilitychange", onBack);
    return () => {
      window.removeEventListener("focus", onBack);
      document.removeEventListener("visibilitychange", onBack);
    };
  }, [mission?.id, linePrompted, submitted]);

  useEffect(() => {
    if (!mission || submitted) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        skipPersistRef.current = true;
        writeApplyDraft(mission.id, {
          form,
          step,
          linePrompted: linePromptedRef.current,
        });
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mission, form, step, onClose, submitted]);

  if (!mission) return null;

  const eligibility = ELIGIBILITY_COPY[mission.eligibility] || ELIGIBILITY_COPY.line;
  const needsMember = mission.eligibility === "member_line";
  const identity = MISSION_IDENTITY_TYPES.find((t) => t.value === form.partnerType);
  const identityLabel =
    form.partnerType === "other" && form.partnerTypeOther.trim()
      ? `其他（${form.partnerTypeOther.trim()}）`
      : identity?.label || "";

  const canNextFromStep1 =
    (!needsMember || form.isMember === "yes") &&
    Boolean(form.partnerType) &&
    (form.partnerType !== "other" || Boolean(form.partnerTypeOther.trim()));

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const closeModal = () => {
    skipPersistRef.current = true;
    writeApplyDraft(mission.id, {
      form,
      step,
      linePrompted: linePromptedRef.current,
    });
    onClose();
  };

  const resetAndClose = () => {
    skipPersistRef.current = true;
    clearApplyDraft(mission.id);
    linePromptedRef.current = false;
    setStep(1);
    setError("");
    setLineNotice("");
    setCopied(false);
    setSubmitted(false);
    setSuccessMsg("");
    setLinePrompted(false);
    setForm(EMPTY_APPLY_FORM);
    onClose();
  };

  const submitApply = async () => {
    if (submittingRef.current || submitted) return;
    submittingRef.current = true;
    const alreadyPrompted = linePromptedRef.current;

    // 必須在 click 同步階段開窗，電腦版才不會被當成彈出視窗擋住
    let placeholder = null;
    if (!alreadyPrompted) {
      placeholder = window.open("about:blank", LINE_WINDOW_NAME);
      markLineWindowPending(placeholder);
    }

    const payload = buildLinePayload({
      mission,
      eligibility,
      form,
      identityLabel,
    });
    setSubmitting(true);
    setError("");
    writeApplyDraft(mission.id, {
      form,
      step,
      linePrompted: alreadyPrompted,
    });

    try {
      const res = await fetch("/api/promo/mission-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          missionId: mission.id,
          joinedLine: alreadyPrompted ? "yes" : "",
          confirmedAfterLineRedirect: alreadyPrompted,
          isMember: form.isMember,
          partnerType: form.partnerType,
          partnerTypeOther: form.partnerTypeOther,
          company: form.company,
          applicantName: form.applicantName,
          email: form.email,
          phone: form.phone,
          lineId: form.lineId,
          resourceNote: form.resourceNote,
          payload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data.need_line_friend) {
        linePromptedRef.current = true;
        setLinePrompted(true);
        writeApplyDraft(mission.id, {
          form,
          step,
          linePrompted: true,
        });
        const opened = navigateLineWindow(
          placeholder,
          data.line_oa_url || CONTACT_INFO.lineUrl,
        );
        setLineNotice(
          opened
            ? LINE_RETURN_HINT
            : "瀏覽器阻擋了新分頁。請點「開啟官方 LINE」加入後，再按一次送出申請。",
        );
        return;
      }
      closeLineWindow(placeholder);
      if (!res.ok) {
        setError(data.error || "送出失敗，請稍後再試");
        return;
      }
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(payload);
          setCopied(true);
        }
      } catch {
        setCopied(false);
      }
      skipPersistRef.current = true;
      clearApplyDraft(mission.id);
      setSubmitted(true);
      setSuccessMsg(data.message || "申請已送出，審核結果將以 Email 通知。");
      setLineNotice("");
      onSubmitted?.();
    } catch {
      closeLineWindow(placeholder);
      setError("送出失敗，請稍後再試");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[12010] bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={submitted ? resetAndClose : closeModal}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white border border-slate-200 shadow-[0_20px_55px_rgba(2,12,27,0.35)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-7 py-4 border-b border-slate-200 bg-[#F8FAFD] flex items-center justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-[#1e3a5f] leading-tight">
              接任務吧
            </h3>
            {mission.title !== "接任務吧" ? (
              <p className="text-xs text-slate-500 mt-0.5">{mission.title}</p>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">
                先確認資格與合作身份，再送出申請
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={submitted ? resetAndClose : closeModal}
            className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
            aria-label="關閉申請視窗"
          >
            <MaterialIcon name="close" size={18} />
          </button>
        </div>

        <div className="px-5 sm:px-7 py-4 border-b border-slate-200 bg-white shrink-0">
          {submitted ? (
            <p className="text-center text-sm font-bold text-[#06C755]">
              申請已送出
            </p>
          ) : (
          <ol className="grid grid-cols-3 gap-2">
            {[
              { n: 1, label: "資格與身份" },
              { n: 2, label: "基本資料" },
              { n: 3, label: "確認送出" },
            ].map((item) => (
              <li key={item.n} className="text-center">
                <span
                  className={`mx-auto w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= item.n
                      ? "bg-[#2b579a] text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {item.n}
                </span>
                <p
                  className={`mt-1 text-[11px] font-bold ${
                    step >= item.n ? "text-[#2b579a]" : "text-slate-400"
                  }`}
                >
                  {item.label}
                </p>
              </li>
            ))}
          </ol>
          )}
        </div>

        <div className="px-5 sm:px-7 py-6 overflow-y-auto">
          {submitted ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#E8F8EE] text-[#06C755] flex items-center justify-center">
                <MaterialIcon name="check" size={26} />
              </div>
              <p className="text-lg font-bold text-[#1e3a5f]">申請已送出</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {successMsg}
              </p>
              {copied ? (
                <p className="text-sm text-[#06C755] bg-[#E8F8EE] border border-[#86efac] rounded-lg p-3">
                  申請資訊已複製，需要時可貼到官方 LINE。
                </p>
              ) : null}
            </div>
          ) : null}

          {!submitted && step === 1 ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400 tracking-wide mb-1">
                  申請資格
                </p>
                <p className="text-sm font-bold text-[#1e3a5f]">{eligibility.label}</p>
                <p className="text-xs text-slate-500 mt-1">{eligibility.hint}</p>
              </div>

              {needsMember ? (
                <BinaryQuestion
                  label="你是否已完成本站會員註冊？"
                  value={form.isMember}
                  onChange={(v) => updateField("isMember", v)}
                />
              ) : null}

              {needsMember && form.isMember === "no" ? (
                <p className="text-sm text-[#b45309] bg-[#fff7ed] border border-[#fed7aa] rounded-lg p-3">
                  這個任務需要「會員 + 官方 LINE」資格，請先完成註冊。
                </p>
              ) : null}

              <div>
                <p className="text-sm font-bold text-[#1e3a5f] mb-2">
                  你的合作身份 <span className="text-[#dc2626]">*</span>
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {MISSION_IDENTITY_TYPES.map((t) => {
                    const selected = form.partnerType === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => updateField("partnerType", t.value)}
                        className={`text-left rounded-xl border px-3.5 py-3 transition ${
                          selected
                            ? "border-[#2b579a] bg-[#EEF3FB] shadow-sm"
                            : "border-slate-200 bg-white hover:border-[#2b579a]/50"
                        }`}
                      >
                        <p
                          className={`text-sm font-bold ${
                            selected ? "text-[#2b579a]" : "text-[#1e3a5f]"
                          }`}
                        >
                          {t.label}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {t.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {form.partnerType === "other" ? (
                  <div className="mt-3">
                    <TextInput
                      label="請說明你的身份類型"
                      required
                      value={form.partnerTypeOther}
                      onChange={(v) => updateField("partnerTypeOther", v)}
                      placeholder="例如：機場接送業者、語言學校"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {!submitted && step === 2 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <TextInput
                label="公司／頻道／個人名稱"
                required
                value={form.company}
                onChange={(v) => updateField("company", v)}
                placeholder="例）旅遊頻道名稱、公司名稱"
                className="sm:col-span-2"
              />
              <TextInput
                label="聯絡人姓名"
                required
                value={form.applicantName}
                onChange={(v) => updateField("applicantName", v)}
                placeholder="例）王小明"
              />
              <TextInput
                label="LINE ID"
                value={form.lineId}
                onChange={(v) => updateField("lineId", v)}
                placeholder="方便我們與你聯繫"
              />
              <TextInput
                label="Email"
                required
                type="email"
                value={form.email}
                onChange={(v) => updateField("email", v)}
                placeholder="審核結果將寄至此信箱"
              />
              <TextInput
                label="聯絡電話"
                required
                type="tel"
                value={form.phone}
                onChange={(v) => updateField("phone", v)}
                placeholder="例）0912345678"
              />
              <TextAreaInput
                label="推廣資源說明"
                value={form.resourceNote}
                onChange={(v) => updateField("resourceNote", v)}
                placeholder="選填。例）IG 粉絲 2 萬，主要分享日本旅遊，每月約開團 3 次…"
                className="sm:col-span-2"
              />
            </div>
          ) : null}

          {!submitted && step === 3 ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                按下「送出申請」後會確認是否已加入官方 LINE。若尚未加入，會先帶你去加好友；加完回到此頁，填寫的資料會保留，再按一次即可送出。審核結果會寄到你填的 Email。
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-xs text-slate-600">
                <p>任務：{mission.title}</p>
                <p>合作身份：{identityLabel || "-"}</p>
                <p>公司／頻道：{form.company || "-"}</p>
                <p>聯絡人：{form.applicantName || "-"}</p>
                <p>Email：{form.email || "-"}</p>
                <p>電話：{form.phone || "-"}</p>
                <p>LINE ID：{form.lineId || "-"}</p>
                <p>推廣資源：{form.resourceNote || "-"}</p>
              </div>
              {copied ? (
                <p className="text-sm text-[#06C755] bg-[#E8F8EE] border border-[#86efac] rounded-lg p-3">
                  申請資訊已複製，可直接貼到官方 LINE。
                </p>
              ) : null}
            </div>
          ) : null}

          {lineNotice && !submitted ? (
            <p className="mt-4 text-sm text-[#06C755] bg-[#E8F8EE] border border-[#86efac] rounded-lg p-3">
              {lineNotice}{" "}
              <a
                href={CONTACT_INFO.lineUrl}
                target={LINE_WINDOW_NAME}
                className="underline font-bold"
              >
                開啟官方 LINE
              </a>
            </p>
          ) : null}

          {error && !submitted ? (
            <p className="mt-4 text-sm text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3">
              {error}
            </p>
          ) : null}
        </div>

        <div className="px-5 sm:px-7 py-4 bg-[#F8FAFD] border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          {submitted ? (
            <>
              <span />
              <button
                type="button"
                onClick={resetAndClose}
                className="h-10 px-5 rounded-full bg-[#2b579a] text-white text-sm font-bold hover:brightness-110"
              >
                完成
              </button>
            </>
          ) : (
            <>
          <button
            type="button"
            onClick={() => (step === 1 ? closeModal() : setStep((s) => s - 1))}
            className="h-10 px-4 rounded-full border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            {step === 1 ? "取消" : "上一步"}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !canNextFromStep1) {
                  setError(
                    needsMember
                      ? "請確認已完成本站會員註冊，並選擇合作身份。"
                      : "請選擇合作身份。",
                  );
                  return;
                }
                if (step === 2) {
                  if (
                    !form.company.trim() ||
                    !form.applicantName.trim() ||
                    !form.email.trim() ||
                    !form.phone.trim()
                  ) {
                    setError("請填寫公司／頻道、姓名、Email 與電話。");
                    return;
                  }
                }
                setError("");
                setStep((s) => s + 1);
              }}
              className="h-10 px-5 rounded-full bg-[#2b579a] text-white text-sm font-bold hover:brightness-110"
            >
              下一步
            </button>
          ) : (
            <button
              type="button"
              onClick={submitApply}
              disabled={submitting}
              className="h-10 px-5 rounded-full bg-[#06C755] text-white text-sm font-bold hover:brightness-110 disabled:opacity-60"
            >
              {submitting
                ? "送出中…"
                : linePrompted
                  ? "已加入，送出申請"
                  : "送出申請"}
            </button>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BinaryQuestion({ label, value, onChange }) {
  return (
    <div>
      <p className="text-sm font-bold text-[#1e3a5f] mb-2">{label}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange("yes")}
          className={`h-10 px-4 rounded-full border text-sm font-bold transition ${
            value === "yes"
              ? "bg-[#2b579a] border-[#2b579a] text-white"
              : "bg-white border-slate-300 text-slate-600 hover:border-[#2b579a]"
          }`}
        >
          是
        </button>
        <button
          type="button"
          onClick={() => onChange("no")}
          className={`h-10 px-4 rounded-full border text-sm font-bold transition ${
            value === "no"
              ? "bg-slate-700 border-slate-700 text-white"
              : "bg-white border-slate-300 text-slate-600 hover:border-slate-500"
          }`}
        >
          否
        </button>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  className = "",
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-bold text-[#1e3a5f]">
        {label}
        {required ? <span className="text-[#dc2626] ml-1">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#2b579a]"
      />
    </label>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  className = "",
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-bold text-[#1e3a5f]">
        {label}
        {required ? <span className="text-[#dc2626] ml-1">*</span> : null}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#2b579a] resize-y"
      />
    </label>
  );
}

function buildLinePayload({ mission, eligibility, form, identityLabel }) {
  const time = new Date().toLocaleString("zh-TW", { hour12: false });
  return [
    "【Jeko 任務牆｜接任務吧】",
    `申請時間：${time}`,
    `任務名稱：${mission.title}`,
    `資格類型：${eligibility.label}`,
    `合作身份：${identityLabel || "-"}`,
    `公司／頻道：${form.company || "-"}`,
    `聯絡人：${form.applicantName || "-"}`,
    `Email：${form.email || "-"}`,
    `電話：${form.phone || "-"}`,
    `LINE ID：${form.lineId || "-"}`,
    `推廣資源：${form.resourceNote || "-"}`,
  ].join("\n");
}
