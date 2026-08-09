import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import Layout from "./Layout";
import ConfettiButton from "@/components/ConfettiButton/ConfettiButton";
import MaterialIcon from "@/components/MaterialIcon";
import { fireCelebrationConfettiFromElement } from "@/lib/fireCelebrationConfetti";
import { supabase } from "../lib/supabaseClient";
import { validatePassword, PASSWORD_HINT, isPasswordValid } from "@/lib/passwordPolicy";
import CooperationAgreementModal from "@/components/cooperation/CooperationAgreementModal";

const FIELD_INPUT_CLASS =
  "w-full bg-transparent text-sm text-slate-800 outline-none border-0 ring-0 shadow-none py-1 placeholder:text-slate-300 focus:ring-0 focus:outline-none";
const FIELD_PASSWORD_INPUT_CLASS = `${FIELD_INPUT_CLASS} pr-10`;

const STEPS = [
  { id: 1, label: "合作身份" },
  { id: 2, label: "基本資料" },
  { id: 3, label: "推廣資源" },
  { id: 4, label: "確認送出" },
];

const PARTNER_TYPES = [
  {
    value: "ig_kol",
    label: "IG KOL / 網紅",
    desc: "Instagram、Threads 等社群網紅",
  },
  {
    value: "group_leader",
    label: "團媽 / 開團主",
    desc: "Line 群組、FB 社團開團",
  },
  {
    value: "blogger",
    label: "部落客 / 自媒體",
    desc: "Blog、YouTube、Podcast",
  },
  {
    value: "travel_agency",
    label: "旅行社公司",
    desc: "旅行社、自由行代訂",
  },
  {
    value: "car_rental",
    label: "包車 / 租車業者",
    desc: "機場接送、包車旅遊",
  },
  {
    value: "hotel",
    label: "飯店 / 住宿業者",
    desc: "民宿、飯店、旅宿",
  },
  {
    value: "tour_guide",
    label: "導遊 / 領隊",
    desc: "專業導遊、領隊、地陪",
  },
  { value: "other", label: "其他", desc: "以上皆非，請於下方說明" },
];

const SCALE_PEOPLE = [
  { value: "under_500", label: "500 人以下" },
  { value: "500_2000", label: "500 – 2,000 人" },
  { value: "2000_10000", label: "2,000 – 1 萬人" },
  { value: "10000_50000", label: "1 – 5 萬人" },
  { value: "over_50000", label: "5 萬人以上" },
];

const SCALE_TRAFFIC = [
  { value: "under_1k", label: "1,000 以下 / 月" },
  { value: "1k_10k", label: "1,000 – 1 萬 / 月" },
  { value: "10k_50k", label: "1 – 5 萬 / 月" },
  { value: "50k_200k", label: "5 – 20 萬 / 月" },
  { value: "over_200k", label: "20 萬以上 / 月" },
];

const SCALE_ORDERS = [
  { value: "under_10", label: "10 件以下 / 月" },
  { value: "10_50", label: "10 – 50 件 / 月" },
  { value: "50_200", label: "50 – 200 件 / 月" },
  { value: "200_500", label: "200 – 500 件 / 月" },
  { value: "over_500", label: "500 件以上 / 月" },
];

const SCALE_GROUPS = [
  { value: "under_5", label: "5 次以下 / 月" },
  { value: "5_15", label: "5 – 15 次 / 月" },
  { value: "15_30", label: "15 – 30 次 / 月" },
  { value: "over_30", label: "30 次以上 / 月" },
];

/** 各身份 Step 3 專屬欄位設定 */
const PARTNER_PROFILE_CONFIG = {
  ig_kol: {
    title: "您的社群影響力",
    sub: "請填寫主要平台的粉絲規模，方便我們評估合作潛力。",
    fields: [
      {
        key: "primaryPlatform",
        label: "主要平台",
        hint: "您最常發文、帶流量的平台",
        type: "pills",
        options: [
          "Instagram",
          "Threads",
          "TikTok",
          "YouTube",
          "Facebook",
          "多平台",
        ],
      },
      {
        key: "audienceScale",
        label: "粉絲 / 追蹤人數",
        hint: "以您最大平台的粉絲數為準",
        type: "scale",
        scaleOptions: SCALE_PEOPLE,
      },
      {
        key: "primaryUrl",
        label: "主要社群連結",
        hint: "IG、YouTube 或 Linktree 等",
        type: "url",
        placeholder: "https://instagram.com/yourname",
      },
      {
        key: "avgEngagement",
        label: "平均貼文互動",
        hint: "選填，例如限動平均觀看、貼文按讚數",
        type: "pills",
        optional: true,
        options: ["1,000 以下", "1,000 – 5,000", "5,000 – 2 萬", "2 萬以上"],
      },
    ],
  },
  group_leader: {
    title: "您的開團資源",
    sub: "團媽的核心是 LINE 好友與群組人數，請依實際狀況填寫。",
    fields: [
      {
        key: "primaryPlatform",
        label: "主要開團平台",
        type: "pills",
        options: ["LINE 群組", "LINE 官方帳號", "Facebook 社團", "混合使用"],
      },
      {
        key: "audienceScale",
        label: "LINE 好友 / 群組成員數",
        hint: "若有多個群，請填總和或最大群的規模",
        type: "scale",
        scaleOptions: SCALE_PEOPLE,
      },
      {
        key: "groupFrequency",
        label: "平均每月開團次數",
        type: "scale",
        scaleOptions: SCALE_GROUPS,
      },
      {
        key: "primaryUrl",
        label: "群組 / 社群連結",
        hint: "選填，LINE 邀請連結或 FB 社團網址",
        type: "url",
        optional: true,
        placeholder: "https://line.me/ti/g/...",
      },
    ],
  },
  blogger: {
    title: "您的內容影響力",
    sub: "部落客與自媒體可依「追蹤人數」或「網站流量」擇一填寫。",
    fields: [
      {
        key: "contentType",
        label: "主要內容類型",
        type: "pills",
        options: ["文字部落格", "YouTube", "Podcast", "圖文 IG", "多平台經營"],
      },
      {
        key: "metricType",
        label: "您想呈報的指標",
        type: "pills",
        options: [
          { value: "followers", label: "追蹤 / 訂閱人數" },
          { value: "traffic", label: "網站月流量 (PV)" },
        ],
      },
      {
        key: "audienceScale",
        label: "規模（依上方指標）",
        type: "dynamic_scale",
        scaleByMetric: {
          followers: SCALE_PEOPLE,
          traffic: SCALE_TRAFFIC,
        },
      },
      {
        key: "primaryUrl",
        label: "主要平台 / 網站連結",
        type: "url",
        placeholder: "https://yourblog.com 或 YouTube 頻道",
      },
    ],
  },
  travel_agency: {
    title: "您的旅行社資源",
    sub: "幫助我們了解您的出團量與客源，以安排最適合的分潤方案。",
    fields: [
      {
        key: "monthlyOrders",
        label: "每月出團 / 銷售件數",
        hint: "含自由行、跟團、代訂等 eSIM 相關旅客數",
        type: "scale",
        scaleOptions: SCALE_ORDERS,
      },
      {
        key: "salesChannel",
        label: "主要銷售通路",
        type: "pills",
        options: ["實體門市", "官網 / 線上", "同業批發", "混合"],
      },
      {
        key: "serviceRegion",
        label: "主要目的地",
        hint: "最常出團或銷售 eSIM 的國家",
        type: "pills",
        optional: true,
        options: ["日本", "韓國", "泰國", "歐洲", "美國", "多國"],
      },
      {
        key: "primaryUrl",
        label: "官網 / 粉專連結",
        type: "url",
        optional: true,
        placeholder: "https://your-agency.com.tw",
      },
    ],
  },
  car_rental: {
    title: "您的包車 / 租車資源",
    sub: "旅客在行程中是最適合推薦 eSIM 的時機，請告訴我們您的接待量。",
    fields: [
      {
        key: "monthlyOrders",
        label: "每月接待旅客 / 訂單數",
        type: "scale",
        scaleOptions: SCALE_ORDERS,
      },
      {
        key: "serviceRegion",
        label: "主要服務區域",
        type: "pills",
        options: ["日本", "韓國", "東南亞", "台灣本島", "多國"],
      },
      {
        key: "serviceType",
        label: "服務類型",
        type: "pills",
        optional: true,
        options: ["機場接送", "包車一日遊", "多日包車", "自駕租車", "混合"],
      },
      {
        key: "primaryUrl",
        label: "官網 / 社群連結",
        type: "url",
        optional: true,
        placeholder: "https://...",
      },
    ],
  },
  hotel: {
    title: "您的住宿業資源",
    sub: "入住旅客是 eSIM 的高需求客群，請填寫您的接待規模。",
    fields: [
      {
        key: "roomCount",
        label: "客房數 / 月住房數",
        type: "pills",
        options: ["30 間以下", "30 – 100 間", "100 – 300 間", "300 間以上"],
      },
      {
        key: "guestType",
        label: "主要客群",
        type: "pills",
        options: ["國際旅客", "國內旅遊", "商務客", "混合"],
      },
      {
        key: "serviceRegion",
        label: "所在區域",
        type: "pills",
        optional: true,
        options: ["日本", "韓國", "泰國", "台灣", "其他"],
      },
      {
        key: "primaryUrl",
        label: "官網 / Booking 連結",
        type: "url",
        optional: true,
        placeholder: "https://...",
      },
    ],
  },
  tour_guide: {
    title: "您的帶團資源",
    sub: "導遊、領隊在出團現場推薦 eSIM 轉換率最高，請告訴我們您的帶團量。",
    fields: [
      {
        key: "groupFrequency",
        label: "平均每月帶團次數",
        type: "scale",
        scaleOptions: SCALE_GROUPS,
      },
      {
        key: "groupSize",
        label: "每團平均人數",
        type: "pills",
        options: ["10 人以下", "10 – 20 人", "20 – 40 人", "40 人以上"],
      },
      {
        key: "serviceRegion",
        label: "主要帶團國家 / 地區",
        type: "pills",
        options: [
          "日本",
          "韓國",
          "中國大陸",
          "港澳",
          "泰國",
          "越南",
          "新加坡 / 馬來西亞",
          "印尼 / 峇里島",
          "菲律賓",
          "東南亞其他",
          "歐洲",
          "美國 / 加拿大",
          "澳洲 / 紐西蘭",
          "台灣本島 / 離島",
          "多國 / 不定",
        ],
      },
      {
        key: "primaryUrl",
        label: "個人 / 工作室連結",
        type: "url",
        optional: true,
        placeholder: "IG、粉專或個人網站",
      },
    ],
  },
  other: {
    title: "您的推廣資源",
    sub: "請描述您的推廣渠道與大致觸及規模。",
    fields: [
      {
        key: "promoChannel",
        label: "主要推廣渠道",
        hint: "您會在哪裡接觸到旅客？",
        type: "text",
        placeholder: "例如：機場櫃台、語言學校、代購社群...",
      },
      {
        key: "audienceScale",
        label: "月觸及 / 客群規模",
        type: "scale",
        scaleOptions: SCALE_PEOPLE,
        optional: true,
      },
      {
        key: "primaryUrl",
        label: "相關連結",
        type: "url",
        optional: true,
        placeholder: "https://...",
      },
    ],
  },
};

const STEP_TITLES = {
  1: {
    title: "您是以什麼身份合作？",
    sub: "請先選擇合作模式（專屬連結或專屬商店），再選最符合的身份類別。",
  },
  2: {
    title: "告訴我們您的基本資料",
    sub: "Email 驗證後請設定備援密碼；若已用 LINE／Google 登入再申請，審核通過後可一鍵進後台。",
  },
  3: null, // 依身份動態
  4: {
    title: "設定代碼並確認送出",
    sub: "審核通過後，您的專屬連結或專屬商店將依此代碼開通。",
  },
};

const INITIAL_FORM = {
  partnerType: "",
  partnerTypeOther: "",
  /** store = 專屬賣場；referral = 專屬推薦連結；空字串＝尚未選 */
  cooperationModel: "",
  companyName: "",
  contactName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  lineId: "",
  slug: "",
  description: "",
  profile: {},
};

const EMAIL_RESEND_WAIT = 60;

function getPillLabel(option) {
  return typeof option === "string" ? option : option.label;
}

function getPillValue(option) {
  return typeof option === "string" ? option : option.value;
}

function resolveScaleOptions(field, profile) {
  if (field.type === "dynamic_scale") {
    const metric = profile.metricType || "followers";
    return field.scaleByMetric[metric] || SCALE_PEOPLE;
  }
  return field.scaleOptions || SCALE_PEOPLE;
}

function resolveScaleLabel(field, profile, value) {
  if (!value) return "";
  const opts = resolveScaleOptions(field, profile);
  return opts.find((o) => o.value === value)?.label || value;
}

function resolveFieldLabel(field, profile) {
  if (field.key === "audienceScale" && profile.metricType === "traffic") {
    return "網站月流量 (PV)";
  }
  if (field.key === "audienceScale" && profile.metricType === "followers") {
    return "追蹤 / 訂閱人數";
  }
  return field.label;
}

function buildProfileSummary(partnerType, profile) {
  const config = PARTNER_PROFILE_CONFIG[partnerType];
  if (!config) return [];
  return config.fields
    .map((field) => {
      const val = profile[field.key];
      if (!val) return null;
      let display = val;
      if (field.type === "scale" || field.type === "dynamic_scale") {
        display = resolveScaleLabel(field, profile, val);
      } else if (field.type === "pills") {
        const opt = field.options.find((o) => getPillValue(o) === val);
        display = opt ? getPillLabel(opt) : val;
      }
      return { label: resolveFieldLabel(field, profile), value: display };
    })
    .filter(Boolean);
}

function buildDescription(form) {
  const typeLabel =
    PARTNER_TYPES.find((t) => t.value === form.partnerType)?.label ||
    form.partnerType;

  const profileLines = buildProfileSummary(form.partnerType, form.profile).map(
    (row) => `【${row.label}】${row.value}`,
  );

  return [
    form.description?.trim(),
    `【合作類型】${typeLabel}`,
    `【合作模式】${
      form.cooperationModel === "referral"
        ? "專屬推薦連結（官網 Cookie 30 天）"
        : "專屬商店（自行開店販售）"
    }`,
    form.contactName ? `【聯絡人】${form.contactName}` : null,
    form.phone ? `【聯絡電話】${form.phone}` : null,
    form.lineId ? `【LINE ID】${form.lineId}` : null,
    ...profileLines,
    form.partnerType === "other" && form.partnerTypeOther
      ? `【其他類型說明】${form.partnerTypeOther}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function BrandHeader() {
  return (
    <div className="text-center mb-8">
      <Link href="/" className="inline-flex flex-col items-center gap-2 group">
        <Image
          src="/images/Logo/logo-no-bg.png"
          alt="JEKO eSIM"
          width={56}
          height={56}
          className="w-12 h-12 object-contain transition-transform group-hover:scale-105"
        />
        <span className="text-[22px] font-black tracking-tighter leading-none">
          <span className="text-[#0A6CD0]">Jeko</span>
          <span className="text-[#24A148]">.eSIM</span>
        </span>
      </Link>
      <p className="text-xs text-slate-400 mt-2 font-medium">合作夥伴申請</p>
    </div>
  );
}

function UnderlineField({ label, hint, required, children }) {
  return (
    <div className="w-full">
      <label className="block text-[13px] font-bold text-[#1a56db] mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {hint && (
        <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
          {hint}
        </p>
      )}
      <div className="border-b border-slate-200 focus-within:border-[#1a56db] transition-colors pb-1 [&_input]:border-0 [&_textarea]:border-0 [&_input]:outline-none [&_textarea]:outline-none [&_input]:ring-0 [&_textarea]:ring-0 [&_input]:shadow-none [&_textarea]:shadow-none">
        {children}
      </div>
    </div>
  );
}

function PasswordRevealField({
  label,
  hint,
  required,
  value,
  onChange,
  placeholder,
  autoComplete = "new-password",
  show,
  onToggleShow,
}) {
  return (
    <UnderlineField label={label} hint={hint} required={required}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={FIELD_PASSWORD_INPUT_CLASS}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "隱藏密碼" : "顯示密碼"}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#1a56db] transition"
        >
          <MaterialIcon
            name={show ? "visibility_off" : "visibility"}
            size={20}
          />
        </button>
      </div>
    </UnderlineField>
  );
}

function StepIndicator({ current, total }) {
  const progress = ((current - 1) / (total - 1)) * 100;

  return (
    <div className="mb-8">
      <div className="h-1 bg-slate-100 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-[#1a56db] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between px-1">
        {STEPS.map((step) => {
          const done = current > step.id;
          const active = current === step.id;
          return (
            <div
              key={step.id}
              className="flex flex-col items-center gap-1 flex-1"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-300 ${
                  done
                    ? "bg-[#1a56db] text-white"
                    : active
                      ? "bg-[#1a56db] text-white ring-4 ring-blue-100 scale-110"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {step.id}
              </div>
              <span
                className={`text-[10px] font-bold text-center leading-tight ${
                  active
                    ? "text-[#1a56db]"
                    : done
                      ? "text-slate-500"
                      : "text-slate-300"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 依身份渲染 Step 3 動態欄位 */
function ProfileFields({ partnerType, profile, setProfile }) {
  const config = PARTNER_PROFILE_CONFIG[partnerType];
  if (!config) return null;

  const setField = (key, val) =>
    setProfile((prev) => {
      const next = { ...prev, [key]: val };
      // 部落客切換指標時，清空規模選項
      if (key === "metricType") next.audienceScale = "";
      return next;
    });

  return (
    <div className="flex flex-col gap-6">
      {config.fields.map((field) => {
        const label = resolveFieldLabel(field, profile);

        if (field.type === "pills") {
          return (
            <div key={field.key}>
              <label className="block text-[13px] font-bold text-[#1a56db] mb-1">
                {label}
                {!field.optional && (
                  <span className="text-red-400 ml-0.5">*</span>
                )}
              </label>
              {field.hint && (
                <p className="text-[11px] text-slate-400 mb-2">{field.hint}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {field.options.map((opt) => {
                  const val = getPillValue(opt);
                  const lbl = getPillLabel(opt);
                  return (
                    <SelectCard
                      key={val}
                      compact
                      selected={profile[field.key] === val}
                      onClick={() =>
                        setField(
                          field.key,
                          profile[field.key] === val ? "" : val,
                        )
                      }
                      label={lbl}
                    />
                  );
                })}
              </div>
            </div>
          );
        }

        if (field.type === "scale" || field.type === "dynamic_scale") {
          const scaleOpts = resolveScaleOptions(field, profile);
          return (
            <div key={field.key}>
              <label className="block text-[13px] font-bold text-[#1a56db] mb-1">
                {label}
                {!field.optional && (
                  <span className="text-red-400 ml-0.5">*</span>
                )}
              </label>
              {field.hint && (
                <p className="text-[11px] text-slate-400 mb-2">{field.hint}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {scaleOpts.map((o) => (
                  <SelectCard
                    key={o.value}
                    compact
                    selected={profile[field.key] === o.value}
                    onClick={() =>
                      setField(
                        field.key,
                        profile[field.key] === o.value ? "" : o.value,
                      )
                    }
                    label={o.label}
                  />
                ))}
              </div>
            </div>
          );
        }

        if (field.type === "url" || field.type === "text") {
          return (
            <UnderlineField
              key={field.key}
              label={label}
              hint={field.hint}
              required={!field.optional}
            >
              <input
                type={field.type === "url" ? "url" : "text"}
                value={profile[field.key] || ""}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder || ""}
                className={FIELD_INPUT_CLASS}
              />
            </UnderlineField>
          );
        }

        return null;
      })}
    </div>
  );
}

function SelectCard({ selected, onClick, label, desc, compact }) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`px-4 py-2.5 rounded-full text-xs font-bold border-2 transition-all inline-flex items-center gap-1.5 ${
          selected
            ? "border-[#1a56db] bg-[#1a56db] text-white shadow-sm"
            : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-[#1a56db]"
        }`}
      >
        {selected && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#FADE2B] text-[#1a56db] shrink-0"
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              className="w-2.5 h-2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </span>
        )}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
        selected
          ? "border-[#1a56db] bg-blue-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-bold ${selected ? "text-[#1a56db]" : "text-slate-800"}`}
          >
            {label}
          </p>
          {desc && (
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              {desc}
            </p>
          )}
        </div>
        <div
          className={`w-6 h-6 rounded-full border-2 shrink-0 transition flex items-center justify-center ${
            selected
              ? "border-[#1a56db] bg-[#FADE2B] shadow-[0_0_0_3px_rgba(250,222,43,0.35)]"
              : "border-slate-300 bg-white"
          }`}
          aria-hidden
        >
          {selected && (
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 text-[#1a56db]"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

function InfoBanner({ cooperationModel }) {
  const isReferral = cooperationModel === "referral";
  const isStore = cooperationModel === "store";

  const afterCopy = isReferral
    ? "即可開始使用您的專屬連結"
    : isStore
      ? "即可開始經營您的專屬商店"
      : "即可開通專屬連結或專屬商店";

  const benefitCopy = isReferral
    ? "零成本推廣 · 即時分潤 · 無月費"
    : isStore
      ? "零成本開店 · 即時分潤 · 無月費"
      : "零成本合作 · 即時分潤 · 無月費";

  return (
    <div className="border border-blue-100 rounded-2xl overflow-hidden mb-8 bg-blue-50/30">
      <div className="grid grid-cols-2 divide-x divide-blue-100 border-b border-blue-100">
        <div className="p-3 text-center">
          <p className="text-[16px] font-bold text-[#1a56db] mb-0.5">
            一般審核
          </p>
          <p className="text-[14px] text-slate-600 leading-relaxed">
            <span className="bg-yellow-200 font-bold text-slate-800 px-1">
              1 – 2 工作天
            </span>{" "}
            內回覆
          </p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[16px] font-bold text-[#1a56db] mb-0.5">
            審核通過後
          </p>
          <p className="text-[14px] text-slate-600 leading-relaxed">
            <span className="bg-yellow-200 font-bold text-slate-800 px-1">
              當日
            </span>{" "}
            {afterCopy}
          </p>
        </div>
      </div>
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-[14px] text-slate-500">{benefitCopy}</p>
        <p className="text-lg font-black text-[#1a56db] shrink-0">NT$ 0</p>
      </div>
    </div>
  );
}

export default function RegisterDistributor() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [agreedMeta, setAgreedMeta] = useState(null);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [animKey, setAnimKey] = useState(0);

  // Email 驗證
  const [emailCode, setEmailCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailVerifyMsg, setEmailVerifyMsg] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [resendWait, setResendWait] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const t = setTimeout(() => setCodeCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [codeCooldown]);

  useEffect(() => {
    if (resendWait <= 0) return;
    const t = setTimeout(() => setResendWait((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendWait]);

  // 從合作頁 ?mode=referral|store 預選合作模式
  useEffect(() => {
    if (!router.isReady) return;
    const raw = String(router.query.mode || "").toLowerCase();
    const model =
      raw === "referral" || raw === "link"
        ? "referral"
        : raw === "store" || raw === "shop"
          ? "store"
          : null;
    if (!model) return;
    setForm((prev) =>
      prev.cooperationModel === model
        ? prev
        : { ...prev, cooperationModel: model },
    );
  }, [router.isReady, router.query.mode]);

  // 送出成功頁：再噴一輪緞帶慶祝
  useEffect(() => {
    if (!submitted) return;
    const t1 = window.setTimeout(() => {
      fireCelebrationConfettiFromElement(null, {
        particleCount: 120,
        spread: 90,
        startVelocity: 48,
      });
    }, 80);
    const t2 = window.setTimeout(() => {
      fireCelebrationConfettiFromElement(null, {
        particleCount: 70,
        spread: 360,
        startVelocity: 28,
        origin: { x: 0.5, y: 0.35 },
      });
    }, 400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [submitted]);

  const resetEmailVerification = () => {
    setIsEmailVerified(false);
    setIsCodeSent(false);
    setEmailCode("");
    setEmailVerifyMsg("");
    setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
  };

  const handleEmailChange = (val) => {
    if (val.trim().toLowerCase() !== form.email.trim().toLowerCase()) {
      resetEmailVerification();
    }
    set("email", val);
  };

  const sendEmailCode = async (action = "new") => {
    if (sendingCode || codeCooldown > 0) return;
    const email = form.email.trim();
    if (!email) {
      setEmailVerifyMsg("請先輸入 Email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailVerifyMsg("Email 格式不正確");
      return;
    }

    setSendingCode(true);
    setEmailVerifyMsg("");
    try {
      const res = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCodeSent(true);
        setIsEmailVerified(false);
        setEmailVerifyMsg(
          action === "resend"
            ? "已重新寄送驗證碼至您的信箱"
            : "驗證碼已寄出，請查收 Email",
        );
        setCodeCooldown(data.cooldown ?? 10);
        setResendWait(EMAIL_RESEND_WAIT);
      } else {
        setEmailVerifyMsg(data.message || "驗證碼寄送失敗");
      }
    } catch (err) {
      setEmailVerifyMsg("寄送失敗：" + err.message);
    } finally {
      setSendingCode(false);
    }
  };

  const verifyEmailCode = async () => {
    if (verifyingCode || isEmailVerified) return;
    const email = form.email.trim();
    if (!email || !emailCode.trim()) {
      setEmailVerifyMsg("請輸入 Email 與驗證碼");
      return;
    }

    setVerifyingCode(true);
    setEmailVerifyMsg("");
    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: emailCode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEmailVerified(true);
        setEmailVerifyMsg("Email 已驗證成功");
        setErrorMsg("");
      } else {
        setEmailVerifyMsg(data.message || "驗證碼錯誤或已過期");
      }
    } catch (err) {
      setEmailVerifyMsg("驗證失敗：" + err.message);
    } finally {
      setVerifyingCode(false);
    }
  };

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const setProfile = (updater) =>
    setForm((prev) => ({
      ...prev,
      profile:
        typeof updater === "function" ? updater(prev.profile || {}) : updater,
    }));

  const selectPartnerType = (type) => {
    setForm((prev) => ({
      ...prev,
      partnerType: type,
      profile: {}, // 切換身份時重置推廣資源
    }));
  };

  const profileConfig = PARTNER_PROFILE_CONFIG[form.partnerType];
  const step3Title = profileConfig
    ? { title: profileConfig.title, sub: profileConfig.sub }
    : {
        title: "您的推廣資源",
        sub: "以下為選填，幫助我們更快了解您的推廣能力。",
      };

  const goTo = (nextStep) => {
    setAnimKey((k) => k + 1);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateStep = (s) => {
    if (s === 1) {
      if (!form.cooperationModel) return "請選擇合作模式（專屬連結或專屬商店）";
      if (!form.partnerType) return "請選擇您的合作身份";
      if (form.partnerType === "other" && !form.partnerTypeOther.trim())
        return "請說明您的身份類型";
    }
    if (s === 2) {
      if (!form.companyName.trim()) return "請填寫公司 / 頻道 / 個人名稱";
      if (!form.email.trim()) return "請填寫 Email 地址";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        return "Email 格式不正確";
      if (!isEmailVerified) return "請先完成 Email 驗證後才能繼續";
      if (!form.password) return "請設定夥伴後台登入密碼";
      const passwordError = validatePassword(form.password);
      if (passwordError) return passwordError;
      if (form.password !== form.confirmPassword) return "兩次輸入的密碼不一致";
      if (!form.phone.trim()) return "請填寫聯絡電話";
      const phoneDigits = form.phone.replace(/\D/g, "");
      if (phoneDigits.length < 8) return "請填寫有效的聯絡電話";
    }
    if (s === 4) {
      if (!form.cooperationModel) return "請選擇合作模式（專屬連結或專屬商店）";
      if (form.cooperationModel === "store") {
        if (!form.slug.trim()) return "請設定專屬商店代碼";
        if (!/^[a-z0-9-_]+$/.test(form.slug))
          return "代碼僅限小寫英文、數字、連字號";
      }
      if (!agreed || !agreedMeta) return "請先閱讀並同意合作須知";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) return setErrorMsg(err);
    setErrorMsg("");
    goTo(step + 1);
  };

  const handleBack = () => {
    setErrorMsg("");
    goTo(step - 1);
  };

  const submitApplication = async () => {
    const err = validateStep(4) || validateStep(2);
    if (err) {
      setErrorMsg(err);
      throw new Error(err);
    }
    setErrorMsg("");

    const descriptionParts = buildDescription(form);
    const email = form.email.trim().toLowerCase();
    const isReferral = form.cooperationModel === "referral";

    let slug = form.slug.trim().toLowerCase();
    let referralCode = null;
    if (isReferral) {
      const codeRes = await fetch("/api/partner/allocate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.companyName }),
      });
      const codeData = await codeRes.json();
      if (!codeRes.ok || !codeData.success || !codeData.code) {
        const msg = codeData.message || "無法產生專屬分潤連結，請稍後再試";
        setErrorMsg(msg);
        throw new Error(msg);
      }
      slug = codeData.code;
      referralCode = codeData.code;
    }

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    let accessToken = currentSession?.access_token || "";

    // 僅有 LINE（NextAuth）session 時，先換成 Supabase token 以便綁定
    if (!accessToken) {
      try {
        const bridgeRes = await fetch("/api/auth/line-supabase-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const bridge = await bridgeRes.json();
        if (bridgeRes.ok && bridge.success && bridge.tokenHash) {
          const { data: otpData, error: otpErr } =
            await supabase.auth.verifyOtp({
              token_hash: bridge.tokenHash,
              type: "email",
            });
          if (!otpErr) {
            accessToken = otpData?.session?.access_token || "";
          }
        }
      } catch {
        /* 未 LINE 登入則略過 */
      }
    }

    const authHeaders = {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };

    const authRes = await fetch("/api/partner/register-auth", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ email, password: form.password }),
    });
    const authData = await authRes.json();
    if (!authRes.ok || !authData.success) {
      const msg = authData.message || "建立登入帳號失敗";
      setErrorMsg(msg);
      if (msg.includes("Email 驗證")) goTo(2);
      throw new Error(msg);
    }

    const partnerRow = {
      name: form.companyName.trim(),
      slug,
      email,
      status: "pending",
      description: descriptionParts,
      cooperation_model: isReferral ? "referral" : "store",
      referral_code: referralCode,
      referral_rate: 25,
      agreed_terms_version: agreedMeta?.version || null,
      agreed_terms_at: agreedMeta?.agreedAt || null,
    };
    if (authData.authUserId) partnerRow.auth_user_id = authData.authUserId;
    if (authData.lineUserId) partnerRow.line_user_id = authData.lineUserId;

    const { error } = await supabase.from("partners").insert([partnerRow]);

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        setErrorMsg(
          isReferral
            ? "此 Email 已申請過，請改用其他 Email 或聯絡客服。"
            : "此 Email 或專屬商店代碼已被使用，請返回修改。",
        );
        if (!isReferral) goTo(4);
      } else {
        setErrorMsg("申請失敗：" + error.message);
      }
      throw error;
    }

    await supabase.auth.signOut();

    return authData.existing ? "existing" : "new";
  };

  if (submitted) {
    return (
      <Layout seo={{ title: "申請已送出 | JEKO eSIM 合作夥伴" }}>
        <div className="min-h-[60vh] flex items-center justify-center bg-white px-6 font-sans pb-16">
          <div className="text-center max-w-md animate-in fade-in duration-500">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-[#FADE2B] border-4 border-[#1a56db]/20 flex items-center justify-center shadow-lg">
              <svg
                viewBox="0 0 24 24"
                className="w-8 h-8 text-[#1a56db]"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-3">
              申請已送出！
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              我們已收到您的合作申請，請耐心等候審核。
            </p>

            <div className="text-left bg-blue-50/80 border border-blue-100 rounded-2xl px-4 py-4 mb-4 space-y-3">
              <div>
                <p className="text-[11px] font-bold text-[#1a56db] uppercase tracking-wide mb-1">
                  審核通知信
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  審核完成後（約{" "}
                  <span className="bg-yellow-200 text-slate-800 font-bold px-1">
                    1 – 2 個工作天
                  </span>
                  ），我們會寄一封{" "}
                  <strong className="text-slate-700">「開通通知信」</strong> 至{" "}
                  <strong className="text-slate-700">{form.email}</strong>
                  ，內含您的
                  {form.cooperationModel === "referral"
                    ? "專屬推薦連結"
                    : "專屬商店網址"}
                  與登入方式。
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  登入帳號
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  請使用申請時設定的 Email 與密碼；若此 Email
                  已是會員帳號，則沿用原密碼。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-left bg-amber-50 border border-amber-100 rounded-xl px-3 py-3 mb-8">
              <p className="text-xs text-amber-900/80 leading-relaxed">
                <strong className="text-amber-900">
                  審核中尚無法登入夥伴後台。
                </strong>
                請先等候開通通知信，收到後再前往{" "}
                <Link
                  href="/partner/login"
                  className="text-[#1a56db] font-bold hover:underline"
                >
                  夥伴登入頁
                </Link>
                。
              </p>
            </div>
            <Link
              href="/"
              className="inline-block bg-[#1a56db] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#1344b5] transition"
            >
              回到首頁
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const canNext =
    step === 1
      ? !!form.cooperationModel &&
        !!form.partnerType &&
        (form.partnerType !== "other" || !!form.partnerTypeOther.trim())
      : step === 2
        ? !!form.companyName.trim() &&
          !!form.email.trim() &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
          isEmailVerified &&
          isPasswordValid(form.password) &&
          form.password === form.confirmPassword &&
          !!form.phone.trim() &&
          form.phone.replace(/\D/g, "").length >= 8
        : true;

  const step4Title =
    form.cooperationModel === "referral"
      ? {
          title: "確認申請並送出",
          sub: "審核通過後，系統會自動發放您的專屬分潤連結，並寄到您的 Email。",
        }
      : form.cooperationModel === "store"
        ? {
            title: "設定專屬商店並確認",
            sub: "審核通過後，您的專屬商店將依此代碼立即上線。",
          }
        : STEP_TITLES[4];

  const companyNameHint =
    form.cooperationModel === "referral"
      ? "用於夥伴後台與審核識別（專屬連結模式不會開店）"
      : form.cooperationModel === "store"
        ? "將顯示於您的專屬商店頁面"
        : "審核與夥伴後台識別用名稱";

  return (
    <Layout
      seo={{
        title: `合作夥伴申請 (${step}/${STEPS.length}) | JEKO eSIM`,
      }}
    >
      <div className="min-h-screen bg-white font-sans pb-12">
        <div className="max-w-lg mx-auto px-6 py-6 md:py-10">
          <BrandHeader />

          {step === 1 && (
            <InfoBanner cooperationModel={form.cooperationModel} />
          )}

          <StepIndicator current={step} total={STEPS.length} />

          {/* 步驟內容 — 切換動畫 */}
          <div
            key={animKey}
            className="animate-in fade-in slide-in-from-right-4 duration-300"
          >
            <div className="mb-7">
              <p className="text-[11px] font-bold text-[#1a56db] uppercase tracking-widest mb-1">
                Step {step} / {STEPS.length} · {STEPS[step - 1].label}
              </p>
              <h1 className="text-xl font-black text-slate-900 mb-1">
                {step === 3
                  ? step3Title.title
                  : step === 4
                    ? step4Title.title
                    : STEP_TITLES[step].title}
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                {step === 3
                  ? step3Title.sub
                  : step === 4
                    ? step4Title.sub
                    : STEP_TITLES[step].sub}
              </p>
            </div>

            {/* Step 1：合作模式 + 合作身份 */}
            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div className="space-y-2.5">
                  <p className="text-[13px] font-black text-slate-800">
                    選擇合作模式 <span className="text-red-500">*</span>
                  </p>
                  <SelectCard
                    selected={form.cooperationModel === "referral"}
                    onClick={() => set("cooperationModel", "referral")}
                    label="專屬連結"
                    desc="審核通過後給您一條推薦連結。旅客進官網下單（可享專屬折扣），約可獲實付一成五分潤；Cookie 30 天內購買都算您的。"
                  />
                  <SelectCard
                    selected={form.cooperationModel === "store"}
                    onClick={() => set("cooperationModel", "store")}
                    label="專屬商店"
                    desc="審核通過後開通專屬商店，可自訂風格、自動選品與售價，利潤自己決定；旅客在您的店結帳才算分潤。"
                  />
                </div>

                <div className="space-y-2.5">
                  <p className="text-[13px] font-black text-slate-800">
                    您的合作身份 <span className="text-red-500">*</span>
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {PARTNER_TYPES.map((t) => (
                      <SelectCard
                        key={t.value}
                        selected={form.partnerType === t.value}
                        onClick={() => selectPartnerType(t.value)}
                        label={t.label}
                        desc={t.desc}
                      />
                    ))}
                    {form.partnerType === "other" && (
                      <div className="mt-2 animate-in fade-in duration-200">
                        <UnderlineField label="請說明您的身份類型" required>
                          <input
                            type="text"
                            value={form.partnerTypeOther}
                            onChange={(e) =>
                              set("partnerTypeOther", e.target.value)
                            }
                            placeholder="例如：機場接送業者、語言學校..."
                            className={FIELD_INPUT_CLASS}
                          />
                        </UnderlineField>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2：基本資料 */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <UnderlineField
                  label="公司 / 頻道 / 個人名稱"
                  required
                  hint={companyNameHint}
                >
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => set("companyName", e.target.value)}
                    placeholder="例如：東京旅遊小幫手、OO旅行社"
                    className={FIELD_INPUT_CLASS}
                  />
                </UnderlineField>
                <UnderlineField
                  label="聯絡人姓名"
                  hint="選填，方便我們電話確認"
                >
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                    placeholder="您的姓名或暱稱"
                    className={FIELD_INPUT_CLASS}
                  />
                </UnderlineField>
                <UnderlineField
                  label="Email 地址"
                  required
                  hint="審核通知與夥伴後台登入皆使用此 Email，需完成驗證後才能繼續"
                >
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="your@email.com"
                      className={`flex-1 min-w-0 ${FIELD_INPUT_CLASS}`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        sendEmailCode(isCodeSent ? "resend" : "new")
                      }
                      disabled={
                        sendingCode ||
                        codeCooldown > 0 ||
                        (isCodeSent && resendWait > 0)
                      }
                      className="shrink-0 rounded-full px-3 py-2 text-[11px] font-bold bg-[#1a56db] text-white hover:bg-[#1344b5] disabled:bg-slate-200 disabled:text-slate-400 transition whitespace-nowrap"
                    >
                      {sendingCode
                        ? "寄送中..."
                        : codeCooldown > 0
                          ? `${codeCooldown}s`
                          : isCodeSent && resendWait > 0
                            ? `${resendWait}s 後可重寄`
                            : isCodeSent
                              ? "重新寄送"
                              : "發送驗證碼"}
                    </button>
                  </div>
                </UnderlineField>

                {isCodeSent && !isEmailVerified && (
                  <UnderlineField
                    label="Email 驗證碼"
                    required
                    hint="請至信箱查收 6 位數驗證碼，10 分鐘內有效"
                  >
                    <div className="flex items-center gap-2 py-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={emailCode}
                        onChange={(e) =>
                          setEmailCode(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="000000"
                        className={`flex-1 min-w-0 ${FIELD_INPUT_CLASS} font-mono tracking-widest`}
                      />
                      <button
                        type="button"
                        onClick={verifyEmailCode}
                        disabled={verifyingCode || emailCode.length < 6}
                        className="shrink-0 rounded-full px-3 py-2 text-[11px] font-bold bg-[#1a56db] text-white hover:bg-[#1344b5] disabled:bg-slate-200 disabled:text-slate-400 transition whitespace-nowrap"
                      >
                        {verifyingCode ? "驗證中..." : "確認驗證"}
                      </button>
                    </div>
                  </UnderlineField>
                )}

                {isEmailVerified && (
                  <div className="text-[12px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    Email 已驗證。建議先在官網用 LINE／Google
                    登入後再送出申請，審核通過後可用同一按鈕進後台；以下密碼作為備援登入。
                  </div>
                )}

                {isEmailVerified && (
                  <>
                    <PasswordRevealField
                      label="夥伴後台登入密碼"
                      required
                      hint={`審核通過後，以此密碼登入 /partner/login（${PASSWORD_HINT}）`}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="設定登入密碼"
                      show={showPassword}
                      onToggleShow={() => setShowPassword((v) => !v)}
                    />
                    <PasswordRevealField
                      label="確認密碼"
                      required
                      value={form.confirmPassword}
                      onChange={(e) => set("confirmPassword", e.target.value)}
                      placeholder="再輸入一次密碼"
                      show={showConfirmPassword}
                      onToggleShow={() => setShowConfirmPassword((v) => !v)}
                    />
                    {form.confirmPassword &&
                      form.password !== form.confirmPassword && (
                        <p className="text-[12px] text-red-500 -mt-4">
                          兩次輸入的密碼不一致
                        </p>
                      )}
                  </>
                )}

                {emailVerifyMsg && (
                  <p
                    className={`text-[12px] -mt-2 ${
                      isEmailVerified ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    {emailVerifyMsg}
                  </p>
                )}

                <UnderlineField
                  label="聯絡電話"
                  required
                  hint="審核時如需確認會致電，請填寫可聯絡到的手機"
                >
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="09xx-xxx-xxx"
                    className={FIELD_INPUT_CLASS}
                  />
                </UnderlineField>
                <UnderlineField
                  label="LINE ID"
                  hint="選填，方便審核或開通後以 LINE 聯繫您"
                >
                  <input
                    type="text"
                    value={form.lineId}
                    onChange={(e) => set("lineId", e.target.value)}
                    placeholder="例如：@your_line_id"
                    className={FIELD_INPUT_CLASS}
                  />
                </UnderlineField>
              </div>
            )}

            {/* Step 3：推廣資源（依身份動態） */}
            {step === 3 && form.partnerType && (
              <div className="flex flex-col gap-6">
                <ProfileFields
                  partnerType={form.partnerType}
                  profile={form.profile || {}}
                  setProfile={setProfile}
                />
                <UnderlineField
                  label="推廣計畫補充說明"
                  hint="選填，例如：打算在出團前 7 天於 LINE 群組推廣 eSIM"
                >
                  <textarea
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    rows={3}
                    placeholder="簡述您的推廣方式與時機..."
                    className={`${FIELD_INPUT_CLASS} resize-none`}
                  />
                </UnderlineField>
              </div>
            )}

            {/* Step 4：確認送出 */}
            {step === 4 && (
              <div className="flex flex-col gap-6">
                <div className="space-y-2.5">
                  <p className="text-[13px] font-black text-slate-800">
                    選擇合作模式 <span className="text-red-500">*</span>
                  </p>
                  <SelectCard
                    selected={form.cooperationModel === "referral"}
                    onClick={() => set("cooperationModel", "referral")}
                    label="專屬連結"
                    desc="審核通過後給您一條連結。旅客進官網下單（可享專屬折扣），約可獲實付一成五分潤；Cookie 30 天內購買都算您的。"
                  />
                  <SelectCard
                    selected={form.cooperationModel === "store"}
                    onClick={() => set("cooperationModel", "store")}
                    label="專屬商店"
                    desc="審核通過後開通 /p/您的代碼 商店，可自訂風格、AI 選品與售價，利潤自己決定；旅客在您的店結帳才算分潤。"
                  />
                </div>

                {/* 小白友善說明 + 代碼（商店需自訂；連結模式自動發放） */}
                {form.cooperationModel === "referral" ? (
                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-3">
                    <p className="text-[13px] font-black text-[#1a56db]">
                      專屬分潤連結：系統自動發放
                    </p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                      審核通過後，系統會為您產生一條專屬推薦連結（例如{" "}
                      <span className="font-mono text-[#1a56db]">
                        jeko-esim.com.tw/?ref=您的代碼
                      </span>
                      ）。旅客點進來後 30 天內在官網購買，分潤仍歸您——
                      <strong className="text-slate-800">
                        無需自行設定代碼
                      </strong>
                      。
                    </p>
                    <ul className="text-[11px] text-slate-500 space-y-1 list-disc pl-4 marker:text-[#1a56db]">
                      <li>開通通知信會附上完整連結與後台登入方式</li>
                      <li>也可到夥伴後台隨時複製分享連結</li>
                      <li>可貼在 LINE 群組、IG 限動、名片或官網</li>
                    </ul>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-3">
                      <p className="text-[13px] font-black text-[#1a56db]">
                        什麼是「專屬商店網址代碼」？
                      </p>
                      <p className="text-[12px] text-slate-600 leading-relaxed">
                        簡單來說，這就是
                        <strong className="text-slate-800">
                          您專屬商店的網址名字
                        </strong>
                        。審核通過後，旅客只要打開這個連結，看到的就是
                        <strong className="text-slate-800">
                          掛您名下的 eSIM 小舖
                        </strong>
                        （不是 Jeko 總站首頁），您從中獲得分潤。
                      </p>
                      <div className="bg-white/80 rounded-xl px-3 py-2.5 border border-blue-100/80">
                        <p className="text-[11px] text-slate-400 mb-1">
                          舉例說明
                        </p>
                        <p className="text-[12px] text-slate-600 mb-1">
                          若代碼填{" "}
                          <span className="font-mono font-bold text-[#1a56db] bg-blue-50 px-1.5 py-0.5 rounded">
                            tokyo-travel
                          </span>
                          ，您的賣場網址就是：
                        </p>
                        <p className="text-[13px] font-mono font-bold text-[#1a56db] break-all">
                          www.jeko-esim.com.tw/p/tokyo-travel
                        </p>
                        <p className="text-[11px] text-slate-400 mt-2">
                          可貼在 LINE 群組、IG 限動、名片或官網。
                        </p>
                      </div>
                      <ul className="text-[11px] text-slate-500 space-y-1 list-disc pl-4 marker:text-[#1a56db]">
                        <li>
                          僅限小寫英文、數字、連字號（例如：my-shop、travel2024）
                        </li>
                        <li>
                          設定後原則上
                          <strong className="text-slate-600">無法修改</strong>
                          ，請用容易記、好分享的名稱
                        </li>
                        <li>建議用英文或拼音，避免空格與特殊符號</li>
                      </ul>
                    </div>

                    <UnderlineField
                      label="專屬商店網址代碼"
                      required
                      hint="請在下方輸入您想要的代碼"
                    >
                      <div className="flex items-center gap-1 py-1">
                        <span className="text-xs text-slate-400 shrink-0 font-mono">
                          /p/
                        </span>
                        <input
                          type="text"
                          value={form.slug}
                          onChange={(e) =>
                            set(
                              "slug",
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-_]/g, ""),
                            )
                          }
                          placeholder="tokyo-travel"
                          className={`flex-1 ${FIELD_INPUT_CLASS} font-mono`}
                        />
                      </div>
                    </UnderlineField>

                    {form.slug && (
                      <div className="bg-[#1a56db]/5 border border-[#1a56db]/20 rounded-xl px-4 py-3">
                        <p className="text-[10px] text-[#1a56db] font-bold uppercase mb-1">
                          您的賣場預覽網址
                        </p>
                        <p className="text-sm font-mono font-bold text-[#1a56db] break-all">
                          {`www.jeko-esim.com.tw/p/${form.slug}`}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex flex-col gap-3">
                  <p className="text-xs font-bold text-[#1a56db] uppercase tracking-wide">
                    申請摘要
                  </p>
                  {[
                    {
                      label: "合作模式",
                      value:
                        form.cooperationModel === "referral"
                          ? "專屬連結"
                          : form.cooperationModel === "store"
                            ? "專屬商店"
                            : "—",
                    },
                    {
                      label: "合作身份",
                      value:
                        PARTNER_TYPES.find((t) => t.value === form.partnerType)
                          ?.label || "—",
                    },
                    { label: "名稱", value: form.companyName || "—" },
                    {
                      label: "Email",
                      value: `${form.email || "—"}${isEmailVerified ? "（已驗證）" : ""}`,
                    },
                    {
                      label: "登入密碼",
                      value: form.password ? "已設定" : "—",
                    },
                    { label: "聯絡人", value: form.contactName || "（未填）" },
                    { label: "電話", value: form.phone || "—" },
                    { label: "LINE ID", value: form.lineId || "（未填）" },
                    ...buildProfileSummary(
                      form.partnerType,
                      form.profile || {},
                    ),
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between gap-4 text-sm"
                    >
                      <span className="text-slate-400 shrink-0">
                        {row.label}
                      </span>
                      <span className="font-bold text-slate-700 text-right">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {agreed && agreedMeta ? (
                  <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3.5">
                    <div className="flex items-start gap-2.5">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-[12px] text-emerald-800 leading-relaxed">
                        已於{" "}
                        {new Date(agreedMeta.agreedAt).toLocaleString(
                          "zh-TW",
                          { hour12: false },
                        )}{" "}
                        同意合作須知，並確認以上填寫資料正確無誤。
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAgreementModal(true)}
                      className="shrink-0 text-[11px] font-bold text-[#1a56db] underline"
                    >
                      重新查看
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAgreementModal(true)}
                    className="w-full flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3.5 text-left hover:bg-amber-50 transition-colors"
                  >
                    <span className="text-[12px] font-bold text-amber-800">
                      請先閱讀並同意合作須知，才能送出申請
                    </span>
                    <span className="shrink-0 text-[11px] font-bold text-[#1a56db]">
                      查看合作須知 →
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          <CooperationAgreementModal
            open={showAgreementModal}
            mode={form.cooperationModel === "store" ? "store" : "referral"}
            onClose={() => setShowAgreementModal(false)}
            onAgree={(meta) => {
              setAgreedMeta(meta);
              setAgreed(true);
              setShowAgreementModal(false);
            }}
          />

          {errorMsg && (
            <p className="mt-5 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3 animate-in fade-in duration-200">
              {errorMsg}
            </p>
          )}

          {/* 導覽按鈕（藍黃設計） */}
          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="group relative flex-1 flex items-center justify-center py-4 rounded-full font-bold text-sm text-[#1a56db] bg-white border-2 border-[#1a56db] hover:bg-[#EFF6FC] transition-all"
              >
                <span className="absolute left-5 w-5 h-5 border-2 border-[#1a56db] bg-[#FADE2B] rounded-full flex items-center justify-center group-hover:-translate-x-0.5 transition-transform">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3 h-3 text-[#1a56db]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </span>
                上一步
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canNext}
                className="group relative flex-1 flex items-center justify-center py-4 rounded-full font-bold text-sm bg-[#1a56db] hover:bg-[#1344b5] disabled:bg-slate-200 disabled:text-slate-400 text-white transition-all shadow-[0_4px_14px_rgba(26,86,219,0.35)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(26,86,219,0.45)] disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0"
              >
                下一步
                <span
                  className={`absolute right-5 w-5 h-5 border-2 rounded-full flex items-center justify-center transition-transform ${
                    canNext
                      ? "border-[#FADE2B] group-hover:translate-x-0.5"
                      : "border-slate-300"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-3 h-3 ${canNext ? "text-[#FADE2B]" : "text-slate-400"}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </button>
            ) : (
              <ConfettiButton
                onClick={submitApplication}
                onSuccess={() => setSubmitted(true)}
                disabled={
                  !agreed ||
                  (form.cooperationModel === "store" && !form.slug.trim())
                }
                successDelay={1100}
                className="flex-1 py-4 rounded-full font-bold text-sm bg-[#1a56db] hover:bg-[#1344b5] disabled:bg-slate-300 disabled:hover:bg-slate-300 text-white transition-all shadow-[0_4px_14px_rgba(26,86,219,0.35)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0"
                loadingLabel="送出中..."
                successLabel="申請已送出！"
              >
                同意條款並送出申請
              </ConfettiButton>
            )}
          </div>

          {step === 3 && (
            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                goTo(4);
              }}
              className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 transition py-2"
            >
              暫時跳過，稍後再填 →
            </button>
          )}

          <p className="text-center text-sm text-slate-400 mt-6">
            已是合作夥伴？{" "}
            <Link
              href="/partner/login"
              className="text-[#1a56db] font-bold hover:underline"
            >
              夥伴後台登入
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
