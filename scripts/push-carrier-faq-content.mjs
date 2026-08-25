#!/usr/bin/env node
/**
 * 將 content/product-faq/*.js 內容推送至 Medusa metadata（常見問題）
 *
 * 用法：
 *   node scripts/push-carrier-faq-content.mjs jp-softbank-kddi
 *   node scripts/push-carrier-faq-content.mjs korea-unlimited-sk-native
 *   node scripts/push-carrier-faq-content.mjs korea-unlimited-lg-sk
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
  KOREA_UNLIMITED_SK_NATIVE_FAQ_CONTENT_HTML,
  KOREA_UNLIMITED_LG_SK_FAQ_CONTENT_HTML,
} from "../content/product-faq/korea-unlimited.js";
import {
  KOREA_TOTAL_DUAL_FAQ_CONTENT_HTML,
  KOREA_TOTAL_SKT_FAQ_CONTENT_HTML,
} from "../content/product-faq/korea-total.js";
import {
  KOREA_DAILY_DUAL_FAQ_CONTENT_HTML,
  KOREA_DAILY_SKT_FAQ_CONTENT_HTML,
} from "../content/product-faq/korea-daily.js";
import {
  JP_FAQ_SOFTBANK_KDDI,
  JP_FAQ_SOFTBANK_ONLY,
  JP_FAQ_TRIPLE,
  JP_FAQ_AU_KDDI,
  JP_FAQ_IIJ,
} from "../content/product-detailed/japan-tab-content.js";
import {
  CN_FAQ_CMCC,
  CN_FAQ_CUCC_TIKTOK,
  CN_FAQ_CMCC_70,
} from "../content/product-detailed/china-tab-content.js";
import {
  TH_FAQ_TRUEMOVE,
  TH_FAQ_TRUE_LOCAL,
  TH_FAQ_ROAM,
} from "../content/product-detailed/thailand-tab-content.js";
import {
  HK_FAQ_UNLIMITED,
  HK_FAQ_UNLIMITED_TC,
  HK_FAQ_SMARTONE,
} from "../content/product-detailed/hongkong-tab-content.js";
import {
  MY_FAQ_UMOBILE,
  MY_FAQ_DUAL,
} from "../content/product-detailed/malaysia-tab-content.js";
import {
  USA_FAQ_UNLIM,
  USA_FAQ_USIP,
  USA_FAQ_LONG_VZ,
  USCA_FAQ,
  NA_FAQ_ATT,
  NA_FAQ_USIP,
} from "../content/product-detailed/usa-region-tab-content.js";
import {
  CA_FAQ_UNLIM,
  CA_FAQ_DAILY_ROAM,
  CA_FAQ_DAILY_MULTI,
  CA_FAQ_TOTAL_ROAM,
  CA_FAQ_TOTAL_MULTI,
  CA_FAQ_TOTAL_NATIVE,
} from "../content/product-detailed/canada-tab-content.js";
import {
  VN_FAQ_VINAPHONE_UNLIM,
  VN_FAQ_VIETTEL,
  VN_FAQ_VINAPHONE_DAILY,
  VN_FAQ_VINAPHONE_TOTAL,
  VN_FAQ_WINTEL,
  VN_FAQ_MOBIFONE,
} from "../content/product-detailed/vietnam-tab-content.js";
import {
  FR_FAQ_UNLIM,
  FR_FAQ_DAILY,
  FR_FAQ_TOTAL,
} from "../content/product-detailed/france-tab-content.js";
import {
  ES_FAQ_UNLIM,
  ES_FAQ_DAILY,
  ES_FAQ_TOTAL,
} from "../content/product-detailed/spain-tab-content.js";
import {
  CH_FAQ_34,
  CH_FAQ_41,
  CH_FAQ_DAILY,
  CH_FAQ_TOTAL,
} from "../content/product-detailed/switzerland-tab-content.js";
import {
  NZ_FAQ_UNLIM,
  NZ_FAQ_DAILY,
  NZ_FAQ_TOTAL,
} from "../content/product-detailed/new-zealand-tab-content.js";
import {
  AU_FAQ_UNLIM,
  AU_FAQ_DAILY,
  AU_FAQ_TOTAL,
} from "../content/product-detailed/australia-tab-content.js";
import { ANZ_FAQ } from "../content/product-detailed/anz-tab-content.js";
import {
  UK_FAQ_34,
  UK_FAQ_36,
  UK_FAQ_DAILY,
  UK_FAQ_TOTAL,
} from "../content/product-detailed/uk-tab-content.js";
import {
  IT_FAQ_32,
  IT_FAQ_41,
  IT_FAQ_DAILY,
  IT_FAQ_TOTAL,
} from "../content/product-detailed/italy-tab-content.js";
import {
  AT_FAQ_36,
  AT_FAQ_32,
  AT_FAQ_41,
  AT_FAQ_DAILY_32,
  AT_FAQ_TOTAL,
} from "../content/product-detailed/austria-tab-content.js";
import {
  TR_FAQ_UNLIM,
  TR_FAQ_DAILY,
  TR_FAQ_TOTAL,
} from "../content/product-detailed/turkey-tab-content.js";
import {
  SG_FAQ_SINGTEL,
  SG_FAQ_M1_DAILY,
  SG_FAQ_M1_TOTAL,
} from "../content/product-detailed/singapore-tab-content.js";
import {
  ID_FAQ_UNLIM,
  ID_FAQ_DAILY,
  ID_FAQ_TOTAL,
} from "../content/product-detailed/indonesia-tab-content.js";
import {
  TW_FAQ_UNLIM_5,
  TW_FAQ_UNLIM_10,
  TW_FAQ_DAILY_TWM,
  TW_FAQ_DAILY_TWM5,
  TW_FAQ_TOTAL_CHT,
  TW_FAQ_TOTAL_DUAL,
} from "../content/product-detailed/taiwan-tab-content.js";
import {
  CNHKMO_FAQ_SHORT,
  CNHKMO_FAQ_LONG,
  CNHKMO_FAQ_DAILY,
  CNHKMO_FAQ_TOTAL,
} from "../content/product-detailed/cnhkmo-tab-content.js";
import {
  CNHKMO_TC_FAQ_UNLIM,
  CNHKMO_TC_FAQ_DAILY,
  CNHKMO_TC_FAQ_TOTAL,
} from "../content/product-detailed/cnhkmo-tc-tab-content.js";
import {
  TW_EKYC_FAQ_UNLIM,
  TW_EKYC_FAQ_DAILY,
  TW_EKYC_FAQ_TOTAL,
} from "../content/product-detailed/taiwan-ekyc-tab-content.js";

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
  "th-unlimited-truemove": {
    html: TH_FAQ_TRUEMOVE,
    handle: "thailand-unlimited-esim",
    carrier: "Truemove H 當地號碼",
  },
  "th-unlimited-true": {
    html: TH_FAQ_TRUE_LOCAL,
    handle: "thailand-unlimited-esim",
    carrier: "True 電信",
  },
  "th-unlimited-dtac-rf": {
    html: TH_FAQ_ROAM,
    handle: "thailand-unlimited-esim",
    carrier: "DTAC / REAL FUTURE",
  },
  "th-total-true": {
    html: TH_FAQ_TRUE_LOCAL,
    handle: "thailand-total-esim",
    carrier: "TRUE",
  },
  "th-total-ais": {
    html: TH_FAQ_ROAM,
    handle: "thailand-total-esim",
    carrier: "AIS",
  },
  "th-total-dtac-rf": {
    html: TH_FAQ_ROAM,
    handle: "thailand-total-esim",
    carrier: "DTAC / REAL FUTURE",
  },
  "th-daily-ais": {
    html: TH_FAQ_ROAM,
    handle: "thailand-daily-esim",
    carrier: "AIS",
  },
  "th-daily-dtac-rf": {
    html: TH_FAQ_ROAM,
    handle: "thailand-daily-esim",
    carrier: "DTAC / REAL FUTURE",
  },
  "th-daily-dtac": {
    html: TH_FAQ_TRUE_LOCAL,
    handle: "thailand-daily-esim",
    carrier: "DTAC",
  },
  "hk-unlimited": {
    html: HK_FAQ_UNLIMITED,
    handle: "hongkong-unlimited-esim",
    carrier: "CSL / China Telecom HK",
  },
  "hk-unlimited-tc": {
    html: HK_FAQ_UNLIMITED_TC,
    handle: "hongkong-unlimited-esim",
    carrier: "CUCC / China Telecom + CSL + CTM",
  },
  "hk-daily": {
    html: HK_FAQ_SMARTONE,
    handle: "hongkong-daily-esim",
    carrier: "3HK",
  },
  "hk-total": {
    html: HK_FAQ_SMARTONE,
    handle: "hongkong-total-esim",
    carrier: "3HK",
  },
  "my-unlimited-umobile": {
    html: MY_FAQ_UMOBILE,
    handle: "malaysia-unlimited-esim",
    carrier: "UMobile 5G 當地",
  },
  "my-unlimited-dual": {
    html: MY_FAQ_DUAL,
    handle: "malaysia-unlimited-esim",
    carrier: "Maxis / Celcom / Digi",
  },
  "my-daily-umobile": {
    html: MY_FAQ_UMOBILE,
    handle: "malaysia-daily-esim",
    carrier: "UMobile 5G 當地",
  },
  "my-daily-dual": {
    html: MY_FAQ_DUAL,
    handle: "malaysia-daily-esim",
    carrier: "Maxis / Celcom / Digi",
  },
  "my-total-umobile": {
    html: MY_FAQ_UMOBILE,
    handle: "malaysia-total-esim",
    carrier: "UMobile 5G 當地",
  },
  "my-total-dual": {
    html: MY_FAQ_DUAL,
    handle: "malaysia-total-esim",
    carrier: "Maxis / Celcom / Digi",
  },
  "usa-unlim": {
    html: USA_FAQ_UNLIM,
    handle: "usa-mainland-unlimited-esim",
    carrier: "Verizon / T-Mobile",
  },
  "usa-daily-usip": {
    html: USA_FAQ_USIP,
    handle: "usa-mainland-daily-usip-esim",
    carrier: "Verizon USA / AT&T USA",
  },
  "usa-total-usip": {
    html: USA_FAQ_USIP,
    handle: "usa-mainland-total-usip-esim",
    carrier: "Verizon USA / AT&T USA",
  },
  "usa-total-long-usatt": {
    html: USA_FAQ_USIP,
    handle: "usa-mainland-total-usip-esim",
    carrier: "長天數 Verizon USA / AT&T USA",
  },
  "usa-total-long-vz": {
    html: USA_FAQ_LONG_VZ,
    handle: "usa-mainland-total-usip-esim",
    carrier: "長天數 Verizon",
  },
  "usca-unlim-a0": {
    html: USCA_FAQ,
    handle: "us-canada-unlimited-esim",
    carrier: "US,CA 多網 A0",
  },
  "usca-unlim-vz-bell": {
    html: USCA_FAQ,
    handle: "us-canada-unlimited-esim",
    carrier: "Verizon + Bell / Telus",
  },
  "usca-unlim-tm": {
    html: USCA_FAQ,
    handle: "us-canada-unlimited-esim",
    carrier: "T-Mobile / Verizon / AT&T + 加拿大",
  },
  "usca-daily-vz-bell": {
    html: USCA_FAQ,
    handle: "us-canada-daily-esim",
    carrier: "Verizon + Bell / Telus",
  },
  "usca-daily-tm": {
    html: USCA_FAQ,
    handle: "us-canada-daily-esim",
    carrier: "T-Mobile / Verizon / AT&T + 加拿大",
  },
  "usca-daily-multi": {
    html: USCA_FAQ,
    handle: "us-canada-daily-esim",
    carrier: "Verizon / AT&T / T-Mobile + 加拿大多網",
  },
  "usca-total-a0": {
    html: USCA_FAQ,
    handle: "us-canada-total-esim",
    carrier: "Bell/Telus + Verizon（A0）",
  },
  "usca-total-b": {
    html: USCA_FAQ,
    handle: "us-canada-total-esim",
    carrier: "US&Canada Total B（T-Mobile/AT&T/Verizon + 加拿大多網）",
  },
  "na-att": {
    html: NA_FAQ_ATT,
    handle: "north-america-att-unlimited-esim",
    carrier: "AT&T 美國號碼",
  },
  "na-daily-a0": {
    html: NA_FAQ_USIP,
    handle: "north-america-daily-usip-esim",
    carrier: "Rogers + Movistar + Verizon USA / AT&T USA",
  },
  "na-daily-a1": {
    html: NA_FAQ_USIP,
    handle: "north-america-daily-usip-esim",
    carrier: "Rogers + Movistar + Verizon USA / AT&T USA（A1）",
  },
  "na-total": {
    html: NA_FAQ_USIP,
    handle: "north-america-total-usip-esim",
    carrier: "Rogers + Movistar + Verizon USA / AT&T USA",
  },
  "ca-unlim": {
    html: CA_FAQ_UNLIM,
    handle: "canada-unlimited-esim",
    carrier: "WIND / Bell / TELUS +",
  },
  "ca-daily-roam": {
    html: CA_FAQ_DAILY_ROAM,
    handle: "canada-daily-esim",
    carrier: "TELUS / BELL",
  },
  "ca-daily-multi": {
    html: CA_FAQ_DAILY_MULTI,
    handle: "canada-daily-esim",
    carrier: "Rogers / Bell / TELUS +",
  },
  "ca-total-roam": {
    html: CA_FAQ_TOTAL_ROAM,
    handle: "canada-total-esim",
    carrier: "TELUS / BELL",
  },
  "ca-total-multi": {
    html: CA_FAQ_TOTAL_MULTI,
    handle: "canada-total-esim",
    carrier: "Rogers / Bell / TELUS +",
  },
  "ca-total-native": {
    html: CA_FAQ_TOTAL_NATIVE,
    handle: "canada-total-esim",
    carrier: "TELUS 原生",
  },
  "vn-unlim-vinaphone": {
    html: VN_FAQ_VINAPHONE_UNLIM,
    handle: "vietnam-vinaphone-esim",
    carrier: "Vinaphone",
  },
  "vn-daily-viettel": {
    html: VN_FAQ_VIETTEL,
    handle: "vietnam-daily-local-esim",
    carrier: "Viettel",
  },
  "vn-daily-vinaphone": {
    html: VN_FAQ_VINAPHONE_DAILY,
    handle: "vietnam-daily-local-esim",
    carrier: "Vinaphone",
  },
  "vn-total-vinaphone": {
    html: VN_FAQ_VINAPHONE_TOTAL,
    handle: "vietnam-total-local-esim",
    carrier: "Vinaphone",
  },
  "vn-total-wintel": {
    html: VN_FAQ_WINTEL,
    handle: "vietnam-total-local-esim",
    carrier: "Wintel",
  },
  "vn-total-mobifone": {
    html: VN_FAQ_MOBIFONE,
    handle: "vietnam-total-local-esim",
    carrier: "Mobifone 當地號碼",
  },
  "china-daily-cmcc": {
    html: CN_FAQ_CMCC,
    handle: "china-daily-esim",
    carrier: "中國移動",
  },
  "china-daily-cucc-tiktok": {
    html: CN_FAQ_CUCC_TIKTOK,
    handle: "china-daily-esim",
    carrier: "中國聯通 GPT + TikTok (CUCC)",
  },
  "china-unlimited-cmcc-70": {
    html: CN_FAQ_CMCC_70,
    handle: "china-unlimited-esim",
    carrier: "CMCC 70Mbps",
  },
  "china-unlimited-cucc": {
    html: CN_FAQ_CUCC_TIKTOK,
    handle: "china-unlimited-esim",
    carrier: "CUCC+",
  },
  "china-unlimited-cmcc": {
    html: CN_FAQ_CMCC_70,
    handle: "china-unlimited-esim",
    carrier: "CMCC+",
  },
  "china-total-cmcc": {
    html: CN_FAQ_CMCC,
    handle: "china-total-esim",
    carrier: "CMCC+",
  },
  "china-total-cucc": {
    html: CN_FAQ_CUCC_TIKTOK,
    handle: "china-total-esim",
    carrier: "CUCC+",
  },
  "jp-softbank-kddi": {
    html: JP_FAQ_SOFTBANK_KDDI,
    handle: "daily-jp",
    carrier: "SoftBank / KDDI",
  },
  "jp-daily-softbank-kddi": {
    html: JP_FAQ_SOFTBANK_KDDI,
    handle: "daily-jp",
    carrier: "SoftBank / KDDI",
  },
  "jp-daily-softbank-only": {
    html: JP_FAQ_SOFTBANK_ONLY,
    handle: "daily-jp",
    carrier: "SoftBank（注意：Android 通常需手動 APN）",
  },
  "jp-daily-triple": {
    html: JP_FAQ_TRIPLE,
    handle: "daily-jp",
    carrier: "KDDI / SoftBank / Docomo +",
  },
  "jp-daily-iij": {
    html: JP_FAQ_IIJ,
    handle: "daily-jp",
    carrier: "IIJ Docomo（注意：需手動設定 APN）",
  },
  "jp-unlimited-softbank-kddi": {
    html: JP_FAQ_SOFTBANK_KDDI,
    handle: "japan-unlimited-esim",
    carrier: "SoftBank / KDDI",
  },
  "jp-unlimited-softbank-kddi-10mbps": {
    html: JP_FAQ_SOFTBANK_KDDI,
    handle: "japan-unlimited-esim",
    carrier: "SoftBank / KDDI 10Mbps",
  },
  "jp-unlimited-au-10mbps": {
    html: JP_FAQ_AU_KDDI,
    handle: "japan-unlimited-esim",
    carrier: "AU(KDDI) 10Mbps",
  },
  "jp-unlimited-iij": {
    html: JP_FAQ_IIJ,
    handle: "japan-unlimited-esim",
    carrier: "IIJ Docomo",
  },
  "jp-nolimit-au": {
    html: JP_FAQ_AU_KDDI,
    handle: "japan-unlimited-esim-nolimit",
    carrier: "AU(KDDI) 真。吃到飽不降速",
  },
  "jp-total-kddi-softbank": {
    html: JP_FAQ_SOFTBANK_KDDI,
    handle: "japan-total-esim",
    carrier: "KDDI / SoftBank",
  },
  "jp-total-au": {
    html: JP_FAQ_AU_KDDI,
    handle: "japan-total-esim",
    carrier: "AU(KDDI)",
  },
  "jp-total-iij": {
    html: JP_FAQ_IIJ,
    handle: "japan-total-esim",
    carrier: "IIJ(DOCOMO)",
  },
  "korea-unlimited-sk-native": {
    html: KOREA_UNLIMITED_SK_NATIVE_FAQ_CONTENT_HTML,
    handle: "korea-unlimited-esim",
    carrier: "SK電信（韓國IP）",
  },
  "korea-unlimited-lg-sk": {
    html: KOREA_UNLIMITED_LG_SK_FAQ_CONTENT_HTML,
    handle: "korea-unlimited-esim",
    carrier: "LG U+ / SK電信",
  },
  "korea-total-dual": {
    html: KOREA_TOTAL_DUAL_FAQ_CONTENT_HTML,
    handle: "korea-total-esim",
    carrier: "LG U+ / SK電信 5G 雙切換",
  },
  "korea-total-skt": {
    html: KOREA_TOTAL_SKT_FAQ_CONTENT_HTML,
    handle: "korea-total-esim",
    carrier: "SK電信 5G",
  },
  "korea-daily-dual": {
    html: KOREA_DAILY_DUAL_FAQ_CONTENT_HTML,
    handle: "korea-daily-esim",
    carrier: "LG U+ / SK電信 5G 雙切換",
  },
  "korea-daily-skt": {
    html: KOREA_DAILY_SKT_FAQ_CONTENT_HTML,
    handle: "korea-daily-esim",
    carrier: "SK電信 5G",
  },
  "fr-unlim": {
    html: FR_FAQ_UNLIM,
    handle: "france-unlimited-esim",
    carrier: "ORANGE +",
  },
  "fr-daily": {
    html: FR_FAQ_DAILY,
    handle: "france-daily-esim",
    carrier: "ORANGE +",
  },
  "fr-total": {
    html: FR_FAQ_TOTAL,
    handle: "france-total-esim",
    carrier: "ORANGE +",
  },
  "es-unlim": {
    html: ES_FAQ_UNLIM,
    handle: "spain-unlimited-esim",
    carrier: "Movistar +",
  },
  "es-daily": {
    html: ES_FAQ_DAILY,
    handle: "spain-daily-esim",
    carrier: "Orange +",
  },
  "es-total": {
    html: ES_FAQ_TOTAL,
    handle: "spain-total-esim",
    carrier: "Orange / Movistar +",
  },
  "ch-unlim-34": {
    html: CH_FAQ_34,
    handle: "switzerland-unlimited-esim",
    carrier: "Swisscom / Sunrise +",
  },
  "ch-unlim-41": {
    html: CH_FAQ_41,
    handle: "switzerland-unlimited-esim",
    carrier: "Sunrise / Salt +",
  },
  "ch-daily": {
    html: CH_FAQ_DAILY,
    handle: "switzerland-daily-esim",
    carrier: "Swisscom / Sunrise +",
  },
  "ch-total": {
    html: CH_FAQ_TOTAL,
    handle: "switzerland-total-esim",
    carrier: "Swisscom / Sunrise +",
  },
  "nz-unlim": {
    html: NZ_FAQ_UNLIM,
    handle: "new-zealand-unlimited-esim",
    carrier: "VODAFONE +",
  },
  "nz-daily": {
    html: NZ_FAQ_DAILY,
    handle: "new-zealand-daily-esim",
    carrier: "VODAFONE +",
  },
  "nz-total": {
    html: NZ_FAQ_TOTAL,
    handle: "new-zealand-total-esim",
    carrier: "VODAFONE +",
  },
  "au-unlim": {
    html: AU_FAQ_UNLIM,
    handle: "australia-unlimited-esim",
    carrier: "OPTUS",
  },
  "au-daily": {
    html: AU_FAQ_DAILY,
    handle: "australia-daily-esim",
    carrier: "OPTUS",
  },
  "au-total": {
    html: AU_FAQ_TOTAL,
    handle: "australia-total-esim",
    carrier: "OPTUS",
  },
  "anz-unlim": {
    html: ANZ_FAQ,
    handle: "anz-unlimited-esim",
    carrier: "VODAFONE + NZ V",
  },
  "uk-unlim-34": {
    html: UK_FAQ_34,
    handle: "uk-unlimited-esim",
    carrier: "EE / Three +",
  },
  "uk-unlim-36": {
    html: UK_FAQ_36,
    handle: "uk-unlimited-esim",
    carrier: "EE +",
  },
  "uk-unlim-10mbps": {
    html: UK_FAQ_36,
    handle: "uk-unlimited-10mbps-esim",
    carrier: "EE +",
  },
  "uk-daily": {
    html: UK_FAQ_DAILY,
    handle: "uk-daily-esim",
    carrier: "EE / Three +",
  },
  "uk-total": {
    html: UK_FAQ_TOTAL,
    handle: "uk-total-esim",
    carrier: "EE / Three +",
  },
  "it-unlim-32": {
    html: IT_FAQ_32,
    handle: "italy-unlimited-esim",
    carrier: "Iliad / TIM +",
  },
  "it-unlim-41": {
    html: IT_FAQ_41,
    handle: "italy-unlimited-esim",
    carrier: "Iliad / WindTre +",
  },
  "it-daily": {
    html: IT_FAQ_DAILY,
    handle: "italy-daily-esim",
    carrier: "Iliad / TIM +",
  },
  "it-total": {
    html: IT_FAQ_TOTAL,
    handle: "italy-total-esim",
    carrier: "Iliad / TIM +",
  },
  "at-unlim-36": {
    html: AT_FAQ_36,
    handle: "austria-unlimited-esim",
    carrier: "Drei / A1 +",
  },
  "at-unlim-32": {
    html: AT_FAQ_32,
    handle: "austria-unlimited-esim",
    carrier: "A1 / Three +",
  },
  "at-daily-41": {
    html: AT_FAQ_41,
    handle: "austria-daily-esim",
    carrier: "A1 / H3G +",
  },
  "at-daily-32": {
    html: AT_FAQ_DAILY_32,
    handle: "austria-daily-esim",
    carrier: "A1 / Three +",
  },
  "at-total": {
    html: AT_FAQ_TOTAL,
    handle: "austria-total-esim",
    carrier: "A1 / Three +",
  },
  "tr-unlim": {
    html: TR_FAQ_UNLIM,
    handle: "turkey-unlimited-esim",
    carrier: "AVEA TURKEY / VODAFONE TURKEY +",
  },
  "tr-daily": {
    html: TR_FAQ_DAILY,
    handle: "turkey-daily-esim",
    carrier: "AVEA TURKEY / VODAFONE TURKEY +",
  },
  "tr-total": {
    html: TR_FAQ_TOTAL,
    handle: "turkey-total-esim",
    carrier: "AVEA TURKEY / VODAFONE TURKEY +",
  },
  "sg-unlim": {
    html: SG_FAQ_SINGTEL,
    handle: "singapore-unlimited-esim",
    carrier: "Singtel",
  },
  "sg-daily": {
    html: SG_FAQ_M1_DAILY,
    handle: "singapore-daily-esim",
    carrier: "M1 / Starhub",
  },
  "sg-total": {
    html: SG_FAQ_M1_TOTAL,
    handle: "singapore-total-esim",
    carrier: "M1 / Starhub",
  },
  "id-unlim": {
    html: ID_FAQ_UNLIM,
    handle: "indonesia-unlimited-esim",
    carrier: "Telkomsel / XL",
  },
  "id-daily": {
    html: ID_FAQ_DAILY,
    handle: "indonesia-daily-esim",
    carrier: "Telkomsel / XL",
  },
  "id-total": {
    html: ID_FAQ_TOTAL,
    handle: "indonesia-total-esim",
    carrier: "Telkomsel / XL",
  },
  "tw-unlim-5": {
    html: TW_FAQ_UNLIM_5,
    handle: "taiwan-unlimited-esim",
    carrier: "中華電信 5Mbps",
  },
  "tw-unlim-10": {
    html: TW_FAQ_UNLIM_10,
    handle: "taiwan-unlimited-esim",
    carrier: "中華電信 10Mbps",
  },
  "tw-daily-twm": {
    html: TW_FAQ_DAILY_TWM,
    handle: "taiwan-daily-esim",
    carrier: "台灣大哥大",
  },
  "tw-daily-twm5": {
    html: TW_FAQ_DAILY_TWM5,
    handle: "taiwan-daily-esim",
    carrier: "台灣大哥大 5Mbps續航",
  },
  "tw-total-cht": {
    html: TW_FAQ_TOTAL_CHT,
    handle: "taiwan-total-esim",
    carrier: "中華電信",
  },
  "tw-total-dual": {
    html: TW_FAQ_TOTAL_DUAL,
    handle: "taiwan-total-esim",
    carrier: "台灣大哥大 / 中華電信",
  },
  "cnhkmo-unlim-short": {
    html: CNHKMO_FAQ_SHORT,
    handle: "cnhkmo-unlimited-esim",
    carrier: "短天數｜中國電信／CSL／澳門電信",
  },
  "cnhkmo-unlim-long": {
    html: CNHKMO_FAQ_LONG,
    handle: "cnhkmo-unlimited-esim",
    carrier: "長天數｜中國電信／聯通／CSL／澳門電訊",
  },
  "cnhkmo-daily": {
    html: CNHKMO_FAQ_DAILY,
    handle: "cnhkmo-daily-esim",
    carrier: "中國電信／聯通／CSL／澳門電訊",
  },
  "cnhkmo-total": {
    html: CNHKMO_FAQ_TOTAL,
    handle: "cnhkmo-total-esim",
    carrier: "中國電信／聯通／CSL／澳門電訊",
  },
  "cnhkmo-tc-unlim": {
    html: CNHKMO_TC_FAQ_UNLIM,
    handle: "cnhkmo-tc-esim",
    carrier: "吃到飽",
  },
  "cnhkmo-tc-daily": {
    html: CNHKMO_TC_FAQ_DAILY,
    handle: "cnhkmo-tc-esim",
    carrier: "每日型",
  },
  "cnhkmo-tc-total": {
    html: CNHKMO_TC_FAQ_TOTAL,
    handle: "cnhkmo-tc-esim",
    carrier: "總量型",
  },
  "tw-ekyc-unlim": {
    html: TW_EKYC_FAQ_UNLIM,
    handle: "taiwan-ekyc-esim",
    carrier: "吃到飽",
  },
  "tw-ekyc-daily": {
    html: TW_EKYC_FAQ_DAILY,
    handle: "taiwan-ekyc-esim",
    carrier: "每日型",
  },
  "tw-ekyc-total": {
    html: TW_EKYC_FAQ_TOTAL,
    handle: "taiwan-ekyc-esim",
    carrier: "總量型",
  },
};

const slug = process.argv[2] || "jp-softbank-kddi";
const entry = CONTENT_MAP[slug];

if (!entry) {
  console.error(
    `未知內容 slug: ${slug}，可用: ${Object.keys(CONTENT_MAP).join(", ")}`,
  );
  process.exit(1);
}

const html = entry.html;
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
      contentType: "faq",
      updatedBy: "push-carrier-faq-content.mjs",
    }),
  });

  const result = await pushRes.json();
  if (!pushRes.ok) {
    console.error("推送失敗:", result);
    process.exit(1);
  }

  console.log(
    `✅ 已更新 ${PRODUCT_HANDLE} / ${CARRIER} 常見問題（${html.length} 字元）`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
