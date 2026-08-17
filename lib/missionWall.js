/**
 * 任務牆資料（目前為外層示意用 mock）
 *
 * 之後改由 WordPress REST 取代，建議 CPT `mission` + 分類／標籤：
 *   GET /wp-json/wp/v2/missions?_embed&per_page=20
 * 建議自訂欄位：
 *   reward, eligibility (line | member_line | anyone),
 *   status (open | coming), tags[], apply_url
 */

export const MISSION_TAGS = [
  { id: "all", label: "全部" },
  { id: "line", label: "官方 LINE" },
  { id: "mutual", label: "互惠合作" },
  { id: "paid", label: "有酬合作" },
  { id: "esim", label: "送 eSIM" },
  { id: "profit", label: "永久分潤" },
];

export const ELIGIBILITY_COPY = {
  anyone: { label: "不限資格", hint: "直接申請即可" },
  line: {
    label: "加入官方 LINE 即可",
    hint: "僅加好友即可申請，不一定要先註冊網站會員",
  },
  member_line: {
    label: "會員＋官方 LINE",
    hint: "須為本站會員，並已加入官方 LINE",
  },
};

/** 與夥伴合作申請同一套身份區分 */
export const MISSION_IDENTITY_TYPES = [
  { value: "ig_kol", label: "IG KOL / 網紅", desc: "Instagram、Threads 等社群網紅" },
  { value: "group_leader", label: "團媽 / 開團主", desc: "LINE 群組、FB 社團開團" },
  { value: "blogger", label: "部落客 / 自媒體", desc: "Blog、YouTube、Podcast" },
  { value: "travel_agency", label: "旅行社", desc: "旅行社、自由行代訂" },
  { value: "car_rental", label: "包車 / 租車", desc: "機場接送、包車旅遊" },
  { value: "hotel", label: "飯店 / 住宿", desc: "民宿、飯店、旅宿" },
  { value: "tour_guide", label: "導遊 / 領隊", desc: "專業導遊、領隊、地陪" },
  { value: "other", label: "其他", desc: "以上皆非，請於下方說明" },
];

export function getMissionById(id) {
  return MOCK_MISSIONS.find((m) => m.id === id) || null;
}

export const APPLY_STATE_COPY = {
  open: { cta: "接任務吧", disabled: false },
  coming: { cta: "即將開放", disabled: true },
  paused: { cta: "暫停申請", disabled: true },
  full: { cta: "已額滿", disabled: true },
};

/**
 * 以後台開關／名額覆蓋 mock 狀態。
 * control 不存在時，沿用 MOCK_MISSIONS.status。
 */
export function applyControlToMission(mission, control, occupiedCount = 0) {
  const hasControl = Boolean(control);
  const isOpen = hasControl ? !!control.is_open : mission.status === "open";
  const rawSlots = control?.max_slots;
  const maxSlots =
    rawSlots == null || rawSlots === "" ? null : Number(rawSlots);
  const occupied = Number(occupiedCount) || 0;
  const remaining =
    maxSlots == null || Number.isNaN(maxSlots)
      ? null
      : Math.max(0, maxSlots - occupied);
  const full = remaining === 0;

  let applyState = "open";
  if (!isOpen) {
    applyState = !hasControl && mission.status === "coming" ? "coming" : "paused";
  } else if (full) {
    applyState = "full";
  }

  return {
    ...mission,
    isOpen: applyState === "open",
    applyState,
    maxSlots: Number.isNaN(maxSlots) ? null : maxSlots,
    occupiedCount: occupied,
    remaining,
    closedReason: control?.closed_reason || "",
  };
}

export const MOCK_MISSIONS = [
  {
    id: "join-official-line",
    slug: "join-official-line",
    title: "接任務吧",
    summary: "加好友即可解鎖任務牆申請資格，後續體驗、互惠與分潤任務都從這裡開始。",
    tags: ["line"],
    reward: "解鎖全部任務申請",
    eligibility: "anyone",
    status: "open",
    icon: "chat",
    cta: "接任務吧",
  },
  {
    id: "ig-esim-field-test",
    slug: "ig-esim-field-test",
    title: "實測指定 eSIM，並於 IG 標記 Jeko",
    summary:
      "出國或在台實測我們指定的方案，把實際網速、覆蓋與使用心得發到 Instagram，並標記官方帳號。",
    tags: ["esim", "paid"],
    reward: "贈送該張 eSIM",
    eligibility: "line",
    status: "coming",
    icon: "photo_camera",
    cta: "即將開放",
  },
  {
    id: "mutual-travel-feature",
    slug: "mutual-travel-feature",
    title: "旅遊內容互惠曝光",
    summary: "雙方交換限動／貼文標記或互相推薦，適合已有旅遊、住宿或包車受眾的創作者。",
    tags: ["mutual"],
    reward: "雙向曝光",
    eligibility: "line",
    status: "coming",
    icon: "handshake",
    cta: "即將開放",
  },
  {
    id: "paid-short-form",
    slug: "paid-short-form",
    title: "短影音／貼文有酬合作",
    summary: "依當期 brief 拍攝指定主題，完成審核後發送一次性酬勞。詳細規格將放在任務內頁。",
    tags: ["paid"],
    reward: "一次性稿費",
    eligibility: "line",
    status: "coming",
    icon: "payments",
    cta: "即將開放",
  },
  {
    id: "unlock-lifetime-share",
    slug: "unlock-lifetime-share",
    title: "完成體驗任務，開通永久分潤",
    summary:
      "通過指定體驗與內容任務後，可申請開通夥伴分潤資格，後續透過專屬連結持續累積收益。",
    tags: ["profit"],
    reward: "永久分潤資格",
    eligibility: "line",
    status: "coming",
    icon: "trending_up",
    cta: "即將開放",
  },
  {
    id: "invite-line-friends",
    slug: "invite-line-friends",
    title: "邀請好友加入官方 LINE",
    summary: "把官方帳號推薦給即將出國的朋友。審核規則與名額將於內頁公布。",
    tags: ["line", "esim"],
    reward: "限定折價券",
    eligibility: "line",
    status: "coming",
    icon: "group_add",
    cta: "即將開放",
  },
];
