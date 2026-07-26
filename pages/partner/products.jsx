import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import { usePartnerSession, fetchPartnerStats } from "@/lib/partnerAuth";
import MaterialIcon from "@/components/MaterialIcon";
import { prevMonthRange, thisMonthRange } from "@/components/partner/DobermanWidgets";

const PartnerProductAnalytics = dynamic(
  () => import("@/components/partner/PartnerProductAnalytics"),
  {
    ssr: false,
    loading: () => (
      <div className="py-16 text-center text-slate-400 text-sm animate-pulse">
        載入圖表中...
      </div>
    ),
  },
);

/* ─── helpers ─── */
const fmt = (n) => `NT$${Math.round(Number(n) || 0).toLocaleString()}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("zh-TW", { year:"numeric", month:"2-digit", day:"2-digit" }) : "—";

/* ─── TABS ─── */
const TABS = [
  { id: "analytics", label: "收益分析", icon: "bar_chart" },
  { id: "products", label: "商品列表", icon: "inventory_2" },
  { id: "pricing", label: "定價管理", icon: "price_change" },
  { id: "report", label: "月次報告", icon: "description" },
];

/* ─── STATUS map ─── */
const STATUS = {
  active:    { label:"有効", cls:"bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]" },
  paused:    { label:"停止", cls:"bg-[#fef3c7] text-[#92400e] border border-[#fde68a]" },
  pending:   { label:"未発行", cls:"bg-[#f3f4f6] text-[#6b7280] border border-[#e5e7eb]" },
  inactive:  { label:"連携中", cls:"bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0]" },
};

/* ──────────────────────────────────────────────────────────
   商品一覧 tab  (Image 3 + Image 5)
────────────────────────────────────────────────────────── */
function ProductsTab({ stats, productCount }) {
  const [filterMode, setFilterMode] = useState("all"); // all | active | paused
  const [sortKey, setSortKey]     = useState("profit_desc");
  const [openMenu, setOpenMenu]   = useState(null);
  const [searchQ, setSearchQ]     = useState("");
  const [showConfirm, setShowConfirm] = useState(null);

  const allProducts = useMemo(() => {
    const map = {};
    for (const o of stats?.orders || []) {
      if (o.status !== "completed" && o.status !== "pending") continue;
      const items = (() => {
        try { return Array.isArray(o.item_details) ? o.item_details : JSON.parse(o.item_details || "[]"); }
        catch { return []; }
      })();
      const name = items[0]?.name || "未命名方案";
      if (!map[name]) map[name] = { name, plans:1, minPrice:Number(o.total_amount)||0,
        totalSales:0, totalProfit:0, status:"active" };
      map[name].totalSales  += 1;
      map[name].totalProfit += Number(o.partner_profit) || 0;
      if ((Number(o.total_amount)||0) < map[name].minPrice)
        map[name].minPrice = Number(o.total_amount)||0;
    }
    if (Object.keys(map).length === 0) {
      return [
        { name:"JP 日本 3天 1GB", plans:3, minPrice:199, totalSales:0, totalProfit:0, status:"active" },
        { name:"KR 韓國 5天 2GB", plans:4, minPrice:299, totalSales:0, totalProfit:0, status:"active" },
        { name:"US 美國 10天 5GB",plans:5, minPrice:499, totalSales:0, totalProfit:0, status:"paused" },
      ];
    }
    return Object.values(map);
  }, [stats]);

  const displayed = useMemo(() => {
    let r = allProducts;
    if (filterMode === "active") r = r.filter(p=>p.status==="active");
    if (filterMode === "paused") r = r.filter(p=>p.status==="paused");
    if (searchQ) r = r.filter(p=>p.name.includes(searchQ));
    if (sortKey==="profit_desc") r=[...r].sort((a,b)=>b.totalProfit-a.totalProfit);
    if (sortKey==="sales_desc")  r=[...r].sort((a,b)=>b.totalSales-a.totalSales);
    if (sortKey==="price_asc")   r=[...r].sort((a,b)=>a.minPrice-b.minPrice);
    return r;
  }, [allProducts, filterMode, sortKey, searchQ]);

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">

      {/* ── タイトルバー（Image 5 スタイル） ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h2 className="text-base font-black text-slate-800">商品列表</h2>
        <button type="button" className="inline-flex items-center gap-1.5 bg-[#1a56db] hover:bg-[#1e40af] text-white text-sm font-bold px-4 py-2 rounded-sm transition shadow-sm">
          <MaterialIcon name="add" size={18} /> 新增商品
        </button>
      </div>

      {/* ── フィルター行（Image 5 ラジオ + ソート） ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 font-bold">顯示切換</span>
          {[["all","全部商品"],["active","已上架"],["paused","已停用"]].map(([v,l])=>(
            <label key={v} className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="prod_filter" value={v}
                checked={filterMode===v} onChange={()=>setFilterMode(v)}
                className="accent-[#1a56db] w-3.5 h-3.5" />
              <span className="text-xs text-slate-700">{l}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* 検索 */}
          <div className="relative">
            <MaterialIcon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
              placeholder="搜尋商品名稱..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-sm w-40 focus:border-[#1a56db] outline-none" />
          </div>
          {/* ソート */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MaterialIcon name="swap_vert" size={14} />
            <span>並び替え</span>
            <select value={sortKey} onChange={e=>setSortKey(e.target.value)}
              className="text-xs border border-slate-300 rounded-sm px-2 py-1 focus:outline-none focus:border-[#1a56db]">
              <option value="profit_desc">分潤（高い順）</option>
              <option value="sales_desc">銷量（多い順）</option>
              <option value="price_asc">価格（安い順）</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── テーブル（Image 3 + 5） ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="px-5 py-3 text-left font-bold">商品名</th>
              <th className="px-5 py-3 text-center font-bold">方案数</th>
              <th className="px-5 py-3 text-right font-bold">最低售価</th>
              <th className="px-5 py-3 text-right font-bold">累計銷量</th>
              <th className="px-5 py-3 text-right font-bold">累計分潤</th>
              <th className="px-5 py-3 text-center font-bold">上架<br />狀態</th>
              <th className="px-5 py-3 text-center font-bold">啟用/停用</th>
              <th className="px-5 py-3 text-center font-bold">定價<br />管理</th>
              <th className="px-5 py-3 text-center font-bold">削除</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayed.length === 0 && (
              <tr><td colSpan={9} className="py-14 text-center text-slate-400 text-sm">目前沒有商品資料</td></tr>
            )}
            {displayed.map((p, i) => {
              const st = STATUS[p.status] || STATUS.active;
              const isOpen = openMenu === i;
              return (
                <tr key={p.name} className="hover:bg-slate-50/60 transition group">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">eSIM 方案</p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-slate-700 font-bold">{p.plans}</span>
                  </td>
                  <td className="px-5 py-4 text-right text-slate-700">{fmt(p.minPrice)}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-bold text-slate-800">{p.totalSales.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 ml-0.5">張</span>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-[#1a56db]">
                    {fmt(p.totalProfit)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-sm ${st.cls}`}>
                      {st.label === "有効" ? "已上架" : st.label === "停止" ? "已停用" : "未設定"}
                    </span>
                  </td>
                  {/* 有効/停止 ボタン対（Image 5） */}
                  <td className="px-5 py-4 text-center">
                    <div className="inline-flex rounded-sm overflow-hidden border border-slate-200 text-xs font-bold">
                      <button className={`px-3 py-1 transition ${p.status==="active"
                        ? "bg-[#1a56db] text-white"
                        : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                        啟用
                      </button>
                      <button className={`px-3 py-1 border-l border-slate-200 transition ${p.status==="paused"
                        ? "bg-slate-600 text-white"
                        : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                        停用
                      </button>
                    </div>
                  </td>
                  {/* 再発行 ボタン（Image 5） */}
                  <td className="px-5 py-4 text-center">
                    <button className="text-xs border border-slate-300 rounded-sm px-3 py-1 text-slate-600 hover:border-[#1a56db] hover:text-[#1a56db] transition font-bold">
                      編輯定價
                    </button>
                  </td>
                  {/* 削除アイコン（Image 5） */}
                  <td className="px-5 py-4 text-center relative">
                    <div className="relative inline-block">
                      <button onClick={()=>setOpenMenu(isOpen?null:i)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                        <MaterialIcon name="more_vert" size={18} />
                      </button>
                      {isOpen && (
                        <div className="absolute right-0 top-8 z-30 w-44 bg-white border border-slate-200 shadow-lg rounded-sm py-1 text-xs">
                          <button className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-bold">
                            編輯商品資訊
                          </button>
                          <button className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-bold">
                            暫停連結
                          </button>
                          <button className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-bold">
                            重新定價
                          </button>
                          <hr className="my-1 border-slate-100"/>
                          <button onClick={()=>{setShowConfirm(p.name);setOpenMenu(null);}}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-bold flex items-center gap-2">
                            <MaterialIcon name="warning" size={14}/>刪除商品
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 削除確認モーダル（Image 3 の確認ダイアログ） ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm shadow-2xl w-96 p-6">
            <p className="text-sm text-slate-600 mb-1">
              移除後，所有相關資料將被刪除且無法復原。
            </p>
            <p className="text-sm font-bold text-slate-800 mb-5">確定要刪除嗎？</p>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setShowConfirm(null)}
                className="px-5 py-2 text-sm text-slate-600 border border-slate-300 rounded-sm hover:bg-slate-50">
                取消
              </button>
              <button onClick={()=>setShowConfirm(null)}
                className="px-5 py-2 text-sm font-bold text-white bg-[#1a56db] rounded-sm hover:bg-[#1e40af]">
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   定價管理 tab  (Image 4 シフト表スタイル)
────────────────────────────────────────────────────────── */
const COL_OPTS = ["商品名","底價成本","預設售價","自訂售價","預估分潤","方案數","更新日"];

function PricingTab({ stats }) {
  const [visibleCols, setVisibleCols] = useState(
    Object.fromEntries(COL_OPTS.map(c=>[c,true]))
  );
  const [expanded, setExpanded] = useState({});
  const [storeFilter, setStoreFilter] = useState("");
  const [dateVal, setDateVal] = useState(new Date().toISOString().slice(0,10));

  const products = useMemo(() => {
    const map = {};
    for (const o of stats?.orders || []) {
      const items = (() => {
        try { return Array.isArray(o.item_details)?o.item_details:JSON.parse(o.item_details||"[]"); }
        catch { return []; }
      })();
      const name = items[0]?.name || "未命名方案";
      if (!map[name]) map[name] = {
        name, cost: Number(o.b2b_cost)||0,
        basePrice: Number(o.total_amount)||0,
        profit: Number(o.partner_profit)||0,
        plans: 1, updated: o.created_at,
      };
    }
    if (Object.keys(map).length===0) {
      return [
        { name:"JP 日本 3天", cost:120, basePrice:199, profit:55, plans:3, updated:new Date().toISOString() },
        { name:"KR 韓國 5天", cost:180, basePrice:299, profit:89, plans:4, updated:new Date().toISOString() },
        { name:"US 美國 10天",cost:280, basePrice:499, profit:149,plans:5, updated:new Date().toISOString() },
      ];
    }
    return Object.values(map);
  }, [stats]);

  const toggleCol = (c) => setVisibleCols(prev=>({...prev,[c]:!prev[c]}));
  const toggleRow = (n) => setExpanded(prev=>({...prev,[n]:!prev[n]}));

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">

      {/* ── シフト表トップバー ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-slate-200">
        {/* 店舗セレクター（ダイニー渋谷店 風） */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={storeFilter} onChange={e=>setStoreFilter(e.target.value)}
              className="pl-3 pr-8 py-1.5 text-sm border border-slate-300 rounded-sm appearance-none focus:border-[#1a56db] outline-none font-bold">
              <option value="">全商品</option>
              <option value="jp">日本方案</option>
              <option value="kr">韓國方案</option>
              <option value="us">美國方案</option>
            </select>
            <MaterialIcon name="expand_more" size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <span className="text-sm text-slate-400">月</span>
          <span className="text-sm text-slate-400">日</span>
          <input type="date" value={dateVal} onChange={e=>setDateVal(e.target.value)}
            className="text-sm border border-slate-300 rounded-sm px-3 py-1.5 focus:border-[#1a56db] outline-none" />
        </div>
        <div className="flex gap-2 ml-auto">
          <button className="text-sm border border-slate-300 rounded-sm px-4 py-1.5 hover:bg-slate-50 font-bold text-slate-600">
            方案管理
          </button>
          <button className="text-sm bg-[#1a56db] text-white font-bold px-4 py-1.5 rounded-sm hover:bg-[#1e40af] transition">
            儲存定價
          </button>
        </div>
      </div>

      {/* ── 表示項目チェックボックス（Image 4） ── */}
      <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-xs font-bold text-slate-500">表示項目</span>
        {COL_OPTS.map(c=>(
          <label key={c} className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700">
            <input type="checkbox" checked={!!visibleCols[c]} onChange={()=>toggleCol(c)}
              className="accent-[#1a56db] w-3.5 h-3.5" />
            {c}
          </label>
        ))}
      </div>

      {/* ── 集計行（Image 4 最上部サマリー） ── */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex gap-8 text-sm">
          <div>
            <span className="text-slate-500 text-xs">底價成本合計</span>
            <span className="ml-2 font-black text-slate-800">
              {fmt(products.reduce((s,p)=>s+p.cost,0))}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-xs">預估分潤合計</span>
            <span className="ml-2 font-black text-[#1a56db]">
              {fmt(products.reduce((s,p)=>s+p.profit,0))}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-xs">商品數</span>
            <span className="ml-2 font-black text-slate-800">{products.length}</span>
          </div>
        </div>
      </div>

      {/* ── 商品行 + 展開（Image 4 の明細行） ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-slate-200 text-slate-500 text-xs">
            <tr>
              <th className="w-8 px-3 py-3"/>
              {visibleCols["商品名"]    && <th className="px-5 py-3 text-left font-bold">商品名</th>}
              {visibleCols["底價成本"]  && <th className="px-5 py-3 text-right font-bold">底價成本</th>}
              {visibleCols["預設售價"]  && <th className="px-5 py-3 text-right font-bold">預設售價</th>}
              {visibleCols["自訂售價"]  && <th className="px-5 py-3 text-right font-bold">自訂售價</th>}
              {visibleCols["預估分潤"]  && <th className="px-5 py-3 text-right font-bold">預估分潤</th>}
              {visibleCols["方案數"]    && <th className="px-5 py-3 text-center font-bold">方案數</th>}
              {visibleCols["更新日"]    && <th className="px-5 py-3 text-left font-bold">更新日</th>}
              <th className="px-3 py-3"/>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => {
              const isOpen = !!expanded[p.name];
              const customPrice = Math.round(p.cost + p.profit * 1.1);
              return (
                <>
                  <tr key={p.name} className="hover:bg-slate-50/60 transition">
                    <td className="px-3 py-4">
                      <button onClick={()=>toggleRow(p.name)}
                        className="text-slate-400 hover:text-[#1a56db]">
                        <MaterialIcon name={isOpen ? "expand_less" : "expand_more"} size={18} />
                      </button>
                    </td>
                    {visibleCols["商品名"]   && <td className="px-5 py-4 font-bold text-slate-800">{p.name}</td>}
                    {visibleCols["底價成本"] && <td className="px-5 py-4 text-right text-slate-600">{fmt(p.cost)}</td>}
                    {visibleCols["預設售價"] && <td className="px-5 py-4 text-right text-slate-700">{fmt(p.basePrice)}</td>}
                    {visibleCols["自訂售價"] && (
                      <td className="px-5 py-4 text-right">
                        <input type="number" defaultValue={customPrice}
                          className="w-24 text-right border border-slate-300 rounded-sm px-2 py-1 text-sm focus:border-[#1a56db] outline-none" />
                      </td>
                    )}
                    {visibleCols["預估分潤"] && (
                      <td className="px-5 py-4 text-right font-black text-[#1a56db]">{fmt(p.profit)}</td>
                    )}
                    {visibleCols["方案數"]   && <td className="px-5 py-4 text-center text-slate-600">{p.plans}</td>}
                    {visibleCols["更新日"]   && <td className="px-5 py-4 text-xs text-slate-400">{fmtDate(p.updated)}</td>}
                    <td className="px-3 py-4">
                      <button className="text-xs bg-[#1a56db] text-white px-3 py-1 rounded-sm font-bold hover:bg-[#1e40af] transition">
                        保存
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={p.name+"_detail"} className="bg-blue-50/40">
                      <td />
                      <td colSpan={7} className="px-8 py-4">
                        <div className="grid grid-cols-3 gap-6 text-xs">
                          <div>
                            <p className="text-slate-500 font-bold mb-1">底價說明</p>
                            <p className="text-slate-700">底價為系統 API 成本，不可低於此售價。</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-bold mb-1">分潤計算</p>
                            <p className="text-slate-700">售價 − 底價 − 2.8% 金流手續費 = 您的分潤</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-bold mb-1">建議售價</p>
                            <p className="text-[#1a56db] font-black">{fmt(p.basePrice)}</p>
                            <p className="text-slate-400">官網定價，供參考</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   月次報告 tab  (Image 2 jinjer 風格)
────────────────────────────────────────────────────────── */
function ReportTab({ stats, partner, store }) {
  const monthly = useMemo(() => {
    const map = {};
    for (const o of stats?.orders || []) {
      if (o.status !== "completed" && o.status !== "pending") continue;
      const d = new Date(o.created_at);
      const k = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!map[k]) map[k]={month:k,revenue:0,profit:0,cost:0,count:0};
      map[k].revenue += Number(o.total_amount)||0;
      map[k].profit  += Number(o.partner_profit)||0;
      map[k].cost    += Number(o.b2b_cost)||0;
      map[k].count   += 1;
    }
    return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month));
  }, [stats]);

  const totals = useMemo(()=>({
    revenue: monthly.reduce((s,r)=>s+r.revenue,0),
    profit:  monthly.reduce((s,r)=>s+r.profit,0),
    cost:    monthly.reduce((s,r)=>s+r.cost,0),
    count:   monthly.reduce((s,r)=>s+r.count,0),
  }), [monthly]);

  const recent = useMemo(()=>
    (stats?.orders||[]).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5),
    [stats]
  );

  /* 4 アイコンカード（jinjer トップ） */
  const TOP_CARDS = [
    { icon:"📋", label:"月次報告", sub:"查看各月份分潤明細" },
    { icon:"📊", label:"收益趨勢", sub:"掌握每月收益變化" },
    { icon:"📁", label:"CSV 匯出", sub:"批次匯出銷售資料" },
    { icon:"⚙️", label:"商店設定", sub:"分潤率與店鋪資訊設定" },
  ];

  return (
    <div className="space-y-5">
      {/* ── jinjer 4 アイコンカード ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TOP_CARDS.map(c=>(
          <button key={c.label}
            className="bg-white border border-slate-200 rounded-sm shadow-sm p-5 flex flex-col items-center gap-2 hover:border-[#1a56db] hover:shadow-md transition group text-center">
            <div className="w-12 h-12 rounded-full bg-[#1a3a6b] group-hover:bg-[#1a56db] text-white flex items-center justify-center text-2xl transition shadow">
              {c.icon}
            </div>
            <p className="text-sm font-black text-slate-800">{c.label}</p>
            <p className="text-xs text-slate-400">{c.sub}</p>
          </button>
        ))}
      </div>

      {/* ── 2 列レイアウト（左: 月次表, 右: 事業所サイドバー） ── */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* 左：月次テーブル（jinjer 手続き一覧 + jinjer-style） */}
        <div className="flex-1 space-y-4">
          {/* 最新手続き（ToDo）履歴 風 */}
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-800">月次分潤報告</h3>
              <button type="button" className="text-xs border border-[#1a56db] text-[#1a56db] font-bold px-4 py-1.5 rounded-sm hover:bg-blue-50 transition">
                查看全部
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold">月份</th>
                    <th className="px-5 py-3 text-right font-bold">店鋪營收</th>
                    <th className="px-5 py-3 text-right font-bold">底價成本</th>
                    <th className="px-5 py-3 text-right font-bold">我的分潤</th>
                    <th className="px-5 py-3 text-center font-bold">訂單數</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthly.length===0 && (
                    <tr><td colSpan={5} className="py-10 text-center text-slate-400 text-sm">目前尚無報告資料</td></tr>
                  )}
                  {monthly.map((r)=>(
                    <tr key={r.month} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5">
                        <span className="text-xs bg-[#1a56db] text-white font-bold px-2 py-0.5 rounded-sm mr-2">
                          {r.month}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600">{fmt(r.revenue)}</td>
                      <td className="px-5 py-3.5 text-right text-slate-500">{fmt(r.cost)}</td>
                      <td className="px-5 py-3.5 text-right font-black text-[#1a56db]">+{fmt(r.profit)}</td>
                      <td className="px-5 py-3.5 text-center text-slate-700">{r.count}</td>
                    </tr>
                  ))}
                  {monthly.length > 0 && (
                    <tr className="bg-slate-100 font-black">
                      <td className="px-5 py-3 text-slate-700 text-xs">合計</td>
                      <td className="px-5 py-3 text-right text-slate-700">{fmt(totals.revenue)}</td>
                      <td className="px-5 py-3 text-right text-slate-500">{fmt(totals.cost)}</td>
                      <td className="px-5 py-3 text-right text-[#1a56db]">+{fmt(totals.profit)}</td>
                      <td className="px-5 py-3 text-center text-slate-700">{totals.count}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 開發ニュース UPDATE 風 → 最近注文 */}
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-800">
                最近訂單
                <span className="ml-2 text-xs bg-[#1a56db] text-white px-2 py-0.5 rounded font-bold">
                  UPDATE {new Date().toLocaleDateString("zh-TW")}
                </span>
              </h3>
              <button type="button" className="text-xs border border-[#1a56db] text-[#1a56db] font-bold px-4 py-1.5 rounded-sm hover:bg-blue-50 transition">
                查看全部
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recent.length===0 ? (
                <div className="py-8 text-center text-sm text-slate-400">尚無訂單</div>
              ) : recent.map((o)=>(
                <div key={o.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 group cursor-pointer transition">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-sm ${
                      o.status==="completed"?"bg-[#d1fae5] text-[#065f46]":
                      o.status==="pending"?"bg-[#fef3c7] text-[#92400e]":
                      "bg-slate-100 text-slate-500"}`}>
                      {o.status==="completed"?"已付款":o.status==="pending"?"待付款":"其他"}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        {o.customer_email || "—"}
                      </p>
                      <p className="text-xs text-slate-400">{fmtDate(o.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-[#1a56db]">+{fmt(o.partner_profit)}</span>
                    <MaterialIcon name="chevron_right" size={18} className="text-slate-300 group-hover:text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右：事業所サイドバー（jinjer 右カラム） */}
        <div className="w-full lg:w-72 space-y-4 shrink-0">
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800">店鋪資訊</h3>
              <button type="button" className="text-xs border border-slate-300 text-slate-600 px-3 py-1 rounded-sm hover:bg-slate-50 font-bold">
                編輯
              </button>
            </div>
            <dl className="space-y-2.5 text-xs">
              {[
                ["店鋪名稱", store?.name || partner?.name || "—"],
                ["E-mail", partner?.email || "—"],
                ["分潤方式", "依訂單自動結算"],
                ["分潤率",  "依方案設定"],
              ].map(([l,v])=>(
                <div key={l} className="flex gap-2">
                  <dt className="text-slate-400 w-16 shrink-0">{l}</dt>
                  <dd className="text-slate-700 font-bold break-all">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 社会保険 風 → 分潤說明 */}
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-5">
            <h3 className="text-sm font-black text-slate-800 mb-3">
              分潤說明
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black">
                7
              </span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2"><MaterialIcon name="check_circle" size={14} className="text-[#1a56db] shrink-0 mt-0.5" filled/><span>依各方案設定分潤率計算</span></li>
              <li className="flex items-start gap-2"><MaterialIcon name="check_circle" size={14} className="text-[#1a56db] shrink-0 mt-0.5" filled/><span>扣除 2.8% 金流手續費</span></li>
              <li className="flex items-start gap-2"><MaterialIcon name="check_circle" size={14} className="text-[#1a56db] shrink-0 mt-0.5" filled/><span>每月結算，月底匯款</span></li>
              <li className="flex items-start gap-2"><MaterialIcon name="check_circle" size={14} className="text-[#1a56db] shrink-0 mt-0.5" filled/><span>訂單取消不計入分潤</span></li>
            </ul>
          </div>

          {/* 雇用保険 風 → KPI 摘要 */}
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-5">
            <h3 className="text-sm font-black text-slate-800 mb-3">
              累計 KPI
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-black">
                4
              </span>
            </h3>
            <dl className="space-y-2.5 text-xs">
              {[
                ["累計分潤",  fmt(totals.profit)],
                ["累計營收",  fmt(totals.revenue)],
                ["有效訂單",  `${totals.count} 筆`],
              ].map(([l,v])=>(
                <div key={l} className="flex justify-between">
                  <dt className="text-slate-400">{l}</dt>
                  <dd className="font-black text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   主頁面
────────────────────────────────────────────────────────── */
export default function PartnerProductsPage() {
  const { partner, store } = usePartnerSession();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("analytics");

  // 期間フィルター
  const [rangeStart, setRangeStart] = useState(() => thisMonthRange().start);
  const [rangeEnd,   setRangeEnd]   = useState(() => thisMonthRange().end);

  const handleQuickRange = (type) => {
    if (type === "prevMonth") {
      const r = prevMonthRange(); setRangeStart(r.start); setRangeEnd(r.end);
    } else {
      const r = thisMonthRange(); setRangeStart(r.start); setRangeEnd(r.end);
    }
  };

  useEffect(() => {
    if (!partner) return;
    setLoading(true);
    fetchPartnerStats(partner.id, store?.id).then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, [partner, store]);

  const productCount = useMemo(() => {
    const names = new Set();
    for (const o of stats?.orders || []) {
      const items = (() => {
        try { return Array.isArray(o.item_details)?o.item_details:JSON.parse(o.item_details||"[]"); }
        catch { return []; }
      })();
      if (items[0]?.name) names.add(items[0].name);
    }
    return names.size;
  }, [stats]);

  return (
    <PartnerAdminLayout title="商品管理">
      {/* ── タブナビ ── */}
      <div className="flex bg-white border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition ${
                isActive
                  ? "border-[#1a56db] text-[#1a56db] bg-blue-50/30"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <MaterialIcon name={t.icon} size={18} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── タブコンテンツ ── */}
      {activeTab === "analytics" && (
        <PartnerProductAnalytics
          stats={stats}
          loading={loading}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onRangeStartChange={setRangeStart}
          onRangeEndChange={setRangeEnd}
          onQuickRange={handleQuickRange}
        />
      )}
      {activeTab !== "analytics" && (
        <div className="p-5">
          {activeTab === "products" && <ProductsTab stats={stats} productCount={productCount} />}
          {activeTab === "pricing" && <PricingTab stats={stats} />}
          {activeTab === "report" && <ReportTab stats={stats} partner={partner} store={store} />}
        </div>
      )}
    </PartnerAdminLayout>
  );
}
