# Channel by ID API 測試案例

**API Path**: `/api/channels/[id]`

**功能**: 單一頻道的 CRUD 操作 (GET, PATCH, DELETE)

---

## 測試案例清單

### GET - 獲取單一頻道詳情

#### 權限驗證

[x] [異常處理] 未登入時應回傳 401
**測試資料**
- 無 session (未登入)
- Channel ID: "channel-1"

**預期結果**
- Status: 401
- Response: `{ error: 'Unauthorized' }`

---

[x] [正常情況] 成功獲取自己的頻道詳情
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1" (屬於 user-1)
- Database: 頻道存在且包含 50 個影片

**預期結果**
- Status: 200
- Response 包含：
  - 頻道基本資訊
  - videos 陣列（最多 50 個，依 publishedAt 降冪排序）

---

[x] [異常處理] 嘗試獲取不存在的頻道應回傳 404
**測試資料**
- Session user ID: "user-1"
- Channel ID: "non-existent-channel"
- Database: 該 ID 不存在

**預期結果**
- Status: 404
- Response: `{ error: 'Channel not found' }`

---

[x] [異常處理] 嘗試獲取其他使用者的頻道應回傳 404
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-2" (屬於 user-2)

**預期結果**
- Status: 404
- Response: `{ error: 'Channel not found' }`
- 不洩漏頻道是否存在

---

[x] [邊界值] 頻道沒有影片時應回傳空陣列
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1"
- Database: 頻道存在但沒有影片

**預期結果**
- Status: 200
- Response.videos = []

---

[x] [邊界值] 頻道有超過 50 個影片時只回傳最新 50 個
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1"
- Database: 頻道有 100 個影片

**預期結果**
- Status: 200
- Response.videos.length = 50
- 影片按 publishedAt 降冪排序

---

### PATCH - 更新頻道設定

#### 權限驗證

[x] [異常處理] 未登入時應回傳 401
**測試資料**
- 無 session
- Channel ID: "channel-1"
- Body: `{ autoRefresh: true }`

**預期結果**
- Status: 401
- Response: `{ error: 'Unauthorized' }`

---

[x] [正常情況] 成功啟用自動刷新
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1"
- Body: `{ autoRefresh: true }`

**預期結果**
- Status: 200
- Response.autoRefresh = true
- Database 已更新

---

[x] [正常情況] 成功停用自動刷新
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1"
- Body: `{ autoRefresh: false }`

**預期結果**
- Status: 200
- Response.autoRefresh = false
- Database 已更新

---

[x] [異常處理] 嘗試更新不存在的頻道應回傳 404
**測試資料**
- Session user ID: "user-1"
- Channel ID: "non-existent"
- Body: `{ autoRefresh: true }`

**預期結果**
- Status: 404
- Response: `{ error: 'Channel not found' }`

---

[x] [異常處理] 嘗試更新其他使用者的頻道應回傳 404
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-2" (屬於 user-2)
- Body: `{ autoRefresh: true }`

**預期結果**
- Status: 404
- Response: `{ error: 'Channel not found' }`

---

[x] [外部依賴故障] Database 更新失敗時應回傳錯誤
**測試資料**
- Mock prisma.channel.update() 拋出錯誤

**預期結果**
- 拋出錯誤（由 Next.js 處理成 500）

---

### DELETE - 刪除頻道

#### 權限驗證

[x] [異常處理] 未登入時應回傳 401
**測試資料**
- 無 session
- Channel ID: "channel-1"

**預期結果**
- Status: 401
- Response: `{ error: 'Unauthorized' }`

---

[x] [正常情況] 成功刪除自己的頻道
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1"
- Database: 頻道存在

**預期結果**
- Status: 200
- Response: `{ success: true }`
- Database 中頻道已刪除

---

[x] [異常處理] 嘗試刪除不存在的頻道應回傳 404
**測試資料**
- Session user ID: "user-1"
- Channel ID: "non-existent"

**預期結果**
- Status: 404
- Response: `{ error: 'Channel not found' }`

---

[x] [異常處理] 嘗試刪除其他使用者的頻道應回傳 404
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-2" (屬於 user-2)

**預期結果**
- Status: 404
- Response: `{ error: 'Channel not found' }`

---

[x] [並發與數據完整性] 刪除頻道時應級聯刪除相關資料
**測試資料**
- Channel ID: "channel-1"
- Database: 頻道有關聯的 videos 和 summaries

**預期結果**
- 頻道刪除成功
- 相關的 videos 和 summaries 根據 Prisma schema 的 cascade 設定處理

**註**: 此為資料庫層級的約束測試，可能需要整合測試

---

[x] [外部依賴故障] Database 刪除失敗時應回傳錯誤
**測試資料**
- Mock prisma.channel.delete() 拋出錯誤

**預期結果**
- 拋出錯誤（由 Next.js 處理成 500）

---

## 測試覆蓋統計

### GET 方法
- ✅ 正常情況: 1 個案例 (1/1 通過)
- ✅ 邊界值: 2 個案例 (2/2 通過)
- ✅ 異常處理: 3 個案例 (3/3 通過)
**小計**: 6 個測試案例 (6/6 通過)

### PATCH 方法
- ✅ 正常情況: 2 個案例 (2/2 通過)
- ✅ 異常處理: 3 個案例 (3/3 通過)
- ✅ 外部依賴故障: 1 個案例 (1/1 通過)
**小計**: 6 個測試案例 (6/6 通過)

### DELETE 方法
- ✅ 正常情況: 1 個案例 (1/1 通過)
- ✅ 異常處理: 3 個案例 (3/3 通過)
- ✅ 外部依賴故障: 1 個案例 (1/1 通過)
- ⚠️ 並發與數據完整性: 1 個案例（整合測試，未實作）
**小計**: 6 個測試案例 (5/6 通過，1 個為整合測試範疇)

**總計**: 18 個測試案例
**已實作並通過**: 17 個測試 ✅
**整合測試範疇**: 1 個測試
