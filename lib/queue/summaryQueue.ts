import { Queue } from 'bullmq'
import { redisConnection } from './connection'
import type { SummaryJobData } from './types'
import { enforceQuota } from '@/lib/quota/dailyLimit'
import { LIMITS } from '@/lib/constants/limits'

export const summaryQueue = new Queue<SummaryJobData>('video-summary', {
  connection: redisConnection as any,
})

/**
 * 檢查使用者目前的待處理任務數量
 */
async function getPendingJobsCount(userId: string): Promise<number> {
  const jobs = await summaryQueue.getJobs(['waiting', 'active', 'delayed'])
  return jobs.filter(job => job.data.userId === userId).length
}

/**
 * 新增摘要生成任務（含每日額度與待處理任務上限檢查）
 * @throws Error 當使用者超過每日額度或待處理任務上限
 */
export async function addSummaryJob(data: SummaryJobData) {
  // 1. 檢查每日額度（滾動 24 小時，手動 + 自動總和）
  await enforceQuota(data.userId)
  
  // 2. 檢查待處理任務數
  const pendingCount = await getPendingJobsCount(data.userId)
  
  if (pendingCount >= LIMITS.MAX_PENDING_JOBS_PER_USER) {
    throw new Error(
      `已達到待處理任務上限（${LIMITS.MAX_PENDING_JOBS_PER_USER} 個）。請等待現有任務完成後再試。`
    )
  }
  
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
