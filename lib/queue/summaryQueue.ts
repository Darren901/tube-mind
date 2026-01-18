import { Queue } from 'bullmq'
import { redisConnection } from './connection'
import type { SummaryJobData } from './types'

export const summaryQueue = new Queue<SummaryJobData>('video-summary', {
  connection: redisConnection as any,
})

export async function addSummaryJob(data: SummaryJobData) {
  return await summaryQueue.add('process-summary', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  })
}
