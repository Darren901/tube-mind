import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/channels/[id]/refresh/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { YouTubeClient } from '@/lib/youtube/client'
import { addSummaryJob } from '@/lib/queue/summaryQueue'

// Mocks
vi.mock('next-auth')
vi.mock('@/lib/db', () => ({
  prisma: {
    channel: {
      findFirst: vi.fn(),
      update: vi.fn(),
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
vi.mock('@/lib/youtube/client', () => ({
  YouTubeClient: vi.fn(),
}))
vi.mock('@/lib/queue/summaryQueue', () => ({
  addSummaryJob: vi.fn(),
}))

describe('Channel Refresh API', () => {
  const mockSession = { 
    user: { id: 'user-1' },
    accessToken: 'mock-access-token'
  }
  const mockParams = { params: { id: 'channel-1' } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('權限驗證', () => {
    it('應該在未登入時回傳 401', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(null)
      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('應該在嘗試刷新不存在的頻道時回傳 404', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(null)

      const request = new Request('http://localhost/api/channels/non-existent/refresh', {
        method: 'POST',
      })
      const params = { params: { id: 'non-existent' } }

      // Act
      const response = await POST(request, params)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Channel not found' })
    })

    it('應該在嘗試刷新其他使用者的頻道時回傳 404', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(null) // userId 不匹配

      const request = new Request('http://localhost/api/channels/channel-2/refresh', {
        method: 'POST',
      })
      const params = { params: { id: 'channel-2' } }

      // Act
      const response = await POST(request, params)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Channel not found' })
      expect(prisma.channel.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'channel-2',
          userId: 'user-1',
        },
      })
    })
  })

  describe('速率限制 (Rate Limiting)', () => {
    it('應該在一小時內重複刷新時回傳 429', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        lastCheckedAt: thirtyMinutesAgo,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)

      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(429)
      expect(data).toEqual({ error: '更新過於頻繁，請一小時後再試。' })
      expect(prisma.channel.update).not.toHaveBeenCalled()
    })

    it('應該在剛好一小時後允許刷新', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const exactlyOneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        lastCheckedAt: exactlyOneHourAgo,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)
      
      // Mock YouTubeClient
      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockResolvedValue([]),
        } as any
      })

      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('newVideos')
    })

    it('應該在超過一小時後允許刷新', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        lastCheckedAt: twoHoursAgo,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)
      
      // Mock YouTubeClient
      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockResolvedValue([]),
        } as any
      })

      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('newVideos')
    })

    it('應該在第一次刷新 (lastCheckedAt 為 null) 時成功', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        lastCheckedAt: null,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)
      
      // Mock YouTubeClient
      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockResolvedValue([]),
        } as any
      })

      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('newVideos')
    })
  })

  describe('核心功能', () => {
    it('應該成功刷新並找到新影片', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        lastCheckedAt: null,
      }

      const mockVideos = [
        {
          id: 'vid-1',
          title: 'New Video 1',
          description: 'Description 1',
          thumbnail: 'thumb1.jpg',
          duration: 300,
          publishedAt: new Date('2024-01-01'),
        },
        {
          id: 'vid-2',
          title: 'New Video 2',
          description: 'Description 2',
          thumbnail: 'thumb2.jpg',
          duration: 600,
          publishedAt: new Date('2024-01-02'),
        },
      ]

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(null) // 影片不存在
      vi.mocked(prisma.video.create)
        .mockResolvedValueOnce({ id: 'db-vid-1', youtubeId: 'vid-1' } as any)
        .mockResolvedValueOnce({ id: 'db-vid-2', youtubeId: 'vid-2' } as any)
      vi.mocked(prisma.summary.create)
        .mockResolvedValueOnce({ id: 'summary-1' } as any)
        .mockResolvedValueOnce({ id: 'summary-2' } as any)
      vi.mocked(addSummaryJob).mockResolvedValue(undefined as any)

      // Mock YouTubeClient
      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockResolvedValue(mockVideos),
        } as any
      })

      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ newVideos: 2 })
      expect(prisma.video.create).toHaveBeenCalledTimes(2)
      expect(prisma.summary.create).toHaveBeenCalledTimes(2)
      expect(addSummaryJob).toHaveBeenCalledTimes(2)
      
      // 驗證 lastCheckedAt 已更新
      expect(prisma.channel.update).toHaveBeenCalledWith({
        where: { id: 'channel-1' },
        data: { lastCheckedAt: expect.any(Date) },
      })
    })

    it('應該在刷新但沒有新影片時回傳 0', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        lastCheckedAt: null,
      }

      const mockVideos = [
        {
          id: 'existing-vid-1',
          title: 'Existing Video',
          description: 'Description',
          thumbnail: 'thumb.jpg',
          duration: 300,
          publishedAt: new Date('2024-01-01'),
        },
      ]

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.video.findUnique).mockResolvedValue({ id: 'existing-db-vid-1' } as any) // 影片已存在

      // Mock YouTubeClient
      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockResolvedValue(mockVideos),
        } as any
      })

      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ newVideos: 0 })
      expect(prisma.video.create).not.toHaveBeenCalled()
      expect(prisma.summary.create).not.toHaveBeenCalled()
      expect(addSummaryJob).not.toHaveBeenCalled()
      
      // lastCheckedAt 仍應更新
      expect(prisma.channel.update).toHaveBeenCalled()
    })

    it('應該在影片已存在時不重複建立', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        lastCheckedAt: null,
      }

      const mockVideos = [
        {
          id: 'vid-123',
          title: 'Duplicate Video',
          description: 'Description',
          thumbnail: 'thumb.jpg',
          duration: 300,
          publishedAt: new Date('2024-01-01'),
        },
      ]

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.video.findUnique).mockResolvedValue({ 
        id: 'db-vid-123',
        youtubeId: 'vid-123' 
      } as any)

      // Mock YouTubeClient
      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockResolvedValue(mockVideos),
        } as any
      })

      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ newVideos: 0 })
      expect(prisma.video.create).not.toHaveBeenCalled()
      expect(prisma.video.findUnique).toHaveBeenCalledWith({
        where: { youtubeId: 'vid-123' },
      })
    })

    it('應該立即更新 lastCheckedAt 時間戳', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        lastCheckedAt: null,
      }

      let updateCalledBeforeYouTube = false

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.channel.update).mockImplementation((async () => {
        updateCalledBeforeYouTube = true
        return mockChannel
      }) as any)

      // Mock YouTubeClient
      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockImplementation(async () => {
            // 驗證 update 在 YouTube API 調用前已執行
            expect(updateCalledBeforeYouTube).toBe(true)
            return []
          }),
        } as any
      })

      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act
      await POST(request, mockParams)

      // Assert
      expect(prisma.channel.update).toHaveBeenCalledWith({
        where: { id: 'channel-1' },
        data: { lastCheckedAt: expect.any(Date) },
      })
      expect(updateCalledBeforeYouTube).toBe(true)
    })
  })

  describe('外部依賴處理', () => {
    it('應該在 YouTube API 調用失敗時拋出錯誤', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        lastCheckedAt: null,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)

      // Mock YouTubeClient 拋出錯誤
      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockRejectedValue(new Error('YouTube API error')),
        } as any
      })

      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act & Assert
      await expect(POST(request, mockParams)).rejects.toThrow('YouTube API error')
      
      // lastCheckedAt 仍應已更新（在調用前更新）
      expect(prisma.channel.update).toHaveBeenCalled()
    })

    it('應該在 Database 操作失敗時記錄錯誤並繼續', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        lastCheckedAt: null,
      }

      const mockVideos = [
        {
          id: 'vid-1',
          title: 'New Video',
          description: 'Description',
          thumbnail: 'thumb.jpg',
          duration: 300,
          publishedAt: new Date('2024-01-01'),
        },
      ]

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.video.create).mockRejectedValue(new Error('Database error'))

      // Mock YouTubeClient
      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockResolvedValue(mockVideos),
        } as any
      })

      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.newVideos).toBe(0)
    })

    it('應該在 Queue 新增任務失敗時記錄錯誤並繼續', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        lastCheckedAt: null,
      }

      const mockVideos = [
        {
          id: 'vid-1',
          title: 'New Video',
          description: 'Description',
          thumbnail: 'thumb.jpg',
          duration: 300,
          publishedAt: new Date('2024-01-01'),
        },
      ]

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.video.create).mockResolvedValue({ id: 'db-vid-1' } as any)
      vi.mocked(prisma.summary.create).mockResolvedValue({ id: 'summary-1' } as any)
      vi.mocked(addSummaryJob).mockRejectedValue(new Error('Queue error'))

      // Mock YouTubeClient
      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getChannelVideos: vi.fn().mockResolvedValue(mockVideos),
        } as any
      })

      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.newVideos).toBe(0)
    })
  })

  describe('特殊情況', () => {
    it('應該在 Session 缺少 accessToken 時處理', async () => {
      // Arrange
      const sessionWithoutToken = { user: { id: 'user-1' } }
      vi.mocked(getServerSession).mockResolvedValue(sessionWithoutToken as any)
      
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        youtubeId: 'UC123',
        lastCheckedAt: null,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(mockChannel as any)

      // Mock YouTubeClient - 接收 undefined token
      vi.mocked(YouTubeClient).mockImplementation(function(token: string) {
        if (!token) {
          throw new Error('Access token is required')
        }
        return {
          getChannelVideos: vi.fn().mockResolvedValue([]),
        } as any
      })

      const request = new Request('http://localhost/api/channels/channel-1/refresh', {
        method: 'POST',
      })

      // Act & Assert
      await expect(POST(request, mockParams)).rejects.toThrow('Access token is required')
    })
  })
})
