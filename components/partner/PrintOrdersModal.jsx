import { useMemo, useState } from "react";
import MaterialIcon from "@/components/MaterialIcon";
import { SHOPIFY_UI } from "@/lib/shopifyUi";
import { fmt } from "@/components/partner/DobermanWidgets";
import PartnerButton from "@/components/partner/ui/PartnerButton";
import {
  paymentMethodLabel,
  buyerDisplayName,
  buyerEmail,
  formatOrderCode,
  formatOrderFullId,
} from "@/lib/orderDisplay";
import {
  sumTotals,
  productBreakdown,
  primaryItemName,
} from "@/lib/partnerAnalytics";

const STATUS_LABEL = {
  completed: "已完成",
  pending: "尚未付款",
  cancelled: "已取消",
  failed: "付款失敗",
  refunded: "已退款",
  refund_pending: "退款審核中",
};

function formatDate(d) {
  return new Date(d).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function toCsvValue(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * hideCost：優惠連結夥伴適用。這類夥伴不進貨、售價與官網相同，底價成本屬平台
 * 商業機密，報表一律不揭露（夥伴商店夥伴才看得到自己的進貨底價）。
 */
export function downloadOrdersCsv(orders, filename, { hideCost = false } = {}) {
  const header = [
    "訂單編號",
    "日期",
    "買家",
    "Email",
    "商品",
    "付款方式",
    "訂單金額",
    ...(hideCost ? [] : ["底價成本"]),
    "分潤",
    "狀態",
  ];
  const body = (orders || []).map((o) => [
    formatOrderFullId(o),
    formatDate(o.created_at),
    buyerDisplayName(o),
    buyerEmail(o) || "",
    primaryItemName(o),
    paymentMethodLabel(o) || "",
    Math.round(Number(o.total_amount) || 0),
    ...(hideCost ? [] : [Math.round(Number(o.b2b_cost) || 0)]),
    Math.round(Number(o.partner_profit) || 0),
    STATUS_LABEL[o.status] || o.status || "",
  ]);
  const csv = [header, ...body].map((r) => r.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename || `訂單分潤_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 圖一：訂單分潤明細 — 完整欄位、固定欄寬、避免文字擠壓換行 */
function PrintableOrderDetail({ orders, partnerName, generatedAt, hideCost }) {
  const totals = sumTotals(orders);
  return (
    <div className="print-doc p-6 sm:p-8 text-[#1a1a1a] bg-white">
      <div className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-[#e3e3e3]">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            訂單分潤明細
          </h1>
          <p className="text-xs text-[#6b6b6b] mt-1.5 truncate">
            {partnerName || "—"}
          </p>
        </div>
        <div className="text-right text-xs text-[#6b6b6b] shrink-0 leading-relaxed">
          <p>列印日期 {generatedAt}</p>
          <p className="mt-0.5">共 {orders.length} 筆訂單</p>
        </div>
      </div>

      <table className="w-full text-[11px] border-collapse table-fixed">
        <colgroup>
          <col style={{ width: "9%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: hideCost ? "20%" : "10%" }} />
          {hideCost ? null : <col style={{ width: "10%" }} />}
          <col style={{ width: "7%" }} />
        </colgroup>
        <thead>
          <tr className="border-b-2 border-[#1a1a1a]">
            <th className="text-left py-2.5 pr-2 font-bold">訂單編號</th>
            <th className="text-left py-2.5 pr-2 font-bold">日期</th>
            <th className="text-left py-2.5 pr-2 font-bold">買家</th>
            <th className="text-left py-2.5 pr-2 font-bold">商品</th>
            <th className="text-left py-2.5 pr-2 font-bold">付款方式</th>
            <th className="text-right py-2.5 px-1 font-bold">訂單金額</th>
            {hideCost ? null : (
              <th className="text-right py-2.5 px-1 font-bold">底價成本</th>
            )}
            <th className="text-right py-2.5 px-1 font-bold">分潤</th>
            <th className="text-left py-2.5 pl-2 font-bold">狀態</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-[#eceef0] align-top">
              <td className="py-2.5 pr-2 font-mono font-bold whitespace-nowrap">
                {formatOrderCode(o)}
              </td>
              <td className="py-2.5 pr-2 whitespace-nowrap text-[#303030]">
                {formatDate(o.created_at)}
              </td>
              <td className="py-2.5 pr-2">
                <p className="font-semibold text-[#1a1a1a] leading-snug break-words">
                  {buyerDisplayName(o)}
                </p>
                {buyerEmail(o) ? (
                  <p className="text-[10px] text-[#8a8a8a] mt-0.5 break-all">
                    {buyerEmail(o)}
                  </p>
                ) : null}
              </td>
              <td className="py-2.5 pr-2 text-[#303030] leading-snug break-words">
                {primaryItemName(o)}
              </td>
              <td className="py-2.5 pr-2 text-[#303030] leading-snug">
                {paymentMethodLabel(o) || "—"}
              </td>
              <td className="py-2.5 px-1 text-right tabular-nums whitespace-nowrap">
                {fmt(o.total_amount)}
              </td>
              {hideCost ? null : (
                <td className="py-2.5 px-1 text-right tabular-nums whitespace-nowrap text-[#6b6b6b]">
                  {fmt(o.b2b_cost)}
                </td>
              )}
              <td className="py-2.5 px-1 text-right font-bold tabular-nums whitespace-nowrap">
                {fmt(o.partner_profit)}
              </td>
              <td className="py-2.5 pl-2 whitespace-nowrap">
                {STATUS_LABEL[o.status] || o.status}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[#1a1a1a] font-bold">
            <td className="py-3 pr-2" colSpan={5}>
              合計（{orders.length} 筆）
            </td>
            <td className="py-3 px-1 text-right tabular-nums whitespace-nowrap">
              {fmt(totals.revenue)}
            </td>
            {hideCost ? null : (
              <td className="py-3 px-1 text-right tabular-nums whitespace-nowrap">
                {fmt(totals.cost)}
              </td>
            )}
            <td className="py-3 px-1 text-right tabular-nums whitespace-nowrap">
              {fmt(totals.profit)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** 圖二：分潤總覽摘要 — 完整 KPI + 商品拆分 + 合計列 */
function PrintableSummary({ orders, partnerName, generatedAt, hideCost }) {
  const totals = sumTotals(orders);
  const breakdown = productBreakdown(orders);
  const paid = orders.filter((o) => o.status === "completed").length;
  const unpaid = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="print-doc p-6 sm:p-8 text-[#1a1a1a] bg-white">
      <div className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-[#e3e3e3]">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            分潤總覽摘要
          </h1>
          <p className="text-xs text-[#6b6b6b] mt-1.5 truncate">
            {partnerName || "—"}
          </p>
        </div>
        <div className="text-right text-xs text-[#6b6b6b] shrink-0 leading-relaxed">
          <p>列印日期 {generatedAt}</p>
          <p className="mt-0.5">
            已付款 {paid} · 尚未付款 {unpaid}
          </p>
        </div>
      </div>

      <div
        className={`grid grid-cols-2 gap-2.5 mb-6 ${
          hideCost ? "sm:grid-cols-4" : "sm:grid-cols-5"
        }`}
      >
        {[
          ["訂單數", `${totals.count} 筆`],
          ["營收合計", fmt(totals.revenue)],
          ...(hideCost ? [] : [["底價成本", fmt(totals.cost)]]),
          ["分潤合計", fmt(totals.profit)],
          ["分潤占營收", `${totals.rate}%`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border border-[#e3e3e3] rounded-md px-3 py-3 min-w-0"
          >
            <p className="text-[10px] text-[#6b6b6b] font-bold tracking-wide">
              {label}
            </p>
            <p className="text-base sm:text-lg font-bold mt-1 tabular-nums truncate">
              {value}
            </p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-bold mb-3">依商品分潤</h2>
      {breakdown.length === 0 ? (
        <p className="text-xs text-[#8a8a8a] py-6 text-center">尚無商品資料</p>
      ) : (
        <table className="w-full text-[11px] border-collapse table-fixed">
          <colgroup>
            <col style={{ width: "42%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr className="border-b-2 border-[#1a1a1a]">
              <th className="text-left py-2.5 pr-2 font-bold">商品</th>
              <th className="text-right py-2.5 px-1 font-bold">訂單數</th>
              <th className="text-right py-2.5 px-1 font-bold">營收</th>
              <th className="text-right py-2.5 px-1 font-bold">分潤</th>
              <th className="text-right py-2.5 pl-1 font-bold">占比</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((row) => {
              const share =
                totals.profit > 0
                  ? Math.round((row.profit / totals.profit) * 100)
                  : 0;
              return (
                <tr key={row.name} className="border-b border-[#eceef0] align-top">
                  <td className="py-2.5 pr-2 leading-snug break-words">
                    {row.name}
                  </td>
                  <td className="py-2.5 px-1 text-right tabular-nums whitespace-nowrap">
                    {row.count}
                  </td>
                  <td className="py-2.5 px-1 text-right tabular-nums whitespace-nowrap">
                    {fmt(row.revenue)}
                  </td>
                  <td className="py-2.5 px-1 text-right font-bold tabular-nums whitespace-nowrap">
                    {fmt(row.profit)}
                  </td>
                  <td className="py-2.5 pl-1 text-right tabular-nums whitespace-nowrap text-[#6b6b6b]">
                    {share}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#1a1a1a] font-bold">
              <td className="py-3 pr-2">合計</td>
              <td className="py-3 px-1 text-right tabular-nums">
                {totals.count}
              </td>
              <td className="py-3 px-1 text-right tabular-nums">
                {fmt(totals.revenue)}
              </td>
              <td className="py-3 px-1 text-right tabular-nums">
                {fmt(totals.profit)}
              </td>
              <td className="py-3 pl-1 text-right tabular-nums">100%</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

const DOC_OPTIONS = [
  { id: "detail", label: "訂單明細表" },
  { id: "summary", label: "分潤總覽摘要" },
];

/**
 * 比照 Shopify「Order Printer」的列印彈窗：
 * 左側預覽文件，右側勾選文件，底部可匯出 CSV／開始列印。
 */
export default function PrintOrdersModal({
  open,
  onClose,
  orders = [],
  partnerName,
  hideCost = false,
}) {
  const [docs, setDocs] = useState({ detail: true, summary: true });
  const generatedAt = useMemo(
    () =>
      new Date().toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [],
  );

  if (!open) return null;

  const toggleDoc = (id) =>
    setDocs((prev) => ({ ...prev, [id]: !prev[id] }));

  const anySelected = docs.detail || docs.summary;

  const handlePrint = () => {
    window.print();
  };

  const handleCsv = () => {
    downloadOrdersCsv(
      orders,
      `訂單分潤_${new Date().toISOString().slice(0, 10)}.csv`,
      { hideCost },
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4 print:hidden">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden
        />
        <div
          className="relative w-full max-w-5xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden"
          style={{ backgroundColor: SHOPIFY_UI.cardBg }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: `1px solid ${SHOPIFY_UI.cardBorder}` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <MaterialIcon
                name="print"
                size={18}
                style={{ color: SHOPIFY_UI.textPrimary }}
              />
              <span
                className="text-sm font-bold truncate"
                style={{ color: SHOPIFY_UI.textPrimary }}
              >
                列印文件
              </span>
              <span
                className="text-xs shrink-0"
                style={{ color: SHOPIFY_UI.textTertiary }}
              >
                · 已選取 {orders.length} 筆訂單
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition shrink-0"
            >
              <MaterialIcon
                name="close"
                size={18}
                style={{ color: SHOPIFY_UI.textSecondary }}
              />
            </button>
          </div>

          <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
            <div
              className="flex-1 overflow-y-auto p-3 sm:p-5 min-w-0"
              style={{ backgroundColor: SHOPIFY_UI.canvasBg }}
            >
              <div className="max-w-4xl mx-auto space-y-4">
                {docs.detail && (
                  <div
                    className="rounded-md shadow-sm overflow-x-auto"
                    style={{
                      backgroundColor: "#fff",
                      border: `1px solid ${SHOPIFY_UI.cardBorder}`,
                    }}
                  >
                    <PrintableOrderDetail
                      orders={orders}
                      partnerName={partnerName}
                      generatedAt={generatedAt}
                      hideCost={hideCost}
                    />
                  </div>
                )}
                {docs.summary && (
                  <div
                    className="rounded-md shadow-sm overflow-x-auto"
                    style={{
                      backgroundColor: "#fff",
                      border: `1px solid ${SHOPIFY_UI.cardBorder}`,
                    }}
                  >
                    <PrintableSummary
                      orders={orders}
                      partnerName={partnerName}
                      generatedAt={generatedAt}
                      hideCost={hideCost}
                    />
                  </div>
                )}
                {!anySelected && (
                  <div
                    className="py-16 text-center text-sm"
                    style={{ color: SHOPIFY_UI.textTertiary }}
                  >
                    請至右側選擇要列印的文件
                  </div>
                )}
              </div>
            </div>

            <div
              className="w-full sm:w-56 shrink-0 p-3 overflow-y-auto"
              style={{
                borderLeft: `1px solid ${SHOPIFY_UI.cardBorder}`,
                borderTop: `1px solid ${SHOPIFY_UI.cardBorder}`,
              }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-wide mb-2"
                style={{ color: SHOPIFY_UI.textTertiary }}
              >
                文件
              </p>
              <div className="space-y-1 mb-4">
                {DOC_OPTIONS.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-black/[0.03] transition"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-black cursor-pointer"
                      checked={docs[doc.id]}
                      onChange={() => toggleDoc(doc.id)}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: SHOPIFY_UI.textPrimary }}
                    >
                      {doc.label}
                    </span>
                  </label>
                ))}
              </div>

              <p
                className="text-[10px] font-bold uppercase tracking-wide mb-2"
                style={{ color: SHOPIFY_UI.textTertiary }}
              >
                匯出
              </p>
              <button
                type="button"
                onClick={handleCsv}
                disabled={!orders.length}
                className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-xs font-bold transition disabled:opacity-40"
                style={{
                  border: `1px solid ${SHOPIFY_UI.secondaryBorder}`,
                  color: SHOPIFY_UI.textPrimary,
                }}
              >
                <MaterialIcon name="download" size={16} />
                匯出 CSV
              </button>
            </div>
          </div>

          <div
            className="flex items-center justify-end gap-2 px-4 py-3 shrink-0"
            style={{ borderTop: `1px solid ${SHOPIFY_UI.cardBorder}` }}
          >
            <PartnerButton type="button" variant="secondary" onClick={onClose}>
              取消
            </PartnerButton>
            <PartnerButton
              type="button"
              onClick={handlePrint}
              disabled={!anySelected}
            >
              開始列印
            </PartnerButton>
          </div>
        </div>
      </div>

      <div id="partner-print-area" className="hidden print:block">
        {docs.detail && (
          <PrintableOrderDetail
            orders={orders}
            partnerName={partnerName}
            generatedAt={generatedAt}
            hideCost={hideCost}
          />
        )}
        {docs.summary && (
          <div className={docs.detail ? "break-before-page" : ""}>
            <PrintableSummary
              orders={orders}
              partnerName={partnerName}
              generatedAt={generatedAt}
              hideCost={hideCost}
            />
          </div>
        )}
      </div>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
          body * {
            visibility: hidden;
          }
          #partner-print-area,
          #partner-print-area * {
            visibility: visible;
          }
          #partner-print-area {
            position: absolute;
            inset: 0;
            width: 100%;
          }
          .break-before-page {
            break-before: page;
          }
          .print-doc {
            padding: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
