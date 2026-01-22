# SSE + TTS Queue 實作計畫

> **For Claude:** 必須搭配子技能：使用 superpowers:executing-plans 逐項執行此計畫。

**目標 (Goal):** 將 TTS 音訊生成改為非阻塞式隊列處理，並實作 SSE 讓前端即時接收摘要和 TTS 的狀態更新。

**架構 (Architecture):** 建立 TTS Queue 和 Worker（類似現有的 summaryWorker），使用 Redis Pub/Sub 讓 Worker 通知 SSE 端點，SSE 端點透過 EventSource 推送狀態更新給前端。前端智能連線管理（只在未完成時建立連線）。

**技術棧 (Tech Stack):** BullMQ, Redis (IORedis), Next.js 14 App Router, Server-Sent Events (EventSource), TypeScript

---

## 任務 1: 建立 Redis Pub/Sub 事件系統

**檔案 (Files):**
- 建立: `lib/queue/events.ts`
- 測試: 手動驗證（稍後整合測試）

**步驟 1: 建立事件類型定義**

建立 `lib/queue/events.ts` 並定義事件類型：

```typescript
// lib/queue/events.ts
import { Redis } from 'ioredis'
import { redisConnection } from './connection'

// 事件類型定義
export type SummaryEvent =
  | { type: 'summary_processing' }
  | { type: 'summary_completed'; data: { content: any } }
  | { type: 'summary_failed'; error: string }
  | { type: 'audio_generating' }
  | { type: 'audio_completed'; data: { audioUrl: string } }
  | { type: 'audio_failed'; error: string }

// Redis channel 命名函式
export function getSummaryChannel(summaryId: string): string {
  return `summary:${summaryId}`
}
```

**步驟 2: 實作事件發布函式**

在 `lib/queue/events.ts` 新增：

```typescript
// 發布事件到 Redis channel
export async function publishSummaryEvent(
  summaryId: string,
  event: SummaryEvent
): Promise<void> {
  const publisher = new Redis(redisConnection)
  
  try {
    const channel = getSummaryChannel(summaryId)
    const message = JSON.stringify(event)
    
    await publisher.publish(channel, message)
    console.log(`[Events] Published to ${channel}:`, event.type)
  } catch (error) {
    console.error(`[Events] Failed to publish event:`, error)
    throw error
  } finally {
    await publisher.quit()
  }
}
```

**步驟 3: 實作事件訂閱函式**

在 `lib/queue/events.ts` 新增：

```typescript
// 訂閱 Summary 事件
export function subscribeSummaryEvents(
  summaryId: string,
  callback: (event: SummaryEvent) => void
): Redis {
  const subscriber = new Redis(redisConnection)
  const channel = getSummaryChannel(summaryId)
  
  subscriber.subscribe(channel, (err) => {
    if (err) {
      console.error(`[Events] Failed to subscribe to ${channel}:`, err)
    } else {
      console.log(`[Events] Subscribed to ${channel}`)
    }
  })
  
  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        const event = JSON.parse(message) as SummaryEvent
        callback(event)
      } catch (error) {
        console.error(`[Events] Failed to parse message:`, error)
      }
    }
  })
  
  return subscriber
}
```

**步驟 4: 提交 (Commit)**

```bash
git add lib/queue/events.ts
git commit -m "feat: add Redis Pub/Sub event system for Summary updates"
```

---

## 任務 2: 建立 TTS Queue

**檔案 (Files):**
- 建立: `lib/queue/ttsQueue.ts`
- 參考: `lib/queue/summaryQueue.ts`（現有範本）
- 建立: `lib/queue/types.ts`（新增 TTS job 類型）

**步驟 1: 新增 TTS Job 類型定義**

修改 `lib/queue/types.ts`，新增：

```typescript
// 現有的 SummaryJobData 保持不變

export interface TTSJobData {
  summaryId: string
  youtubeVideoId: string // 用於 logging
}
```

**步驟 2: 建立 TTS Queue**

建立 `lib/queue/ttsQueue.ts`：

```typescript
import { Queue } from 'bullmq'
import { redisConnection } from './connection'
import type { TTSJobData } from './types'

export const ttsQueue = new Queue<TTSJobData>('tts-audio', {
  connection: redisConnection as any,
})

export async function addTTSJob(data: TTSJobData) {
  return await ttsQueue.add('generate-audio', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  })
}
```

**步驟 3: 驗證匯出正確**

執行 TypeScript 檢查：

```bash
npx tsc --noEmit
```

預期結果: 無錯誤

**步驟 4: 提交 (Commit)**

```bash
git add lib/queue/types.ts lib/queue/ttsQueue.ts
git commit -m "feat: add TTS queue for audio generation"
```

---

## 任務 3: 建立 TTS Worker

**檔案 (Files):**
- 建立: `lib/workers/ttsWorker.ts`
- 參考: `lib/workers/summaryWorker.ts`（現有範本）
- 修改: `lib/queue/events.ts`（已建立）

**步驟 1: 建立 TTS Worker 骨架**

建立 `lib/workers/ttsWorker.ts`：

```typescript
import { Worker } from 'bullmq'
import { redisConnection } from '@/lib/queue/connection'
import { prisma } from '@/lib/db'
import { generateSpeech } from '@/lib/audio/tts'
import { uploadAudio } from '@/lib/audio/storage'
import { publishSummaryEvent } from '@/lib/queue/events'
import type { TTSJobData } from '@/lib/queue/types'
import type { SummaryResult } from '@/lib/ai/types'

export const ttsWorker = new Worker<TTSJobData>(
  'tts-audio',
  async (job) => {
    const { summaryId, youtubeVideoId } = job.data

    console.log(`[TTS Worker] Processing audio for summary ${summaryId}`)

    // 發布「生成中」事件
    await publishSummaryEvent(summaryId, { type: 'audio_generating' })

    try {
      // 1. 取得 summary
      const summary = await prisma.summary.findUnique({
        where: { id: summaryId },
      })

      if (!summary) {
        throw new Error(`Summary ${summaryId} not found`)
      }

      if (summary.status !== 'completed') {
        throw new Error(`Summary ${summaryId} is not completed yet`)
      }

      // 2. 檢查是否已有音訊
      if (summary.audioUrl) {
        console.log(`[TTS Worker] Audio already exists for summary ${summaryId}`)
        await publishSummaryEvent(summaryId, {
          type: 'audio_completed',
          data: { audioUrl: summary.audioUrl },
        })
        return { success: true, cached: true }
      }

      const content = summary.content as unknown as SummaryResult

      // 3. 組合 TTS 文字
      let textToSpeak = `您好,這是 TubeMind 為您準備的影片摘要音訊。\n\n`

      if (content.topic) {
        textToSpeak += `這份摘要的主題是:${content.topic}。\n\n`
      }

      if (content.keyPoints && content.keyPoints.length > 0) {
        textToSpeak += `這部影片有幾個核心觀點:\n`
        content.keyPoints.forEach((point, index) => {
          textToSpeak += `${index + 1}、${point}\n`
        })
        textToSpeak += `\n`
      }

      if (content.sections && content.sections.length > 0) {
        textToSpeak += `接下來為您播報詳細的摘要內容:\n`
        content.sections.forEach((section) => {
          textToSpeak += `${section.title}。${section.summary}\n\n`
        })
      }

      textToSpeak += `以上就是這份摘要的全部內容。感謝您的收聽。`

      if (!textToSpeak || textToSpeak.trim().length < 5) {
        throw new Error('摘要內容不足，無法生成語音')
      }

      // 4. 生成語音
      console.log(`[TTS Worker] Calling TTS engine for summary ${summaryId}`)
      const audioBuffer = await generateSpeech({
        text: textToSpeak,
        voiceName: 'cmn-TW-Standard-A',
      })

      // 5. 上傳到 GCS
      console.log(`[TTS Worker] Uploading audio for summary ${summaryId}`)
      const fileName = `audio/${summaryId}.mp3`
      const audioUrl = await uploadAudio(audioBuffer, fileName)

      // 6. 更新資料庫
      await prisma.summary.update({
        where: { id: summaryId },
        data: {
          audioUrl,
          audioGeneratedAt: new Date(),
        },
      })

      // 7. 發布「完成」事件
      await publishSummaryEvent(summaryId, {
        type: 'audio_completed',
        data: { audioUrl },
      })

      console.log(`[TTS Worker] ✅ Audio generated for summary ${summaryId}`)

      return { success: true }
    } catch (error: any) {
      console.error(`[TTS Worker] ❌ Failed to generate audio:`, error)
      
      // 發布「失敗」事件
      await publishSummaryEvent(summaryId, {
        type: 'audio_failed',
        error: error.message,
      })

      throw error
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 2,
  }
)

ttsWorker.on('failed', async (job, err) => {
  console.error(`[TTS Worker] ❌ Job ${job?.id} failed:`, err)
})

ttsWorker.on('completed', (job) => {
  console.log(`[TTS Worker] ✅ Job ${job.id} completed`)
})
```

**步驟 2: 驗證 TypeScript**

```bash
npx tsc --noEmit
```

預期結果: 無錯誤

**步驟 3: 提交 (Commit)**

```bash
git add lib/workers/ttsWorker.ts
git commit -m "feat: add TTS worker for audio generation"
```

---

## 任務 4: 修改 summaryWorker 發布事件

**檔案 (Files):**
- 修改: `lib/workers/summaryWorker.ts`

**步驟 1: 在 summaryWorker 完成時發布事件**

在 `lib/workers/summaryWorker.ts` 頂部加入 import：

```typescript
import { publishSummaryEvent } from '@/lib/queue/events'
```

**步驟 2: 在狀態更新時發布事件**

找到更新狀態為 `processing` 的地方（約第 18 行），之後加入：

```typescript
// 1. 更新狀態為 processing
await prisma.summary.update({
  where: { id: summaryId },
  data: {
    status: 'processing',
    jobId: job.id,
  },
})

// 發布 processing 事件
await publishSummaryEvent(summaryId, { type: 'summary_processing' })
```

**步驟 3: 在完成時發布事件**

找到更新狀態為 `completed` 的地方（約第 71 行），之後加入：

```typescript
// 6. 儲存結果
const completedSummary = await prisma.summary.update({
  where: { id: summaryId },
  data: {
    status: 'completed',
    content: summaryContent as any,
    completedAt: new Date(),
  },
  include: {
    video: {
      include: {
        channel: true,
      },
    },
    user: {
      include: {
        accounts: {
          where: { provider: 'notion' },
        },
      },
    },
  },
})

// 發布 completed 事件
await publishSummaryEvent(summaryId, {
  type: 'summary_completed',
  data: { content: summaryContent },
})
```

**步驟 4: 在失敗時發布事件**

找到 `summaryWorker.on('failed')` handler（約第 177 行），在更新資料庫後加入：

```typescript
summaryWorker.on('failed', async (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} failed:`, err)

  if (job?.data.summaryId) {
    await prisma.summary.update({
      where: { id: job.data.summaryId },
      data: {
        status: 'failed',
        errorMessage: err.message,
      },
    })
    
    // 發布 failed 事件
    await publishSummaryEvent(job.data.summaryId, {
      type: 'summary_failed',
      error: err.message,
    })
  }
})
```

**步驟 5: 驗證 TypeScript**

```bash
npx tsc --noEmit
```

預期結果: 無錯誤

**步驟 6: 提交 (Commit)**

```bash
git add lib/workers/summaryWorker.ts
git commit -m "feat: publish Redis events from summaryWorker"
```

---

## 任務 5: 修改 Worker 啟動腳本

**檔案 (Files):**
- 修改: `scripts/worker.ts`

**步驟 1: 匯入 ttsWorker**

在 `scripts/worker.ts` 頂部修改：

```typescript
import { summaryWorker } from '@/lib/workers/summaryWorker'
import { ttsWorker } from '@/lib/workers/ttsWorker'

console.log('🚀 Worker started (Summary + TTS)')
```

**步驟 2: 更新關閉處理**

修改 SIGTERM handler：

```typescript
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...')
  await Promise.all([
    summaryWorker.close(),
    ttsWorker.close(),
  ])
  process.exit(0)
})
```

**步驟 3: 驗證 TypeScript**

```bash
npx tsc --noEmit
```

預期結果: 無錯誤

**步驟 4: 提交 (Commit)**

```bash
git add scripts/worker.ts
git commit -m "feat: start both summary and TTS workers"
```

---

## 任務 6: 修改 TTS API 端點為非阻塞

**檔案 (Files):**
- 修改: `app/api/summaries/[id]/audio/route.ts`

**步驟 1: 移除阻塞式處理，改為加入隊列**

完全重寫 `app/api/summaries/[id]/audio/route.ts`：

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addTTSJob } from '@/lib/queue/ttsQueue'

export const maxDuration = 30

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await prisma.summary.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        video: true,
      },
    })

    if (!summary) {
      return NextResponse.json({ error: 'Summary not found' }, { status: 404 })
    }

    // 如果音訊已存在，直接回傳
    if (summary.audioUrl) {
      console.log(`[Audio API] Serving cached audio for summary: ${params.id}`)
      return NextResponse.json({ audioUrl: summary.audioUrl })
    }

    // 檢查摘要是否完成
    if (summary.status !== 'completed') {
      console.error(`[Audio API] Summary ${params.id} is not completed. Status: ${summary.status}`)
      return NextResponse.json(
        { error: 'Summary is not completed yet. Please wait for the summary to be ready.' },
        { status: 400 }
      )
    }

    // 加入 TTS 隊列
    console.log(`[Audio API] Adding TTS job for summary: ${params.id}`)
    await addTTSJob({
      summaryId: summary.id,
      youtubeVideoId: summary.video.youtubeId,
    })

    // 立即回傳，告知前端正在處理
    return NextResponse.json({ 
      status: 'processing',
      message: 'Audio generation started. You will be notified when ready.' 
    })
  } catch (error) {
    console.error(`[Audio API] Error for summary ${params.id}:`, error)
    return NextResponse.json(
      {
        error: 'Failed to start audio generation: ' + (error instanceof Error ? error.message : 'Internal Server Error'),
      },
      { status: 500 }
    )
  }
}
```

**步驟 2: 驗證 TypeScript**

```bash
npx tsc --noEmit
```

預期結果: 無錯誤

**步驟 3: 提交 (Commit)**

```bash
git add app/api/summaries/[id]/audio/route.ts
git commit -m "refactor: change TTS API to non-blocking queue-based processing"
```

---

## 任務 7: 建立 SSE 端點

**檔案 (Files):**
- 建立: `app/api/sse/summary/[id]/route.ts`

**步驟 1: 建立 SSE Route Handler**

建立 `app/api/sse/summary/[id]/route.ts`：

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { subscribeSummaryEvents } from '@/lib/queue/events'
import type { SummaryEvent } from '@/lib/queue/events'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const summaryId = params.id

  // 驗證使用者權限
  const summary = await prisma.summary.findFirst({
    where: {
      id: summaryId,
      userId: session.user.id,
    },
  })

  if (!summary) {
    return new Response('Summary not found', { status: 404 })
  }

  // 建立 SSE stream
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE] Client connected for summary ${summaryId}`)

      // 訂閱 Redis events
      const subscriber = subscribeSummaryEvents(summaryId, (event: SummaryEvent) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(data))
          
          // 如果摘要完成且音訊也完成，可以選擇關閉連線
          // 但為了簡化，我們讓前端自己決定何時關閉
        } catch (error) {
          console.error(`[SSE] Error sending event:`, error)
        }
      })

      // 發送初始心跳
      const heartbeat = `data: ${JSON.stringify({ type: 'connected' })}\n\n`
      controller.enqueue(encoder.encode(heartbeat))

      // 定期發送心跳以保持連線
      const heartbeatInterval = setInterval(() => {
        try {
          const ping = `:ping\n\n`
          controller.enqueue(encoder.encode(ping))
        } catch (error) {
          console.error(`[SSE] Heartbeat failed:`, error)
          clearInterval(heartbeatInterval)
        }
      }, 30000) // 每 30 秒

      // 清理函式
      const cleanup = () => {
        console.log(`[SSE] Client disconnected for summary ${summaryId}`)
        clearInterval(heartbeatInterval)
        subscriber.quit()
      }

      // 當客戶端斷線時清理
      request.signal.addEventListener('abort', cleanup)

      // 當 stream 關閉時清理
      return cleanup
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

**步驟 2: 驗證 TypeScript**

```bash
npx tsc --noEmit
```

預期結果: 無錯誤

**步驟 3: 提交 (Commit)**

```bash
git add app/api/sse/summary/[id]/route.ts
git commit -m "feat: add SSE endpoint for real-time summary updates"
```

---

## 任務 8: 建立前端 SSE Hook

**檔案 (Files):**
- 建立: `hooks/useSummarySSE.ts`

**步驟 1: 建立 useSummarySSE hook**

建立 `hooks/useSummarySSE.ts`：

```typescript
'use client'

import { useEffect, useRef } from 'react'
import type { SummaryEvent } from '@/lib/queue/events'

interface UseSummarySSEOptions {
  summaryId: string
  enabled: boolean
  onEvent: (event: SummaryEvent) => void
}

export function useSummarySSE({ summaryId, enabled, onEvent }: UseSummarySSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled) {
      // 如果不需要連線，確保清理現有連線
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    console.log(`[SSE Hook] Connecting to summary ${summaryId}`)

    const eventSource = new EventSource(`/api/sse/summary/${summaryId}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as SummaryEvent
        
        // 忽略心跳和連線確認
        if ('type' in event && event.type === 'connected') {
          console.log(`[SSE Hook] Connected to summary ${summaryId}`)
          return
        }

        console.log(`[SSE Hook] Received event:`, event)
        onEvent(event)
      } catch (error) {
        console.error(`[SSE Hook] Failed to parse event:`, error)
      }
    }

    eventSource.onerror = (error) => {
      console.error(`[SSE Hook] Error:`, error)
      // EventSource 會自動重連，除非我們主動 close
    }

    // 清理函式
    return () => {
      console.log(`[SSE Hook] Disconnecting from summary ${summaryId}`)
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [summaryId, enabled, onEvent])

  return {
    isConnected: eventSourceRef.current !== null,
  }
}
```

**步驟 2: 驗證 TypeScript**

```bash
npx tsc --noEmit
```

預期結果: 無錯誤

**步驟 3: 提交 (Commit)**

```bash
git add hooks/useSummarySSE.ts
git commit -m "feat: add useSummarySSE hook for real-time updates"
```

---

## 任務 9: 整合 SSE 到 AudioPlayer

**檔案 (Files):**
- 修改: `components/audio/AudioPlayer.tsx`

**步驟 1: 修改 AudioPlayer 使用 SSE**

在 `components/audio/AudioPlayer.tsx` 頂部加入 import：

```typescript
import { useSummarySSE } from '@/hooks/useSummarySSE'
import { useCallback } from 'react'
import type { SummaryEvent } from '@/lib/queue/events'
```

**步驟 2: 在組件內加入 SSE 邏輯**

在 `AudioPlayer` 函式內，`audioRef` 宣告之後加入：

```typescript
// SSE 監聽（只在沒有 audioUrl 時連線）
const handleSSEEvent = useCallback((event: SummaryEvent) => {
  if (event.type === 'audio_completed') {
    setAudioUrl(event.data.audioUrl)
    setState('ready')
    
    // 自動播放
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch(console.error)
      }
    }, 100)
  } else if (event.type === 'audio_failed') {
    setError(event.error)
    setState('error')
  } else if (event.type === 'audio_generating') {
    setState('generating')
  }
}, [])

useSummarySSE({
  summaryId,
  enabled: !audioUrl, // 只在沒有音訊時連線
  onEvent: handleSSEEvent,
})
```

**步驟 3: 修改 generateAudio 函式**

找到 `generateAudio` 函式（約第 31 行），修改為：

```typescript
const generateAudio = async () => {
  setState('generating')
  setError(null)

  try {
    const res = await fetch(`/api/summaries/${summaryId}/audio`, {
      method: 'POST',
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || '生成失敗')
    }

    const result = await res.json()
    
    // 如果已有快取的音訊，直接設定
    if (result.audioUrl) {
      setAudioUrl(result.audioUrl)
      setState('ready')
      
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(console.error)
        }
      }, 100)
    }
    // 否則等待 SSE 推送（state 已經是 generating）
  } catch (err: any) {
    console.error('音訊生成失敗:', err)
    setError(err.message)
    setState('error')
  }
}
```

**步驟 4: 驗證 TypeScript**

```bash
npx tsc --noEmit
```

預期結果: 無錯誤

**步驟 5: 提交 (Commit)**

```bash
git add components/audio/AudioPlayer.tsx
git commit -m "feat: integrate SSE into AudioPlayer for real-time updates"
```

---

## 任務 10: 建立 SummaryStatusWrapper 組件

**檔案 (Files):**
- 建立: `components/summary/SummaryStatusWrapper.tsx`
- 參考: `app/(dashboard)/summaries/[id]/page.tsx`

**步驟 1: 建立 Client Component Wrapper**

建立 `components/summary/SummaryStatusWrapper.tsx`：

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useSummarySSE } from '@/hooks/useSummarySSE'
import type { SummaryEvent } from '@/lib/queue/events'

interface SummaryStatusWrapperProps {
  summaryId: string
  initialStatus: string
  initialContent: any
  children: (status: string, content: any) => React.ReactNode
}

export function SummaryStatusWrapper({
  summaryId,
  initialStatus,
  initialContent,
  children,
}: SummaryStatusWrapperProps) {
  const [status, setStatus] = useState(initialStatus)
  const [content, setContent] = useState(initialContent)

  const handleSSEEvent = useCallback((event: SummaryEvent) => {
    if (event.type === 'summary_processing') {
      setStatus('processing')
    } else if (event.type === 'summary_completed') {
      setStatus('completed')
      setContent(event.data.content)
    } else if (event.type === 'summary_failed') {
      setStatus('failed')
    }
  }, [])

  // 智能連線：只在未完成時連線
  const shouldConnect = status !== 'completed'

  useSummarySSE({
    summaryId,
    enabled: shouldConnect,
    onEvent: handleSSEEvent,
  })

  return <>{children(status, content)}</>
}
```

**步驟 2: 驗證 TypeScript**

```bash
npx tsc --noEmit
```

預期結果: 無錯誤

**步驟 3: 提交 (Commit)**

```bash
git add components/summary/SummaryStatusWrapper.tsx
git commit -m "feat: add SummaryStatusWrapper for real-time status updates"
```

---

## 任務 11: 整合 SummaryStatusWrapper 到詳情頁

**檔案 (Files):**
- 修改: `app/(dashboard)/summaries/[id]/page.tsx`

**步驟 1: 匯入 SummaryStatusWrapper**

在 `app/(dashboard)/summaries/[id]/page.tsx` 頂部加入：

```typescript
import { SummaryStatusWrapper } from '@/components/summary/SummaryStatusWrapper'
```

**步驟 2: 包裹處理中/失敗的狀態顯示**

找到 `if (summary.status !== 'completed')` 的區塊（約第 70 行），修改為：

```typescript
if (summary.status !== 'completed') {
  return (
    <SummaryStatusWrapper
      summaryId={summary.id}
      initialStatus={summary.status}
      initialContent={summary.content}
    >
      {(status, content) => {
        const isFailed = status === 'failed'
        
        // 如果變成 completed，重新導向或重新渲染
        if (status === 'completed') {
          // 觸發頁面重新整理以顯示完整內容
          if (typeof window !== 'undefined') {
            window.location.reload()
          }
          return null
        }

        return (
          <div className="text-center py-12 relative group max-w-2xl mx-auto">
            <div className="absolute top-0 right-0">
              <DeleteSummaryButton id={summary.id} />
            </div>

            {isFailed ? (
              <div className="flex flex-col items-center gap-6">
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-full">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                </div>

                <div>
                  <h1 className="text-3xl font-bold text-white mb-2 font-rajdhani">
                    摘要生成失敗
                  </h1>
                  <p className="text-text-secondary font-ibm mb-4">
                    抱歉，我們在處理這部影片時遇到了問題。
                  </p>

                  {summary.errorMessage && (
                    <div className="bg-bg-secondary border border-white/10 p-4 rounded-lg text-left mb-6 font-mono text-sm text-red-300 max-w-full overflow-auto">
                      {summary.errorMessage}
                    </div>
                  )}
                </div>

                <RetryButton id={summary.id} />
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-bold text-white mb-4 font-rajdhani animate-pulse">
                  {status === 'processing' ? 'AI 正在分析影片...' : '等待處理中...'}
                </h1>
                <p className="text-text-secondary font-ibm">這可能需要幾分鐘的時間，您可以稍後再回來查看。</p>
              </div>
            )}
          </div>
        )
      }}
    </SummaryStatusWrapper>
  )
}
```

**步驟 3: 驗證 TypeScript**

```bash
npx tsc --noEmit
```

預期結果: 無錯誤

**步驟 4: 提交 (Commit)**

```bash
git add app/(dashboard)/summaries/[id]/page.tsx
git commit -m "feat: integrate real-time status updates in summary detail page"
```

---

## 任務 12: 更新事件類型匯出

**檔案 (Files):**
- 修改: `lib/queue/events.ts`（確保正確匯出）

**步驟 1: 確認匯出**

確保 `lib/queue/events.ts` 有正確的匯出：

```typescript
export type { SummaryEvent }
```

（如果已經有 `export type SummaryEvent = ...`，這步可以跳過）

**步驟 2: 建立型別聲明檔案（可選）**

如果前端需要使用型別，可以考慮在 `types/` 目錄建立共用型別：

```typescript
// types/events.ts
export type SummaryEvent =
  | { type: 'summary_processing' }
  | { type: 'summary_completed'; data: { content: any } }
  | { type: 'summary_failed'; error: string }
  | { type: 'audio_generating' }
  | { type: 'audio_completed'; data: { audioUrl: string } }
  | { type: 'audio_failed'; error: string }
```

然後在 `lib/queue/events.ts` 中 re-export：

```typescript
export type { SummaryEvent } from '@/types/events'
```

**注意：** 這步是可選的，如果目前的匯出已經可以正常使用，可以跳過。

**步驟 3: 驗證 TypeScript**

```bash
npx tsc --noEmit
```

預期結果: 無錯誤

**步驟 4: 提交（如果有修改）**

```bash
git add lib/queue/events.ts
git commit -m "chore: ensure SummaryEvent type is properly exported"
```

---

## 完成檢查清單

完成所有任務後，執行以下檢查：

### 1. TypeScript 型別檢查

```bash
npx tsc --noEmit
```

預期結果: 無錯誤

### 2. 功能測試準備

需要準備的環境變數（`.env.local`）：
- `DATABASE_URL`
- `REDIS_URL`
- `GOOGLE_APPLICATION_CREDENTIALS` 或 GCS 相關設定
- NextAuth 相關設定

### 3. 啟動測試

**Terminal 1: 啟動 Next.js**
```bash
npm run dev
```

**Terminal 2: 啟動 Worker**
```bash
npm run worker
```

預期輸出：
```
🚀 Worker started (Summary + TTS)
```

### 4. 手動測試流程

1. 建立新的摘要
2. 觀察 Summary 詳情頁面是否即時更新（不需重新整理）
3. 點擊「AI 語音導讀」按鈕
4. 觀察 AudioPlayer 是否即時切換為可播放狀態
5. 檢查 Redis 是否有 pub/sub 訊息（可用 `redis-cli MONITOR`）

### 5. 整合到主分支

完成測試後，使用 `superpowers:finishing-a-development-branch` 整合回主分支。

---

## 故障排除

### 問題 1: SSE 連線立即斷開

**原因：** Next.js 在開發模式可能有 timeout 限制
**解決：** 檢查 SSE 端點是否正確設定 `export const dynamic = 'force-dynamic'`

### 問題 2: Worker 沒有發布 Redis 事件

**檢查：**
```bash
redis-cli
> SUBSCRIBE summary:*
```

觀察是否有訊息發布

### 問題 3: 前端收不到 SSE 事件

**檢查：**
1. 瀏覽器開發者工具 > Network > 確認 SSE 連線狀態
2. Console 是否有 `[SSE Hook]` 的 log
3. 確認 `enabled` 條件是否正確

### 問題 4: TypeScript 型別錯誤

**解決：**
- 確保 `lib/queue/events.ts` 正確匯出 `SummaryEvent` 型別
- 執行 `npx prisma generate` 重新生成 Prisma Client
- 重啟 TypeScript Language Server
