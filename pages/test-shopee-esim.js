// pages/test-shopee-esim.js
import { useState } from "react";

export default function TestShopeeEsim() {
  const [orderNo, setOrderNo] = useState("250802QD69S537");
  const [email, setEmail] = useState("bob112722761236tom@gmail.com");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);
    try {
      const res = await fetch("/api/shopee-to-esim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopee_order_no: orderNo,
          email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 顯示完整錯誤資訊
        const detailedError = [
          data?.error && `❌ ${data.error}`,
          data?.message && `🧠 message: ${data.message}`,
          data?.stack && `📄 stack: ${data.stack}`,
          data?.response && `📦 response: ${JSON.stringify(data.response)}`,
        ]
          .filter(Boolean)
          .join("\n\n");

        throw new Error(detailedError || "發送失敗");
      }

      setResponse(data);
    } catch (err) {
      setError(err.message || "系統錯誤");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Shopee 訂單兌換測試</h1>
      <label>
        Shopee 訂單編號：
        <input
          type="text"
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          style={{ marginLeft: 10, padding: 4 }}
        />
      </label>
      <br />
      <label>
        收件 Email：
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginLeft: 10, padding: 4 }}
        />
      </label>
      <br />
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          marginTop: 20,
          padding: "8px 16px",
          backgroundColor: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: 4,
        }}
      >
        {loading ? "處理中…" : "提交兌換請求"}
      </button>

      {response && (
        <div
          style={{
            marginTop: 20,
            color: "green",
            whiteSpace: "pre-wrap",
            border: "1px solid #ccc",
            padding: 12,
            borderRadius: 4,
            background: "#f0fff4",
          }}
        >
          ✅ 成功：{JSON.stringify(response, null, 2)}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 20,
            color: "red",
            whiteSpace: "pre-wrap",
            border: "1px solid #ccc",
            padding: 12,
            borderRadius: 4,
            background: "#fff0f0",
          }}
        >
          ❌ 錯誤：{error}
        </div>
      )}
    </div>
  );
}
