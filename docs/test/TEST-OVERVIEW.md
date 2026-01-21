# TubeMind 測試總覽

**最後更新**: 2026-01-21  
**當前測試數量**: 223 個測試通過  
**測試檔案數量**: 20 個 (15 個 API 測試檔 + 1 個組件測試檔 + 3 個 Service 層測試檔 + 1 個 Notion Service 測試檔)

---

## 測試進度總表

| # | API 路徑 | 測試檔案 | 文檔 | 狀態 | 測試數 |
|---|---------|---------|------|------|--------|
| 1 | `GET /api/channels` | ✅ | ✅ | 完成 | 8 |
| 2 | `POST /api/channels` | ✅ | ✅ | 完成 | (含在上方) |
| 3 | `GET /api/channels/[id]` | ✅ | ✅ | 完成 | 17 |
| 4 | `PATCH /api/channels/[id]` | ✅ | ✅ | 完成 | (含在上方) |
| 5 | `DELETE /api/channels/[id]` | ✅ | ✅ | 完成 | (含在上方) |
| 6 | `POST /api/channels/[id]/refresh` | ✅ | ✅ | 完成 | 15 |
| 7 | `GET /api/cron/check-new-videos` | ✅ | ✅ | 完成 | 12 |
| 8 | `POST /api/chat` | ✅ | ✅ | 完成 | 6 |
| 9 | `GET /api/summaries` | ✅ | ✅ | 完成 | 8 |
| 10 | `POST /api/summaries` | ✅ | ✅ | 完成 | (含在上方) |
| 11 | `GET /api/summaries/[id]` | ✅ | ✅ | 完成 | 13 |
| 12 | `PATCH /api/summaries/[id]` | ⚠️ | ⚠️ | **不存在** | 0 |
| 13 | `DELETE /api/summaries/[id]` | ✅ | ✅ | 完成 | (含在上方) |
| 14 | `POST /api/summaries/[id]/retry` | ✅ | ✅ | 完成 | 11 |
| 15 | `POST /api/summaries/batch` | ✅ | ✅ | 完成 | 14 |
| 16 | `GET /api/videos/check` | ✅ | ✅ | 完成 | 9 |
| 17 | `GET /api/videos/[id]` | ✅ | ✅ | 完成 | 5 |
| 18 | `GET /api/youtube/subscriptions` | ✅ | ✅ | 完成 | 10 |
| 19 | `PATCH /api/user/settings` | ✅ | ✅ | 完成 | 5 |
| 20 | `GET /api/notion/pages` | ✅ | ✅ | 完成 | 5 |
| 21 | `POST /api/summaries/[id]/export/notion` | ✅ | ✅ | 完成 | 8 |

**完成進度**: 18/18 有效 APIs (100%)  
**測試覆蓋**: 155 個 API 測試 + 68 個 Service 層測試 = 223 個測試

---

## Service 層測試

### 1. YouTube Client (`lib/youtube/client.ts`)
- **測試檔案**: `Test/lib/youtube/client.test.ts`
- **文檔**: `docs/test/youtube-client-test-cases.md`
- **測試數量**: 32 個
- **覆蓋功能**:
  - `YouTubeClient` 類別
    - Constructor: OAuth2 初始化
    - `getSubscriptions()`: 取得訂閱列表 (含分頁)
    - `getChannelDetails()`: 取得頻道詳細資訊
    - `getChannelVideos()`: 取得頻道影片列表
    - `getVideoDetails()`: 取得影片詳細資訊
    - `parseDuration()`: ISO 8601 時長解析
  - `getVideoTranscript()` 函數
    - 多語言字幕抓取 (en → zh-TW → zh → auto)
    - HTML 實體解碼
    - Fallback 機制
  - 完整的 Mock 策略 (googleapis, youtube-transcript-plus)

### 2. AI Summarizer (`lib/ai/summarizer.ts`)
- **測試檔案**: `test/lib/ai/summarizer.test.ts`
- **測試數量**: 14 個
- **覆蓋功能**:
  - `generateVideoSummary()` 函數
    - 生成影片摘要 (使用 Gemini 2.5 Flash Lite)
    - 時間戳格式化
    - JSON 解析與錯誤處理
  - `generateSummaryWithRetry()` 函數
    - 重試機制 (429, 500, 503 錯誤)
    - 指數退避策略
    - 最大重試次數設定
  - 完整的 Mock 策略 (@google/generative-ai)

### 3. Summary Worker (`lib/workers/summaryWorker.ts`) ✅ **新完成**
- **測試檔案**: `test/lib/workers/summaryWorker.test.ts`
- **文檔**: `docs/test/summary-worker-test-cases.md`
- **測試數量**: 17 個
- **覆蓋功能**:
  - 完整的 Worker 處理流程
    - 狀態更新 (`pending` → `processing` → `completed`)
    - 影片資訊獲取
    - 字幕抓取與儲存
    - AI 摘要生成
    - 結果儲存與關聯資料載入
  - Notion 自動同步邏輯
    - 條件判斷 (autoSyncNotion, notionParentPageId, access_token)
    - 同步狀態管理 (`PENDING` → `SUCCESS`/`FAILED`)
    - 錯誤處理 (同步失敗不影響主流程)
  - 錯誤處理機制
    - 資源不存在 (Summary 不存在)
    - 字幕抓取失敗 (空字幕、null)
    - AI 生成失敗
    - Database 操作失敗
  - Worker 事件處理
    - `failed` 事件: 更新 Summary 狀態為 failed
    - `completed` 事件: 記錄完成 log
  - 資料完整性
    - 關聯資料載入 (video.channel, user.accounts)
    - Video thumbnail 處理 (null → undefined)
  - 完整的 Mock 策略 (Prisma, YouTube Client, AI Summarizer, Notion Service, BullMQ)

---

## 已完成的測試 (新增內容)

### 14. User Settings API (`/api/user/settings`)
- **測試檔案**: `test/app/api/user/settings/route.test.ts`
- **文檔**: `docs/test/user-settings-test-cases.md`
- **測試數量**: 5 個
- **覆蓋功能**:
  - PATCH: 更新使用者設定 (Notion Parent Page ID)
  - 權限驗證與參數驗證

### 15. Notion Pages API (`/api/notion/pages`)
- **測試檔案**: `test/app/api/notion/pages/route.test.ts`
- **文檔**: `docs/test/notion-pages-test-cases.md`
- **測試數量**: 5 個
- **覆蓋功能**:
  - GET: 獲取使用者 Notion 可存取頁面
  - 處理 Notion 帳號未連接或缺少 Token 的情況

### 16. Notion Export API (`/api/summaries/[id]/export/notion`)
- **測試檔案**: `test/app/api/summaries/[id]/export/notion/route.test.ts`
- **文檔**: `docs/test/notion-export-test-cases.md`
- **測試數量**: 8 個
- **覆蓋功能**:
  - POST: 將摘要匯出到 Notion
  - 完整的權限與資源驗證 (User, Account, Summary)
  - 外部依賴 Mock (Notion Service)

---

## 📋 待完成的 Service 層測試 (剩餘 2 個)

### ⏸️ 4. Summary Queue (`lib/queue/summaryQueue.ts`) - **中優先級**
- **狀態**: ❌ 未開始
- **預估測試數**: 8-10 個
- **需要測試的功能**:
  - `addSummaryJob()` 函數
  - 任務新增邏輯
  - 重試機制配置 (3 次重試, 指數退避)
  - 任務清理設定
  - Redis 連線
- **Mock 策略**:
  - BullMQ Queue
  - Redis (ioredis)

### ⏸️ 5. NextAuth 配置 (`lib/auth.ts`) - **中優先級**
- **狀態**: ❌ 未開始
- **預估測試數**: 12-15 個
- **需要測試的功能**:
  - `authOptions` 配置
    - Google OAuth (含 YouTube scopes)
    - Notion OAuth (自訂 Provider)
    - JWT 策略
  - `refreshAccessToken()` 函數
    - Google Token 刷新邏輯
    - 錯誤處理
  - `CustomNotionProvider()` 函數
  - JWT callback 邏輯
  - Session callback 邏輯
- **Mock 策略**:
  - Prisma Adapter
  - OAuth API 呼叫
  - JWT Token

### 📊 預估完成後狀態
- **總測試數**: 218 + 23 = **241 個測試**
- **Service 層覆蓋率**: 6/9 檔案 → **67%** (不含 types 和未使用檔案)
- **整體測試覆蓋率**: 約 **90-95%**

### 🚀 下次 Session 執行指令
```bash
# 1. 繼續測試 Summary Queue
# 檢查檔案
cat lib/queue/summaryQueue.ts

# 2. 執行測試專家工作流程
# 使用測試模板: ~/.config/opencode/template/test-template.md
# 參考已完成的測試: test/lib/workers/summaryWorker.test.ts

# 3. 驗證測試
npx vitest run test/lib/queue/summaryQueue.test.ts
```

---

## 測試規範與指標

1. **單元測試獨立性**: 所有外部依賴 (Database, API, Queue) 皆已 Mock。
2. **覆蓋率**: 所有有效 API 路徑皆有測試覆蓋。
3. **命名規範**: 使用「應該...」格式描述測試目的。
4. **結構**: 遵循 Arrange-Act-Assert (AAA) 模式。
5. **文檔同步**: 每個 API 皆有對應的測試案例說明文檔。

---

**維護者**: AI Agent + Human Review  
**測試框架**: Vitest + TypeScript  
**最終狀態**: 通過所有 223 個測試 (2026-01-21)
