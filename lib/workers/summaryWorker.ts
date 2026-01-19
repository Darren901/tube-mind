import { Worker } from 'bullmq'
import { redisConnection } from '@/lib/queue/connection'
import { prisma } from '@/lib/db'
import { getVideoTranscript } from '@/lib/youtube/client'
import { generateSummaryWithRetry } from '@/lib/ai/summarizer'
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

    // Save transcript to Video for AI Chat
    await prisma.video.update({
      where: { id: summary.videoId },
      data: { transcript: transcript as any },
    })

    // 4. 生成摘要
    const summaryContent = await generateSummaryWithRetry(transcript, summary.video.title)

    // 6. 儲存結果
    await prisma.summary.update({
      where: { id: summaryId },
      data: {
        status: 'completed',
        content: summaryContent as any,
        completedAt: new Date(),
      },
    })

    console.log(`[Worker] ✅ Summary ${summaryId} completed`)

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
