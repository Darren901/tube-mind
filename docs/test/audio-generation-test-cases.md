# 音訊生成 API 測試案例 (POST /api/summaries/[id]/audio)

本文件定義了 `app/api/summaries/[id]/audio/route.ts` 的測試情境。

## 測試案例清單

[x] [正常情況] 首次生成音訊並快取到資料庫
**測試資料**
- summaryId: "valid-summary-id" (status: "completed", audioUrl: null)
- session: 有效使用者會話

**預期結果**
- 返回 200 OK
- 返回音訊 URL (audioUrl)
- 資料庫中的 `audioUrl` 和 `audioGeneratedAt` 已更新
- 調用了 `generateSpeech` 和 `uploadAudio`

---

[x] [正常情況] 從快取讀取已存在的音訊
**測試資料**
- summaryId: "cached-summary-id" (status: "completed", audioUrl: "https://gcs.com/audio.mp3")
- session: 有效使用者會話

**預期結果**
- 返回 200 OK
- 返回已存在的音訊 URL
- 不應調用 `generateSpeech` 或 `uploadAudio`

---

[x] [異常處理] 未登入使用者存取
**測試資料**
- summaryId: "any-id"
- session: null

**預期結果**
- 返回 401 Unauthorized
- 錯誤訊息: "Unauthorized"

---

[x] [異常處理] 存取不存在的摘要
**測試資料**
- summaryId: "non-existent-id"
- session: 有效使用者會話

**預期結果**
- 返回 404 Not Found
- 錯誤訊息: "Summary not found"

---

[x] [異常處理] 摘要尚未完成 (Status: pending/processing)
**測試資料**
- summaryId: "processing-summary-id" (status: "processing")
- session: 有效使用者會話

**預期結果**
- 返回 400 Bad Request
- 錯誤訊息包含: "Summary is not completed yet"

---

[x] [異常處理] 摘要內容過短或無內容
**測試資料**
- summaryId: "empty-content-id" (status: "completed", content: {})
- session: 有效使用者會話

**預期結果**
- 返回 400 Bad Request
- 錯誤訊息: "摘要內容不足，無法生成語音"

---

[x] [外部依賴故障] Google TTS API 調用失敗
**測試資料**
- summaryId: "valid-id"
- 模擬 `generateSpeech` 拋出錯誤

**預期結果**
- 返回 500 Internal Server Error
- 錯誤訊息包含: "Failed to generate audio"

---

[x] [外部依賴故障] GCS 上傳失敗
**測試資料**
- summaryId: "valid-id"
- 模擬 `uploadAudio` 拋出錯誤

**預期結果**
- 返回 500 Internal Server Error
- 錯誤訊息包含: "Failed to generate audio"
