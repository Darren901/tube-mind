import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/summaries/[id]/retry/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { addSummaryJob } from '@/lib/queue/summaryQueue'

// Mocks
vi.mock('next-auth')
vi.mock('@/lib/db', () => ({
  prisma: {
    summary: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))
vi.mock('@/lib/queue/summaryQueue', () => ({
  addSummaryJob: vi.fn(),
}))

describe('Summaries Retry API', () => {
  const mockSession = {
    user: { id: 'user-1' },
  }
  const mockParams = { params: { id: 'summary-1' } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('權限驗證', () => {
    it('應該在未登入時回傳 401', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(null)
      const request = new Request('http://localhost/api/summaries/summary-1/retry', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('應該在嘗試重試不存在的摘要時回傳 404', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)

      const request = new Request('http://localhost/api/summaries/non-existent/retry', {
        method: 'POST',
      })
      const params = { params: { id: 'non-existent' } }

      // Act
      const response = await POST(request, params)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Summary not found' })
    })

    it('應該在嘗試重試其他使用者的摘要時回傳 404', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.summary.findFirst).mockResolvedValue(null) // userId 不匹配

      const request = new Request('http://localhost/api/summaries/summary-2/retry', {
        method: 'POST',
      })
      const params = { params: { id: 'summary-2' } }

      // Act
      const response = await POST(request, params)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Summary not found' })
      expect(prisma.summary.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'summary-2',
          userId: 'user-1',
        },
        include: {
          video: true,
        },
      })
    })
  })

  describe('核心功能', () => {
    it('應該成功重試失敗的摘要', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSummary = {
        id: 'summary-1',
        videoId: 'vid-1',
        userId: 'user-1',
        status: 'failed',
        errorMessage: 'API quota exceeded',
        content: { error: 'Previous error' },
        video: {
          id: 'vid-1',
          youtubeId: 'yt-123',
        },
      }

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)
      vi.mocked(prisma.summary.update).mockResolvedValue(mockSummary as any)
      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/summary-1/retry', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(prisma.summary.update).toHaveBeenCalledWith({
        where: { id: 'summary-1' },
        data: {
          status: 'pending',
          errorMessage: null,
          content: {},
        },
      })
      expect(addSummaryJob).toHaveBeenCalledWith({
        summaryId: 'summary-1',
        videoId: 'vid-1',
        youtubeVideoId: 'yt-123',
        userId: 'user-1',
      })
    })

    it('應該可以重試 pending 狀態的摘要', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSummary = {
        id: 'summary-1',
        videoId: 'vid-1',
        userId: 'user-1',
        status: 'pending',
        errorMessage: null,
        content: {},
        video: {
          id: 'vid-1',
          youtubeId: 'yt-123',
        },
      }

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)
      vi.mocked(prisma.summary.update).mockResolvedValue(mockSummary as any)
      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/summary-1/retry', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(prisma.summary.update).toHaveBeenCalled()
      expect(addSummaryJob).toHaveBeenCalled()
    })

    it('應該可以重試 completed 狀態的摘要', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSummary = {
        id: 'summary-1',
        videoId: 'vid-1',
        userId: 'user-1',
        status: 'completed',
        errorMessage: null,
        content: { summary: 'Existing summary', keyPoints: ['point1'] },
        video: {
          id: 'vid-1',
          youtubeId: 'yt-123',
        },
      }

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)
      vi.mocked(prisma.summary.update).mockResolvedValue(mockSummary as any)
      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/summary-1/retry', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(prisma.summary.update).toHaveBeenCalledWith({
        where: { id: 'summary-1' },
        data: {
          status: 'pending',
          errorMessage: null,
          content: {}, // content 被重置
        },
      })
    })

    it('應該正確實現資料隔離 - 只能重試自己的摘要', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSummary = {
        id: 'summary-1',
        videoId: 'vid-1',
        userId: 'user-1',
        status: 'failed',
        video: {
          id: 'vid-1',
          youtubeId: 'yt-123',
        },
      }

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)
      vi.mocked(prisma.summary.update).mockResolvedValue(mockSummary as any)
      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/summary-1/retry', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)

      // Assert
      expect(response.status).toBe(200)
      expect(prisma.summary.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'summary-1',
          userId: 'user-1', // 確保只查詢當前使用者的摘要
        },
        include: {
          video: true,
        },
      })
    })
  })

  describe('外部依賴處理', () => {
    it('應該在 Database 更新失敗時拋出錯誤', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSummary = {
        id: 'summary-1',
        videoId: 'vid-1',
        userId: 'user-1',
        status: 'failed',
        video: {
          id: 'vid-1',
          youtubeId: 'yt-123',
        },
      }

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)
      vi.mocked(prisma.summary.update).mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost/api/summaries/summary-1/retry', {
        method: 'POST',
      })

      // Act & Assert
      await expect(POST(request, mockParams)).rejects.toThrow('Database error')
      expect(addSummaryJob).not.toHaveBeenCalled()
    })

    it('應該在 Queue 新增任務失敗時拋出錯誤', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSummary = {
        id: 'summary-1',
        videoId: 'vid-1',
        userId: 'user-1',
        status: 'failed',
        video: {
          id: 'vid-1',
          youtubeId: 'yt-123',
        },
      }

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)
      vi.mocked(prisma.summary.update).mockResolvedValue(mockSummary as any)
      vi.mocked(addSummaryJob).mockRejectedValue(new Error('Queue error'))

      const request = new Request('http://localhost/api/summaries/summary-1/retry', {
        method: 'POST',
      })

      // Act & Assert
      await expect(POST(request, mockParams)).rejects.toThrow('Queue error')
      // Summary 狀態已更新 (部分成功)
      expect(prisma.summary.update).toHaveBeenCalled()
    })
  })

  describe('資料完整性', () => {
    it('應該在重試時包含完整的 video 資料', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSummary = {
        id: 'summary-1',
        videoId: 'vid-1',
        userId: 'user-1',
        status: 'failed',
        video: {
          id: 'vid-1',
          youtubeId: 'yt-123',
          title: 'Test Video',
        },
      }

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)
      vi.mocked(prisma.summary.update).mockResolvedValue(mockSummary as any)
      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/summary-1/retry', {
        method: 'POST',
      })

      // Act
      await POST(request, mockParams)

      // Assert
      expect(prisma.summary.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: {
          video: true, // 確保包含 video 資料
        },
      })
      expect(addSummaryJob).toHaveBeenCalledWith(
        expect.objectContaining({
          youtubeVideoId: 'yt-123', // 確保傳遞了 youtubeVideoId
        })
      )
    })

    it('應該在重置時清除 errorMessage 和 content', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSummary = {
        id: 'summary-1',
        videoId: 'vid-1',
        userId: 'user-1',
        status: 'failed',
        errorMessage: 'Previous error',
        content: { oldData: 'should be cleared' },
        video: {
          id: 'vid-1',
          youtubeId: 'yt-123',
        },
      }

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)
      vi.mocked(prisma.summary.update).mockResolvedValue(mockSummary as any)
      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/summary-1/retry', {
        method: 'POST',
      })

      // Act
      await POST(request, mockParams)

      // Assert
      expect(prisma.summary.update).toHaveBeenCalledWith({
        where: { id: 'summary-1' },
        data: {
          status: 'pending',
          errorMessage: null, // 清除錯誤訊息
          content: {},        // 清除內容
        },
      })
    })
  })
})
