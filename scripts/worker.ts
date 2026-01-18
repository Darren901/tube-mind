import { summaryWorker } from '@/lib/workers/summaryWorker'

console.log('🚀 Worker started')

process.on('SIGTERM', async () => {
  console.log('Shutting down worker...')
  await summaryWorker.close()
  process.exit(0)
})
