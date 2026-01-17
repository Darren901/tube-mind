# YouTube 影片摘要 SaaS 設計文件

**日期**: 2026-01-18  
**作者**: Darren  
**狀態**: 設計完成，待實作

---

## 專案概述

### 目標
打造一個 YouTube 影片自動摘要工具，幫助使用者追蹤國外 YouTuber 的最新影片，並自動生成繁體中文結構化摘要，解決語言障礙問題。

### 目標使用者
- 想學習國外知識但有語言障礙的學生/自學者
- 主要使用場景：自用 + 朋友使用（非商業化）

### 核心價值主張
- 自動追蹤喜愛的 YouTube 頻道
- AI 自動提取重點並翻譯成繁中摘要
- 結構化呈現（主題、核心觀點、分段摘要、時間戳）
- 完全免費使用（依賴免費額度）

---

## 功能需求

### 使用者故事

#### 1. 帳號連接與授權
- 使用者可以用 Google 帳號登入（OAuth）
- 授權後可存取 YouTube 訂閱列表和頻道資訊

#### 2. 頻道管理
- 使用者可以新增想追蹤的 YouTube 頻道
- 系統顯示頻道的影片列表（metadata only）
- 使用者從影片列表中勾選想要摘要的影片
- **重要**：新增頻道時不自動處理所有舊影片（成本控制）

#### 3. 影片摘要
- 使用者勾選影片後，系統建立摘要任務
- 背景 Worker 處理：取得字幕 → AI 生成摘要
- 摘要格式：
  - 影片主題（一句話）
  - 核心觀點（3-5 個 bullet points）
  - 詳細分段摘要（每 2-5 分鐘一段，包含時間戳和標題）
- 使用者可即時查看處理狀態（pending → processing → completed）

#### 4. 自動偵測新影片
- **定時檢查**：每天早上 8:00 自動檢查所有追蹤頻道的新影片
- **手動觸發**：使用者可點擊「立即更新」按鈕檢查某頻道
- 發現新影片後自動建立摘要任務

#### 5. 摘要瀏覽
- 使用者可瀏覽所有已完成的摘要
- 點擊時間戳可直接跳轉到 YouTube 對應位置
- 響應式設計（手機、平板、桌面都可用）

---

## 技術架構

### 技術棧選擇

| 層級 | 技術 | 理由 |
|-----|------|------|
| **前端框架** | Next.js 14 (App Router) + TypeScript | 全端框架、內建 API Routes、部署簡單 |
| **UI 風格** | 黑底 + 紫黃漸層 + 現代化設計 | 使用 ui-ux-pro-max skill 實作 |
| **認證** | NextAuth.js | 完整支援 Google OAuth + Token 管理 |
| **資料庫** | PostgreSQL (Neon 免費方案) | 500MB 免費、自動暫停省成本 |
| **快取/佇列** | Redis (Upstash 免費方案) | 10K commands/天免費、適合任務佇列 |
| **任務佇列** | BullMQ | 成熟的 Redis-based Queue 系統 |
| **ORM** | Prisma | Type-safe、自動 migration |
| **AI 模型** | Google Gemini 2.5 Flash | 免費額度大、繁中翻譯優秀 |
| **部署（主應用）** | GCP Cloud Run | 利用現有 NT$9000 額度 |
| **部署（資料庫）** | Neon | 免費 PostgreSQL |
| **部署（Redis）** | Upstash | 免費 Redis |
| **定時任務** | GCP Cloud Scheduler | 免費額度內 |

### 為什麼不用 Spring Boot？
- Spring Boot 記憶體消耗高（~500MB 啟動）
- 部署成本高於 Next.js (~100-200MB)
- Next.js 全端開發速度更快
- Node.js 生態系 LLM 整合更容易

---

## 系統架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                        使用者                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│               Next.js App (GCP Cloud Run)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  前端 (React + Tailwind)                              │   │
│  │  - 頻道管理頁面                                        │   │
│  │  - 影片列表頁面                                        │   │
│  │  - 摘要瀏覽頁面                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes                                           │   │
│  │  - /api/auth (NextAuth.js)                           │   │
│  │  - /api/channels (頻道 CRUD)                         │   │
│  │  - /api/videos (影片列表)                            │   │
│  │  - /api/summaries (摘要 CRUD)                        │   │
│  │  - /api/cron/check-new-videos (定時任務)            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  核心邏輯                                             │   │
│  │  - YouTubeClient (API 封裝)                          │   │
│  │  - Prisma (ORM)                                      │   │
│  │  - BullMQ (Queue Producer)                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                     │                    │
        ┌────────────┴────────┐          │
        ↓                     ↓          ↓
┌──────────────┐    ┌──────────────┐   ┌──────────────────┐
│ Neon         │    │ Upstash      │   │ Worker           │
│ PostgreSQL   │    │ Redis        │   │ (Cloud Run)      │
│              │    │              │   │                  │
│ - users      │    │ - Queue Jobs │   │ ┌──────────────┐ │
│ - channels   │    │ - Cache      │   │ │ BullMQ       │ │
│ - videos     │    │              │   │ │ Worker       │ │
│ - summaries  │    │              │   │ └──────────────┘ │
└──────────────┘    └──────────────┘   │ ┌──────────────┐ │
                                        │ │ 1. 取字幕    │ │
┌──────────────────┐                   │ │ 2. AI 摘要   │ │
│ GCP Cloud        │                   │ │ 3. 儲存結果  │ │
│ Scheduler        │                   │ └──────────────┘ │
│                  │                   └──────────────────┘
│ 每天 8:00        │                            │
│ 觸發 Cron API    │                            ↓
└──────────────────┘                   ┌──────────────────┐
                                        │ Gemini 2.5 Flash │
┌──────────────────┐                   │ API              │
│ YouTube Data     │←───────────────────┤                  │
│ API v3           │                   │ - 字幕翻譯       │
│                  │                   │ - 結構化摘要     │
└──────────────────┘                   └──────────────────┘
```

---

## 資料庫設計

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 使用者
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  googleId      String    @unique
  youtubeToken  String?   // 加密儲存的 YouTube OAuth token (由 NextAuth 管理)
  
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
  description     String?
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
  duration        Int       // 影片長度（秒）
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
  // { 
  //   topic: string,
  //   keyPoints: string[],
  //   sections: [{ timestamp: string, title: string, summary: string }]
  // }
  content         Json      @default("{}")
  
  // 處理狀態
  status          String    @default("pending") // pending | processing | completed | failed
  errorMessage    String?   @db.Text
  
  // Queue Job ID (用於追蹤和除錯)
  jobId           String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  completedAt     DateTime? // 完成時間
  
  @@unique([userId, videoId]) // 同一使用者對同影片只能有一個摘要
  @@index([userId])
  @@index([status])
}
```

### 資料關係
- User 1:N Channel（一個使用者可追蹤多個頻道）
- User 1:N Summary（一個使用者可有多個摘要）
- Channel 1:N Video（一個頻道有多部影片）
- Video 1:N Summary（一部影片可被多個使用者摘要）
- User + Video → 唯一 Summary（同使用者對同影片只有一個摘要）

---

## 核心功能實作細節

### 1. 認證與授權 (NextAuth.js)

#### OAuth Flow
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
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
          access_type: 'offline',  // 取得 refresh token
          prompt: 'consent',        // 強制顯示同意畫面
        },
      },
    }),
  ],
  
  callbacks: {
    async jwt({ token, account, user }) {
      // 初次登入：儲存 tokens
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at * 1000;
        token.userId = user.id;
      }
      
      // Token 還沒過期
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }
      
      // Token 過期，刷新它
      return await refreshAccessToken(token);
    },
    
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.userId = token.userId;
      return session;
    },
  },
};

async function refreshAccessToken(token) {
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
    });
    
    const refreshedTokens = await response.json();
    
    if (!response.ok) throw refreshedTokens;
    
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}
```

**優點：**
- Token 自動刷新，使用者無感
- 安全儲存在 HTTP-only cookie
- 無狀態設計，不依賴 Redis session

---

### 2. YouTube API 整合

#### YouTube Client 封裝
```typescript
// lib/youtube/client.ts
import { google } from 'googleapis';
import { YoutubeTranscript } from 'youtube-transcript';

export class YouTubeClient {
  private youtube;
  
  constructor(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    this.youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  }
  
  // 取得使用者訂閱的頻道
  async getSubscriptions() {
    const response = await this.youtube.subscriptions.list({
      part: ['snippet'],
      mine: true,
      maxResults: 50,
    });
    return response.data.items || [];
  }
  
  // 取得頻道的影片列表
  async getChannelVideos(channelId: string, maxResults = 50) {
    const response = await this.youtube.search.list({
      part: ['snippet'],
      channelId,
      type: ['video'],
      order: 'date',
      maxResults,
    });
    return response.data.items || [];
  }
  
  // 取得影片詳細資訊（包含時長）
  async getVideoDetails(videoIds: string[]) {
    const response = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds,
    });
    return response.data.items || [];
  }
}

// 取得影片字幕（不消耗 YouTube API 配額）
export async function getVideoTranscript(videoId: string) {
  try {
    // 優先取英文字幕
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en',
    });
    return transcript.map(item => ({
      timestamp: item.offset,
      text: item.text,
    }));
  } catch {
    // 沒有英文字幕，取自動生成字幕
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(item => ({
      timestamp: item.offset,
      text: item.text,
    }));
  }
}
```

**YouTube API 配額管理：**
- 每日免費額度：10,000 units
- `subscriptions.list`: 1 unit
- `search.list`: 100 units
- `videos.list`: 1 unit
- 自用場景完全夠用

---

### 3. Redis Queue 設計 (BullMQ)

#### Queue 定義
```typescript
// lib/queue/summaryQueue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL!);

// 定義 Queue
export const summaryQueue = new Queue('video-summary', { connection });

// Job 資料結構
export interface SummaryJobData {
  summaryId: string;
  videoId: string;
  youtubeVideoId: string;
  userId: string;
}

// 新增任務到 Queue
export async function addSummaryJob(data: SummaryJobData) {
  return await summaryQueue.add('process-summary', data, {
    attempts: 3,              // 失敗重試 3 次
    backoff: {
      type: 'exponential',
      delay: 2000,            // 第一次 2 秒，第二次 4 秒，第三次 8 秒
    },
    removeOnComplete: 100,    // 保留最近 100 個完成任務
    removeOnFail: 200,        // 保留最近 200 個失敗任務
  });
}
```

#### Worker 實作
```typescript
// lib/queue/summaryWorker.ts
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@/lib/db';
import { getVideoTranscript } from '@/lib/youtube/client';
import { generateSummaryWithRetry } from '@/lib/ai/summarizer';

const connection = new Redis(process.env.REDIS_URL!);

export const summaryWorker = new Worker(
  'video-summary',
  async (job) => {
    const { summaryId, youtubeVideoId } = job.data;
    
    console.log(`[Worker] Processing summary ${summaryId}`);
    
    // 1. 更新狀態為 processing
    await prisma.summary.update({
      where: { id: summaryId },
      data: { 
        status: 'processing',
        jobId: job.id,
      },
    });
    
    // 2. 取得影片資訊
    const video = await prisma.video.findFirst({
      where: { youtubeId: youtubeVideoId },
    });
    
    if (!video) {
      throw new Error(`Video ${youtubeVideoId} not found`);
    }
    
    // 3. 取得 YouTube 字幕
    const transcript = await getVideoTranscript(youtubeVideoId);
    
    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript available for this video');
    }
    
    // 4. 送給 Gemini 生成摘要
    const summary = await generateSummaryWithRetry(transcript, video.title);
    
    // 5. 儲存結果
    await prisma.summary.update({
      where: { id: summaryId },
      data: {
        status: 'completed',
        content: summary,
        completedAt: new Date(),
      },
    });
    
    console.log(`[Worker] ✅ Summary ${summaryId} completed`);
    
    return { success: true };
  },
  { 
    connection,
    concurrency: 2, // 同時處理 2 個任務
  }
);

// 錯誤處理
summaryWorker.on('failed', async (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} failed:`, err);
  
  if (job?.data.summaryId) {
    await prisma.summary.update({
      where: { id: job.data.summaryId },
      data: {
        status: 'failed',
        errorMessage: err.message,
      },
    });
  }
});

summaryWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Job ${job.id} completed`);
});
```

**為什麼需要 Queue：**
- 避免 HTTP timeout（摘要處理需 10-30 秒）
- 並行處理多個影片
- 自動重試機制
- 使用者可追蹤處理進度

---

### 4. AI 摘要生成 (Gemini 2.5 Flash)

```typescript
// lib/ai/summarizer.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface TranscriptSegment {
  timestamp: number;
  text: string;
}

export interface SummaryResult {
  topic: string;
  keyPoints: string[];
  sections: {
    timestamp: string;
    title: string;
    summary: string;
  }[];
}

export async function generateVideoSummary(
  transcript: TranscriptSegment[],
  videoTitle: string
): Promise<SummaryResult> {
  
  // 將字幕整理成帶時間戳的文字
  const transcriptText = transcript
    .map(seg => `[${formatTimestamp(seg.timestamp)}] ${seg.text}`)
    .join('\n');
  
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
`;

  // 使用 Gemini 2.5 Flash
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash-latest',
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json', // 強制 JSON 輸出
    },
  });
  
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  // 解析 JSON
  const summary = JSON.parse(text);
  return summary;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 帶重試機制的版本
export async function generateSummaryWithRetry(
  transcript: TranscriptSegment[],
  videoTitle: string,
  maxRetries = 2
): Promise<SummaryResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateVideoSummary(transcript, videoTitle);
    } catch (error: any) {
      // Rate limit - 等待後重試
      if (error.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }
      // Server error - 重試
      if (error.status === 500 || error.status === 503) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      // 其他錯誤直接拋出
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

**Gemini 2.5 Flash 優勢：**
- 免費額度大（每天 1,500 requests）
- 長上下文（1M tokens）
- 原生 JSON 模式
- 繁中翻譯品質好
- 速度快

---

### 5. 定時任務 (Cron Job)

```typescript
// app/api/cron/check-new-videos/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { YouTubeClient } from '@/lib/youtube/client';
import { addSummaryJob } from '@/lib/queue/summaryQueue';

export async function GET(request: Request) {
  // 驗證請求來自 Cloud Scheduler
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const channels = await prisma.channel.findMany({
      include: { user: true },
    });
    
    let newVideosCount = 0;
    
    for (const channel of channels) {
      const youtube = new YouTubeClient(channel.user.youtubeToken!);
      const videos = await youtube.getChannelVideos(channel.youtubeId, 5);
      
      for (const video of videos) {
        const videoId = video.id?.videoId;
        if (!videoId) continue;
        
        const existing = await prisma.video.findUnique({
          where: { youtubeId: videoId },
        });
        
        if (!existing) {
          // 新影片！儲存並建立摘要任務
          const newVideo = await prisma.video.create({
            data: {
              youtubeId: videoId,
              title: video.snippet?.title || '',
              thumbnail: video.snippet?.thumbnails?.high?.url,
              publishedAt: new Date(video.snippet?.publishedAt!),
              channelId: channel.id,
              duration: 0,
            },
          });
          
          const summary = await prisma.summary.create({
            data: {
              videoId: newVideo.id,
              userId: channel.userId,
              status: 'pending',
            },
          });
          
          await addSummaryJob({
            summaryId: summary.id,
            videoId: newVideo.id,
            youtubeVideoId: videoId,
            userId: channel.userId,
          });
          
          newVideosCount++;
        }
      }
      
      await prisma.channel.update({
        where: { id: channel.id },
        data: { lastCheckedAt: new Date() },
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      newVideos: newVideosCount,
    });
    
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

**GCP Cloud Scheduler 設定：**
```bash
gcloud scheduler jobs create http check-new-videos \
  --schedule="0 8 * * *" \
  --uri="https://your-app.run.app/api/cron/check-new-videos" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \
  --location=asia-east1
```

---

### 6. 前端頁面架構

```
app/
├── (auth)/
│   ├── login/page.tsx              # 登入頁
│   └── layout.tsx
│
├── (dashboard)/
│   ├── layout.tsx                  # 主 Layout（導航列）
│   ├── page.tsx                    # 首頁（最近摘要）
│   │
│   ├── channels/
│   │   ├── page.tsx                # 頻道列表
│   │   ├── new/page.tsx            # 新增頻道
│   │   └── [id]/
│   │       ├── page.tsx            # 頻道詳情（影片列表）
│   │       └── videos/[videoId]/
│   │           └── page.tsx        # 影片摘要頁面
│   │
│   └── summaries/
│       └── page.tsx                # 所有摘要列表
│
└── api/
    ├── auth/[...nextauth]/         # NextAuth
    ├── channels/                   # 頻道 API
    ├── videos/                     # 影片 API
    ├── summaries/                  # 摘要 API
    └── cron/                       # 定時任務
```

**核心元件：**
- `ChannelCard`: 頻道卡片（顯示縮圖、標題、立即更新按鈕）
- `VideoList`: 影片列表（可勾選多個影片）
- `SummaryView`: 摘要顯示（結構化呈現）
- `StatusBadge`: 狀態徽章（pending/processing/completed/failed）

**UI 特色：**
- 黑底 + 紫黃漸層設計（使用 ui-ux-pro-max skill）
- 響應式設計
- 即時狀態更新（輪詢或 WebSocket）
- 時間戳可跳轉到 YouTube 對應位置

---

## 部署架構

### GCP + 外部服務混合方案

**服務配置：**

| 服務 | 提供商 | 規格 | 月成本 |
|-----|-------|------|--------|
| Next.js Web | GCP Cloud Run | 512Mi RAM, min=0 | ~$1-3 |
| Worker | GCP Cloud Run | 1Gi RAM, min=1 | ~$3-5 |
| PostgreSQL | Neon | 免費 500MB | $0 |
| Redis | Upstash | 免費 10K cmd/day | $0 |
| Cron | GCP Cloud Scheduler | 1 job | $0 |
| **總計** | | | **$4-8/月** |

**利用 GCP 額度：**
- 您有 NT$9000+ 額度
- 每月消耗約 $4-8 USD (~NT$120-240)
- **可用 3-5 年！**

### Dockerfile

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

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

### 部署腳本

```bash
#!/bin/bash
# deploy.sh

PROJECT_ID="your-gcp-project-id"
REGION="asia-east1"

echo "🔨 Building..."
docker build --platform linux/amd64 -t gcr.io/$PROJECT_ID/youtube-summarizer:latest .

echo "📤 Pushing..."
docker push gcr.io/$PROJECT_ID/youtube-summarizer:latest

echo "🚀 Deploying Web..."
gcloud run deploy youtube-summarizer-web \
  --image gcr.io/$PROJECT_ID/youtube-summarizer:latest \
  --region $REGION \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 3 \
  --memory 512Mi

echo "🤖 Deploying Worker..."
gcloud run deploy youtube-summarizer-worker \
  --image gcr.io/$PROJECT_ID/youtube-summarizer:latest \
  --region $REGION \
  --no-allow-unauthenticated \
  --min-instances 1 \
  --max-instances 2 \
  --memory 1Gi \
  --command "npm,run,worker"

echo "✅ Done!"
```

---

## 成本分析

### 免費額度使用情況

**Gemini 2.5 Flash：**
- 免費額度：每天 1,500 requests
- 假設每月處理 100 部影片
- 100 部 ÷ 30 天 = 每天 3.3 部
- **完全在免費額度內** ✅

**Neon PostgreSQL：**
- 免費 500MB 儲存
- 假設每個摘要 10KB
- 可儲存 50,000 個摘要
- **完全夠用** ✅

**Upstash Redis：**
- 免費 10,000 commands/天
- Queue 操作：每個任務約 10 commands
- 每天可處理 1,000 個任務
- **完全夠用** ✅

**GCP Cloud Run：**
- Web (min=0)：無流量時 $0
- Worker (min=1)：約 $3-5/月
- **用您的額度，可跑 3-5 年** ✅

### 總成本
- **開發階段**：$0（用本機測試）
- **生產環境**：$4-8/月（全用 GCP 額度）
- **AI 成本**：$0（免費額度內）

---

## 風險與挑戰

### 技術風險

| 風險 | 影響 | 緩解措施 |
|-----|------|---------|
| YouTube 字幕不可用 | 無法生成摘要 | 前端提示使用者、支援手動上傳字幕 |
| Gemini API Rate Limit | 摘要失敗 | BullMQ 重試機制、降級到排隊 |
| OAuth Token 過期 | 無法抓影片 | 自動 refresh token、失敗通知使用者 |
| GCP 額度用完 | 服務停止 | 監控用量、切換到 Vercel 免費方案 |

### 產品風險

| 風險 | 影響 | 緩解措施 |
|-----|------|---------|
| 使用頻率低 | 資源浪費 | Cloud Run min=0 省成本 |
| 摘要品質不佳 | 使用者不滿意 | 優化 prompt、支援手動修正 |
| 頻道太多影片 | 初次新增成本高 | 只顯示最新 50 部、使用者手動選擇 |

---

## 開發時程

### MVP 開發階段（6-8 週）

**Week 1-2: 基礎架構**
- ✅ Next.js 專案初始化
- ✅ Prisma schema 設計
- ✅ NextAuth.js OAuth 設定
- ✅ 基本 UI layout (ui-ux-pro-max skill)

**Week 3: YouTube 整合**
- ✅ YouTube API client 封裝
- ✅ 頻道列表頁面
- ✅ 影片列表頁面

**Week 4: Queue & AI**
- ✅ BullMQ Queue 設定
- ✅ Worker 實作
- ✅ Gemini 摘要功能

**Week 5: 前端完善**
- ✅ 摘要顯示頁面
- ✅ 狀態即時更新
- ✅ UI/UX 優化

**Week 6: 部署與測試**
- ✅ Dockerfile 設定
- ✅ GCP 部署
- ✅ 定時任務設定
- ✅ 整合測試

**後續優化：**
- WebSocket 即時更新（取代輪詢）
- 摘要品質評分
- 使用者自訂 prompt
- 支援多語言字幕

---

## 成功指標

### MVP 階段
- ✅ 可成功新增頻道並抓取影片列表
- ✅ 可勾選影片並生成摘要
- ✅ 摘要品質可接受（主觀評估）
- ✅ 定時任務正常運作
- ✅ 部署成本 < $10/月

### 長期目標
- 使用者數：10-20 人（自己 + 朋友）
- 每月處理影片：100-200 部
- 成本控制在免費額度內
- 摘要準確率 > 80%

---

## 附錄

### 環境變數清單

```env
# Database
DATABASE_URL=postgresql://user:pass@xxx.neon.tech/db?sslmode=require

# Redis
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379

# NextAuth
NEXTAUTH_URL=https://your-app.run.app
NEXTAUTH_SECRET=your-random-secret

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Google AI
GOOGLE_AI_API_KEY=your-gemini-api-key

# Cron Secret
CRON_SECRET=your-cron-secret
```

### 相關資源
- [Next.js 文件](https://nextjs.org/docs)
- [NextAuth.js 文件](https://next-auth.js.org/)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Gemini API 文件](https://ai.google.dev/docs)
- [BullMQ 文件](https://docs.bullmq.io/)
- [Prisma 文件](https://www.prisma.io/docs)

### UI/UX 設計參考
- 使用 ui-ux-pro-max skill 實作
- 主題：黑底 + 紫黃漸層
- 風格：現代化、極簡
- 重點：可讀性、易用性

---

## 結論

這個專案在技術、成本、時程上都非常可行：

✅ **技術成熟**：所有技術都是經過驗證的標準實作  
✅ **成本極低**：月成本 $4-8，可用 GCP 額度跑 3-5 年  
✅ **開發快速**：6-8 週可完成 MVP  
✅ **價值明確**：解決真實的語言學習痛點  

**下一步建議：**
1. 使用 `writing-plans` skill 建立詳細實作計劃
2. 使用 `ui-ux-pro-max` skill 設計視覺介面
3. 開始實作 MVP

---

**文件版本**: 1.0  
**最後更新**: 2026-01-18  
**狀態**: 設計完成，待實作
