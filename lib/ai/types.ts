export interface SummaryResult {
  topic: string
  keyPoints: string[]
  sections: {
    timestamp: string
    title: string
    summary: string
  }[]
}
