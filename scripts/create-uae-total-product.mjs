/**
 * 建立「杜拜、阿布達比 總量型 eSIM」
 *   DU UAE ← UAE(T+C)-Total*-A0（波蘭 IP、128kbps、GPT＋Gemini）
 *
 * 用法：
 *   node scripts/create-uae-total-product.mjs
 *   node scripts/create-uae-total-product.mjs --rebuild
 */
import {
  UAE_TELECOM_DU,
  uaeTotalKeyFeaturesByCarrier,
} from "../content/product-detailed/uae-key-features.js";
import {
  PROFIT,
  MARGIN,
  HKD_TO_TWD,
  THUMB,
  SALES_CHANNEL_ID,
  retailFromCost,
  supportsGptGemini,
  is128kbps,
  fetchPlans,
  login,
  admin,
  syncProduct,
  MEDUSA_URL,
  EMAIL,
} from "./lib/uae-product-common.mjs";

const HANDLE = "uae-total-esim";
const TITLE = "杜拜、阿布達比 總量型 eSIM";
const TELECOM = UAE_TELECOM_DU;
const REBUILD = process.argv.includes("--rebuild");

const SPEED_RULE = "總量高速用完後降速約 128kbps 持續使用";
const NETWORK_LABEL = "DU UAE 4G/5G";
const COVERAGE = "杜拜、阿布達比";
const DATA_ORDER = ["1GB", "2GB", "3GB", "5GB", "10GB", "20GB", "30GB", "50GB"];

function parseDataLabel(name) {
  const m = String(name || "").match(/Total(\d+)\s*GB/i);
  return m ? `${m[1]}GB` : "";
}

function collectRows(raw) {
  const map = new Map();
  for (const p of raw) {
    const name = p.name || p.channel_dataplan_name || "";
    if (!/^UAE\(T\+C\)-Total\d+GB-\d+-A0$/i.test(name)) continue;
    if (!supportsGptGemini(p)) continue;
    if (!is128kbps(p)) continue;
    const day = Number(p.day) || 0;
    const data = parseDataLabel(name);
    if (!day || !data) continue;
    const hkd = Number(p.price) || 0;
    const prev = map.get(`${day}|${data}`);
    if (prev && hkd >= prev.price_hkd) continue;
    const cost = Math.ceil(hkd * HKD_TO_TWD);
    map.set(`${day}|${data}`, {
      sku: name,
      plan_id: p.channel_dataplan_id || p.id,
      telecom: TELECOM,
      day,
      daysLabel: `${day}天`,
      data,
      price_hkd: hkd,
      cost_twd: cost,
      profit_percent: PROFIT,
      retail_twd: retailFromCost(cost),
      apn: String(p.apn || "internetipv6").trim(),
      networks: p.networks || p.operator || "AE:DU UAE[4G;5G]|",
      rule_desc: p.rule_desc || "unlimited 128kbps",
      speed_desc: p.speed_desc || "",
      special_desc: p.special_desc || "",
      ip: String(p.ip || "PL").trim(),
    });
  }
  const dataRank = (label) => {
    const i = DATA_ORDER.indexOf(String(label || ""));
    return i >= 0 ? i : 99;
  };
  return [...map.values()].sort(
    (a, b) => a.day - b.day || dataRank(a.data) - dataRank(b.data),
  );
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
      plan_kind: "total",
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
      throttle_kind: "128kbps",
      ip: r.ip,
      is_native: false,
      ekyc: null,
      attributes: {
        days: r.day,
        data: r.data,
        data_amount: r.data,
        telecom: r.telecom,
        network: NETWORK_LABEL,
        ip_type: "波蘭 IP",
        route_type: "漫遊",
        hotspot: true,
        gpt: true,
        tiktok: true,
        gemini: true,
        ekyc: null,
        speed_rule: `${r.data}；${SPEED_RULE}`,
        coverage: COVERAGE,
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
      },
    },
  };
}

async function main() {
  console.log(`💱 HKD→TWD ${HKD_TO_TWD} · ${TELECOM} ${PROFIT}%`);
  console.log(`  ${TELECOM} ← UAE(T+C)-Total*-A0（PL IP · 128kbps · GPT/Gemini）`);

  const rows = collectRows(await fetchPlans());
  if (!rows.length) {
    throw new Error("找不到 UAE(T+C)-Total*-A0（PL IP · GPT/Gemini）");
  }

  const samples = [
    rows.find((r) => r.day === 3 && r.data === "3GB"),
    rows.find((r) => r.day === 7 && r.data === "10GB"),
    rows.find((r) => r.day === 30 && r.data === "30GB"),
  ].filter(Boolean);
  for (const r of samples) {
    console.log(
      `  [${r.telecom}] ${r.data} ${r.day}天 ${r.sku} HKD ${r.price_hkd} → cost NT$${r.cost_twd} → 售價 NT$${r.retail_twd}（${r.profit_percent}%）`,
    );
  }
  console.log(`共 ${rows.length} 筆`);

  const dayValues = [...new Set(rows.map((r) => r.daysLabel))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const dataValues = DATA_ORDER.filter((d) => rows.some((r) => r.data === d));

  const productMeta = {
    type: "esim",
    country: "AE",
    is_native: false,
    plan_kind: "total",
    hot_sale_telecoms: [TELECOM],
    carrier_profit_by_carrier: { [TELECOM]: PROFIT },
    seo_title: "杜拜、阿布達比 eSIM 總量型｜DU UAE｜Jeko eSIM",
    seo_description:
      "杜拜、阿布達比總量型 eSIM，DU UAE 4G／5G，波蘭 IP。可選 1GB～50GB，高速用完後約 128kbps。支援 ChatGPT、Gemini 與熱點。",
    seo_keywords:
      "杜拜eSIM,阿布達比eSIM,Dubai eSIM,Abu Dhabi eSIM,UAE eSIM,DU UAE,總量型,旅遊eSIM,Jeko eSIM",
    subtitle_by_carrier: {
      [TELECOM]: "DU UAE 4G／5G｜總量高速後約 128kbps｜波蘭 IP · GPT/Gemini",
    },
    carrier_specs_by_carrier: {
      [TELECOM]: {
        ip_type: "波蘭 IP",
        route_type: "漫遊",
        network: NETWORK_LABEL,
        speed_rule: SPEED_RULE,
        apn: "internetipv6",
        apps: "熱點分享,ChatGPT,TikTok,Gemini",
        coverage: COVERAGE,
        ekyc: "供應商備註未標示實名",
      },
    },
    overview_notices_by_carrier: {
      [TELECOM]: {
        fup_notice:
          "DU UAE 漫遊總量型。高速用完後降速約 128kbps。出網波蘭 IP，支援 ChatGPT／Gemini。建議抵達杜拜／阿布達比後再啟用。",
        activation_notice: "建議抵達杜拜／阿布達比後再安裝／啟用 eSIM",
      },
    },
    key_features_by_carrier: uaeTotalKeyFeaturesByCarrier(),
  };

  const payloadBase = {
    title: TITLE,
    subtitle: "DU UAE｜總量型｜波蘭 IP · GPT/Gemini｜40%",
    handle: HANDLE,
    description:
      "杜拜、阿布達比總量型 eSIM，走 DU UAE 4G／5G。可選 1GB／2GB／3GB／5GB／10GB／20GB／30GB／50GB，3～30 天。高速用完後約 128kbps 可持續使用。波蘭 IP（APN internetipv6），支援 ChatGPT、Gemini 與熱點。建議抵達杜拜／阿布達比後再啟用。",
    status: "published",
    discountable: true,
    thumbnail: THUMB,
    images: [{ url: THUMB }],
    metadata: productMeta,
    options: [
      { title: "使用天數", values: dayValues },
      { title: "電信商", values: [TELECOM] },
      { title: "數據量", values: dataValues },
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
