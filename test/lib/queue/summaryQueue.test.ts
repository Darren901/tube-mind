import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies (hoisted)
const { mockQueueAdd } = vi.hoisted(() => ({
  mockQueueAdd: vi.fn(),
}))

vi.mock('bullmq', () => {
  return {
    Queue: class {
      add = mockQueueAdd
    },
  }
})

vi.mock('@/lib/queue/connection', () => ({
  redisConnection: {},
}))

// Import after mocks
import { addSummaryJob } from '@/lib/queue/summaryQueue'

describe('Summary Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addSummaryJob', () => {
    it('應該成功加入摘要任務', async () => {
      // Arrange
      const jobData = {
        summaryId: 'summary-123',
        videoId: 'video-123',
        youtubeVideoId: 'abc12345',
        userId: 'user-123',
      }
      mockQueueAdd.mockResolvedValue({ id: 'job-123' })

      // Act
      await addSummaryJob(jobData)

      // Assert
      expect(mockQueueAdd).toHaveBeenCalledWith(
        'process-summary',
        jobData,
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        })
      )
    })

    it('應該在 Queue.add 失敗時拋出錯誤', async () => {
      // Arrange
      const jobData = {
        summaryId: 'summary-123',
        videoId: 'video-123',
        youtubeVideoId: 'abc12345',
        userId: 'user-123',
      }
      mockQueueAdd.mockRejectedValue(new Error('Redis connection failed'))

      // Act & Assert
      await expect(addSummaryJob(jobData)).rejects.toThrow('Redis connection failed')
    })
  })
})
