import { queryEsimUsage, normalizeUsageIccid } from "../../../lib/esimUsageService";
import { resolveEsimInstallState } from "../../../lib/esimInstallStatus";

/**
 * POST /api/esim/usage
 * body: { iccid?, topupId?, endpoint? }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  let { iccid, topupId, endpoint } = req.body ?? {};
  iccid = normalizeUsageIccid(iccid);

  const result = await queryEsimUsage({ iccid, topupId, endpoint });
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.status(200).json({
    ...result.data,
    installState: resolveEsimInstallState(result.data),
  });
}
