# SSE + TTS Queue 架構設計

## 概述

將 TTS 音訊生成從阻塞式處理改為非阻塞式隊列處理，並實作 Server-Sent Events (SSE) 讓前端即時接收摘要和 TTS 的狀態更新。

## 目標

1. TTS 生成加入 BullMQ 隊列，避免阻塞主線程
2. 實作 SSE 推送機制，前端無需重新整理即可看到更新
3. 保持架構一致性（摘要和 TTS 都使用相同的隊列模式）
4. 維持 Per-User 架構（未來支援個人化功能：摘要風格、語言偏好、重點客製化）

## 整體流程

### 摘要生成流程（現有 + SSE）

```
用戶訪問 /summaries/[id] (status=pending)
  ↓
前端檢測到未完成 → 建立 SSE 連線 (/api/sse/summary/{id})
  ↓
summaryWorker 處理 → 更新 DB → 發布 Redis 事件
  ↓
SSE 收到 Redis 訊息 → 推送給前端
  ↓
前端收到 completed 事件 → 更新 UI + 斷開 SSE
```

### TTS 生成流程（新）

```
用戶點擊「AI 語音導讀」→ POST /api/summaries/{id}/audio
  ↓
立即回傳 → 加入 ttsQueue → 前端顯示 "AI 正在準備語音導讀..."
  ↓
ttsWorker 處理 → 生成音訊 → 上傳 GCS → 更新 DB → 發布 Redis 事件
  ↓
SSE 推送 audio_completed → 前端自動切換為播放器
```

### 智能連線管理

```typescript
// 連線條件
const shouldConnect = status !== 'completed' || !audioUrl

// 斷線條件  
const shouldDisconnect = status === 'completed' && audioUrl !== null
```

## 技術架構

### Redis Pub/Sub 通訊機制

```
Worker Process (summaryWorker / ttsWorker)
  ↓ 完成處理，更新 DB
  ↓ 發布訊息到 Redis channel
Redis Channel: `summary:${summaryId}`
  ↓ 訂閱者收到訊息
SSE Route Handler (/api/sse/summary/[id])
  ↓ 推送給前端
前端 EventSource
```

**為什麼需要 Redis Pub/Sub？**
- Worker 和 SSE 端點運行在不同的 process
- 需要中間人傳遞訊息
- 支援 Vercel 多實例部署
- 即時性最好

### SSE 連線架構

```
前端 EventSource
    ↓ 連線到 /api/sse/summary/{id}
SSE Route Handler
    ↓ 訂閱 Redis channel: `summary:${summaryId}`
    ↓ 監聽訊息
    ↓ 推送給前端
```

## 檔案結構

### 新增檔案

```
lib/queue/ttsQueue.ts          - TTS 隊列定義
lib/workers/ttsWorker.ts       - TTS Worker 處理邏輯
lib/queue/events.ts            - Redis Pub/Sub 封裝
app/api/sse/summary/[id]/route.ts - SSE 端點
```

### 修改檔案

```
app/api/summaries/[id]/audio/route.ts - 改為非阻塞，加入隊列
lib/workers/summaryWorker.ts   - 完成時發布 Redis 事件
components/audio/AudioPlayer.tsx - 整合 SSE 監聽
app/(dashboard)/summaries/[id]/page.tsx - 整合 SSE 監聽（用於摘要狀態更新）
scripts/worker.ts - 同時啟動 summaryWorker 和 ttsWorker
```

## 資料結構定義

### Redis Channel 命名

```typescript
`summary:${summaryId}`  // 例如：summary:abc123
```

### 事件類型定義

```typescript
type SummaryEvent = 
  | { type: 'summary_processing' }
  | { type: 'summary_completed', data: { content: SummaryResult } }
  | { type: 'summary_failed', error: string }
  | { type: 'audio_generating' }
  | { type: 'audio_completed', data: { audioUrl: string } }
  | { type: 'audio_failed', error: string }
```

**事件格式設計原則（混合版）：**
- 狀態變化：簡潔版（只推送 type）
- 完成時：推送完整資料（避免前端重新 fetch）

## 前端整合

### SSE 監聽邏輯

```typescript
// 在 Client Component 中
const eventSource = new EventSource(`/api/sse/summary/${id}`)

eventSource.onmessage = (e) => {
  const event = JSON.parse(e.data)
  
  switch(event.type) {
    case 'summary_processing':
      // 更新為處理中狀態
      break
    case 'summary_completed':
      // 更新摘要內容，隱藏 loading
      break
    case 'audio_generating':
      // AudioPlayer 顯示生成中
      break
    case 'audio_completed':
      // AudioPlayer 切換為可播放狀態
      break
    case 'summary_failed':
    case 'audio_failed':
      // 顯示錯誤訊息
      break
  }
}

// 智能斷線
if (status === 'completed' && audioUrl) {
  eventSource.close()
}
```

### AudioPlayer 整合

- 保持現有的過渡動畫和文字
- 整合 SSE 監聽
- 收到 `audio_completed` 事件時自動更新狀態

### Summary 頁面整合

- Server Component 保持不變
- 新增 Client Component 負責 SSE 監聽
- 當 `status !== 'completed'` 時建立 SSE 連線
- 收到更新後透過 React state 更新 UI

## 部署方式

### Worker Process（無需額外部署）

**修改 `scripts/worker.ts`：**

```typescript
import { summaryWorker } from '@/lib/workers/summaryWorker'
import { ttsWorker } from '@/lib/workers/ttsWorker'

console.log('🚀 Worker started (Summary + TTS)')

process.on('SIGTERM', async () => {
  console.log('Shutting down workers...')
  await Promise.all([
    summaryWorker.close(),
    ttsWorker.close()
  ])
  process.exit(0)
})
```

**部署結果：**
- 1 個 Worker process 同時處理 summary + TTS
- 指令不變：`npm run worker`

## 實作順序

1. 建立 TTS Queue 和 Worker
2. 實作 Redis Pub/Sub 事件系統
3. 實作 SSE 端點
4. 修改前端整合 SSE
5. 測試完整流程

## 未來擴展（已記錄 TODO）

- 摘要風格客製化（正式/輕鬆/技術導向等）
- 語言偏好設定（繁中/簡中/英文等）
- 重點客製化（例如：技術細節 vs 商業洞察）

## 決策記錄

### 為什麼維持 Per-User 架構？

雖然共享資源可節省成本，但 Per-User 架構支援未來的個人化功能：
- 摘要風格客製化
- 語言偏好
- 重點客製化
- Notion 同步是 per-user 的

### 為什麼選擇 Redis Pub/Sub？

- 已有 Redis 連線（BullMQ 使用）
- 支援多實例部署
- 即時性最好
- 實作簡單

### 為什麼使用混合版事件格式？

- 處理中：簡潔版（減少資料傳輸）
- 完成時：完整版（避免前端重新 fetch）
- 事件語意清晰
