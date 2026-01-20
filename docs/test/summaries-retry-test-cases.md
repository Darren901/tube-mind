# Summaries Retry API 測試案例

**API Path**: `POST /api/summaries/[id]/retry`

**功能**: 重試失敗的摘要任務，重置狀態並重新加入 Queue

---

## 測試案例清單

### 權限驗證

[x] [異常處理] 未登入時應回傳 401
**測試資料**
- 無 session (getServerSession 回傳 null)
- Summary ID: "summary-1"

**預期結果**
- Status: 401
- Response: `{ error: 'Unauthorized' }`

---

[x] [異常處理] 嘗試重試不存在的摘要應回傳 404
**測試資料**
- Session user ID: "user-1"
- Summary ID: "non-existent"
- prisma.summary.findFirst 回傳 null

**預期結果**
- Status: 404
- Response: `{ error: 'Summary not found' }`

---

[x] [異常處理] 嘗試重試其他使用者的摘要應回傳 404
**測試資料**
- Session user ID: "user-1"
- Summary ID: "summary-2" (屬於 user-2)
- prisma.summary.findFirst 回傳 null (因為 userId 不匹配)

**預期結果**
- Status: 404
- Response: `{ error: 'Summary not found' }`
- prisma.summary.findFirst 查詢條件包含 `userId: 'user-1'`

---

### 核心功能

[x] [正常情況] 成功重試失敗的摘要
**測試資料**
- Session user ID: "user-1"
- Summary ID: "summary-1"
- Summary 狀態: "failed"
- Summary errorMessage: "API quota exceeded"
- Summary content: { error: "..." }
- Video: { id: "vid-1", youtubeId: "yt-123" }

**預期結果**
- Status: 200
- Response: `{ success: true }`
- prisma.summary.update 被呼叫，更新為:
  - status: "pending"
  - errorMessage: null
  - content: {}
- addSummaryJob 被呼叫，參數包含:
  - summaryId: "summary-1"
  - videoId: "vid-1"
  - youtubeVideoId: "yt-123"
  - userId: "user-1"

---

[x] [正常情況] 可以重試 pending 狀態的摘要
**測試資料**
- Summary 狀態: "pending"
- 其他條件同上

**預期結果**
- Status: 200
- Response: `{ success: true }`
- 成功重置並重新加入 Queue

---

[x] [正常情況] 可以重試 completed 狀態的摘要
**測試資料**
- Summary 狀態: "completed"
- Summary content: { ... 已有內容 }

**預期結果**
- Status: 200
- Response: `{ success: true }`
- content 被重置為 {}
- 狀態改為 "pending"

---

[x] [正常情況] 資料隔離 - 只能重試自己的摘要
**測試資料**
- Session user ID: "user-1"
- Summary ID: "summary-1" (屬於 user-1)

**預期結果**
- Status: 200
- prisma.summary.findFirst 查詢條件包含:
  - id: "summary-1"
  - userId: "user-1"

---

### 外部依賴處理

[x] [外部依賴故障] Database 更新失敗時應拋出錯誤
**測試資料**
- Session user ID: "user-1"
- Summary 存在
- prisma.summary.update 拋出錯誤

**預期結果**
- 拋出錯誤 (由 Next.js 處理成 500)
- addSummaryJob 不應被呼叫

---

[x] [外部依賴故障] Queue 新增任務失敗時應拋出錯誤
**測試資料**
- Session user ID: "user-1"
- Summary 存在
- prisma.summary.update 成功
- addSummaryJob 拋出錯誤

**預期結果**
- 拋出錯誤 (由 Next.js 處理成 500)
- Summary 狀態已更新為 pending (部分成功)

---

### 資料完整性

[x] [正常情況] 重試時應包含完整的 video 資料
**測試資料**
- Summary 包含 video 關聯資料
- video.youtubeId 存在

**預期結果**
- prisma.summary.findFirst 使用 `include: { video: true }`
- addSummaryJob 接收到正確的 youtubeVideoId

---

[x] [正常情況] 重置時應清除 errorMessage 和 content
**測試資料**
- Summary errorMessage: "Previous error"
- Summary content: { oldData: "..." }

**預期結果**
- prisma.summary.update 更新:
  - errorMessage: null
  - content: {}
  - status: "pending"

---

## 測試覆蓋統計

- ✅ 權限驗證: 3 個案例 (3/3 通過)
- ✅ 核心功能: 4 個案例 (4/4 通過)
- ✅ 外部依賴處理: 2 個案例 (2/2 通過)
- ✅ 資料完整性: 2 個案例 (2/2 通過)

**總計**: 11 個測試案例
**已實作並通過**: 11/11 ✅

---

## 測試重點

### 權限檢查
- ✅ 檢查 session 存在性
- ✅ 檢查摘要存在性
- ✅ 資料隔離 (只能重試自己的摘要)

### 核心邏輯
- ✅ 重置摘要狀態為 pending
- ✅ 清除 errorMessage 和 content
- ✅ 重新加入 Queue
- ✅ 不限制只能重試 failed 狀態 (任何狀態都可以重試)

### 錯誤處理
- ✅ Database 更新失敗
- ✅ Queue 新增失敗

### 資料完整性
- ✅ 包含 video 關聯資料
- ✅ 正確傳遞 youtubeVideoId 給 Queue

### Mock 策略
- NextAuth session
- Prisma (summary.findFirst, summary.update)
- addSummaryJob (Queue)
