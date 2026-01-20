# Summaries API 測試案例 (app/api/summaries/route.ts)

## GET: 獲取摘要列表
```
[x] [正常情況] 未登入狀態
**測試資料**
getServerSession 回傳 null
**預期結果**
回傳 401 Unauthorized
```
---
```
[x] [正常情況] 正常獲取
**測試資料**
使用者已登入
prisma.summary.findMany 回傳列表
**預期結果**
回傳摘要列表 (包含 video 和 channel)，按時間倒序
```
---
```
[x] [邊界值] 資料隔離
**測試資料**
prisma.summary.findMany 呼叫驗證
**預期結果**
findMany 的 where 條件包含正確的 userId
```

## POST: 建立新摘要
```
[x] [正常情況] 未登入狀態
**測試資料**
getServerSession 回傳 null
**預期結果**
回傳 401 Unauthorized
```
---
```
[x] [異常處理] 缺少參數
**測試資料**
Body: {} (缺少 videoId)
**預期結果**
回傳 400 videoId is required
```
---
```
[x] [異常處理] 影片不存在
**測試資料**
Body: { videoId: 'non-existent' }
prisma.video.findUnique 回傳 null
**預期結果**
回傳 404 Video not found
```
---
```
[x] [邊界值] 影片過長
**測試資料**
prisma.video.findUnique 回傳 duration > 10800 (3小時)
**預期結果**
回傳 400 影片過長
```
---
```
[x] [異常處理] 摘要已存在
**測試資料**
prisma.summary.findUnique 回傳已存在的 summary
**預期結果**
回傳 400 Summary already exists
```
---
```
[x] [正常情況] 正常建立
**測試資料**
Video 存在且長度合法
Summary 不存在
**預期結果**
1. 建立 DB Summary 記錄 (status: pending)
2. 呼叫 addSummaryJob 加入佇列
3. 回傳 201 Created
```
