// pages/test-notify.tsx
import { useState } from "react";

export default function TestNotify() {
  const [result, setResult] = useState("");

  const handleClick = async () => {
    const res = await fetch("/api/newebpay-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Status: "SUCCESS",
        TradeInfo:
          "0bc6206f39137f21b9c132d05c817173d6c4b36e4cf9bcc1943c59c03dbfb83fb2f5fe7627f5fd59d826d57e5d0a152941bce405db4a35a6e7d7539f5a75acea88f02fc6525ed3f4c77cfe079ffca6be76b3954aba930bfab95f650f8d41659c560f03decc5ac5e9124d8b8a1d7a7837a55d3267d4e46faeaa24fbb5b115918cb4a611105a3b0a7eb65d21e1e58b7e18e171444367f1c7a837ddd0bb8a03126dc67a317dc1514a130b16a4a285583767c66534dcd0fe07ac057f06abfadff66ea203315163826b65be97e29603f589871d3604ab0335abb1a6117be5fbdf6061016ae238e7cffa02bb3784e5884b38214c58f82b92cf4b9fc29ff32d95470a56baf37193eaf162569c911e0aea6024ad2cac9ed9bc6abcb468f5878ff614d2a2554919e0b8efc1a3b389fa775ef8cfe33e17afbb7c415390090ede0eca0b4c2ed4ed4da280d2d49bee3c2d472f24fa8767d1f74c7e4dcf93d733ef87a6e4b23bf4cce3810259258c8170bf44e0d6576769e7352876b69771af3ef9fbc0cc1d6709f5501ccb27dbd6faa46d3d74af94b4f7e3961ec52534667d0d61c306038e79c2c853115fb86416f2c4fc15de4b33317e54b4e409b4fa722f2726df520d2252046f229641ff758914ac12db0257c1954f885a99104938a3af789ec2033f4028ebf077102a36c3dad76bc3fcdc4553494724e162749fb1e885c738d03a5f805e428b30eb343e4ab2c2480e3ac9e8886e3d069a3e96685731b77a0d20eb82fa50",
        TradeSha:
          "E5390E76F921346236C659E4538B2FD75F6C07DFF2DB404A39BBE8CD4D99E3CE", // 可省略，如後端未驗證
      }),
    });

    const text = await res.text();
    setResult(`狀態碼：${res.status}，回傳：${text}`);
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Notify 測試</h2>
      <button onClick={handleClick}>模擬觸發 notify API</button>
      <pre>{result}</pre>
    </div>
  );
}
