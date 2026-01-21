import { Worker } from 'bullmq'
import { redisConnection } from '@/lib/queue/connection'
import { prisma } from '@/lib/db'
import { getVideoTranscript } from '@/lib/youtube/client'
import { generateSummaryWithRetry } from '@/lib/ai/summarizer'
import { createSummaryPage } from '@/lib/notion/service'
import type { SummaryJobData } from '@/lib/queue/types'
import type { SummaryResult } from '@/lib/ai/types'

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

    // Save transcript to Video for AI Chat
    await prisma.video.update({
      where: { id: summary.videoId },
      data: { transcript: transcript as any },
    })

    // 3.5 取得現有標籤供 AI 參考
    const existingTags = await prisma.tag.findMany({
      take: 50,
      orderBy: {
        summaryTags: {
          _count: 'desc',
        },
      },
      select: {
        name: true,
      },
    })
    const tagNames = existingTags.map((t) => t.name)

    // 4. 生成摘要
    const summaryContent = await generateSummaryWithRetry(
      transcript,
      summary.video.title,
      tagNames
    )

    // 6. 儲存結果並取得關聯資料以進行 Notion 同步檢查
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

    // 6.5 儲存標籤
    if (summaryContent.tags && Array.isArray(summaryContent.tags)) {
      for (const tagName of summaryContent.tags) {
        try {
          // Find or create tag
          const tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          })

          // Link tag to summary
          await prisma.summaryTag.create({
            data: {
              summaryId: summaryId,
              tagId: tag.id,
              isConfirmed: false,
            },
          })
        } catch (error) {
          console.error(`[Worker] Failed to save tag ${tagName} for summary ${summaryId}:`, error)
        }
      }
    }

    console.log(`[Worker] ✅ Summary ${summaryId} completed`)

    // 7. Auto Sync to Notion
    if (completedSummary.video.channel.autoSyncNotion) {
      console.log(`[Worker] Auto syncing summary ${summaryId} to Notion...`)
      const user = completedSummary.user
      const notionAccount = user.accounts[0]

      if (user.notionParentPageId && notionAccount?.access_token) {
        try {
          await prisma.summary.update({
            where: { id: summaryId },
            data: { notionSyncStatus: 'PENDING' },
          })

          const response = await createSummaryPage(
            notionAccount.access_token,
            user.notionParentPageId,
            summaryContent as SummaryResult,
            {
              title: completedSummary.video.title,
              url: `https://www.youtube.com/watch?v=${completedSummary.video.youtubeId}`,
              videoId: completedSummary.video.youtubeId,
              thumbnailUrl: completedSummary.video.thumbnail || undefined,
            }
          )

          await prisma.summary.update({
            where: { id: summaryId },
            data: {
              notionSyncStatus: 'SUCCESS',
              notionUrl: (response as any).url,
            },
          })
          console.log(`[Worker] ✅ Synced summary ${summaryId} to Notion`)
        } catch (error: any) {
          console.error(`[Worker] ❌ Failed to sync to Notion:`, error)
          await prisma.summary.update({
            where: { id: summaryId },
            data: {
              notionSyncStatus: 'FAILED',
              notionError: error.message,
            },
          })
        }
      } else {
        console.log(`[Worker] Skipping Notion sync: Missing credentials`)
      }
    }

    return { success: true }
  },
  {
    connection: redisConnection as any,
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
