import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, DELETE } from '@/app/api/summaries/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

// Mocks
vi.mock('next-auth')
vi.mock('@/lib/db', () => ({
  prisma: {
    summary: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('Summaries by ID API', () => {
  const mockSession = {
    user: { id: 'user-1' },
  }
  const mockParams = { params: { id: 'summary-1' } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET - 獲取單一摘要', () => {
    describe('權限驗證', () => {
      it('應該在未登入時回傳 401', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(null)
        const request = new Request('http://localhost/api/summaries/summary-1')

        // Act
        const response = await GET(request, mockParams)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(401)
        expect(data).toEqual({ error: 'Unauthorized' })
      })

      it('應該在嘗試獲取不存在的摘要時回傳 404', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)

        const request = new Request('http://localhost/api/summaries/non-existent')
        const params = { params: { id: 'non-existent' } }

        // Act
        const response = await GET(request, params)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(404)
        expect(data).toEqual({ error: 'Summary not found' })
      })

      it('應該在嘗試獲取其他使用者的摘要時回傳 404', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)

        const request = new Request('http://localhost/api/summaries/summary-2')
        const params = { params: { id: 'summary-2' } }

        // Act
        const response = await GET(request, params)
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
            video: {
              include: {
                channel: true,
              },
            },
          },
        })
      })
    })

    describe('核心功能', () => {
      it('應該成功獲取自己的摘要詳情', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

        const mockSummary = {
          id: 'summary-1',
          videoId: 'vid-1',
          userId: 'user-1',
          status: 'completed',
          content: { summary: 'Test summary', keyPoints: ['point1', 'point2'] },
          video: {
            id: 'vid-1',
            title: 'Test Video',
            youtubeId: 'yt-123',
            channel: {
              id: 'channel-1',
              title: 'Test Channel',
            },
          },
        }

        vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)

        const request = new Request('http://localhost/api/summaries/summary-1')

        // Act
        const response = await GET(request, mockParams)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(data.id).toBe('summary-1')
        expect(data.status).toBe('completed')
        expect(data.content).toEqual({ summary: 'Test summary', keyPoints: ['point1', 'point2'] })
        expect(data.video).toBeDefined()
        expect(data.video.channel).toBeDefined()
        expect(prisma.summary.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'summary-1',
            userId: 'user-1',
          },
          include: {
            video: {
              include: {
                channel: true,
              },
            },
          },
        })
      })

      it('應該成功獲取 completed 狀態的摘要', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

        const mockSummary = {
          id: 'summary-1',
          status: 'completed',
          content: { summary: 'Detailed summary', keyPoints: ['A', 'B', 'C'] },
          video: {
            id: 'vid-1',
            channel: { id: 'channel-1' },
          },
        }

        vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)

        const request = new Request('http://localhost/api/summaries/summary-1')

        // Act
        const response = await GET(request, mockParams)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(data.status).toBe('completed')
        expect(data.content).toHaveProperty('summary')
        expect(data.content).toHaveProperty('keyPoints')
      })

      it('應該成功獲取 failed 狀態的摘要', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

        const mockSummary = {
          id: 'summary-1',
          status: 'failed',
          errorMessage: 'API quota exceeded',
          content: {},
          video: {
            id: 'vid-1',
            channel: { id: 'channel-1' },
          },
        }

        vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)

        const request = new Request('http://localhost/api/summaries/summary-1')

        // Act
        const response = await GET(request, mockParams)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(data.status).toBe('failed')
        expect(data.errorMessage).toBe('API quota exceeded')
      })

      it('應該正確實現資料隔離 - 只能獲取自己的摘要', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

        const mockSummary = {
          id: 'summary-1',
          userId: 'user-1',
          video: {
            id: 'vid-1',
            channel: { id: 'channel-1' },
          },
        }

        vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)

        const request = new Request('http://localhost/api/summaries/summary-1')

        // Act
        await GET(request, mockParams)

        // Assert
        expect(prisma.summary.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'summary-1',
            userId: 'user-1',
          },
          include: expect.any(Object),
        })
      })
    })
  })

  describe('DELETE - 刪除單一摘要', () => {
    describe('權限驗證', () => {
      it('應該在未登入時回傳 401', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(null)
        const request = new Request('http://localhost/api/summaries/summary-1', {
          method: 'DELETE',
        })

        // Act
        const response = await DELETE(request, mockParams)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(401)
        expect(data).toEqual({ error: 'Unauthorized' })
      })

      it('應該在嘗試刪除不存在的摘要時回傳 404', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)

        const request = new Request('http://localhost/api/summaries/non-existent', {
          method: 'DELETE',
        })
        const params = { params: { id: 'non-existent' } }

        // Act
        const response = await DELETE(request, params)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(404)
        expect(data).toEqual({ error: 'Summary not found' })
        expect(prisma.summary.delete).not.toHaveBeenCalled()
      })

      it('應該在嘗試刪除其他使用者的摘要時回傳 404', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)

        const request = new Request('http://localhost/api/summaries/summary-2', {
          method: 'DELETE',
        })
        const params = { params: { id: 'summary-2' } }

        // Act
        const response = await DELETE(request, params)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(404)
        expect(data).toEqual({ error: 'Summary not found' })
        expect(prisma.summary.delete).not.toHaveBeenCalled()
      })
    })

    describe('核心功能', () => {
      it('應該成功刪除自己的摘要', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

        const mockSummary = {
          id: 'summary-1',
          userId: 'user-1',
        }

        vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)
        vi.mocked(prisma.summary.delete).mockResolvedValue(mockSummary as any)

        const request = new Request('http://localhost/api/summaries/summary-1', {
          method: 'DELETE',
        })

        // Act
        const response = await DELETE(request, mockParams)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(data).toEqual({ success: true })
        expect(prisma.summary.delete).toHaveBeenCalledWith({
          where: { id: 'summary-1' },
        })
      })

      it('應該正確實現資料隔離 - 只能刪除自己的摘要', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

        const mockSummary = {
          id: 'summary-1',
          userId: 'user-1',
        }

        vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)
        vi.mocked(prisma.summary.delete).mockResolvedValue(mockSummary as any)

        const request = new Request('http://localhost/api/summaries/summary-1', {
          method: 'DELETE',
        })

        // Act
        await DELETE(request, mockParams)

        // Assert
        expect(prisma.summary.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'summary-1',
            userId: 'user-1',
          },
        })
      })
    })

    describe('外部依賴處理', () => {
      it('應該在 Database 刪除失敗時拋出錯誤', async () => {
        // Arrange
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

        const mockSummary = {
          id: 'summary-1',
          userId: 'user-1',
        }

        vi.mocked(prisma.summary.findFirst).mockResolvedValue(mockSummary as any)
        vi.mocked(prisma.summary.delete).mockRejectedValue(new Error('Database error'))

        const request = new Request('http://localhost/api/summaries/summary-1', {
          method: 'DELETE',
        })

        // Act & Assert
        await expect(DELETE(request, mockParams)).rejects.toThrow('Database error')
      })
    })
  })
})
