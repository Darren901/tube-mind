# Channels API 測試案例 (app/api/channels/route.ts)

## 驗證與授權 (Authentication & Validation)
```
[x] [正常情況] 未登入狀態 (GET)
**測試資料**
getServerSession 回傳 null
**預期結果**
回傳 401 Unauthorized
```
---
```
[x] [正常情況] 未登入狀態 (POST)
**測試資料**
getServerSession 回傳 null
**預期結果**
回傳 401 Unauthorized
```
---
```
[x] [異常處理] 缺少 youtubeId (POST)
**測試資料**
Body: {}
**預期結果**
回傳 400 youtubeId is required
```

## 頻道查詢 (GET)
```
[x] [正常情況] 獲取頻道列表
**測試資料**
prisma.channel.findMany 回傳頻道列表
**預期結果**
回傳 200 及頻道列表 (應包含 _count 屬性)
```

## 頻道新增 (POST)
```
[x] [異常處理] 頻道已存在
**測試資料**
prisma.channel.findUnique 回傳現有頻道
**預期結果**
回傳 400 Channel already exists
```
---
```
[x] [異常處理] YouTube 上找不到頻道
**測試資料**
youtube.getChannelDetails 回傳 null
**預期結果**
回傳 404 Channel not found
```
---
```
[x] [正常情況] 成功建立頻道並抓取新影片
**測試資料**
YouTube API 回傳有效的 Channel Details 和 Channel Videos (2部影片)
prisma.video.findUnique 第一部影片回傳 null (需建立)，第二部已存在
**預期結果**
1. 建立 Channel 記錄
2. 建立 1 部新 Video 記錄 (跳過已存在的)
3. 回傳 201 Created 及頻道資料 (包含 recentVideos)
```
---
```
[x] [外部依賴故障] YouTube API 錯誤
**測試資料**
youtube.getChannelDetails 拋出 Error
**預期結果**
回傳 500 Failed to create channel
```
