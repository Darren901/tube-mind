# Cron Check New Videos API 測試案例

**API Path**: `GET /api/cron/check-new-videos`

**功能**: 定時檢查啟用自動刷新的頻道，獲取最新影片並自動建立摘要任務

---

## 測試案例清單

### 權限驗證

[x] [異常處理] 缺少 Authorization header 時應回傳 401
**測試資料**
- 不帶 Authorization header 的請求

**預期結果**
- Status: 401
- Response: `{ error: 'Unauthorized' }`

---

[x] [異常處理] Authorization token 錯誤時應回傳 401
**測試資料**
- Authorization: "Bearer wrong-token"

**預期結果**
- Status: 401
- Response: `{ error: 'Unauthorized' }`

---

[x] [正常情況] 使用正確的 CRON_SECRET 應通過驗證
**測試資料**
- Authorization: `Bearer ${process.env.CRON_SECRET}`

**預期結果**
- Status: 200
- 執行成功

---

### 核心功能

[x] [正常情況] 沒有啟用自動刷新的頻道時應回傳成功
**測試資料**
- Database: 無 autoRefresh=true 的頻道

**預期結果**
- Status: 200
- Response: `{ success: true, newVideos: 0, channelsChecked: 0 }`

---

[x] [正常情況] 檢查單一啟用自動刷新的頻道並找到新影片
**測試資料**
- Database: 1 個 autoRefresh=true 的頻道
- Mock YouTube API 回傳 2 個新影片

**預期結果**
- Status: 200
- Response: `{ success: true, newVideos: 2, channelsChecked: 1 }`
- Database 新增 2 個 Video 記錄
- Database 新增 2 個 Summary 記錄（status: 'pending'）
- Queue 新增 2 個摘要任務
- Channel 的 lastCheckedAt 已更新

---

[x] [正常情況] 檢查多個頻道
**測試資料**
- Database: 3 個 autoRefresh=true 的頻道
- 頻道 1: 2 個新影片
- 頻道 2: 0 個新影片（全部已存在）
- 頻道 3: 1 個新影片

**預期結果**
- Status: 200
- Response: `{ success: true, newVideos: 3, channelsChecked: 3 }`
- 所有頻道的 lastCheckedAt 已更新

---

[x] [邊界值] 影片已存在時不應重複建立
**測試資料**
- Database: 1 個頻道，已有影片 youtubeId="vid-123"
- Mock YouTube API 回傳包含 "vid-123" 的影片

**預期結果**
- Status: 200
- Response: `{ success: true, newVideos: 0, channelsChecked: 1 }`
- 不建立重複的 Video 記錄

---

### 外部依賴處理

[x] [異常處理] 頻道沒有對應的 Google Account 時應跳過
**測試資料**
- Database: 1 個頻道，但無對應的 Google Account

**預期結果**
- Status: 200
- Response: `{ success: true, newVideos: 0, channelsChecked: 1 }`
- 跳過該頻道，不拋出錯誤

---

[x] [異常處理] Account 沒有 access_token 時應跳過
**測試資料**
- Database: 1 個頻道，Account 的 access_token 為 null

**預期結果**
- Status: 200
- Response: `{ success: true, newVideos: 0, channelsChecked: 1 }`
- 跳過該頻道

---

[x] [外部依賴故障] YouTube API 調用失敗時應回傳 500
**測試資料**
- Mock YouTubeClient.getChannelVideos() 拋出錯誤

**預期結果**
- Status: 500
- Response: `{ error: 'Internal error' }`
- Console 記錄錯誤訊息

---

[x] [外部依賴故障] Database 連線失敗時應回傳 500
**測試資料**
- Mock prisma.channel.findMany() 拋出錯誤

**預期結果**
- Status: 500
- Response: `{ error: 'Internal error' }`

---

[x] [外部依賴故障] Queue 新增任務失敗時應回傳 500
**測試資料**
- Mock addSummaryJob() 拋出錯誤

**預期結果**
- Status: 500
- Response: `{ error: 'Internal error' }`

---

### 數據完整性

[ ] [並發與數據完整性] 建立影片和摘要的事務完整性
**測試資料**
- 影片建立成功，但摘要建立失敗的場景

**預期結果**
- 拋出錯誤並回傳 500
- 確保不會只有影片沒有摘要

**註**: 此案例未實作測試（需要更複雜的事務模擬）

---

[ ] [特殊情況] 處理大量頻道時不應逾時
**測試資料**
- Database: 50 個 autoRefresh=true 的頻道

**預期結果**
- Status: 200
- 所有頻道都被處理完成
- 回應時間合理（視實際情況調整）

**註**: 此案例未實作測試（效能測試，非單元測試範疇）

---

## 測試覆蓋統計

- ✅ 正常情況: 4 個案例 (4/4 通過)
- ✅ 邊界值: 1 個案例 (1/1 通過)
- ✅ 異常處理: 5 個案例 (5/5 通過)
- ✅ 外部依賴故障: 3 個案例 (3/3 通過)
- ⚠️ 並發與數據完整性: 1 個案例 (0/1 實作)
- ⚠️ 特殊情況: 1 個案例 (0/1 實作)

**總計**: 15 個測試案例
**已實作**: 12 個測試 ✅
**未實作**: 2 個測試（非單元測試範疇）
