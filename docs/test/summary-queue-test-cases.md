[ ] [正常情況] 成功加入摘要任務
**測試資料**
- Job Data: {
    summaryId: 'summary-123',
    videoId: 'video-123',
    youtubeVideoId: 'abc12345',
    userId: 'user-123'
  }

**預期結果**
- Queue.add 被呼叫
- Job 名稱為 'process-summary'
- 傳遞正確的 data
- 包含正確的 Job Options (attempts: 3, backoff, removeOnComplete 等)

---

[ ] [異常處理] Queue 連線失敗
**測試資料**
- Queue.add 拋出錯誤

**預期結果**
- addSummaryJob 拋出錯誤
