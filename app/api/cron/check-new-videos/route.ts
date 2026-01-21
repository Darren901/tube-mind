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
      where: { autoRefresh: true },
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
      const MAX_DURATION_SECONDS = 5 * 60 * 60 // 5 hours

      for (const video of videos) {
        // Skip videos longer than 5 hours
        if (video.duration > MAX_DURATION_SECONDS) {
          continue
        }

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
