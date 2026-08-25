/**
 * 韓國 eSIM 線路比較表（各產品／電信商產品介紹共用）
 * 樣式與日本比較表一致：黑點列表、無 emoji
 */
import { dataTable } from "../../lib/productContentHtmlTemplate.js";

const link = (href, label) =>
  `<a href="${href}" style="color:#2D5BE3;font-weight:700;text-decoration:underline;">${label}</a>`;

function compareBullets(items) {
  const lis = items
    .map(
      (t) =>
        `<li style="margin:0 0 6px;padding:0;color:#0f172a;">${t}</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:1.15em;list-style-type:disc;list-style-position:outside;color:#0f172a;">${lis}</ul>`;
}

/**
 * 哪款韓國 eSIM 最適合您？
 * 涵蓋：SK 原生韓國 IP、LG／SK 雙網、SKT 5G 單網（每日／總量）
 */
export function koreaCompareTableSection() {
  const table = dataTable(
    ["產品", "運營商", "最適合", "優點與注意事項"],
    [
      [
        `<strong>韓國 eSIM SK電信（韓國 IP）</strong>`,
        "SKT 單一網絡<br>韓國 IP<br>可選吃到飽",
        "在地 App／串流<br>要真高速<br>可能需要韓國門號",
        `${compareBullets([
          "連接 SK Telecom 本地網路，低延遲韓國 IP，適合導航、韓流搶票與在地服務。",
          "吃到飽方案為高速無限（實際速度依環境而定），支援熱點。",
          "僅用數據不需實名；完成 eKYC 後可使用韓國門號語音／簡訊（部分天數除外）。",
          "多數為 4G／LTE；語音功能需抵達韓國連網後才能認證。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/korea/korea-unlimited-esim/", "韓國吃到飽 eSIM")}。</div>`,
      ],
      [
        `<strong>韓國 eSIM LG U+／SK電信 雙網</strong>`,
        "LG U+／SKT<br>雙重網絡<br>5G／4G",
        "多城市旅行<br>要訊號穩定",
        `${compareBullets([
          "LG U+ 與 SKT 雙網切換，覆蓋互補，移動中較不易斷線。",
          "支援 4G／LTE／5G；僅數據方案，支援熱點。",
          "出網多為新加坡 IP（漫遊線路）；多數裝置 APN 可自動帶入。",
          "無傳統語音／簡訊；請使用 LINE、WhatsApp 等 VoIP。",
          "吃到飽／每日／總量皆有雙網選項，依行程挑選流量規則。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/korea/korea-unlimited-esim/", "吃到飽")}、${link("/product/korea/korea-daily-esim/", "每日型")}、${link("/product/korea/korea-total-esim/", "總量型")}。</div>`,
      ],
      [
        `<strong>韓國 eSIM SK電信 5G</strong>`,
        "SKT 單一網絡<br>（漫遊）",
        "預算優先<br>用量可精準預估",
        `${compareBullets([
          "走 SKT 單網 5G／4G，熱門城市覆蓋佳。",
          "出網多為香港 IP；多數裝置 APN 可自動帶入。",
          "僅數據；本方案不支援熱點分享。",
          "每日型：高速用完後約 384 kbps 可持續使用。",
          "總量型：流量用完即斷網，請預留餘量；若需用完續航請改選雙網。",
        ])}<div style="margin-top:8px;">可參考 ${link("/product/korea/korea-daily-esim/", "每日型")}、${link("/product/korea/korea-total-esim/", "總量型")}。</div>`,
      ],
    ],
  );

  return `<h4 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">哪款韓國 eSIM 最適合您？</h4>${table}`;
}
