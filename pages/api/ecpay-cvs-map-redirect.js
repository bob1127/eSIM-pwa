export default function handler(req, res) {
  const html = `
    <html>
      <body onload="document.forms[0].submit()">
        <form method="POST" action="https://logistics-stage.ecpay.com.tw/Express/map">
          <input type="hidden" name="MerchantID" value="3002607" />
          <input type="hidden" name="MerchantTradeNo" value="CVS${Date.now()}" />
          <input type="hidden" name="LogisticsType" value="CVS" />
          <input type="hidden" name="LogisticsSubType" value="FAMIC2C" /> <!-- 改成你要的類型 -->
          <input type="hidden" name="IsCollection" value="N" />
          <input type="hidden" name="ServerReplyURL" value="https://www.starislandbaby.com.tw/ecpay-cvs-map-return" />
          <input type="hidden" name="Device" value="0" />
        </form>
      </body>
    </html>
  `;
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
