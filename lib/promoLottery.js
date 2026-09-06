/**
 * 優惠頁拉霸機率
 *
 * 營運組合（簡化版）
 * - 新加入會員 並 下第一單：折 50
 * - 拉霸：1,000 人各 1 次（終身限抽）
 *
 * 利潤假設：每單 ≈ 100 → 600 首單毛利 60,000
 * 首單折 50 → −30,000
 * 拉霸期望 ≈ 10,900 → 淨利 ≈ 19,100（約 2 萬）
 *
 * 權重以 1000 為底；每位會員終身限抽 1 次
 * 50元 10% / 100元 3% / 200元 0.5% / 300元 0.3% / 999元 0.1% / 沒中 86.1%
 * EV = 5+3+1+0.9+0.999 = 10.899 → 千人 ≈ 10,900
 */
export const LOTTERY_PRIZES = [
  { id: "50", label: "50 元折抵", amount: 50, weight: 100, tone: "50" },
  { id: "100", label: "100 元折抵", amount: 100, weight: 30, tone: "100" },
  { id: "200", label: "200 元折抵", amount: 200, weight: 5, tone: "200" },
  { id: "300", label: "300 元折抵", amount: 300, weight: 3, tone: "300" },
  { id: "999", label: "999 元折抵", amount: 999, weight: 1, tone: "999" },
  {
    id: "miss",
    label: "下次加油",
    amount: 0,
    weight: 861,
    tone: "miss",
  },
];

export const LOTTERY_BODY_IMG = "/images/disccount/body.png";
export const LOTTERY_LEVER_IMG = "/images/disccount/lottery-machine.png";

/** 正式：每位會員終身限抽 1 次（勿再開無限測） */
export const LOTTERY_TEST_UNLIMITED = false;

export const LOTTERY_BUDGET_MEMBERS = 1000;
export const LOTTERY_BUDGET_TOTAL = 10900;

export function getLotteryWeightTotal(prizes = LOTTERY_PRIZES) {
  return prizes.reduce((sum, p) => sum + p.weight, 0);
}

export function formatLotteryPercent(weight, prizes = LOTTERY_PRIZES) {
  const total = getLotteryWeightTotal(prizes);
  const pct = (weight / total) * 100;
  if (Number.isInteger(pct)) return `${pct}%`;
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded}%`;
}

export function getLotteryExpectedValue(prizes = LOTTERY_PRIZES) {
  const total = getLotteryWeightTotal(prizes);
  return prizes.reduce(
    (sum, p) => sum + (p.amount * p.weight) / total,
    0,
  );
}

/** 僅供伺服器抽獎；正式路徑請用 memberCoupons（crypto.randomInt） */
export function drawLotteryPrize(prizes = LOTTERY_PRIZES) {
  const total = getLotteryWeightTotal(prizes);
  if (total <= 0) return prizes[prizes.length - 1];
  let roll = Math.random() * total;
  for (const prize of prizes) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return prizes[prizes.length - 1];
}

export function prizeToDigits(prize) {
  if (!prize || prize.amount <= 0) {
    const winAmounts = LOTTERY_PRIZES.filter((p) => p.amount > 0).map(
      (p) => p.amount,
    );
    const missPool = [7, 13, 27, 66, 88, 123, 456, 789, 888, 111].filter(
      (n) => !winAmounts.includes(n),
    );
    return String(missPool[Math.floor(Math.random() * missPool.length)]).padStart(
      4,
      "0",
    );
  }
  return String(prize.amount).padStart(4, "0");
}

export function getLotteryOddsText() {
  return LOTTERY_PRIZES.filter((p) => p.amount > 0)
    .map((p) => `${p.amount}元 ${formatLotteryPercent(p.weight)}`)
    .join("　");
}
