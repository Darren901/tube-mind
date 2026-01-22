# TTS Worker 測試案例

[x] [正常情況] 成功生成語音並上傳 GCS
[x] [正常情況] 音訊已存在，跳過生成
[x] [異常處理] 摘要不存在
[x] [異常處理] 摘要未完成
[x] [異常處理] TTS 生成失敗
[x] [異常處理] GCS 上傳失敗

**測試資料**
- uploadAudio: 拋出 Error "GCS Upload Error"

**預期結果**
1. 發布 `audio_failed` 事件
2. Job 狀態標記為 failed
