# SquadTaskAssistant (小隊任務助手)

這是一個可直接部署到 Render 的 LINE Bot 範本，功能包含：
- 任務建立、查詢、完成
- 每個任務自動在 Google Drive 建立子資料夾，並可上傳成果（檔名自動加上上傳者名稱）
- 提醒模式：group / personal / all
- 支援中 / 英語言切換

---

## 快速開始（部署到 Render）

1. Fork 或 clone 此 repo 到你的 GitHub。
2. 在你的專案中新增 Google 服務帳號金鑰 (JSON)，並放到專案中（或上傳到安全 storage）：
   - 建議將 service-account.json 的內容放到 Render 的 Secrets 中，或上傳到安全的 Google Cloud Storage，再在程式中讀取。
3. 在 Google Cloud Console：
   - 開啟 **Google Sheets API**、**Google Drive API**。
   - 建立一個 Service Account，下載 JSON。
   - 將 service account 的「client_email」授權為你要操作的 Google Sheet 的編輯權限，並對 Drive 有建立檔案的權限（通常給予 Editor）。
4. 在 Google Sheets 建立一份空白試算表（或使用初始化腳本），將 `SHEET_ID` 填入 `.env`。
5. 在 LINE Developers 建立 Messaging API Channel，取得 `LINE_ACCESS_TOKEN` 與 `LINE_SECRET`，把 webhook 指向 `https://<your-render-url>/webhook` 並啟用 webhook。
6. 在 Render 建立 Web Service：
   - Connect GitHub repo
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables: 把 `.env.template` 內容對應填入 Render 的 Environment。

---

## 檔案說明
- `app.js`：主要 webhook 與指令邏輯（starter）
- `utils/google.js`：與 Google Sheets / Drive 的整合（範例）
- `utils/line.js`：LINE 訊息建立器（Flex / text）
- `utils/reminder.js`：排程提醒（簡易版）
- `.env.template`：環境變數範本

---

## 語言切換
使用者可透過 `/lang zh` 或 `/lang en` 切換個人語言偏好（Bot 會根據設定回覆對應語言）。

---

## 注意事項與進階
- 請勿將 Service Account JSON 直接放到公開 repo；務必使用 Render Secrets 或其他安全機制。
- 若你希望支援大量使用者與高流量，建議使用 Cloud Run 或其他更具彈性的雲端平台，並搭配資料庫 (Postgres / Firestore) 以避免 Sheets 效能瓶頸。
- 欲加入更強的上傳驗證、權限控管、以及更完整的 UI（Flex Message），可以在 `utils/line.js` 擴充。

--- 
如果你要，我可以：
- 幫你初始化一個 Google Sheet 範例（CSV）並放進 ZIP（方便你手動上傳）
- 或直接把這個專案壓成 ZIP（我會在下方提供下載連結）