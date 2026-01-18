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
  const videos = await youtube.getChannelVideos(channel.youtubeId, 5)

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
