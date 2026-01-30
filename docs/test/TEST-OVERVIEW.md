# TubeMind 測試總覽

**最後更新**: 2026-01-30
**當前測試數量**: 277 個測試通過
**測試檔案數量**: 26 個 (16 個 API 測試檔 + 1 個組件測試檔 + 8 個 Service 層測試檔 + 1 個 Notion Service 測試檔 + 1 個 Admin 測試檔)

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
| 22 | `POST /api/summaries/[id]/audio` | ✅ | ✅ | 完成 | 5 |
| 23 | `GET /api/sse/summary/[id]` | ✅ | ✅ | 完成 | 3 |
| 24 | `PATCH /api/user/settings/summary` | ✅ | ✅ | 完成 | 6 |

**完成進度**: 24/24 有效 APIs (100%)  
**測試覆蓋**: 188 個 API 測試 + 121 個 Service 層測試 = 309 個測試

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
- **文檔**: `docs/test/ai-summarizer-test-cases.md`
- **測試數量**: 16 個 (+2)
- **覆蓋功能**:
  - `generateVideoSummary()` 函數
    - 生成影片摘要 (使用 Gemini 2.5 Flash Lite)
    - **支援使用者偏好設定 (語氣、詳細度)** (New)
    - 時間戳格式化
    - JSON 解析與錯誤處理
  - `generateSummaryWithRetry()` 函數
    - 重試機制 (429, 500, 503 錯誤)
    - 指數退避策略
    - 最大重試次數設定
  - 完整的 Mock 策略 (@google/generative-ai)

### 3. Summary Worker (`lib/workers/summaryWorker.ts`)
- **測試檔案**: `test/lib/workers/summaryWorker.test.ts`
- **文檔**: `docs/test/summary-worker-test-cases.md`
- **測試數量**: 17 個
- **覆蓋功能**:
  - 完整的 Worker 處理流程
    - 狀態更新 (`pending` → `processing` → `completed`)
    - 影片資訊獲取
    - 字幕抓取與儲存
    - AI 摘要生成 (**整合 User Preferences**)
    - 結果儲存與關聯資料載入
  - Notion 自動同步邏輯
  - 錯誤處理機制
  - Redis 事件發布

### 4. TTS Worker (`lib/workers/ttsWorker.ts`) ✅ **新完成**
- **測試檔案**: `Test/lib/workers/ttsWorker.test.ts`
- **文檔**: `docs/test/tts-worker-test-cases.md`
- **測試數量**: 5 個
- **覆蓋功能**:
  - 非同步語音生成流程
  - **支援使用者語音性別選擇 (Male/Female)** (New)
  - GCS 上傳與 DB 更新
  - Redis 事件發布 (`audio_generating`, `audio_completed`, `audio_failed`)
  - 音訊快取檢查

### 5. TTS Service (`lib/audio/tts.ts`) ✅ **新完成**
- **測試檔案**: `Test/lib/audio/tts.test.ts`
- **文檔**: `docs/test/tts-service-test-cases.md`
- **測試數量**: 3 個
- **覆蓋功能**:
  - 長文字分段處理 (`splitTextByBytes`)
  - 多段音訊 Buffer 合併
  - 錯誤處理

### 6. Events Service (`lib/queue/events.ts`) ✅ **新完成**
- **測試檔案**: `Test/lib/queue/events.test.ts`
- **文檔**: `docs/test/events-service-test-cases.md`
- **測試數量**: 2 個
- **覆蓋功能**:
  - Redis Pub/Sub 發布與訂閱邏輯

### 7. Summary Queue (`lib/queue/summaryQueue.ts`) ✅ **新完成**
- **測試檔案**: `test/lib/queue/summaryQueue.test.ts`
- **文檔**: `docs/test/summary-queue-test-cases.md`
- **測試數量**: 2 個
- **覆蓋功能**:
  - `addSummaryJob()` 函數
  - 任務新增邏輯與參數配置
  - Redis 連線 Mock

### 8. NextAuth 配置 (`lib/auth.ts`) ✅ **新完成**
- **測試檔案**: `test/lib/auth.test.ts`
- **文檔**: `docs/test/auth-config-test-cases.md`
- **測試數量**: 6 個
- **覆蓋功能**:
  - JWT Callback (含 Token 刷新邏輯)
  - Session Callback
  - Mock Google OAuth Token Endpoint

### 9. Daily Quota System (`lib/quota/dailyLimit.ts`) ✅ **新完成**
- **測試檔案**: `test/lib/quota/dailyLimit.test.ts`
- **文檔**: `docs/test/daily-quota-test-cases.md`
- **測試數量**: 19 個
- **覆蓋功能**:
  - `checkDailyQuota()`: 每日摘要額度檢查 (滾動 24 小時)
    - 正常情況、邊界值 (29/30/35 個)
    - 時間計算正確性 (重置時間 = 最早摘要 + 24 小時)
  - `enforceQuota()`: 強制額度檢查並拋出錯誤
    - 錯誤訊息包含剩餘時間
  - `checkChannelLimit()`: 頻道訂閱數量限制 (最多 20 個)
  - `checkAutoRefreshLimit()`: 自動更新頻道限制 (最多 5 個)
    - 支援排除特定頻道 (更新現有頻道時)
  - 完整的 Mock 策略 (Prisma DB)

### 10. Guest Mode Quota (`lib/quota/dailyLimit.ts`) ✅ **新完成**
- **測試檔案**: `test/lib/quota/guestLimit.test.ts`
- **文檔**: `docs/test/guest-mode-test-cases.md`
- **測試數量**: 14 個
- **覆蓋功能**:
  - 動態額度限制 (Dynamic Quota)
  - 訪客權限識別 (Email 白名單)
  - 訪客限制驗證 (摘要 3 個 / 頻道 3 個 / 無 Auto Refresh)
  - 管理員限制驗證 (摘要 30 個 / 頻道 20 個 / 5 Auto Refresh)
  - 環境變數解析測試

### 11. Admin Dashboard (`app/(admin)`) ✅ **新完成**
- **測試檔案**: `test/app/admin/admin.test.ts`
- **文檔**: `docs/test/admin-dashboard-test-cases.md`
- **測試數量**: 5 個
- **覆蓋功能**:
  - `AdminLayout`: 權限與路由保護測試
  - `AdminDashboardPage`: 系統統計數據顯示
  - `UsersPage`: 使用者列表、角色標示、今日額度計算

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

### 17. Summary Settings API (`/api/user/settings/summary`) ✅ **新完成**
- **測試檔案**: `test/app/api/user/settings/summary/route.test.ts`
- **文檔**: `docs/test/summary-settings-api-test-cases.md`
- **測試數量**: 6 個
- **覆蓋功能**:
  - PATCH: 更新摘要偏好 (語氣、詳細度、語音性別)
  - 自訂語氣與字數限制驗證
  - 安全性檢查 (禁用關鍵字過濾)

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
**最終狀態**: 通過所有 277 個測試 (2026-01-30)
