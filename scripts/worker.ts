import { summaryWorker } from '@/lib/workers/summaryWorker'
import { ttsWorker } from '@/lib/workers/ttsWorker'

console.log('🚀 Worker started (Summary + TTS)')

process.on('SIGTERM', async () => {
  console.log('Shutting down workers...')
  await Promise.all([
    summaryWorker.close(),
    ttsWorker.close(),
  ])
  process.exit(0)
})
