import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/cron/check-new-videos/route'
import { prisma } from '@/lib/db'
import { YouTubeClient } from '@/lib/youtube/client'
import { addSummaryJob } from '@/lib/queue/summaryQueue'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    channel: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
    },
    video: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    summary: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/youtube/client', () => {
  return {
    YouTubeClient: vi.fn(),
  }
})

vi.mock('@/lib/queue/summaryQueue')

describe('Cron Check New Videos API', () => {
  const CRON_SECRET = 'test-secret-123'
  
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  describe('權限驗證', () => {
    it('應該在缺少 Authorization header 時回傳 401', async () => {
      // Arrange
      const request = new Request('http://localhost/api/cron/check-new-videos')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('應該在 Authorization token 錯誤時回傳 401', async () => {
      // Arrange
      const request = new Request('http://localhost/api/cron/check-new-videos', {
        headers: {
          'Authorization': 'Bearer wrong-token',
        },
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('應該使用正確的 CRON_SECRET 通過驗證', async () => {
      // Arrange
      const request = new Request('http://localhost/api/cron/check-new-videos', {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      })
      vi.mocked(prisma.channel.findMany).mockResolvedValue([])

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(200)
    })
  })

  describe('核心功能', () => {
    it('應該在沒有啟用自動刷新的頻道時回傳成功', async () => {
      // Arrange
      const request = new Request('http://localhost/api/cron/check-new-videos', {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      })
      vi.mocked(prisma.channel.findMany).mockResolvedValue([])

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(expect.objectContaining({
        success: true,
        newVideos: 0,
        channelsChecked: 0,
      }))
    })

    it('應該檢查單一啟用自動刷新的頻道並找到新影片', async () => {
      // Arrange
      const request = new Request('http://localhost/api/cron/check-new-videos', {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      })

      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        autoRefresh: true,
        user: { id: 'user-1' },
      }

      const mockAccount = {
        userId: 'user-1',
        provider: 'google',
        access_token: 'test-token',
      }

      const mockVideos = [
        {
          id: 'video-1',
          title: 'Test Video 1',
          description: 'Description 1',
          thumbnail: 'thumb1.jpg',
          duration: 600,
          publishedAt: new Date('2024-01-01'),
        },
        {
          id: 'video-2',
          title: 'Test Video 2',
          description: 'Description 2',
          thumbnail: 'thumb2.jpg',
          duration: 700,
          publishedAt: new Date('2024-01-02'),
        },
      ]

      vi.mocked(prisma.channel.findMany).mockResolvedValue([mockChannel as any])
      vi.mocked(prisma.account.findFirst).mockResolvedValue(mockAccount as any)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.video.create).mockResolvedValue({ 
        id: 'db-video-1', 
        youtubeId: 'video-1',
        channelId: 'channel-1',
      } as any)
      vi.mocked(prisma.summary.create).mockResolvedValue({ 
        id: 'summary-1', 
        videoId: 'db-video-1',
        userId: 'user-1',
        status: 'pending',
      } as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)
      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      // Mock YouTubeClient constructor and instance
      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockResolvedValue(mockVideos),
        } as any
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(expect.objectContaining({
        success: true,
        newVideos: 2,
        channelsChecked: 1,
      }))
      expect(prisma.video.create).toHaveBeenCalledTimes(2)
      expect(prisma.summary.create).toHaveBeenCalledTimes(2)
      expect(addSummaryJob).toHaveBeenCalledTimes(2)
      expect(prisma.channel.update).toHaveBeenCalledWith({
        where: { id: 'channel-1' },
        data: { lastCheckedAt: expect.any(Date) },
      })
    })

    it('應該檢查多個頻道', async () => {
      // Arrange
      const request = new Request('http://localhost/api/cron/check-new-videos', {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      })

      const mockChannels = [
        { id: 'ch-1', userId: 'user-1', youtubeId: 'UC1', autoRefresh: true },
        { id: 'ch-2', userId: 'user-2', youtubeId: 'UC2', autoRefresh: true },
        { id: 'ch-3', userId: 'user-3', youtubeId: 'UC3', autoRefresh: true },
      ]

      const mockAccount = { access_token: 'token' }

      vi.mocked(prisma.channel.findMany).mockResolvedValue(mockChannels as any)
      vi.mocked(prisma.account.findFirst).mockResolvedValue(mockAccount as any)
      vi.mocked(prisma.channel.update).mockResolvedValue({} as any)

      // Mock YouTubeClient with different return values per call
      const getChannelVideosMock = vi.fn()
        .mockResolvedValueOnce([
          { id: 'v1', title: 'V1', description: '', thumbnail: '', duration: 100, publishedAt: new Date() },
          { id: 'v2', title: 'V2', description: '', thumbnail: '', duration: 100, publishedAt: new Date() },
        ])
        .mockResolvedValueOnce([]) // 頻道 2 沒有新影片
        .mockResolvedValueOnce([
          { id: 'v3', title: 'V3', description: '', thumbnail: '', duration: 100, publishedAt: new Date() },
        ])

      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: getChannelVideosMock,
        } as any
      })

      vi.mocked(prisma.video.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.video.create).mockResolvedValue({ 
        id: 'new-video',
        youtubeId: 'v1',
        channelId: 'ch-1',
      } as any)
      vi.mocked(prisma.summary.create).mockResolvedValue({ id: 'new-summary', status: 'pending' } as any)
      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(expect.objectContaining({
        success: true,
        newVideos: 3,
        channelsChecked: 3,
      }))
      expect(prisma.channel.update).toHaveBeenCalledTimes(3)
    })

    it('應該在影片已存在時不重複建立', async () => {
      // Arrange
      const request = new Request('http://localhost/api/cron/check-new-videos', {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      })

      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        autoRefresh: true,
      }

      const mockAccount = { access_token: 'token' }
      const existingVideo = { id: 'existing-vid', youtubeId: 'vid-123' }

      vi.mocked(prisma.channel.findMany).mockResolvedValue([mockChannel as any])
      vi.mocked(prisma.account.findFirst).mockResolvedValue(mockAccount as any)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(existingVideo as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)

      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockResolvedValue([
            { id: 'vid-123', title: 'Existing Video', description: '', thumbnail: '', duration: 100, publishedAt: new Date() },
          ]),
        } as any
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(expect.objectContaining({
        success: true,
        newVideos: 0,
        channelsChecked: 1,
      }))
      expect(prisma.video.create).not.toHaveBeenCalled()
      expect(prisma.summary.create).not.toHaveBeenCalled()
    })
  })

  describe('外部依賴處理', () => {
    it('應該在頻道沒有對應的 Google Account 時跳過', async () => {
      // Arrange
      const request = new Request('http://localhost/api/cron/check-new-videos', {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      })

      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        autoRefresh: true,
      }

      vi.mocked(prisma.channel.findMany).mockResolvedValue([mockChannel as any])
      vi.mocked(prisma.account.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(expect.objectContaining({
        success: true,
        newVideos: 0,
        channelsChecked: 1,
      }))
      expect(YouTubeClient).not.toHaveBeenCalled()
    })

    it('應該在 Account 沒有 access_token 時跳過', async () => {
      // Arrange
      const request = new Request('http://localhost/api/cron/check-new-videos', {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      })

      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        autoRefresh: true,
      }

      const mockAccount = {
        userId: 'user-1',
        provider: 'google',
        access_token: null,
      }

      vi.mocked(prisma.channel.findMany).mockResolvedValue([mockChannel as any])
      vi.mocked(prisma.account.findFirst).mockResolvedValue(mockAccount as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(expect.objectContaining({
        success: true,
        newVideos: 0,
        channelsChecked: 1,
      }))
      expect(YouTubeClient).not.toHaveBeenCalled()
    })

    it('應該在 YouTube API 調用失敗時回傳 500', async () => {
      // Arrange
      const request = new Request('http://localhost/api/cron/check-new-videos', {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      })

      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        autoRefresh: true,
      }

      const mockAccount = { access_token: 'token' }

      vi.mocked(prisma.channel.findMany).mockResolvedValue([mockChannel as any])
      vi.mocked(prisma.account.findFirst).mockResolvedValue(mockAccount as any)

      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockRejectedValue(new Error('YouTube API Error')),
        } as any
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal error' })
    })

    it('應該在 Database 連線失敗時回傳 500', async () => {
      // Arrange
      const request = new Request('http://localhost/api/cron/check-new-videos', {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      })

      vi.mocked(prisma.channel.findMany).mockRejectedValue(new Error('Database connection failed'))

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal error' })
    })

    it('應該在 Queue 新增任務失敗時記錄錯誤並繼續 (回傳 200)', async () => {
      // Arrange
      const request = new Request('http://localhost/api/cron/check-new-videos', {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      })

      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        autoRefresh: true,
      }

      const mockAccount = { access_token: 'token' }

      vi.mocked(prisma.channel.findMany).mockResolvedValue([mockChannel as any])
      vi.mocked(prisma.account.findFirst).mockResolvedValue(mockAccount as any)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.video.create).mockResolvedValue({ id: 'vid-1' } as any)
      vi.mocked(prisma.summary.create).mockResolvedValue({ id: 'sum-1' } as any)
      vi.mocked(addSummaryJob).mockRejectedValue(new Error('Queue failed'))

      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockResolvedValue([
            { id: 'v1', title: 'V1', description: '', thumbnail: '', duration: 100, publishedAt: new Date() },
          ]),
        } as any
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      // 由於有錯誤處理機制，API 應回傳 200，但新增影片數為 0
      expect(response.status).toBe(200)
      expect(data).toEqual(expect.objectContaining({
        success: true,
        newVideos: 0,
        channelsChecked: 1,
      }))
    })
  })
})
