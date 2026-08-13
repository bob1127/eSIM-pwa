// pages/api/esim/list.ts
// 選品頁（/esim-selection）用：必須透傳 MicroeSIM 完整欄位（networks / rule_desc / apn…）
// 才能正確顯示電信商、真．不限速等。購買／發貨仍可走測試站 ESIM_BASE_URL。
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import {
  ESIM_BASE_URL,
  microesimAuthHeaders,
  shouldForceTestPlan,
  signMicroesimHeaders,
} from "../../../lib/esim/microesimClient";
import {
  esimCatalogInternalHeaders,
  guardEsimCatalog,
} from "../../../lib/esimCatalogGuard";

function env(name: string, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

/** 透傳原始欄位 + 正規化前端常用別名（勿丢掉 networks 等） */
function normalizePlans(allPlans: any[]) {
  return allPlans.map((p: any, index: number) => {
    const channelId = p.channel_dataplan_id || p.id || null;
    const name = p.channel_dataplan_name || p.name || "未命名方案";
    return {
      ...p,
      id: channelId || `${p.code || p.location || "plan"}-${index}`,
      channel_dataplan_id: channelId || undefined,
      code: p.location || p.code || p.countryCode || "",
      name,
      location: p.location || p.countryCode || p.code || "",
      price: p.price,
      day: p.day,
      data: p.flow || p.data,
      rule_desc: p.rule_desc || "",
      speed_desc: p.speed_desc || p.special_desc || "",
      apn: p.apn || "",
      networks: p.networks || p.operator || p.operator_list || "",
      tags: p.tags,
    };
  });
}

async function fetchFromMicroesim(
  baseUrl: string,
  auth: Record<string, string>,
) {
  const response = await axios.get(
    `${baseUrl.replace(/\/$/, "")}/allesim/v1/esimDataplanList`,
    {
      headers: {
        "Content-Type": "application/json",
        ...auth,
      },
      timeout: 45000,
    },
  );
  return response.data?.result || [];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!(await guardEsimCatalog(req, res))) return;

  try {
    // 1) 明確指定正式目錄 proxy（須回傳完整欄位，建議指 /api/esim/test-list）
    const catalogProxy = env("ESIM_CATALOG_PROXY_URL");
    if (catalogProxy) {
      const response = await axios.get(catalogProxy, {
        timeout: 60000,
        headers: esimCatalogInternalHeaders(),
      });
      const allPlans = response.data?.result || [];
      return res.status(200).json({
        result: normalizePlans(allPlans),
        baseUrl: "catalog-proxy",
        source: catalogProxy,
      });
    }

    // 2) 獨立正式目錄帳號（可與購買用測試帳號分離）
    const catalogBase = env("ESIM_CATALOG_BASE_URL");
    const catalogAccount = env("ESIM_CATALOG_ACCOUNT");
    const catalogSecret = env("ESIM_CATALOG_SECRET");
    const catalogSalt = env("ESIM_CATALOG_SALT");
    if (catalogBase && catalogAccount && catalogSecret && catalogSalt) {
      const { timestamp, nonce, signature } = signMicroesimHeaders({
        account: catalogAccount,
        secret: catalogSecret,
        salt: catalogSalt,
      });
      const allPlans = await fetchFromMicroesim(catalogBase, {
        "MICROESIM-ACCOUNT": catalogAccount,
        "MICROESIM-NONCE": nonce,
        "MICROESIM-TIMESTAMP": timestamp,
        "MICROESIM-SIGN": signature,
      });
      return res.status(200).json({
        result: normalizePlans(allPlans),
        baseUrl: catalogBase,
        source: "catalog-credentials",
      });
    }

    // 3) 本機測試帳號：改抓正式站「完整欄位」list（勿用精簡版 /api/esim/list）
    if (shouldForceTestPlan() || /test\.microesim\.com/i.test(ESIM_BASE_URL)) {
      const fallback =
        env("ESIM_CATALOG_FALLBACK_URL") ||
        "https://www.jeko-esim.com.tw/api/esim/test-list";
      const response = await axios.get(fallback, {
        timeout: 60000,
        headers: esimCatalogInternalHeaders(),
      });
      const allPlans = response.data?.result || [];
      return res.status(200).json({
        result: normalizePlans(allPlans),
        baseUrl: "production-fallback",
        source: fallback,
      });
    }

    // 4) 正式購買帳號直接打供應商（完整欄位）
    const allPlans = await fetchFromMicroesim(
      ESIM_BASE_URL,
      microesimAuthHeaders(),
    );

    if (req.query.debug === "true") {
      const targetPlan = allPlans.find(
        (p: any) =>
          p.id === 5975 ||
          p.channel_dataplan_name === "Japan Korea-Daily1GB-4-5mbps-A0",
      );
      return res.status(200).json({
        debug_message: "這是該方案在 API 中的原始樣貌，請檢查 price 欄位",
        baseUrl: ESIM_BASE_URL,
        target_plan: targetPlan || "Not Found",
        count: allPlans.length,
      });
    }

    return res.status(200).json({
      result: normalizePlans(allPlans),
      baseUrl: ESIM_BASE_URL,
      source: "esim-base",
    });
  } catch (err: any) {
    console.error("Fetch Error:", err.message);
    res.status(500).json({ error: "Fetch Failed", detail: err.message });
  }
}
