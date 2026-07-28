// GET/POST /api/admin/refresh-b2b-costs
// 已掛在 vercel.json 的 crons（一天跑一次）；Vercel Cron 一律用 GET 觸發，
// 並自動帶 x-vercel-cron 標頭，不需要另外設定密鑰。手動測試可用
// Authorization: Bearer <CRON_SECRET> 或 ?secret=<ADMIN_SECRET|CRON_SECRET>
// （沿用 pages/api/cron/check-traffic.js 既有的驗證慣例）。
//
// 把 product_variations.b2b_price（API 原始底價快照）刷新成 MicroeSIM
// 目前報價。設計成「批次刷新既有快照」而非「結帳當下即時查」：
// - 結帳／前台顯示速度與可用性優先，不依賴供應商 API 即時回應
// - 每次執行只打 1 次 MicroeSIM 目錄 API（與商品數量無關），用量很小；
//   一天 1 次即可，eSIM 批發價不會頻繁變動
//
// 找不到即時報價（方案已下架、供應商 API 暫時無回應）的 SKU 會被跳過，
// 保留原本數值，不會被覆蓋成 0。
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { resolveLivePlanCostTWD } from "../../../lib/esim/livePlanCost";

const BATCH_SIZE = 20;

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const expected = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const vercelCron = req.headers["x-vercel-cron"] === "1";

  const authorized =
    vercelCron ||
    (expected && (bearer === expected || req.query.secret === expected));

  if (!authorized) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = getSupabaseAdminServer();

  const { data: variations, error } = await supabase
    .from("product_variations")
    .select("id, sku, b2b_price");

  if (error) return res.status(500).json({ error: error.message });

  let checked = 0;
  let updated = 0;
  let skippedNoLiveData = 0;
  const changes = [];

  for (let i = 0; i < (variations || []).length; i += BATCH_SIZE) {
    const batch = variations.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (v) => {
        checked += 1;
        const live = await resolveLivePlanCostTWD(v.sku);
        if (!live || !(live.costTWD > 0)) {
          skippedNoLiveData += 1;
          return;
        }
        const oldCost = Number(v.b2b_price) || 0;
        if (live.costTWD === oldCost) return;

        const { error: updateErr } = await supabase
          .from("product_variations")
          .update({ b2b_price: live.costTWD })
          .eq("id", v.id);
        if (updateErr) {
          console.error(`[refresh-b2b-costs] 更新 ${v.sku} 失敗：`, updateErr.message);
          return;
        }
        updated += 1;
        changes.push({ sku: v.sku, old: oldCost, new: live.costTWD });
      }),
    );
  }

  console.log(
    `[refresh-b2b-costs] 完成：檢查 ${checked} 筆，更新 ${updated} 筆，查無即時報價 ${skippedNoLiveData} 筆`,
  );

  return res.status(200).json({
    ok: true,
    checked,
    updated,
    skippedNoLiveData,
    changes: changes.slice(0, 200), // 避免回應過大
  });
}
