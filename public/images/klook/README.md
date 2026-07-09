# Klook 聯盟圖片放置說明

## Excel 匯入流程（建議欄位）

| 欄位 | 說明 |
|------|------|
| 名稱 | 商品標題 |
| 圖片 | 檔名（放在 `jp/` 資料夾） |
| 分潤連結 | Klook 後台產生的完整 redirect URL |
| 價格 | 例：`NT$ 1,229 起` |
| 描述 | 活動亮點文字 |

匯入後編輯 `data/klook/jp.js` 加入對應商品，並補上 `location` 座標。

## 圖片路徑

- 日本：`public/images/klook/jp/{圖片檔名}`
- 範例：`/images/klook/jp/日本環球影城門票 Universal Studios Japan.png`
