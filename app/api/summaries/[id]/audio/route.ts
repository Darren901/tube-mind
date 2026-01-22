import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addTTSJob } from '@/lib/queue/ttsQueue'

export const maxDuration = 30

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    // 如果音訊已存在，直接回傳
    if (summary.audioUrl) {
      console.log(`[Audio API] Serving cached audio for summary: ${params.id}`)
      return NextResponse.json({ audioUrl: summary.audioUrl })
    }

    // 檢查摘要是否完成
    if (summary.status !== 'completed') {
      console.error(`[Audio API] Summary ${params.id} is not completed. Status: ${summary.status}`)
      return NextResponse.json(
        { error: 'Summary is not completed yet. Please wait for the summary to be ready.' },
        { status: 400 }
      )
    }

    // 加入 TTS 隊列
    console.log(`[Audio API] Adding TTS job for summary: ${params.id}`)
    await addTTSJob({
      summaryId: summary.id,
      youtubeVideoId: summary.video.youtubeId,
    })

    // 立即回傳，告知前端正在處理
    return NextResponse.json({ 
      status: 'processing',
      message: 'Audio generation started. You will be notified when ready.' 
    })
  } catch (error) {
    console.error(`[Audio API] Error for summary ${params.id}:`, error)
    return NextResponse.json(
      {
        error: 'Failed to start audio generation: ' + (error instanceof Error ? error.message : 'Internal Server Error'),
      },
      { status: 500 }
    )
  }
}
