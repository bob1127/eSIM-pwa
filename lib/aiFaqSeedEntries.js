/**
 * J寶 FAQ 種子（對齊官網條款／政策／教學頁全文細節）
 * source_note: seed:jeko-site-v2
 * 重跑 scripts/seed-ai-faq.mjs 會刪除同 source 舊列後重插
 *
 * 依據頁面：
 * /terms /refund-policy /privacy /qa /support /promo /about
 * /operation-ios /operation-shopee /data-query /shopee-qrcode
 * /contact /cooperation /register-distributor /missions（若存在）
 */
export const AI_FAQ_SEED_SOURCE = "seed:jeko-site-v2";

/** 正式站（與 PRODUCTION_SITE_URL 一致） */
const SITE = "https://www.jeko-esim.com.tw";

/**
 * @typedef {{ question: string, answer: string, keywords: string, sort_order: number, enabled?: boolean }} FaqSeed
 * @type {FaqSeed[]}
 */
export const AI_FAQ_SEED_ENTRIES = [
  // ═══════════════════════════════════════════
  // A. 基礎／購買／發票（terms + qa）
  // ═══════════════════════════════════════════
  {
    sort_order: 10,
    question: "什麼是 eSIM？出國還要換實體 SIM 卡嗎？",
    keywords: "什麼是eSIM,虛擬SIM,換卡,實體卡,開通",
    answer:
      `eSIM 是內建於手機的虛擬 SIM。購買 Jeko eSIM 後，以 Email 或會員中心取得的 QR Code／啟用資訊開通即可，無需更換實體 SIM 卡，適合日本、韓國、東南亞及全球旅遊上網。\n` +
      `詳見：${SITE}/qa/ 、${SITE}/terms/`,
  },
  {
    sort_order: 20,
    question: "付款成功後 eSIM 怎麼拿到？有寄實體卡嗎？",
    keywords: "交付,Email,QR Code,會員中心,實體SIM,寄送,數位商品",
    answer:
      `eSIM 為數位商品。付款成功後，系統會以 Email 或會員中心提供 QR Code／啟用資訊，沒有實體 SIM 卡寄送。\n` +
      `請確認結帳 Email 正確，並檢查垃圾郵件匣。條款：${SITE}/terms/`,
  },
  {
    sort_order: 25,
    question: "發貨要多久？是 24 小時發貨嗎？",
    keywords: "發貨,24HR,多久,QR何時,About",
    answer:
      `About 頁說明提供 24HR 快速發貨，指的是數位交付（QR／啟用資訊），不是實體寄送。實際以訂單信或會員中心收到 QR 為準。\n` +
      `${SITE}/about/`,
  },
  {
    sort_order: 30,
    question: "可以用哪些方式付款？有電子發票嗎？",
    keywords: "付款,信用卡,LINE Pay,電子發票,統編,發票抬頭,藍新",
    answer:
      `本平台接受信用卡、LINE Pay 等線上付款（由第三方金流如藍新等處理，平台不儲存完整卡號）。\n` +
      `支援開立電子發票：付款完成後依結帳填寫的 Email／會員資料開立；若需公司統編發票，請於結帳時正確填寫統一編號與發票抬頭。發票通知原則寄至您提供的 Email。\n` +
      `${SITE}/terms/ 、${SITE}/qa/`,
  },
  {
    sort_order: 40,
    question: "怎麼註冊／登入會員？",
    keywords: "註冊,登入,Google,Facebook,LINE,Email,帳號",
    answer:
      `可使用 Email，或 Google／Facebook／LINE 等第三方登入建立會員帳戶。請提供正確、完整 Email，並妥善保管帳號密碼；發現異常登入請立即聯繫客服。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 45,
    question: "各國方案天數、流量、覆蓋範圍以哪裡為準？",
    keywords: "商品頁,天數,流量,覆蓋,APN,漫遊,設定",
    answer:
      `各國 eSIM 方案之有效天數、流量、覆蓋範圍及啟用方式，以各商品頁面說明為準。\n` +
      `流量計算、漫遊設定及 APN 等請依商品說明或客服指引操作；因使用者自行設定錯誤所致問題，平台得協助排查但不保證即時恢復。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 50,
    question: "可以轉售或分享 eSIM 啟用資訊嗎？",
    keywords: "轉售,破解,複製,散布,啟用碼,非法",
    answer:
      `禁止轉售、破解、複製或非法散布 eSIM 啟用資訊；違反者本平台得終止服務並保留法律追訴權。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 55,
    question: "因電信商或天災導致無法上網，平台會全額賠償嗎？",
    keywords: "不可抗力,賠償,責任上限,電信商,天災",
    answer:
      `因電信商、天災、政策變更等不可抗力致服務中斷，本平台將盡力協調但不負完全賠償責任。因第三方電信或裝置問題，責任上限原則為該筆訂單已付金額（詳見服務條款）。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 60,
    question: "服務條款準據法與管轄法院是什麼？",
    keywords: "準據法,管轄,中華民國,消保法",
    answer:
      `本條款以中華民國法律為準據法。消費者得依消費者保護法向其住所地法院起訴；其餘依民事訴訟法相關規定定管轄。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 65,
    question: "Jeko eSIM 是哪裡的公司？方案大概有多少？",
    keywords: "關於,台灣,200種,原生,Jeko接口,about",
    answer:
      `Jeko 接口 eSIM 是台灣在地公司。提供日本、韓國原生高速吃到飽，以及泰國、越南、中國、香港等熱門目的地方案，熱銷種類多達 200 種以上。購買後取得 QR、掃描安裝、免換卡、免等實體寄送。亦整合住宿、包車等旅遊加值服務。\n` +
      `${SITE}/about/`,
  },
  {
    sort_order: 70,
    question: "購買前關於啟用時機要注意什麼？",
    keywords: "啟用時機,抵達後,效期,出國前,安裝",
    answer:
      `請先確認手機支援 eSIM；建議出國前完成安裝與設定。部分方案須抵達目的地後才啟用，請避免提前切換以免效期提早開始——實際以該商品頁說明為準。\n` +
      `${SITE}/about/ 、商品頁`,
  },

  // ═══════════════════════════════════════════
  // B. 相容／裝置（support）
  // ═══════════════════════════════════════════
  {
    sort_order: 100,
    question: "我的手機支援 eSIM 嗎？怎麼確認？",
    keywords: "支援,相容,EID,*#06#,解鎖,電信鎖,support",
    answer:
      `購買前請確認：(1) 裝置支援 eSIM；(2) 已解除電信鎖（非合約鎖機）。\n` +
      `最準確認：撥號輸入 *#06#，若畫面出現 EID，通常代表支援 eSIM。\n` +
      `亦可至相容機型列表查詢：${SITE}/support/（舊網址 /compatibility/ 會導向此頁）。\n` +
      `注意：中國大陸／香港／澳門版實體雙卡 iPhone 多數不支援 eSIM；台灣版三星 S23（含）以前多數不支援，請以 *#06# 為準。清單約每半年更新。`,
  },
  {
    sort_order: 105,
    question: "相容機型清單多久更新？自動偵測準嗎？",
    keywords: "每半年,更新,偵測,User-Agent,Beta",
    answer:
      `相容清單約每半年更新一次，請以 ${SITE}/support/ 頁面標註日期為準。\n` +
      `頁面上的一鍵偵測僅依瀏覽器 User-Agent 猜測機型，並非讀取硬體；iOS 常無法取得確切型號。最終仍以 *#06# 是否出現 EID 為準。`,
  },
  {
    sort_order: 110,
    question: "Pixel 9a／Google Pixel 可以裝 Jeko eSIM 嗎？可以一鍵安裝嗎？",
    keywords: "Pixel,Pixel 9a,Google Pixel,一鍵安裝,Android",
    answer:
      `Google Pixel 系列多數支援 eSIM（清單含 Pixel 9／9 Pro／9a 等），請仍以 *#06# 是否出現 EID 為最終確認：${SITE}/support/\n` +
      `安裝：用手機掃 Email／會員中心 QR；或若有「一鍵安裝」請用手機點擊（Android 官方安裝連結）。電腦無法完成系統安裝。\n` +
      `沒有「下載 Jeko APP 安裝 eSIM」、也沒有 .pkpass／Apple Wallet 票券安裝流程。教學：${SITE}/operation-shopee/`,
  },
  {
    sort_order: 120,
    question: "iPhone 支援嗎？陸港澳版本要注意什麼？",
    keywords: "iPhone,蘋果,陸版,港版,澳版,雙卡,XS,XR",
    answer:
      `多數 iPhone XS／XR 之後機型支援 eSIM，但仍請用 *#06# 確認有 EID，或查 ${SITE}/support/\n` +
      `中國大陸、香港、澳門版實體雙卡 iPhone 多數不支援 eSIM（少數機型除外）。下單前請確認設定內有「加入 eSIM」或關於本機可見 EID。`,
  },
  {
    sort_order: 130,
    question: "iPad 可以用 eSIM 嗎？",
    keywords: "iPad,Wi-Fi,Cellular,行動網路",
    answer:
      `僅 Wi-Fi + Cellular（行動網路）版 iPad 支援 eSIM；純 Wi-Fi 版不支援。機型列表見 ${SITE}/support/`,
  },
  {
    sort_order: 140,
    question: "筆電／Surface 支援 eSIM 嗎？",
    keywords: "Windows,Surface,筆電,ThinkPad,LTE,5G",
    answer:
      `${SITE}/support/ 列有部分 Windows 10/11 機種（如部分 Surface、ThinkPad、Latitude 等），須確認裝置內建 LTE/5G 模組且標示支援 eSIM。購買前請自行核對規格。`,
  },
  {
    sort_order: 150,
    question: "台灣版三星一定能裝 eSIM 嗎？",
    keywords: "三星,Samsung,台灣版,S23,S20,EID",
    answer:
      `相容清單含 Galaxy S20 起多款機型，但注意：台灣版三星 S23 系列（含）以前多數不支援 eSIM。請務必撥 *#06# 確認是否有 EID。\n` +
      `${SITE}/support/`,
  },
  {
    sort_order: 160,
    question: "安裝前系統版本有建議嗎？",
    keywords: "iOS16,Android12,規格表,Pixel4,S20",
    answer:
      `依 ${SITE}/operation-shopee/ 規格表初步參考：iPhone XR 以上且 iOS 16 以上；Samsung Galaxy S20 以上且 Android 12 以上（部分機型）；Google Pixel 4 以上且 Android 12 以上。\n` +
      `實際仍以商品頁說明、機型相容清單與 *#06#／EID 為準。`,
  },

  // ═══════════════════════════════════════════
  // C. 安裝教學（operation-ios / operation-shopee + 產品 UI）
  // ═══════════════════════════════════════════
  {
    sort_order: 200,
    question: "怎麼安裝 eSIM？有哪些方式？",
    keywords: "安裝,QR,掃碼,SM-DP,啟用碼,教學",
    answer:
      `建議在國內網路穩定時先安裝。常見方式：\n` +
      `1. 設定 → 行動服務 → 加入 eSIM → 使用行動條碼 → 掃 Email／會員中心 QR\n` +
      `2. 用手機相機直接掃 QR\n` +
      `3. 郵件中長按 QR 選加入 eSIM（視系統）\n` +
      `4. 手動輸入訂單信的 SM-DP+ 與啟用碼\n` +
      `5. 若有「一鍵安裝」：請用手機開啟（電腦請改掃 QR）\n` +
      `iPhone：${SITE}/operation-ios/ ；通用：${SITE}/operation-shopee/\n` +
      `請勿依賴不存在的「Jeko 專屬安裝 APP」或 .pkpass 說明。`,
  },
  {
    sort_order: 205,
    question: "為什麼建議出國前先安裝？",
    keywords: "事前安裝,穩定訊號,出國前,網路",
    answer:
      `eSIM 安裝需要穩定網路（Wi-Fi 或行動數據）。建議在國內先完成安裝，避免抵達國外後因訊號差而無法安裝。\n` +
      `${SITE}/operation-ios/ 、${SITE}/operation-shopee/`,
  },
  {
    sort_order: 210,
    question: "iPhone 怎麼安裝 Jeko eSIM？",
    keywords: "iPhone安裝,iOS,行動服務,加入eSIM,相機",
    answer:
      `建議出發前在國內完成。常用路徑：設定 → 行動服務（或蜂窩網路）→ 加入 eSIM／加入行動方案 → 使用行動條碼 → 掃描 Email 中的 QR。\n` +
      `亦可：用 iPhone 相機掃 QR；郵件中長按 QR；或「打開照片」選 QR 圖安裝。\n` +
      `完整圖解：${SITE}/operation-ios/`,
  },
  {
    sort_order: 215,
    question: "iOS 長按郵件 QR 加入 eSIM 要哪個版本？",
    keywords: "iOS17.4,長按,加入eSIM,郵件",
    answer:
      `長按郵件中的 eSIM QR Code，在提示中選「加入 eSIM」，適用 iOS 17.4 及以上版本。較舊系統請改用相機掃碼或設定內「使用行動條碼」。\n` +
      `${SITE}/operation-ios/`,
  },
  {
    sort_order: 220,
    question: "可以用「照片」裡的 QR 圖安裝嗎？",
    keywords: "照片,圖庫,QR,打開照片",
    answer:
      `可以。設定 → 行動服務 → 加入 eSIM → 使用行動條碼 → 打開照片 → 選取含 QR 的照片即可。\n` +
      `${SITE}/operation-ios/`,
  },
  {
    sort_order: 225,
    question: "一鍵安裝 eSIM 要怎麼用？電腦可以嗎？",
    keywords: "一鍵安裝,手機,電腦,esimsetup",
    answer:
      `若訂單信或會員中心／eSIM 面板顯示「一鍵安裝」，請用手機開啟該連結完成系統安裝（iOS／Android 官方安裝頁）。\n` +
      `電腦無法完成 eSIM 系統安裝：請改用手機掃描 QR。若該方案沒有一鍵連結，請掃 QR 或手動輸入 SM-DP+／啟用碼。`,
  },
  {
    sort_order: 230,
    question: "安裝後要設定 eSIM 標籤嗎？",
    keywords: "標籤,行動服務,jeko eSIM,辨識",
    answer:
      `啟用後可在行動服務清單為旅遊 eSIM 設定自訂標籤（例如「jeko eSIM」），方便與門號區分。\n` +
      `${SITE}/operation-shopee/`,
  },
  {
    sort_order: 235,
    question: "怎麼確認 iPhone 已解除電信鎖？",
    keywords: "解鎖,電信業者鎖定,沒有SIM卡限制,iPhone",
    answer:
      `設定 → 一般 → 關於本機 →「電信業者鎖定」若顯示「沒有 SIM 卡限制」，代表已解鎖，可使用其他業者的 eSIM／SIM。\n` +
      `${SITE}/operation-shopee/`,
  },
  {
    sort_order: 240,
    question: "Android 怎麼確認已解鎖？",
    keywords: "Android,解鎖,SIM測試,電信商",
    answer:
      `可向銷售商／電信業者確認是否已解鎖；或插入其他業者實體 SIM，若可正常通話與收發簡訊，通常已解鎖。仍鎖網的裝置可能無法正常使用其他業者的 eSIM。\n` +
      `${SITE}/operation-shopee/`,
  },
  {
    sort_order: 245,
    question: "無法掃 QR 時手動安裝要輸入什麼？",
    keywords: "手動安裝,SM-DP,啟用碼,activation",
    answer:
      `在設定加入 eSIM 時選擇手動輸入，填寫訂單信／啟用資訊中的 SM-DP+ 位址與啟用碼（Activation Code）。請勿外流給他人。\n` +
      `${SITE}/operation-shopee/`,
  },
  {
    sort_order: 250,
    question: "安裝後沒訊號／連不上怎麼辦？",
    keywords: "沒訊號,連線,漫遊,APN,排查",
    answer:
      `請先確認：已選取旅遊 eSIM 為資料門號、必要時開啟漫遊（依商品說明）、重開機、仍在方案效期與覆蓋地區內。\n` +
      `細節以商品頁為準；自行設定錯誤時平台可協助排查但不保證即時恢復。可傳設定／錯誤截圖給智慧客服，或於客服時段聯繫官方 LINE／信箱。\n` +
      `${SITE}/terms/`,
  },

  // ═══════════════════════════════════════════
  // D. 退換貨（refund-policy + terms + refundPolicy.js）
  // ═══════════════════════════════════════════
  {
    sort_order: 300,
    question: "可以退款嗎？原生 eSIM 和非原生有什麼差別？",
    keywords: "退款,退換貨,原生,漫遊,非原生,激活,安裝",
    answer:
      `請先看商品頁是否標示「原生 eSIM／原生卡／當地 IP 原生」。\n` +
      `【非原生／漫遊】未安裝＝可全額退；已安裝但未激活＝可全額退；已激活＝原則不退。連線問題由客服排查，視情況更換 eSIM 或部分退款。\n` +
      `【原生】售出後（交付 QR／安裝碼後）概不退款或換貨。\n` +
      `完整：${SITE}/refund-policy/ ；條款：${SITE}/terms/`,
  },
  {
    sort_order: 305,
    question: "什麼是原生 eSIM？和漫遊 eSIM 差在哪？",
    keywords: "原生,漫遊,當地IP,電信商,延遲",
    answer:
      `商品頁標示「原生 eSIM／原生卡／當地 IP 原生」者，通常走當地電信原生線路，延遲較低；此類商品售出後概不退換。\n` +
      `其餘多為漫遊／非原生，退款依「是否安裝／是否激活」判定。選購請詳讀商品頁。\n` +
      `${SITE}/refund-policy/`,
  },
  {
    sort_order: 310,
    question: "手機不相容、未解鎖、設定錯誤或自己刪除 eSIM，可以退嗎？",
    keywords: "不相容,解鎖,刪除,設定錯誤,不退",
    answer:
      `裝置不相容、未解除電信鎖、設定錯誤、自行刪除 eSIM 等，原則不在退款範圍。連線問題請依客服排查流程處理。\n` +
      `${SITE}/refund-policy/`,
  },
  {
    sort_order: 320,
    question: "如何申請退款？要多久入帳？",
    keywords: "申請退款,會員中心,LINE,工作天,手續費",
    answer:
      `會員：登入後至會員中心「我的 eSIM」申請。非會員：先加入官方 LINE，或寄 support@jeko-esim.com.tw／info@bluelink.com.tw，或 ${SITE}/contact/?tab=refund ，備妥訂單編號與購買 Email。\n` +
      `建議信主旨：【eSIM 退款申請】訂單編號 XXXXX。退換貨客服時段：週一至週五 10:00–18:00（國定假日除外）。\n` +
      `審核通過後經原付款方式約 7～14 個工作天入帳；金流手續費（約 2.8%）可能無法全額退回。\n` +
      `${SITE}/refund-policy/`,
  },
  {
    sort_order: 325,
    question: "會員線上申請退款的期限是幾天？已開通還能申請嗎？",
    keywords: "7日,30日,未開通,爭議,舉證,會員中心",
    answer:
      `會員系統申請窗（與政策頁「安裝／激活」條件並用）：\n` +
      `• 未掃描／未標記開通：購買後約 7 日內可申請全額退。\n` +
      `• 已開通，或超過 7 日：約 30 日內可提售後／爭議（須上傳截圖等舉證，不保證退款）。\n` +
      `• 超過期限：無法線上申請。\n` +
      `原生 eSIM 仍以「售出後概不退換」為準。政策：${SITE}/refund-policy/`,
  },
  {
    sort_order: 330,
    question: "待付款訂單可以取消嗎？QR 還沒寄到可以退嗎？",
    keywords: "待付款,取消訂單,QR尚未,供應商",
    answer:
      `「待付款」可直接取消，不產生費用。\n` +
      `已付款但 QR 尚未發送、且尚未向供應商下單的極短時間內，請立即聯繫客服，符合條件可取消並全額退（原生／非原生同）。\n` +
      `${SITE}/refund-policy/`,
  },
  {
    sort_order: 335,
    question: "退款後電子發票怎麼辦？部分退款呢？",
    keywords: "發票,折讓,作廢,部分退款",
    answer:
      `全額退款時，已開立之電子發票將依稅法規定辦理折讓或作廢。部分退款則就退款金額開立折讓單。\n` +
      `${SITE}/refund-policy/`,
  },
  {
    sort_order: 340,
    question: "透過夥伴賣場或折扣碼買的，退款規則不同嗎？",
    keywords: "夥伴,分潤,Clawback,退款,專屬商店",
    answer:
      `審核標準與官網相同。已退款訂單不計入夥伴分潤；若分潤已結算匯出後才退款，平台得自後續應付分潤扣回（Clawback）或要求返還溢領。夥伴不得承諾與平台衝突之退款條件。\n` +
      `${SITE}/refund-policy/ 、${SITE}/terms/`,
  },

  // ═══════════════════════════════════════════
  // E. 流量／提醒（data-query）
  // ═══════════════════════════════════════════
  {
    sort_order: 400,
    question: "怎麼查詢 eSIM 剩餘流量？",
    keywords: "流量,用量,ICCID,data-query,剩餘",
    answer:
      `請至 ${SITE}/data-query/ ，輸入 ICCID（通常 19～20 碼，可在 Email 或手機 eSIM 設定找到）。\n` +
      `顯示已用／剩餘／效期；資料非即時，通常延遲約 30 分鐘至數小時（台灣時間 UTC+8）。建議與手機內建用量對照。亦可於會員中心／eSIM 面板查看本站訂單。`,
  },
  {
    sort_order: 405,
    question: "流量查詢頁有哪些功能分頁？",
    keywords: "data-query,分頁,充值,教學,提醒",
    answer:
      `${SITE}/data-query/ 包含：查詢用量、流量提醒、流量充值（即將上線）、使用教學等區塊。充值目前尚無法線上完成加購。`,
  },
  {
    sort_order: 410,
    question: "流量提醒／偏低通知怎麼開？誰可以用？",
    keywords: "流量提醒,推播,Web Push,LINE,綁定,會員,一次一張",
    answer:
      `可在 ${SITE}/data-query/ 或 eSIM 面板開啟流量偏低提醒（Web Push 或官方 LINE）。\n` +
      `通常需登入會員並允許通知；訪客無法開啟。綁定本站一張 eSIM（一次僅一張）；無本站訂單可手動輸入 ICCID。\n` +
      `官方 LINE 亦可依引導「一鍵綁定」會員或貼上 ICCID。`,
  },
  {
    sort_order: 420,
    question: "可以線上為 eSIM 充值流量嗎？",
    keywords: "充值,加購流量,續購,即將上線",
    answer:
      `流量充值功能目前標示「即將上線」，尚無法在網站完成加購。若流量不足，請依商品頁說明聯繫客服或選購適合的新方案。\n` +
      `${SITE}/data-query/`,
  },
  {
    sort_order: 430,
    question: "出國怎麼省流量？",
    keywords: "省流量,離線地圖,480p,短影音",
    answer:
      `教學建議：出發前用 Wi-Fi 下載離線地圖；關閉短影音自動播放；串流影片調至約 480p。頁面上的用量對照表為含緩衝之參考估算。\n` +
      `${SITE}/data-query/`,
  },

  // ═══════════════════════════════════════════
  // F. 優惠／任務／拉霸（promo）
  // ═══════════════════════════════════════════
  {
    sort_order: 500,
    question: "新會員 50 元折扣怎麼領？一定要加官方 LINE 嗎？",
    keywords: "新會員,50元,折價券,LINE,promo",
    answer:
      `新會員完成註冊後系統發放一張 NT$50 折價券；使用前須加入並連結 Jeko eSIM 官方 LINE。\n` +
      `同一人／會員／LINE 終身限領限用一次，上限 NT$50，不會疊加為 100。不得折現或轉讓。\n` +
      `規則：${SITE}/promo/`,
  },
  {
    sort_order: 505,
    question: "新會員 50 元「先註冊」和「先加 LINE」差在哪？會變 100 嗎？",
    keywords: "情境A,情境B,疊加,50",
    answer:
      `情境 A：先完成會員註冊 → 發券 → 須加官方 LINE 才能於結帳使用。\n` +
      `情境 B：已加官方 LINE 再註冊 → 領用同一張新會員禮遇券。\n` +
      `不會因兩種路徑各領一張而變成 100 元。詳見 ${SITE}/promo/ 活動規則。`,
  },
  {
    sort_order: 510,
    question: "只加官方 LINE 還沒註冊，會另外發折價券嗎？",
    keywords: "加好友,未註冊,折價券",
    answer:
      `不會。僅加好友、尚未完成會員註冊者，不會因加好友另發第二張可折抵券；需完成註冊後領用同一張新會員禮遇。\n` +
      `${SITE}/promo/`,
  },
  {
    sort_order: 515,
    question: "封鎖或刪除官方 LINE 後還能用新會員券嗎？",
    keywords: "封鎖,刪除好友,LINE,折價券",
    answer:
      `使用前須維持可驗證之官方 LINE 好友狀態。若封鎖、刪除好友或無法驗證為好友，則無法套用該折價券。\n` +
      `${SITE}/promo/`,
  },
  {
    sort_order: 520,
    question: "NEW50／FIRST50 能和新會員 50 元券一起用嗎？",
    keywords: "NEW50,FIRST50,併用,擇一",
    answer:
      `若公開碼與新會員券同屬「新會員 50」性質，原則擇一使用，不得重複折抵。與拉霸等其他活動是否可同時套用，以各活動規則及結帳系統為準。\n` +
      `${SITE}/promo/`,
  },
  {
    sort_order: 525,
    question: "新會員券可以轉讓嗎？濫用會怎樣？",
    keywords: "轉讓,折現,防弊,濫用",
    answer:
      `不得折現、轉售、轉讓或換現金。同一 Email／LINE 或合理認定為同一使用者終身一次。若發現異常濫用，平台得停發、取消未用券、撤銷折抵或依服務條款處理。\n` +
      `${SITE}/promo/ 、${SITE}/terms/`,
  },
  {
    sort_order: 530,
    question: "拉霸抽獎一定要登入嗎？",
    keywords: "拉霸,抽獎,登入,優惠券",
    answer:
      `${SITE}/promo/ 拉霸活動需登入會員才能參加；未登入會提示先登入。中獎優惠券寫入會員帳戶，實際獎項與規則以當期活動頁為準。`,
  },
  {
    sort_order: 540,
    question: "任務牆要怎麼參加？一定要先註冊網站嗎？",
    keywords: "任務牆,missions,LINE,體驗",
    answer:
      `若站上有任務牆（／missions／），資格可能標示為加入官方 LINE 即可，不一定要先註冊網站；若任務需會員會另標示。流程通常為：加 LINE → 選任務 → 完成後審核，再以 Email／LINE 通知。實際以任務頁當期說明為準。`,
  },

  // ═══════════════════════════════════════════
  // G. 蝦皮兌換
  // ═══════════════════════════════════════════
  {
    sort_order: 600,
    question: "蝦皮買的 eSIM 怎麼兌換 QR Code？",
    keywords: "蝦皮,兌換,訂單編號,shopee,QRCode",
    answer:
      `請至 ${SITE}/shopee-qrcode/ ，輸入蝦皮訂單編號（必填）與收件信箱（選填；留空則使用蝦皮訂單信箱）。\n` +
      `每筆訂單僅能兌換一次；已兌換不會重複產生 QR 或重寄。訂單編號可在蝦皮訂單詳情查看。若查無資料請聯繫客服並附訂單截圖。`,
  },
  {
    sort_order: 610,
    question: "蝦皮「訂單編號兌換」和教學頁寫的「兌換碼即將上線」差在哪？",
    keywords: "蝦皮,兌換碼,訂單編號,即將上線,operation-shopee",
    answer:
      `${SITE}/shopee-qrcode/ ：以「蝦皮訂單編號」兌換並寄送 QR（每單一次），目前可使用。\n` +
      `${SITE}/operation-shopee/ 內若標示「兌換碼→QR」建置中／即將上線，指的是另一種兌換碼教學流程，與訂單編號兌換頁不同。請依實際購買管道使用對應頁面，勿混淆。`,
  },

  // ═══════════════════════════════════════════
  // H. 隱私
  // ═══════════════════════════════════════════
  {
    sort_order: 700,
    question: "個資怎麼保護？會不會存信用卡號？",
    keywords: "隱私,個資,信用卡,藍新,LINE Pay",
    answer:
      `交易由第三方金流（如藍新、LINE Pay）處理，平台不儲存完整卡號。我們不會出售或出租個資；履約必要時可能提供給 Supabase、金流、eSIM 供應商（如 MicroEsim）、Email 發送服務等。\n` +
      `${SITE}/privacy/`,
  },
  {
    sort_order: 705,
    question: "隱私政策適用哪些管道？",
    keywords: "隱私,適用範圍,/p/,App,LINE",
    answer:
      `適用官網（含夥伴賣場 /p/代碼）、行動應用程式、LINE 官方帳號及客服管道等。詳見 ${SITE}/privacy/（/privacy-policy/ 會導向此頁）。`,
  },
  {
    sort_order: 710,
    question: "平台會蒐集哪些個人資料？",
    keywords: "蒐集,帳號,訂單,Cookie,客服",
    answer:
      `可能包含：帳號資料（Email、暱稱、加密密碼；第三方登入之公開基本資料）、訂單與發票／eSIM 啟用相關資料、夥伴申請資料、技術紀錄（IP、Cookie 等）、客服互動內容。\n` +
      `${SITE}/privacy/`,
  },
  {
    sort_order: 715,
    question: "Cookie 可以關閉嗎？",
    keywords: "Cookie,登入,瀏覽器",
    answer:
      `您可透過瀏覽器設定拒絕 Cookie，但登入狀態等功能可能因此無法正常運作。\n` +
      `${SITE}/privacy/`,
  },
  {
    sort_order: 720,
    question: "個人資料保存多久？",
    keywords: "保存,5年,客服紀錄,交易",
    answer:
      `會員資料於帳號存續期間及刪除後法定必要期間保存；交易紀錄依法至少保存 5 年；夥伴資料於合作期間及終止後合理期間；客服紀錄通常 1～3 年。\n` +
      `${SITE}/privacy/`,
  },
  {
    sort_order: 725,
    question: "如何查閱、更正或刪除我的個資？",
    keywords: "個資權利,刪除帳號,更正,查詢",
    answer:
      `依個人資料保護法，您可查詢、閱覽、製給複製本、更正補充、請求停止蒐集／處理／利用或刪除（法定應保存者除外）。請經客服 Email 或官方 LINE 提出，我們將於合理期間回覆。\n` +
      `${SITE}/privacy/`,
  },
  {
    sort_order: 730,
    question: "未成年人可以使用服務嗎？",
    keywords: "未成年,18歲,法定代理人",
    answer:
      `服務主要面向成年人。未滿 18 歲請在法定代理人同意下使用；本平台不會故意蒐集未成年人個資。\n` +
      `${SITE}/privacy/`,
  },

  // ═══════════════════════════════════════════
  // I. 客服／聯絡
  // ═══════════════════════════════════════════
  {
    sort_order: 800,
    question: "客服怎麼聯絡？營業時間？",
    keywords: "客服,LINE,信箱,聯絡,營業時間,工作天",
    answer:
      `官方 LINE、客服信箱 support@jeko-esim.com.tw、藍鏈 info@bluelink.com.tw，或 ${SITE}/contact/\n` +
      `表單／Email 回覆約 1～3 個工作天。退換貨相關客服時段（退換貨政策）：週一至週五 10:00–18:00（國定假日除外）。\n` +
      `官網智慧客服（J寶）可 24 小時諮詢 eSIM／安裝等；非人工時段真人回覆可能較慢。`,
  },
  {
    sort_order: 810,
    question: "聯絡我們有哪些分頁？",
    keywords: "contact,一般諮詢,夥伴,退換款,分頁",
    answer:
      `${SITE}/contact/ 含：一般諮詢、合作夥伴申請（?tab=partner）、退換款聯繫（?tab=refund）。\n` +
      `一般類別可含購買、訂單／出貨、安裝連線、異業合作、其他。成功送出後約 1～3 個工作天以 Email 回覆。`,
  },
  {
    sort_order: 820,
    question: "營運主體與客服信箱是誰？",
    keywords: "藍鏈,support,info@bluelink,主體",
    answer:
      `Jeko eSIM 客服：support@jeko-esim.com.tw。藍鏈數位企業社：info@bluelink.com.tw。官方 LINE 見站上連結（如條款／聯絡頁）。\n` +
      `${SITE}/terms/ 、${SITE}/contact/`,
  },

  // ═══════════════════════════════════════════
  // J. 合作夥伴（terms 詳細數字）
  // ═══════════════════════════════════════════
  {
    sort_order: 900,
    question: "合作夥伴有哪兩種模式？網址格式？",
    keywords: "/r/,/p/,專屬連結,專屬商店,夥伴",
    answer:
      `（1）專屬折扣碼連結：${SITE}/r/您的代碼（代碼亦可當折扣碼）。\n` +
      `（2）專屬商店：${SITE}/p/您的代碼。\n` +
      `申請時選定模式；變更須經平台書面同意並重新審核。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 910,
    question: "專屬連結分潤與歸因怎麼算？",
    keywords: "Cookie,30天,15%,分潤,折扣碼,10%",
    answer:
      `旅客經專屬連結進站可自動帶入折扣碼，亦可結帳手動輸入。折抵趴數依核准（例如全單 10%）。歸因有效期目前 Cookie 約 30 天（以當時公告為準）。\n` +
      `分潤原則以產品成本×核准分潤趴且不超過毛利；對外參考約訂單實付 15%（依方案與折扣略異）。此模式不適用達標加碼。儀表板為預估，實際以對帳單為準。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 920,
    question: "專屬商店的利潤怎麼來？",
    keywords: "專屬商店,加價,底價,金流,利潤",
    answer:
      `夥伴可自訂加價；原則利潤＝商店實付 − 平台底價 − 金流手續費。原則上僅旅客於該專屬商店完成結帳之訂單計入分潤。不得誤導價格／流量／品牌歸屬。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 930,
    question: "分潤何時對帳、何時匯款？",
    keywords: "次月15,對帳單,10工作天,成交月,提領",
    answer:
      `以訂單建立日所屬台北曆月為成交月；該月訂單於次月 15 日結算並產製對帳單。後台申請提領後，目標 10 個工作天內人工匯入（金融假日得順延）。匯款前須確認對帳單與收款帳戶。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 940,
    question: "提領最低金額、上限與手續費？",
    keywords: "3000,20000,10天,手續費15,提領",
    answer:
      `最低提領 NT$3,000、單次上限 NT$20,000；訂單建立後滿 10 日曆天始計入可提領餘額。台北曆月第 1 次提領免手續費；第 2 次起每次自提領金額扣 NT$15。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 950,
    question: "哪些訂單算應付分潤？退款後呢？",
    keywords: "已完成,退款,扣抵,分潤範圍",
    answer:
      `原則僅計入「已完成」且未退款之訂單。取消、未完成、退款等不計入。若分潤已匯出後始退款，平台得自後續應付分潤扣抵，或要求返還溢領。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 960,
    question: "匯款備註長什麼樣子？",
    keywords: "JEKO-YYYYMM,備註,對帳,轉帳",
    answer:
      `由平台於轉帳備註欄填寫識別碼，格式 JEKO-YYYYMM-夥伴代碼（例如 JEKO-202607-JEEK），供雙方對帳，並非要求夥伴填寫。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 970,
    question: "夥伴自訂文章／上傳內容誰負責？",
    keywords: "自訂文章,免責,著作權,違法",
    answer:
      `經開通「自訂文章」後，內容由夥伴自負真實性與合法授權，不代表平台審核或背書。若用於非法用途或無權素材，民刑事與賠償概由夥伴承擔；Jeko／藍鏈不負連帶責任。平台得下架、停權並追償。\n` +
      `${SITE}/terms/`,
  },
  {
    sort_order: 980,
    question: "怎麼申請當夥伴？審核多久？",
    keywords: "申請夥伴,register-distributor,審核,Email驗證",
    answer:
      `可至 ${SITE}/contact/?tab=partner 洽詢，或使用線上申請頁（如 /register-distributor/，含 Email 驗證、選連結／商店、設定代碼）。\n` +
      `聯絡頁文案約 1～3 工作天；註冊申請頁若標示 1–2 工作天，以各頁當期說明為準。通過後可登入夥伴後台。`,
  },
  {
    sort_order: 990,
    question: "夥伴申請身分有哪些？",
    keywords: "KOL,團媽,旅行社,包車,飯店,夥伴身分",
    answer:
      `聯絡頁夥伴申請常見身分：IG KOL／網紅、團媽／開團主、部落客／自媒體、旅行社、包車／租車、飯店／住宿、其他。\n` +
      `${SITE}/contact/?tab=partner`,
  },
];
