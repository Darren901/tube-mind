# TubeMind - 智慧 YouTube 影片摘要與 AI 導讀助理

TubeMind 是一個強大的 YouTube 影片處理平台，利用最新的 AI 技術協助使用者快速獲取影片精華。除了自動生成摘要，它還支援與影片內容進行即時 AI 對話，並提供高品質的語音導讀服務。

---

## ✨ 核心功能

### 🤖 智慧摘要與分析
- **自動摘要**: 利用 Google Gemini 2.5 Flash 模型，精準提取影片核心觀點與詳細內容。
- **時間點對照**: 摘要內容與影片時間點直接關聯，點擊即可跳轉觀看。
- **標籤系統**: AI 自動為摘要分類，並支援使用者自訂標籤管理。

### 💬 AI 內容問答
- **情境對話**: 在閱讀摘要的同時，可以直接與 AI 聊天，詢問關於該影片的任何細節。
- **全文對照**: AI 會根據影片的完整字幕內容進行回答，確保準確性。

### 🎧 AI 語音導讀與即時更新 (New!)
- **非阻塞隊列**: 利用 BullMQ 將音訊生成改為背景處理，大幅提升 API 回應速度。
- **即時更新 (SSE)**: 透過 Server-Sent Events 技術，系統會在摘要或音訊生成完成後，即時通知前端自動更新 UI，無需手動重新整理。
- **超長文字處理**: 自動切割超長摘要內容進行分段語音合成，並無縫合併音訊，支援極長影片導讀。
- **高品質語音**: 利用 Google Cloud TTS 高品質語音（Wavenet）將摘要轉為 Podcast 般的導讀。
- **智慧播放器**: 支援倍速播放 (1x - 2x)、進度條拖曳及音量控制。
- **高效快取**: 首次生成後永久快取於 Google Cloud Storage，極速讀取。

### 📅 頻道管理與自動化
- **頻道追蹤**: 輕鬆訂閱喜愛的 YouTube 頻道，系統會自動發現新影片。
- **批量處理**: 支援一次性對多部影片進行摘要生成。
- **Notion 同步**: 一鍵將精美的摘要內容匯出至你的 Notion 筆記空間。

---

## 🛠️ 技術棧

- **框架**: Next.js 14 (App Router)
- **語言**: TypeScript
- **資料庫**: PostgreSQL (Prisma ORM)
- **身份驗證**: NextAuth.js
- **AI 引擎**: Google Gemini (Vercel AI SDK)
- **語音服務**: Google Cloud Text-to-Speech
- **儲存服務**: Google Cloud Storage (GCS)
- **任務隊列**: BullMQ + Redis
- **樣式**: Tailwind CSS + Framer Motion
- **測試**: Vitest

---

## 🚀 快速開始

### 1. 環境變數設定
建立 `.env.local` 並填入以下必要資訊：

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Google Cloud (TTS & GCS)
# 建議使用絕對路徑
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
GCS_BUCKET_NAME="your-bucket-name"

# AI
GOOGLE_GENERATIVE_AI_API_KEY="..."

# Redis (for BullMQ)
REDIS_URL="redis://localhost:6379"
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 資料庫初始化
```bash
npx prisma migrate dev
npx prisma generate
```

### 4. 啟動開發伺服器
```bash
# 啟動 Web 伺服器
npm run dev

# 啟動背景工作程序 (Worker)
npm run worker
```

---

## 🧪 測試狀態

TubeMind 擁有極高的測試覆蓋率，確保系統穩定性。

- **API 測試**: 19/19 有效端點已全數通過測試 (100%)。
- **單元測試**: 包含 YouTube Client, AI Summarizer, Worker 邏輯等。
- **測試框架**: Vitest
- **詳細報告**: 參閱 `docs/test/TEST-OVERVIEW.md`

---

## 📜 實作文件

如需瞭解特定功能的實作細節，請參閱：
- [語音導讀功能說明](docs/features/audio-playback.md)
- [測試總覽](docs/test/TEST-OVERVIEW.md)

---

**維護者**: Darren  
**最後更新**: 2026-01-23
