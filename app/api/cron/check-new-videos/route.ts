import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { YouTubeClient } from '@/lib/youtube/client'
import { addSummaryJob } from '@/lib/queue/summaryQueue'
import { LIMITS } from '@/lib/constants/limits'

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
    const userStats: Record<string, { added: number; skipped: number; quotaExceeded: boolean }> = {}

    for (const channel of channels) {
      // 初始化使用者統計
      if (!userStats[channel.userId]) {
        userStats[channel.userId] = { added: 0, skipped: 0, quotaExceeded: false }
      }

      // 如果該使用者已超過額度，跳過此頻道
      if (userStats[channel.userId].quotaExceeded) {
        continue
      }

      // 取得使用者的 access token（從 Account 表）
      const account = await prisma.account.findFirst({
        where: {
          userId: channel.userId,
          provider: 'google',
        },
      })

      if (!account?.access_token) continue

      const youtube = new YouTubeClient(account.access_token)
      const videos = await youtube.getChannelVideos(channel.youtubeId, LIMITS.VIDEOS_PER_CHANNEL_REFRESH)

      for (const video of videos) {
        // Skip videos longer than max duration
        if (video.duration > LIMITS.MAX_VIDEO_DURATION_SECONDS) {
          continue
        }

        const existing = await prisma.video.findUnique({
          where: { youtubeId: video.id },
        })

        if (!existing) {
          try {
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
            userStats[channel.userId].added++
          } catch (error) {
            console.error(`Failed to create summary for video ${video.id}:`, error)
            
            // 檢查是否為額度限制錯誤
            if (error instanceof Error && 
                (error.message.includes('每日摘要生成上限') || 
                 error.message.includes('待處理任務上限'))) {
              userStats[channel.userId].quotaExceeded = true
              console.log(`User ${channel.userId} exceeded quota, skipping remaining channels`)
              break // 停止處理此使用者的其他頻道
            }
          }
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
      userStats,
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
