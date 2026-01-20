# Chat API 測試案例 (app/api/chat/route.ts)

## 驗證與授權 (Authentication & Validation)
```
[x] [正常情況] 未登入狀態
**測試資料**
getServerSession 回傳 null
**預期結果**
回傳 401 Unauthorized
```
---
```
[x] [異常處理] 缺少 videoId
**測試資料**
Request body: { messages: [] } (缺少 videoId)
**預期結果**
回傳 400 Missing videoId
```
---
```
[x] [異常處理] 影片不存在
**測試資料**
Request body: { videoId: 'non-existent-id' }
prisma.video.findUnique 回傳 null
**預期結果**
回傳 404 Video not found
```

## 訊息格式轉換 (Message Conversion)
```
[x] [正常情況] 標準格式轉換
**測試資料**
Frontend Message: { role: 'user', parts: [{ type: 'text', text: 'Hello' }] }
**預期結果**
Backend Message: { role: 'user', content: 'Hello' }
傳遞給 streamText 的 messages 應符合後端格式
```

## 字幕獲取邏輯 (Transcript Logic)
```
[x] [正常情況] 字幕已存在
**測試資料**
DB Video has transcript: [{ text: 'Existing', timestamp: 0 }]
**預期結果**
直接使用現有字幕，不呼叫 getVideoTranscript
```
---
```
[x] [正常情況] 字幕不存在 (Lazy Fetch)
**測試資料**
DB Video transcript: null
getVideoTranscript 回傳新字幕
**預期結果**
1. 呼叫 getVideoTranscript
2. 呼叫 prisma.video.update 更新字幕
3. 繼續執行 AI 串流
```
---
```
[x] [異常處理] 字幕獲取失敗
**測試資料**
DB Video transcript: null
getVideoTranscript 拋出錯誤
**預期結果**
回傳 500 Failed to fetch video content
```

## AI 回應 (AI Streaming)
```
[x] [正常情況] 正常串流
**測試資料**
Video 和 Transcript 均有效
Google Gemini API 正常運作
**預期結果**
呼叫 streamText 並回傳 toUIMessageStreamResponse 結果
Status Code 200
```
