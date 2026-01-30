import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { YouTubeClient } from '@/lib/youtube/client'
import { addSummaryJob } from '@/lib/queue/summaryQueue'
import { checkChannelLimit } from '@/lib/quota/dailyLimit'
import { LIMITS } from '@/lib/constants/limits'

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

  // 檢查頻道數量限制
  try {
    await checkChannelLimit(session.user.id)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    throw error
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
    const channelDetails = await youtube.getChannelDetails(youtubeId)
    
    if (!channelDetails) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // 建立頻道
    const channel = await prisma.channel.create({
      data: {
        youtubeId: channelDetails.id,
        title: channelDetails.title,
        description: channelDetails.description,
        thumbnail: channelDetails.thumbnail,
        userId: session.user.id,
        lastCheckedAt: new Date(),
      },
    })

    // 自動抓取前 5 部影片並存入 DB
    const videos = await youtube.getChannelVideos(youtubeId, LIMITS.VIDEOS_PER_CHANNEL_REFRESH)
    const savedVideos = []

    for (const video of videos) {
      // Skip videos longer than max duration
      if (video.duration > LIMITS.MAX_VIDEO_DURATION_SECONDS) {
        continue
      }

      const existingVideo = await prisma.video.findUnique({
        where: { youtubeId: video.id },
      })

      if (!existingVideo) {
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
        savedVideos.push(newVideo)
      } else {
        savedVideos.push(existingVideo)
      }
    }

    return NextResponse.json({ ...channel, recentVideos: savedVideos }, { status: 201 })
  } catch (error) {
    console.error('Error creating channel:', error)
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
  }
}
