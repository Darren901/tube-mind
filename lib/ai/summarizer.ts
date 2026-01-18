import { GoogleGenerativeAI } from '@google/generative-ai'
import type { TranscriptSegment } from '@/lib/youtube/types'
import type { SummaryResult } from './types'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export async function generateVideoSummary(
  transcript: TranscriptSegment[],
  videoTitle: string
): Promise<SummaryResult> {
  const transcriptText = transcript
    .map(seg => `[${formatTimestamp(seg.timestamp)}] ${seg.text}`)
    .join('\n')

  const prompt = `
你是一位專業的學習助理。請分析以下 YouTube 影片的字幕內容（可能是英文、中文、日文或其他任何語言），並為我生成一份詳細的**繁體中文**摘要。

注意：
1. 如果字幕是外語（非繁體中文），請先理解內容，再用**繁體中文**撰寫摘要。
2. 即使原文是其他語言，輸出的 JSON 內容（標題、觀點、摘要）都必須是繁體中文。

影片標題：${videoTitle}

字幕內容：
${transcriptText}

請以 JSON 格式輸出，包含以下結構：
{
  "topic": "影片的主要主題（一句話）",
  "keyPoints": ["核心觀點1", "核心觀點2", "核心觀點3"],
  "sections": [
    {
      "timestamp": "00:00",
      "title": "章節標題",
      "summary": "這個章節的詳細摘要（3-5 句話）"
    }
  ]
}

要求：
1. 所有內容必須是繁體中文
2. keyPoints 抓出 3-5 個最重要的觀點
3. sections 按時間順序分段，每 2-5 分鐘一個段落
4. 摘要要具體，不要太籠統
5. 保留重要的專有名詞（可附上英文）
6. 只輸出 JSON，不要其他說明文字
`

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  })

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  const summary = JSON.parse(text)
  return summary
}

export async function generateSummaryWithRetry(
  transcript: TranscriptSegment[],
  videoTitle: string,
  maxRetries = 2
): Promise<SummaryResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateVideoSummary(transcript, videoTitle)
    } catch (error: any) {
      if (error.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)))
        continue
      }
      if (error.status === 500 || error.status === 503) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}
