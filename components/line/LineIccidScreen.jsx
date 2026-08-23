"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { formatMb } from "@/lib/esimUsageFormat";

/**
 * LINE「開啟流量提醒」— 仿叫車介面
 * 上方：使用用量圖表（取代地圖）
 * 下方：白色 bottom sheet（選擇 eSIM／ICCID／綁定／開啟提醒）
 */
const BLUE = "#276EF1";
const GREEN = "#34A853";
const NAVY = "#0B1F40";

/** 與主站 EsimBottomSheet 相同彈簧 */
const SHEET_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 26,
  mass: 0.82,
};

const LineTrafficUsageHero = dynamic(() => import("./LineTrafficUsageHero"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[260px] items-center justify-center">
      <LoadingIndicator layout="center" label="圖表載入中…" />
    </div>
  ),
});

const BindSuccessSheet = dynamic(() => import("./BindSuccessSheet"), {
  ssr: false,
});

function SheetRow({
  dotColor,
  title,
  subtitle,
  open = false,
  onToggle,
  children,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E6EAF2] bg-white shadow-[0_1px_2px_rgba(15,40,80,0.04)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold" style={{ color: NAVY }}>
            {title}
          </span>
          {subtitle ? (
            <span className="mt-0.5 block text-[12px] text-[#8A94A6]">
              {subtitle}
            </span>
          ) : null}
        </span>
        <span
          className="text-[18px] leading-none text-[#C5CDD8] transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          ›
        </span>
      </button>
      {open && children ? (
        <div className="border-t border-[#EEF1F6] px-3.5 pb-3.5 pt-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default function LineIccidScreen({
  pageMode = "liff",
  modeHint = "",
  iccid,
  onIccidChange,
  liffReady,
  liffError,
  loading,
  bindLoading,
  error,
  result,
  orderAlert,
  orderError,
  memberBindOk,
  lineBindMessage,
  lineBindStatus,
  authReady,
  isLoggedIn = false,
  memberEsims,
  selectedTopupId,
  onSelectTopup,
  activeTopupId,
  usageById,
  usageLoading,
  onRefreshUsage,
  onMemberBindClick,
  onOneClickOrder,
  onSubmit,
  onLoginClick,
  onLogoutClick,
}) {
  const isWeb = pageMode === "web";
  const loggedIn = Boolean(isLoggedIn);
  const esims = loggedIn && Array.isArray(memberEsims) ? memberEsims : [];
  const showBindSuccess = loggedIn && Boolean(memberBindOk);
  const showOrderOk = Boolean(orderAlert?.ok);
  const usageMap = usageById || {};
  const [usageViewId, setUsageViewId] = useState("");
  const [showIccidForm, setShowIccidForm] = useState(!loggedIn);
  const [showUsageDetail, setShowUsageDetail] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [bindSheetOpen, setBindSheetOpen] = useState(false);

  useEffect(() => {
    if (showBindSuccess) setBindSheetOpen(true);
    else setBindSheetOpen(false);
  }, [showBindSuccess]);

  useEffect(() => {
    if (!esims.length) {
      setUsageViewId("");
      return;
    }
    const exists = esims.some((e) => String(e.topupId) === String(usageViewId));
    if (!exists) {
      setUsageViewId(
        String(activeTopupId || selectedTopupId || esims[0].topupId || ""),
      );
    }
  }, [esims, usageViewId, activeTopupId, selectedTopupId]);

  useEffect(() => {
    // 訪客預設展開 ICCID；登入後若有 eSIM 則收合輸入列
    if (!loggedIn) setShowIccidForm(true);
    else if (esims.length > 0) setShowIccidForm(false);
  }, [loggedIn, esims.length]);

  const toggleSheet = () => setSheetExpanded((v) => !v);

  const selectEsim = (id) => {
    onSelectTopup?.(id);
    setUsageViewId(id);
  };

  const viewUsage =
    usageMap[usageViewId] ||
    usageMap[String(usageViewId)] ||
    result?.usage ||
    null;
  const viewEsim =
    esims.find((e) => String(e.topupId) === String(usageViewId)) || null;
  const viewName =
    viewEsim?.productName || viewUsage?.productName || "尚未選擇方案";

  const selectedId = String(selectedTopupId || usageViewId || "");
  const monitoringSelected =
    Boolean(activeTopupId) &&
    Boolean(selectedId) &&
    String(activeTopupId) === selectedId;

  const alertTargetName =
    (selectedId &&
      esims.find((e) => String(e.topupId) === selectedId)?.productName) ||
    viewName;

  const primaryLabel = !loggedIn
    ? "登入會員"
    : lineBindStatus === "loading"
      ? null
      : showBindSuccess
        ? monitoringSelected
          ? "已開啟流量通知"
          : "開啟流量通知"
        : isWeb
          ? "綁定"
          : "一鍵綁定官網會員";

  const primarySubtext =
    loggedIn && showBindSuccess
      ? monitoringSelected
        ? `目前監控「${alertTargetName}」。流量偏低時會透過官方 LINE 通知您。`
        : `為「${alertTargetName}」開啟流量通知；當流量小於一定範圍會通知您。`
      : null;

  const flowHint = !loggedIn
    ? "訪客可用 ICCID 開單張提醒；會員請：登入 → 綁定 → 選一張 eSIM → 開啟流量通知（一次一張）。"
    : !showBindSuccess
      ? "下一步：點「綁定」連結 LINE 與官網會員（不會一次開全部通知）。"
      : esims.length > 1
        ? "請選一張 eSIM，再點「開啟流量通知」。同時只監控一張；改開另一張時，上一張會暫停。"
        : esims.length === 1
          ? "點下方「開啟流量通知」即可為此 eSIM 開通提醒。"
          : "尚無本站訂單時，請改用下方 ICCID 開單張提醒。";

  const onPrimary = () => {
    if (!loggedIn) {
      (onLoginClick || onMemberBindClick)?.();
      return;
    }
    if (showBindSuccess) {
      onOneClickOrder?.();
      return;
    }
    onMemberBindClick?.();
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#D5E3F7]">
      {/* 上方：使用用量圖表（收合時往可視區中央） */}
      <motion.div
        className="relative flex min-h-0 flex-1 flex-col"
        layout
        transition={SHEET_SPRING}
        animate={{
          minHeight: sheetExpanded ? "42dvh" : "58dvh",
        }}
      >
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          <a
            href="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[18px] font-bold text-[#0B1F40] shadow-sm"
            aria-label="回首頁"
          >
            ‹
          </a>
        </div>
        <div className="absolute right-4 top-4 z-20">
          {authReady ? (
            loggedIn ? (
              <button
                type="button"
                onClick={onLogoutClick}
                className="rounded-full bg-white/95 px-3.5 py-2 text-[12px] font-bold text-[#0B1F40] shadow-sm"
              >
                登出
              </button>
            ) : (
              <button
                type="button"
                onClick={onLoginClick}
                className="rounded-full bg-[#276EF1] px-3.5 py-2 text-[12px] font-bold text-white shadow-sm"
              >
                登入
              </button>
            )
          ) : null}
        </div>
        <LineTrafficUsageHero
          productName={viewName}
          usage={viewUsage}
          loading={usageLoading}
          sheetCollapsed={!sheetExpanded}
          onRefresh={
            usageViewId || viewUsage
              ? () => onRefreshUsage?.(usageViewId)
              : undefined
          }
        />
      </motion.div>

      {/* 下方：bottom sheet（整塊可收折 + 彈簧） */}
      <motion.section
        layout
        transition={SHEET_SPRING}
        className="relative z-10 -mt-5 rounded-t-[28px] bg-white px-4 pb-8 pt-2 shadow-[0_-8px_30px_rgba(15,40,80,0.12)]"
      >
        <button
          type="button"
          onClick={toggleSheet}
          className="mx-auto mb-2 flex w-full flex-col items-center pt-1"
          aria-expanded={sheetExpanded}
          aria-label={sheetExpanded ? "收合流量提醒" : "展開流量提醒"}
        >
          <span className="h-1 w-10 rounded-full bg-[#D8DEE8]" />
        </button>

        <button
          type="button"
          onClick={toggleSheet}
          className="mb-3 flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={sheetExpanded}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#0B1F40]">
            <motion.span
              className="text-[18px] leading-none"
              animate={{ rotate: sheetExpanded ? -90 : 90 }}
              transition={SHEET_SPRING}
              aria-hidden
            >
              ›
            </motion.span>
          </span>
          <h1 className="text-[17px] font-black tracking-tight text-[#0B1F40]">
            流量提醒
          </h1>
          <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#276EF1]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4Z" />
            </svg>
            {loggedIn ? `${Math.max(esims.length, 1)} max` : "訪客"}
          </span>
        </button>

        <AnimatePresence initial={false} mode="sync">
          {!sheetExpanded ? (
            <motion.button
              key="sheet-peek"
              type="button"
              onClick={toggleSheet}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={SHEET_SPRING}
              className="mb-4 w-full rounded-2xl bg-[#F3F6FB] px-3.5 py-3 text-left"
            >
              <p className="text-[13px] font-bold text-[#0B1F40]">
                {viewName}
                {viewUsage?.remainingMb != null
                  ? ` · 剩餘 ${formatMb(viewUsage.remainingMb)}`
                  : ""}
              </p>
              <p className="mt-0.5 text-[12px] text-[#8A94A6]">
                點此展開選擇 eSIM、ICCID 與設定
              </p>
            </motion.button>
          ) : (
            <motion.div
              key="sheet-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SHEET_SPRING}
              className="overflow-hidden"
            >
            {modeHint || flowHint ? (
              <p className="mb-3 rounded-xl bg-[#F3F6FB] px-3 py-2 text-[11px] leading-relaxed text-[#5B6B82]">
                {modeHint || flowHint}
              </p>
            ) : null}

            {!loggedIn && authReady ? (
              <p className="mb-3 rounded-xl bg-[#FFF8E8] px-3 py-2 text-[12px] leading-relaxed text-[#7A5B00]">
                訪客可直接用 ICCID 開單張提醒，不必綁定。綁定僅供會員一鍵選本站 eSIM。
              </p>
            ) : null}

            {showBindSuccess && !bindSheetOpen ? (
              <button
                type="button"
                onClick={() => setBindSheetOpen(true)}
                className="mb-3 w-full rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC] px-3.5 py-3 text-left"
              >
                <p className="text-[13px] font-black text-[#0B1F40]">
                  ✓ 已連結會員
                </p>
                <p className="mt-0.5 text-[12px] text-[#5B6B82]">
                  下一步：選一張 eSIM → 開啟提醒（一次一張）
                </p>
              </button>
            ) : null}

            {showOrderOk ? (
              <div className="mb-3 rounded-2xl border border-[#E6EAF2] px-3.5 py-3">
                <p className="text-[13px] font-black text-[#0B1F40]">
                  已開啟偏低提醒
                </p>
                <p className="mt-0.5 text-[12px] text-[#5B6B82]">
                  目前監控：
                  <span className="font-bold text-[#276EF1]">
                    {orderAlert.productName || "已選方案"}
                  </span>
                  {esims.length > 1
                    ? " · 要改盯另一張：選卡後再按「開啟流量通知」"
                    : ""}
                </p>
              </div>
            ) : null}

            {/* 選擇 eSIM */}
            <div className="mb-3">
              <p className="mb-1 flex items-center gap-1 text-[13px] font-semibold text-[#8A94A6]">
                選擇要提醒的 eSIM
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#C5CDD8] text-[9px]">
                  i
                </span>
              </p>
              <p className="mb-2 text-[11px] leading-relaxed text-[#A0AAB8]">
                一次只開一張通知；點選後再按下方主按鈕
              </p>
              {esims.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {esims.map((esim) => {
                    const id = String(esim.topupId || "");
                    const on = String(selectedTopupId || usageViewId) === id;
                    const rem = usageMap[id]?.remainingMb;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => selectEsim(id)}
                        className="shrink-0 rounded-xl border px-3.5 py-2.5 text-left"
                        style={
                          on
                            ? {
                                borderColor: BLUE,
                                backgroundColor: "#EEF3FF",
                                borderWidth: 2,
                              }
                            : {
                                borderColor: "#E6EAF2",
                                backgroundColor: "#fff",
                                borderWidth: 1,
                              }
                        }
                      >
                        <span
                          className="block text-[13px] font-black"
                          style={{ color: on ? BLUE : NAVY }}
                        >
                          {String(activeTopupId) === id ? "監控中 · " : ""}
                          {esim.productName.length > 12
                            ? `${esim.productName.slice(0, 12)}…`
                            : esim.productName}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[#8A94A6]">
                          {rem != null
                            ? `剩餘 ${formatMb(rem)}`
                            : "點選查看用量"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#D8DEE8] px-3 py-3 text-[12px] text-[#8A94A6]">
                  {loggedIn
                    ? "尚無本站 eSIM 訂單，可改用 ICCID 查詢。"
                    : "登入後可一鍵選擇本站訂單。"}
                </div>
              )}
            </div>

            {/* 路線式兩列資訊 — 點擊展開／收合 */}
            <div className="mb-4">
              <div className="flex flex-col gap-2">
                <SheetRow
                  dotColor={BLUE}
                  title={viewName}
                  subtitle={
                    viewUsage?.remainingMb != null
                      ? `剩餘 ${formatMb(viewUsage.remainingMb)}${
                          viewUsage.totalMb != null
                            ? ` · 總量 ${formatMb(viewUsage.totalMb)}`
                            : ""
                        }`
                      : loggedIn
                        ? "選擇上方 eSIM 或點此查看詳情"
                        : "登入或輸入 ICCID 後顯示"
                  }
                  open={showUsageDetail}
                  onToggle={() => setShowUsageDetail((v) => !v)}
                >
                  <div className="space-y-2 text-[13px] text-[#5B6B82]">
                    {viewUsage?.remainingMb != null ? (
                      <>
                        <p>
                          剩餘{" "}
                          <span className="font-bold text-[#0B1F40]">
                            {formatMb(viewUsage.remainingMb)}
                          </span>
                          {viewUsage.totalMb != null
                            ? ` · 總量 ${formatMb(viewUsage.totalMb)}`
                            : ""}
                        </p>
                        {viewUsage.usedMb != null ? (
                          <p>已用 {formatMb(viewUsage.usedMb)}</p>
                        ) : null}
                        {viewUsage.expiresAt ? (
                          <p>到期 {String(viewUsage.expiresAt).slice(0, 10)}</p>
                        ) : null}
                        {viewEsim?.productName ? (
                          <p className="text-[12px] text-[#8A94A6]">
                            方案：{viewEsim.productName}
                          </p>
                        ) : null}
                        {onRefreshUsage && (usageViewId || viewUsage) ? (
                          <button
                            type="button"
                            onClick={() => onRefreshUsage(usageViewId)}
                            disabled={usageLoading}
                            className="pt-1 text-[12px] font-bold text-[#276EF1] disabled:opacity-50"
                          >
                            {usageLoading ? "更新中…" : "更新用量"}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <p className="leading-relaxed">
                        {loggedIn
                          ? "請先在上方選擇一張 eSIM，用量會顯示在這裡。"
                          : "訪客請展開下方 ICCID 列輸入卡號查詢。"}
                      </p>
                    )}
                  </div>
                </SheetRow>

                <SheetRow
                  dotColor={GREEN}
                  title={
                    viewEsim?.iccidMasked
                      ? `ICCID ${viewEsim.iccidMasked}`
                      : iccid
                        ? `ICCID ${iccid.slice(0, 6)}…`
                        : "ICCID 卡號"
                  }
                  subtitle={
                    showOrderOk
                      ? "偏低時 LINE 通知"
                      : "點此輸入卡號查詢／開提醒"
                  }
                  open={showIccidForm}
                  onToggle={() => setShowIccidForm((v) => !v)}
                >
                  <form onSubmit={onSubmit}>
                    <input
                      id="line-iccid"
                      inputMode="numeric"
                      autoComplete="off"
                      value={iccid}
                      onChange={(e) =>
                        onIccidChange?.(
                          e.target.value.replace(/[^\d]/g, "").slice(0, 22),
                        )
                      }
                      placeholder="請輸入 19～20 碼 eSIM 卡號"
                      className="w-full rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC] px-4 py-3.5 text-[16px] tracking-wide outline-none focus:border-[#276EF1]"
                    />
                    {liffError ? (
                      <p className="mt-2 text-[12px] text-amber-800">
                        {liffError}
                      </p>
                    ) : null}
                    {error ? (
                      <p className="mt-2 text-[12px] text-red-600">{error}</p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={loading || !liffReady}
                      className="mt-3 w-full rounded-2xl border border-[#276EF1] bg-white py-3 text-[14px] font-black text-[#276EF1] disabled:opacity-60"
                    >
                      {loading ? (
                        <LoadingIndicator
                          layout="inline"
                          size="sm"
                          label="查詢中…"
                          className="justify-center w-full"
                          labelClassName="text-sm font-black text-[#276EF1]"
                          spinnerClassName="text-[#276EF1]"
                        />
                      ) : isWeb ? (
                        "查詢用量"
                      ) : (
                        "查詢並開啟 LINE 提醒"
                      )}
                    </button>
                  </form>
                </SheetRow>
              </div>
            </div>

            {result?.usageText ? (
              <pre className="mb-4 whitespace-pre-wrap rounded-2xl bg-[#F3F6FB] px-3.5 py-3 font-sans text-[12px] leading-relaxed text-[#5B6B82]">
                {result.usageText}
              </pre>
            ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 帳號列 + 主要 CTA（收合時也保留） */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={loggedIn ? onLogoutClick : onLoginClick}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0B1F40]"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-black text-[10px] font-black text-white">
              {loggedIn ? "IN" : "OUT"}
            </span>
            {loggedIn ? "已登入會員 ▾" : "訪客 · 點此登入 ▾"}
          </button>
          <span className="text-[15px] font-black text-[#0B1F40]">
            {viewUsage?.remainingMb != null
              ? formatMb(viewUsage.remainingMb)
              : "—"}
          </span>
        </div>

        {lineBindStatus === "error" && lineBindMessage ? (
          <p className="mb-2 text-[12px] text-red-600">{lineBindMessage}</p>
        ) : null}
        {orderError ? (
          <p className="mb-2 text-[12px] text-red-600">{orderError}</p>
        ) : null}

        <button
          type="button"
          onClick={onPrimary}
          disabled={
            !authReady ||
            lineBindStatus === "loading" ||
            bindLoading ||
            (loggedIn &&
              showBindSuccess &&
              (monitoringSelected ||
                (esims.length > 1 && !selectedTopupId)))
          }
          className="w-full rounded-2xl bg-gradient-to-b from-[#4C8DFF] to-[#276EF1] py-4 text-[15px] font-black tracking-wide text-white shadow-[0_8px_20px_rgba(39,110,241,0.35)] disabled:opacity-55"
        >
          {lineBindStatus === "loading" || bindLoading ? (
            <LoadingIndicator
              layout="inline"
              size="sm"
              label="處理中…"
              className="justify-center w-full"
              labelClassName="text-sm font-black text-white"
              spinnerClassName="text-white"
            />
          ) : (
            primaryLabel
          )}
        </button>
        {primarySubtext ? (
          <p className="mt-2 text-center text-[11px] leading-relaxed text-[#8A94A6]">
            {primarySubtext}
          </p>
        ) : null}

        {sheetExpanded ? (
          <motion.div
            key="sheet-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={SHEET_SPRING}
          >
            <p className="mt-3 text-center text-[11px] leading-relaxed text-[#8A94A6]">
              ICCID 可在手機「設定 → 行動服務 → eSIM」或購買信件中找到。
            </p>

            <nav
              className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-[#EEF1F6] pt-4 text-[12px] font-bold text-[#5B6B82]"
              aria-label="頁內快速連結"
            >
              <a href="/" className="hover:text-[#276EF1]">
                首頁
              </a>
              <a href="/product/" className="hover:text-[#276EF1]">
                eSIM 方案
              </a>
              <a href="/data-query/" className="hover:text-[#276EF1]">
                查詢用量
              </a>
              <a href="/account/" className="hover:text-[#276EF1]">
                會員中心
              </a>
            </nav>
          </motion.div>
        ) : null}
      </motion.section>

      <BindSuccessSheet
        open={bindSheetOpen && showBindSuccess}
        message={
          lineBindMessage ||
          "已連結官網會員與 LINE。請選一張 eSIM，再開啟流量提醒（一次只監控一張）。"
        }
        onClose={() => setBindSheetOpen(false)}
        onDone={() => setBindSheetOpen(false)}
      />
    </main>
  );
}
