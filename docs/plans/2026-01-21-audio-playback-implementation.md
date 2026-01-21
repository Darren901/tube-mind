# 語音播報功能實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目標**: 在摘要詳細頁面新增語音播放器，使用者可以播放 AI 語音朗讀摘要內容。

**架構**: 前端使用 HTML5 audio + React 自訂 UI 控制播放器，後端提供 API 端點呼叫 Google Cloud TTS 生成語音並上傳到 GCS，首次生成後快取 URL 到資料庫。

**技術棧**: 
- Google Cloud Text-to-Speech API (繁體中文語音)
- Google Cloud Storage (音訊檔案儲存)
- React + TypeScript (播放器 UI)
- Prisma (資料庫 ORM)
- Lucide React (圖示)

---

## Phase 1: 基礎設定與資料庫

### Task 1: 更新 Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma` (在 Summary model 中新增欄位)

**Step 1: 新增音訊欄位到 Summary model**

在 `prisma/schema.prisma` 的 `model Summary` 中，於最後一個欄位後新增：

```prisma
  audioUrl         String?   // GCS 上的語音檔公開 URL
  audioGeneratedAt DateTime? // 語音生成時間（用於快取管理）
```

完整位置應該在 `summaryTags SummaryTag[]` 之後，`@@unique` 之前。

**Step 2: 執行資料庫遷移**

```bash
npx prisma migrate dev --name add_audio_to_summary
```

預期輸出：Migration 成功建立，資料庫已更新

**Step 3: 檢查生成的 Prisma Client**

```bash
npx prisma generate
```

預期輸出：Prisma Client 已重新生成

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add audio fields to Summary model"
```

---

### Task 2: 安裝 Google Cloud 相關套件

**Files:**
- Modify: `package.json`

**Step 1: 安裝 Google Cloud 套件**

```bash
npm install @google-cloud/text-to-speech @google-cloud/storage
```

**Step 2: 安裝型別定義**

```bash
npm install -D @types/google-cloud__text-to-speech @types/google-cloud__storage
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): add Google Cloud TTS and Storage SDKs"
```

---

### Task 3: 設定環境變數

**Files:**
- Modify: `.env.local` (本地開發，不 commit)
- Create: `.env.example` (範例檔案，可 commit)

**Step 1: 新增環境變數到 .env.local**

```env
# Google Cloud 服務帳號金鑰路徑
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# GCS Bucket 名稱
GCS_BUCKET_NAME=tube-mind-audio-dev
```

**Step 2: 建立 .env.example**

```env
# Google Cloud Text-to-Speech & Storage
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
GCS_BUCKET_NAME=tube-mind-audio-dev
```

**Step 3: Commit .env.example**

```bash
git add .env.example
git commit -m "docs: add environment variables for audio feature"
```

**Note**: 在執行後續任務前，需要手動設定 Google Cloud：
1. 啟用 Cloud Text-to-Speech API 和 Cloud Storage API
2. 建立 GCS Bucket
3. 下載服務帳號金鑰到專案根目錄

---

## Phase 2: 後端 API 實作

### Task 4: 建立 TTS 和 GCS 工具函式

**Files:**
- Create: `lib/audio/tts.ts`
- Create: `lib/audio/storage.ts`

**Step 1: 建立 TTS 工具函式**

Create `lib/audio/tts.ts`:

```typescript
import { TextToSpeechClient } from '@google-cloud/text-to-speech'

const client = new TextToSpeechClient()

export interface TTSOptions {
  text: string
  languageCode?: string
  voiceName?: string
}

export async function generateSpeech(options: TTSOptions): Promise<Buffer> {
  const { text, languageCode = 'zh-TW', voiceName = 'zh-TW-Standard-A' } = options

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
      ssmlGender: 'FEMALE',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
    },
  })

  if (!response.audioContent) {
    throw new Error('TTS 生成失敗：無音訊內容')
  }

  return Buffer.from(response.audioContent as Uint8Array)
}
```

**Step 2: 建立 GCS 上傳工具函式**

Create `lib/audio/storage.ts`:

```typescript
import { Storage } from '@google-cloud/storage'

const storage = new Storage()
const bucketName = process.env.GCS_BUCKET_NAME!

if (!bucketName) {
  throw new Error('GCS_BUCKET_NAME 環境變數未設定')
}

const bucket = storage.bucket(bucketName)

export async function uploadAudio(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const file = bucket.file(filename)

  await file.save(buffer, {
    metadata: {
      contentType: 'audio/mpeg',
      cacheControl: 'public, max-age=31536000', // 快取一年
    },
  })

  // 設定公開讀取權限
  await file.makePublic()

  // 回傳公開 URL
  return `https://storage.googleapis.com/${bucketName}/${filename}`
}
```

**Step 3: Commit**

```bash
git add lib/audio/
git commit -m "feat(audio): add TTS and GCS utility functions"
```

---

### Task 5: 建立音訊 API 端點

**Files:**
- Create: `app/api/summaries/[id]/audio/route.ts`

**Step 1: 建立 API 路由檔案**

Create `app/api/summaries/[id]/audio/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateSpeech } from '@/lib/audio/tts'
import { uploadAudio } from '@/lib/audio/storage'

interface SummaryContent {
  topic: string
  keyPoints: string[]
  sections: {
    timestamp: string
    title: string
    summary: string
  }[]
}

export const maxDuration = 30 // Vercel timeout: 30 秒

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 驗證使用者
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    // 2. 查詢摘要
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
      return NextResponse.json({ error: '找不到該摘要' }, { status: 404 })
    }

    if (summary.status !== 'completed') {
      return NextResponse.json(
        { error: '摘要尚未完成，無法生成語音' },
        { status: 400 }
      )
    }

    // 3. 檢查快取
    if (summary.audioUrl) {
      return NextResponse.json({
        audioUrl: summary.audioUrl,
      })
    }

    // 4. 組合文字內容
    const content = summary.content as unknown as SummaryContent
    const textParts: string[] = []

    textParts.push(`主題：${content.topic}`)
    textParts.push(`核心觀點：${content.keyPoints.join('、')}`)

    content.sections.forEach((section) => {
      textParts.push(`${section.title}。${section.summary}`)
    })

    const combinedText = textParts.join('\n\n')

    // 5. 生成語音
    console.log(`[Audio] 開始生成語音，摘要 ID: ${params.id}`)
    const audioBuffer = await generateSpeech({ text: combinedText })

    // 6. 上傳到 GCS
    const filename = `audio/${params.id}.mp3`
    console.log(`[Audio] 上傳到 GCS: ${filename}`)
    const audioUrl = await uploadAudio(audioBuffer, filename)

    // 7. 更新資料庫
    await prisma.summary.update({
      where: { id: params.id },
      data: {
        audioUrl,
        audioGeneratedAt: new Date(),
      },
    })

    console.log(`[Audio] 語音生成成功: ${audioUrl}`)

    return NextResponse.json({ audioUrl })
  } catch (error: any) {
    console.error('[Audio] 生成失敗:', error)

    // 根據錯誤類型回傳不同訊息
    if (error.code === 7) {
      // Google Cloud 配額用盡
      return NextResponse.json(
        { error: '已達配額上限，請明日再試' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: '語音生成失敗，請稍後重試' },
      { status: 500 }
    )
  }
}
```

**Step 2: 測試 API（手動）**

在完成 Google Cloud 設定後，可以用 curl 測試：

```bash
# 取得一個 summaryId，然後測試
curl -X POST http://localhost:3000/api/summaries/{summaryId}/audio \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

預期：回傳 `{ "audioUrl": "https://storage.googleapis.com/..." }`

**Step 3: Commit**

```bash
git add app/api/summaries/[id]/audio/
git commit -m "feat(api): add audio generation endpoint"
```

---

## Phase 3: 前端播放器組件

### Task 6: 建立 AudioPlayer 組件

**Files:**
- Create: `components/audio/AudioPlayer.tsx`

**Step 1: 建立播放器組件**

Create `components/audio/AudioPlayer.tsx`:

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Loader2, RefreshCw } from 'lucide-react'

interface AudioPlayerProps {
  summaryId: string
}

type PlayerState = 'idle' | 'generating' | 'ready' | 'playing' | 'paused' | 'error'

export function AudioPlayer({ summaryId }: AudioPlayerProps) {
  const [state, setState] = useState<PlayerState>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)

  // 生成語音
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

      const { audioUrl: url } = await res.json()
      setAudioUrl(url)
      setState('ready')

      // 自動播放
      setTimeout(() => {
        audioRef.current?.play()
      }, 100)
    } catch (err: any) {
      console.error('音訊生成失敗:', err)
      setError(err.message)
      setState('error')
    }
  }

  // 播放/暫停
  const togglePlay = () => {
    if (!audioRef.current) return

    if (state === 'playing') {
      audioRef.current.pause()
      setState('paused')
    } else {
      audioRef.current.play()
      setState('playing')
    }
  }

  // 首次播放
  const handleFirstPlay = () => {
    if (audioUrl) {
      togglePlay()
    } else {
      generateAudio()
    }
  }

  // 進度條拖曳
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  // 音量調整
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
    if (audioRef.current) {
      audioRef.current.volume = vol
    }
    if (vol > 0) setIsMuted(false)
  }

  // 靜音切換
  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
    }
  }

  // 播放速度
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
  }

  // 音訊事件監聽
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration)
    const handleEnded = () => setState('paused')
    const handlePlay = () => setState('playing')
    const handlePause = () => setState('paused')

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [audioUrl])

  // 格式化時間
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="mb-8 p-6 bg-bg-secondary border border-white/10 rounded-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-lg font-semibold text-white font-rajdhani flex items-center gap-2">
          🎧 語音播放
        </div>
      </div>

      {/* 錯誤狀態 */}
      {state === 'error' && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm font-ibm">{error || '語音生成失敗'}</p>
          <button
            onClick={generateAudio}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition font-ibm text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            重試
          </button>
        </div>
      )}

      {/* 生成中狀態 */}
      {state === 'generating' && (
        <div className="flex items-center gap-3 text-brand-blue font-ibm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>正在生成語音...</span>
        </div>
      )}

      {/* 播放器控制 */}
      {(state === 'ready' || state === 'playing' || state === 'paused') && (
        <div className="space-y-4">
          {/* 進度條 */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-text-secondary min-w-[45px]">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-blue
                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 
                [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-brand-blue [&::-moz-range-thumb]:border-0"
            />
            <span className="text-sm font-mono text-text-secondary min-w-[45px]">
              {formatTime(duration)}
            </span>
          </div>

          {/* 控制按鈕 */}
          <div className="flex items-center gap-4">
            {/* 播放/暫停 */}
            <button
              onClick={togglePlay}
              className="p-3 bg-brand-blue hover:bg-blue-600 text-white rounded-full transition"
            >
              {state === 'playing' ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            {/* 音量控制 */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white/5 rounded transition"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-text-secondary" />
                ) : (
                  <Volume2 className="w-5 h-5 text-text-secondary" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-text-secondary
                  [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 
                  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-text-secondary [&::-moz-range-thumb]:border-0"
              />
            </div>

            {/* 播放速度 */}
            <div className="flex items-center gap-1">
              {[1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleRateChange(rate)}
                  className={`px-3 py-1 text-sm rounded transition font-ibm ${
                    playbackRate === rate
                      ? 'bg-brand-blue text-white'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 初始狀態：播放按鈕 */}
      {state === 'idle' && (
        <button
          onClick={handleFirstPlay}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-blue-600 text-white rounded-lg transition font-ibm"
        >
          <Play className="w-5 h-5" />
          播放語音
        </button>
      )}

      {/* 隱藏的 audio 元素 */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/audio/
git commit -m "feat(ui): add AudioPlayer component"
```

---

### Task 7: 整合播放器到摘要詳細頁

**Files:**
- Modify: `app/(dashboard)/summaries/[id]/page.tsx`

**Step 1: 匯入 AudioPlayer 組件**

在檔案頂部的 import 區塊新增：

```typescript
import { AudioPlayer } from '@/components/audio/AudioPlayer'
```

**Step 2: 在頁面中插入播放器**

找到這段程式碼（大約在 line 183）：

```typescript
        </div>
      </div>

      {/* 主題 */}
      <div className="mb-8 p-6 bg-bg-secondary border border-white/10 rounded-lg">
```

在 `{/* 主題 */}` 之前插入：

```typescript
        </div>
      </div>

      {/* 語音播放器 */}
      <AudioPlayer summaryId={summary.id} />

      {/* 主題 */}
      <div className="mb-8 p-6 bg-bg-secondary border border-white/10 rounded-lg">
```

**Step 3: Commit**

```bash
git add app/(dashboard)/summaries/[id]/page.tsx
git commit -m "feat(ui): integrate AudioPlayer into summary detail page"
```

---

## Phase 4: 測試與除錯

### Task 8: 手動測試完整流程

**Step 1: 設定 Google Cloud（手動操作）**

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 啟用 Cloud Text-to-Speech API
3. 啟用 Cloud Storage API
4. 建立 GCS Bucket：`tube-mind-audio-dev`
5. 建立服務帳號，授予權限：
   - Cloud Storage Admin
   - Cloud Text-to-Speech User
6. 下載服務帳號 JSON 金鑰到專案根目錄，命名為 `service-account-key.json`
7. 確認 `.env.local` 環境變數已設定

**Step 2: 啟動開發伺服器**

```bash
npm run dev
```

**Step 3: 測試流程**

1. 登入應用程式
2. 進入任一已完成的摘要詳細頁
3. 應該看到「🎧 語音播放」區塊
4. 點擊「播放語音」按鈕
5. 觀察狀態：
   - 應顯示「正在生成語音...」
   - 2-5 秒後自動開始播放
   - 播放器控制應該正常運作

**Step 4: 測試快取**

1. 重新整理頁面
2. 再次點擊播放
3. 應該立即播放，不需等待生成

**Step 5: 測試錯誤處理**

1. 暫時移除 `GOOGLE_APPLICATION_CREDENTIALS` 環境變數
2. 重新啟動 dev server
3. 嘗試播放
4. 應顯示錯誤訊息和重試按鈕

**Step 6: 檢查 GCS**

1. 前往 Google Cloud Console > Cloud Storage
2. 查看 bucket 中是否有 `audio/{summaryId}.mp3` 檔案
3. 確認檔案可公開存取

**Step 7: 記錄測試結果**

建立 `docs/testing/audio-playback-manual-test.md` 記錄測試結果。

---

### Task 9: 檢查資料庫更新

**Step 1: 查詢資料庫**

```bash
npx prisma studio
```

**Step 2: 檢查 Summary 表**

1. 找到剛才測試的摘要
2. 確認 `audioUrl` 欄位已填入 GCS URL
3. 確認 `audioGeneratedAt` 欄位已設定時間

**Step 3: 記錄**

如果一切正常，在測試文件中記錄「✅ 資料庫更新正常」。

---

## Phase 5: 優化與文件

### Task 10: 新增 Loading 狀態優化

**Files:**
- Modify: `components/audio/AudioPlayer.tsx`

**Step 1: 新增進度文字**

在 `state === 'generating'` 的區塊中，改進 UI：

```typescript
{state === 'generating' && (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-3 text-brand-blue font-ibm">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>正在生成語音...</span>
    </div>
    <p className="text-sm text-text-secondary font-ibm">
      首次生成需要 2-5 秒，之後會自動快取
    </p>
  </div>
)}
```

**Step 2: Commit**

```bash
git add components/audio/AudioPlayer.tsx
git commit -m "feat(ui): improve loading state UX"
```

---

### Task 11: 更新專案文件

**Files:**
- Modify: `README.md`
- Create: `docs/features/audio-playback.md`

**Step 1: 新增功能說明到 README**

在 `README.md` 的 Features 區塊新增：

```markdown
### 🎧 語音播報

- AI 語音朗讀摘要內容
- 支援播放速度調整（1x - 2x）
- 智能快取，首次生成後立即播放
- 使用 Google Cloud TTS，高品質繁體中文語音
```

**Step 2: 建立功能文件**

Create `docs/features/audio-playback.md`:

```markdown
# 語音播報功能

## 概述

使用者可以在摘要詳細頁面播放 AI 語音版本的摘要內容。

## 技術架構

- **TTS**: Google Cloud Text-to-Speech (zh-TW)
- **儲存**: Google Cloud Storage
- **前端**: React + HTML5 Audio API

## 使用方式

1. 進入任一完成的摘要頁面
2. 點擊「播放語音」按鈕
3. 首次播放會生成語音（2-5 秒）
4. 後續播放立即載入快取

## 播放器功能

- ▶️ 播放/暫停
- 🎚️ 進度條拖曳
- 🔊 音量控制
- ⚡ 播放速度（1x, 1.25x, 1.5x, 2x）

## 環境設定

需要設定以下環境變數：

```env
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
GCS_BUCKET_NAME=tube-mind-audio-prod
```

## Google Cloud 設定

1. 啟用 Cloud Text-to-Speech API
2. 啟用 Cloud Storage API
3. 建立 GCS Bucket
4. 建立服務帳號並下載金鑰

詳見：`docs/plans/2026-01-21-audio-playback-design.md`
```

**Step 3: Commit**

```bash
git add README.md docs/features/
git commit -m "docs: add audio playback feature documentation"
```

---

## Phase 6: 最終檢查與合併

### Task 12: 程式碼檢查

**Step 1: TypeScript 型別檢查**

```bash
npx tsc --noEmit
```

預期：無錯誤

**Step 2: Linting**

```bash
npm run lint
```

預期：無錯誤或警告（或只有合理的警告）

**Step 3: 格式化**

```bash
npx prettier --write "components/audio/**" "app/api/summaries/**/audio/**" "lib/audio/**"
```

**Step 4: Commit**

如有修改：

```bash
git add .
git commit -m "style: format code with prettier"
```

---

### Task 13: 建立 Pull Request

**Step 1: 推送分支**

```bash
git push -u origin feature/audio-playback
```

**Step 2: 檢視變更**

```bash
git log main..HEAD --oneline
```

確認所有 commit 都合理。

**Step 3: 建立 PR（手動）**

1. 前往 GitHub 
2. 建立 Pull Request
3. 標題：`feat: 新增語音播報功能`
4. 內容：

```markdown
## 功能

新增語音播報功能，使用者可在摘要詳細頁面播放 AI 語音版摘要。

## 變更

- ✅ 資料庫新增 `audioUrl` 和 `audioGeneratedAt` 欄位
- ✅ 整合 Google Cloud TTS 和 GCS
- ✅ 實作音訊生成 API 端點
- ✅ 建立現代化播放器 UI（支援倍速、進度條、音量）
- ✅ 首次生成快取機制

## 測試

- [x] 手動測試生成流程
- [x] 測試快取機制
- [x] 測試錯誤處理
- [x] 檢查資料庫更新
- [x] TypeScript 型別檢查通過
- [x] Linting 通過

## 截圖

（可選：加入播放器截圖）

## 相關文件

- 設計文件：`docs/plans/2026-01-21-audio-playback-design.md`
- 功能文件：`docs/features/audio-playback.md`
```

---

## 完成檢查清單

執行完所有任務後，確認以下項目：

- [ ] Prisma schema 已更新並執行 migration
- [ ] Google Cloud 套件已安裝
- [ ] 環境變數已設定（`.env.local` 和 `.env.example`）
- [ ] TTS 和 GCS 工具函式已建立
- [ ] API 端點已實作並測試
- [ ] AudioPlayer 組件已建立
- [ ] 播放器已整合到摘要頁面
- [ ] 手動測試完整流程通過
- [ ] 資料庫更新正常
- [ ] UI 優化完成
- [ ] 文件已更新
- [ ] 程式碼檢查通過
- [ ] Pull Request 已建立

---

## 注意事項

1. **Google Cloud 設定**: 在開始實作前，務必完成 Google Cloud 的設定（Task 8 Step 1）
2. **環境變數**: 確保 `service-account-key.json` 不被 commit 到 git
3. **測試**: 每個 Task 完成後都要測試，不要累積問題
4. **Commit 頻率**: 每個 Task 至少一個 commit，保持小步提交
5. **錯誤處理**: 遇到問題先查看 console log，Google Cloud 錯誤通常有明確的訊息

---

**計畫建立日期**: 2026-01-21  
**預估完成時間**: 2-3 小時（不含 Google Cloud 手動設定時間）
