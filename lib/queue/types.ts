export interface SummaryJobData {
  summaryId: string
  videoId: string
  youtubeVideoId: string
  userId: string
}

export interface TTSJobData {
  summaryId: string
  youtubeVideoId: string // 用於 logging
}
