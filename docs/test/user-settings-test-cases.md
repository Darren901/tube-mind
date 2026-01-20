# User Settings API 測試案例

**API Path**: `PATCH /api/user/settings`

**功能**: 更新使用者設定 (目前主要是 Notion Parent Page ID)

---

## 測試案例清單

### PATCH - 更新設定

#### 權限驗證

- [ ] [異常處理] 未登入時應回傳 401
  **測試資料**
  - 無 session
  - Body: `{ notionParentPageId: "page-1" }`

  **預期結果**
  - Status: 401
  - Response: `{ error: 'Unauthorized' }`

---

#### 參數驗證

- [ ] [異常處理] 缺少 notionParentPageId 時應回傳 400
  **測試資料**
  - Body: `{ }`

  **預期結果**
  - Status: 400
  - Response: `{ error: 'Invalid notionParentPageId' }`

---

- [ ] [異常處理] notionParentPageId 格式錯誤 (非字串) 時應回傳 400
  **測試資料**
  - Body: `{ notionParentPageId: 123 }`

  **預期結果**
  - Status: 400
  - Response: `{ error: 'Invalid notionParentPageId' }`

---

#### 核心功能

- [ ] [正常情況] 成功更新 Notion Parent Page ID
  **測試資料**
  - Session user ID: "user-1"
  - Body: `{ notionParentPageId: "new-page-id" }`
  - prisma.user.update 回傳更新後的 user

  **預期結果**
  - Status: 200
  - Response: `{ success: true, user: { id: "user-1", notionParentPageId: "new-page-id" } }`
  - prisma.user.update 被呼叫，參數包含:
    - `where: { id: "user-1" }`
    - `data: { notionParentPageId: "new-page-id" }`

---

#### 外部依賴處理

- [ ] [外部依賴故障] Database 更新失敗時應回傳 500
  **測試資料**
  - Body: `{ notionParentPageId: "page-1" }`
  - prisma.user.update 拋出錯誤

  **預期結果**
  - Status: 500
  - Response: `{ error: 'Failed to update settings' }`

---

## 測試覆蓋統計

- [ ] 權限驗證: 1 個案例
- [ ] 參數驗證: 2 個案例
- [ ] 核心功能: 1 個案例
- [ ] 外部依賴處理: 1 個案例

**總計**: 5 個測試案例
**已實作並通過**: 0/5

---

## 測試重點

### Mock 策略
- NextAuth session
- Prisma (user.update)

### 關鍵檢查
- 確保只更新當前登入的使用者
- 確保參數驗證邏輯正確
- 確保錯誤處理邏輯正確 (try-catch)
