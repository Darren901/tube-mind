import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addSummaryJob } from '@/lib/queue/summaryQueue'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary = await prisma.summary.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      video: true,
    },
  })

  if (!summary) {
    return NextResponse.json({ error: 'Summary not found' }, { status: 404 })
  }

  // 重置狀態
  await prisma.summary.update({
    where: { id: summary.id },
    data: {
      status: 'pending',
      errorMessage: null,
      content: {},
    },
  })

  // 重新加入 Queue
  try {
    await addSummaryJob({
      summaryId: summary.id,
      videoId: summary.videoId,
      youtubeVideoId: summary.video.youtubeId,
      userId: session.user.id,
    })
  } catch (error) {
    // 還原狀態
    await prisma.summary.update({
      where: { id: summary.id },
      data: { status: 'failed' },
    })
    
    if (error instanceof Error && 
        (error.message.includes('每日摘要生成上限') || 
         error.message.includes('待處理任務上限'))) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    
    throw error
  }

  return NextResponse.json({ success: true })
}
