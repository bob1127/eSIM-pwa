#!/usr/bin/env node
/**
 * 將 content/product-detailed/*.js 內容推送至 Medusa metadata
 *
 * 用法：
 *   node scripts/push-carrier-detailed-content.mjs au-kddi
 *   node scripts/push-carrier-detailed-content.mjs china-daily-cmcc
 *   node scripts/push-carrier-detailed-content.mjs korea-unlimited-usage-sk-native
 *
 * 環境變數：
 *   PRODUCT_HANDLE / CARRIER（可覆寫 CONTENT_MAP 預設）
 *   NEXT_PUBLIC_MEDUSA_BACKEND_URL
 *   PRODUCT_CONTENT_ADMIN_SECRET
 *   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  CN_DAILY_CMCC_DETAILED,
  CN_DAILY_CUCC_TIKTOK_DETAILED,
  CN_UNLIMITED_CMCC_70_DETAILED,
  CN_UNLIMITED_CUCC_DETAILED,
  CN_TOTAL_CMCC_DETAILED,
  CN_TOTAL_CUCC_DETAILED,
  CN_USAGE_CMCC,
  CN_USAGE_CUCC_TIKTOK,
  CN_USAGE_CMCC_70,
} from "../content/product-detailed/china-tab-content.js";
import {
  TH_UNLIMITED_TRUEMOVE_DETAILED,
  TH_UNLIMITED_TRUE_DETAILED,
  TH_UNLIMITED_DTAC_RF_DETAILED,
  TH_TOTAL_TRUE_DETAILED,
  TH_TOTAL_AIS_DETAILED,
  TH_TOTAL_DTAC_RF_DETAILED,
  TH_DAILY_AIS_DETAILED,
  TH_DAILY_DTAC_RF_DETAILED,
  TH_DAILY_DTAC_DETAILED,
  TH_USAGE_TRUEMOVE,
  TH_USAGE_TRUE_LOCAL,
  TH_USAGE_ROAM,
} from "../content/product-detailed/thailand-tab-content.js";
import {
  HK_UNLIMITED_DETAILED,
  HK_UNLIMITED_TC_DETAILED,
  HK_DAILY_DETAILED,
  HK_TOTAL_DETAILED,
  HK_USAGE_UNLIMITED,
  HK_USAGE_UNLIMITED_TC,
  HK_USAGE_SMARTONE,
} from "../content/product-detailed/hongkong-tab-content.js";
import {
  MY_UNLIMITED_UMOBILE_DETAILED,
  MY_UNLIMITED_DUAL_DETAILED,
  MY_DAILY_UMOBILE_DETAILED,
  MY_DAILY_DUAL_DETAILED,
  MY_TOTAL_UMOBILE_DETAILED,
  MY_TOTAL_DUAL_DETAILED,
  MY_USAGE_UMOBILE,
  MY_USAGE_DUAL,
} from "../content/product-detailed/malaysia-tab-content.js";
import {
  USA_UNLIM_DETAILED,
  USA_DAILY_USIP_DETAILED,
  USA_TOTAL_USIP_DETAILED,
  USA_TOTAL_LONG_USATT_DETAILED,
  USA_TOTAL_LONG_VZ_DETAILED,
  USA_USAGE_UNLIM,
  USA_USAGE_USIP,
  USA_USAGE_LONG_VZ,
  USCA_UNLIM_A0_DETAILED,
  USCA_UNLIM_VZ_BELL_DETAILED,
  USCA_UNLIM_TM_DETAILED,
  USCA_DAILY_VZ_BELL_DETAILED,
  USCA_DAILY_TM_DETAILED,
  USCA_DAILY_MULTI_DETAILED,
  USCA_TOTAL_A0_DETAILED,
  USCA_TOTAL_B_DETAILED,
  USCA_USAGE_UNLIM,
  USCA_USAGE_DAILY,
  USCA_USAGE_TOTAL,
  NA_ATT_DETAILED,
  NA_ATT_LONGTERM_DETAILED,
  NA_DAILY_A0_DETAILED,
  NA_DAILY_A1_DETAILED,
  NA_TOTAL_DETAILED,
  NA_USAGE_ATT,
  NA_USAGE_ATT_LONGTERM,
  NA_USAGE_USIP,
} from "../content/product-detailed/usa-region-tab-content.js";
import {
  CA_UNLIM_DETAILED,
  CA_UNLIM_10M_DETAILED,
  CA_USAGE_UNLIM,
  CA_USAGE_UNLIM_10M,
  CA_DAILY_ROAM_DETAILED,
  CA_DAILY_MULTI_DETAILED,
  CA_USAGE_DAILY_ROAM,
  CA_USAGE_DAILY_MULTI,
  CA_TOTAL_ROAM_DETAILED,
  CA_TOTAL_MULTI_DETAILED,
  CA_TOTAL_NATIVE_DETAILED,
  CA_USAGE_TOTAL_ROAM,
  CA_USAGE_TOTAL_MULTI,
  CA_USAGE_TOTAL_NATIVE,
} from "../content/product-detailed/canada-tab-content.js";
import {
  VN_UNLIM_VINAPHONE_DETAILED,
  VN_USAGE_VINAPHONE,
  VN_DAILY_VIETTEL_DETAILED,
  VN_USAGE_VIETTEL,
  VN_DAILY_VINAPHONE_DETAILED,
  VN_USAGE_VINAPHONE_DAILY,
  VN_TOTAL_VINAPHONE_DETAILED,
  VN_USAGE_VINAPHONE_TOTAL,
  VN_TOTAL_WINTEL_DETAILED,
  VN_USAGE_WINTEL,
  VN_TOTAL_MOBIFONE_DETAILED,
  VN_USAGE_MOBIFONE,
} from "../content/product-detailed/vietnam-tab-content.js";
import {
  FR_UNLIM_DETAILED,
  FR_DAILY_DETAILED,
  FR_TOTAL_DETAILED,
  FR_USAGE,
} from "../content/product-detailed/france-tab-content.js";
import {
  ES_UNLIM_DETAILED,
  ES_DAILY_DETAILED,
  ES_TOTAL_DETAILED,
  ES_USAGE_UNLIM,
  ES_USAGE_DAILY,
  ES_USAGE_TOTAL,
} from "../content/product-detailed/spain-tab-content.js";
import {
  CH_UNLIM_34_DETAILED,
  CH_UNLIM_41_DETAILED,
  CH_DAILY_DETAILED,
  CH_TOTAL_DETAILED,
  CH_USAGE_34,
  CH_USAGE_41,
} from "../content/product-detailed/switzerland-tab-content.js";
import {
  NZ_UNLIM_DETAILED,
  NZ_DAILY_DETAILED,
  NZ_TOTAL_DETAILED,
  NZ_USAGE,
} from "../content/product-detailed/new-zealand-tab-content.js";
import {
  AU_UNLIM_DETAILED,
  AU_DAILY_DETAILED,
  AU_TOTAL_DETAILED,
  AU_USAGE,
} from "../content/product-detailed/australia-tab-content.js";
import {
  ANZ_UNLIM_DETAILED,
  ANZ_USAGE,
} from "../content/product-detailed/anz-tab-content.js";
import {
  UK_UNLIM_34_DETAILED,
  UK_UNLIM_36_DETAILED,
  UK_DAILY_DETAILED,
  UK_TOTAL_DETAILED,
  UK_USAGE_34,
  UK_USAGE_36,
} from "../content/product-detailed/uk-tab-content.js";
import {
  IT_UNLIM_32_DETAILED,
  IT_UNLIM_41_DETAILED,
  IT_DAILY_DETAILED,
  IT_TOTAL_DETAILED,
  IT_USAGE_32,
  IT_USAGE_41,
} from "../content/product-detailed/italy-tab-content.js";
import {
  AT_UNLIM_36_DETAILED,
  AT_UNLIM_32_DETAILED,
  AT_DAILY_41_DETAILED,
  AT_DAILY_32_DETAILED,
  AT_TOTAL_DETAILED,
  AT_USAGE_36,
  AT_USAGE_32,
  AT_USAGE_41,
} from "../content/product-detailed/austria-tab-content.js";
import {
  TR_UNLIM_DETAILED,
  TR_DAILY_DETAILED,
  TR_TOTAL_DETAILED,
  TR_USAGE,
} from "../content/product-detailed/turkey-tab-content.js";
import {
  SG_UNLIM_DETAILED,
  SG_DAILY_DETAILED,
  SG_TOTAL_DETAILED,
  SG_USAGE_SINGTEL,
  SG_USAGE_M1,
} from "../content/product-detailed/singapore-tab-content.js";
import {
  ID_UNLIM_DETAILED,
  ID_DAILY_DETAILED,
  ID_TOTAL_DETAILED,
  ID_USAGE,
} from "../content/product-detailed/indonesia-tab-content.js";
import {
  TW_UNLIM_5_DETAILED,
  TW_UNLIM_10_DETAILED,
  TW_DAILY_TWM_DETAILED,
  TW_DAILY_TWM5_DETAILED,
  TW_TOTAL_CHT_DETAILED,
  TW_TOTAL_DUAL_DETAILED,
  TW_USAGE_CHT,
  TW_USAGE_TWM,
  TW_USAGE_DUAL,
} from "../content/product-detailed/taiwan-tab-content.js";
import {
  CNHKMO_UNLIM_SHORT_DETAILED,
  CNHKMO_UNLIM_LONG_DETAILED,
  CNHKMO_DAILY_DETAILED,
  CNHKMO_TOTAL_DETAILED,
  CNHKMO_USAGE_SHORT,
  CNHKMO_USAGE_LONG,
  CNHKMO_USAGE_TC,
} from "../content/product-detailed/cnhkmo-tab-content.js";
import {
  CNHKMO_TC_UNLIM_DETAILED,
  CNHKMO_TC_DAILY_DETAILED,
  CNHKMO_TC_TOTAL_DETAILED,
  CNHKMO_TC_USAGE_UNLIM,
  CNHKMO_TC_USAGE_DAILY,
  CNHKMO_TC_USAGE_TOTAL,
} from "../content/product-detailed/cnhkmo-tc-tab-content.js";
import {
  TW_EKYC_UNLIM_DETAILED,
  TW_EKYC_DAILY_DETAILED,
  TW_EKYC_TOTAL_DETAILED,
  TW_EKYC_USAGE,
} from "../content/product-detailed/taiwan-ekyc-tab-content.js";
import { KOREA_UNLIMITED_SK_NATIVE_DETAILED_CONTENT_HTML } from "../content/product-detailed/korea-unlimited-sk-native.js";
import { KOREA_UNLIMITED_LG_SK_DETAILED_CONTENT_HTML } from "../content/product-detailed/korea-unlimited-lg-sk.js";
import { KOREA_UNLIMITED_USAGE_CONTENT_HTML } from "../content/product-detailed/korea-unlimited-usage.js";
import {
  KOREA_TOTAL_DUAL_DETAILED_CONTENT_HTML,
  KOREA_TOTAL_SKT_DETAILED_CONTENT_HTML,
} from "../content/product-detailed/korea-total.js";
import {
  KOREA_TOTAL_DUAL_USAGE_CONTENT_HTML,
  KOREA_TOTAL_SKT_USAGE_CONTENT_HTML,
} from "../content/product-detailed/korea-total-usage.js";
import {
  KOREA_DAILY_DUAL_DETAILED_CONTENT_HTML,
  KOREA_DAILY_SKT_DETAILED_CONTENT_HTML,
} from "../content/product-detailed/korea-daily.js";
import {
  KOREA_DAILY_DUAL_USAGE_CONTENT_HTML,
  KOREA_DAILY_SKT_USAGE_CONTENT_HTML,
} from "../content/product-detailed/korea-daily-usage.js";
import {
  JP_DAILY_SOFTBANK_KDDI_DETAILED,
  JP_DAILY_SOFTBANK_ONLY_DETAILED,
  JP_DAILY_TRIPLE_DETAILED,
  JP_DAILY_IIJ_DETAILED,
  JP_UNLIMITED_SOFTBANK_KDDI_DETAILED,
  JP_UNLIMITED_SOFTBANK_KDDI_10MBPS_DETAILED,
  JP_UNLIMITED_AU_10MBPS_DETAILED,
  JP_UNLIMITED_IIJ_DETAILED,
  JP_UNLIMITED_AU_NOLIMIT_DETAILED,
  JP_TOTAL_KDDI_SOFTBANK_DETAILED,
  JP_TOTAL_AU_KDDI_DETAILED,
  JP_TOTAL_IIJ_DETAILED,
  JP_USAGE_SOFTBANK_KDDI,
  JP_USAGE_SOFTBANK_ONLY,
  JP_USAGE_TRIPLE,
  JP_USAGE_AU_KDDI,
  JP_USAGE_IIJ,
} from "../content/product-detailed/japan-tab-content.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const envPath = path.join(__dirname, "..", ".env.local");
    const env = fs.readFileSync(envPath, "utf8");
    for (const line of env.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      let k = t.slice(0, i);
      let v = t.slice(i + 1);
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const CONTENT_MAP = {
  "china-daily-cmcc": {
    html: CN_DAILY_CMCC_DETAILED,
    handle: "china-daily-esim",
    carrier: "中國移動",
    contentType: "detailed",
  },
  "china-daily-cucc-tiktok": {
    html: CN_DAILY_CUCC_TIKTOK_DETAILED,
    handle: "china-daily-esim",
    carrier: "中國聯通 GPT + TikTok (CUCC)",
    contentType: "detailed",
  },
  "china-daily-usage-cmcc": {
    html: CN_USAGE_CMCC,
    handle: "china-daily-esim",
    carrier: "中國移動",
    contentType: "usage",
  },
  "china-daily-usage-cucc-tiktok": {
    html: CN_USAGE_CUCC_TIKTOK,
    handle: "china-daily-esim",
    carrier: "中國聯通 GPT + TikTok (CUCC)",
    contentType: "usage",
  },
  "china-unlimited-cmcc-70": {
    html: CN_UNLIMITED_CMCC_70_DETAILED,
    handle: "china-unlimited-esim",
    carrier: "CMCC 70Mbps",
    contentType: "detailed",
  },
  "china-unlimited-cucc": {
    html: CN_UNLIMITED_CUCC_DETAILED,
    handle: "china-unlimited-esim",
    carrier: "CUCC+",
    contentType: "detailed",
  },
  "china-unlimited-usage-cmcc-70": {
    html: CN_USAGE_CMCC_70,
    handle: "china-unlimited-esim",
    carrier: "CMCC 70Mbps",
    contentType: "usage",
  },
  "china-unlimited-usage-cucc": {
    html: CN_USAGE_CUCC_TIKTOK,
    handle: "china-unlimited-esim",
    carrier: "CUCC+",
    contentType: "usage",
  },
  "china-unlimited-cmcc": {
    html: CN_UNLIMITED_CMCC_70_DETAILED,
    handle: "china-unlimited-esim",
    carrier: "CMCC+",
    contentType: "detailed",
  },
  "china-unlimited-usage-cmcc": {
    html: CN_USAGE_CMCC_70,
    handle: "china-unlimited-esim",
    carrier: "CMCC+",
    contentType: "usage",
  },
  "china-total-cmcc": {
    html: CN_TOTAL_CMCC_DETAILED,
    handle: "china-total-esim",
    carrier: "CMCC+",
    contentType: "detailed",
  },
  "china-total-cucc": {
    html: CN_TOTAL_CUCC_DETAILED,
    handle: "china-total-esim",
    carrier: "CUCC+",
    contentType: "detailed",
  },
  "china-total-usage-cmcc": {
    html: CN_USAGE_CMCC,
    handle: "china-total-esim",
    carrier: "CMCC+",
    contentType: "usage",
  },
  "china-total-usage-cucc": {
    html: CN_USAGE_CUCC_TIKTOK,
    handle: "china-total-esim",
    carrier: "CUCC+",
    contentType: "usage",
  },
  // —— 泰國 ——
  "th-unlimited-truemove": {
    html: TH_UNLIMITED_TRUEMOVE_DETAILED,
    handle: "thailand-unlimited-esim",
    carrier: "Truemove H 當地號碼",
    contentType: "detailed",
  },
  "th-unlimited-true": {
    html: TH_UNLIMITED_TRUE_DETAILED,
    handle: "thailand-unlimited-esim",
    carrier: "True 電信",
    contentType: "detailed",
  },
  "th-unlimited-usage-truemove": {
    html: TH_USAGE_TRUEMOVE,
    handle: "thailand-unlimited-esim",
    carrier: "Truemove H 當地號碼",
    contentType: "usage",
  },
  "th-unlimited-usage-true": {
    html: TH_USAGE_TRUE_LOCAL,
    handle: "thailand-unlimited-esim",
    carrier: "True 電信",
    contentType: "usage",
  },
  "th-unlimited-dtac-rf": {
    html: TH_UNLIMITED_DTAC_RF_DETAILED,
    handle: "thailand-unlimited-esim",
    carrier: "DTAC / REAL FUTURE",
    contentType: "detailed",
  },
  "th-unlimited-usage-dtac-rf": {
    html: TH_USAGE_ROAM,
    handle: "thailand-unlimited-esim",
    carrier: "DTAC / REAL FUTURE",
    contentType: "usage",
  },
  "th-total-true": {
    html: TH_TOTAL_TRUE_DETAILED,
    handle: "thailand-total-esim",
    carrier: "TRUE",
    contentType: "detailed",
  },
  "th-total-ais": {
    html: TH_TOTAL_AIS_DETAILED,
    handle: "thailand-total-esim",
    carrier: "AIS",
    contentType: "detailed",
  },
  "th-total-dtac-rf": {
    html: TH_TOTAL_DTAC_RF_DETAILED,
    handle: "thailand-total-esim",
    carrier: "DTAC / REAL FUTURE",
    contentType: "detailed",
  },
  "th-total-usage-true": {
    html: TH_USAGE_TRUE_LOCAL,
    handle: "thailand-total-esim",
    carrier: "TRUE",
    contentType: "usage",
  },
  "th-total-usage-ais": {
    html: TH_USAGE_ROAM,
    handle: "thailand-total-esim",
    carrier: "AIS",
    contentType: "usage",
  },
  "th-total-usage-dtac-rf": {
    html: TH_USAGE_ROAM,
    handle: "thailand-total-esim",
    carrier: "DTAC / REAL FUTURE",
    contentType: "usage",
  },
  "th-daily-ais": {
    html: TH_DAILY_AIS_DETAILED,
    handle: "thailand-daily-esim",
    carrier: "AIS",
    contentType: "detailed",
  },
  "th-daily-dtac-rf": {
    html: TH_DAILY_DTAC_RF_DETAILED,
    handle: "thailand-daily-esim",
    carrier: "DTAC / REAL FUTURE",
    contentType: "detailed",
  },
  "th-daily-dtac": {
    html: TH_DAILY_DTAC_DETAILED,
    handle: "thailand-daily-esim",
    carrier: "DTAC",
    contentType: "detailed",
  },
  "th-daily-usage-ais": {
    html: TH_USAGE_ROAM,
    handle: "thailand-daily-esim",
    carrier: "AIS",
    contentType: "usage",
  },
  "th-daily-usage-dtac-rf": {
    html: TH_USAGE_ROAM,
    handle: "thailand-daily-esim",
    carrier: "DTAC / REAL FUTURE",
    contentType: "usage",
  },
  "th-daily-usage-dtac": {
    html: TH_USAGE_TRUE_LOCAL,
    handle: "thailand-daily-esim",
    carrier: "DTAC",
    contentType: "usage",
  },
  "hk-unlimited": {
    html: HK_UNLIMITED_DETAILED,
    handle: "hongkong-unlimited-esim",
    carrier: "CSL / China Telecom HK",
    contentType: "detailed",
  },
  "hk-unlimited-usage": {
    html: HK_USAGE_UNLIMITED,
    handle: "hongkong-unlimited-esim",
    carrier: "CSL / China Telecom HK",
    contentType: "usage",
  },
  "hk-unlimited-tc": {
    html: HK_UNLIMITED_TC_DETAILED,
    handle: "hongkong-unlimited-esim",
    carrier: "CUCC / China Telecom + CSL + CTM",
    contentType: "detailed",
  },
  "hk-unlimited-usage-tc": {
    html: HK_USAGE_UNLIMITED_TC,
    handle: "hongkong-unlimited-esim",
    carrier: "CUCC / China Telecom + CSL + CTM",
    contentType: "usage",
  },
  "hk-daily": {
    html: HK_DAILY_DETAILED,
    handle: "hongkong-daily-esim",
    carrier: "3HK",
    contentType: "detailed",
  },
  "hk-daily-usage": {
    html: HK_USAGE_SMARTONE,
    handle: "hongkong-daily-esim",
    carrier: "3HK",
    contentType: "usage",
  },
  "hk-total": {
    html: HK_TOTAL_DETAILED,
    handle: "hongkong-total-esim",
    carrier: "3HK",
    contentType: "detailed",
  },
  "hk-total-usage": {
    html: HK_USAGE_SMARTONE,
    handle: "hongkong-total-esim",
    carrier: "3HK",
    contentType: "usage",
  },
  "my-unlimited-umobile": {
    html: MY_UNLIMITED_UMOBILE_DETAILED,
    handle: "malaysia-unlimited-esim",
    carrier: "UMobile 5G 當地",
    contentType: "detailed",
  },
  "my-unlimited-dual": {
    html: MY_UNLIMITED_DUAL_DETAILED,
    handle: "malaysia-unlimited-esim",
    carrier: "Maxis / Celcom / Digi",
    contentType: "detailed",
  },
  "my-unlimited-usage-umobile": {
    html: MY_USAGE_UMOBILE,
    handle: "malaysia-unlimited-esim",
    carrier: "UMobile 5G 當地",
    contentType: "usage",
  },
  "my-unlimited-usage-dual": {
    html: MY_USAGE_DUAL,
    handle: "malaysia-unlimited-esim",
    carrier: "Maxis / Celcom / Digi",
    contentType: "usage",
  },
  "my-daily-umobile": {
    html: MY_DAILY_UMOBILE_DETAILED,
    handle: "malaysia-daily-esim",
    carrier: "UMobile 5G 當地",
    contentType: "detailed",
  },
  "my-daily-dual": {
    html: MY_DAILY_DUAL_DETAILED,
    handle: "malaysia-daily-esim",
    carrier: "Maxis / Celcom / Digi",
    contentType: "detailed",
  },
  "my-daily-usage-umobile": {
    html: MY_USAGE_UMOBILE,
    handle: "malaysia-daily-esim",
    carrier: "UMobile 5G 當地",
    contentType: "usage",
  },
  "my-daily-usage-dual": {
    html: MY_USAGE_DUAL,
    handle: "malaysia-daily-esim",
    carrier: "Maxis / Celcom / Digi",
    contentType: "usage",
  },
  "my-total-umobile": {
    html: MY_TOTAL_UMOBILE_DETAILED,
    handle: "malaysia-total-esim",
    carrier: "UMobile 5G 當地",
    contentType: "detailed",
  },
  "my-total-dual": {
    html: MY_TOTAL_DUAL_DETAILED,
    handle: "malaysia-total-esim",
    carrier: "Maxis / Celcom / Digi",
    contentType: "detailed",
  },
  "my-total-usage-umobile": {
    html: MY_USAGE_UMOBILE,
    handle: "malaysia-total-esim",
    carrier: "UMobile 5G 當地",
    contentType: "usage",
  },
  "my-total-usage-dual": {
    html: MY_USAGE_DUAL,
    handle: "malaysia-total-esim",
    carrier: "Maxis / Celcom / Digi",
    contentType: "usage",
  },
  // —— 美國本土 ——
  "usa-unlim": {
    html: USA_UNLIM_DETAILED,
    handle: "usa-mainland-unlimited-esim",
    carrier: "Verizon / T-Mobile",
    contentType: "detailed",
  },
  "usa-unlim-usage": {
    html: USA_USAGE_UNLIM,
    handle: "usa-mainland-unlimited-esim",
    carrier: "Verizon / T-Mobile",
    contentType: "usage",
  },
  "usa-daily-usip": {
    html: USA_DAILY_USIP_DETAILED,
    handle: "usa-mainland-daily-usip-esim",
    carrier: "Verizon USA / AT&T USA",
    contentType: "detailed",
  },
  "usa-daily-usip-usage": {
    html: USA_USAGE_USIP,
    handle: "usa-mainland-daily-usip-esim",
    carrier: "Verizon USA / AT&T USA",
    contentType: "usage",
  },
  "usa-total-usip": {
    html: USA_TOTAL_USIP_DETAILED,
    handle: "usa-mainland-total-usip-esim",
    carrier: "Verizon USA / AT&T USA",
    contentType: "detailed",
  },
  "usa-total-long-usatt": {
    html: USA_TOTAL_LONG_USATT_DETAILED,
    handle: "usa-mainland-total-usip-esim",
    carrier: "長天數 Verizon USA / AT&T USA",
    contentType: "detailed",
  },
  "usa-total-long-vz": {
    html: USA_TOTAL_LONG_VZ_DETAILED,
    handle: "usa-mainland-total-usip-esim",
    carrier: "長天數 Verizon",
    contentType: "detailed",
  },
  "usa-total-usip-usage": {
    html: USA_USAGE_USIP,
    handle: "usa-mainland-total-usip-esim",
    carrier: "Verizon USA / AT&T USA",
    contentType: "usage",
  },
  "usa-total-long-usatt-usage": {
    html: USA_USAGE_USIP,
    handle: "usa-mainland-total-usip-esim",
    carrier: "長天數 Verizon USA / AT&T USA",
    contentType: "usage",
  },
  "usa-total-long-vz-usage": {
    html: USA_USAGE_LONG_VZ,
    handle: "usa-mainland-total-usip-esim",
    carrier: "長天數 Verizon",
    contentType: "usage",
  },
  // —— 美加 ——
  "usca-unlim-a0": {
    html: USCA_UNLIM_A0_DETAILED,
    handle: "us-canada-unlimited-esim",
    carrier: "US,CA 多網 A0",
    contentType: "detailed",
  },
  "usca-unlim-vz-bell": {
    html: USCA_UNLIM_VZ_BELL_DETAILED,
    handle: "us-canada-unlimited-esim",
    carrier: "Verizon + Bell / Telus",
    contentType: "detailed",
  },
  "usca-unlim-tm": {
    html: USCA_UNLIM_TM_DETAILED,
    handle: "us-canada-unlimited-esim",
    carrier: "T-Mobile / Verizon / AT&T + 加拿大",
    contentType: "detailed",
  },
  "usca-unlim-usage-a0": {
    html: USCA_USAGE_UNLIM,
    handle: "us-canada-unlimited-esim",
    carrier: "US,CA 多網 A0",
    contentType: "usage",
  },
  "usca-unlim-usage-vz-bell": {
    html: USCA_USAGE_UNLIM,
    handle: "us-canada-unlimited-esim",
    carrier: "Verizon + Bell / Telus",
    contentType: "usage",
  },
  "usca-unlim-usage-tm": {
    html: USCA_USAGE_UNLIM,
    handle: "us-canada-unlimited-esim",
    carrier: "T-Mobile / Verizon / AT&T + 加拿大",
    contentType: "usage",
  },
  "usca-daily-vz-bell": {
    html: USCA_DAILY_VZ_BELL_DETAILED,
    handle: "us-canada-daily-esim",
    carrier: "Verizon + Bell / Telus",
    contentType: "detailed",
  },
  "usca-daily-tm": {
    html: USCA_DAILY_TM_DETAILED,
    handle: "us-canada-daily-esim",
    carrier: "T-Mobile / Verizon / AT&T + 加拿大",
    contentType: "detailed",
  },
  "usca-daily-multi": {
    html: USCA_DAILY_MULTI_DETAILED,
    handle: "us-canada-daily-esim",
    carrier: "Verizon / AT&T / T-Mobile + 加拿大多網",
    contentType: "detailed",
  },
  "usca-daily-usage-vz-bell": {
    html: USCA_USAGE_DAILY,
    handle: "us-canada-daily-esim",
    carrier: "Verizon + Bell / Telus",
    contentType: "usage",
  },
  "usca-daily-usage-tm": {
    html: USCA_USAGE_DAILY,
    handle: "us-canada-daily-esim",
    carrier: "T-Mobile / Verizon / AT&T + 加拿大",
    contentType: "usage",
  },
  "usca-daily-usage-multi": {
    html: USCA_USAGE_DAILY,
    handle: "us-canada-daily-esim",
    carrier: "Verizon / AT&T / T-Mobile + 加拿大多網",
    contentType: "usage",
  },
  "usca-total-a0": {
    html: USCA_TOTAL_A0_DETAILED,
    handle: "us-canada-total-esim",
    carrier: "Bell/Telus + Verizon（A0）",
    contentType: "detailed",
  },
  "usca-total-b": {
    html: USCA_TOTAL_B_DETAILED,
    handle: "us-canada-total-esim",
    carrier: "US&Canada Total B（T-Mobile/AT&T/Verizon + 加拿大多網）",
    contentType: "detailed",
  },
  "usca-total-usage-a0": {
    html: USCA_USAGE_TOTAL,
    handle: "us-canada-total-esim",
    carrier: "Bell/Telus + Verizon（A0）",
    contentType: "usage",
  },
  "usca-total-usage-b": {
    html: USCA_USAGE_TOTAL,
    handle: "us-canada-total-esim",
    carrier: "US&Canada Total B（T-Mobile/AT&T/Verizon + 加拿大多網）",
    contentType: "usage",
  },
  // —— 北美美加墨 ——
  "na-att": {
    html: NA_ATT_DETAILED,
    handle: "north-america-att-unlimited-esim",
    carrier: "AT&T 美國號碼",
    contentType: "detailed",
  },
  "na-att-usage": {
    html: NA_USAGE_ATT,
    handle: "north-america-att-unlimited-esim",
    carrier: "AT&T 美國號碼",
    contentType: "usage",
  },
  "na-att-longterm": {
    html: NA_ATT_LONGTERM_DETAILED,
    handle: "usa-native-unlimited-longterm-esim",
    carrier: "AT&T 美國號碼",
    contentType: "detailed",
  },
  "na-att-longterm-usage": {
    html: NA_USAGE_ATT_LONGTERM,
    handle: "usa-native-unlimited-longterm-esim",
    carrier: "AT&T 美國號碼",
    contentType: "usage",
  },
  "na-daily-a0": {
    html: NA_DAILY_A0_DETAILED,
    handle: "north-america-daily-usip-esim",
    carrier: "Rogers + Movistar + Verizon USA / AT&T USA",
    contentType: "detailed",
  },
  "na-daily-a1": {
    html: NA_DAILY_A1_DETAILED,
    handle: "north-america-daily-usip-esim",
    carrier: "Rogers + Movistar + Verizon USA / AT&T USA（A1）",
    contentType: "detailed",
  },
  "na-daily-usage-a0": {
    html: NA_USAGE_USIP,
    handle: "north-america-daily-usip-esim",
    carrier: "Rogers + Movistar + Verizon USA / AT&T USA",
    contentType: "usage",
  },
  "na-daily-usage-a1": {
    html: NA_USAGE_USIP,
    handle: "north-america-daily-usip-esim",
    carrier: "Rogers + Movistar + Verizon USA / AT&T USA（A1）",
    contentType: "usage",
  },
  "na-total": {
    html: NA_TOTAL_DETAILED,
    handle: "north-america-total-usip-esim",
    carrier: "Rogers + Movistar + Verizon USA / AT&T USA",
    contentType: "detailed",
  },
  "na-total-usage": {
    html: NA_USAGE_USIP,
    handle: "north-america-total-usip-esim",
    carrier: "Rogers + Movistar + Verizon USA / AT&T USA",
    contentType: "usage",
  },
  // —— 加拿大 ——
  "ca-unlim": {
    html: CA_UNLIM_DETAILED,
    handle: "canada-unlimited-esim",
    carrier: "WIND / Bell / TELUS +",
    contentType: "detailed",
  },
  "ca-unlim-usage": {
    html: CA_USAGE_UNLIM,
    handle: "canada-unlimited-esim",
    carrier: "WIND / Bell / TELUS +",
    contentType: "usage",
  },
  "ca-unlim-10m": {
    html: CA_UNLIM_10M_DETAILED,
    handle: "canada-unlimited-esim",
    carrier: "Bell / Telus / Verizon（10Mbps）",
    contentType: "detailed",
  },
  "ca-unlim-10m-usage": {
    html: CA_USAGE_UNLIM_10M,
    handle: "canada-unlimited-esim",
    carrier: "Bell / Telus / Verizon（10Mbps）",
    contentType: "usage",
  },
  "ca-daily-roam": {
    html: CA_DAILY_ROAM_DETAILED,
    handle: "canada-daily-esim",
    carrier: "TELUS / BELL",
    contentType: "detailed",
  },
  "ca-daily-multi": {
    html: CA_DAILY_MULTI_DETAILED,
    handle: "canada-daily-esim",
    carrier: "Rogers / Bell / TELUS +",
    contentType: "detailed",
  },
  "ca-daily-usage-roam": {
    html: CA_USAGE_DAILY_ROAM,
    handle: "canada-daily-esim",
    carrier: "TELUS / BELL",
    contentType: "usage",
  },
  "ca-daily-usage-multi": {
    html: CA_USAGE_DAILY_MULTI,
    handle: "canada-daily-esim",
    carrier: "Rogers / Bell / TELUS +",
    contentType: "usage",
  },
  "ca-total-roam": {
    html: CA_TOTAL_ROAM_DETAILED,
    handle: "canada-total-esim",
    carrier: "TELUS / BELL",
    contentType: "detailed",
  },
  "ca-total-multi": {
    html: CA_TOTAL_MULTI_DETAILED,
    handle: "canada-total-esim",
    carrier: "Rogers / Bell / TELUS +",
    contentType: "detailed",
  },
  "ca-total-native": {
    html: CA_TOTAL_NATIVE_DETAILED,
    handle: "canada-total-esim",
    carrier: "TELUS 原生",
    contentType: "detailed",
  },
  "ca-total-usage-roam": {
    html: CA_USAGE_TOTAL_ROAM,
    handle: "canada-total-esim",
    carrier: "TELUS / BELL",
    contentType: "usage",
  },
  "ca-total-usage-multi": {
    html: CA_USAGE_TOTAL_MULTI,
    handle: "canada-total-esim",
    carrier: "Rogers / Bell / TELUS +",
    contentType: "usage",
  },
  "ca-total-usage-native": {
    html: CA_USAGE_TOTAL_NATIVE,
    handle: "canada-total-esim",
    carrier: "TELUS 原生",
    contentType: "usage",
  },
  // —— 越南 ——
  "vn-unlim-vinaphone": {
    html: VN_UNLIM_VINAPHONE_DETAILED,
    handle: "vietnam-vinaphone-esim",
    carrier: "Vinaphone",
    contentType: "detailed",
  },
  "vn-unlim-usage-vinaphone": {
    html: VN_USAGE_VINAPHONE,
    handle: "vietnam-vinaphone-esim",
    carrier: "Vinaphone",
    contentType: "usage",
  },
  "vn-daily-viettel": {
    html: VN_DAILY_VIETTEL_DETAILED,
    handle: "vietnam-daily-local-esim",
    carrier: "Viettel",
    contentType: "detailed",
  },
  "vn-daily-vinaphone": {
    html: VN_DAILY_VINAPHONE_DETAILED,
    handle: "vietnam-daily-local-esim",
    carrier: "Vinaphone",
    contentType: "detailed",
  },
  "vn-daily-usage-viettel": {
    html: VN_USAGE_VIETTEL,
    handle: "vietnam-daily-local-esim",
    carrier: "Viettel",
    contentType: "usage",
  },
  "vn-daily-usage-vinaphone": {
    html: VN_USAGE_VINAPHONE_DAILY,
    handle: "vietnam-daily-local-esim",
    carrier: "Vinaphone",
    contentType: "usage",
  },
  "vn-total-vinaphone": {
    html: VN_TOTAL_VINAPHONE_DETAILED,
    handle: "vietnam-total-local-esim",
    carrier: "Vinaphone",
    contentType: "detailed",
  },
  "vn-total-wintel": {
    html: VN_TOTAL_WINTEL_DETAILED,
    handle: "vietnam-total-local-esim",
    carrier: "Wintel",
    contentType: "detailed",
  },
  "vn-total-mobifone": {
    html: VN_TOTAL_MOBIFONE_DETAILED,
    handle: "vietnam-total-local-esim",
    carrier: "Mobifone 當地號碼",
    contentType: "detailed",
  },
  "vn-total-usage-vinaphone": {
    html: VN_USAGE_VINAPHONE_TOTAL,
    handle: "vietnam-total-local-esim",
    carrier: "Vinaphone",
    contentType: "usage",
  },
  "vn-total-usage-wintel": {
    html: VN_USAGE_WINTEL,
    handle: "vietnam-total-local-esim",
    carrier: "Wintel",
    contentType: "usage",
  },
  "vn-total-usage-mobifone": {
    html: VN_USAGE_MOBIFONE,
    handle: "vietnam-total-local-esim",
    carrier: "Mobifone 當地號碼",
    contentType: "usage",
  },
  "korea-unlimited-sk-native": {
    html: KOREA_UNLIMITED_SK_NATIVE_DETAILED_CONTENT_HTML,
    handle: "korea-unlimited-esim",
    carrier: "SK電信（韓國IP）",
    contentType: "detailed",
  },
  "korea-unlimited-lg-sk": {
    html: KOREA_UNLIMITED_LG_SK_DETAILED_CONTENT_HTML,
    handle: "korea-unlimited-esim",
    carrier: "LG U+ / SK電信",
    contentType: "detailed",
  },
  "korea-unlimited-usage-sk-native": {
    html: KOREA_UNLIMITED_USAGE_CONTENT_HTML,
    handle: "korea-unlimited-esim",
    carrier: "SK電信（韓國IP）",
    contentType: "usage",
  },
  "korea-unlimited-usage-lg-sk": {
    html: KOREA_UNLIMITED_USAGE_CONTENT_HTML,
    handle: "korea-unlimited-esim",
    carrier: "LG U+ / SK電信",
    contentType: "usage",
  },
  "korea-total-dual": {
    html: KOREA_TOTAL_DUAL_DETAILED_CONTENT_HTML,
    handle: "korea-total-esim",
    carrier: "LG U+ / SK電信 5G 雙切換",
    contentType: "detailed",
  },
  "korea-total-skt": {
    html: KOREA_TOTAL_SKT_DETAILED_CONTENT_HTML,
    handle: "korea-total-esim",
    carrier: "SK電信 5G",
    contentType: "detailed",
  },
  "korea-total-usage-dual": {
    html: KOREA_TOTAL_DUAL_USAGE_CONTENT_HTML,
    handle: "korea-total-esim",
    carrier: "LG U+ / SK電信 5G 雙切換",
    contentType: "usage",
  },
  "korea-total-usage-skt": {
    html: KOREA_TOTAL_SKT_USAGE_CONTENT_HTML,
    handle: "korea-total-esim",
    carrier: "SK電信 5G",
    contentType: "usage",
  },
  "korea-daily-dual": {
    html: KOREA_DAILY_DUAL_DETAILED_CONTENT_HTML,
    handle: "korea-daily-esim",
    carrier: "LG U+ / SK電信 5G 雙切換",
    contentType: "detailed",
  },
  "korea-daily-skt": {
    html: KOREA_DAILY_SKT_DETAILED_CONTENT_HTML,
    handle: "korea-daily-esim",
    carrier: "SK電信 5G",
    contentType: "detailed",
  },
  "korea-daily-usage-dual": {
    html: KOREA_DAILY_DUAL_USAGE_CONTENT_HTML,
    handle: "korea-daily-esim",
    carrier: "LG U+ / SK電信 5G 雙切換",
    contentType: "usage",
  },
  "korea-daily-usage-skt": {
    html: KOREA_DAILY_SKT_USAGE_CONTENT_HTML,
    handle: "korea-daily-esim",
    carrier: "SK電信 5G",
    contentType: "usage",
  },
  // —— 日本每日型 daily-jp ——
  "jp-daily-softbank-kddi": {
    html: JP_DAILY_SOFTBANK_KDDI_DETAILED,
    handle: "daily-jp",
    carrier: "SoftBank / KDDI",
    contentType: "detailed",
  },
  "jp-daily-softbank-only": {
    html: JP_DAILY_SOFTBANK_ONLY_DETAILED,
    handle: "daily-jp",
    carrier: "SoftBank（注意：Android 通常需手動 APN）",
    contentType: "detailed",
  },
  "jp-daily-triple": {
    html: JP_DAILY_TRIPLE_DETAILED,
    handle: "daily-jp",
    carrier: "KDDI / SoftBank / Docomo +",
    contentType: "detailed",
  },
  "jp-daily-iij": {
    html: JP_DAILY_IIJ_DETAILED,
    handle: "daily-jp",
    carrier: "IIJ Docomo（注意：需手動設定 APN）",
    contentType: "detailed",
  },
  "jp-daily-usage-softbank-kddi": {
    html: JP_USAGE_SOFTBANK_KDDI,
    handle: "daily-jp",
    carrier: "SoftBank / KDDI",
    contentType: "usage",
  },
  "jp-daily-usage-softbank-only": {
    html: JP_USAGE_SOFTBANK_ONLY,
    handle: "daily-jp",
    carrier: "SoftBank（注意：Android 通常需手動 APN）",
    contentType: "usage",
  },
  "jp-daily-usage-triple": {
    html: JP_USAGE_TRIPLE,
    handle: "daily-jp",
    carrier: "KDDI / SoftBank / Docomo +",
    contentType: "usage",
  },
  "jp-daily-usage-iij": {
    html: JP_USAGE_IIJ,
    handle: "daily-jp",
    carrier: "IIJ Docomo（注意：需手動設定 APN）",
    contentType: "usage",
  },
  // —— 日本吃到飽 japan-unlimited-esim ——
  "jp-unlimited-softbank-kddi": {
    html: JP_UNLIMITED_SOFTBANK_KDDI_DETAILED,
    handle: "japan-unlimited-esim",
    carrier: "SoftBank / KDDI",
    contentType: "detailed",
  },
  "jp-unlimited-softbank-kddi-10mbps": {
    html: JP_UNLIMITED_SOFTBANK_KDDI_10MBPS_DETAILED,
    handle: "japan-unlimited-esim",
    carrier: "SoftBank / KDDI 10Mbps",
    contentType: "detailed",
  },
  "jp-unlimited-au-10mbps": {
    html: JP_UNLIMITED_AU_10MBPS_DETAILED,
    handle: "japan-unlimited-esim",
    carrier: "AU(KDDI) 10Mbps",
    contentType: "detailed",
  },
  "jp-unlimited-iij": {
    html: JP_UNLIMITED_IIJ_DETAILED,
    handle: "japan-unlimited-esim",
    carrier: "IIJ Docomo",
    contentType: "detailed",
  },
  "jp-unlimited-usage-softbank-kddi": {
    html: JP_USAGE_SOFTBANK_KDDI,
    handle: "japan-unlimited-esim",
    carrier: "SoftBank / KDDI",
    contentType: "usage",
  },
  "jp-unlimited-usage-softbank-kddi-10mbps": {
    html: JP_USAGE_SOFTBANK_KDDI,
    handle: "japan-unlimited-esim",
    carrier: "SoftBank / KDDI 10Mbps",
    contentType: "usage",
  },
  "jp-unlimited-usage-au-10mbps": {
    html: JP_USAGE_AU_KDDI,
    handle: "japan-unlimited-esim",
    carrier: "AU(KDDI) 10Mbps",
    contentType: "usage",
  },
  "jp-unlimited-usage-iij": {
    html: JP_USAGE_IIJ,
    handle: "japan-unlimited-esim",
    carrier: "IIJ Docomo",
    contentType: "usage",
  },
  // —— 日本吃到飽不降速 ——
  "jp-nolimit-au": {
    html: JP_UNLIMITED_AU_NOLIMIT_DETAILED,
    handle: "japan-unlimited-esim-nolimit",
    carrier: "AU(KDDI) 真。吃到飽不降速",
    contentType: "detailed",
  },
  "jp-nolimit-usage-au": {
    html: JP_USAGE_AU_KDDI,
    handle: "japan-unlimited-esim-nolimit",
    carrier: "AU(KDDI) 真。吃到飽不降速",
    contentType: "usage",
  },
  // —— 日本總量型 ——
  "jp-total-kddi-softbank": {
    html: JP_TOTAL_KDDI_SOFTBANK_DETAILED,
    handle: "japan-total-esim",
    carrier: "KDDI / SoftBank",
    contentType: "detailed",
  },
  "jp-total-au": {
    html: JP_TOTAL_AU_KDDI_DETAILED,
    handle: "japan-total-esim",
    carrier: "AU(KDDI)",
    contentType: "detailed",
  },
  "jp-total-iij": {
    html: JP_TOTAL_IIJ_DETAILED,
    handle: "japan-total-esim",
    carrier: "IIJ(DOCOMO)",
    contentType: "detailed",
  },
  "jp-total-usage-kddi-softbank": {
    html: JP_USAGE_SOFTBANK_KDDI,
    handle: "japan-total-esim",
    carrier: "KDDI / SoftBank",
    contentType: "usage",
  },
  "jp-total-usage-au": {
    html: JP_USAGE_AU_KDDI,
    handle: "japan-total-esim",
    carrier: "AU(KDDI)",
    contentType: "usage",
  },
  "jp-total-usage-iij": {
    html: JP_USAGE_IIJ,
    handle: "japan-total-esim",
    carrier: "IIJ(DOCOMO)",
    contentType: "usage",
  },
  // 舊 slug 相容
  "au-kddi": {
    html: JP_UNLIMITED_AU_10MBPS_DETAILED,
    handle: "japan-unlimited-esim",
    carrier: "AU(KDDI) 10Mbps",
    contentType: "detailed",
  },
  // —— 法國／西班牙／瑞士／紐澳 ——
  "fr-unlim": {
    html: FR_UNLIM_DETAILED,
    handle: "france-unlimited-esim",
    carrier: "ORANGE +",
    contentType: "detailed",
  },
  "fr-unlim-usage": {
    html: FR_USAGE,
    handle: "france-unlimited-esim",
    carrier: "ORANGE +",
    contentType: "usage",
  },
  "fr-daily": {
    html: FR_DAILY_DETAILED,
    handle: "france-daily-esim",
    carrier: "ORANGE +",
    contentType: "detailed",
  },
  "fr-daily-usage": {
    html: FR_USAGE,
    handle: "france-daily-esim",
    carrier: "ORANGE +",
    contentType: "usage",
  },
  "fr-total": {
    html: FR_TOTAL_DETAILED,
    handle: "france-total-esim",
    carrier: "ORANGE +",
    contentType: "detailed",
  },
  "fr-total-usage": {
    html: FR_USAGE,
    handle: "france-total-esim",
    carrier: "ORANGE +",
    contentType: "usage",
  },
  "es-unlim": {
    html: ES_UNLIM_DETAILED,
    handle: "spain-unlimited-esim",
    carrier: "Movistar +",
    contentType: "detailed",
  },
  "es-unlim-usage": {
    html: ES_USAGE_UNLIM,
    handle: "spain-unlimited-esim",
    carrier: "Movistar +",
    contentType: "usage",
  },
  "es-daily": {
    html: ES_DAILY_DETAILED,
    handle: "spain-daily-esim",
    carrier: "Orange +",
    contentType: "detailed",
  },
  "es-daily-usage": {
    html: ES_USAGE_DAILY,
    handle: "spain-daily-esim",
    carrier: "Orange +",
    contentType: "usage",
  },
  "es-total": {
    html: ES_TOTAL_DETAILED,
    handle: "spain-total-esim",
    carrier: "Orange / Movistar +",
    contentType: "detailed",
  },
  "es-total-usage": {
    html: ES_USAGE_TOTAL,
    handle: "spain-total-esim",
    carrier: "Orange / Movistar +",
    contentType: "usage",
  },
  "ch-unlim-34": {
    html: CH_UNLIM_34_DETAILED,
    handle: "switzerland-unlimited-esim",
    carrier: "Swisscom / Sunrise +",
    contentType: "detailed",
  },
  "ch-unlim-41": {
    html: CH_UNLIM_41_DETAILED,
    handle: "switzerland-unlimited-esim",
    carrier: "Sunrise / Salt +",
    contentType: "detailed",
  },
  "ch-unlim-usage-34": {
    html: CH_USAGE_34,
    handle: "switzerland-unlimited-esim",
    carrier: "Swisscom / Sunrise +",
    contentType: "usage",
  },
  "ch-unlim-usage-41": {
    html: CH_USAGE_41,
    handle: "switzerland-unlimited-esim",
    carrier: "Sunrise / Salt +",
    contentType: "usage",
  },
  "ch-daily": {
    html: CH_DAILY_DETAILED,
    handle: "switzerland-daily-esim",
    carrier: "Swisscom / Sunrise +",
    contentType: "detailed",
  },
  "ch-daily-usage": {
    html: CH_USAGE_34,
    handle: "switzerland-daily-esim",
    carrier: "Swisscom / Sunrise +",
    contentType: "usage",
  },
  "ch-total": {
    html: CH_TOTAL_DETAILED,
    handle: "switzerland-total-esim",
    carrier: "Swisscom / Sunrise +",
    contentType: "detailed",
  },
  "ch-total-usage": {
    html: CH_USAGE_34,
    handle: "switzerland-total-esim",
    carrier: "Swisscom / Sunrise +",
    contentType: "usage",
  },
  "nz-unlim": {
    html: NZ_UNLIM_DETAILED,
    handle: "new-zealand-unlimited-esim",
    carrier: "VODAFONE +",
    contentType: "detailed",
  },
  "nz-unlim-usage": {
    html: NZ_USAGE,
    handle: "new-zealand-unlimited-esim",
    carrier: "VODAFONE +",
    contentType: "usage",
  },
  "nz-daily": {
    html: NZ_DAILY_DETAILED,
    handle: "new-zealand-daily-esim",
    carrier: "VODAFONE +",
    contentType: "detailed",
  },
  "nz-daily-usage": {
    html: NZ_USAGE,
    handle: "new-zealand-daily-esim",
    carrier: "VODAFONE +",
    contentType: "usage",
  },
  "nz-total": {
    html: NZ_TOTAL_DETAILED,
    handle: "new-zealand-total-esim",
    carrier: "VODAFONE +",
    contentType: "detailed",
  },
  "nz-total-usage": {
    html: NZ_USAGE,
    handle: "new-zealand-total-esim",
    carrier: "VODAFONE +",
    contentType: "usage",
  },
  "au-unlim": {
    html: AU_UNLIM_DETAILED,
    handle: "australia-unlimited-esim",
    carrier: "OPTUS",
    contentType: "detailed",
  },
  "au-unlim-usage": {
    html: AU_USAGE,
    handle: "australia-unlimited-esim",
    carrier: "OPTUS",
    contentType: "usage",
  },
  "au-daily": {
    html: AU_DAILY_DETAILED,
    handle: "australia-daily-esim",
    carrier: "OPTUS",
    contentType: "detailed",
  },
  "au-daily-usage": {
    html: AU_USAGE,
    handle: "australia-daily-esim",
    carrier: "OPTUS",
    contentType: "usage",
  },
  "au-total": {
    html: AU_TOTAL_DETAILED,
    handle: "australia-total-esim",
    carrier: "OPTUS",
    contentType: "detailed",
  },
  "au-total-usage": {
    html: AU_USAGE,
    handle: "australia-total-esim",
    carrier: "OPTUS",
    contentType: "usage",
  },
  "anz-unlim": {
    html: ANZ_UNLIM_DETAILED,
    handle: "anz-unlimited-esim",
    carrier: "VODAFONE + NZ V",
    contentType: "detailed",
  },
  "anz-unlim-usage": {
    html: ANZ_USAGE,
    handle: "anz-unlimited-esim",
    carrier: "VODAFONE + NZ V",
    contentType: "usage",
  },
  // —— 英國 ——
  "uk-unlim-34": {
    html: UK_UNLIM_34_DETAILED,
    handle: "uk-unlimited-esim",
    carrier: "EE / Three +",
    contentType: "detailed",
  },
  "uk-unlim-36": {
    html: UK_UNLIM_36_DETAILED,
    handle: "uk-unlimited-esim",
    carrier: "EE +",
    contentType: "detailed",
  },
  "uk-unlim-10mbps": {
    html: UK_UNLIM_36_DETAILED,
    handle: "uk-unlimited-10mbps-esim",
    carrier: "EE +",
    contentType: "detailed",
  },
  "uk-unlim-10mbps-usage": {
    html: UK_USAGE_36,
    handle: "uk-unlimited-10mbps-esim",
    carrier: "EE +",
    contentType: "usage",
  },
  "uk-unlim-usage-34": {
    html: UK_USAGE_34,
    handle: "uk-unlimited-esim",
    carrier: "EE / Three +",
    contentType: "usage",
  },
  "uk-unlim-usage-36": {
    html: UK_USAGE_36,
    handle: "uk-unlimited-esim",
    carrier: "EE +",
    contentType: "usage",
  },
  "uk-daily": {
    html: UK_DAILY_DETAILED,
    handle: "uk-daily-esim",
    carrier: "EE / Three +",
    contentType: "detailed",
  },
  "uk-daily-usage": {
    html: UK_USAGE_34,
    handle: "uk-daily-esim",
    carrier: "EE / Three +",
    contentType: "usage",
  },
  "uk-total": {
    html: UK_TOTAL_DETAILED,
    handle: "uk-total-esim",
    carrier: "EE / Three +",
    contentType: "detailed",
  },
  "uk-total-usage": {
    html: UK_USAGE_34,
    handle: "uk-total-esim",
    carrier: "EE / Three +",
    contentType: "usage",
  },
  // —— 義大利 ——
  "it-unlim-32": {
    html: IT_UNLIM_32_DETAILED,
    handle: "italy-unlimited-esim",
    carrier: "Iliad / TIM +",
    contentType: "detailed",
  },
  "it-unlim-41": {
    html: IT_UNLIM_41_DETAILED,
    handle: "italy-unlimited-esim",
    carrier: "Iliad / WindTre +",
    contentType: "detailed",
  },
  "it-unlim-usage-32": {
    html: IT_USAGE_32,
    handle: "italy-unlimited-esim",
    carrier: "Iliad / TIM +",
    contentType: "usage",
  },
  "it-unlim-usage-41": {
    html: IT_USAGE_41,
    handle: "italy-unlimited-esim",
    carrier: "Iliad / WindTre +",
    contentType: "usage",
  },
  "it-daily": {
    html: IT_DAILY_DETAILED,
    handle: "italy-daily-esim",
    carrier: "Iliad / TIM +",
    contentType: "detailed",
  },
  "it-daily-usage": {
    html: IT_USAGE_32,
    handle: "italy-daily-esim",
    carrier: "Iliad / TIM +",
    contentType: "usage",
  },
  "it-total": {
    html: IT_TOTAL_DETAILED,
    handle: "italy-total-esim",
    carrier: "Iliad / TIM +",
    contentType: "detailed",
  },
  "it-total-usage": {
    html: IT_USAGE_32,
    handle: "italy-total-esim",
    carrier: "Iliad / TIM +",
    contentType: "usage",
  },
  // —— 奧地利 ——
  "at-unlim-36": {
    html: AT_UNLIM_36_DETAILED,
    handle: "austria-unlimited-esim",
    carrier: "Drei / A1 +",
    contentType: "detailed",
  },
  "at-unlim-32": {
    html: AT_UNLIM_32_DETAILED,
    handle: "austria-unlimited-esim",
    carrier: "A1 / Three +",
    contentType: "detailed",
  },
  "at-unlim-usage-36": {
    html: AT_USAGE_36,
    handle: "austria-unlimited-esim",
    carrier: "Drei / A1 +",
    contentType: "usage",
  },
  "at-unlim-usage-32": {
    html: AT_USAGE_32,
    handle: "austria-unlimited-esim",
    carrier: "A1 / Three +",
    contentType: "usage",
  },
  "at-daily-41": {
    html: AT_DAILY_41_DETAILED,
    handle: "austria-daily-esim",
    carrier: "A1 / H3G +",
    contentType: "detailed",
  },
  "at-daily-32": {
    html: AT_DAILY_32_DETAILED,
    handle: "austria-daily-esim",
    carrier: "A1 / Three +",
    contentType: "detailed",
  },
  "at-daily-usage-41": {
    html: AT_USAGE_41,
    handle: "austria-daily-esim",
    carrier: "A1 / H3G +",
    contentType: "usage",
  },
  "at-daily-usage-32": {
    html: AT_USAGE_32,
    handle: "austria-daily-esim",
    carrier: "A1 / Three +",
    contentType: "usage",
  },
  "at-total": {
    html: AT_TOTAL_DETAILED,
    handle: "austria-total-esim",
    carrier: "A1 / Three +",
    contentType: "detailed",
  },
  "at-total-usage": {
    html: AT_USAGE_32,
    handle: "austria-total-esim",
    carrier: "A1 / Three +",
    contentType: "usage",
  },
  // —— 土耳其 ——
  "tr-unlim": {
    html: TR_UNLIM_DETAILED,
    handle: "turkey-unlimited-esim",
    carrier: "AVEA TURKEY / VODAFONE TURKEY +",
    contentType: "detailed",
  },
  "tr-unlim-usage": {
    html: TR_USAGE,
    handle: "turkey-unlimited-esim",
    carrier: "AVEA TURKEY / VODAFONE TURKEY +",
    contentType: "usage",
  },
  "tr-daily": {
    html: TR_DAILY_DETAILED,
    handle: "turkey-daily-esim",
    carrier: "AVEA TURKEY / VODAFONE TURKEY +",
    contentType: "detailed",
  },
  "tr-daily-usage": {
    html: TR_USAGE,
    handle: "turkey-daily-esim",
    carrier: "AVEA TURKEY / VODAFONE TURKEY +",
    contentType: "usage",
  },
  "tr-total": {
    html: TR_TOTAL_DETAILED,
    handle: "turkey-total-esim",
    carrier: "AVEA TURKEY / VODAFONE TURKEY +",
    contentType: "detailed",
  },
  "tr-total-usage": {
    html: TR_USAGE,
    handle: "turkey-total-esim",
    carrier: "AVEA TURKEY / VODAFONE TURKEY +",
    contentType: "usage",
  },
  // —— 新加坡 ——
  "sg-unlim": {
    html: SG_UNLIM_DETAILED,
    handle: "singapore-unlimited-esim",
    carrier: "Singtel",
    contentType: "detailed",
  },
  "sg-unlim-usage": {
    html: SG_USAGE_SINGTEL,
    handle: "singapore-unlimited-esim",
    carrier: "Singtel",
    contentType: "usage",
  },
  "sg-daily": {
    html: SG_DAILY_DETAILED,
    handle: "singapore-daily-esim",
    carrier: "M1 / Starhub",
    contentType: "detailed",
  },
  "sg-daily-usage": {
    html: SG_USAGE_M1,
    handle: "singapore-daily-esim",
    carrier: "M1 / Starhub",
    contentType: "usage",
  },
  "sg-total": {
    html: SG_TOTAL_DETAILED,
    handle: "singapore-total-esim",
    carrier: "M1 / Starhub",
    contentType: "detailed",
  },
  "sg-total-usage": {
    html: SG_USAGE_M1,
    handle: "singapore-total-esim",
    carrier: "M1 / Starhub",
    contentType: "usage",
  },
  // —— 印尼 ——
  "id-unlim": {
    html: ID_UNLIM_DETAILED,
    handle: "indonesia-unlimited-esim",
    carrier: "Telkomsel / XL",
    contentType: "detailed",
  },
  "id-unlim-usage": {
    html: ID_USAGE,
    handle: "indonesia-unlimited-esim",
    carrier: "Telkomsel / XL",
    contentType: "usage",
  },
  "id-daily": {
    html: ID_DAILY_DETAILED,
    handle: "indonesia-daily-esim",
    carrier: "Telkomsel / XL",
    contentType: "detailed",
  },
  "id-daily-usage": {
    html: ID_USAGE,
    handle: "indonesia-daily-esim",
    carrier: "Telkomsel / XL",
    contentType: "usage",
  },
  "id-total": {
    html: ID_TOTAL_DETAILED,
    handle: "indonesia-total-esim",
    carrier: "Telkomsel / XL",
    contentType: "detailed",
  },
  "id-total-usage": {
    html: ID_USAGE,
    handle: "indonesia-total-esim",
    carrier: "Telkomsel / XL",
    contentType: "usage",
  },
  // —— 台灣 ——
  "tw-unlim-5": {
    html: TW_UNLIM_5_DETAILED,
    handle: "taiwan-unlimited-esim",
    carrier: "中華電信 5Mbps",
    contentType: "detailed",
  },
  "tw-unlim-5-usage": {
    html: TW_USAGE_CHT,
    handle: "taiwan-unlimited-esim",
    carrier: "中華電信 5Mbps",
    contentType: "usage",
  },
  "tw-unlim-10": {
    html: TW_UNLIM_10_DETAILED,
    handle: "taiwan-unlimited-esim",
    carrier: "中華電信 10Mbps",
    contentType: "detailed",
  },
  "tw-unlim-10-usage": {
    html: TW_USAGE_CHT,
    handle: "taiwan-unlimited-esim",
    carrier: "中華電信 10Mbps",
    contentType: "usage",
  },
  "tw-daily-twm": {
    html: TW_DAILY_TWM_DETAILED,
    handle: "taiwan-daily-esim",
    carrier: "台灣大哥大",
    contentType: "detailed",
  },
  "tw-daily-twm-usage": {
    html: TW_USAGE_TWM,
    handle: "taiwan-daily-esim",
    carrier: "台灣大哥大",
    contentType: "usage",
  },
  "tw-daily-twm5": {
    html: TW_DAILY_TWM5_DETAILED,
    handle: "taiwan-daily-esim",
    carrier: "台灣大哥大 5Mbps續航",
    contentType: "detailed",
  },
  "tw-daily-twm5-usage": {
    html: TW_USAGE_TWM,
    handle: "taiwan-daily-esim",
    carrier: "台灣大哥大 5Mbps續航",
    contentType: "usage",
  },
  "tw-total-cht": {
    html: TW_TOTAL_CHT_DETAILED,
    handle: "taiwan-total-esim",
    carrier: "中華電信",
    contentType: "detailed",
  },
  "tw-total-cht-usage": {
    html: TW_USAGE_CHT,
    handle: "taiwan-total-esim",
    carrier: "中華電信",
    contentType: "usage",
  },
  "tw-total-dual": {
    html: TW_TOTAL_DUAL_DETAILED,
    handle: "taiwan-total-esim",
    carrier: "台灣大哥大 / 中華電信",
    contentType: "detailed",
  },
  "tw-total-dual-usage": {
    html: TW_USAGE_DUAL,
    handle: "taiwan-total-esim",
    carrier: "台灣大哥大 / 中華電信",
    contentType: "usage",
  },
  // —— 中港澳 ——
  "cnhkmo-unlim-short": {
    html: CNHKMO_UNLIM_SHORT_DETAILED,
    handle: "cnhkmo-unlimited-esim",
    carrier: "短天數｜中國電信／CSL／澳門電信",
    contentType: "detailed",
  },
  "cnhkmo-unlim-short-usage": {
    html: CNHKMO_USAGE_SHORT,
    handle: "cnhkmo-unlimited-esim",
    carrier: "短天數｜中國電信／CSL／澳門電信",
    contentType: "usage",
  },
  "cnhkmo-unlim-long": {
    html: CNHKMO_UNLIM_LONG_DETAILED,
    handle: "cnhkmo-unlimited-esim",
    carrier: "長天數｜中國電信／聯通／CSL／澳門電訊",
    contentType: "detailed",
  },
  "cnhkmo-unlim-long-usage": {
    html: CNHKMO_USAGE_LONG,
    handle: "cnhkmo-unlimited-esim",
    carrier: "長天數｜中國電信／聯通／CSL／澳門電訊",
    contentType: "usage",
  },
  "cnhkmo-daily": {
    html: CNHKMO_DAILY_DETAILED,
    handle: "cnhkmo-daily-esim",
    carrier: "中國電信／聯通／CSL／澳門電訊",
    contentType: "detailed",
  },
  "cnhkmo-daily-usage": {
    html: CNHKMO_USAGE_TC,
    handle: "cnhkmo-daily-esim",
    carrier: "中國電信／聯通／CSL／澳門電訊",
    contentType: "usage",
  },
  "cnhkmo-total": {
    html: CNHKMO_TOTAL_DETAILED,
    handle: "cnhkmo-total-esim",
    carrier: "中國電信／聯通／CSL／澳門電訊",
    contentType: "detailed",
  },
  "cnhkmo-total-usage": {
    html: CNHKMO_USAGE_TC,
    handle: "cnhkmo-total-esim",
    carrier: "中國電信／聯通／CSL／澳門電訊",
    contentType: "usage",
  },
  "cnhkmo-tc-unlim": {
    html: CNHKMO_TC_UNLIM_DETAILED,
    handle: "cnhkmo-tc-esim",
    carrier: "吃到飽",
    contentType: "detailed",
  },
  "cnhkmo-tc-unlim-usage": {
    html: CNHKMO_TC_USAGE_UNLIM,
    handle: "cnhkmo-tc-esim",
    carrier: "吃到飽",
    contentType: "usage",
  },
  "cnhkmo-tc-daily": {
    html: CNHKMO_TC_DAILY_DETAILED,
    handle: "cnhkmo-tc-esim",
    carrier: "每日型",
    contentType: "detailed",
  },
  "cnhkmo-tc-daily-usage": {
    html: CNHKMO_TC_USAGE_DAILY,
    handle: "cnhkmo-tc-esim",
    carrier: "每日型",
    contentType: "usage",
  },
  "cnhkmo-tc-total": {
    html: CNHKMO_TC_TOTAL_DETAILED,
    handle: "cnhkmo-tc-esim",
    carrier: "總量型",
    contentType: "detailed",
  },
  "cnhkmo-tc-total-usage": {
    html: CNHKMO_TC_USAGE_TOTAL,
    handle: "cnhkmo-tc-esim",
    carrier: "總量型",
    contentType: "usage",
  },
  "tw-ekyc-unlim": {
    html: TW_EKYC_UNLIM_DETAILED,
    handle: "taiwan-ekyc-esim",
    carrier: "吃到飽",
    contentType: "detailed",
  },
  "tw-ekyc-unlim-usage": {
    html: TW_EKYC_USAGE,
    handle: "taiwan-ekyc-esim",
    carrier: "吃到飽",
    contentType: "usage",
  },
  "tw-ekyc-daily": {
    html: TW_EKYC_DAILY_DETAILED,
    handle: "taiwan-ekyc-esim",
    carrier: "每日型",
    contentType: "detailed",
  },
  "tw-ekyc-daily-usage": {
    html: TW_EKYC_USAGE,
    handle: "taiwan-ekyc-esim",
    carrier: "每日型",
    contentType: "usage",
  },
  "tw-ekyc-total": {
    html: TW_EKYC_TOTAL_DETAILED,
    handle: "taiwan-ekyc-esim",
    carrier: "總量型",
    contentType: "detailed",
  },
  "tw-ekyc-total-usage": {
    html: TW_EKYC_USAGE,
    handle: "taiwan-ekyc-esim",
    carrier: "總量型",
    contentType: "usage",
  },
};

const slug = process.argv[2] || "au-kddi";
const entry = CONTENT_MAP[slug];

if (!entry) {
  console.error(
    `未知內容 slug: ${slug}，可用: ${Object.keys(CONTENT_MAP).join(", ")}`,
  );
  process.exit(1);
}

const html = entry.html;
const contentType = entry.contentType || "detailed";
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const SECRET = process.env.PRODUCT_CONTENT_ADMIN_SECRET || "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const PRODUCT_HANDLE = process.env.PRODUCT_HANDLE || entry.handle;
const CARRIER = process.env.CARRIER || entry.carrier;

async function main() {
  if (!SECRET || SECRET.length < 16) {
    console.error("請設定 PRODUCT_CONTENT_ADMIN_SECRET");
    process.exit(1);
  }
  if (!PUBLISHABLE_KEY) {
    console.error("請設定 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");
    process.exit(1);
  }

  const listRes = await fetch(
    `${MEDUSA_URL}/store/products?handle=${encodeURIComponent(PRODUCT_HANDLE)}&fields=id,handle`,
    {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    },
  );
  const listData = await listRes.json();
  const product = listData.products?.[0];
  if (!product?.id) {
    console.error(`找不到商品 handle=${PRODUCT_HANDLE}`);
    process.exit(1);
  }

  const pushRes = await fetch(`${MEDUSA_URL}/store/internal/product-content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Product-Admin-Secret": SECRET,
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      productId: product.id,
      carrier: CARRIER,
      html,
      contentType,
      updatedBy: "push-carrier-detailed-content.mjs",
    }),
  });

  const result = await pushRes.json();
  if (!pushRes.ok) {
    console.error("推送失敗:", result);
    process.exit(1);
  }

  console.log(
    `✅ 已更新 ${PRODUCT_HANDLE} / ${CARRIER} [${contentType}]（${html.length} 字元）`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
