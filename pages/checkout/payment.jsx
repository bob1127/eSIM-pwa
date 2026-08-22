"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../Layout";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

const STORAGE_KEY = "newebpay_checkout_payload";

/** 將藍新回傳的 HTML 以 form POST 送出（不覆寫 document，保留瀏覽紀錄） */
function submitNewebPayForm(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const srcForm = doc.getElementById("newebpay-form") || doc.querySelector("form");
  if (!srcForm?.action) {
    throw new Error("無法解析藍新付款表單");
  }

  const form = document.createElement("form");
  form.method = srcForm.method || "POST";
  form.action = srcForm.action;
  form.acceptCharset = "UTF-8";

  srcForm.querySelectorAll("input").forEach((input) => {
    const field = document.createElement("input");
    field.type = "hidden";
    field.name = input.name;
    field.value = input.value;
    form.appendChild(field);
  });

  document.body.appendChild(form);
  form.submit();
}

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("loading");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      let payload;
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setError("找不到結帳資料，請從購物車重新結帳。");
          setStatus("error");
          return;
        }
        payload = JSON.parse(raw);
      } catch {
        setError("結帳資料格式錯誤，請重新結帳。");
        setStatus("error");
        return;
      }

      try {
        const res = await fetch("/api/newebpay-generate-form", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalPrice: payload.amount,
            orderInfo: payload.orderInfo,
            customOrderId: payload.orderId,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "無法建立藍新付款表單");
        }

        const html = await res.text();
        setStatus("redirecting");
        submitNewebPayForm(html);
      } catch (err) {
        setError(err.message || "前往付款失敗");
        setStatus("error");
      }
    };

    run();
  }, []);

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center px-4 pb-20">
        <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          {status === "loading" && (
            <>
              <LoadingIndicator
                layout="center"
                label="正在前往藍新金流…"
                size="lg"
                className="mb-4"
                labelClassName="text-lg font-bold text-gray-900"
              />
              <p className="text-sm text-gray-500">請稍候，即將跳轉至安全付款頁面</p>
            </>
          )}

          {status === "redirecting" && (
            <>
              <h1 className="text-lg font-bold text-gray-900 mb-2">即將跳轉</h1>
              <p className="text-sm text-gray-500">若未自動跳轉，請稍候或重新整理</p>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="text-lg font-bold text-red-600 mb-2">無法前往付款</h1>
              <p className="text-sm text-gray-600 mb-6">{error}</p>
              <Link
                href="/Cart/"
                className="inline-block bg-[#1e40af] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1e3a8a]"
              >
                返回購物車
              </Link>
            </>
          )}

          <p className="text-xs text-gray-400 mt-8 leading-relaxed">
            瀏覽紀錄：購物車 → 本頁 → 藍新付款。
            <br />
            在藍新頁按「上一頁」會回到此頁，再按一次可回到購物車修改資料。
          </p>
        </div>
      </div>
    </Layout>
  );
}

export { STORAGE_KEY as NEWEBPAY_CHECKOUT_STORAGE_KEY };
