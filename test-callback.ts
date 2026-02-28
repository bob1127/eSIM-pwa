import handler from "./pages/api/newebpay-callback"; // 修改為實際路徑
import { Readable } from "stream";

const TradeInfo =
  "39d77da3c2b5099eb50688d78d897428e6bf8e898773dea7806d175ec08c4c829f499e993b663e8780fd085bd20ca75bf023da11db3b0a9c3f3f8fa78e6d64cd060ad5285fcc9798f087dd41206299b1cf42d18ddd36d11aef0990f0b387b50b0d4a9543619c15af0e84d5c30414f0b55ae5ccb221d6017ce02b2b57da10f5dbd6395f1e82ee53cbe29f1407649677c786758e4440f879fc67862e96b3324efd8882f1be31c75ac55e1c8273e1e407dbf168ea9b3d9d4b4101a798b9cd58bb5ccaf2c0581f0d1c4589223f7a3255c5c0ef14aabd61c29cb5eed84557542e47de28655cec80c6d69734fc3332d4d7848c1ee1e1e6c3b9aafdc39a016162884b35abe87477781583db5899e1e9e3a9475d09c8ce29463bd9bc82fde6d53682ffb5384c1b354cc96fb89cc0519ac086f010a236ac194efc8bc6cca748b5d00b883c3417f999b6ea15e688a71972530d753fb39ba1df8e81263ee560de4cb930d2d2";

function mockRequest(body: any) {
  const req = new Readable() as any;
  req.headers = { "content-type": "application/x-www-form-urlencoded" };
  req.method = "POST";
  req.url = "/api/newebpay-callback";
  req.body = body;
  req._read = () => {};
  return req;
}

function mockResponse(): any {
  const res: any = {};
  res.statusCode = 200;
  res.status = function (code: number) {
    this.statusCode = code;
    return this;
  };
  res.json = function (data: any) {
    console.log("✅ 測試結果：", data);
    return this;
  };
  res.send = function (data: any) {
    console.log("✅ send:", data);
    return this;
  };
  res.end = function (data?: any) {
    console.log("✅ end:", data || "");
    return this;
  };
  return res;
}

// 執行模擬呼叫
const req = mockRequest({ TradeInfo });
const res = mockResponse();

handler(req, res);