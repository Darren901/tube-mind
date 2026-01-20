# YouTube Subscriptions API 測試案例

**API Path**: `GET /api/youtube/subscriptions`

**功能**: 獲取使用者的 YouTube 訂閱頻道列表，並標記哪些已新增到系統中

---

## 測試案例清單

### 權限驗證

[x] [異常處理] 未登入時應回傳 401
**測試資料**
- 無 session (getServerSession 回傳 null)

**預期結果**
- Status: 401
- Response: `{ error: 'Unauthorized' }`

---

[x] [異常處理] Session 缺少 accessToken 時應回傳 401
**測試資料**
- Session 存在但 accessToken 為 undefined
- Session: `{ user: { id: 'user-1' } }` (無 accessToken)

**預期結果**
- Status: 401
- Response: `{ error: 'Unauthorized' }`

---

### 核心功能

[x] [正常情況] 成功獲取訂閱列表且無已新增頻道
**測試資料**
- Session user ID: "user-1"
- Session accessToken: "valid-token"
- YouTube API 回傳 2 個訂閱頻道:
  - { id: "UC123", title: "Channel A", thumbnail: "thumb-a.jpg" }
  - { id: "UC456", title: "Channel B", thumbnail: "thumb-b.jpg" }
- Database 中使用者沒有新增任何頻道

**預期結果**
- Status: 200
- Response: 包含 2 個頻道，所有 isAdded 都是 false
- YouTubeClient.getSubscriptions() 被呼叫一次
- prisma.channel.findMany 查詢條件包含正確的 userId 和 youtubeId

---

[x] [正常情況] 成功獲取訂閱列表且部分頻道已新增
**測試資料**
- Session user ID: "user-1"
- YouTube API 回傳 3 個訂閱頻道:
  - { id: "UC123", title: "Channel A" }
  - { id: "UC456", title: "Channel B" }
  - { id: "UC789", title: "Channel C" }
- Database 中使用者已新增 UC123 和 UC789

**預期結果**
- Status: 200
- Response: 
  - UC123: isAdded = true
  - UC456: isAdded = false
  - UC789: isAdded = true
- 正確標記已新增的頻道

---

[x] [正常情況] 成功獲取訂閱列表且所有頻道都已新增
**測試資料**
- Session user ID: "user-1"
- YouTube API 回傳 2 個訂閱頻道
- Database 中使用者已新增這 2 個頻道

**預期結果**
- Status: 200
- Response: 所有頻道的 isAdded 都是 true

---

[x] [邊界值] 使用者沒有任何訂閱頻道
**測試資料**
- Session user ID: "user-1"
- YouTube API 回傳空陣列 []

**預期結果**
- Status: 200
- Response: 空陣列 []
- prisma.channel.findMany 查詢條件 youtubeId: { in: [] }

---

[x] [正常情況] 資料隔離 - 只查詢當前使用者的頻道
**測試資料**
- Session user ID: "user-1"
- YouTube API 回傳頻道 UC123
- Database 中:
  - user-1 已新增 UC123
  - user-2 也已新增 UC123 (不同使用者)

**預期結果**
- Status: 200
- prisma.channel.findMany 的 where 條件包含 `userId: 'user-1'`
- UC123 的 isAdded = true (因為 user-1 有新增)

---

### 外部依賴處理

[x] [外部依賴故障] YouTube API 調用失敗時應回傳 500
**測試資料**
- Session user ID: "user-1"
- Session accessToken: "valid-token"
- youtube.getSubscriptions() 拋出錯誤: "API quota exceeded"

**預期結果**
- Status: 500
- Response: `{ error: 'API quota exceeded' }`
- console.error 被呼叫

---

[x] [外部依賴故障] YouTube API 回傳錯誤但無 message
**測試資料**
- youtube.getSubscriptions() 拋出錯誤物件: `{}`

**預期結果**
- Status: 500
- Response: `{ error: 'Failed to fetch subscriptions' }`

---

[x] [外部依賴故障] Database 查詢失敗時應回傳 500
**測試資料**
- Session user ID: "user-1"
- YouTube API 成功回傳訂閱列表
- prisma.channel.findMany() 拋出錯誤: "Database connection failed"

**預期結果**
- Status: 500
- Response: `{ error: 'Database connection failed' }`

---

## 測試覆蓋統計

- ✅ 權限驗證: 2 個案例 (2/2 通過)
- ✅ 核心功能: 5 個案例 (5/5 通過)
- ✅ 外部依賴故障: 3 個案例 (3/3 通過)

**總計**: 10 個測試案例
**已實作並通過**: 10/10 ✅

---

## 測試重點

### 權限檢查
- ✅ 檢查 session 存在性
- ✅ 檢查 accessToken 存在性

### 核心邏輯
- ✅ YouTube API 整合
- ✅ 標記已新增頻道 (isAdded 邏輯)
- ✅ 資料隔離 (只查詢當前使用者的頻道)
- ✅ 邊界值處理 (空訂閱列表)

### 錯誤處理
- ✅ YouTube API 失敗
- ✅ Database 失敗
- ✅ 錯誤訊息處理

### Mock 策略
- NextAuth session
- YouTubeClient.getSubscriptions()
- Prisma channel.findMany()
