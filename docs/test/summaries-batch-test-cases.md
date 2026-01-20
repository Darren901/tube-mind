# Summaries Batch API 測試案例

**API Path**: `POST /api/summaries/batch`

**功能**: 批次建立多個影片的摘要任務

---

## 測試案例清單

### 權限驗證

[x] [異常處理] 未登入時應回傳 401
**測試資料**
- 無 session (getServerSession 回傳 null)
- Request body: `{ videoIds: ['vid-1', 'vid-2'] }`

**預期結果**
- Status: 401
- Response: `{ error: 'Unauthorized' }`

---

### 參數驗證

[x] [異常處理] 缺少 videoIds 時應回傳 400
**測試資料**
- Session user ID: "user-1"
- Request body: `{}`

**預期結果**
- Status: 400
- Response: `{ error: 'videoIds array is required' }`

---

[x] [異常處理] videoIds 不是陣列時應回傳 400
**測試資料**
- Session user ID: "user-1"
- Request body: `{ videoIds: 'not-an-array' }`

**預期結果**
- Status: 400
- Response: `{ error: 'videoIds array is required' }`

---

[x] [異常處理] videoIds 是空陣列時應回傳 400
**測試資料**
- Session user ID: "user-1"
- Request body: `{ videoIds: [] }`

**預期結果**
- Status: 400
- Response: `{ error: 'videoIds array is required' }`

---

### 核心功能 - 正常情況

[x] [正常情況] 成功批次建立多個摘要
**測試資料**
- Session user ID: "user-1"
- Request body: `{ videoIds: ['vid-1', 'vid-2'] }`
- 兩個影片都存在且長度 < 3 小時
- 兩個影片都沒有現有摘要

**預期結果**
- Status: 200
- Response: `{ results: [...]}`
  - vid-1: `{ videoId: 'vid-1', status: 'created', id: 'summary-1' }`
  - vid-2: `{ videoId: 'vid-2', status: 'created', id: 'summary-2' }`
- prisma.summary.create 被呼叫 2 次
- addSummaryJob 被呼叫 2 次

---

[x] [正常情況] 批次處理時跳過不存在的影片
**測試資料**
- Request body: `{ videoIds: ['vid-1', 'vid-999', 'vid-2'] }`
- vid-1 和 vid-2 存在
- vid-999 不存在

**預期結果**
- Status: 200
- Response: `{ results: [...]}`
  - 只包含 vid-1 和 vid-2 的結果
  - vid-999 被靜默跳過 (不在結果中)
- 只建立 2 個摘要

---

### 核心功能 - 部分成功情況

[x] [正常情況] 部分影片已有摘要時應標記 already_exists
**測試資料**
- Request body: `{ videoIds: ['vid-1', 'vid-2', 'vid-3'] }`
- vid-1: 無摘要 (應建立)
- vid-2: 已有摘要 (status: 'completed')
- vid-3: 無摘要 (應建立)

**預期結果**
- Status: 200
- Response: `{ results: [...]}`
  - vid-1: `{ videoId: 'vid-1', status: 'created', id: 'new-summary-1' }`
  - vid-2: `{ videoId: 'vid-2', status: 'already_exists', id: 'existing-summary-2' }`
  - vid-3: `{ videoId: 'vid-3', status: 'created', id: 'new-summary-3' }`
- prisma.summary.create 只被呼叫 2 次 (vid-1 和 vid-3)

---

[x] [邊界值] 部分影片過長 (>3 小時) 時應標記錯誤
**測試資料**
- Request body: `{ videoIds: ['vid-1', 'vid-2', 'vid-3'] }`
- vid-1: duration = 3600 (1 小時) ✅
- vid-2: duration = 11000 (> 3 小時) ❌
- vid-3: duration = 7200 (2 小時) ✅

**預期結果**
- Status: 200
- Response: `{ results: [...]}`
  - vid-1: `{ videoId: 'vid-1', status: 'created', id: 'summary-1' }`
  - vid-2: `{ videoId: 'vid-2', status: 'error', error: 'Video too long (>3h)' }`
  - vid-3: `{ videoId: 'vid-3', status: 'created', id: 'summary-3' }`
- 只建立 2 個摘要

---

[x] [邊界值] 影片剛好 3 小時應允許建立
**測試資料**
- Request body: `{ videoIds: ['vid-1'] }`
- vid-1: duration = 10800 (剛好 3 小時)

**預期結果**
- Status: 200
- Response: `{ results: [{ videoId: 'vid-1', status: 'created', id: 'summary-1' }]}`
- 摘要成功建立

---

[x] [正常情況] 混合多種狀態的批次處理
**測試資料**
- Request body: `{ videoIds: ['vid-1', 'vid-2', 'vid-3', 'vid-999', 'vid-4'] }`
- vid-1: 正常，應建立 ✅
- vid-2: 已有摘要 (already_exists)
- vid-3: 影片過長 (error)
- vid-999: 影片不存在 (跳過)
- vid-4: 正常，應建立 ✅

**預期結果**
- Status: 200
- Response: `{ results: [...]}`
  - vid-1: created
  - vid-2: already_exists
  - vid-3: error (Video too long)
  - vid-4: created
  - (vid-999 不在結果中)
- 只建立 2 個摘要 (vid-1 和 vid-4)

---

### 外部依賴處理

[x] [外部依賴故障] Database 建立摘要失敗時應記錄錯誤
**測試資料**
- Request body: `{ videoIds: ['vid-1', 'vid-2'] }`
- vid-1: prisma.summary.create 成功
- vid-2: prisma.summary.create 拋出錯誤

**預期結果**
- Status: 200 (仍然回傳 200，但 results 中包含錯誤)
- Response: `{ results: [...]}`
  - vid-1: `{ videoId: 'vid-1', status: 'created', id: 'summary-1' }`
  - vid-2: `{ videoId: 'vid-2', status: 'error' }`
- console.error 被呼叫

---

[x] [外部依賴故障] Queue 新增任務失敗時應記錄錯誤
**測試資料**
- Request body: `{ videoIds: ['vid-1', 'vid-2'] }`
- vid-1: addSummaryJob 成功
- vid-2: addSummaryJob 拋出錯誤

**預期結果**
- Status: 200
- Response: `{ results: [...]}`
  - vid-1: `{ videoId: 'vid-1', status: 'created', id: 'summary-1' }`
  - vid-2: `{ videoId: 'vid-2', status: 'error' }`
- console.error 被呼叫

---

### 資料完整性

[x] [正常情況] 資料隔離 - 只檢查當前使用者的摘要
**測試資料**
- Session user ID: "user-1"
- Request body: `{ videoIds: ['vid-1'] }`
- vid-1 已有 user-2 的摘要 (不同使用者)

**預期結果**
- Status: 200
- Response: `{ results: [{ videoId: 'vid-1', status: 'created', id: 'new-summary-1' }]}`
- prisma.summary.findFirst 查詢條件包含 `userId: 'user-1'`
- 為 user-1 建立新的摘要 (不受 user-2 影響)

---

[x] [邊界值] 批次處理大量影片 (10 個)
**測試資料**
- Request body: `{ videoIds: ['vid-1', 'vid-2', ..., 'vid-10'] }`
- 所有影片都存在且符合條件

**預期結果**
- Status: 200
- Response: `{ results: [...]}` (包含 10 個結果)
- 所有 10 個摘要都成功建立

---

## 測試覆蓋統計

- ✅ 權限驗證: 1 個案例 (1/1 通過)
- ✅ 參數驗證: 3 個案例 (3/3 通過)
- ✅ 核心功能 - 正常情況: 2 個案例 (2/2 通過)
- ✅ 核心功能 - 部分成功: 4 個案例 (4/4 通過)
- ✅ 外部依賴處理: 2 個案例 (2/2 通過)
- ✅ 資料完整性: 2 個案例 (2/2 通過)

**總計**: 14 個測試案例
**已實作並通過**: 14/14 ✅

---

## 測試重點

### 參數檢查
- ✅ videoIds 必須存在
- ✅ videoIds 必須是陣列
- ✅ videoIds 不能是空陣列

### 批次處理邏輯
- ✅ 跳過不存在的影片 (靜默跳過，不在結果中)
- ✅ 檢查影片長度限制 (3 小時)
- ✅ 檢查摘要是否已存在
- ✅ 部分成功處理 (混合多種狀態)

### 錯誤處理
- ✅ 個別影片失敗不影響其他影片
- ✅ 回傳 200 但 results 中包含錯誤狀態
- ✅ 記錄錯誤到 console

### 資料隔離
- ✅ 只檢查當前使用者的摘要 (不同使用者可以對同一影片建立各自的摘要)

### Mock 策略
- NextAuth session
- Prisma (video.findUnique, summary.findFirst, summary.create)
- addSummaryJob (Queue)
