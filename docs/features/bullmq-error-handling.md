# BullMQ 錯誤處理與重試機制說明

## 概述

TubeMind 使用 BullMQ 處理背景摘要生成任務，具備完善的錯誤處理與自動重試機制。

---

## 重試策略

### Queue 設定（`lib/queue/summaryQueue.ts`）

```typescript
await summaryQueue.add('process-summary', data, {
  attempts: 3,                    // 最多執行 3 次（1 次原始 + 2 次重試）
  backoff: {
    type: 'exponential',          // 指數退避策略
    delay: 2000,                  // 基礎延遲 2 秒
  },
  removeOnComplete: 100,           // 保留最近 100 個成功任務（debug 用）
  removeOnFail: 200,               // 保留最近 200 個失敗任務（debug 用）
})
```

### 重試時間軸

```
┌─────────────────────────────────────────────────────────────┐
│  第 1 次執行                                                   │
│  └─ 失敗（例如：Gemini API timeout）                           │
│                                                              │
│  ⏰ 等待 2 秒（2^0 × 2000ms）                                  │
│                                                              │
│  第 2 次執行（重試 #1）                                         │
│  └─ 失敗（例如：Network error）                                │
│                                                              │
│  ⏰ 等待 4 秒（2^1 × 2000ms）                                  │
│                                                              │
│  第 3 次執行（重試 #2）                                         │
│  └─ 成功 ✅ → status = 'completed'                           │
│                                                              │
│  （若第 3 次也失敗）                                            │
│  └─ 標記為 failed ❌ → 不再重試                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 錯誤處理流程

### 1. Worker 執行過程（`lib/workers/summaryWorker.ts`）

```typescript
async (job) => {
  // Step 1: 更新狀態為 processing
  await prisma.summary.update({
    where: { id: summaryId },
    data: { status: 'processing', jobId: job.id },
  })
  
  // Step 2: 檢查 Summary 是否存在
  if (!summary) {
    throw new Error(`Summary ${summaryId} not found`) // ❌ 觸發重試
  }
  
  // Step 3: 取得字幕
  const transcript = await getVideoTranscript(youtubeVideoId)
  
  // 注意：getVideoTranscript() 永遠不會返回空陣列
  // 若影片無字幕，會返回 fallback 訊息，讓 AI 根據標題/描述生成簡單摘要
  
  // Step 4: 儲存字幕（冪等操作）
  await prisma.video.update({
    where: { id: summary.videoId },
    data: { transcript: transcript as any },
  })
  
  // Step 5: 生成摘要（內建重試機制）
  const summaryContent = await generateSummaryWithRetry(
    transcript,
    summary.video.title,
    tagNames,
    userPreferences
  )
  
  // Step 6: 儲存結果
  await prisma.summary.update({
    where: { id: summaryId },
    data: {
      status: 'completed',
      content: summaryContent,
      completedAt: new Date(),
    },
  })
  
  // Step 7: 發布成功事件
  await publishSummaryEvent(summaryId, {
    type: 'summary_completed',
    data: { content: summaryContent },
  })
  
  return { success: true } // ✅ Job 成功
}
```

### 2. 失敗處理（`summaryWorker.on('failed')`）

```typescript
summaryWorker.on('failed', async (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} failed:`, err)

  if (job?.data.summaryId) {
    // 更新資料庫狀態為 failed
    await prisma.summary.update({
      where: { id: job.data.summaryId },
      data: {
        status: 'failed',
        errorMessage: err.message,
      },
    })

    // 發布失敗事件（通知前端）
    await publishSummaryEvent(job.data.summaryId, {
      type: 'summary_failed',
      error: err.message,
    })
  }
})
```

**觸發時機**：
- ✅ 只有在**所有重試都失敗後**才會觸發
- ✅ 確保使用者知道任務最終失敗

---

## 常見錯誤場景

### 場景 1: Gemini API 暫時性限流（429 Too Many Requests）

```
第 1 次執行:
  └─ Gemini API 返回 429 錯誤
  └─ generateSummaryWithRetry 內部重試 3 次後仍失敗
  └─ Worker 拋出錯誤 ❌

⏰ 等待 2 秒

第 2 次執行:
  └─ Gemini API 恢復正常
  └─ 摘要生成成功 ✅
  └─ status = 'completed'
```

**結果**：✅ 自動恢復，使用者無感知

---

### 場景 2: 影片無字幕（Fallback 機制）

```
第 1 次執行:
  └─ getVideoTranscript() 嘗試英文字幕 ❌
  └─ 嘗試繁體中文字幕 ❌
  └─ 嘗試簡體中文字幕 ❌
  └─ 嘗試預設字幕 ❌
  └─ 返回 fallback 訊息：
      [{
        timestamp: 0,
        text: "This video does not have available captions or transcripts. 
               Please summarize the video based on its title and description only..."
      }]
  └─ Gemini AI 根據影片標題與描述生成簡單摘要 ✅
  └─ status = 'completed'
```

**結果**：✅ 自動 fallback，仍然生成摘要（只是內容較簡略）

**使用者體驗**：
- ✅ 摘要狀態顯示「完成」（非「失敗」）
- ✅ 摘要內容會註明「此影片無字幕」
- ✅ 基於標題/描述提供基本資訊

---

### 場景 3: 資料庫連線中斷（暫時性）

```
第 1 次執行:
  └─ prisma.summary.update() 連線失敗
  └─ 拋出資料庫錯誤 ❌

⏰ 等待 2 秒（資料庫恢復）

第 2 次執行:
  └─ 資料庫連線正常
  └─ 所有步驟順利完成 ✅
```

**結果**：✅ 自動恢復

---

## 冪等性設計（Idempotency）

### 為何重試安全？

**關鍵**：Worker 中的所有操作都是**冪等的**（執行多次結果相同）

1. **更新狀態**
   ```typescript
   await prisma.summary.update({
     where: { id: summaryId },
     data: { status: 'processing' },
   })
   ```
   - ✅ 執行多次結果相同（status 仍是 `processing`）

2. **儲存字幕**
   ```typescript
   await prisma.video.update({
     where: { id: summary.videoId },
     data: { transcript: transcript },
   })
   ```
   - ✅ 執行多次結果相同（transcript 內容相同）

3. **生成摘要**
   ```typescript
   const summaryContent = await generateSummaryWithRetry(...)
   ```
   - ✅ 每次呼叫 Gemini API 可能略有不同（AI 生成的隨機性）
   - ✅ 但不會造成資料損壞（只是內容稍有差異）

4. **儲存標籤**
   ```typescript
   await prisma.tag.upsert({ where: { name: tagName }, ... })
   ```
   - ✅ upsert 確保不會重複建立

**結論**：即使重試多次，也不會造成：
- ❌ 資料重複
- ❌ 狀態不一致
- ❌ 資源洩漏

---

## Notion 自動同步的錯誤處理

### 特殊設計：Notion 失敗不影響 Job 成功

```typescript
try {
  // Notion 同步邏輯
  await createSummaryPage(...)
  await prisma.summary.update({
    data: { notionSyncStatus: 'SUCCESS', notionUrl: response.url },
  })
} catch (error) {
  // ⚠️ 捕捉錯誤，不向上拋出
  await prisma.summary.update({
    data: { notionSyncStatus: 'FAILED', notionError: error.message },
  })
}

// Worker 繼續執行，返回 success
return { success: true }
```

**設計理由**：
- ✅ Notion 同步失敗不應該讓整個摘要生成失敗
- ✅ 使用者仍可在 UI 手動重試 Notion 同步
- ✅ 核心功能（摘要生成）優先保證成功

---

## 監控與除錯

### 1. 查看失敗任務

BullMQ 保留最近 200 個失敗任務：

```typescript
const failedJobs = await summaryQueue.getFailed()
failedJobs.forEach(job => {
  console.log(`Job ${job.id} failed ${job.attemptsMade} times`)
  console.log(`Error: ${job.failedReason}`)
})
```

### 2. 查看重試中的任務

```typescript
const delayedJobs = await summaryQueue.getDelayed()
console.log(`${delayedJobs.length} jobs waiting to retry`)
```

### 3. 手動重試失敗任務

透過 `/api/summaries/[id]/retry` 端點：
- 重置狀態為 `pending`
- 重新加入 Queue
- 再次執行（重新計算重試次數）

---

## 總結

### ✅ 目前設計的優點

1. **自動重試**：3 次機會，指數退避，應對暫時性錯誤
2. **狀態追蹤**：`pending` → `processing` → `completed`/`failed`
3. **冪等性**：重試安全，不會造成資料重複或不一致
4. **錯誤隔離**：Notion 失敗不影響摘要生成
5. **可觀測性**：保留失敗任務記錄，方便除錯
6. **手動恢復**：提供 retry API 供使用者重試

### ⚠️ 可改進之處（未來）

1. **區分錯誤類型**：永久性錯誤（無字幕）vs 暫時性錯誤（API timeout）
2. **錯誤分類記錄**：`TRANSCRIPT_UNAVAILABLE`, `API_RATE_LIMIT`, `NETWORK_ERROR`
3. **智慧重試**：根據錯誤類型調整重試策略
4. **告警機制**：失敗率超過閾值時通知管理員

---

**維護者**: AI Agent  
**最後更新**: 2026-01-30
