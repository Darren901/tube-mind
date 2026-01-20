# Channel Refresh API 測試案例

**API Path**: `POST /api/channels/[id]/refresh`

**功能**: 手動刷新頻道，檢查最新影片並自動建立摘要任務

---

## 測試案例清單

### 權限驗證

[x] [異常處理] 未登入時應回傳 401
**測試資料**
- 無 session (未登入)
- Channel ID: "channel-1"

**預期結果**
- Status: 401
- Response: `{ error: 'Unauthorized' }`

---

[x] [異常處理] 嘗試刷新不存在的頻道應回傳 404
**測試資料**
- Session user ID: "user-1"
- Channel ID: "non-existent"

**預期結果**
- Status: 404
- Response: `{ error: 'Channel not found' }`

---

[x] [異常處理] 嘗試刷新其他使用者的頻道應回傳 404
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-2" (屬於 user-2)

**預期結果**
- Status: 404
- Response: `{ error: 'Channel not found' }`

---

### 速率限制 (Rate Limiting)

[x] [異常處理] 一小時內重複刷新應回傳 429
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1"
- lastCheckedAt: 30 分鐘前

**預期結果**
- Status: 429
- Response: `{ error: '更新過於頻繁，請一小時後再試。' }`
- Database 的 lastCheckedAt 不應更新

---

[x] [邊界值] 剛好一小時後應允許刷新
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1"
- lastCheckedAt: 剛好 1 小時前 (3600000 ms)

**預期結果**
- Status: 200
- 執行刷新成功

---

[x] [邊界值] 超過一小時後應允許刷新
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1"
- lastCheckedAt: 2 小時前

**預期結果**
- Status: 200
- 執行刷新成功

---

[x] [正常情況] 第一次刷新 (lastCheckedAt 為 null) 應成功
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1"
- lastCheckedAt: null

**預期結果**
- Status: 200
- 執行刷新成功

---

### 核心功能

[x] [正常情況] 成功刷新並找到新影片
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1"
- Mock YouTube API 回傳 2 個新影片

**預期結果**
- Status: 200
- Response: `{ newVideos: 2 }`
- Database 新增 2 個 Video 記錄
- Database 新增 2 個 Summary 記錄（status: 'pending'）
- Queue 新增 2 個摘要任務
- lastCheckedAt 已更新為當前時間

---

[x] [正常情況] 刷新但沒有新影片
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1"
- Mock YouTube API 回傳的影片都已存在

**預期結果**
- Status: 200
- Response: `{ newVideos: 0 }`
- 不建立重複的 Video 或 Summary
- lastCheckedAt 已更新

---

[x] [邊界值] 影片已存在時不應重複建立
**測試資料**
- Database: 已有影片 youtubeId="vid-123"
- Mock YouTube API 回傳包含 "vid-123"

**預期結果**
- Status: 200
- Response: `{ newVideos: 0 }`
- 不建立重複記錄

---

[x] [正常情況] 應立即更新 lastCheckedAt 時間戳
**測試資料**
- Session user ID: "user-1"
- Channel ID: "channel-1"

**預期結果**
- 在調用 YouTube API 之前就更新 lastCheckedAt
- 防止並發請求繞過速率限制

---

### 外部依賴處理

[x] [外部依賴故障] YouTube API 調用失敗時應回傳錯誤
**測試資料**
- Mock YouTubeClient.getChannelVideos() 拋出錯誤

**預期結果**
- 拋出錯誤（由 Next.js 處理成 500）
- lastCheckedAt 已更新（在調用前更新）

---

[x] [外部依賴故障] Database 操作失敗時應回傳錯誤
**測試資料**
- Mock prisma.video.create() 拋出錯誤

**預期結果**
- 拋出錯誤（由 Next.js 處理成 500）

---

[x] [外部依賴故障] Queue 新增任務失敗時應回傳錯誤
**測試資料**
- Mock addSummaryJob() 拋出錯誤

**預期結果**
- 拋出錯誤（由 Next.js 處理成 500）

---

### 特殊情況

[x] [特殊情況] Session 缺少 accessToken 時應處理
**測試資料**
- Session user ID: "user-1"
- session.accessToken 為 undefined

**預期結果**
- YouTubeClient 接收到 undefined 並拋出錯誤
- 或在調用前檢查並回傳適當錯誤

---

## 測試覆蓋統計

- ✅ 權限驗證: 3 個案例 (3/3 通過)
- ✅ 速率限制: 4 個案例 (4/4 通過)
- ✅ 核心功能: 4 個案例 (4/4 通過)
- ✅ 外部依賴故障: 3 個案例 (3/3 通過)
- ✅ 特殊情況: 1 個案例 (1/1 通過)

**總計**: 15 個測試案例
**已實作並通過**: 15 個測試 ✅

**測試檔案**: `test/app/api/channels/[id]/refresh/route.test.ts`
