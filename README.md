# LINE Bot 增強版 🤖

一個功能豐富的 LINE Bot，包含任務管理、AI 對話、網路搜索和互動功能。

## 功能特色 ✨

### 📋 任務管理系統
- 每日任務追蹤（日文、健身、閱讀）
- 任務完成標記和取消
- 任務備註功能
- 進度統計分析

### 🤖 AI 對話功能
- **Gemini AI 整合**：使用 Google Gemini Pro 模型提供智能對話
- **備用回應系統**：當 AI 服務不可用時自動切換到規則式回應
- 支援多種對話主題（問候、程式設計、學習等）
- 隨機回應增加趣味性
- 情境感知回應
- 智能指令識別，避免不必要的 AI 調用

### 🔍 網路搜索功能
- 支援關鍵字搜索
- 模擬搜索結果（開發環境）
- 真實網路搜索（生產環境）
- 智能結果篩選

### ⚡ 互動功能
- 快速回覆按鈕
- 貼圖回應
- 時間查詢
- 鼓勵訊息
- 進度統計

## 安裝與設置 🚀

### 1. 安裝依賴
```bash
npm install
```

### 2. 設置環境變數
複製 `.env.example` 為 `.env` 並填入你的 LINE Bot 資訊：

```bash
cp .env.example .env
```

編輯 `.env` 文件：
```env
CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
CHANNEL_SECRET=your_channel_secret_here
PORT=3000

# AI 功能配置（可選）
GEMINI_API_KEY=your_gemini_api_key_here
ENABLE_AI_FEATURES=true

# 除錯設置（可選）
DEBUG_AI=false
NODE_ENV=development
```

### 3. 獲取 LINE Bot 憑證
1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立新的 Provider 和 Channel
3. 取得 Channel Access Token 和 Channel Secret
4. 設置 Webhook URL 為你的服務器地址 + `/webhook`

### 4. 啟動服務器
```bash
npm start
```

服務器將在 `http://localhost:3000` 啟動

## 使用指令 📝

### 基本指令
- `幫助` / `help` - 顯示功能列表
- `時間` / `time` - 查看現在時間

### 任務管理
- `查看任務` / `任務` / `tasks` - 查看今日任務
- `完成 [任務名]` - 標記任務為完成（例：完成 日文）
- `取消 [任務名]` - 取消任務完成標記
- `備註 [任務名] [內容]` - 添加任務備註
- `清除備註 [任務名]` - 清除任務備註
- `統計` / `stats` - 查看完成進度

### 搜索功能
- `搜索 [關鍵字]` - 搜索相關資訊（例：搜索 JavaScript 教學）

### 互動功能
- `貼圖` / `sticker` - 獲得隨機貼圖
- `鼓勵` / `加油` / `motivate` - 獲得鼓勵訊息
- 直接聊天 - AI 會根據內容智能回應

## 技術架構 🛠️

### 使用技術
- **Node.js** - 後端運行環境
- **Express.js** - Web 框架
- **LINE Bot SDK** - LINE Bot 開發工具
- **Axios** - HTTP 請求庫
- **Cheerio** - 網頁解析工具

### 項目結構
```
line-bot/
├── line-bot.js       # 主要服務器代碼
├── package.json       # 項目配置
├── .env.example       # 環境變數範例
├── .gitignore         # Git 忽略文件
└── README.md          # 項目說明
```

## 部署指南 🌐

### Heroku 部署
1. 安裝 Heroku CLI
2. 建立 Heroku 應用
```bash
heroku create your-linebot-name
```

3. 設置環境變數
```bash
heroku config:set CHANNEL_ACCESS_TOKEN=your_token
heroku config:set CHANNEL_SECRET=your_secret
```

4. 部署應用
```bash
git push heroku main
```

5. 設置 LINE Bot Webhook URL 為：
```
https://your-linebot-name.herokuapp.com/webhook
```

### 其他部署平台
- **Railway**: 支援一鍵部署
- **Render**: 提供免費方案
- **Vercel**: 適合無服務器部署
- **Google Cloud Run**: 容器化部署

## 自定義與擴展 🔧

### 添加新的任務類型
在 `initTasks` 函數中添加新任務：
```javascript
tasks[today] = {
  '日文': { done: false, note: '' },
  '健身': { done: false, note: '' },
  '閱讀': { done: false, note: '' },
  '新任務': { done: false, note: '' }  // 添加這行
};
```

### 整合真實 AI API
替換 `getAIResponse` 函數以使用：
- OpenAI GPT API
- Google Gemini API
- Anthropic Claude API

### 添加資料庫支援
可以整合：
- MongoDB
- PostgreSQL
- Redis（快取）

## 安全注意事項 🔒

1. **保護敏感資訊**
   - 不要將 `.env` 文件提交到版本控制
   - 定期輪換 API 金鑰

2. **Webhook 安全**
   - 驗證來自 LINE 的請求
   - 使用 HTTPS 連接

3. **錯誤處理**
   - 實現完整的錯誤日誌
   - 優雅地處理異常情況

## 故障排除 🔧

### 常見問題

**Q: Bot 無法回應**
A: 檢查 Webhook URL 設置和網路連接

**Q: 搜索功能不工作**
A: 確認網路訪問權限，或查看模擬搜索結果

**Q: 貼圖無法發送**
A: 確認 LINE Bot 配置正確

### 除錯模式
設置環境變數 `NODE_ENV=development` 啟用詳細日誌

## 授權協議 📄

MIT License - 詳見 LICENSE 文件

## 聯絡資訊 📧

如有問題或建議，請聯絡：
- GitHub Issues: [提交問題](https://github.com/your-username/line-bot/issues)
- Email: your-email@example.com

## 優化改進 🎯

### 代碼優化
- ✅ **模組化設計**：清晰的函數分離，易於維護和擴展
- ✅ **完整的錯誤處理**：所有關鍵操作都有 try-catch 保護
- ✅ **智能資源管理**：避免不必要的 AI API 調用
- ✅ **優雅的降級機制**：AI 服務失敗時自動使用備用系統
- ✅ **詳細的日誌記錄**：方便除錯和監控

### 性能優化
- ✅ **指令優先處理**：特定指令直接處理，不經過 AI
- ✅ **異步處理優化**：使用 async/await 確保非阻塞操作
- ✅ **資源節約**：開發模式下可關閉詳細日誌

### 功能增強
- ✅ **Gemini AI 整合**：支援 Google Gemini Pro 模型
- ✅ **改進的搜索功能**：支援模擬和真實搜索切換
- ✅ **更好的用戶體驗**：快速回覆按鈕、貼圖回應
- ✅ **完整的配置管理**：支援環境變數和開發/生產模式

## 更新日誌 📝

### v2.1.0 (最新優化版)
- ✅ **完整重構**：優化代碼結構和組織
- ✅ **改進 AI 系統**：更好的錯誤處理和備用機制
- ✅ **優化任務管理**：更清晰的狀態顯示和統計
- ✅ **增強配置選項**：支援更多環境變數配置
- ✅ **改進錯誤處理**：更友好的錯誤訊息和日誌
- ✅ **性能優化**：減少不必要的 API 調用
- ✅ **代碼品質**：完整的註解和文檔

### v2.0.0
- ✅ 新增 AI 對話功能（Gemini AI）
- ✅ 新增網路搜索功能
- ✅ 新增快速回覆按鈕
- ✅ 新增貼圖和圖片回應
- ✅ 新增進度統計功能
- ✅ 改善錯誤處理
- ✅ 完整的中文註解

### v1.0.0
- ✅ 基本任務管理功能
- ✅ 任務編輯指令