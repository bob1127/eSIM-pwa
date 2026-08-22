"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import { formatMb } from "@/lib/esimUsageFormat";

/**
 * LINE「開啟流量提醒」畫面（真頁與設計預覽共用）
 * 配色：寶藍＋白底卡片＋黃點綴（參考圖 1–3）
 */
const HERO_IMG = "/images/綁定通知.png";
const BLUE = "#2D55B8";
const YELLOW = "#F5D142";

const LineTrafficUsageCard = dynamic(() => import("./LineTrafficUsageCard"), {
  ssr: false,
  loading: () => (
    <section className="mb-3 rounded-[16px] bg-white p-4 shadow-sm">
      <LoadingIndicator
        layout="center"
        label="圖表載入中…"
        labelClassName="text-[13px] text-[#888888]"
      />
    </section>
  ),
});

function NoticeCard({ title, tag, children, footer, active, variant = "light" }) {
  const solid = variant === "blue";
  return (
    <div className="relative pl-6">
      <span
        className="absolute left-0 top-5 h-2.5 w-2.5 rounded-full"
        style={
          active || solid
            ? { backgroundColor: BLUE }
            : { border: "1.5px solid #C5CDD8", backgroundColor: "#fff" }
        }
      />
      <div
        className="rounded-[16px] p-4"
        style={
          solid
            ? { backgroundColor: BLUE }
            : { backgroundColor: "#fff", border: "1px solid #E6EAF2" }
        }
      >
        <div className="flex items-start justify-between gap-3">
          <p
            className="text-[15px] font-black"
            style={{ color: solid ? "#fff" : "#1A1A1A" }}
          >
            {title}
          </p>
          {tag ? (
            <span
              className="shrink-0 pt-0.5 text-[11px] tracking-wide"
              style={{ color: solid ? "rgba(255,255,255,0.7)" : "#AAAAAA" }}
            >
              {tag}
            </span>
          ) : null}
        </div>
        {children ? (
          <div
            className="mt-2 text-[13px] leading-relaxed"
            style={{ color: solid ? "rgba(255,255,255,0.9)" : "#555555" }}
          >
            {children}
          </div>
        ) : null}
        {footer ? <div className="mt-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export default function LineIccidScreen({
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
}) {
  const esims = Array.isArray(memberEsims) ? memberEsims : [];
  const usageMap = usageById || {};
  const [usageViewId, setUsageViewId] = useState("");

  useEffect(() => {
    if (!esims.length) {
      setUsageViewId("");
      return;
    }
    const exists = esims.some((e) => String(e.topupId) === String(usageViewId));
    if (!exists) {
      setUsageViewId(
        String(
          activeTopupId ||
            selectedTopupId ||
            esims[0].topupId ||
            "",
        ),
      );
    }
  }, [esims, usageViewId, activeTopupId, selectedTopupId]);

  const viewUsage =
    usageMap[usageViewId] ||
    usageMap[String(usageViewId)] ||
    result?.usage ||
    null;
  const showUsageChart = esims.length > 0 || viewUsage?.remainingMb != null;
  const viewName =
    esims.find((e) => String(e.topupId) === String(usageViewId))
      ?.productName ||
    viewUsage?.productName ||
    "";

  return (
    <main className="min-h-[100dvh] bg-[#FFCC00]">
      <section className="px-5 pt-7 pb-10">
        <h1 className="text-[26px] font-black leading-snug text-black">
          流量快沒了
          <br />
          LINE 立刻通知你
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-black/70">
          綁定會員或輸入 ICCID，偏低時從官方 LINE 提醒。
        </p>
        <img
          src={HERO_IMG}
          alt="綁定流量通知"
          className="mt-5 w-full"
        />
      </section>

      <section className="relative -mt-6 rounded-t-[32px] bg-white px-5 pb-10 pt-7">
      {memberBindOk || orderAlert?.ok ? (
        <div className="relative mb-3">
          {memberBindOk && orderAlert?.ok ? (
            <span className="absolute left-[4px] top-6 bottom-6 w-px bg-[#E6EAF2]" />
          ) : null}
          <div className="flex flex-col gap-3">
            {memberBindOk ? (
              <NoticeCard title="綁定成功" tag="完成" active variant="blue">
                {lineBindMessage ||
                  "已連結這個 LINE。若有多張 eSIM，請在下方選一張再開提醒。"}
              </NoticeCard>
            ) : null}
            {orderAlert?.ok ? (
              <NoticeCard
                title="已開啟偏低提醒"
                tag="注意"
                active={!memberBindOk}
              >
                {orderAlert.productName ? (
                  <p>
                    監控：
                    <span className="font-bold" style={{ color: BLUE }}>
                      {orderAlert.productName}
                    </span>
                  </p>
                ) : (
                  "剩餘流量偏低時，會從官方 LINE 通知您。"
                )}
              </NoticeCard>
            ) : null}
          </div>
        </div>
      ) : null}

      {esims.length > 0 ? (
        <section className="mb-3 rounded-[16px] bg-white p-4 shadow-[0_4px_16px_rgba(26,40,80,0.06)]">
          <h2 className="text-[16px] font-black text-[#1A1A1A]">
            選擇要提醒的 eSIM
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[#888888]">
            目前有 {esims.length} 張。通知同時只綁一張；剩餘流量可在下方切換查看。
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {esims.map((esim) => {
              const id = String(esim.topupId || "");
              const checked = selectedTopupId === id;
              const isActive = String(activeTopupId) === id;
              return (
                <label
                  key={id || esim.iccidMasked}
                  className="flex cursor-pointer items-start gap-3 rounded-[14px] border px-3.5 py-3.5"
                  style={
                    checked
                      ? {
                          borderColor: BLUE,
                          backgroundColor: "#EEF3FF",
                          borderWidth: 2,
                        }
                      : {
                          borderColor: "#E6EAF2",
                          backgroundColor: "#FFFFFF",
                          borderWidth: 1,
                        }
                  }
                >
                  <input
                    type="radio"
                    name="esim-alert"
                    className="mt-1"
                    style={{ accentColor: BLUE }}
                    checked={checked}
                    onChange={() => onSelectTopup?.(id)}
                  />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-black text-[#1A1A1A]">
                        {esim.productName}
                        {isActive ? (
                          <span
                            className="ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-[#1A1A1A]"
                            style={{ backgroundColor: YELLOW }}
                          >
                            監控中
                          </span>
                        ) : null}
                      </span>
                      {esim.iccidMasked ? (
                        <span className="mt-0.5 block text-[12px] text-[#888888]">
                          ICCID {esim.iccidMasked}
                        </span>
                      ) : null}
                      {usageMap[id]?.remainingMb != null ? (
                        <span
                          className="mt-0.5 block text-[12px] font-bold"
                          style={{ color: BLUE }}
                        >
                          剩餘 {formatMb(usageMap[id].remainingMb)}
                          {usageMap[id].totalMb != null
                            ? ` / ${formatMb(usageMap[id].totalMb)}`
                            : ""}
                        </span>
                      ) : null}
                    </span>
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      {showUsageChart ? (
        <LineTrafficUsageCard
          productName={viewName}
          usage={viewUsage}
          usageById={usageMap}
          esims={esims}
          viewId={usageViewId}
          onViewChange={setUsageViewId}
          loading={usageLoading}
          onRefresh={() => onRefreshUsage?.(usageViewId)}
        />
      ) : null}

      <section className="mb-3 rounded-[16px] bg-white p-4 shadow-[0_4px_16px_rgba(26,40,80,0.06)]">
        <div className="mb-1 flex justify-center">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: `${YELLOW}55` }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2h16l-2-2Z"
                stroke={YELLOW}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        <h2 className="text-center text-[16px] font-black text-[#1A1A1A]">
          一鍵綁定會員
        </h2>
        <p className="mt-1.5 text-center text-[12px] leading-relaxed text-[#888888]">
          Google、Facebook 或 Email
          註冊的會員，點此連結這個 LINE，並用本站訂單開啟提醒。
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onMemberBindClick}
            disabled={lineBindStatus === "loading" || !authReady}
            className="w-full rounded-full bg-[#06C755] py-3.5 text-sm font-black text-white hover:bg-[#05b34c] disabled:opacity-60"
          >
            {lineBindStatus === "loading" ? (
              <LoadingIndicator
                layout="inline"
                size="sm"
                label="綁定中…"
                className="justify-center w-full"
                labelClassName="text-sm font-black text-white"
                spinnerClassName="text-white"
              />
            ) : (
              "一鍵綁定官網會員 →"
            )}
          </button>
          {lineBindStatus === "error" && lineBindMessage ? (
            <p className="text-[12px] text-red-600">{lineBindMessage}</p>
          ) : null}
          <button
            type="button"
            disabled={bindLoading || (esims.length > 1 && !selectedTopupId)}
            onClick={onOneClickOrder}
            className="w-full rounded-full py-3.5 text-sm font-black text-white disabled:opacity-50"
            style={{ backgroundColor: BLUE }}
          >
            {bindLoading ? (
              <LoadingIndicator
                layout="inline"
                size="sm"
                label="設定中…"
                className="justify-center w-full"
                labelClassName="text-sm font-black text-white"
                spinnerClassName="text-white"
              />
            ) : esims.length > 1 ? (
              "開啟所選 eSIM 的提醒 →"
            ) : (
              "已有本站訂單？開啟提醒 →"
            )}
          </button>
          {orderError ? (
            <p className="text-[12px] leading-relaxed text-red-600">
              {orderError}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-[16px] bg-white p-4 shadow-[0_4px_16px_rgba(26,40,80,0.06)]">
        <form onSubmit={onSubmit}>
          <h2 className="text-[16px] font-black text-[#1A1A1A]">
            輸入 ICCID 查流量
          </h2>
          <p className="mt-1.5 mb-3 text-[12px] leading-relaxed text-[#888888]">
            不是會員、或其他通路購買，填卡號即可查詢並開啟提醒。
          </p>
          <label
            htmlFor="line-iccid"
            className="mb-2 block text-[13px] font-black text-[#1A1A1A]"
          >
            ICCID（19～20 碼）
          </label>
          <input
            id="line-iccid"
            inputMode="numeric"
            autoComplete="off"
            value={iccid}
            onChange={(e) =>
              onIccidChange?.(e.target.value.replace(/[^\d]/g, "").slice(0, 22))
            }
            placeholder="請輸入 eSIM 卡號"
            className="w-full rounded-[14px] border border-[#E6EAF2] bg-[#F6F8FC] px-4 py-3.5 text-[16px] tracking-wide outline-none"
            onFocus={(e) => {
              e.target.style.borderColor = BLUE;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#E6EAF2";
            }}
          />
          {liffError ? (
            <p className="mt-2 text-[12px] text-amber-800">{liffError}</p>
          ) : null}
          {error ? (
            <p className="mt-2 text-[12px] text-red-600">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !liffReady}
            className="mt-4 w-full rounded-full py-3.5 text-sm font-black text-white disabled:opacity-60"
            style={{ backgroundColor: BLUE }}
          >
            {loading ? (
              <LoadingIndicator
                layout="inline"
                size="sm"
                label="查詢中…"
                className="justify-center w-full"
                labelClassName="text-sm font-black text-white"
                spinnerClassName="text-white"
              />
            ) : (
              "查詢並開啟 LINE 提醒 →"
            )}
          </button>
        </form>
      </section>

      {result ? (
        <div className="mt-3">
          <NoticeCard
            title={result.alertEnabled ? "已查詢並開啟偏低提醒" : "已完成查詢"}
            tag={result.alertEnabled ? "完成" : "查詢"}
            active
          >
            <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#555555]">
              {result.usageText}
            </pre>
            {result.alertEnabled ? (
              <p className="mt-3">
                剩餘流量偏低時，會從官方 LINE 通知您（約每日檢查一次）。
              </p>
            ) : null}
          </NoticeCard>
        </div>
      ) : null}

      <p className="mt-5 px-1 text-[11px] leading-relaxed text-[#AAAAAA]">
        ICCID 可在手機「設定 → 行動服務 → eSIM」或購買信件中找到。
      </p>
      </section>
    </main>
  );
}
