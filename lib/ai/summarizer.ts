import { GoogleGenerativeAI } from '@google/generative-ai'
import type { TranscriptSegment } from '@/lib/youtube/types'
import type { SummaryResult } from './types'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

export interface UserPreferences {
  summaryTone?: string | null
  summaryToneCustom?: string | null
  summaryDetail?: string | null
}

function sanitize(text: string): string {
  return text.replace(/[<>{}[\]]/g, '').slice(0, 50)
}

function buildStyleInstruction(prefs?: UserPreferences): string {
  if (!prefs) return ''

  const tone = prefs.summaryTone || 'professional'
  const detail = prefs.summaryDetail || 'standard'

  const toneMap: Record<string, string> = {
    professional: '使用正式、專業的語氣',
    casual: '使用輕鬆、友善、口語化的語氣',
    concise: '使用極度簡潔的表達方式',
    detailed: '使用深入且詳細的分析語氣',
    custom:
      prefs.summaryToneCustom
        ? `風格：${sanitize(prefs.summaryToneCustom)}`
        : '使用正式、專業的語氣',
  }

  const detailMap: Record<string, string> = {
    brief: '"keyPoints" 限制 3 個，"sections[].summary" 每段 2-3 句話',
    standard: '"keyPoints" 3-5 個，"sections[].summary" 每段 3-5 句話',
    comprehensive:
      '"keyPoints" 5-7 個，"sections[].summary" 每段 5-8 句話，包含具體案例與延伸思考',
  }

  return `
風格要求：
- ${toneMap[tone] || toneMap.professional}
- ${detailMap[detail] || detailMap.standard}
`
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export async function generateVideoSummary(
  transcript: TranscriptSegment[],
  videoTitle: string,
  existingTags: string[] = [],
  userPreferences?: UserPreferences
): Promise<SummaryResult> {
  const transcriptText = transcript
    .map(seg => `[${formatTimestamp(seg.timestamp)}] ${seg.text}`)
    .join('\n')

  const tagsContext = existingTags.length > 0 
    ? `\n參考標籤（可從中選取適合的，也可新增）：${existingTags.join(', ')}`
    : ''

  const styleInstruction = buildStyleInstruction(userPreferences)

  const prompt = `
你是 YouTube 影片內容分析專家。請閱讀以下字幕，生成詳細的**繁體中文**摘要與標籤。

影片標題：${videoTitle}
${tagsContext}
${styleInstruction}

字幕內容：
${transcriptText}

請以 JSON 格式輸出：
{
  "topic": "核心主題（一句話）",
  "tags": ["標籤1", "標籤2", "標籤3", "標籤4", "標籤5"],
  "keyPoints": ["觀點1", "觀點2", "觀點3"],
  "sections": [
    {
      "timestamp": "00:00",
      "title": "段落標題",
      "summary": "段落摘要（3-5 句話）"
    }
  ]
}

要求：
1. 全程使用繁體中文（專有名詞可保留原文）。
2. "tags" 請生成 3-5 個與影片內容高度相關的標籤。若有提供的參考標籤適合，請優先使用，並補充缺少的關鍵標籤。
3. "keyPoints" 提煉 3-5 個核心洞見。
4. "sections" 按時間序分段，摘要需具體且有資訊量。
5. 只輸出 JSON，無其他文字。
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
  existingTags: string[] = [],
  userPreferences?: UserPreferences,
  maxRetries = 2
): Promise<SummaryResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateVideoSummary(transcript, videoTitle, existingTags, userPreferences)
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
