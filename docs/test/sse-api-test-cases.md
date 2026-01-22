# SSE API 測試案例

[x] [正常情況] 成功建立 SSE 連線並接收心跳
[x] [正常情況] 接收 Redis 推送的事件
[x] [異常處理] 未登入存取
[x] [異常處理] 存取不屬於自己的摘要
[x] [正常情況] 客戶端斷線時正確清理

**測試資料**
- 模擬 `request.signal` abort

**預期結果**
1. 呼叫 `clearInterval`
2. 呼叫 `subscriber.quit()`
