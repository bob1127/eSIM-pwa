import { parseItemDetails } from "@/lib/partnerAnalytics";

/** 與 partnerOrderPricing 一致 */
const PAYMENT_FEE_RATE = 0.028;

function round(n) {
  return Math.round(Number(n) || 0);
}

function qtyOf(item) {
  return Math.max(1, Math.round(Number(item?.quantity ?? item?.qty) || 1));
}

function unitSell(item) {
  return round(item?.price ?? item?.unit_price ?? 0);
}

function unitB2b(item) {
  return round(item?.b2b_cost ?? item?.b2bCost ?? 0);
}

/**
 * 把訂單 item_details 展開成帶底價／夥伴售價／分潤的行。
 * 若單項無 b2b_cost，依售價比例分攤訂單 b2b_cost。
 */
export function buildOrderLinePricing(order) {
  const items = parseItemDetails(order);
  const orderTotal = round(order?.total_amount ?? order?.totalAmount);
  const orderB2b = round(order?.b2b_cost ?? order?.b2bCost);
  const orderProfit = round(order?.partner_profit ?? order?.partnerProfit);

  if (!items.length) {
    return {
      lines: [],
      totals: {
        selling: orderTotal,
        b2b: orderB2b,
        partnerProfit: orderProfit,
        platformProfit: Math.max(0, orderTotal - orderB2b - orderProfit),
      },
    };
  }

  const drafts = items.map((item) => {
    const qty = qtyOf(item);
    const sellUnit = unitSell(item);
    const lineRevenue = sellUnit * qty;
    let b2bUnit = unitB2b(item);
    return {
      sku: item.sku || "",
      name: item.name || item.title || "方案",
      specLabel: item.specLabel || item.options || "",
      qty,
      sellUnit,
      lineRevenue,
      b2bUnit,
      b2bFromItem: b2bUnit > 0,
    };
  });

  const knownB2b = drafts.reduce(
    (s, d) => s + (d.b2bFromItem ? d.b2bUnit * d.qty : 0),
    0,
  );
  const remainingB2b = Math.max(0, orderB2b - knownB2b);
  const allocBase = drafts
    .filter((d) => !d.b2bFromItem)
    .reduce((s, d) => s + d.lineRevenue, 0);

  const lines = drafts.map((d) => {
    let b2bUnit = d.b2bUnit;
    if (!d.b2bFromItem && remainingB2b > 0 && allocBase > 0) {
      const lineB2b = Math.round((remainingB2b * d.lineRevenue) / allocBase);
      b2bUnit = d.qty > 0 ? Math.round(lineB2b / d.qty) : 0;
    }
    const lineB2b = b2bUnit * d.qty;
    const lineFee = Math.round(d.lineRevenue * PAYMENT_FEE_RATE);
    const lineProfit = Math.max(0, d.lineRevenue - lineB2b - lineFee);
    return {
      sku: d.sku,
      name: d.name,
      specLabel: d.specLabel,
      qty: d.qty,
      sellUnit: d.sellUnit,
      lineRevenue: d.lineRevenue,
      b2bUnit,
      lineB2b,
      lineProfit,
      linePlatformProfit: Math.max(0, d.lineRevenue - lineB2b - lineProfit),
    };
  });

  const sumSelling = lines.reduce((s, l) => s + l.lineRevenue, 0);
  const sumB2b = lines.reduce((s, l) => s + l.lineB2b, 0);
  const sumProfit = lines.reduce((s, l) => s + l.lineProfit, 0);

  // 與訂單層級數字對齊（四捨五入誤差補在最後一列）
  if (lines.length && orderProfit > 0 && sumProfit !== orderProfit) {
    const delta = orderProfit - sumProfit;
    lines[lines.length - 1].lineProfit += delta;
    lines[lines.length - 1].linePlatformProfit = Math.max(
      0,
      lines[lines.length - 1].lineRevenue -
        lines[lines.length - 1].lineB2b -
        lines[lines.length - 1].lineProfit,
    );
  }
  if (lines.length && orderB2b > 0 && sumB2b !== orderB2b) {
    const delta = orderB2b - sumB2b;
    lines[lines.length - 1].lineB2b += delta;
    lines[lines.length - 1].b2bUnit =
      lines[lines.length - 1].qty > 0
        ? Math.round(lines[lines.length - 1].lineB2b / lines[lines.length - 1].qty)
        : 0;
  }

  return {
    lines,
    totals: {
      selling: orderTotal || sumSelling,
      b2b: orderB2b || sumB2b,
      partnerProfit: orderProfit || sumProfit,
      platformProfit: Math.max(
        0,
        (orderTotal || sumSelling) - (orderB2b || sumB2b) - (orderProfit || sumProfit),
      ),
    },
  };
}
