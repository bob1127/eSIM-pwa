/**
 * 建立「杜拜、阿布達比 吃到飽 不限流量 eSIM」
 *   Etisalat / DU ← UAE-unlimited-*-B0（目錄僅此組；香港 IP，Gemini 可用）
 *
 * 用法：
 *   node scripts/create-uae-unlimited-product.mjs
 *   node scripts/create-uae-unlimited-product.mjs --rebuild
 */
import {
  UAE_TELECOM_DUAL,
  uaeUnlimitedKeyFeaturesByCarrier,
} from "../content/product-detailed/uae-key-features.js";
import {
  PROFIT,
  MARGIN,
  HKD_TO_TWD,
  THUMB,
  SALES_CHANNEL_ID,
  retailFromCost,
  fetchPlans,
  login,
  admin,
  syncProduct,
  MEDUSA_URL,
  EMAIL,
} from "./lib/uae-product-common.mjs";

const HANDLE = "uae-unlimited-esim";
const TITLE = "杜拜、阿布達比 吃到飽 不限流量 eSIM";
const TELECOM = UAE_TELECOM_DUAL;
const DATA = "吃到飽";
const REBUILD = process.argv.includes("--rebuild");

const SPEED_RULE = "不限流量吃到飽（依供應商 Fair Use）";

function collectRows(raw) {
  const map = new Map();
  for (const p of raw) {
    const name = p.name || p.channel_dataplan_name || "";
    if (!/^UAE-unlimited-\d+-B0$/i.test(name)) continue;
    const day = Number(p.day) || 0;
    if (!day) continue;
    const hkd = Number(p.price) || 0;
    const prev = map.get(day);
    if (prev && hkd >= prev.price_hkd) continue;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    map.set(day, {
      sku: name,
      plan_id: p.channel_dataplan_id || p.id,
      telecom: TELECOM,
      day,
      daysLabel: `${day}天`,
      data: DATA,
      price_hkd: hkd,
      cost_twd: cost,
      profit_percent: PROFIT,
      retail_twd: retailFromCost(cost),
      apn: String(p.apn || "cmhk").trim(),
      networks:
        p.networks ||
        p.operator ||
        "AE:Etisalat[4G;LTE;5G]|DU[4G;LTE;5G]|",
      rule_desc: p.rule_desc || "unlimited",
      speed_desc: p.speed_desc || "",
      special_desc: p.special_desc || "",
      ip: String(p.ip || "HK").trim(),
    });
  }
  return [...map.values()].sort((a, b) => a.day - b.day);
}

function toVariant(r) {
  return {
    title: `${r.telecom} · ${r.daysLabel} · ${r.data}`,
    sku: r.sku,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: r.daysLabel,
      電信商: r.telecom,
      數據量: r.data,
    },
    prices: [{ currency_code: "twd", amount: r.retail_twd }],
    metadata: {
      plan_id: r.plan_id,
      type: "esim",
      carrier: r.telecom,
      plan_kind: "unlimited",
      data: r.data,
      data_amount: r.data,
      days: String(r.day),
      cost_hkd: String(r.price_hkd),
      cost_price: r.cost_twd,
      profit_percent: PROFIT,
      profit_margin: `${PROFIT}%`,
      profit_rate: `${PROFIT}%`,
      margin: MARGIN,
      apn: r.apn,
      networks: r.networks,
      rule_desc: r.rule_desc,
      speed_desc: r.speed_desc,
      special_desc: r.special_desc,
      throttle_kind: "unlimited",
      ip: r.ip,
      is_native: false,
      ekyc: null,
      attributes: {
        days: r.day,
        data: r.data,
        data_amount: r.data,
        telecom: r.telecom,
        network: "Etisalat / DU UAE 4G/5G",
        ip_type: "香港 IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: false,
        tiktok: false,
        gemini: true,
        ekyc: null,
        speed_rule: SPEED_RULE,
        coverage: "杜拜、阿布達比",
        apps: "熱點分享,Gemini",
      },
    },
  };
}

async function main() {
  console.log(`💱 HKD→TWD ${HKD_TO_TWD} · ${TELECOM} ${PROFIT}%`);
  console.log(`  ${TELECOM} ← UAE-unlimited-*-B0`);

  const rows = collectRows(await fetchPlans());
  if (!rows.length) throw new Error("找不到 UAE-unlimited-*-B0");

  for (const r of rows) {
    console.log(
      `  [${r.telecom}] ${r.data} ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}（${r.profit_percent}%）`,
    );
  }
  console.log(`共 ${rows.length} 筆`);

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );

  const productMeta = {
    type: "esim",
    country: "AE",
    is_native: false,
    plan_kind: "unlimited",
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: { [TELECOM]: PROFIT },
    seo_title: "杜拜、阿布達比 eSIM 吃到飽｜Etisalat/DU｜Jeko eSIM",
    seo_description:
      "杜拜、阿布達比吃到飽 eSIM，Etisalat／DU 雙網 4G／5G，不限流量。香港 IP，Gemini 通常可用。1／3／5／7／10／15／20／30 天可選。",
    seo_keywords:
      "杜拜eSIM,阿布達比eSIM,Dubai eSIM,Abu Dhabi eSIM,UAE eSIM,Etisalat,DU,吃到飽,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]: "Etisalat／DU 4G／5G｜不限流量｜香港 IP",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "香港 IP",
        route_type: "漫遊",
        network: "Etisalat / DU UAE 4G/5G",
        speed_rule: SPEED_RULE,
        apn: "cmhk",
        apps: "熱點分享,Gemini",
        coverage: "杜拜、阿布達比",
        ekyc: "供應商備註未標示實名",
      },
    },
    overview_notices_by_carrier: {
      [TELECOM]: {
        fup_notice:
          "Etisalat／DU 漫遊吃到飽。出網香港 IP，Gemini 通常可用，ChatGPT 可能受限。建議抵達杜拜／阿布達比後再啟用。",
        activation_notice: "建議抵達杜拜／阿布達比後再安裝／啟用 eSIM",
      },
    },
    key_features_by_carrier: uaeUnlimitedKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "Etisalat／DU｜吃到飽｜香港 IP｜40%",
    handle: HANDLE,
    description:
      "杜拜、阿布達比吃到飽不限流量 eSIM，Etisalat／DU 雙網 4G／5G 自動切換。香港 IP（APN cmhk），Gemini 通常可用。可選 1／3／5／7／10／15／20／30 天。建議抵達杜拜／阿布達比後再啟用。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: [TELECOM] },
      { title: "數據量", values: [DATA] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
  };

  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();
  const product = await syncProduct(token, {
    handle: HANDLE,
    payloadBase,
    variants: rows.map(toVariant),
    rebuild: REBUILD,
  });

  const check = await admin(
    token,
    `/admin/products/${product.id}?fields=*variants,*options`,
  );
  console.log("\n======= 完成 =======");
  console.log(`Handle: ${HANDLE}`);
  console.log(`前台: /product/uae/${HANDLE}/`);
  console.log(`Admin: ${MEDUSA_URL}/app/products/${product.id}`);
  console.log(`變體數: ${(check.product?.variants || []).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
