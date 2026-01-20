# Notion Export API 測試案例

**API Path**: `POST /api/summaries/[id]/export/notion`

**功能**: 將指定的摘要內容匯出到使用者的 Notion 頁面

---

## 測試案例清單

### POST - 匯出摘要到 Notion

#### 權限驗證

- [x] [異常處理] 未登入時應回傳 401
  **測試資料**
  - 無 session
  - Summary ID: "sum-1"

  **預期結果**
  - Status: 401
  - Response: `{ error: 'Unauthorized' }`

---

- [x] [異常處理] 嘗試匯出其他使用者的摘要應回傳 403
  **測試資料**
  - Session user ID: "user-1"
  - Summary ID: "sum-2" (屬於 user-2)
  - prisma.summary.findUnique 回傳 userId 為 "user-2" 的摘要

  **預期結果**
  - Status: 403
  - Response: `{ error: 'Unauthorized' }`

---

#### 參數與資源驗證

- [x] [異常處理] 摘要不存在時應回傳 404
  **測試資料**
  - Summary ID: "non-existent"
  - prisma.summary.findUnique 回傳 null

  **預期結果**
  - Status: 404
  - Response: `{ error: 'Summary not found' }`

---

- [x] [異常處理] 使用者尚未設定 Notion Parent Page ID 時應回傳 400
  **測試資料**
  - prisma.user.findUnique 回傳 `{ notionParentPageId: null }`

  **預期結果**
  - Status: 400
  - Response: `{ error: 'Notion settings missing (Parent Page ID)' }`

---

- [x] [異常處理] 未連接 Notion 帳號時應回傳 400
  **測試資料**
  - prisma.account.findFirst 回傳 null

  **預期結果**
  - Status: 400
  - Response: `{ error: 'Notion account not connected' }`

---

- [x] [異常處理] 摘要內容無效或為空時應回傳 400
  **測試資料**
  - Summary content: `{ }` (缺少 topic 和 sections)

  **預期結果**
  - Status: 400
  - Response: `{ error: 'Summary content is invalid or empty' }`

---

#### 核心功能

- [x] [正常情況] 成功匯出摘要到 Notion
  **測試資料**
  - Session user ID: "user-1"
  - Summary ID: "sum-1"
  - Summary content: `{ topic: "AI", sections: [...] }`
  - Notion token: "ntn-token"
  - Parent Page ID: "parent-id"
  - createSummaryPage 回傳成功物件 (包含 url)

  **預期結果**
  - Status: 200
  - Response: `{ success: true, url: "https://notion.so/..." }`
  - createSummaryPage 被呼叫且參數正確

---

#### 外部依賴處理

- [x] [外部依賴故障] Notion Service 建立頁面失敗時應回傳 500
  **測試資料**
  - createSummaryPage 拋出錯誤

  **預期結果**
  - Status: 500
  - Response: `{ error: 'Internal Server Error' }`

---

## 測試覆蓋統計

- [x] 權限驗證: 2 個案例 (2/2 通過)
- [x] 參數與資源驗證: 4 個案例 (4/4 通過)
- [x] 核心功能: 1 個案例 (1/1 通過)
- [x] 外部依賴處理: 1 個案例 (1/1 通過)

**總計**: 8 個測試案例
**已實作並通過**: 8/8 ✅

---

## 測試重點

### Mock 策略
- NextAuth session
- Prisma (user.findUnique, account.findFirst, summary.findUnique)
- Notion Service (`createSummaryPage`)

### 關鍵檢查
- 確保正確串接 User 設定、Account 權限與 Summary 內容
- 確保資料隔離 (只能匯出自己的摘要)
- 確保內容結構驗證正確
