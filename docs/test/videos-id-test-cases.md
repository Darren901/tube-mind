# Video by ID API 測試案例

**API Path**: `GET /api/videos/[id]`

**功能**: 獲取單一影片詳情，包含頻道資訊及當前使用者的摘要紀錄

---

## 測試案例清單

### GET - 獲取影片詳情

#### 權限驗證

- [ ] [異常處理] 未登入時應回傳 401
  **測試資料**
  - 無 session (getServerSession 回傳 null)
  - Video ID: "vid-1"

  **預期結果**
  - Status: 401
  - Response: `{ error: 'Unauthorized' }`

---

- [ ] [異常處理] 嘗試獲取不存在的影片應回傳 404
  **測試資料**
  - Session user ID: "user-1"
  - Video ID: "non-existent"
  - prisma.video.findUnique 回傳 null

  **預期結果**
  - Status: 404
  - Response: `{ error: 'Video not found' }`

---

#### 核心功能

- [ ] [正常情況] 成功獲取影片詳情 (包含頻道與摘要)
  **測試資料**
  - Session user ID: "user-1"
  - Video ID: "vid-1"
  - Video 資料:
    - id: "vid-1", title: "Video Title"
    - channel: { id: "chan-1", title: "Channel Title" }
    - summaries: [{ id: "sum-1", status: "completed", userId: "user-1" }]

  **預期結果**
  - Status: 200
  - Response: 包含影片、頻道及該使用者的摘要列表
  - prisma.video.findUnique 查詢條件包含:
    - `include.channel: true`
    - `include.summaries.where.userId: "user-1"`

---

- [ ] [正常情況] 影片存在但該使用者尚未建立摘要
  **測試資料**
  - Session user ID: "user-1"
  - Video ID: "vid-1"
  - Video 資料:
    - id: "vid-1"
    - channel: { ... }
    - summaries: [] (該使用者無摘要)

  **預期結果**
  - Status: 200
  - Response 內容: `summaries` 為空陣列 `[]`

---

- [ ] [正常情況] 資料隔離 - 只應包含當前使用者的摘要
  **測試資料**
  - Session user ID: "user-1"
  - Video ID: "vid-1"
  - Database 中有其他使用者的摘要，但 `prisma.video.findUnique` 應過濾掉

  **預期結果**
  - prisma.video.findUnique 的 `summaries` 查詢參數包含 `where: { userId: "user-1" }`

---

#### 外部依賴處理

- [ ] [外部依賴故障] Database 查詢失敗時應回傳 500
  **測試資料**
  - Video ID: "vid-1"
  - prisma.video.findUnique 拋出錯誤

  **預期結果**
  - Status: 500 (由 Next.js 處理)

---

## 測試覆蓋統計

- [ ] 權限驗證: 1 個案例
- [ ] 核心功能: 4 個案例
- [ ] 外部依賴處理: 1 個案例

**總計**: 6 個測試案例
**已實作並通過**: 0/6

---

## 測試重點

### Mock 策略
- NextAuth session
- Prisma (video.findUnique)

### 關鍵檢查
- 確保 `summaries` 的過濾邏輯正確 (userId 匹配)
- 確保 `channel` 關聯被正確載入
- 確保正確處理資源不存在的情況 (404)
