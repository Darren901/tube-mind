import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { YouTubeClient } from '@/lib/youtube/client'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const youtube = new YouTubeClient(session.accessToken)
    const subscriptions = await youtube.getSubscriptions()
    
    // 查詢已存在的頻道
    const existingChannels = await prisma.channel.findMany({
      where: {
        userId: session.user.id,
        youtubeId: { in: subscriptions.map(s => s.id) }
      },
      select: { youtubeId: true }
    })

    const existingIds = new Set(existingChannels.map(c => c.youtubeId))

    // 標記已新增
    const result = subscriptions.map(sub => ({
      ...sub,
      isAdded: existingIds.has(sub.id)
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Failed to fetch subscriptions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscriptions' }, 
      { status: 500 }
    )
  }
}
