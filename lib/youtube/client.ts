import { google } from 'googleapis'
import { YoutubeTranscript } from 'youtube-transcript-plus'
import type { YouTubeChannel, YouTubeVideo, TranscriptSegment } from './types'

export class YouTubeClient {
  private youtube

  constructor(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    this.youtube = google.youtube({ version: 'v3', auth: oauth2Client })
  }

  async getSubscriptions(): Promise<YouTubeChannel[]> {
    let allSubscriptions: YouTubeChannel[] = []
    let nextPageToken: string | undefined = undefined

    do {
      const response: any = await this.youtube.subscriptions.list({
        part: ['snippet'],
        mine: true,
        maxResults: 50,
        pageToken: nextPageToken,
      })

      const items = (response.data.items || []).map((item: any) => ({
        id: item.snippet?.resourceId?.channelId || '',
        title: item.snippet?.title || '',
        description: item.snippet?.description || undefined,
        thumbnail: item.snippet?.thumbnails?.high?.url || undefined,
      }))

      allSubscriptions = [...allSubscriptions, ...items]
      nextPageToken = response.data.nextPageToken

    } while (nextPageToken)

    return allSubscriptions
  }

  async getChannelDetails(channelId: string): Promise<YouTubeChannel | null> {
    const response = await this.youtube.channels.list({
      part: ['snippet'],
      id: [channelId],
    })

    const item = response.data.items?.[0]
    if (!item) return null

    return {
      id: item.id!,
      title: item.snippet?.title || '',
      description: item.snippet?.description || undefined,
      thumbnail: item.snippet?.thumbnails?.high?.url || undefined,
    }
  }

  async getChannelVideos(channelId: string, maxResults = 50): Promise<YouTubeVideo[]> {
    const response = await this.youtube.search.list({
      part: ['snippet'],
      channelId,
      type: ['video'],
      order: 'date',
      maxResults,
    })

    const videoIds = (response.data.items || [])
      .map(item => item.id?.videoId)
      .filter(Boolean) as string[]

    if (videoIds.length === 0) return []

    // 取得影片詳細資訊（包含時長）
    const detailsResponse = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds,
    })

    return (detailsResponse.data.items || []).map(item => ({
      id: item.id!,
      title: item.snippet?.title || '',
      description: item.snippet?.description || undefined,
      thumbnail: item.snippet?.thumbnails?.high?.url || undefined,
      publishedAt: new Date(item.snippet?.publishedAt!),
      duration: this.parseDuration(item.contentDetails?.duration || 'PT0S'),
    }))
  }

  async getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
    const response = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: [videoId],
    })

    const item = response.data.items?.[0]
    if (!item) return null

    return {
      id: item.id!,
      title: item.snippet?.title || '',
      description: item.snippet?.description || undefined,
      thumbnail: item.snippet?.thumbnails?.high?.url || undefined,
      publishedAt: new Date(item.snippet?.publishedAt!),
      duration: this.parseDuration(item.contentDetails?.duration || 'PT0S'),
      channelId: item.snippet?.channelId || undefined,
    }
  }

  private parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0

    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')

    return hours * 3600 + minutes * 60 + seconds
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;#39;/g, "'")
    .replace(/&amp;quot;/g, '"')
    .replace(/&amp;amp;/g, '&')
    .replace(/&amp;lt;/g, '<')
    .replace(/&amp;gt;/g, '>')
}

export async function getVideoTranscript(videoId: string): Promise<TranscriptSegment[]> {
  // 定義嘗試順序：英文 -> 中文(繁體) -> 中文 -> 自動/預設
  const configs = [
    { lang: 'en' },
    { lang: 'zh-TW' },
    { lang: 'zh' },
    undefined // 不指定，讓它抓預設
  ]

  for (const config of configs) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, config)
      
      // 確保真的有抓到內容
      if (transcript && transcript.length > 0) {
        return transcript.map(item => ({
          timestamp: item.offset,
          text: decodeHtmlEntities(item.text),
        }))
      }
    } catch (e) {
      // 忽略錯誤，繼續下一個嘗試
      continue
    }
  }

  // 全部都失敗，嘗試 Fallback (回傳一個假字幕，讓 Gemini 生成「無字幕」的摘要)
  console.warn(`[Video ${videoId}] No transcript found after retries. Using fallback.`)
  
  return [{
    timestamp: 0,
    text: "This video does not have available captions or transcripts. Please summarize the video based on its title and description only, noting that detailed content is unavailable."
  }]
}
