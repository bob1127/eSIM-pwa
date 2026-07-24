/**
 * 行銷組合
 *
 * A. 新會員首單折 50
 * B. 推薦好友：介紹人 +50、好友 +50（好友完成註冊＋首購後發放）
 * C. 拉霸（千人期望 ≈ 10,900）
 *
 * 利潤假設：每單 100、首單 600 人 → 毛利 60,000
 *
 * 重要：好友的「推薦獎 50」若再疊「新會員首單 50」＝好友一人折 100，
 * 成本會爆。建議預設「好友端擇一／合併為一張 50」，介紹人另拿 50。
 */
export const PROMO_PLAN = {
  profitPerOrder: 100,
  firstOrderBuyers: 600,
  lotteryMembers: 1000,
  firstOrderFlatOff: 50,
  /** 介紹人獎勵 */
  referrerReward: 50,
  /** 好友推薦獎勵（建議與新會員首單 50 合併，不疊加） */
  refereeReward: 50,
  /** 預設假設：約 25% 首單來自推薦 */
  referralRate: 0.25,
  lotteryExpectedTotal: 10900,
  targetNetMin: 0,
  targetNetMax: 30000,
};

/**
 * @param {'stack' | 'merge'} friendRewardMode
 * - stack：好友拿新會員50 + 推薦50（共100），介紹人再50 → 每筆推薦首單成本 150
 * - merge：好友只拿一張50（新會員＝推薦獎），介紹人50 → 每筆推薦首單成本 100
 */
export function estimateNetWithPromoPlan({
  profitPerOrder = PROMO_PLAN.profitPerOrder,
  firstOrderBuyers = PROMO_PLAN.firstOrderBuyers,
  firstOrderFlatOff = PROMO_PLAN.firstOrderFlatOff,
  referrerReward = PROMO_PLAN.referrerReward,
  refereeReward = PROMO_PLAN.refereeReward,
  referralRate = PROMO_PLAN.referralRate,
  lotteryExpectedTotal = PROMO_PLAN.lotteryExpectedTotal,
  friendRewardMode = "merge",
} = {}) {
  const gross = firstOrderBuyers * profitPerOrder;
  const referredCount = Math.round(firstOrderBuyers * referralRate);
  const organicCount = firstOrderBuyers - referredCount;

  // 所有首單都有新會員折 50
  const newMemberCost = firstOrderBuyers * firstOrderFlatOff;

  // 推薦雙邊獎
  let referralCost = 0;
  if (friendRewardMode === "stack") {
    // 好友再多拿 refereeReward，介紹人拿 referrerReward
    referralCost =
      referredCount * refereeReward + referredCount * referrerReward;
  } else {
    // merge：好友那 50 已算在 newMemberCost，只多付介紹人
    referralCost = referredCount * referrerReward;
  }

  const totalPromo = newMemberCost + referralCost + lotteryExpectedTotal;
  const net = gross - totalPromo;

  return {
    assumptions: {
      friendRewardMode,
      referralRate,
      referredCount,
      organicCount,
    },
    gross,
    newMemberCost,
    referralCost,
    lotteryExpectedTotal,
    totalPromo,
    net,
    costPerReferredFirstOrder:
      friendRewardMode === "stack"
        ? firstOrderFlatOff + refereeReward + referrerReward
        : firstOrderFlatOff + referrerReward,
  };
}
