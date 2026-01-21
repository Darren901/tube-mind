import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addSummaryJob } from '@/lib/queue/summaryQueue'

// GET /api/summaries - 取得使用者的摘要列表
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tagId = searchParams.get('tagId')

  const where: any = {
    userId: session.user.id,
  }

  if (tagId) {
    where.summaryTags = {
      some: {
        tagId,
        isConfirmed: true,
      },
    }
  }

  const summaries = await prisma.summary.findMany({
    where,
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

  // 檢查影片長度 (限制 3 小時)
  const MAX_DURATION_SECONDS = 3 * 60 * 60
  if (video.duration > MAX_DURATION_SECONDS) {
    return NextResponse.json({ 
      error: '影片過長。目前僅支援 3 小時以內的影片摘要。' 
    }, { status: 400 })
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
