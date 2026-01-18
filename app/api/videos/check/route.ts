import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { YouTubeClient } from '@/lib/youtube/client'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { youtubeId } = await request.json()

  if (!youtubeId) {
    return NextResponse.json({ error: 'youtubeId is required' }, { status: 400 })
  }

  // 1. 檢查 DB 是否已有此影片
  const existing = await prisma.video.findUnique({
    where: { youtubeId },
  })

  if (existing) {
    return NextResponse.json(existing)
  }

  // 2. 如果沒有，從 YouTube API 抓取資訊並建立
  const youtube = new YouTubeClient(session.accessToken!)
  
  try {
    // 這裡我們稍微 hack 一下，用 getChannelVideos 但傳入 videoId 其實不對
    // 我們需要 YouTubeClient 有 getVideoDetails
    // 但目前 YouTubeClient.getChannelVideos 是用 search.list，不支援單一 videoId 查詢詳情
    // 我們需要擴充 YouTubeClient 增加 getVideoDetails
    
    // 暫時解法：如果我們不想改 client，可以用 search list 搜這個 ID
    // 更好的解法：去 lib/youtube/client.ts 加一個 getVideoDetails
    
    // 讓我先快速去改 client.ts 增加 getVideoDetails
    const videoDetails = await youtube.getVideoDetails(youtubeId)

    if (!videoDetails) {
      return NextResponse.json({ error: 'Video not found on YouTube' }, { status: 404 })
    }

    // 我們還需要 Channel，如果 Channel 不在 DB，也要順便建
    // 但 getVideoDetails 回傳的 channelId 我們可以用
    
    // 檢查 Channel
    let channel = await prisma.channel.findUnique({
      where: {
        userId_youtubeId: {
          userId: session.user.id,
          youtubeId: videoDetails.channelId!,
        }
      }
    })

    // 如果是全新頻道，我們可能沒有詳細資訊（除非再 call API）
    // 為了簡化，如果找不到頻道，我們先建立一個簡易版，或者去抓頻道詳情
    if (!channel) {
       // 嘗試抓頻道詳情
       const channelDetails = await youtube.getChannelDetails(videoDetails.channelId!)
       if (channelDetails) {
         try {
            channel = await prisma.channel.create({
              data: {
                youtubeId: channelDetails.id,
                title: channelDetails.title,
                description: channelDetails.description,
                thumbnail: channelDetails.thumbnail,
                userId: session.user.id,
              }
            })
         } catch (e) {
            // 可能有 race condition，如果已存在就用查的
            channel = await prisma.channel.findFirst({
                where: { youtubeId: videoDetails.channelId }
            })
         }
       }
    }

    if (!channel) {
        return NextResponse.json({ error: 'Failed to resolve channel info' }, { status: 500 })
    }

    // 建立影片
    const newVideo = await prisma.video.create({
      data: {
        youtubeId: videoDetails.id,
        title: videoDetails.title,
        description: videoDetails.description,
        thumbnail: videoDetails.thumbnail,
        duration: videoDetails.duration,
        publishedAt: videoDetails.publishedAt,
        channelId: channel.id,
      },
    })

    return NextResponse.json(newVideo)

  } catch (error: any) {
    console.error('Error creating video:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
