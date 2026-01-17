export interface YouTubeChannel {
  id: string
  title: string
  description?: string
  thumbnail?: string
}

export interface YouTubeVideo {
  id: string
  title: string
  description?: string
  thumbnail?: string
  publishedAt: Date
  duration: number
}

export interface TranscriptSegment {
  timestamp: number
  text: string
}
