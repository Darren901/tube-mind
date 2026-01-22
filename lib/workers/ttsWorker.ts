import { Worker } from 'bullmq'
import { redisConnection } from '@/lib/queue/connection'
import { prisma } from '@/lib/db'
import { generateSpeech } from '@/lib/audio/tts'
import { uploadAudio } from '@/lib/audio/storage'
import { publishSummaryEvent } from '@/lib/queue/events'
import type { TTSJobData } from '@/lib/queue/types'
import type { SummaryResult } from '@/lib/ai/types'

export const ttsWorker = new Worker<TTSJobData>(
  'tts-audio',
  async (job) => {
    const { summaryId, youtubeVideoId } = job.data

    console.log(`[TTS Worker] Processing audio for summary ${summaryId}`)

    // 發布「生成中」事件
    await publishSummaryEvent(summaryId, { type: 'audio_generating' })

    try {
      // 1. 取得 summary
      const summary = await prisma.summary.findUnique({
        where: { id: summaryId },
      })

      if (!summary) {
        throw new Error(`Summary ${summaryId} not found`)
      }

      if (summary.status !== 'completed') {
        throw new Error(`Summary ${summaryId} is not completed yet`)
      }

      // 2. 檢查是否已有音訊
      if (summary.audioUrl) {
        console.log(`[TTS Worker] Audio already exists for summary ${summaryId}`)
        await publishSummaryEvent(summaryId, {
          type: 'audio_completed',
          data: { audioUrl: summary.audioUrl },
        })
        return { success: true, cached: true }
      }

      const content = summary.content as unknown as SummaryResult

      // 3. 組合 TTS 文字
      let textToSpeak = `您好,這是 TubeMind 為您準備的影片摘要音訊。\n\n`

      if (content.topic) {
        textToSpeak += `這份摘要的主題是:${content.topic}。\n\n`
      }

      if (content.keyPoints && content.keyPoints.length > 0) {
        textToSpeak += `這部影片有幾個核心觀點:\n`
        content.keyPoints.forEach((point, index) => {
          textToSpeak += `${index + 1}、${point}\n`
        })
        textToSpeak += `\n`
      }

      if (content.sections && content.sections.length > 0) {
        textToSpeak += `接下來為您播報詳細的摘要內容:\n`
        content.sections.forEach((section) => {
          textToSpeak += `${section.title}。${section.summary}\n\n`
        })
      }

      textToSpeak += `以上就是這份摘要的全部內容。感謝您的收聽。`

      if (!textToSpeak || textToSpeak.trim().length < 5) {
        throw new Error('摘要內容不足，無法生成語音')
      }

      // 4. 生成語音
      console.log(`[TTS Worker] Calling TTS engine for summary ${summaryId}`)
      const audioBuffer = await generateSpeech({
        text: textToSpeak,
        voiceName: 'cmn-TW-Standard-A',
      })

      // 5. 上傳到 GCS
      console.log(`[TTS Worker] Uploading audio for summary ${summaryId}`)
      const fileName = `audio/${summaryId}.mp3`
      const audioUrl = await uploadAudio(audioBuffer, fileName)

      // 6. 更新資料庫
      await prisma.summary.update({
        where: { id: summaryId },
        data: {
          audioUrl,
          audioGeneratedAt: new Date(),
        },
      })

      // 7. 發布「完成」事件
      await publishSummaryEvent(summaryId, {
        type: 'audio_completed',
        data: { audioUrl },
      })

      console.log(`[TTS Worker] ✅ Audio generated for summary ${summaryId}`)

      return { success: true }
    } catch (error: any) {
      console.error(`[TTS Worker] ❌ Failed to generate audio:`, error)
      
      // 發布「失敗」事件
      await publishSummaryEvent(summaryId, {
        type: 'audio_failed',
        error: error.message,
      })

      throw error
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 2,
  }
)

ttsWorker.on('failed', async (job, err) => {
  console.error(`[TTS Worker] ❌ Job ${job?.id} failed:`, err)
})

ttsWorker.on('completed', (job) => {
  console.log(`[TTS Worker] ✅ Job ${job.id} completed`)
})
