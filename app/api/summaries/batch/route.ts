import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addSummaryJob } from '@/lib/queue/summaryQueue'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { videoIds } = await request.json()

  if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
    return NextResponse.json({ error: 'videoIds array is required' }, { status: 400 })
  }

  const results = []

  for (const videoId of videoIds) {
    try {
      // 檢查影片是否存在且屬於使用者的頻道 (間接權限檢查，或直接允許)
      // 這裡簡化檢查：只要 videoId 存在即可，因為 summary 有 userId 綁定
      const video = await prisma.video.findUnique({
        where: { id: videoId },
      })

      if (!video) continue

      // 檢查影片長度 (限制 3 小時)
      const MAX_DURATION_SECONDS = 3 * 60 * 60
      if (video.duration > MAX_DURATION_SECONDS) {
        results.push({ videoId, status: 'error', error: 'Video too long (>3h)' })
        continue
      }

      // 檢查是否已有摘要
      const existingSummary = await prisma.summary.findFirst({
        where: {
          videoId,
          userId: session.user.id,
        },
      })

      if (existingSummary) {
        results.push({ videoId, status: 'already_exists', id: existingSummary.id })
        continue
      }

      // 建立摘要任務
      const summary = await prisma.summary.create({
        data: {
          videoId,
          userId: session.user.id,
          status: 'pending',
        },
      })

      await addSummaryJob({
        summaryId: summary.id,
        videoId: video.id,
        youtubeVideoId: video.youtubeId,
        userId: session.user.id,
      })

      results.push({ videoId, status: 'created', id: summary.id })
    } catch (error) {
      console.error(`Failed to create summary for video ${videoId}:`, error)
      
      // 檢查是否為額度限制錯誤
      if (error instanceof Error && 
          (error.message.includes('每日摘要生成上限') || 
           error.message.includes('待處理任務上限'))) {
        results.push({ videoId, status: 'error', error: error.message })
      } else {
        results.push({ videoId, status: 'error' })
      }
    }
  }

  return NextResponse.json({ results })
}
