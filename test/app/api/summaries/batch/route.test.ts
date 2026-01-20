import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/summaries/batch/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { addSummaryJob } from '@/lib/queue/summaryQueue'

// Mocks
vi.mock('next-auth')
vi.mock('@/lib/db', () => ({
  prisma: {
    video: {
      findUnique: vi.fn(),
    },
    summary: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))
vi.mock('@/lib/queue/summaryQueue', () => ({
  addSummaryJob: vi.fn(),
}))

describe('Summaries Batch API', () => {
  const mockSession = {
    user: { id: 'user-1' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('權限驗證', () => {
    it('應該在未登入時回傳 401', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(null)
      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds: ['vid-1', 'vid-2'] }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })
  })

  describe('參數驗證', () => {
    it('應該在缺少 videoIds 時回傳 400', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'videoIds array is required' })
    })

    it('應該在 videoIds 不是陣列時回傳 400', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds: 'not-an-array' }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'videoIds array is required' })
    })

    it('應該在 videoIds 是空陣列時回傳 400', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds: [] }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'videoIds array is required' })
    })
  })

  describe('核心功能 - 正常情況', () => {
    it('應該成功批次建立多個摘要', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockVideos = {
        'vid-1': { id: 'vid-1', youtubeId: 'yt-1', duration: 3600 },
        'vid-2': { id: 'vid-2', youtubeId: 'yt-2', duration: 3600 },
      }

      vi.mocked(prisma.video.findUnique).mockImplementation(((args: any) => {
        return Promise.resolve(mockVideos[args.where.id as keyof typeof mockVideos] as any)
      }) as any)

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)
      
      vi.mocked(prisma.summary.create)
        .mockResolvedValueOnce({ id: 'summary-1', videoId: 'vid-1', userId: 'user-1' } as any)
        .mockResolvedValueOnce({ id: 'summary-2', videoId: 'vid-2', userId: 'user-1' } as any)

      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds: ['vid-1', 'vid-2'] }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(2)
      expect(data.results[0]).toEqual({ videoId: 'vid-1', status: 'created', id: 'summary-1' })
      expect(data.results[1]).toEqual({ videoId: 'vid-2', status: 'created', id: 'summary-2' })
      expect(prisma.summary.create).toHaveBeenCalledTimes(2)
      expect(addSummaryJob).toHaveBeenCalledTimes(2)
    })

    it('應該批次處理時跳過不存在的影片', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(prisma.video.findUnique).mockImplementation(((args: any) => {
        const videoId = args.where.id
        if (videoId === 'vid-999') return Promise.resolve(null)
        return Promise.resolve({ id: videoId, youtubeId: `yt-${videoId}`, duration: 3600 } as any)
      }) as any)

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)
      
      vi.mocked(prisma.summary.create)
        .mockResolvedValueOnce({ id: 'summary-1', videoId: 'vid-1' } as any)
        .mockResolvedValueOnce({ id: 'summary-2', videoId: 'vid-2' } as any)

      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds: ['vid-1', 'vid-999', 'vid-2'] }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(2)
      expect(data.results.find((r: any) => r.videoId === 'vid-999')).toBeUndefined()
      expect(prisma.summary.create).toHaveBeenCalledTimes(2)
    })
  })

  describe('核心功能 - 部分成功情況', () => {
    it('應該在部分影片已有摘要時標記 already_exists', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(prisma.video.findUnique).mockImplementation(((args: any) => {
        const videoId = args.where.id
        return Promise.resolve({ id: videoId, youtubeId: `yt-${videoId}`, duration: 3600 } as any)
      }) as any)

      vi.mocked(prisma.summary.findFirst).mockImplementation(((args: any) => {
        const videoId = args.where.videoId
        if (videoId === 'vid-2') {
          return Promise.resolve({ id: 'existing-summary-2', videoId: 'vid-2' } as any)
        }
        return Promise.resolve(null)
      }) as any)

      vi.mocked(prisma.summary.create)
        .mockResolvedValueOnce({ id: 'new-summary-1', videoId: 'vid-1' } as any)
        .mockResolvedValueOnce({ id: 'new-summary-3', videoId: 'vid-3' } as any)

      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds: ['vid-1', 'vid-2', 'vid-3'] }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(3)
      expect(data.results[0]).toEqual({ videoId: 'vid-1', status: 'created', id: 'new-summary-1' })
      expect(data.results[1]).toEqual({ videoId: 'vid-2', status: 'already_exists', id: 'existing-summary-2' })
      expect(data.results[2]).toEqual({ videoId: 'vid-3', status: 'created', id: 'new-summary-3' })
      expect(prisma.summary.create).toHaveBeenCalledTimes(2)
    })

    it('應該在部分影片過長時標記錯誤', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(prisma.video.findUnique).mockImplementation(((args: any) => {
        const videoId = args.where.id
        const durations: Record<string, number> = {
          'vid-1': 3600,      // 1 hour
          'vid-2': 11000,     // > 3 hours
          'vid-3': 7200,      // 2 hours
        }
        return Promise.resolve({ id: videoId, youtubeId: `yt-${videoId}`, duration: durations[videoId] } as any)
      }) as any)

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)
      
      vi.mocked(prisma.summary.create)
        .mockResolvedValueOnce({ id: 'summary-1', videoId: 'vid-1' } as any)
        .mockResolvedValueOnce({ id: 'summary-3', videoId: 'vid-3' } as any)

      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds: ['vid-1', 'vid-2', 'vid-3'] }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(3)
      expect(data.results[0]).toEqual({ videoId: 'vid-1', status: 'created', id: 'summary-1' })
      expect(data.results[1]).toEqual({ videoId: 'vid-2', status: 'error', error: 'Video too long (>3h)' })
      expect(data.results[2]).toEqual({ videoId: 'vid-3', status: 'created', id: 'summary-3' })
      expect(prisma.summary.create).toHaveBeenCalledTimes(2)
    })

    it('應該允許剛好 3 小時的影片建立摘要', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(prisma.video.findUnique).mockResolvedValue({
        id: 'vid-1',
        youtubeId: 'yt-1',
        duration: 10800, // 剛好 3 小時
      } as any)

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.summary.create).mockResolvedValue({ id: 'summary-1', videoId: 'vid-1' } as any)
      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds: ['vid-1'] }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results[0]).toEqual({ videoId: 'vid-1', status: 'created', id: 'summary-1' })
    })

    it('應該正確處理混合多種狀態的批次', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(prisma.video.findUnique).mockImplementation(((args: any) => {
        const videoId = args.where.id
        const videos: Record<string, any> = {
          'vid-1': { id: 'vid-1', youtubeId: 'yt-1', duration: 3600 },
          'vid-2': { id: 'vid-2', youtubeId: 'yt-2', duration: 3600 },
          'vid-3': { id: 'vid-3', youtubeId: 'yt-3', duration: 11000 },
          'vid-999': null,
          'vid-4': { id: 'vid-4', youtubeId: 'yt-4', duration: 3600 },
        }
        return Promise.resolve(videos[videoId])
      }) as any)

      vi.mocked(prisma.summary.findFirst).mockImplementation(((args: any) => {
        if (args.where.videoId === 'vid-2') {
          return Promise.resolve({ id: 'existing-summary-2', videoId: 'vid-2' } as any)
        }
        return Promise.resolve(null)
      }) as any)

      vi.mocked(prisma.summary.create)
        .mockResolvedValueOnce({ id: 'summary-1', videoId: 'vid-1' } as any)
        .mockResolvedValueOnce({ id: 'summary-4', videoId: 'vid-4' } as any)

      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds: ['vid-1', 'vid-2', 'vid-3', 'vid-999', 'vid-4'] }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(4) // vid-999 被跳過
      expect(data.results[0].status).toBe('created')
      expect(data.results[1].status).toBe('already_exists')
      expect(data.results[2].status).toBe('error')
      expect(data.results[3].status).toBe('created')
      expect(prisma.summary.create).toHaveBeenCalledTimes(2)
    })
  })

  describe('外部依賴處理', () => {
    it('應該在 Database 建立摘要失敗時記錄錯誤', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(prisma.video.findUnique).mockImplementation(((args: any) => {
        const videoId = args.where.id
        return Promise.resolve({ id: videoId, youtubeId: `yt-${videoId}`, duration: 3600 } as any)
      }) as any)

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)
      
      vi.mocked(prisma.summary.create)
        .mockResolvedValueOnce({ id: 'summary-1', videoId: 'vid-1' } as any)
        .mockRejectedValueOnce(new Error('Database error'))

      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds: ['vid-1', 'vid-2'] }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results[0]).toEqual({ videoId: 'vid-1', status: 'created', id: 'summary-1' })
      expect(data.results[1]).toEqual({ videoId: 'vid-2', status: 'error' })
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('應該在 Queue 新增任務失敗時記錄錯誤', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(prisma.video.findUnique).mockImplementation(((args: any) => {
        const videoId = args.where.id
        return Promise.resolve({ id: videoId, youtubeId: `yt-${videoId}`, duration: 3600 } as any)
      }) as any)

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)
      
      vi.mocked(prisma.summary.create)
        .mockResolvedValueOnce({ id: 'summary-1', videoId: 'vid-1' } as any)
        .mockResolvedValueOnce({ id: 'summary-2', videoId: 'vid-2' } as any)

      vi.mocked(addSummaryJob)
        .mockResolvedValueOnce(undefined as any)
        .mockRejectedValueOnce(new Error('Queue error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds: ['vid-1', 'vid-2'] }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results[0]).toEqual({ videoId: 'vid-1', status: 'created', id: 'summary-1' })
      expect(data.results[1]).toEqual({ videoId: 'vid-2', status: 'error' })
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('資料完整性', () => {
    it('應該正確實現資料隔離 - 只檢查當前使用者的摘要', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(prisma.video.findUnique).mockResolvedValue({
        id: 'vid-1',
        youtubeId: 'yt-1',
        duration: 3600,
      } as any)

      // vid-1 已有 user-2 的摘要，但不應影響 user-1
      vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.summary.create).mockResolvedValue({
        id: 'new-summary-1',
        videoId: 'vid-1',
        userId: 'user-1',
      } as any)
      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds: ['vid-1'] }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results[0]).toEqual({ videoId: 'vid-1', status: 'created', id: 'new-summary-1' })
      expect(prisma.summary.findFirst).toHaveBeenCalledWith({
        where: {
          videoId: 'vid-1',
          userId: 'user-1',
        },
      })
    })

    it('應該正確處理批次處理大量影片 (10 個)', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(prisma.video.findUnique).mockImplementation(((args: any) => {
        const videoId = args.where.id
        return Promise.resolve({ id: videoId, youtubeId: `yt-${videoId}`, duration: 3600 } as any)
      }) as any)

      vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)
      
      const mockSummaries = Array.from({ length: 10 }, (_, i) => ({
        id: `summary-${i + 1}`,
        videoId: `vid-${i + 1}`,
      }))

      mockSummaries.forEach((summary) => {
        vi.mocked(prisma.summary.create).mockResolvedValueOnce(summary as any)
      })

      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      const videoIds = Array.from({ length: 10 }, (_, i) => `vid-${i + 1}`)
      const request = new Request('http://localhost/api/summaries/batch', {
        method: 'POST',
        body: JSON.stringify({ videoIds }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(10)
      expect(data.results.every((r: any) => r.status === 'created')).toBe(true)
      expect(prisma.summary.create).toHaveBeenCalledTimes(10)
      expect(addSummaryJob).toHaveBeenCalledTimes(10)
    })
  })
})
