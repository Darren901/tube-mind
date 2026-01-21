# Summary Worker 測試案例

**測試檔案**: `Test/lib/workers/summaryWorker.test.ts`  
**原始檔案**: `lib/workers/summaryWorker.ts`  
**生成日期**: 2026-01-21

---

## 測試維度檢核表

- ✅ **正常情況 (Happy Path)**: Worker 處理流程完整測試
- ✅ **邊界值 (Edge Cases)**: 空字幕、缺少資料等
- ✅ **異常處理 (Error Handling)**: Summary 不存在、字幕抓取失敗、AI 生成失敗
- ✅ **外部依賴故障 (External Failures)**: Prisma、YouTube Client、AI Summarizer、Notion Service
- ✅ **並發與數據完整性 (Concurrency & Integrity)**: Job 狀態更新、錯誤處理事件

---

## 核心 Worker 處理流程測試

### 1. 正常情況 - 完整流程

[x] [正常情況] 應該成功完成完整的影片摘要流程 (不含 Notion 同步)
**測試資料**
```typescript
jobData = {
  summaryId: 'summary-123',
  videoId: 'video-123',
  youtubeVideoId: 'dQw4w9WgXcQ',
  userId: 'user-123'
}
```

**預期結果**
- Summary 狀態依序更新: `pending` → `processing` → `completed`
- `jobId` 被正確設定
- Video 的 `transcript` 被儲存
- Summary 的 `content` 被正確儲存為 SummaryResult
- `completedAt` 被設定為當前時間
- 返回 `{ success: true }`

---

[x] [正常情況] 應該成功完成完整流程並自動同步到 Notion
**測試資料**
```typescript
jobData = {
  summaryId: 'summary-123',
  videoId: 'video-123',
  youtubeVideoId: 'dQw4w9WgXcQ',
  userId: 'user-123'
}
channel.autoSyncNotion = true
user.notionParentPageId = 'notion-page-123'
notionAccount.access_token = 'notion-token-abc'
```

**預期結果**
- 完成基本流程 (同上)
- `notionSyncStatus` 依序更新: `PENDING` → `SUCCESS`
- `notionUrl` 被設定為 Notion 返回的 URL
- `createSummaryPage()` 被正確呼叫，參數包含:
  - access_token
  - parent page ID
  - summaryContent
  - video metadata (title, url, videoId, thumbnailUrl)

---

### 2. Notion 同步條件判斷

[x] [正常情況] 應該在 autoSyncNotion 為 false 時跳過 Notion 同步
**測試資料**
```typescript
channel.autoSyncNotion = false
```

**預期結果**
- 基本流程完成
- `createSummaryPage()` 不應該被呼叫
- `notionSyncStatus` 保持 null

---

[x] [邊界值] 應該在缺少 notionParentPageId 時跳過 Notion 同步
**測試資料**
```typescript
channel.autoSyncNotion = true
user.notionParentPageId = null
notionAccount.access_token = 'valid-token'
```

**預期結果**
- 基本流程完成
- `createSummaryPage()` 不應該被呼叫
- Console 輸出 "Skipping Notion sync: Missing credentials"

---

[x] [邊界值] 應該在缺少 Notion access_token 時跳過 Notion 同步
**測試資料**
```typescript
channel.autoSyncNotion = true
user.notionParentPageId = 'notion-page-123'
user.accounts = [] (沒有 Notion 帳號)
```

**預期結果**
- 基本流程完成
- `createSummaryPage()` 不應該被呼叫
- Console 輸出 "Skipping Notion sync: Missing credentials"

---

[x] [異常處理] 應該在 Notion 同步失敗時記錄錯誤但不影響主流程
**測試資料**
```typescript
channel.autoSyncNotion = true
user.notionParentPageId = 'notion-page-123'
notionAccount.access_token = 'valid-token'
createSummaryPage() 拋出錯誤: "Notion API Error"
```

**預期結果**
- 基本流程完成 (Summary 狀態仍為 `completed`)
- `notionSyncStatus` 更新為 `FAILED`
- `notionError` 被設定為 "Notion API Error"
- Console 輸出錯誤訊息

---

### 3. 錯誤處理 - 資源不存在

[x] [異常處理] 應該在 Summary 不存在時拋出錯誤
**測試資料**
```typescript
summaryId = 'non-existent-id'
prisma.summary.findUnique() 返回 null
```

**預期結果**
- 拋出錯誤: "Summary {summaryId} not found"
- Summary 狀態已更新為 `processing` (在查詢之前)

---

### 4. 錯誤處理 - 字幕抓取失敗

[x] [異常處理] 應該在字幕為空時拋出錯誤
**測試資料**
```typescript
getVideoTranscript() 返回 []
```

**預期結果**
- 拋出錯誤: "No transcript available for this video"
- Summary 狀態已更新為 `processing`

---

[x] [異常處理] 應該在字幕為 null 時拋出錯誤
**測試資料**
```typescript
getVideoTranscript() 返回 null
```

**預期結果**
- 拋出錯誤: "No transcript available for this video"

---

### 5. 錯誤處理 - AI 生成失敗

[x] [異常處理] 應該在 AI 生成摘要失敗時拋出錯誤
**測試資料**
```typescript
generateSummaryWithRetry() 拋出錯誤: "AI service unavailable"
```

**預期結果**
- 拋出錯誤並傳遞給 Worker 錯誤處理器
- Video 的 transcript 已儲存 (在 AI 生成之前)

---

### 6. 錯誤處理 - Database 操作失敗

[x] [外部依賴故障] 應該在初始狀態更新失敗時拋出錯誤
**測試資料**
```typescript
prisma.summary.update() (第一次呼叫) 拋出錯誤: "Database connection failed"
```

**預期結果**
- 拋出錯誤: "Database connection failed"
- Worker 應該傳遞錯誤

---

[x] [外部依賴故障] 應該在最終狀態更新失敗時拋出錯誤
**測試資料**
```typescript
prisma.summary.update() (儲存 completed 結果時) 拋出錯誤: "Database write failed"
```

**預期結果**
- 拋出錯誤: "Database write failed"
- 字幕和摘要已成功生成 (在資料庫更新之前)

---

## Worker 事件處理測試

### 7. 'failed' 事件處理

[x] [異常處理] 應該在 Job 失敗時更新 Summary 狀態為 failed
**測試資料**
```typescript
Worker 觸發 'failed' 事件
job.data.summaryId = 'summary-123'
error.message = 'Processing failed'
```

**預期結果**
- `prisma.summary.update()` 被呼叫
- Summary 狀態更新為 `failed`
- `errorMessage` 被設定為 "Processing failed"
- Console 輸出錯誤訊息

---

[x] [邊界值] 應該在 Job 沒有 summaryId 時不更新 Summary
**測試資料**
```typescript
Worker 觸發 'failed' 事件
job.data.summaryId = undefined
```

**預期結果**
- `prisma.summary.update()` 不應該被呼叫
- Console 輸出錯誤訊息 (但不嘗試更新資料庫)

---

### 8. 'completed' 事件處理

[x] [正常情況] 應該在 Job 完成時記錄 log
**測試資料**
```typescript
Worker 觸發 'completed' 事件
job.id = 'job-456'
```

**預期結果**
- Console 輸出: "[Worker] ✅ Job job-456 completed"

---

## 資料完整性測試

### 9. 關聯資料載入

[x] [正常情況] 應該在完成時載入所有必要的關聯資料
**測試資料**
```typescript
正常的 Job Data
```

**預期結果**
- `prisma.summary.update()` (最終更新) 使用 `include`:
  - `video` (包含 `channel`)
  - `user` (包含 `accounts` where provider = 'notion')
- 所有關聯資料正確載入

---

[x] [邊界值] 應該處理 Video 沒有 thumbnail 的情況
**測試資料**
```typescript
video.thumbnail = null
```

**預期結果**
- Notion 同步時，`thumbnailUrl` 為 `undefined` (不是 null)
- 其他流程正常完成

---

### 10. 並發控制

[x] [並發與數據完整性] 應該設定正確的 Worker 並發數量
**測試資料**
```typescript
檢查 Worker 配置
```

**預期結果**
- `concurrency` 設定為 2
- Redis connection 正確配置

---

## 涵蓋的測試類型總結

- **正常情況**: 5 個
- **邊界值**: 5 個
- **異常處理**: 6 個
- **外部依賴故障**: 2 個
- **並發與數據完整性**: 2 個

**總計**: 20 個測試案例

---

**維護者**: AI Agent  
**最後更新**: 2026-01-21
