# TubeMind

TubeMind 是一個 AI 驅動的 YouTube 影片知識管理平台，自動將 YouTube 影片轉為可搜尋的繁體中文知識庫，支援語音播放、Notion 同步、客製化摘要語氣。

解決現代人訂閱大量 YouTube 頻道卻面臨資訊過載的困境，透過 AI 自動摘要、智慧標籤、語音播放等功能，讓影片知識管理就像整理個人圖書館一樣簡單。

## 專案概述

### 解決的問題

現代人訂閱了大量 YouTube 頻道，每天面臨資訊過載的困境：
- 每天數十個新影片通知，根本看不完
- 想快速了解內容，卻要看完整 20 分鐘影片
- 精彩內容散落各處，無法系統化整理
- 外語影片需要耗時翻譯理解

### 解決方案

TubeMind 提供自動化的影片知識管理流程：

1. **自動追蹤**: OAuth 登入後自動匯入 YouTube 訂閱，每天凌晨自動抓取新影片
2. **AI 摘要**: Gemini AI 將任何語言的影片轉為結構化繁體中文摘要
3. **客製化**: 支援 3 種預設語氣（專業/輕鬆/技術）+ 自訂語氣風格
4. **語音播放**: 文字轉語音功能，通勤時也能吸收知識
5. **知識留存**: AI 自動標籤分類、全文搜尋、一鍵同步至 Notion

---

## 技術架構與決策 (Architecture & Decisions)

這是在開發過程中針對不同場景所做的技術選擇與權衡：

### 1. 背景任務隊列設計 (BullMQ Queue Architecture)
影片摘要生成耗時 10-30 秒（視影片長度與字幕量而定），若同步處理會導致 API timeout 和糟糕的使用者體驗。

*   **決策**：採用 BullMQ + Redis 實作非阻塞式背景任務處理。
*   **實作細節**：
  *   API 立即返回 202 狀態碼，使用者不需等待摘要生成完成。
  *   Worker 獨立進程處理摘要生成（`npm run worker`）。
  *   實作任務重試機制（最多 3 次，指數退避策略）與錯誤追蹤。
  *   **雙重限流機制**：
    *   **每日額度**：每位使用者每 24 小時（滾動）最多生成 30 個摘要，防止雲端部署後 API 費用失控。
    *   **待處理任務上限**：每位使用者最多同時擁有 25 個待處理任務，防止惡意使用者耗盡 Redis 資源。
  *   支援 Job 進度追蹤，前端透過 **SSE (Server-Sent Events)** 搭配 **Redis Pub/Sub** 即時接收完成通知：
    *   Worker 完成任務後發布訊息至 Redis Channel。
    *   SSE 端點訂閱對應 Channel，接收到訊息後推送至前端。
    *   確保多實例部署下，任一 Worker 完成任務都能通知所有連線的客戶端。

### 2. TTS 超長文本處理 (Text-to-Speech Chunking)
Google Cloud TTS 單次請求限制 5,000 字元，但摘要經常超過 10,000 字，需要智慧切割與合併。

*   **挑戰**：簡單的字元切割會破壞句子完整性，導致語音不自然。中文字元以 UTF-8 編碼，需以位元組 (Bytes) 計算而非字元數。
*   **解決方案**：
  *   **貪婪演算法 (Greedy Algorithm) 搭配自然邊界切割**：
    *   優先以換行符號 (`\n`) 與中文標點 (`.`、`。`、`！`、`？`) 作為切割點。
    *   使用 `TextEncoder` 精確計算 UTF-8 位元組數，確保每段不超過 4,500 bytes（預留 buffer）。
    *   若單一句子超過限制（極少見），則退化為字元級切割（逐字添加直到達上限）。
  *   並行生成多段音訊，使用 `ffmpeg` 的 `concat` 濾鏡無縫合併（避免斷點感）。
  *   上傳至 Google Cloud Storage 並返回永久 URL，避免重複生成。

### 3. AI Prompt Engineering
為了讓 Gemini 輸出符合需求的結構化摘要，並支援使用者自訂語氣風格，採取以下策略：

*   **結構化輸出**：使用 JSON Schema 定義輸出格式（標題、摘要、關鍵重點、時間戳記）。
*   **動態語氣調整**：根據使用者設定（專業/輕鬆/技術/自訂）動態生成 System Prompt。
*   **Few-Shot Learning**：在 Prompt 中提供範例，確保輸出品質穩定。
*   **詳細程度控制**：支援簡潔/標準/詳細三種模式，適應不同使用場景。

### 4. OAuth 多平台整合 (Google + Notion)
同時支援 Google 和 Notion 的 OAuth 認證，並正確處理 token 更新與 scope 管理。

*   **實作**：使用 NextAuth.js 統一管理 OAuth 流程。
*   **自訂 Provider**：NextAuth 預設不支援 Notion，因此自行實作 `NotionProvider`。
*   **Token 更新機制**：實作 `refresh_token` 自動更新邏輯，確保長期存取不中斷。
*   **Scope 管理**：Google OAuth 需同時申請 YouTube Data API 與 User Info 權限。

### 5. 雙重限流機制 (Rate Limiting)
為了防止雲端部署後遭遇惡意使用者濫用導致 API 費用爆炸，實作雙層限流保護：

*   **每日額度限制（滾動 24 小時）**：
  *   每位使用者每 24 小時最多生成 30 個摘要。
  *   查詢過去 24 小時內建立的 Summary 數量（`createdAt >= now - 24h`）。
  *   若超過額度，返回明確錯誤訊息與重置時間（例如：「將在約 3 小時後重置」）。
  *   提供 `/api/quota` 端點供前端查詢剩餘額度。
*   **待處理任務上限（Queue 保護）**：
  *   每位使用者最多同時擁有 25 個待處理任務（waiting、active、delayed）。
  *   防止 Redis 記憶體耗盡與 Worker 過載。
*   **設計理由**：
  *   每日額度控制成本（Gemini API 計費單位）。
  *   待處理任務上限防止瞬間流量衝擊。
  *   兩者搭配確保系統穩定性與成本可控性。

---

## 核心功能 (Core Features)

TubeMind 將複雜的影片知識管理流程簡化為直覺的自動化體驗：

*   **YouTube 頻道自動追蹤 (Auto Channel Sync)**
    
    Google OAuth 2.0 安全登入後，一鍵匯入所有訂閱頻道。支援每日凌晨 3:00 自動抓取新影片，無需手動刷新。

*   **AI 智能摘要 (AI-Powered Summarization)**
    
    使用 Google Gemini 2.5 Flash 模型，支援 100+ 種語言自動翻譯為繁體中文。結構化輸出包含標題、重點摘要、詳細內容、關鍵時間點。支援 3 種預設語氣（專業/輕鬆/技術）+ 自訂語氣描述。

*   **文字轉語音播放 (Text-to-Speech)**
    
    整合 Google Cloud Text-to-Speech (Wavenet)，支援男聲/女聲選擇。智慧處理超長文本（自動分段合成），音訊檔永久快取於 Google Cloud Storage。內建播放器支援進度條、倍速播放（0.5x-2x）、音量控制。

*   **Notion 一鍵同步 (Notion Integration)**
    
    Notion OAuth 2.0 認證後，一鍵同步摘要至 Notion 工作區。支援自訂目標頁面，保留 Markdown 格式與標籤。

*   **智能標籤與搜尋 (Smart Tagging & Search)**
    
    AI 自動生成相關標籤，支援標籤過濾與組合搜尋。全文檢索涵蓋標題、描述、摘要內容，採用多對多關聯設計（Summary ↔ Tag）。

*   **AI 聊天導讀 (AI Chat Assistant)**
    
    基於影片字幕的情境對話，即時問答（詢問影片細節、延伸知識）。使用 Vercel AI SDK 的 `useChat` hook 實作串流式回應（Server-Sent Events）。

---

## 系統架構 (Architecture)

### 整體架構

```text
┌─────────────────────────────────────────────────────────────┐
│                         使用者介面                            │
│  Next.js 14 App Router + React + Tailwind CSS + Framer Motion│
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes Layer                        │
│  /api/channels  /api/summaries  /api/chat  /api/auth        │
└────────────┬────────────────────────────────────────────────┘
             │
     ┌───────┴───────┐
     ▼               ▼
┌─────────┐    ┌──────────────────┐
│ Prisma  │    │   BullMQ Queue   │
│   ORM   │    │  (Redis-backed)  │
└────┬────┘    └────────┬─────────┘
     │                  │
     ▼                  ▼
┌──────────┐    ┌──────────────┐
│PostgreSQL│    │    Worker    │
│ Database │    │   Process    │
└──────────┘    └──────┬───────┘
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
    ┌──────────┐ ┌─────────┐ ┌─────────┐
    │ YouTube  │ │ Gemini  │ │Google   │
    │   API    │ │   AI    │ │Cloud TTS│
    └──────────┘ └─────────┘ └─────────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │Google Cloud  │
                            │   Storage    │
                            └──────────────┘
```

### BullMQ 任務處理流程

```text
[使用者] ──POST──> [API Route] ──Add Job──> [Redis Queue]
   │                    │                          │
   │                    │                          │
   │              返回 202 (立即)                   │
   │                    │                          │
   └────SSE 訂閱────────┘                          │
                                                   │
                                        [Worker Process]
                                             │
                        ┌────────────────────┼────────────────┐
                        ▼                    ▼                ▼
                   取得字幕            生成摘要 (Gemini)   產生音訊 (TTS)
                   (YouTube)          10-30 秒         貪婪演算法切割
                        │                   │                │
                        └───────────────────┴────────────────┘
                                            │
                                      更新資料庫
                                            │
                                      Redis Pub/Sub
                                     發布完成事件
                                            │
                                      ┌─────┴─────┐
                                      ▼           ▼
                                SSE 推送     Notion 同步
                                前端更新
```

---

## 開發挑戰與解決 (Challenges & Solutions)

在整合多個第三方 API 與 AI 的過程中，主要的挑戰在於如何協調不同服務的限制與特性：

### 1. AI 聊天的 Markdown 渲染失效
*   **問題**：初期使用 Vercel AI SDK 的 Data Stream 協定時，前端接收到的訊息無法正確渲染 Markdown 格式，導致程式碼區塊、列表等格式全部失效。
*   **排查**：分析網路請求後發現，Data Stream 協定回傳的是結構化 JSON，而非純文字串流。前端的 `react-markdown` 需要完整的 Markdown 字串才能正確解析。
*   **解決**：切換為 UI Message Stream 協定（`toUIMessageStreamResponse()`），確保前端接收到的是純文字串流。同時調整 `useChat` 的訊息格式為 `{ text: content }`，成功解決渲染問題。

### 2. TTS 音訊合併的無縫處理
*   **問題**：多段音訊直接串接會產生明顯的斷點感，影響聽覺體驗。同時需確保切割點不會破壞句子完整性。
*   **解決**：
  *   **文本切割**：使用貪婪演算法搭配自然邊界切割（換行符號、中文標點），確保每段不超過 4,500 bytes。
  *   **音訊合併**：使用 `ffmpeg` 的 `concat` 濾鏡搭配 `aresample` 確保採樣率一致，消除斷點。
  *   **快取機制**：上傳至 Google Cloud Storage 取得永久 URL，避免相同內容重複生成。

### 3. Notion API 的 Block 大小限制
*   **問題**：Notion API 單一 Block 最多只能容納 2,000 字元，但摘要內容經常超過此限制。
*   **解決**：實作自動分段邏輯，每 1,800 字元切割一次（預留 buffer），將長文本拆分為多個 Paragraph Block。同時保留 Markdown 格式轉換邏輯（Heading、List、Code Block）。

### 4. YouTube 訂閱 API 的分頁限制
*   **問題**：YouTube Data API 單次請求最多回傳 50 筆訂閱，但使用者可能訂閱數百個頻道。
*   **解決**：實作遞迴分頁邏輯，使用 `nextPageToken` 持續請求直到取得所有訂閱。同時加入速率限制保護（每秒最多 5 個請求），避免觸發 API Quota。

---

## 測試策略

本專案採用 **AI 自動化測試工作流**。利用自建的測試工作流技能，自動針對已實作的功能生成邊界案例與整合測試，確保核心邏輯的穩健性。

*   **測試統計**：258 個測試案例全部通過，24/24 API 端點測試通過（100% 覆蓋）。
*   **單元測試**：使用 Vitest 驗證核心邏輯（YouTube Client、AI Summarizer、Queue、Auth、Quota System）。
*   **整合測試**：
  *   **API Routes Test**：驗證所有 API 端點的請求/回應格式與錯誤處理。
  *   **Worker Integration Test**：驗證 BullMQ 任務處理流程與重試機制。
  *   **SSE Test**：驗證即時通知機制的正確性。
  *   **Quota System Test**：驗證每日額度、頻道限制、autoRefresh 限制的正確性。

## 使用技術 (Built With)

*   **Core**: Next.js 14, TypeScript, React
*   **AI**: Vercel AI SDK, Google Gemini 2.5 Flash
*   **Infrastructure**: PostgreSQL, Redis, Prisma ORM
*   **Authentication**: NextAuth.js v4 (Google + Notion OAuth)
*   **Queue**: BullMQ (Redis-backed)
*   **Styling**: Tailwind CSS v4, Framer Motion, Radix UI
*   **Testing**: Vitest
*   **External APIs**: YouTube Data API v3, Google Cloud TTS, Google Cloud Storage, Notion API

## 快速開始

### 前置需求
*   Node.js 18+
*   PostgreSQL 14+
*   Redis 6+
*   Google Cloud Platform 帳號（TTS + Storage）
*   YouTube Data API Key
*   Google Generative AI API Key
*   Notion Integration (選用)

### 執行步驟

1.  **Clone 專案**
    ```bash
    git clone https://github.com/your-username/tube-mind.git
    cd tube-mind
    ```

2.  **安裝依賴**
    ```bash
    npm install
    ```

3.  **設定環境變數**
    建立 `.env.local` 檔案：
    ```env
    # Database
    DATABASE_URL="postgresql://user:password@localhost:5432/tubemind"
    
    # NextAuth
    NEXTAUTH_URL="http://localhost:3000"
    NEXTAUTH_SECRET="your-secret-key"
    
    # Google OAuth
    GOOGLE_CLIENT_ID="your-google-client-id"
    GOOGLE_CLIENT_SECRET="your-google-client-secret"
    
    # Google Cloud (TTS + GCS)
    GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account-key.json"
    GCS_BUCKET_NAME="your-gcs-bucket-name"
    
    # AI
    GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"
    
    # Redis
    REDIS_URL="redis://localhost:6379"
    
    # Notion (Optional)
    NOTION_CLIENT_ID="your-notion-client-id"
    NOTION_CLIENT_SECRET="your-notion-client-secret"
    ```

4.  **資料庫初始化**
    ```bash
    npx prisma migrate dev
    npx prisma generate
    ```

5.  **啟動服務**
    
    **Terminal 1: Web Server**
    ```bash
    npm run dev
    ```
    
    **Terminal 2: Worker Process**
    ```bash
    npm run worker
    ```
    
    開啟瀏覽器訪問 `http://localhost:3000`

6.  **執行測試**
    ```bash
    npm run test
    ```

---

## 專案結構

```
tube-mind/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # 儀表板頁面（需登入）
│   │   ├── channels/             # 頻道管理
│   │   ├── summaries/            # 摘要列表與詳細頁
│   │   └── settings/             # 使用者設定
│   ├── api/                      # API Routes
│   │   ├── auth/                 # NextAuth 端點
│   │   ├── channels/             # 頻道 CRUD
│   │   ├── summaries/            # 摘要 CRUD + SSE
│   │   └── chat/                 # AI 聊天端點
│   └── page.tsx                  # Landing Page
├── components/
│   ├── landing/                  # Landing Page 組件
│   ├── chat/                     # AI 聊天介面
│   └── ui/                       # 通用 UI 組件
├── lib/
│   ├── auth/                     # NextAuth 設定
│   ├── ai/                       # Gemini AI 整合
│   ├── youtube/                  # YouTube API Client
│   ├── tts/                      # Google Cloud TTS
│   ├── notion/                   # Notion API
│   ├── queue/                    # BullMQ 設定
│   └── workers/                  # Worker 邏輯
├── prisma/
│   └── schema.prisma             # 資料庫 Schema
├── docs/                         # 技術文件
│   ├── plans/                    # 設計規格文檔 (23 份)
│   └── test/                     # 測試報告
└── tests/                        # 測試檔案
```

---

## 開發方法論

本專案採用 **SDD (Specification-Driven Development)** 搭配 AI Superpowers Skills 協作開發：

### 完整工作流程

#### 1. 頭腦風暴與規格設計
使用 `brainstorming` skill 與 AI 深入討論功能需求，逐步補足細節：
- 釐清使用者需求與使用場景
- 討論技術架構選型（BullMQ vs 其他方案）
- 設計資料庫 Schema（資料表關聯、欄位設計）
- 規劃 API 端點與錯誤處理機制
- 最終輸出完整的規格設計文檔

#### 2. 撰寫執行計劃
使用 `writing-plans` skill 將規格轉化為可執行的開發計劃：
- 分解功能為具體任務
- 規劃檔案結構與模組劃分
- 定義實作步驟與檢查點

#### 3. 並行子代理開發
- **相依性分析**: AI 分析任務間的相依關係
- **並行執行**: 將無相依的任務分配給多個 AI 子代理同時開發
- **程式碼生成**: 各子代理基於規格產生對應模組的程式碼

#### 4. 雙重驗證機制
開發完成後啟動兩個監督代理：
- **規格驗證代理**: 檢查程式碼是否完全按照規格實作
- **Code Review 代理**: Review 程式碼品質、架構、效能
- **基礎測試**: 自動撰寫 CRUD 測試確保基本功能

#### 5. 完整測試工作流
使用自訂 `test-workflow` skill 執行完整的測試流程：
- 單元測試（核心邏輯）
- 整合測試（API 端點）
- 端到端測試（完整流程）
- 生成測試報告

### 成果

- **24/24 API 端點測試通過**（100% 測試覆蓋）
- **核心邏輯單元測試完整**（YouTube Client, AI Summarizer, Queue, Auth）
- **23 份設計規格文檔**（每個功能都有完整規格，詳見 `docs/plans/`）
- **系統化架構設計**（資料庫、API、Worker 的完整設計）

### 設計文檔範例

所有功能都經過完整的規格設計，例如：
- [AI 摘要客製化設計](docs/plans/2026-01-25-summary-preferences-design.md) - Prompt Engineering 設計
- [Notion 自動同步設計](docs/plans/2026-01-20-auto-sync-notion-design.md) - OAuth 整合設計
- [語音播放功能設計](docs/plans/2026-01-21-audio-playback-design.md) - TTS 超長文本處理
- [SSE + TTS 隊列設計](docs/plans/2026-01-22-sse-tts-queue-design.md) - BullMQ 背景任務設計
- [標籤系統設計](docs/plans/2026-01-21-tags-system-design.md) - 多對多關聯設計

完整設計文檔列表請參考 `docs/plans/` 目錄（23 份規格文檔）。

---

**維護者**: Darren  
**最後更新**: 2026-01-28

