# TubeMind 測試總覽

**最後更新**: 2026-01-20  
**當前測試數量**: 95 個測試通過  
**測試檔案數量**: 10 個

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
| 11 | `GET /api/summaries/[id]` | ❌ | ❌ | **待測試** | 0 |
| 12 | `PATCH /api/summaries/[id]` | ❌ | ❌ | **待測試** | 0 |
| 13 | `DELETE /api/summaries/[id]` | ❌ | ❌ | **待測試** | 0 |
| 14 | `POST /api/summaries/[id]/retry` | ❌ | ❌ | **待測試** | 0 |
| 15 | `POST /api/summaries/batch` | ❌ | ❌ | **待測試** | 0 |
| 16 | `GET /api/videos/check` | ✅ | ✅ | 完成 | 9 |
| 17 | `GET /api/videos/[id]` | ❌ | ❌ | **待測試** | 0 |
| 18 | `GET /api/youtube/subscriptions` | ✅ | ✅ | 完成 | 10 |

**完成進度**: 11/18 APIs (61.1%)  
**測試覆蓋**: 95 個測試

---

## 已完成的測試

### 1. Channels API (`/api/channels`)
- **測試檔案**: `test/app/api/channels/route.test.ts`
- **文檔**: `docs/test/channels-api-test-cases.md`
- **測試數量**: 8 個
- **覆蓋功能**:
  - GET: 獲取頻道列表 (驗證授權、資料隔離)
  - POST: 建立新頻道 (驗證、重複檢查、YouTube API 整合、影片自動抓取)

### 2. Channels by ID API (`/api/channels/[id]`)
- **測試檔案**: `test/app/api/channels/[id]/route.test.ts`
- **文檔**: `docs/test/channels-id-api-test-cases.md`
- **測試數量**: 17 個
- **覆蓋功能**:
  - GET: 獲取單一頻道詳情 (6 個測試)
  - PATCH: 更新頻道設定 (autoRefresh) (6 個測試)
  - DELETE: 刪除頻道 (5 個測試)

### 3. Channel Refresh API (`/api/channels/[id]/refresh`)
- **測試檔案**: `test/app/api/channels/[id]/refresh/route.test.ts`
- **文檔**: `docs/test/channels-refresh-api-test-cases.md`
- **測試數量**: 15 個
- **覆蓋功能**:
  - 權限驗證 (3 個測試)
  - 速率限制 (1 小時內限制一次刷新) (4 個測試)
  - 核心功能 (新影片檢測、時間戳更新) (4 個測試)
  - 外部依賴處理 (YouTube API、Database、Queue) (3 個測試)
  - 特殊情況 (缺少 accessToken) (1 個測試)

### 4. Cron Check New Videos API (`/api/cron/check-new-videos`)
- **測試檔案**: `test/app/api/cron/check-new-videos/route.test.ts`
- **文檔**: `docs/test/cron-check-new-videos-test-cases.md`
- **測試數量**: 12 個
- **覆蓋功能**:
  - Cron 權限驗證 (CRON_SECRET)
  - 自動刷新邏輯 (只處理 autoRefresh=true 的頻道)
  - 新影片檢測與建立
  - 外部依賴處理

### 5. Chat API (`/api/chat`)
- **測試檔案**: `test/app/api/chat/route.test.ts`
- **文檔**: `docs/test/chat-api-test-cases.md`
- **測試數量**: 6 個
- **覆蓋功能**:
  - 權限驗證
  - 訊息格式轉換 (Frontend ↔ Backend)
  - 字幕獲取邏輯 (Lazy Fetch)
  - AI 串流回應

### 6. Summaries API (`/api/summaries`)
- **測試檔案**: `test/app/api/summaries/route.test.ts`
- **文檔**: `docs/test/summaries-api-test-cases.md`
- **測試數量**: 8 個
- **覆蓋功能**:
  - GET: 獲取摘要列表 (資料隔離)
  - POST: 建立新摘要 (影片驗證、長度檢查、重複檢查、Queue 整合)

### 7. Video Check API (`/api/videos/check`)
- **測試檔案**: `test/app/api/videos/check/route.test.ts`
- **文檔**: `docs/test/video-check-api-test-cases.md`
- **測試數量**: 9 個
- **覆蓋功能**:
  - 權限驗證
  - 影片建立與檢查
  - 影片長度驗證 (3 小時限制)
  - YouTube API 整合

### 8. MessageContent Component
- **測試檔案**: `test/components/AIChat/MessageContent.test.tsx`
- **文檔**: `docs/test/message-content-test-cases.md`
- **測試數量**: 9 個
- **覆蓋功能**:
  - Markdown 解析 (粗體、列表、連結、程式碼)
  - 時間戳解析與跳轉
  - 使用者/助理訊息樣式

### 9. YouTube Subscriptions API (`/api/youtube/subscriptions`)
- **測試檔案**: `test/app/api/youtube/subscriptions/route.test.ts`
- **文檔**: `docs/test/youtube-subscriptions-test-cases.md`
- **測試數量**: 10 個
- **覆蓋功能**:
  - 權限驗證 (session 和 accessToken 檢查)
  - YouTube API 整合 (獲取訂閱列表)
  - 標記已新增頻道 (isAdded 邏輯)
  - 資料隔離 (只查詢當前使用者的頻道)
  - 邊界值處理 (空訂閱列表)
  - 外部依賴處理 (YouTube API 失敗、Database 失敗)

---

## 待測試的 API

### 優先級 HIGH

#### 10. `/api/summaries/batch` (POST)
- **功能**: 批次建立多個影片的摘要
- **預估測試數**: 10-12 個
- **關鍵測試點**:
  - 權限驗證
  - 批次處理邏輯
  - 影片驗證 (存在性、長度限制)
  - 重複檢查
  - 部分成功處理
  - Queue 批次新增

#### 11. `/api/summaries/[id]/retry` (POST)
- **功能**: 重試失敗的摘要任務
- **預估測試數**: 8-10 個
- **關鍵測試點**:
  - 權限驗證
  - 摘要存在性檢查
  - 狀態驗證 (只能重試 failed 狀態)
  - Queue 重新加入
  - 資料隔離

#### 12. `/api/summaries/[id]` (GET, PATCH, DELETE)
- **功能**: 獲取/更新/刪除單一摘要
- **預估測試數**: 12-15 個
- **關鍵測試點**:
  - GET: 獲取摘要詳情
  - PATCH: 更新摘要內容
  - DELETE: 刪除摘要
  - 權限驗證與資料隔離
  - 狀態轉換邏輯

### 優先級 MEDIUM

#### 13. `/api/videos/[id]` (GET)
- **功能**: 獲取單一影片詳情
- **預估測試數**: 6-8 個
- **關鍵測試點**:
  - 權限驗證
  - 影片存在性檢查
  - 關聯資料載入 (channel, summaries)

---

## 測試規範

### 測試檔案結構
```
test/
├── app/api/
│   ├── channels/
│   │   ├── route.test.ts           # GET, POST /api/channels
│   │   └── [id]/
│   │       ├── route.test.ts       # GET, PATCH, DELETE /api/channels/[id]
│   │       └── refresh/
│   │           └── route.test.ts   # POST /api/channels/[id]/refresh
│   ├── summaries/
│   │   ├── route.test.ts           # GET, POST /api/summaries
│   │   ├── [id]/
│   │   │   ├── route.test.ts       # GET, PATCH, DELETE /api/summaries/[id]
│   │   │   └── retry/
│   │   │       └── route.test.ts   # POST /api/summaries/[id]/retry
│   │   └── batch/
│   │       └── route.test.ts       # POST /api/summaries/batch
│   └── ...
└── components/
    └── AIChat/
        └── MessageContent.test.tsx
```

### 文檔結構
```
docs/test/
├── TEST-OVERVIEW.md                # 本檔案 (總覽)
├── channels-api-test-cases.md      # /api/channels 測試案例
├── channels-id-api-test-cases.md   # /api/channels/[id] 測試案例
└── ...
```

### 測試範本
每個測試文檔應包含：
1. **API 路徑與功能說明**
2. **測試案例清單** (使用 `[x]` 或 `[ ]` 標記完成狀態)
3. **測試類型標籤**: `[正常情況]` `[邊界值]` `[異常處理]` `[外部依賴故障]` `[特殊情況]`
4. **測試資料與預期結果**
5. **測試覆蓋統計**

---

## 下一步行動

### 建議順序
1. ✅ **已完成**: Channels API, Chat API, Summaries API, Video Check API, Cron API, YouTube Subscriptions API
2. ⏭️ **下一個**: `/api/summaries/batch` (優先級 HIGH)
3. 接著: `/api/summaries/batch` (優先級 HIGH)
4. 接著: `/api/summaries/[id]/retry` (優先級 HIGH)
5. 接著: `/api/summaries/[id]` (優先級 HIGH)
6. 最後: `/api/videos/[id]` (優先級 MEDIUM)

### 使用 gen-workflow-test 工作流程
1. 選擇要測試的 API
2. 執行: `gen-workflow-test [API路徑]`
3. 生成測試案例文檔
4. 實作測試程式碼
5. 執行測試並修復
6. 更新本文檔的完成狀態

---

## 測試品質指標

- ✅ 所有測試必須通過
- ✅ 每個 API 至少包含以下測試類型:
  - 權限驗證 (401)
  - 參數驗證 (400)
  - 資源不存在 (404)
  - 正常情況 (200/201)
  - 外部依賴失敗 (500)
- ✅ Mock 策略:
  - NextAuth session
  - Prisma Database
  - YouTube API
  - Queue (BullMQ)
- ✅ 使用 AAA 模式: Arrange → Act → Assert
- ✅ 一個測試 = 一個斷言重點

---

## 相關指令

```bash
# 執行所有測試
npm run test

# 執行單一測試檔案
npx vitest run test/app/api/channels/route.test.ts

# 執行測試並顯示詳細資訊
npx vitest run --reporter=verbose

# 執行測試並產生覆蓋率報告
npx vitest run --coverage

# 監視模式 (開發時使用)
npx vitest
```

---

**維護者**: AI Agent + Human Review  
**測試框架**: Vitest + TypeScript  
**最後測試執行**: 2026-01-20 (95 tests passed)
