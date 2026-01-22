# Audio API 測試案例 (Refactored)

[x] [正常情況] 成功加入 TTS 隊列
[x] [正常情況] 已有快取音訊，直接回傳
[x] [異常處理] 摘要未完成
[x] [異常處理] 摘要不存在

**測試資料**
- Summary DB: 不存在

**預期結果**
1. 回傳 404 Not Found
