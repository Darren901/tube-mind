import { Queue } from 'bullmq'
import { redisConnection } from './connection'
import type { TTSJobData } from './types'

export const ttsQueue = new Queue<TTSJobData>('tts-audio', {
  connection: redisConnection as any,
})

export async function addTTSJob(data: TTSJobData) {
  return await ttsQueue.add('generate-audio', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  })
}
