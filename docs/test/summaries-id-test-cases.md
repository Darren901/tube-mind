# Summaries by ID API 測試案例

**API Path**: `GET/DELETE /api/summaries/[id]`

**功能**: 獲取或刪除單一摘要

---

## 測試案例清單

### GET - 獲取單一摘要

#### 權限驗證

[x] [異常處理] 未登入時應回傳 401
**測試資料**
- 無 session (getServerSession 回傳 null)
- Summary ID: "summary-1"

**預期結果**
- Status: 401
- Response: `{ error: 'Unauthorized' }`

---

[x] [異常處理] 嘗試獲取不存在的摘要應回傳 404
**測試資料**
- Session user ID: "user-1"
- Summary ID: "non-existent"
- prisma.summary.findFirst 回傳 null

**預期結果**
- Status: 404
- Response: `{ error: 'Summary not found' }`

---

[x] [異常處理] 嘗試獲取其他使用者的摘要應回傳 404
**測試資料**
- Session user ID: "user-1"
- Summary ID: "summary-2" (屬於 user-2)
- prisma.summary.findFirst 回傳 null (因為 userId 不匹配)

**預期結果**
- Status: 404
- Response: `{ error: 'Summary not found' }`
- prisma.summary.findFirst 查詢條件包含 `userId: 'user-1'`

---

#### 核心功能

[x] [正常情況] 成功獲取自己的摘要詳情
**測試資料**
- Session user ID: "user-1"
- Summary ID: "summary-1"
- Summary 包含完整資料:
  - id, videoId, userId, status, content
  - video: { id, title, channel: { id, title } }

**預期結果**
- Status: 200
- Response: 包含完整的 summary 資料
- 包含關聯的 video 和 channel 資料
- prisma.summary.findFirst 使用 `include: { video: { include: { channel: true } } }`

---

[x] [正常情況] 獲取不同狀態的摘要
**測試資料**
- Summary status: "completed"
- Summary content: { summary: "...", keyPoints: [...] }

**預期結果**
- Status: 200
- Response: 包含完整的 content 資料

---

[x] [正常情況] 獲取 failed 狀態的摘要
**測試資料**
- Summary status: "failed"
- Summary errorMessage: "API quota exceeded"

**預期結果**
- Status: 200
- Response: 包含 errorMessage

---

[x] [正常情況] 資料隔離 - 只能獲取自己的摘要
**測試資料**
- Session user ID: "user-1"
- Summary ID: "summary-1"

**預期結果**
- prisma.summary.findFirst 查詢條件包含:
  - id: "summary-1"
  - userId: "user-1"

---

### DELETE - 刪除單一摘要

#### 權限驗證

[x] [異常處理] 未登入時應回傳 401
**測試資料**
- 無 session
- Summary ID: "summary-1"

**預期結果**
- Status: 401
- Response: `{ error: 'Unauthorized' }`

---

[x] [異常處理] 嘗試刪除不存在的摘要應回傳 404
**測試資料**
- Session user ID: "user-1"
- Summary ID: "non-existent"
- prisma.summary.findFirst 回傳 null

**預期結果**
- Status: 404
- Response: `{ error: 'Summary not found' }`
- prisma.summary.delete 不應被呼叫

---

[x] [異常處理] 嘗試刪除其他使用者的摘要應回傳 404
**測試資料**
- Session user ID: "user-1"
- Summary ID: "summary-2" (屬於 user-2)
- prisma.summary.findFirst 回傳 null

**預期結果**
- Status: 404
- Response: `{ error: 'Summary not found' }`
- prisma.summary.delete 不應被呼叫

---

#### 核心功能

[x] [正常情況] 成功刪除自己的摘要
**測試資料**
- Session user ID: "user-1"
- Summary ID: "summary-1"
- Summary 存在且屬於 user-1

**預期結果**
- Status: 200
- Response: `{ success: true }`
- prisma.summary.delete 被呼叫，參數為 `{ where: { id: 'summary-1' } }`

---

[x] [正常情況] 資料隔離 - 只能刪除自己的摘要
**測試資料**
- Session user ID: "user-1"
- Summary ID: "summary-1"

**預期結果**
- prisma.summary.findFirst 查詢條件包含:
  - id: "summary-1"
  - userId: "user-1"

---

#### 外部依賴處理

[x] [外部依賴故障] Database 刪除失敗時應拋出錯誤
**測試資料**
- Summary 存在
- prisma.summary.delete 拋出錯誤

**預期結果**
- 拋出錯誤 (由 Next.js 處理成 500)

---

## 測試覆蓋統計

- ✅ GET 權限驗證: 3 個案例 (3/3 通過)
- ✅ GET 核心功能: 4 個案例 (4/4 通過)
- ✅ DELETE 權限驗證: 3 個案例 (3/3 通過)
- ✅ DELETE 核心功能: 2 個案例 (2/2 通過)
- ✅ DELETE 外部依賴處理: 1 個案例 (1/1 通過)

**總計**: 13 個測試案例
**已實作並通過**: 13/13 ✅

---

## 測試重點

### GET 端點
- ✅ 權限驗證與資料隔離
- ✅ 包含完整關聯資料 (video, channel)
- ✅ 支援不同狀態的摘要 (completed, failed, pending)

### DELETE 端點
- ✅ 權限驗證與資料隔離
- ✅ 刪除前檢查摘要存在性
- ✅ 錯誤處理

### Mock 策略
- NextAuth session
- Prisma (summary.findFirst, summary.delete)

---

## 注意事項

**此 API 不包含 PATCH 方法**  
原始規劃中提到的 PATCH 功能在實際程式碼中不存在，只有 GET 和 DELETE 兩個方法。
