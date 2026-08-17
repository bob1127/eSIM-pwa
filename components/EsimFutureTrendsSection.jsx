"use client";

/**
 * 曲線圖版型不變；文案改為「未來 eSIM 趨勢」與「智慧手機支援 eSIM」
 *
 * 數據原則：不寫產值「幾億美元」；以倍數、年增％、採用占比呈現。
 * - Juniper：旅遊 eSIM 2025→2030 約 4.8 倍；期間年增約 85%
 * - GSMA 等：2030 智慧手機連線約 55%+ 採 eSIM
 * - Klook 2026/1：台灣旅客出國上網每 2 人就有 1 人首選 eSIM
 * - 交通部觀光署：自由行出境旅客約 75%
 */
import { motion } from "framer-motion";
import Copy from "@/components/MaskText";

/* ---------- 曲線參數（指數成長曲線，與 PikFun 相同） ---------- */
const X0 = 60;
const X1 = 1400;
const Y0 = 560;
const Y1 = 230;
const K = 3.1;
const EXP_DENOM = Math.exp(K) - 1;

const curveX = (t) => X0 + (X1 - X0) * t;
const curveY = (t) => Y0 - (Y0 - Y1) * ((Math.exp(K * t) - 1) / EXP_DENOM);

const buildPath = (t0, t1, offset = 0, steps = 90) => {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    d += `${i === 0 ? "M" : "L"}${curveX(t).toFixed(1)},${(
      curveY(t) + offset
    ).toFixed(1)} `;
  }
  return d;
};

/* ---------- 里程碑：直式中文 / 橫式英文交錯 ---------- */
const MILESTONES = [
  { type: "v", label: "eSIM技術登場", lift: 56 },
  { type: "h", title: "ORIGIN", sub: "eSIM Arrives", lift: 44 },
  { type: "v", label: "手機開始內建", lift: 70 },
  { type: "h", title: "DEVICE", sub: "Phones Go eSIM", lift: 48 },
  { type: "v", label: "旅遊eSIM竄起", lift: 60 },
  { type: "h", title: "TRAVEL", sub: "Travel eSIM Boom", lift: 46 },
  { type: "v", label: "2026半數首選", lift: 76 },
  { type: "h", title: "2026", sub: "1 in 2 Prefer eSIM", lift: 50 },
  { type: "v", label: "雙eSIM成常態", lift: 64 },
  { type: "h", title: "DUAL", sub: "Dual eSIM Default", lift: 48 },
  { type: "v", label: "新機支援過半", lift: 78 },
  { type: "h", title: "SHIP", sub: "Most New Phones", lift: 52 },
  { type: "v", label: "2030過半連線", lift: 66 },
  { type: "h", title: "2030", sub: "55%+ Connections", lift: 48 },
];

const T_START = 0.035;
const T_STEP = 0.93 / (MILESTONES.length - 1);

const FUTURE_STATS = [
  {
    label: "旅遊 eSIM 市場（2025→2030）",
    value: "約 4.8 倍",
    unit: "規模翻倍",
    note: "Juniper Research",
  },
  {
    label: "相對前一年成長",
    value: "+85%",
    unit: "年增（約 2025）",
    note: "Juniper 旅遊 eSIM 觀察",
  },
  {
    label: "2026 台灣旅客首選",
    value: "每2人1人",
    unit: "選 eSIM",
    note: "Klook 調查（2026/1）",
  },
];

const PHONE_STATS = [
  {
    label: "2030 智慧手機連線",
    value: "55%+",
    unit: "採 eSIM",
    note: "GSMA 等機構預估",
  },
  {
    label: "美區新 iPhone",
    value: "eSIM-only",
    unit: "該市場新機",
    note: "帶動全球取消實體卡槽",
  },
  {
    label: "雙 eSIM 機種",
    value: "成常態",
    unit: "旗艦／中高階",
    note: "2026 起支援率持續拉升",
  },
];

function StatGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-5">
      {items.map((s) => (
        <div key={s.label}>
          <p className="text-[12px] font-bold tracking-wider text-[#8B96A5] mb-2">
            {s.label}
          </p>
          <p className="text-[26px] md:text-[30px] font-black text-[#111] leading-none tracking-tight">
            {s.value}
            <span className="ml-1.5 text-[12px] md:text-[13px] font-bold text-[#5B6570]">
              {s.unit}
            </span>
          </p>
          <p className="mt-2 text-[12px] font-semibold text-[#1E4AD1]">
            {s.note}
          </p>
        </div>
      ))}
    </div>
  );
}
function VerticalLabel({ x, bottomY, label }) {
  const chars = label.split("");
  const lineH = 23;
  const boxW = 30;
  const boxH = chars.length * lineH + 14;
  const topY = bottomY - boxH;
  return (
    <g>
      <rect x={x - boxW / 2} y={topY} width={boxW} height={boxH} fill="#111" />
      {chars.map((c, i) => (
        <text
          key={`${label}-${i}`}
          x={x}
          y={topY + 14 + i * lineH + lineH / 2}
          textAnchor="middle"
          fontSize="16"
          fontWeight="700"
          fill="#fff"
        >
          {c}
        </text>
      ))}
    </g>
  );
}

function HorizontalLabel({ x, baseY, title, sub }) {
  return (
    <g>
      <text
        x={x}
        y={baseY}
        textAnchor="middle"
        fontSize="21"
        fontWeight="800"
        fill="#111"
        letterSpacing="0.5"
      >
        {title}
      </text>
      <text
        x={x}
        y={baseY + 16}
        textAnchor="middle"
        fontSize="10.5"
        fill="#555"
      >
        {sub}
      </text>
    </g>
  );
}

export default function EsimFutureTrendsSection() {
  const fadeUpProps = {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.8, ease: "easeOut" },
  };

  const mainPath = buildPath(0, 1, 0);
  const bluePaths = [26, 34, 42].map((off) => buildPath(0.5, 1.005, off));
  const blueSwoosh = buildPath(0.01, 0.4, 42);

  return (
    <section className="relative bg-white pb-24 pt-8 border-t border-slate-200 z-20 font-sans">
      <div className="max-w-[1440px] mx-auto px-6 md:px-16">
        {/* ---------- 標題區 ---------- */}
        <motion.div {...fadeUpProps}>
          <div className="flex items-center gap-2 mb-6">
            <span className="w-[7px] h-[7px] rounded-full bg-[#1E4AD1] inline-block" />
            <span className="text-[11px] font-bold tracking-[0.15em] text-gray-800 uppercase">
              Future eSIM · Device Support
            </span>
          </div>
          <Copy blockColor="#1E4AD1">
            <h2 className="text-2xl md:text-3xl lg:text-[32px] font-bold text-gray-900 leading-[1.6] tracking-wide mb-8">
              未來 eSIM 趨勢，與智慧手機支援浪潮
            </h2>
          </Copy>
          <Copy blockColor="#1E4AD1" stagger={0.12}>
            <p className="text-gray-600 leading-[2.2] text-[14px] md:text-[15px] text-justify max-w-[760px] mb-4">
              2026
              年，旅遊 eSIM 正從「出國備案」變成「出發標配」。市場規模用倍數看、採用率用百分比看——手機越支援，旅客越少帶卡，通路與夥伴的成長曲線也會跟著變陡。
            </p>
          </Copy>
        </motion.div>

        {/* ---------- 未來 eSIM ｜ 手機支援 並排 ---------- */}
        <motion.div
          {...fadeUpProps}
          transition={{ delay: 0.08, duration: 0.8 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 border-y border-slate-200 py-10 mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[11px] font-black tracking-[0.14em] text-[#1E4AD1] uppercase">
                Future
              </span>
              <span className="text-[13px] font-bold text-[#111]">
                未來 eSIM 趨勢
              </span>
            </div>
            <StatGrid items={FUTURE_STATS} />
          </div>

          <div className="lg:border-l lg:border-slate-200 lg:pl-10">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[11px] font-black tracking-[0.14em] text-[#1E4AD1] uppercase">
                Devices
              </span>
              <span className="text-[13px] font-bold text-[#111]">
                智慧手機支援 eSIM
              </span>
            </div>
            <StatGrid items={PHONE_STATS} />
          </div>
        </motion.div>
        {/* ---------- 成長曲線圖（手機可橫向捲動） ---------- */}
        <motion.div
          {...fadeUpProps}
          transition={{ delay: 0.15, duration: 0.8 }}
          className="overflow-x-auto"
        >
          <svg
            viewBox="0 0 1440 640"
            className="min-w-[1100px] w-full h-auto select-none"
            role="img"
            aria-label="未來 eSIM 與智慧手機支援趨勢成長曲線圖"
          >
            <defs>
              <marker
                id="esim-pf-arrow"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#1E4AD1" />
              </marker>
            </defs>

            <path
              d={blueSwoosh}
              fill="none"
              stroke="#1E4AD1"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {bluePaths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="#1E4AD1"
                strokeWidth={i === 0 ? 4 : 2.5}
                strokeLinecap="round"
                markerEnd="url(#esim-pf-arrow)"
              />
            ))}

            <path
              d={mainPath}
              fill="none"
              stroke="#111"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            <text
              x={curveX(0.19)}
              y={curveY(0.19) + 30}
              fontSize="13"
              fill="#333"
              letterSpacing="2"
              transform={`rotate(-3 ${curveX(0.19)} ${curveY(0.19) + 30})`}
            >
              eSIM 導入期
            </text>

            <text
              x={curveX(0.78)}
              y={curveY(0.78) + 96}
              fontSize="13"
              fill="#333"
              letterSpacing="2"
              transform={`rotate(-33 ${curveX(0.78)} ${curveY(0.78) + 96})`}
            >
              2026 加速成長期
            </text>

            {[
              { t: 0.02, label: "0" },
              { t: 0.5, label: "1" },
              { t: 0.78, label: "10" },
              { t: 0.93, label: "100" },
            ].map(({ t, label }) => (
              <g key={label}>
                <line
                  x1={curveX(t)}
                  y1={curveY(t) - 7}
                  x2={curveX(t)}
                  y2={curveY(t) + 7}
                  stroke="#111"
                  strokeWidth="1.5"
                />
                <text
                  x={curveX(t) - 14}
                  y={curveY(t) + 22}
                  fontSize="14"
                  fontStyle="italic"
                  fill="#666"
                  fontFamily="Georgia, serif"
                >
                  {label}
                </text>
              </g>
            ))}

            {MILESTONES.map((m, i) => {
              const t = T_START + i * T_STEP;
              const x = curveX(t);
              const dotY = curveY(t);
              const labelBottom = dotY - m.lift;
              return (
                <g key={i}>
                  <line
                    x1={x}
                    y1={dotY - 9}
                    x2={x}
                    y2={m.type === "v" ? labelBottom + 4 : labelBottom + 22}
                    stroke="#999"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />
                  <circle
                    cx={x}
                    cy={dotY}
                    r="5.5"
                    fill="#111"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  {m.type === "v" ? (
                    <VerticalLabel
                      x={x}
                      bottomY={labelBottom}
                      label={m.label}
                    />
                  ) : (
                    <HorizontalLabel
                      x={x}
                      baseY={labelBottom}
                      title={m.title}
                      sub={m.sub}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </motion.div>

        <p className="mt-3 text-[11px] text-[#9AA3AE] font-medium max-w-[960px]">
          倍數與年增％：Juniper Research（旅遊 eSIM 2025→2030）。連線占比：GSMA 等對 2030
          智慧手機 eSIM 連線預估。台灣採用：Klook 2026/1 出國網路偏好調查、交通部觀光署、電信業出境觀察。不列產值金額。曲線為趨勢示意。
        </p>

        {/* ---------- 下方兩欄：未來趨勢 ---------- */}
        <motion.div
          {...fadeUpProps}
          transition={{ delay: 0.25, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 mt-6 md:mt-2 md:px-10"
        >
          <div>
            <h3 className="text-[#1E4AD1] text-lg font-bold tracking-wider mb-4">
              未來 eSIM 趨勢
            </h3>
            <p className="text-[13px] leading-[2] text-gray-800">
              2026 成為「掃碼即走」的轉折年 / 旅遊 eSIM 市場 2025→2030 約翻 4.8 倍
              / 近一年年增約 85% / 自由行旅客把連線當出發清單，而不是落地再買卡 /
              原生高速與多國方案並行，通路與夥伴分潤跟著放大
            </p>
          </div>
          <div>
            <h3 className="text-[#1E4AD1] text-lg font-bold tracking-wider mb-4">
              智慧手機支援 eSIM
            </h3>
            <p className="text-[13px] leading-[2] text-gray-800">
              旗艦機普遍內建 eSIM，雙 eSIM 逐漸成常態 / 部分市場已走 eSIM-only
              新機 / 支援率拉高後，旅遊 eSIM 轉換成本下降 / 預估 2030
              智慧手機連線過半數（55%+）走 eSIM / 手機越支援，旅客越少帶實體卡
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
