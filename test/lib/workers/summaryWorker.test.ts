import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import type { Job } from 'bullmq'
import type { SummaryJobData } from '@/lib/queue/types'
import type { SummaryResult } from '@/lib/ai/types'
import type { TranscriptSegment } from '@/lib/youtube/types'

// Mock all external dependencies
const mockPrismaUpdate = vi.fn()
const mockPrismaFindUnique = vi.fn()
const mockGetVideoTranscript = vi.fn()
const mockGenerateSummaryWithRetry = vi.fn()
const mockCreateSummaryPage = vi.fn()

// Store worker callbacks
let workerJobHandler: ((job: Job<SummaryJobData>) => Promise<any>) | null = null
let workerEventHandlers: Record<string, Function> = {}

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    summary: {
      update: mockPrismaUpdate,
      findUnique: mockPrismaFindUnique,
    },
    video: {
      update: vi.fn(),
    },
  },
}))

// Mock YouTube Client
vi.mock('@/lib/youtube/client', () => ({
  getVideoTranscript: mockGetVideoTranscript,
}))

// Mock AI Summarizer
vi.mock('@/lib/ai/summarizer', () => ({
  generateSummaryWithRetry: mockGenerateSummaryWithRetry,
}))

// Mock Notion Service
vi.mock('@/lib/notion/service', () => ({
  createSummaryPage: mockCreateSummaryPage,
}))

// Mock Redis Connection
vi.mock('@/lib/queue/connection', () => ({
  redisConnection: {},
}))

// Mock BullMQ Worker - 捕獲 job handler 和 event handlers
vi.mock('bullmq', () => {
  class MockWorker {
    constructor(queueName: string, handler: Function, options: any) {
      workerJobHandler = handler as any
    }
    
    on(event: string, callback: Function) {
      workerEventHandlers[event] = callback
      return this
    }
  }
  
  return {
    Worker: MockWorker,
  }
})

describe('Summary Worker', () => {
  // Import worker once to set up handlers
  beforeAll(async () => {
    await import('@/lib/workers/summaryWorker')
  })

  const mockJobData: SummaryJobData = {
    summaryId: 'summary-123',
    videoId: 'video-123',
    youtubeVideoId: 'dQw4w9WgXcQ',
    userId: 'user-123',
  }

  const mockTranscript: TranscriptSegment[] = [
    { timestamp: 0, text: 'Hello world' },
    { timestamp: 120, text: 'This is a test' },
  ]

  const mockSummaryResult: SummaryResult = {
    topic: '測試影片主題',
    keyPoints: ['重點1', '重點2'],
    sections: [
      { timestamp: '00:00', title: '開場', summary: '開場內容' },
      { timestamp: '02:00', title: '主要內容', summary: '主要內容摘要' },
    ],
  }

  const mockJob = {
    id: 'job-456',
    data: mockJobData,
  } as Job<SummaryJobData>

  const mockSummary = {
    id: 'summary-123',
    videoId: 'video-123',
    userId: 'user-123',
    status: 'pending',
    video: {
      id: 'video-123',
      youtubeId: 'dQw4w9WgXcQ',
      title: 'Test Video',
      thumbnail: 'https://example.com/thumb.jpg',
      channel: {
        id: 'channel-123',
        autoSyncNotion: false,
      },
    },
  }

  const mockCompletedSummary = {
    ...mockSummary,
    status: 'completed',
    content: mockSummaryResult,
    completedAt: new Date(),
    video: {
      ...mockSummary.video,
      channel: {
        ...mockSummary.video.channel,
        autoSyncNotion: false,
      },
    },
    user: {
      id: 'user-123',
      notionParentPageId: null,
      accounts: [],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('核心 Worker 處理流程', () => {
    it('應該成功完成完整的影片摘要流程 (不含 Notion 同步)', async () => {
      // Arrange
      mockPrismaUpdate
        .mockResolvedValueOnce({ ...mockSummary, status: 'processing' }) // 第1次: 更新為 processing
        .mockResolvedValueOnce(mockCompletedSummary) // 第2次: 更新為 completed

      mockPrismaFindUnique.mockResolvedValueOnce(mockSummary)
      mockGetVideoTranscript.mockResolvedValueOnce(mockTranscript)
      mockGenerateSummaryWithRetry.mockResolvedValueOnce(mockSummaryResult)

      // Act
      const result = await workerJobHandler!(mockJob)

      // Assert
      expect(result).toEqual({ success: true })

      // 驗證狀態更新順序
      expect(mockPrismaUpdate).toHaveBeenCalledTimes(2)

      // 第1次呼叫: 更新為 processing
      expect(mockPrismaUpdate).toHaveBeenNthCalledWith(1, {
        where: { id: 'summary-123' },
        data: {
          status: 'processing',
          jobId: 'job-456',
        },
      })

      // 第2次呼叫: 更新為 completed
      const completedCall = mockPrismaUpdate.mock.calls[1][0]
      expect(completedCall.where).toEqual({ id: 'summary-123' })
      expect(completedCall.data.status).toBe('completed')
      expect(completedCall.data.content).toEqual(mockSummaryResult)
      expect(completedCall.data.completedAt).toBeInstanceOf(Date)

      // 驗證字幕抓取
      expect(mockGetVideoTranscript).toHaveBeenCalledWith('dQw4w9WgXcQ')

      // 驗證摘要生成
      expect(mockGenerateSummaryWithRetry).toHaveBeenCalledWith(mockTranscript, 'Test Video')

      // Notion 同步不應該被呼叫 (autoSyncNotion = false)
      expect(mockCreateSummaryPage).not.toHaveBeenCalled()
    })

    it('應該成功完成完整流程並自動同步到 Notion', async () => {
      // Arrange
      const summaryWithAutoSync = {
        ...mockSummary,
        video: {
          ...mockSummary.video,
          channel: {
            ...mockSummary.video.channel,
            autoSyncNotion: true,
          },
        },
      }

      const completedWithAutoSync = {
        ...mockCompletedSummary,
        video: {
          ...mockCompletedSummary.video,
          channel: {
            ...mockCompletedSummary.video.channel,
            autoSyncNotion: true,
          },
        },
        user: {
          id: 'user-123',
          notionParentPageId: 'notion-page-123',
          accounts: [
            {
              provider: 'notion',
              access_token: 'notion-token-abc',
            },
          ],
        },
      }

      mockPrismaUpdate
        .mockResolvedValueOnce({ ...summaryWithAutoSync, status: 'processing' })
        .mockResolvedValueOnce(completedWithAutoSync) // 完成主流程
        .mockResolvedValueOnce({ notionSyncStatus: 'PENDING' }) // 設定 PENDING
        .mockResolvedValueOnce({ notionSyncStatus: 'SUCCESS' }) // 設定 SUCCESS

      mockPrismaFindUnique.mockResolvedValueOnce(summaryWithAutoSync)
      mockGetVideoTranscript.mockResolvedValueOnce(mockTranscript)
      mockGenerateSummaryWithRetry.mockResolvedValueOnce(mockSummaryResult)
      mockCreateSummaryPage.mockResolvedValueOnce({ url: 'https://notion.so/page-123' })

      // Act
      const result = await workerJobHandler!(mockJob)

      // Assert
      expect(result).toEqual({ success: true })
      expect(mockPrismaUpdate).toHaveBeenCalledTimes(4)

      // 驗證 Notion 同步
      expect(mockCreateSummaryPage).toHaveBeenCalledWith(
        'notion-token-abc',
        'notion-page-123',
        mockSummaryResult,
        {
          title: 'Test Video',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoId: 'dQw4w9WgXcQ',
          thumbnailUrl: 'https://example.com/thumb.jpg',
        }
      )

      // 驗證 Notion 狀態更新
      expect(mockPrismaUpdate).toHaveBeenNthCalledWith(3, {
        where: { id: 'summary-123' },
        data: { notionSyncStatus: 'PENDING' },
      })

      expect(mockPrismaUpdate).toHaveBeenNthCalledWith(4, {
        where: { id: 'summary-123' },
        data: {
          notionSyncStatus: 'SUCCESS',
          notionUrl: 'https://notion.so/page-123',
        },
      })
    })
  })

  describe('Notion 同步條件判斷', () => {
    it('應該在 autoSyncNotion 為 false 時跳過 Notion 同步', async () => {
      // Arrange
      mockPrismaUpdate
        .mockResolvedValueOnce({ ...mockSummary, status: 'processing' })
        .mockResolvedValueOnce(mockCompletedSummary)

      mockPrismaFindUnique.mockResolvedValueOnce(mockSummary)
      mockGetVideoTranscript.mockResolvedValueOnce(mockTranscript)
      mockGenerateSummaryWithRetry.mockResolvedValueOnce(mockSummaryResult)

      // Act
      await workerJobHandler!(mockJob)

      // Assert
      expect(mockCreateSummaryPage).not.toHaveBeenCalled()
      expect(mockPrismaUpdate).toHaveBeenCalledTimes(2) // 只有 processing 和 completed
    })

    it('應該在缺少 notionParentPageId 時跳過 Notion 同步', async () => {
      // Arrange
      const completedWithoutParentPage = {
        ...mockCompletedSummary,
        video: {
          ...mockCompletedSummary.video,
          channel: {
            ...mockCompletedSummary.video.channel,
            autoSyncNotion: true,
          },
        },
        user: {
          id: 'user-123',
          notionParentPageId: null, // 缺少
          accounts: [
            { provider: 'notion', access_token: 'valid-token' },
          ],
        },
      }

      mockPrismaUpdate
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce(completedWithoutParentPage)

      mockPrismaFindUnique.mockResolvedValueOnce(mockSummary)
      mockGetVideoTranscript.mockResolvedValueOnce(mockTranscript)
      mockGenerateSummaryWithRetry.mockResolvedValueOnce(mockSummaryResult)

      // Act
      await workerJobHandler!(mockJob)

      // Assert
      expect(mockCreateSummaryPage).not.toHaveBeenCalled()
    })

    it('應該在缺少 Notion access_token 時跳過 Notion 同步', async () => {
      // Arrange
      const completedWithoutToken = {
        ...mockCompletedSummary,
        video: {
          ...mockCompletedSummary.video,
          channel: {
            ...mockCompletedSummary.video.channel,
            autoSyncNotion: true,
          },
        },
        user: {
          id: 'user-123',
          notionParentPageId: 'notion-page-123',
          accounts: [], // 沒有 Notion 帳號
        },
      }

      mockPrismaUpdate
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce(completedWithoutToken)

      mockPrismaFindUnique.mockResolvedValueOnce(mockSummary)
      mockGetVideoTranscript.mockResolvedValueOnce(mockTranscript)
      mockGenerateSummaryWithRetry.mockResolvedValueOnce(mockSummaryResult)

      // Act
      await workerJobHandler!(mockJob)

      // Assert
      expect(mockCreateSummaryPage).not.toHaveBeenCalled()
    })

    it('應該在 Notion 同步失敗時記錄錯誤但不影響主流程', async () => {
      // Arrange
      const completedWithAutoSync = {
        ...mockCompletedSummary,
        video: {
          ...mockCompletedSummary.video,
          channel: {
            ...mockCompletedSummary.video.channel,
            autoSyncNotion: true,
          },
        },
        user: {
          id: 'user-123',
          notionParentPageId: 'notion-page-123',
          accounts: [
            { provider: 'notion', access_token: 'valid-token' },
          ],
        },
      }

      mockPrismaUpdate
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce(completedWithAutoSync)
        .mockResolvedValueOnce({ notionSyncStatus: 'PENDING' })
        .mockResolvedValueOnce({ notionSyncStatus: 'FAILED' })

      mockPrismaFindUnique.mockResolvedValueOnce(mockSummary)
      mockGetVideoTranscript.mockResolvedValueOnce(mockTranscript)
      mockGenerateSummaryWithRetry.mockResolvedValueOnce(mockSummaryResult)
      mockCreateSummaryPage.mockRejectedValueOnce(new Error('Notion API Error'))

      // Act
      const result = await workerJobHandler!(mockJob)

      // Assert
      expect(result).toEqual({ success: true }) // 主流程仍然成功

      // 驗證錯誤狀態更新
      expect(mockPrismaUpdate).toHaveBeenNthCalledWith(4, {
        where: { id: 'summary-123' },
        data: {
          notionSyncStatus: 'FAILED',
          notionError: 'Notion API Error',
        },
      })
    })
  })

  describe('錯誤處理 - 資源不存在', () => {
    it('應該在 Summary 不存在時拋出錯誤', async () => {
      // Arrange
      mockPrismaUpdate.mockResolvedValueOnce({ status: 'processing' })
      mockPrismaFindUnique.mockResolvedValueOnce(null) // Summary 不存在

      // Act & Assert
      await expect(workerJobHandler!(mockJob)).rejects.toThrow(
        'Summary summary-123 not found'
      )

      // 驗證狀態已更新為 processing (在查詢之前)
      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'summary-123' },
        data: {
          status: 'processing',
          jobId: 'job-456',
        },
      })
    })
  })

  describe('錯誤處理 - 字幕抓取失敗', () => {
    it('應該在字幕為空時拋出錯誤', async () => {
      // Arrange
      mockPrismaUpdate.mockResolvedValueOnce({ status: 'processing' })
      mockPrismaFindUnique.mockResolvedValueOnce(mockSummary)
      mockGetVideoTranscript.mockResolvedValueOnce([]) // 空陣列

      // Act & Assert
      await expect(workerJobHandler!(mockJob)).rejects.toThrow(
        'No transcript available for this video'
      )
    })

    it('應該在字幕為 null 時拋出錯誤', async () => {
      // Arrange
      mockPrismaUpdate.mockResolvedValueOnce({ status: 'processing' })
      mockPrismaFindUnique.mockResolvedValueOnce(mockSummary)
      mockGetVideoTranscript.mockResolvedValueOnce(null) // null

      // Act & Assert
      await expect(workerJobHandler!(mockJob)).rejects.toThrow(
        'No transcript available for this video'
      )
    })
  })

  describe('錯誤處理 - AI 生成失敗', () => {
    it('應該在 AI 生成摘要失敗時拋出錯誤', async () => {
      // Arrange
      mockPrismaUpdate.mockResolvedValueOnce({ status: 'processing' })
      mockPrismaFindUnique.mockResolvedValueOnce(mockSummary)
      mockGetVideoTranscript.mockResolvedValueOnce(mockTranscript)
      mockGenerateSummaryWithRetry.mockRejectedValueOnce(
        new Error('AI service unavailable')
      )

      // Act & Assert
      await expect(workerJobHandler!(mockJob)).rejects.toThrow(
        'AI service unavailable'
      )

      // 驗證流程在 AI 生成前已完成字幕抓取
      expect(mockGetVideoTranscript).toHaveBeenCalled()
    })
  })

  describe('錯誤處理 - Database 操作失敗', () => {
    it('應該在初始狀態更新失敗時拋出錯誤', async () => {
      // Arrange
      mockPrismaUpdate.mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      // Act & Assert
      await expect(workerJobHandler!(mockJob)).rejects.toThrow(
        'Database connection failed'
      )
    })

    it('應該在最終狀態更新失敗時拋出錯誤', async () => {
      // Arrange
      mockPrismaUpdate
        .mockResolvedValueOnce({ status: 'processing' })
        .mockRejectedValueOnce(new Error('Database write failed')) // 第2次更新失敗

      mockPrismaFindUnique.mockResolvedValueOnce(mockSummary)
      mockGetVideoTranscript.mockResolvedValueOnce(mockTranscript)
      mockGenerateSummaryWithRetry.mockResolvedValueOnce(mockSummaryResult)

      // Act & Assert
      await expect(workerJobHandler!(mockJob)).rejects.toThrow(
        'Database write failed'
      )

      // 驗證字幕和摘要已成功生成
      expect(mockGetVideoTranscript).toHaveBeenCalled()
      expect(mockGenerateSummaryWithRetry).toHaveBeenCalled()
    })
  })

  describe('Worker 事件處理', () => {
    it('應該在 Job 失敗時更新 Summary 狀態為 failed', async () => {
      // Arrange
      mockPrismaUpdate.mockResolvedValueOnce({ status: 'failed' })

      const failedJob = {
        id: 'job-456',
        data: mockJobData,
      } as Job<SummaryJobData>

      const error = new Error('Processing failed')

      // Act
      await workerEventHandlers['failed'](failedJob, error)

      // Assert
      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'summary-123' },
        data: {
          status: 'failed',
          errorMessage: 'Processing failed',
        },
      })
    })

    it('應該在 Job 沒有 summaryId 時不更新 Summary', async () => {
      // Arrange
      const jobWithoutSummaryId = {
        id: 'job-456',
        data: {} as SummaryJobData, // 沒有 summaryId
      } as Job<SummaryJobData>

      const error = new Error('Processing failed')

      // Act
      await workerEventHandlers['failed'](jobWithoutSummaryId, error)

      // Assert
      expect(mockPrismaUpdate).not.toHaveBeenCalled()
    })

    it('應該在 Job 完成時記錄 log', () => {
      // Arrange
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const completedJob = {
        id: 'job-456',
        data: mockJobData,
      } as Job<SummaryJobData>

      // Act
      workerEventHandlers['completed'](completedJob)

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('[Worker] ✅ Job job-456 completed')

      consoleLogSpy.mockRestore()
    })
  })

  describe('資料完整性測試', () => {
    it('應該在完成時載入所有必要的關聯資料', async () => {
      // Arrange
      mockPrismaUpdate
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce(mockCompletedSummary)

      mockPrismaFindUnique.mockResolvedValueOnce(mockSummary)
      mockGetVideoTranscript.mockResolvedValueOnce(mockTranscript)
      mockGenerateSummaryWithRetry.mockResolvedValueOnce(mockSummaryResult)

      // Act
      await workerJobHandler!(mockJob)

      // Assert
      const completedCall = mockPrismaUpdate.mock.calls[1][0]
      expect(completedCall.include).toBeDefined()
      expect(completedCall.include.video).toBeDefined()
      expect(completedCall.include.video.include.channel).toBe(true)
      expect(completedCall.include.user).toBeDefined()
      expect(completedCall.include.user.include.accounts).toEqual({
        where: { provider: 'notion' },
      })
    })

    it('應該處理 Video 沒有 thumbnail 的情況', async () => {
      // Arrange
      const summaryWithoutThumb = {
        ...mockSummary,
        video: {
          ...mockSummary.video,
          thumbnail: null,
          channel: {
            ...mockSummary.video.channel,
            autoSyncNotion: true,
          },
        },
      }

      const completedWithoutThumb = {
        ...mockCompletedSummary,
        video: {
          ...mockCompletedSummary.video,
          thumbnail: null,
          channel: {
            ...mockCompletedSummary.video.channel,
            autoSyncNotion: true,
          },
        },
        user: {
          id: 'user-123',
          notionParentPageId: 'notion-page-123',
          accounts: [
            { provider: 'notion', access_token: 'valid-token' },
          ],
        },
      }

      mockPrismaUpdate
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce(completedWithoutThumb)
        .mockResolvedValueOnce({ notionSyncStatus: 'PENDING' })
        .mockResolvedValueOnce({ notionSyncStatus: 'SUCCESS' })

      mockPrismaFindUnique.mockResolvedValueOnce(summaryWithoutThumb)
      mockGetVideoTranscript.mockResolvedValueOnce(mockTranscript)
      mockGenerateSummaryWithRetry.mockResolvedValueOnce(mockSummaryResult)
      mockCreateSummaryPage.mockResolvedValueOnce({ url: 'https://notion.so/page-123' })

      // Act
      await workerJobHandler!(mockJob)

      // Assert
      const notionCall = mockCreateSummaryPage.mock.calls[0][3]
      expect(notionCall.thumbnailUrl).toBeUndefined() // 應該是 undefined，不是 null
    })
  })
})
