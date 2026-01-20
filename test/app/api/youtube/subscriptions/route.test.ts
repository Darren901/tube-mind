import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/youtube/subscriptions/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { YouTubeClient } from '@/lib/youtube/client'

// Mocks
vi.mock('next-auth')
vi.mock('@/lib/db', () => ({
  prisma: {
    channel: {
      findMany: vi.fn(),
    },
  },
}))
vi.mock('@/lib/youtube/client', () => ({
  YouTubeClient: vi.fn(),
}))

describe('YouTube Subscriptions API', () => {
  const mockSession = {
    user: { id: 'user-1' },
    accessToken: 'valid-token',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('權限驗證', () => {
    it('應該在未登入時回傳 401', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(null)
      const request = new Request('http://localhost/api/youtube/subscriptions')

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('應該在 Session 缺少 accessToken 時回傳 401', async () => {
      // Arrange
      const sessionWithoutToken = { user: { id: 'user-1' } }
      vi.mocked(getServerSession).mockResolvedValue(sessionWithoutToken as any)
      const request = new Request('http://localhost/api/youtube/subscriptions')

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })
  })

  describe('核心功能', () => {
    it('應該成功獲取訂閱列表且無已新增頻道', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSubscriptions = [
        { id: 'UC123', title: 'Channel A', thumbnail: 'thumb-a.jpg' },
        { id: 'UC456', title: 'Channel B', thumbnail: 'thumb-b.jpg' },
      ]

      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getSubscriptions: vi.fn().mockResolvedValue(mockSubscriptions),
        } as any
      })

      vi.mocked(prisma.channel.findMany).mockResolvedValue([])

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0]).toEqual({ ...mockSubscriptions[0], isAdded: false })
      expect(data[1]).toEqual({ ...mockSubscriptions[1], isAdded: false })
      expect(prisma.channel.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          youtubeId: { in: ['UC123', 'UC456'] },
        },
        select: { youtubeId: true },
      })
    })

    it('應該成功獲取訂閱列表且部分頻道已新增', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSubscriptions = [
        { id: 'UC123', title: 'Channel A' },
        { id: 'UC456', title: 'Channel B' },
        { id: 'UC789', title: 'Channel C' },
      ]

      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getSubscriptions: vi.fn().mockResolvedValue(mockSubscriptions),
        } as any
      })

      const mockExistingChannels = [
        { youtubeId: 'UC123' },
        { youtubeId: 'UC789' },
      ]

      vi.mocked(prisma.channel.findMany).mockResolvedValue(mockExistingChannels as any)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(3)
      expect(data[0].isAdded).toBe(true)  // UC123
      expect(data[1].isAdded).toBe(false) // UC456
      expect(data[2].isAdded).toBe(true)  // UC789
    })

    it('應該成功獲取訂閱列表且所有頻道都已新增', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSubscriptions = [
        { id: 'UC123', title: 'Channel A' },
        { id: 'UC456', title: 'Channel B' },
      ]

      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getSubscriptions: vi.fn().mockResolvedValue(mockSubscriptions),
        } as any
      })

      const mockExistingChannels = [
        { youtubeId: 'UC123' },
        { youtubeId: 'UC456' },
      ]

      vi.mocked(prisma.channel.findMany).mockResolvedValue(mockExistingChannels as any)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].isAdded).toBe(true)
      expect(data[1].isAdded).toBe(true)
    })

    it('應該在使用者沒有任何訂閱頻道時回傳空陣列', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getSubscriptions: vi.fn().mockResolvedValue([]),
        } as any
      })

      vi.mocked(prisma.channel.findMany).mockResolvedValue([])

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual([])
      expect(prisma.channel.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          youtubeId: { in: [] },
        },
        select: { youtubeId: true },
      })
    })

    it('應該正確實現資料隔離 - 只查詢當前使用者的頻道', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSubscriptions = [
        { id: 'UC123', title: 'Channel A' },
      ]

      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getSubscriptions: vi.fn().mockResolvedValue(mockSubscriptions),
        } as any
      })

      // user-1 已新增此頻道
      const mockExistingChannels = [
        { youtubeId: 'UC123' },
      ]

      vi.mocked(prisma.channel.findMany).mockResolvedValue(mockExistingChannels as any)

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data[0].isAdded).toBe(true)
      expect(prisma.channel.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1', // 確保只查詢 user-1 的頻道
          youtubeId: { in: ['UC123'] },
        },
        select: { youtubeId: true },
      })
    })
  })

  describe('外部依賴處理', () => {
    it('應該在 YouTube API 調用失敗時回傳 500', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getSubscriptions: vi.fn().mockRejectedValue(new Error('API quota exceeded')),
        } as any
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'API quota exceeded' })
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch subscriptions:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('應該在 YouTube API 回傳錯誤但無 message 時使用預設訊息', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getSubscriptions: vi.fn().mockRejectedValue({}),
        } as any
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to fetch subscriptions' })

      consoleSpy.mockRestore()
    })

    it('應該在 Database 查詢失敗時回傳 500', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockSubscriptions = [
        { id: 'UC123', title: 'Channel A' },
      ]

      vi.mocked(YouTubeClient).mockImplementation(function() {
        return {
          getSubscriptions: vi.fn().mockResolvedValue(mockSubscriptions),
        } as any
      })

      vi.mocked(prisma.channel.findMany).mockRejectedValue(
        new Error('Database connection failed')
      )

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Database connection failed' })

      consoleSpy.mockRestore()
    })
  })
})
