import { google } from 'googleapis'
import { YoutubeTranscript } from 'youtube-transcript'
import type { YouTubeChannel, YouTubeVideo, TranscriptSegment } from './types'

export class YouTubeClient {
  private youtube

  constructor(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    this.youtube = google.youtube({ version: 'v3', auth: oauth2Client })
  }

  async getSubscriptions(): Promise<YouTubeChannel[]> {
    const response = await this.youtube.subscriptions.list({
      part: ['snippet'],
      mine: true,
      maxResults: 50,
    })

    return (response.data.items || []).map(item => ({
      id: item.snippet?.resourceId?.channelId || '',
      title: item.snippet?.title || '',
      description: item.snippet?.description || undefined,
      thumbnail: item.snippet?.thumbnails?.high?.url || undefined,
    }))
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

  private parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0

    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')

    return hours * 3600 + minutes * 60 + seconds
  }
}

export async function getVideoTranscript(videoId: string): Promise<TranscriptSegment[]> {
  try {
    // 優先取英文字幕
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en',
    })
    return transcript.map(item => ({
      timestamp: item.offset,
      text: item.text,
    }))
  } catch {
    // 沒有英文字幕，取自動生成字幕
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
    return transcript.map(item => ({
      timestamp: item.offset,
      text: item.text,
    }))
  }
}
