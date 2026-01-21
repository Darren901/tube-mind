import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateSpeech } from '@/lib/audio/tts'
import { uploadAudio } from '@/lib/audio/storage'
import { SummaryResult } from '@/lib/ai/types'

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
    })

    if (!summary) {
      return NextResponse.json({ error: 'Summary not found' }, { status: 404 })
    }

    // Check if audio already exists
    if (summary.audioUrl) {
      return NextResponse.json({ audioUrl: summary.audioUrl })
    }

    if (summary.status !== 'completed') {
      return NextResponse.json(
        { error: 'Summary is not completed yet' },
        { status: 400 }
      )
    }

    const content = summary.content as unknown as SummaryResult

    // Compose text for TTS
    let textToSpeak = `您好，這是 TubeMind 為您準備的影片摘要音訊。\n\n`
    textToSpeak += `這份摘要的主題是：${content.topic}。\n\n`

    if (content.keyPoints && content.keyPoints.length > 0) {
      textToSpeak += `這部影片有幾個核心觀點：\n`
      content.keyPoints.forEach((point, index) => {
        textToSpeak += `${index + 1}、${point}\n`
      })
      textToSpeak += `\n`
    }

    if (content.sections && content.sections.length > 0) {
      textToSpeak += `接下來為您播報詳細的摘要內容：\n`
      content.sections.forEach((section) => {
        textToSpeak += `${section.title}。${section.summary}\n\n`
      })
    }

    textToSpeak += `以上就是這份摘要的全部內容。感謝您的收聽。`

    // Generate speech
    const audioBuffer = await generateSpeech(textToSpeak)

    // Upload to GCS
    const fileName = `audio/${summary.id}.mp3`
    const audioUrl = await uploadAudio(audioBuffer, fileName)

    // Update database
    await prisma.summary.update({
      where: { id: summary.id },
      data: {
        audioUrl,
        audioGeneratedAt: new Date(),
      },
    })

    return NextResponse.json({ audioUrl })
  } catch (error) {
    console.error('Error generating audio:', error)
    return NextResponse.json(
      { error: 'Failed to generate audio endpoint: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
