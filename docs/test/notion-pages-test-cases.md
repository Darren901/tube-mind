# Notion Pages API 測試案例

**API Path**: `GET /api/notion/pages`

**功能**: 獲取使用者 Notion 帳戶中可存取的頁面列表

---

## 測試案例清單

### GET - 獲取頁面列表

#### 權限驗證

- [x] [異常處理] 未登入時應回傳 401
  **測試資料**
  - 無 session

  **預期結果**
  - Status: 401
  - Response: `{ error: 'Unauthorized' }`

---

- [x] [異常處理] 未連接 Notion 帳號時應回傳 400
  **測試資料**
  - Session user ID: "user-1"
  - prisma.account.findFirst 回傳 null (找不到 notion provider)

  **預期結果**
  - Status: 400
  - Response: `{ error: 'Notion account not connected' }`

---

- [x] [異常處理] Notion 帳號缺少 access_token 時應回傳 400
  **測試資料**
  - prisma.account.findFirst 回傳 `{ access_token: null }`

  **預期結果**
  - Status: 400
  - Response: `{ error: 'Notion account not connected' }`

---

#### 核心功能

- [x] [正常情況] 成功獲取 Notion 頁面列表
  **測試資料**
  - Session user ID: "user-1"
  - Notion access_token: "ntn-token-123"
  - searchAccessiblePages 回傳:
    ```json
    [{ "id": "page-1", "title": "My Page", "icon": "📄" }]
    ```

  **預期結果**
  - Status: 200
  - Response: `{ pages: [{ "id": "page-1", "title": "My Page", "icon": "📄" }] }`
  - prisma.account.findFirst 被呼叫，參數包含 `provider: "notion"`
  - searchAccessiblePages 被呼叫，參數為 "ntn-token-123"

---

#### 外部依賴處理

- [x] [外部依賴故障] Notion Service 搜尋失敗時應回傳 500
  **測試資料**
  - searchAccessiblePages 拋出錯誤

  **預期結果**
  - Status: 500
  - Response: `{ error: 'Internal Server Error' }`

---

## 測試覆蓋統計

- [x] 權限驗證: 1 個案例 (1/1 通過)
- [x] 核心功能: 1 個案例 (1/1 通過)
- [x] 特殊情況 (未連接 Notion): 2 個案例 (2/2 通過)
- [x] 外部依賴處理: 1 個案例 (1/1 通過)

**總計**: 5 個測試案例
**已實作並通過**: 5/5 ✅

---

## 測試重點

### Mock 策略
- NextAuth session
- Prisma (account.findFirst)
- Notion Service (`searchAccessiblePages`)

### 關鍵檢查
- 確保正確查詢使用者的 Notion access_token
- 確保正確處理 Notion Service 的回傳結果
- 確保錯誤處理邏輯正確 (不洩漏敏感資訊)
