export type SummaryEvent =
  | { type: 'summary_processing' }
  | { type: 'summary_completed'; data: { content: any } }
  | { type: 'summary_failed'; error: string }
  | { type: 'audio_generating' }
  | { type: 'audio_completed'; data: { audioUrl: string } }
  | { type: 'audio_failed'; error: string }
