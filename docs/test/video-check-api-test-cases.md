# Video Check API 測試案例 (app/api/videos/check/route.ts)

## 驗證與授權 (Authentication & Validation)
```
[x] [正常情況] 未登入狀態
**測試資料**
session = null
**預期結果**
回傳 401 Unauthorized
```
---
```
[x] [異常處理] 缺少 youtubeId
**測試資料**
body = {}
**預期結果**
回傳 400 youtubeId is required
```

## 影片檢查與建立 (Check & Create)
```
[x] [正常情況] 影片已存在於 DB
**測試資料**
DB 中有 youtubeId = 'existing-yt-id' 的影片
Request body: { youtubeId: 'existing-yt-id' }
**預期結果**
直接回傳 DB 中的 video 物件，不呼叫 YouTube API
```
---
```
[x] [正常情況] 影片不存在但 YouTube 有 (且 Channel 已存在)
**測試資料**
DB 中無此影片
DB 中有此影片所屬的 Channel
YouTube API getVideoDetails 回傳有效資料
**預期結果**
1. 呼叫 getVideoDetails
2. 建立 Video 記錄 (關聯現有 Channel)
3. 回傳新建立的 video 物件
```
---
```
[x] [正常情況] 影片與 Channel 都不存在 (全新建立)
**測試資料**
DB 中無此影片
DB 中無此 Channel
YouTube API getVideoDetails 回傳有效資料
YouTube API getChannelDetails 回傳有效資料
**預期結果**
1. 呼叫 getVideoDetails
2. 呼叫 getChannelDetails
3. 建立 Channel 記錄
4. 建立 Video 記錄 (關聯新建 Channel)
5. 回傳新建立的 video 物件
```
---
```
[x] [異常處理] YouTube 上找不到影片
**測試資料**
DB 中無此影片
YouTube API getVideoDetails 回傳 null
**預期結果**
回傳 404 Video not found on YouTube
```
---
```
[x] [異常處理] 無法解析 Channel 資訊
**測試資料**
DB 中無此影片
YouTube API getVideoDetails 回傳有效資料
YouTube API getChannelDetails 回傳 null (或無法取得)
**預期結果**
回傳 500 Failed to resolve channel info
```
---
```
[x] [邊界值] 頻道建立 Race Condition
**測試資料**
DB 無 Channel
prisma.channel.create 拋出 Unique constraint 錯誤
prisma.channel.findFirst 回傳現有 Channel
**預期結果**
捕獲錯誤並成功使用 findFirst 查到的 Channel 建立 Video
```
---
```
[x] [異常處理] YouTube API 錯誤
**測試資料**
YouTubeClient 拋出 Error (如 Quota Exceeded)
**預期結果**
回傳 500 並包含錯誤訊息
```
