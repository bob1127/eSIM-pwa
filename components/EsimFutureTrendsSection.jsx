"use client";

/**
 * 移植自 PikFun：pickleball-storefront/components/PickleballGrowthSection.jsx
 * 曲線圖版型不變；文案／里程碑改為「台灣旅遊 eSIM」
 *
 * 台灣相關數據來源（有憑據）：
 * - Klook 2026/1 台灣旅客出國網路偏好調查：每 2 人就有 1 人首選 eSIM
 * - 交通部觀光署：自由行出境旅客約 75%
 * - 遠傳觀察：2025 台灣出境人次年增約 12%
 * 全球產值對照：
 * - Juniper：旅遊 eSIM 約 $1.8bn（2025）→ $8.7bn（2030）
 * - GSMA 等：2030 智慧手機連線約 55%+ 採 eSIM
 * 註：台灣公開管道幾乎無「旅遊 eSIM 產值億美元」；全球數字僅作對照。
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
  { type: "v", label: "手機內建普及", lift: 70 },
  { type: "h", title: "DEVICE", sub: "Phones Go eSIM", lift: 48 },
  { type: "v", label: "疫後出國回溫", lift: 60 },
  { type: "h", title: "REOPEN", sub: "Travel Rebound", lift: 46 },
  { type: "v", label: "旅遊eSIM竄起", lift: 76 },
  { type: "h", title: "TRAVEL", sub: "Travel eSIM Boom", lift: 50 },
  { type: "v", label: "半數旅客首選", lift: 64 },
  { type: "h", title: "ADOPT", sub: "1 in 2 Prefer eSIM", lift: 48 },
  { type: "v", label: "通路全面鋪開", lift: 78 },
  { type: "h", title: "MARKET", sub: "Channels Expand", lift: 52 },
  { type: "v", label: "夥伴生態成形", lift: 66 },
  { type: "h", title: "SCALE", sub: "Partner Economy", lift: 48 },
];

const T_START = 0.035;
const T_STEP = 0.93 / (MILESTONES.length - 1);

const TW_STATS = [
  {
    label: "台灣旅客出國上網首選",
    value: "每2人1人",
    unit: "選 eSIM",
    note: "Klook 調查（2026/1）",
  },
  {
    label: "出境自由行占比",
    value: "約 75%",
    unit: "自由行",
    note: "交通部觀光署調查摘要",
  },
  {
    label: "出境旅遊動能",
    value: "+12%",
    unit: "年增（2025）",
    note: "電信業觀察出境人次",
  },
];

const GLOBAL_STATS = [
  {
    label: "全球旅遊 eSIM 營收",
    value: "約 18 億",
    unit: "美元／2025",
    note: "年增約 85% · Juniper",
  },
  {
    label: "2030 全球旅遊 eSIM",
    value: "約 87 億",
    unit: "美元",
    note: "約 4.8 倍成長 · Juniper",
  },
  {
    label: "2030 智慧手機連線",
    value: "55%+",
    unit: "採 eSIM",
    note: "GSMA 等機構預估",
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
              eSIM Trends in Taiwan
            </span>
          </div>
          <Copy blockColor="#1E4AD1">
            <h2 className="text-2xl md:text-3xl lg:text-[32px] font-bold text-gray-900 leading-[1.6] tracking-wide mb-8">
              台灣旅遊 eSIM 近年發展趨勢
            </h2>
          </Copy>
          <Copy blockColor="#1E4AD1" stagger={0.12}>
            <p className="text-gray-600 leading-[2.2] text-[14px] md:text-[15px] text-justify max-w-[760px] mb-4">
              台灣公開資料以旅客調查與出境動能為主；全球則有研究機構對旅遊 eSIM
              產值的預估。以下並排對照——左側看台灣採用率，右側看全球商機規模——協助夥伴掌握市場方向。
            </p>
          </Copy>
        </motion.div>

        {/* ---------- 台灣調查 ％ ｜ 全球產值 並排 ---------- */}
        <motion.div
          {...fadeUpProps}
          transition={{ delay: 0.08, duration: 0.8 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 border-y border-slate-200 py-10 mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[11px] font-black tracking-[0.14em] text-[#1E4AD1] uppercase">
                Taiwan
              </span>
              <span className="text-[13px] font-bold text-[#111]">
                台灣調查與動能
              </span>
            </div>
            <StatGrid items={TW_STATS} />
          </div>

          <div className="lg:border-l lg:border-slate-200 lg:pl-10">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[11px] font-black tracking-[0.14em] text-[#1E4AD1] uppercase">
                Global
              </span>
              <span className="text-[13px] font-bold text-[#111]">
                全球旅遊 eSIM 產值
              </span>
            </div>
            <StatGrid items={GLOBAL_STATS} />
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
            aria-label="台灣旅遊 eSIM 發展趨勢成長曲線圖"
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
              台灣旅遊 eSIM 萌芽期
            </text>

            <text
              x={curveX(0.78)}
              y={curveY(0.78) + 96}
              fontSize="13"
              fill="#333"
              letterSpacing="2"
              transform={`rotate(-33 ${curveX(0.78)} ${curveY(0.78) + 96})`}
            >
              旅客採用／快速成長期
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
          台灣：Klook 出國網路偏好調查、交通部觀光署旅遊狀況調查摘要、電信業出境觀察。
          全球：Juniper Research（旅遊 eSIM 營收 2025→2030）、GSMA／ABI 等智慧手機 eSIM
          連線預估。台灣尚無公開等價「產值億美元」報告；右側為全球對照，非台灣產值。曲線為趨勢示意。
        </p>

        {/* ---------- 下方兩欄：發展動能 ---------- */}
        <motion.div
          {...fadeUpProps}
          transition={{ delay: 0.25, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 mt-6 md:mt-2 md:px-10"
        >
          <div>
            <h3 className="text-[#1E4AD1] text-lg font-bold tracking-wider mb-4">
              需求擴散動能
            </h3>
            <p className="text-[13px] leading-[2] text-gray-800">
              自由行占比提高 / 即買即用與不怕遺失成首選理由 / 出國前一週內下單占比高
              / 找路、叫車、掃碼付款依賴連線 / 日韓短天數吃到飽接受度高 /
              OTA、蝦皮與社群通路擴散
            </p>
          </div>
          <div>
            <h3 className="text-[#1E4AD1] text-lg font-bold tracking-wider mb-4">
              市場成長動能
            </h3>
            <p className="text-[13px] leading-[2] text-gray-800">
              出境旅遊回溫（年增雙位數）/ 手機 eSIM 支援率提升 /
              原生與漫遊多線路商品矩陣 / 夥伴分潤與專屬商店帶動通路 /
              客服行銷 SEO 後勤支援降低經營門檻 / 電信原號漫遊與旅遊 eSIM 並存競合
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
