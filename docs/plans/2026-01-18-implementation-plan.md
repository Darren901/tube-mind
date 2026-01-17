# YouTube 影片摘要 SaaS 實作計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立一個 YouTube 影片自動摘要 SaaS，使用者可追蹤頻道、勾選影片、自動生成繁中摘要

**Architecture:** Next.js 14 App Router 全端應用，使用 NextAuth.js OAuth、Prisma + PostgreSQL、BullMQ + Redis、Gemini 2.5 Flash AI，部署於 GCP Cloud Run

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL (Neon), Redis (Upstash), BullMQ, NextAuth.js, Gemini 2.5 Flash, Tailwind CSS, GCP Cloud Run

---

## Phase 1: 專案初始化與基礎設定

### Task 1.1: 建立 Next.js 專案

**Files:**
- Create: `youtube-summarizer/` (專案根目錄)
- Create: `youtube-summarizer/package.json`
- Create: `youtube-summarizer/tsconfig.json`
- Create: `youtube-summarizer/.env.local`
- Create: `youtube-summarizer/.gitignore`

**Step 1: 初始化 Next.js 專案**

```bash
cd /Users/darren/project/youtube-summarizer
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Expected output: 
```
✔ Would you like to use ESLint? ... Yes
✔ Would you like to use Turbopack? ... No
✔ Creating a new Next.js app...
```

**Step 2: 安裝核心依賴套件**

```bash
npm install next-auth@beta @auth/prisma-adapter
npm install @prisma/client prisma
npm install bullmq ioredis
npm install @google/generative-ai googleapis youtube-transcript
npm install zod react-hook-form @hookform/resolvers
npm install -D @types/node
```

Expected: 依賴套件安裝成功

**Step 3: 建立環境變數檔案**

Create: `.env.local`

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://placeholder:placeholder@placeholder.neon.tech/placeholder?sslmode=require"

# Redis (Upstash)
REDIS_URL="rediss://placeholder:placeholder@placeholder.upstash.io:6379"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-development-secret-change-in-production"

# Google OAuth
GOOGLE_CLIENT_ID="placeholder.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="placeholder"

# Google AI (Gemini)
GOOGLE_AI_API_KEY="placeholder"

# Cron Secret
CRON_SECRET="your-cron-secret"
```

**Step 4: 更新 .gitignore**

Add to `.gitignore`:

```
# 環境變數
.env
.env.local
.env*.local

# 資料庫
prisma/dev.db
prisma/migrations

# IDE
.vscode/
.idea/
```

**Step 5: 提交初始設定**

```bash
git add .
git commit -m "chore: initialize Next.js project with TypeScript and dependencies"
```

---

### Task 1.2: 設定 Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`

**Step 1: 初始化 Prisma**

```bash
npx prisma init
```

Expected: Creates `prisma/schema.prisma`

**Step 2: 撰寫完整的 Prisma Schema**

Edit: `prisma/schema.prisma`

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// NextAuth.js 必要的表
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// 使用者
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  
  accounts      Account[]
  sessions      Session[]
  channels      Channel[]
  summaries     Summary[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// 追蹤的頻道
model Channel {
  id              String    @id @default(cuid())
  youtubeId       String    // YouTube 頻道 ID
  title           String
  description     String?   @db.Text
  thumbnail       String?
  
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  videos          Video[]
  lastCheckedAt   DateTime? // 最後一次檢查新影片的時間
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([userId, youtubeId]) // 同一使用者不能重複新增同頻道
  @@index([userId])
}

// 影片
model Video {
  id              String    @id @default(cuid())
  youtubeId       String    @unique // YouTube 影片 ID
  title           String
  description     String?   @db.Text
  thumbnail       String?
  duration        Int       @default(0) // 影片長度（秒）
  publishedAt     DateTime  // 影片發布時間
  
  channelId       String
  channel         Channel   @relation(fields: [channelId], references: [id], onDelete: Cascade)
  
  summaries       Summary[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([channelId])
  @@index([publishedAt])
}

// 摘要
model Summary {
  id              String    @id @default(cuid())
  
  videoId         String
  video           Video     @relation(fields: [videoId], references: [id], onDelete: Cascade)
  
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // 摘要內容 (JSON 格式)
  content         Json      @default("{}")
  
  // 處理狀態
  status          String    @default("pending") // pending | processing | completed | failed
  errorMessage    String?   @db.Text
  
  // Queue Job ID
  jobId           String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  completedAt     DateTime? // 完成時間
  
  @@unique([userId, videoId]) // 同一使用者對同影片只能有一個摘要
  @@index([userId])
  @@index([status])
}
```

**Step 3: 建立 Prisma Client 輔助函數**

Create: `lib/db.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 4: 生成 Prisma Client**

```bash
npx prisma generate
```

Expected: Prisma Client generated successfully

**Step 5: 提交 Prisma 設定**

```bash
git add prisma/ lib/db.ts
git commit -m "feat: setup Prisma schema with User, Channel, Video, Summary models"
```

---

### Task 1.3: 設定 NextAuth.js

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `lib/auth.ts`

**Step 1: 建立 NextAuth 配置**

Create: `lib/auth.ts`

```typescript
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import type { Adapter } from "next-auth/adapters"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube.force-ssl',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0
      }

      // Token 還沒過期
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // Token 過期，刷新它
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.error = token.error as string | undefined
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}

async function refreshAccessToken(token: any) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}
```

**Step 2: 建立 NextAuth API Route**

Create: `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

**Step 3: 擴展 NextAuth 型別定義**

Create: `types/next-auth.d.ts`

```typescript
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    error?: string
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
  }
}
```

**Step 4: 提交 NextAuth 設定**

```bash
git add app/api/auth/ lib/auth.ts types/
git commit -m "feat: setup NextAuth.js with Google OAuth and token refresh"
```

---

## Phase 2: YouTube API 整合

### Task 2.1: YouTube Client 封裝

**Files:**
- Create: `lib/youtube/client.ts`
- Create: `lib/youtube/types.ts`

**Step 1: 定義 YouTube 相關型別**

Create: `lib/youtube/types.ts`

```typescript
export interface YouTubeChannel {
  id: string
  title: string
  description?: string
  thumbnail?: string
}

export interface YouTubeVideo {
  id: string
  title: string
  description?: string
  thumbnail?: string
  publishedAt: Date
  duration: number
}

export interface TranscriptSegment {
  timestamp: number
  text: string
}
```

**Step 2: 建立 YouTube Client 類別**

Create: `lib/youtube/client.ts`

```typescript
import { google } from 'googleapis'
import { YoutubeTranscript } from 'youtube-transcript'
import type { YouTubeChannel, YouTubeVideo, TranscriptSegment } from './types'

export class YouTubeClient {
  private youtube

  constructor(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    this.youtube = google.youtube({ version: 'v3', auth: oauth2Client })
  }

  async getSubscriptions(): Promise<YouTubeChannel[]> {
    const response = await this.youtube.subscriptions.list({
      part: ['snippet'],
      mine: true,
      maxResults: 50,
    })

    return (response.data.items || []).map(item => ({
      id: item.snippet?.resourceId?.channelId || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description,
      thumbnail: item.snippet?.thumbnails?.high?.url,
    }))
  }

  async getChannelVideos(channelId: string, maxResults = 50): Promise<YouTubeVideo[]> {
    const response = await this.youtube.search.list({
      part: ['snippet'],
      channelId,
      type: ['video'],
      order: 'date',
      maxResults,
    })

    const videoIds = (response.data.items || [])
      .map(item => item.id?.videoId)
      .filter(Boolean) as string[]

    if (videoIds.length === 0) return []

    // 取得影片詳細資訊（包含時長）
    const detailsResponse = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds,
    })

    return (detailsResponse.data.items || []).map(item => ({
      id: item.id!,
      title: item.snippet?.title || '',
      description: item.snippet?.description,
      thumbnail: item.snippet?.thumbnails?.high?.url,
      publishedAt: new Date(item.snippet?.publishedAt!),
      duration: this.parseDuration(item.contentDetails?.duration || 'PT0S'),
    }))
  }

  private parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0

    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')

    return hours * 3600 + minutes * 60 + seconds
  }
}

export async function getVideoTranscript(videoId: string): Promise<TranscriptSegment[]> {
  try {
    // 優先取英文字幕
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en',
    })
    return transcript.map(item => ({
      timestamp: item.offset,
      text: item.text,
    }))
  } catch {
    // 沒有英文字幕，取自動生成字幕
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
    return transcript.map(item => ({
      timestamp: item.offset,
      text: item.text,
    }))
  }
}
```

**Step 3: 提交 YouTube Client**

```bash
git add lib/youtube/
git commit -m "feat: implement YouTube API client with channel and video fetching"
```

---

## Phase 3: Redis Queue 設定 (BullMQ)

### Task 3.1: 設定 BullMQ Queue

**Files:**
- Create: `lib/queue/connection.ts`
- Create: `lib/queue/summaryQueue.ts`
- Create: `lib/queue/types.ts`

**Step 1: 建立 Redis 連接**

Create: `lib/queue/connection.ts`

```typescript
import Redis from 'ioredis'

export const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})
```

**Step 2: 定義 Queue 資料型別**

Create: `lib/queue/types.ts`

```typescript
export interface SummaryJobData {
  summaryId: string
  videoId: string
  youtubeVideoId: string
  userId: string
}
```

**Step 3: 建立 Summary Queue**

Create: `lib/queue/summaryQueue.ts`

```typescript
import { Queue } from 'bullmq'
import { redisConnection } from './connection'
import type { SummaryJobData } from './types'

export const summaryQueue = new Queue<SummaryJobData>('video-summary', {
  connection: redisConnection,
})

export async function addSummaryJob(data: SummaryJobData) {
  return await summaryQueue.add('process-summary', data, {
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

**Step 4: 提交 Queue 設定**

```bash
git add lib/queue/
git commit -m "feat: setup BullMQ queue for summary processing"
```

---

### Task 3.2: 建立 Worker

**Files:**
- Create: `lib/workers/summaryWorker.ts`
- Create: `scripts/worker.ts`

**Step 1: 建立 Summary Worker**

Create: `lib/workers/summaryWorker.ts`

```typescript
import { Worker } from 'bullmq'
import { redisConnection } from '@/lib/queue/connection'
import { prisma } from '@/lib/db'
import { getVideoTranscript } from '@/lib/youtube/client'
import type { SummaryJobData } from '@/lib/queue/types'

export const summaryWorker = new Worker<SummaryJobData>(
  'video-summary',
  async (job) => {
    const { summaryId, youtubeVideoId } = job.data

    console.log(`[Worker] Processing summary ${summaryId}`)

    // 1. 更新狀態為 processing
    await prisma.summary.update({
      where: { id: summaryId },
      data: {
        status: 'processing',
        jobId: job.id,
      },
    })

    // 2. 取得影片資訊
    const summary = await prisma.summary.findUnique({
      where: { id: summaryId },
      include: { video: true },
    })

    if (!summary) {
      throw new Error(`Summary ${summaryId} not found`)
    }

    // 3. 取得字幕
    const transcript = await getVideoTranscript(youtubeVideoId)

    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript available for this video')
    }

    // 4. 生成摘要 (後續實作)
    // const summaryContent = await generateSummary(transcript, summary.video.title)

    // 5. 暫時用假資料
    const summaryContent = {
      topic: summary.video.title,
      keyPoints: ['測試重點 1', '測試重點 2'],
      sections: [
        {
          timestamp: '00:00',
          title: '開頭',
          summary: '這是測試摘要',
        },
      ],
    }

    // 6. 儲存結果
    await prisma.summary.update({
      where: { id: summaryId },
      data: {
        status: 'completed',
        content: summaryContent,
        completedAt: new Date(),
      },
    })

    console.log(`[Worker] ✅ Summary ${summaryId} completed`)

    return { success: true }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
)

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
  }
})

summaryWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Job ${job.id} completed`)
})
```

**Step 2: 建立 Worker 啟動腳本**

Create: `scripts/worker.ts`

```typescript
import { summaryWorker } from '@/lib/workers/summaryWorker'

console.log('🚀 Worker started')

process.on('SIGTERM', async () => {
  console.log('Shutting down worker...')
  await summaryWorker.close()
  process.exit(0)
})
```

**Step 3: 新增 Worker 啟動指令到 package.json**

Edit: `package.json`

Add to `scripts`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "worker": "tsx scripts/worker.ts"
  }
}
```

**Step 4: 安裝 tsx（TypeScript 執行器）**

```bash
npm install -D tsx
```

**Step 5: 測試 Worker 啟動**

```bash
npm run worker
```

Expected: Worker started successfully

**Step 6: 提交 Worker**

```bash
git add lib/workers/ scripts/ package.json
git commit -m "feat: implement BullMQ worker for summary processing"
```

---

## Phase 4: Gemini AI 整合

### Task 4.1: Gemini Summarizer

**Files:**
- Create: `lib/ai/summarizer.ts`
- Create: `lib/ai/types.ts`

**Step 1: 定義摘要型別**

Create: `lib/ai/types.ts`

```typescript
export interface SummaryResult {
  topic: string
  keyPoints: string[]
  sections: {
    timestamp: string
    title: string
    summary: string
  }[]
}
```

**Step 2: 建立 Gemini Summarizer**

Create: `lib/ai/summarizer.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { TranscriptSegment } from '@/lib/youtube/types'
import type { SummaryResult } from './types'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export async function generateVideoSummary(
  transcript: TranscriptSegment[],
  videoTitle: string
): Promise<SummaryResult> {
  const transcriptText = transcript
    .map(seg => `[${formatTimestamp(seg.timestamp)}] ${seg.text}`)
    .join('\n')

  const prompt = `
你是一位專業的學習助理。請分析以下 YouTube 影片的英文字幕，並產生繁體中文摘要。

影片標題：${videoTitle}

字幕內容：
${transcriptText}

請以 JSON 格式輸出，包含以下結構：
{
  "topic": "影片的主要主題（一句話）",
  "keyPoints": ["核心觀點1", "核心觀點2", "核心觀點3"],
  "sections": [
    {
      "timestamp": "00:00",
      "title": "章節標題",
      "summary": "這個章節的詳細摘要（3-5 句話）"
    }
  ]
}

要求：
1. 所有內容必須是繁體中文
2. keyPoints 抓出 3-5 個最重要的觀點
3. sections 按時間順序分段，每 2-5 分鐘一個段落
4. 摘要要具體，不要太籠統
5. 保留重要的專有名詞（可附上英文）
6. 只輸出 JSON，不要其他說明文字
`

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  })

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  const summary = JSON.parse(text)
  return summary
}

export async function generateSummaryWithRetry(
  transcript: TranscriptSegment[],
  videoTitle: string,
  maxRetries = 2
): Promise<SummaryResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateVideoSummary(transcript, videoTitle)
    } catch (error: any) {
      if (error.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)))
        continue
      }
      if (error.status === 500 || error.status === 503) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}
```

**Step 3: 整合 Gemini 到 Worker**

Edit: `lib/workers/summaryWorker.ts`

Replace the fake summary generation with:

```typescript
// Import at top
import { generateSummaryWithRetry } from '@/lib/ai/summarizer'

// Replace step 4 with:
// 4. 生成摘要
const summaryContent = await generateSummaryWithRetry(transcript, summary.video.title)
```

**Step 4: 提交 Gemini 整合**

```bash
git add lib/ai/ lib/workers/summaryWorker.ts
git commit -m "feat: integrate Gemini 2.5 Flash for AI-powered video summarization"
```

---

## Phase 5: API Routes

### Task 5.1: Channels API

**Files:**
- Create: `app/api/channels/route.ts`
- Create: `app/api/channels/[id]/route.ts`
- Create: `app/api/channels/[id]/refresh/route.ts`

**Step 1: 建立頻道列表 API**

Create: `app/api/channels/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { YouTubeClient } from '@/lib/youtube/client'

// GET /api/channels - 取得使用者的頻道列表
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const channels = await prisma.channel.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: { videos: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(channels)
}

// POST /api/channels - 新增頻道
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { youtubeId } = await request.json()

  if (!youtubeId) {
    return NextResponse.json({ error: 'youtubeId is required' }, { status: 400 })
  }

  // 檢查是否已存在
  const existing = await prisma.channel.findUnique({
    where: {
      userId_youtubeId: {
        userId: session.user.id,
        youtubeId,
      },
    },
  })

  if (existing) {
    return NextResponse.json({ error: 'Channel already exists' }, { status: 400 })
  }

  // 從 YouTube API 取得頻道資訊
  const youtube = new YouTubeClient(session.accessToken!)

  try {
    const videos = await youtube.getChannelVideos(youtubeId, 1)
    
    if (videos.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // 建立頻道
    const channel = await prisma.channel.create({
      data: {
        youtubeId,
        title: 'YouTube Channel', // 後續可從 API 取得
        userId: session.user.id,
      },
    })

    return NextResponse.json(channel, { status: 201 })
  } catch (error) {
    console.error('Error creating channel:', error)
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
  }
}
```

**Step 2: 建立頻道詳情 API**

Create: `app/api/channels/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const channel = await prisma.channel.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      videos: {
        orderBy: { publishedAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  return NextResponse.json(channel)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const channel = await prisma.channel.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  })

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  await prisma.channel.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
```

**Step 3: 建立手動刷新頻道 API**

Create: `app/api/channels/[id]/refresh/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { YouTubeClient } from '@/lib/youtube/client'
import { addSummaryJob } from '@/lib/queue/summaryQueue'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const channel = await prisma.channel.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  })

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  const youtube = new YouTubeClient(session.accessToken!)
  const videos = await youtube.getChannelVideos(channel.youtubeId, 10)

  let newCount = 0

  for (const video of videos) {
    const existing = await prisma.video.findUnique({
      where: { youtubeId: video.id },
    })

    if (!existing) {
      const newVideo = await prisma.video.create({
        data: {
          youtubeId: video.id,
          title: video.title,
          description: video.description,
          thumbnail: video.thumbnail,
          duration: video.duration,
          publishedAt: video.publishedAt,
          channelId: channel.id,
        },
      })

      // 自動建立摘要任務
      const summary = await prisma.summary.create({
        data: {
          videoId: newVideo.id,
          userId: session.user.id,
          status: 'pending',
        },
      })

      await addSummaryJob({
        summaryId: summary.id,
        videoId: newVideo.id,
        youtubeVideoId: video.id,
        userId: session.user.id,
      })

      newCount++
    }
  }

  await prisma.channel.update({
    where: { id: channel.id },
    data: { lastCheckedAt: new Date() },
  })

  return NextResponse.json({ newVideos: newCount })
}
```

**Step 4: 提交 Channels API**

```bash
git add app/api/channels/
git commit -m "feat: implement channels API (list, create, delete, refresh)"
```

---

### Task 5.2: Videos & Summaries API

**Files:**
- Create: `app/api/videos/[id]/route.ts`
- Create: `app/api/summaries/route.ts`
- Create: `app/api/summaries/[id]/route.ts`

**Step 1: 建立影片詳情 API**

Create: `app/api/videos/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const video = await prisma.video.findUnique({
    where: { id: params.id },
    include: {
      channel: true,
      summaries: {
        where: { userId: session.user.id },
      },
    },
  })

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  return NextResponse.json(video)
}
```

**Step 2: 建立摘要列表 & 建立 API**

Create: `app/api/summaries/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addSummaryJob } from '@/lib/queue/summaryQueue'

// GET /api/summaries - 取得使用者的摘要列表
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summaries = await prisma.summary.findMany({
    where: { userId: session.user.id },
    include: {
      video: {
        include: {
          channel: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(summaries)
}

// POST /api/summaries - 建立新摘要
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { videoId } = await request.json()

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
  })

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  // 檢查是否已存在
  const existing = await prisma.summary.findUnique({
    where: {
      userId_videoId: {
        userId: session.user.id,
        videoId,
      },
    },
  })

  if (existing) {
    return NextResponse.json({ error: 'Summary already exists' }, { status: 400 })
  }

  const summary = await prisma.summary.create({
    data: {
      videoId,
      userId: session.user.id,
      status: 'pending',
    },
  })

  await addSummaryJob({
    summaryId: summary.id,
    videoId,
    youtubeVideoId: video.youtubeId,
    userId: session.user.id,
  })

  return NextResponse.json(summary, { status: 201 })
}
```

**Step 3: 建立摘要詳情 API**

Create: `app/api/summaries/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
      video: {
        include: {
          channel: true,
        },
      },
    },
  })

  if (!summary) {
    return NextResponse.json({ error: 'Summary not found' }, { status: 404 })
  }

  return NextResponse.json(summary)
}
```

**Step 4: 提交 Videos & Summaries API**

```bash
git add app/api/videos/ app/api/summaries/
git commit -m "feat: implement videos and summaries API endpoints"
```

---

### Task 5.3: Cron Job API

**Files:**
- Create: `app/api/cron/check-new-videos/route.ts`

**Step 1: 建立定時檢查新影片 API**

Create: `app/api/cron/check-new-videos/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { YouTubeClient } from '@/lib/youtube/client'
import { addSummaryJob } from '@/lib/queue/summaryQueue'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const channels = await prisma.channel.findMany({
      include: { user: true },
    })

    let newVideosCount = 0

    for (const channel of channels) {
      // 取得使用者的 access token（從 Account 表）
      const account = await prisma.account.findFirst({
        where: {
          userId: channel.userId,
          provider: 'google',
        },
      })

      if (!account?.access_token) continue

      const youtube = new YouTubeClient(account.access_token)
      const videos = await youtube.getChannelVideos(channel.youtubeId, 5)

      for (const video of videos) {
        const existing = await prisma.video.findUnique({
          where: { youtubeId: video.id },
        })

        if (!existing) {
          const newVideo = await prisma.video.create({
            data: {
              youtubeId: video.id,
              title: video.title,
              description: video.description,
              thumbnail: video.thumbnail,
              duration: video.duration,
              publishedAt: video.publishedAt,
              channelId: channel.id,
            },
          })

          const summary = await prisma.summary.create({
            data: {
              videoId: newVideo.id,
              userId: channel.userId,
              status: 'pending',
            },
          })

          await addSummaryJob({
            summaryId: summary.id,
            videoId: newVideo.id,
            youtubeVideoId: video.id,
            userId: channel.userId,
          })

          newVideosCount++
        }
      }

      await prisma.channel.update({
        where: { id: channel.id },
        data: { lastCheckedAt: new Date() },
      })
    }

    return NextResponse.json({
      success: true,
      newVideos: newVideosCount,
      channelsChecked: channels.length,
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**Step 2: 提交 Cron Job API**

```bash
git add app/api/cron/
git commit -m "feat: implement cron job for checking new videos daily"
```

---

## Phase 6: 前端 UI

**注意：這個階段將使用 @superpowers:ui-ux-pro-max skill 來實作黑底 + 紫黃漸層的現代化設計**

### Task 6.1: 登入頁面

**Files:**
- Create: `app/auth/signin/page.tsx`

**Step 1: 建立登入頁面**

Create: `app/auth/signin/page.tsx`

```typescript
'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-gradient-to-br from-purple-900/20 to-yellow-900/20 rounded-lg border border-purple-500/30">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
          YouTube 摘要助手
        </h1>
        <p className="text-gray-400 text-center mb-8">
          自動追蹤頻道，AI 生成繁中摘要
        </p>
        
        <button
          onClick={() => signIn('google', { callbackUrl })}
          className="w-full bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-500 hover:to-yellow-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
        >
          使用 Google 登入
        </button>
      </div>
    </div>
  )
}
```

**Step 2: 提交登入頁面**

```bash
git add app/auth/
git commit -m "feat: create signin page with gradient design"
```

---

### Task 6.2: 主 Layout 與導航列

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `components/Navbar.tsx`

**Step 1: 建立 Navbar 元件**

Create: `components/Navbar.tsx`

```typescript
'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="bg-black border-b border-purple-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
            YouTube 摘要
          </Link>
          
          <div className="flex gap-6 items-center">
            <Link href="/" className="text-gray-300 hover:text-white transition">
              首頁
            </Link>
            <Link href="/channels" className="text-gray-300 hover:text-white transition">
              頻道
            </Link>
            <Link href="/summaries" className="text-gray-300 hover:text-white transition">
              摘要
            </Link>
            
            {session?.user && (
              <button
                onClick={() => signOut()}
                className="text-gray-300 hover:text-white transition"
              >
                登出
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
```

**Step 2: 建立 Dashboard Layout**

Create: `app/(dashboard)/layout.tsx`

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
```

**Step 3: 建立首頁**

Create: `app/(dashboard)/page.tsx`

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  const summaries = await prisma.summary.findMany({
    where: { userId: session!.user.id },
    include: {
      video: {
        include: {
          channel: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
        最近摘要
      </h1>

      {summaries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-4">還沒有任何摘要</p>
          <Link
            href="/channels"
            className="inline-block bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-500 hover:to-yellow-500 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            新增頻道
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {summaries.map((summary) => (
            <Link
              key={summary.id}
              href={`/summaries/${summary.id}`}
              className="p-6 bg-gradient-to-br from-purple-900/20 to-yellow-900/20 border border-purple-500/30 rounded-lg hover:border-purple-500/50 transition"
            >
              <h3 className="text-xl font-semibold text-white mb-2">
                {summary.video.title}
              </h3>
              <p className="text-gray-400 text-sm mb-2">
                {summary.video.channel.title}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    summary.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : summary.status === 'processing'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : summary.status === 'failed'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {summary.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: 更新根 layout**

Edit: `app/layout.tsx`

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YouTube 影片摘要',
  description: 'AI 自動生成 YouTube 影片繁中摘要',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**Step 5: 建立 Providers 元件**

Create: `components/Providers.tsx`

```typescript
'use client'

import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

**Step 6: 提交前端基礎**

```bash
git add app/(dashboard)/ app/layout.tsx components/
git commit -m "feat: create dashboard layout, navbar, and home page"
```

---

### Task 6.3: 頻道頁面

**Files:**
- Create: `app/(dashboard)/channels/page.tsx`
- Create: `app/(dashboard)/channels/[id]/page.tsx`
- Create: `components/ChannelCard.tsx`

**Step 1: 建立頻道卡片元件**

Create: `components/ChannelCard.tsx`

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ChannelCardProps {
  channel: {
    id: string
    title: string
    thumbnail: string | null
    _count: {
      videos: number
    }
  }
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetch(`/api/channels/${channel.id}/refresh`, { method: 'POST' })
      window.location.reload()
    } catch (error) {
      console.error('Failed to refresh:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-purple-900/20 to-yellow-900/20 border border-purple-500/30 rounded-lg">
      <h3 className="text-xl font-semibold text-white mb-2">{channel.title}</h3>
      <p className="text-gray-400 text-sm mb-4">
        {channel._count.videos} 部影片
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-500 hover:to-yellow-500 disabled:opacity-50 text-white text-sm font-semibold py-2 px-4 rounded transition"
        >
          {isRefreshing ? '更新中...' : '立即更新'}
        </button>
        <Link
          href={`/channels/${channel.id}`}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-4 rounded transition"
        >
          查看影片
        </Link>
      </div>
    </div>
  )
}
```

**Step 2: 建立頻道列表頁面**

Create: `app/(dashboard)/channels/page.tsx`

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ChannelCard } from '@/components/ChannelCard'
import Link from 'next/link'

export default async function ChannelsPage() {
  const session = await getServerSession(authOptions)

  const channels = await prisma.channel.findMany({
    where: { userId: session!.user.id },
    include: {
      _count: {
        select: { videos: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
          我的頻道
        </h1>
        <Link
          href="/channels/new"
          className="bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-500 hover:to-yellow-500 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          新增頻道
        </Link>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>還沒有追蹤任何頻道</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: 建立頻道詳情頁面**

Create: `app/(dashboard)/channels/[id]/page.tsx`

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ChannelDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)

  const channel = await prisma.channel.findFirst({
    where: {
      id: params.id,
      userId: session!.user.id,
    },
    include: {
      videos: {
        orderBy: { publishedAt: 'desc' },
        include: {
          summaries: {
            where: { userId: session!.user.id },
          },
        },
      },
    },
  })

  if (!channel) {
    notFound()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
        {channel.title}
      </h1>

      <div className="grid gap-4">
        {channel.videos.map((video) => {
          const summary = video.summaries[0]

          return (
            <div
              key={video.id}
              className="p-6 bg-gradient-to-br from-purple-900/20 to-yellow-900/20 border border-purple-500/30 rounded-lg"
            >
              <h3 className="text-lg font-semibold text-white mb-2">
                {video.title}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {new Date(video.publishedAt).toLocaleDateString('zh-TW')}
              </p>

              {summary ? (
                <Link
                  href={`/summaries/${summary.id}`}
                  className="inline-block bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-500 hover:to-yellow-500 text-white text-sm font-semibold py-2 px-4 rounded transition"
                >
                  查看摘要
                </Link>
              ) : (
                <form action={`/api/summaries`} method="POST">
                  <input type="hidden" name="videoId" value={video.id} />
                  <button
                    type="submit"
                    className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-4 rounded transition"
                  >
                    建立摘要
                  </button>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 4: 提交頻道頁面**

```bash
git add app/(dashboard)/channels/ components/ChannelCard.tsx
git commit -m "feat: create channels list and detail pages"
```

---

### Task 6.4: 摘要顯示頁面

**Files:**
- Create: `app/(dashboard)/summaries/page.tsx`
- Create: `app/(dashboard)/summaries/[id]/page.tsx`

**Step 1: 建立摘要列表頁面**

Create: `app/(dashboard)/summaries/page.tsx`

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function SummariesPage() {
  const session = await getServerSession(authOptions)

  const summaries = await prisma.summary.findMany({
    where: { userId: session!.user.id },
    include: {
      video: {
        include: {
          channel: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
        所有摘要
      </h1>

      <div className="grid gap-4">
        {summaries.map((summary) => (
          <Link
            key={summary.id}
            href={`/summaries/${summary.id}`}
            className="p-6 bg-gradient-to-br from-purple-900/20 to-yellow-900/20 border border-purple-500/30 rounded-lg hover:border-purple-500/50 transition"
          >
            <h3 className="text-xl font-semibold text-white mb-2">
              {summary.video.title}
            </h3>
            <p className="text-gray-400 text-sm mb-2">
              {summary.video.channel.title}
            </p>
            <span
              className={`text-xs px-2 py-1 rounded ${
                summary.status === 'completed'
                  ? 'bg-green-500/20 text-green-400'
                  : summary.status === 'processing'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : summary.status === 'failed'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {summary.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: 建立摘要詳情頁面**

Create: `app/(dashboard)/summaries/[id]/page.tsx`

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'

interface SummaryContent {
  topic: string
  keyPoints: string[]
  sections: {
    timestamp: string
    title: string
    summary: string
  }[]
}

function timestampToSeconds(timestamp: string): number {
  const [mins, secs] = timestamp.split(':').map(Number)
  return mins * 60 + secs
}

export default async function SummaryDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)

  const summary = await prisma.summary.findFirst({
    where: {
      id: params.id,
      userId: session!.user.id,
    },
    include: {
      video: {
        include: {
          channel: true,
        },
      },
    },
  })

  if (!summary) {
    notFound()
  }

  if (summary.status !== 'completed') {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-white mb-4">
          {summary.status === 'processing' ? '處理中...' : '尚未完成'}
        </h1>
        <p className="text-gray-400">請稍後再回來查看</p>
      </div>
    )
  }

  const content = summary.content as SummaryContent

  return (
    <div className="max-w-4xl mx-auto">
      {/* 影片標題 */}
      <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
        {summary.video.title}
      </h1>
      <p className="text-gray-400 mb-8">{summary.video.channel.title}</p>

      {/* 主題 */}
      <div className="mb-8 p-6 bg-gradient-to-br from-purple-900/30 to-yellow-900/30 border border-purple-500/30 rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-4">主題</h2>
        <p className="text-gray-300">{content.topic}</p>
      </div>

      {/* 核心觀點 */}
      <div className="mb-8 p-6 bg-gradient-to-br from-purple-900/20 to-yellow-900/20 border border-purple-500/30 rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-4">核心觀點</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          {content.keyPoints.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </div>

      {/* 詳細摘要 */}
      <h2 className="text-2xl font-bold text-white mb-6">詳細摘要</h2>
      <div className="space-y-6">
        {content.sections.map((section, i) => (
          <div
            key={i}
            className="border-l-4 border-purple-500 pl-6 py-2"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-gray-700 px-3 py-1 rounded text-sm font-mono text-gray-300">
                {section.timestamp}
              </span>
              <h3 className="font-bold text-white">{section.title}</h3>
              <a
                href={`https://youtube.com/watch?v=${summary.video.youtubeId}&t=${timestampToSeconds(section.timestamp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 text-sm hover:text-purple-300 transition"
              >
                跳轉觀看 →
              </a>
            </div>
            <p className="text-gray-300">{section.summary}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 3: 提交摘要頁面**

```bash
git add app/(dashboard)/summaries/
git commit -m "feat: create summaries list and detail pages with gradient design"
```

---

## Phase 7: 部署設定

### Task 7.1: Dockerfile

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docker-compose.yml` (for local testing)

**Step 1: 建立 Dockerfile**

Create: `Dockerfile`

```dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

**Step 2: 建立 .dockerignore**

Create: `.dockerignore`

```
node_modules
.next
.git
.env*.local
*.log
```

**Step 3: 更新 next.config.js 支援 standalone**

Create/Edit: `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

module.exports = nextConfig
```

**Step 4: 建立 docker-compose (本機測試用)**

Create: `docker-compose.yml`

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    depends_on:
      - redis
  
  worker:
    build: .
    command: npm run worker
    env_file:
      - .env.local
    depends_on:
      - redis
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**Step 5: 提交 Docker 設定**

```bash
git add Dockerfile .dockerignore docker-compose.yml next.config.js
git commit -m "feat: add Dockerfile and docker-compose for deployment"
```

---

### Task 7.2: GCP 部署腳本

**Files:**
- Create: `deploy.sh`
- Create: `.gcloudignore`
- Create: `docs/deployment-guide.md`

**Step 1: 建立部署腳本**

Create: `deploy.sh`

```bash
#!/bin/bash

set -e

PROJECT_ID="your-gcp-project-id"
REGION="asia-east1"
IMAGE_NAME="youtube-summarizer"

echo "🔨 Building Docker image..."
docker build --platform linux/amd64 -t gcr.io/$PROJECT_ID/$IMAGE_NAME:latest .

echo "📤 Pushing to Google Container Registry..."
docker push gcr.io/$PROJECT_ID/$IMAGE_NAME:latest

echo "🚀 Deploying Web service to Cloud Run..."
gcloud run deploy $IMAGE_NAME-web \
  --image gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 3 \
  --memory 512Mi \
  --cpu 1 \
  --port 3000 \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,GOOGLE_AI_API_KEY=gemini-api-key:latest,NEXTAUTH_SECRET=nextauth-secret:latest,NEXTAUTH_URL=nextauth-url:latest

echo "🤖 Deploying Worker service to Cloud Run..."
gcloud run deploy $IMAGE_NAME-worker \
  --image gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
  --platform managed \
  --region $REGION \
  --no-allow-unauthenticated \
  --min-instances 1 \
  --max-instances 2 \
  --memory 1Gi \
  --cpu 1 \
  --command "npm" \
  --args "run,worker" \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,GOOGLE_AI_API_KEY=gemini-api-key:latest

echo "✅ Deployment complete!"
```

**Step 2: 建立 .gcloudignore**

Create: `.gcloudignore`

```
node_modules/
.next/
.git/
.env*.local
*.log
```

**Step 3: 建立部署指南**

Create: `docs/deployment-guide.md`

```markdown
# 部署指南

## 前置準備

### 1. 建立 Neon PostgreSQL 資料庫

1. 前往 https://neon.tech
2. 註冊並建立新專案
3. 複製連線字串

### 2. 建立 Upstash Redis

1. 前往 https://upstash.com
2. 建立 Global Redis 資料庫
3. 複製 TLS 連線字串

### 3. 設定 Google OAuth

1. 前往 https://console.cloud.google.com
2. 建立 OAuth 2.0 憑證
3. 設定授權重新導向 URI：`https://your-domain.run.app/api/auth/callback/google`
4. 複製 Client ID 和 Client Secret

### 4. 取得 Gemini API Key

1. 前往 https://ai.google.dev
2. 建立 API Key

## GCP 部署步驟

### 1. 設定 GCP Secrets

\`\`\`bash
# Database URL
echo -n "postgresql://user:pass@xxx.neon.tech/db?sslmode=require" | \
  gcloud secrets create database-url --data-file=-

# Redis URL
echo -n "rediss://default:xxx@xxx.upstash.io:6379" | \
  gcloud secrets create redis-url --data-file=-

# Google OAuth
echo -n "your-client-id" | \
  gcloud secrets create google-client-id --data-file=-
echo -n "your-client-secret" | \
  gcloud secrets create google-client-secret --data-file=-

# Gemini API Key
echo -n "your-gemini-key" | \
  gcloud secrets create gemini-api-key --data-file=-

# NextAuth Secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create nextauth-secret --data-file=-

# NextAuth URL
echo -n "https://your-app.run.app" | \
  gcloud secrets create nextauth-url --data-file=-

# Cron Secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create cron-secret --data-file=-
\`\`\`

### 2. 執行資料庫 Migration

\`\`\`bash
# 本機執行
DATABASE_URL="your-neon-url" npx prisma migrate deploy
\`\`\`

### 3. 部署應用

\`\`\`bash
chmod +x deploy.sh
./deploy.sh
\`\`\`

### 4. 設定 Cloud Scheduler

\`\`\`bash
gcloud scheduler jobs create http check-new-videos \
  --schedule="0 8 * * *" \
  --uri="https://your-app.run.app/api/cron/check-new-videos" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \
  --location=asia-east1
\`\`\`

## 驗證部署

1. 前往 Cloud Run 頁面確認服務運行
2. 開啟網站測試登入功能
3. 新增一個頻道測試功能
4. 檢查 Worker logs 確認摘要生成

## 監控

\`\`\`bash
# 查看 Web logs
gcloud run logs read youtube-summarizer-web --region asia-east1

# 查看 Worker logs
gcloud run logs read youtube-summarizer-worker --region asia-east1
\`\`\`
```

**Step 4: 提交部署設定**

```bash
chmod +x deploy.sh
git add deploy.sh .gcloudignore docs/deployment-guide.md
git commit -m "feat: add GCP deployment scripts and documentation"
```

---

## 總結

### 開發完成檢查清單

- [x] Phase 1: 專案初始化 ✅
  - [x] Next.js 專案設定
  - [x] Prisma Schema 定義
  - [x] NextAuth.js OAuth 設定

- [x] Phase 2: YouTube API 整合 ✅
  - [x] YouTube Client 封裝
  - [x] 字幕取得功能

- [ ] Phase 3: Redis Queue ✅
  - [ ] BullMQ Queue 設定
  - [ ] Worker 實作

- [ ] Phase 4: Gemini AI ✅
  - [ ] Gemini Summarizer
  - [ ] 整合到 Worker

- [ ] Phase 5: API Routes ✅
  - [ ] Channels API
  - [ ] Videos & Summaries API
  - [ ] Cron Job API

- [ ] Phase 6: 前端 UI ✅
  - [ ] 登入頁面
  - [ ] Dashboard Layout
  - [ ] 頻道頁面
  - [ ] 摘要頁面

- [ ] Phase 7: 部署 ✅
  - [ ] Dockerfile
  - [ ] GCP 部署腳本
  - [ ] 部署文件

### 測試步驟

1. **本機測試**
   ```bash
   # 啟動開發伺服器
   npm run dev
   
   # 另一個終端啟動 Worker
   npm run worker
   ```

2. **功能測試**
   - 登入功能
   - 新增頻道
   - 查看影片列表
   - 建立摘要
   - 查看摘要結果

3. **部署測試**
   ```bash
   # 建立 Docker image
   docker build -t youtube-summarizer .
   
   # 本機測試
   docker-compose up
   ```

### 後續優化

- [ ] WebSocket 即時更新（取代輪詢）
- [ ] 摘要品質評分功能
- [ ] 使用者自訂 AI prompt
- [ ] 支援多語言字幕
- [ ] 匯出摘要為 Markdown
- [ ] 行動版 APP (React Native)

---

**預估完成時間**: 6-8 週全職開發

**當前狀態**: Phase 1-2 已完成（2026-01-18）

**已完成**:
- ✅ Phase 1: 專案初始化（Task 1.1, 1.2, 1.3）
- ✅ Phase 2: YouTube API 整合（Task 2.1）

**下一步**: 在新 session 執行 Phase 3-7
