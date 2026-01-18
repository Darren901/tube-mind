import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { YouTubeClient } from '@/lib/youtube/client'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const youtube = new YouTubeClient(session.accessToken)
    const subscriptions = await youtube.getSubscriptions()
    
    return NextResponse.json(subscriptions)
  } catch (error: any) {
    console.error('Failed to fetch subscriptions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscriptions' }, 
      { status: 500 }
    )
  }
}
