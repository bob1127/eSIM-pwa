"use client";

import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import MaterialIcon from "@/components/MaterialIcon";
import { PARTNER_UI } from "@/lib/partnerUi";
import { supabase } from "@/lib/supabaseClient";
import { QuarterRing } from "@/components/ui/QuarterRing";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {
  buildCountryGroupsFromProducts,
  filterCountryGroupsByRegion,
  PARTNER_REGION_DEFS,
  productMatchesCountryKeys,
} from "@/lib/partnerNavCountries";
import PartnerSelectMenu from "@/components/partner/PartnerSelectMenu";

const STEPS = [
  { id: "intro", title: "智慧開立商店" },
  { id: "destinations", title: "選擇目的地" },
  { id: "products", title: "智慧選品" },
  { id: "confirm", title: "確認清單" },
  { id: "generate", title: "生成商店" },
];

function fireRibbon() {
  const end = Date.now() + 1800;
  const colors = [PARTNER_UI.navy, PARTNER_UI.yellow, "#ffffff", "#0071EB"];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.55 },
    colors,
  });
}

/**
 * 專屬商店 — 智慧選品／開立商店步驟式 wizard
 */
export default function SmartStoreSetupWizard({
  open,
  onClose,
  store,
  storePath,
  onComplete,
  setupPending = false,
}) {
  const [step, setStep] = useState(0);
  const [destKeys, setDestKeys] = useState([]);
  const [regionFilter, setRegionFilter] = useState("all");
  const [pool, setPool] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | loading | success | error
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDestKeys([]);
    setRegionFilter("all");
    setPool([]);
    setSelectedIds([]);
    setPhase("idle");
    setProgress(0);
    setError("");
    setStatusText("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingPool(true);
      try {
        const res = await fetch("/api/partner/product-pool?refresh=1");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "無法載入商品池");
        if (!cancelled) setPool(data.products || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "載入失敗");
      } finally {
        if (!cancelled) setLoadingPool(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const poolCountries = useMemo(
    () => buildCountryGroupsFromProducts(pool),
    [pool],
  );

  const displayCountries = useMemo(
    () => filterCountryGroupsByRegion(poolCountries, regionFilter),
    [poolCountries, regionFilter],
  );

  useEffect(() => {
    if (!open || !poolCountries.length || destKeys.length) return;
    setDestKeys(poolCountries.map((c) => c.key));
  }, [open, poolCountries, destKeys.length]);

  const filteredPool = useMemo(
    () => pool.filter((p) => productMatchesCountryKeys(p, destKeys)),
    [pool, destKeys],
  );

  const productId = (p) => p.medusa_product_id || p.id;

  const filteredIds = useMemo(
    () => filteredPool.map(productId),
    [filteredPool],
  );

  const allFilteredSelected = useMemo(
    () =>
      filteredIds.length > 0 &&
      filteredIds.every((id) => selectedIds.includes(id)),
    [filteredIds, selectedIds],
  );

  useEffect(() => {
    if (step !== 2 || !filteredPool.length) return;
    setSelectedIds((prev) => {
      if (prev.length) return prev;
      return filteredPool.slice(0, 8).map(productId);
    });
  }, [step, filteredPool]);

  const selectedProducts = useMemo(
    () => pool.filter((p) => selectedIds.includes(productId(p))),
    [pool, selectedIds],
  );

  const toggleDest = (key) => {
    setDestKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const allDestSelected =
    displayCountries.length > 0 &&
    displayCountries.every((c) => destKeys.includes(c.key));

  const toggleAllDest = () => {
    const visibleKeys = displayCountries.map((c) => c.key);
    if (allDestSelected) {
      setDestKeys((prev) => prev.filter((k) => !visibleKeys.includes(k)));
      return;
    }
    setDestKeys((prev) => [...new Set([...prev, ...visibleKeys])]);
  };

  const toggleProduct = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectSmart = () => {
    setSelectedIds(filteredPool.slice(0, 12).map(productId));
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...filteredIds])]);
  };

  const authHeader = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    };
  };

  const runGenerate = async () => {
    if (!selectedIds.length) {
      setError("請至少選擇一款商品");
      return;
    }
    setPhase("loading");
    setError("");
    setProgress(8);
    setStatusText("正在準備商店架構…");

    try {
      const headers = await authHeader();
      const ids = [...selectedIds];
      const CHUNK = 16;
      let done = 0;

      setProgress(12);
      setStatusText(`正在上架商品（0/${ids.length}）…`);

      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        setStatusText(`正在上架商品（${done + 1}/${ids.length}）…`);
        const res = await fetch("/api/partner/store-listings", {
          method: "POST",
          headers,
          body: JSON.stringify({ medusa_product_ids: chunk }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "批次上架失敗");
        }
        if (data.failedCount > 0 && data.listedCount === 0) {
          throw new Error(data.failed?.[0]?.error || "批次上架失敗");
        }
        done += chunk.length;
        setStatusText(`正在上架商品（${done}/${ids.length}）…`);
        setProgress(Math.round(12 + (done / ids.length) * 78));
      }

      setProgress(95);
      setStatusText("正在啟用賣場…");

      if (setupPending) {
        const activateRes = await fetch("/api/partner/complete-store-setup", {
          method: "POST",
          headers,
        });
        const activateData = await activateRes.json().catch(() => ({}));
        if (!activateRes.ok) {
          throw new Error(activateData.error || "啟用賣場失敗");
        }
        onComplete?.(activateData.store);
      }

      setStatusText("正在產生賣場頁面…");

      try {
        localStorage.setItem(
          `jeko_smart_store_${store?.domain || "x"}`,
          JSON.stringify({
            at: Date.now(),
            count: ids.length,
          }),
        );
      } catch {
        /* ignore */
      }

      setProgress(100);
      setStatusText("成功建立商店！");
      setPhase("success");
      fireRibbon();

      await new Promise((r) => setTimeout(r, 900));
      window.location.href = storePath || `/p/${store?.domain}/`;
    } catch (err) {
      setPhase("error");
      setError(err.message || "生成失敗，請稍後再試");
      setProgress(0);
    }
  };

  if (!open) return null;

  const goBack = () => {
    if (step === 0) {
      onClose();
      return;
    }
    setError("");
    if (step === 4 && phase === "error") {
      setPhase("idle");
      setProgress(0);
    }
    setStep((s) => s - 1);
  };

  const canNext =
    step === 0 ||
    (step === 1 && !loadingPool && destKeys.length > 0) ||
    (step === 2 && selectedIds.length > 0) ||
    step === 3;

  const showFooter =
    phase !== "loading" && phase !== "success" && (step < 4 || step === 4);

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div
          className="px-5 py-4 text-white relative shrink-0"
          style={{ backgroundColor: PARTNER_UI.navy }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{ backgroundColor: PARTNER_UI.yellow }}
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold mt-0.5">
                {STEPS[step]?.title || "智慧開立商店"}
              </h2>
              <p className="text-xs text-blue-100 mt-1">
                {store?.store_name || "我的賣場"} · 步驟 {step + 1}/
                {STEPS.length}
              </p>
            </div>
            {phase !== "loading" && phase !== "success" && (
              <button
                type="button"
                onClick={onClose}
                className="text-white/80 hover:text-white text-[24px] leading-none px-1"
                aria-label="關閉"
              >
                ×
              </button>
            )}
          </div>
          <div className="mt-4 flex gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className="h-1.5 flex-1 rounded-full overflow-hidden bg-white/20"
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: i <= step ? "100%" : "0%",
                    backgroundColor: PARTNER_UI.yellow,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {error && (
            <div className="mb-4 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <div
                className="rounded-xl p-4 border"
                style={{
                  backgroundColor: "rgba(250,222,43,0.15)",
                  borderColor: "rgba(250,222,43,0.5)",
                }}
              >
                <p className="text-sm font-bold text-[#1E4AD1]">
                  歡迎使用智慧選品開立商店
                </p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  依你的旅遊客群挑選熱門目的地與推薦
                  eSIM，系統會自動幫你上架到專屬賣場，完成後即可對外推廣。
                </p>
              </div>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex gap-2">
                  <MaterialIcon
                    name="flag"
                    size={18}
                    className="text-[#1E4AD1]"
                  />
                  選擇主要推廣目的地
                </li>
                <li className="flex gap-2">
                  <MaterialIcon
                    name="auto_awesome"
                    size={18}
                    className="text-[#1E4AD1]"
                  />
                  智慧推薦熱銷方案，可再微調
                </li>
                <li className="flex gap-2">
                  <MaterialIcon
                    name="storefront"
                    size={18}
                    className="text-[#1E4AD1]"
                  />
                  一鍵生成賣場並立即預覽
                </li>
              </ul>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-slate-600">
                  依主站商品池勾選目的地（可複選）
                  {pool.length > 0 ? (
                    <span className="text-slate-400">
                      {" "}
                      · 共 {pool.length} 款
                    </span>
                  ) : null}
                </p>
                {displayCountries.length > 0 ? (
                  <button
                    type="button"
                    onClick={toggleAllDest}
                    className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:border-[#1E4AD1] hover:text-[#1E4AD1] transition"
                  >
                    {allDestSelected
                      ? regionFilter === "all"
                        ? "取消全選"
                        : "取消此地區全選"
                      : regionFilter === "all"
                        ? "全選目的地"
                        : "全選此地區"}
                  </button>
                ) : null}
              </div>
              {poolCountries.length > 0 ? (
                <PartnerSelectMenu
                  value={regionFilter}
                  onChange={setRegionFilter}
                  options={PARTNER_REGION_DEFS}
                  prefix="地區："
                  className="w-full sm:w-auto"
                />
              ) : null}
              {loadingPool ? (
                <LoadingIndicator
                  layout="center"
                  label="載入主站商品目錄…"
                  className="py-10"
                />
              ) : poolCountries.length === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center">
                  暫無可選商品，請稍後再試或至「選品管理」手動上架。
                </p>
              ) : displayCountries.length === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center">
                  此地區暫無可選目的地，請切換其他地區或選擇「全部地區」。
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[42vh] overflow-y-auto pr-1">
                  {displayCountries.map((d) => {
                    const on = destKeys.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => toggleDest(d.key)}
                        className={`rounded-xl border px-3 py-3 text-sm font-bold transition text-left ${
                          on
                            ? "border-[#1E4AD1] bg-[#1E4AD1] text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-[#0071EB]"
                        }`}
                      >
                        <span>{d.label}</span>
                        <span
                          className={`block text-[11px] mt-0.5 font-medium ${
                            on ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {d.count} 款
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {pool.length > 0 && filteredPool.length < pool.length ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                  主站商品池共 <strong>{pool.length}</strong> 款，依目的地篩選{" "}
                  <strong>{filteredPool.length}</strong>{" "}
                  款。若缺少方案，請回上一步勾選更多目的地。
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-slate-600">
                  已選{" "}
                  <span className="font-bold text-[#1E4AD1]">
                    {selectedIds.length}
                  </span>{" "}
                  款
                  {filteredPool.length > 0 ? (
                    <span className="text-slate-400">
                      {" "}
                      / 篩選 {filteredPool.length} 款
                      {pool.length > filteredPool.length
                        ? `（主站 ${pool.length} 款）`
                        : ""}
                    </span>
                  ) : pool.length > 0 ? (
                    <span className="text-slate-400">
                      {" "}
                      / 主站 {pool.length} 款
                    </span>
                  ) : null}
                </p>
                <div className="flex items-center gap-2">
                  {filteredPool.length > 0 ? (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:border-[#1E4AD1] hover:text-[#1E4AD1] transition"
                    >
                      {allFilteredSelected ? "取消全選" : "全選"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={selectSmart}
                    className="text-xs font-bold px-3 py-1.5 rounded-full text-[#111]"
                    style={{ backgroundColor: PARTNER_UI.yellow }}
                  >
                    一鍵智慧推薦
                  </button>
                </div>
              </div>
              {loadingPool ? (
                <LoadingIndicator
                  layout="center"
                  label="載入商品池中…"
                  className="py-10"
                />
              ) : filteredPool.length === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center">
                  此目的地暫無匹配商品，請調整目的地或稍後至選品管理手動上架。
                </p>
              ) : (
                <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                  {filteredPool.map((p) => {
                    const id = productId(p);
                    const on = selectedIds.includes(id);
                    const img = p.image_url || p.image || p.thumbnail;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleProduct(id)}
                        className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                          on
                            ? "border-[#1E4AD1] bg-blue-50/60"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                            on
                              ? "bg-[#1E4AD1] border-[#1E4AD1] text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {on ? <MaterialIcon name="check" size={14} /> : null}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            底價約 NT${Math.round(p.minB2B || p.minRetail || 0)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                即將上架 <strong>{selectedProducts.length}</strong> 款方案到「
                {store?.store_name}」
              </p>
              <div className="rounded-xl border border-slate-200 divide-y max-h-[40vh] overflow-y-auto">
                {selectedProducts.map((p) => (
                  <div
                    key={productId(p)}
                    className="px-3 py-2.5 text-sm font-medium text-slate-700"
                  >
                    {p.name}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                下一步將開始自動生成商店。生成完成後會顯示你的專屬賣場頁面。
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="py-6 text-center space-y-4">
              {phase === "idle" || phase === "error" ? (
                <>
                  <h3 className="text-xl font-bold text-[#1E4AD1]">
                    準備好了嗎？開始生成商店
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                    系統將把已選方案上架到你的專屬賣場，並產生可對外分享的商店頁面。
                  </p>
                  <p className="text-xs text-slate-400">
                    確認無誤後，請點下方「開始生成商店」。
                  </p>
                </>
              ) : null}

              {phase === "loading" && (
                <>
                  <div className="relative w-20 h-20 mx-auto">
                    <QuarterRing
                      size="xl"
                      className="absolute inset-0 h-20 w-20 text-[#1E4AD1]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#1E4AD1]">
                      {progress}%
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {statusText}
                  </p>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden max-w-xs mx-auto">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: PARTNER_UI.yellow,
                      }}
                    />
                  </div>
                </>
              )}

              {phase === "success" && (
                <>
                  <div
                    className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                    style={{ backgroundColor: PARTNER_UI.yellow }}
                  >
                    <MaterialIcon
                      name="celebration"
                      size={32}
                      className="text-[#1E4AD1]"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-[#1E4AD1]">
                    成功建立商店！
                  </h3>
                  <p className="text-sm text-slate-500">
                    正在帶你前往賣場頁面…
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        {showFooter ? (
          <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex justify-between gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={goBack}
              className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 min-h-[44px]"
            >
              {step === 0 ? "取消" : "上一步"}
            </button>
            {step < 4 ? (
              <button
                type="button"
                disabled={!canNext}
                onClick={() =>
                  setStep((s) => Math.min(s + 1, STEPS.length - 1))
                }
                className="px-5 py-2.5 rounded-full text-sm font-bold text-white disabled:opacity-40 min-h-[44px]"
                style={{ backgroundColor: PARTNER_UI.navy }}
              >
                下一步
              </button>
            ) : (
              <button
                type="button"
                disabled={!selectedIds.length}
                onClick={runGenerate}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-[#111] disabled:opacity-40 min-h-[44px]"
                style={{ backgroundColor: PARTNER_UI.yellow }}
              >
                <MaterialIcon name="auto_awesome" size={18} />
                開始生成商店
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
