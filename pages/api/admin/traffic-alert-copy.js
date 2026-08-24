/**
 * GET/PUT /api/admin/traffic-alert-copy
 * Boss 後台：流量提醒推播／LINE 共用文案（固定流量 + 吃到飽 FUP）
 */
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import {
  describeTrafficAlertCopy,
  saveTrafficAlertCopy,
  buildTrafficAlertVars,
  renderTrafficTemplate,
  DEFAULT_TRAFFIC_ALERT_COPY,
} from "../../../lib/trafficAlertCopy";
import { ensureTrafficCheckedAtLine } from "../../../lib/esimUsageFormat";

function buildPreview(copy, sampleTarget) {
  const vars = buildTrafficAlertVars({
    ...sampleTarget,
    linkPath: copy.linkPath,
  });
  const isFup = sampleTarget.planKind === "fup";
  const title = isFup ? copy.fupTitle : copy.title;
  const body = isFup ? copy.fupBody : copy.body;
  const lineExtra = isFup ? copy.fupLineExtra : copy.lineExtra;
  const t = renderTrafficTemplate(title, vars);
  const b = renderTrafficTemplate(body, vars);
  const extra = ensureTrafficCheckedAtLine(
    renderTrafficTemplate(lineExtra || "", vars),
    vars.checkedAt,
  );
  return {
    title: t,
    body: b,
    line: [t, "", b, "", `👉 ${vars.url}`, extra || null]
      .filter((l) => l != null && l !== "")
      .join("\n"),
    vars,
  };
}

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    try {
      const desc = await describeTrafficAlertCopy();
      return res.status(200).json({
        ...desc,
        previewQuota: buildPreview(desc.copy, {
          productName: "【範例】韓國 eSIM 7日 5GB",
          remainingMb: 180,
          totalMb: 5120,
          planKind: "quota",
        }),
        previewFup: buildPreview(desc.copy, {
          productName: "韓國 eSIM 5日 · 每日1GB高速之後約10Mbps吃到飽",
          remainingMb: 180,
          totalMb: 1024,
          planKind: "fup",
          highSpeedQuotaLabel: "1 GB",
          throttleSpeedLabel: "10 Mbps",
        }),
      });
    } catch (err) {
      return res.status(500).json({ error: err?.message || "讀取失敗" });
    }
  }

  if (req.method === "PUT" || req.method === "POST") {
    const body = req.body || {};
    if (body.reset) {
      const result = await saveTrafficAlertCopy(DEFAULT_TRAFFIC_ALERT_COPY);
      if (!result.ok) {
        return res.status(400).json({ error: result.message });
      }
      const desc = await describeTrafficAlertCopy();
      return res.status(200).json({ ok: true, ...desc });
    }

    const result = await saveTrafficAlertCopy({
      title: body.title,
      body: body.body,
      lineExtra: body.lineExtra,
      fupTitle: body.fupTitle,
      fupBody: body.fupBody,
      fupLineExtra: body.fupLineExtra,
      linkPath: body.linkPath,
    });
    if (!result.ok) {
      return res.status(400).json({ error: result.message });
    }
    const desc = await describeTrafficAlertCopy();
    return res.status(200).json({ ok: true, ...desc });
  }

  res.setHeader("Allow", ["GET", "PUT", "POST"]);
  return res.status(405).end("Method Not Allowed");
}
