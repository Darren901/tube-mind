import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH, DELETE } from '@/app/api/channels/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

// Mocks
vi.mock('next-auth')
vi.mock('@/lib/quota/dailyLimit', () => ({
  checkAutoRefreshLimit: vi.fn().mockResolvedValue({ count: 0, limit: 5 }),
}))
vi.mock('@/lib/db', () => ({
  prisma: {
    channel: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

describe('Channel by ID API', () => {
  const mockSession = { user: { id: 'user-1' } }
  const mockParams = { params: { id: 'channel-1' } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET - 獲取單一頻道詳情', () => {
    it('應該在未登入時回傳 401', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(null)
      const request = new Request('http://localhost/api/channels/channel-1')

      // Act
      const response = await GET(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('應該成功獲取自己的頻道詳情', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        title: 'Test Channel',
        youtubeId: 'UC123',
        videos: [
          { id: 'vid-1', title: 'Video 1', publishedAt: new Date('2024-01-02') },
          { id: 'vid-2', title: 'Video 2', publishedAt: new Date('2024-01-01') },
        ],
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      const request = new Request('http://localhost/api/channels/channel-1')

      // Act
      const response = await GET(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.id).toBe('channel-1')
      expect(data.userId).toBe('user-1')
      expect(data.title).toBe('Test Channel')
      expect(data.videos).toHaveLength(2)
      expect(data.videos[0].id).toBe('vid-1')
      expect(data.videos[1].id).toBe('vid-2')
      expect(prisma.channel.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'channel-1',
          userId: 'user-1',
        },
        include: {
          videos: {
            orderBy: { publishedAt: 'desc' },
            take: 50,
          },
        },
      })
    })

    it('應該在嘗試獲取不存在的頻道時回傳 404', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(null)
      
      const request = new Request('http://localhost/api/channels/non-existent')
      const params = { params: { id: 'non-existent' } }

      // Act
      const response = await GET(request, params)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Channel not found' })
    })

    it('應該在嘗試獲取其他使用者的頻道時回傳 404', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(null) // 因為 userId 不匹配

      const request = new Request('http://localhost/api/channels/channel-2')
      const params = { params: { id: 'channel-2' } }

      // Act
      const response = await GET(request, params)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Channel not found' })
      expect(prisma.channel.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'channel-2',
          userId: 'user-1', // 查詢時就已經限制 userId
        },
        include: expect.any(Object),
      })
    })

    it('應該在頻道沒有影片時回傳空陣列', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        title: 'Empty Channel',
        videos: [],
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      const request = new Request('http://localhost/api/channels/channel-1')

      // Act
      const response = await GET(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.videos).toEqual([])
    })

    it('應該在頻道有超過 50 個影片時只回傳最新 50 個', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      // 模擬 50 個影片
      const videos = Array.from({ length: 50 }, (_, i) => ({
        id: `vid-${i}`,
        title: `Video ${i}`,
        publishedAt: new Date(2024, 0, 50 - i), // 降冪排序
      }))

      const mockChannel = {
        id: 'channel-1',
        userId: 'user-1',
        title: 'Popular Channel',
        videos,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(mockChannel as any)
      const request = new Request('http://localhost/api/channels/channel-1')

      // Act
      const response = await GET(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.videos.length).toBe(50)
      // 驗證查詢參數限制了 50 個
      expect(prisma.channel.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            videos: {
              orderBy: { publishedAt: 'desc' },
              take: 50,
            },
          },
        })
      )
    })
  })

  describe('PATCH - 更新頻道設定', () => {
    it('應該在未登入時回傳 401', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(null)
      const request = new Request('http://localhost/api/channels/channel-1', {
        method: 'PATCH',
        body: JSON.stringify({ autoRefresh: true }),
      })

      // Act
      const response = await PATCH(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('應該成功啟用自動刷新', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const existingChannel = {
        id: 'channel-1',
        userId: 'user-1',
        autoRefresh: false,
      }

      const updatedChannel = {
        ...existingChannel,
        autoRefresh: true,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(existingChannel as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(updatedChannel as any)

      const request = new Request('http://localhost/api/channels/channel-1', {
        method: 'PATCH',
        body: JSON.stringify({ autoRefresh: true }),
      })

      // Act
      const response = await PATCH(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.autoRefresh).toBe(true)
      expect(prisma.channel.update).toHaveBeenCalledWith({
        where: { id: 'channel-1' },
        data: { autoRefresh: true },
      })
    })

    it('應該成功停用自動刷新', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const existingChannel = {
        id: 'channel-1',
        userId: 'user-1',
        autoRefresh: true,
      }

      const updatedChannel = {
        ...existingChannel,
        autoRefresh: false,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(existingChannel as any)
      vi.mocked(prisma.channel.update).mockResolvedValue(updatedChannel as any)

      const request = new Request('http://localhost/api/channels/channel-1', {
        method: 'PATCH',
        body: JSON.stringify({ autoRefresh: false }),
      })

      // Act
      const response = await PATCH(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.autoRefresh).toBe(false)
      expect(prisma.channel.update).toHaveBeenCalledWith({
        where: { id: 'channel-1' },
        data: { autoRefresh: false },
      })
    })

    it('應該在嘗試啟用 Notion 同步但未連接 Notion 帳號時回傳 400', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const existingChannel = {
        id: 'channel-1',
        userId: 'user-1',
        autoSyncNotion: false,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(existingChannel as any)
      // Mock no Notion account
      vi.mocked(prisma.account.findFirst).mockResolvedValue(null)

      const request = new Request('http://localhost/api/channels/channel-1', {
        method: 'PATCH',
        body: JSON.stringify({ autoSyncNotion: true }),
      })

      // Act
      const response = await PATCH(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Notion not connected or Parent Page not set' })
      expect(prisma.channel.update).not.toHaveBeenCalled()
    })

    it('應該在嘗試啟用 Notion 同步但未設定 Notion Parent Page 時回傳 400', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const existingChannel = {
        id: 'channel-1',
        userId: 'user-1',
        autoSyncNotion: false,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(existingChannel as any)
      // Mock Notion account exists
      vi.mocked(prisma.account.findFirst).mockResolvedValue({ id: 'acc-1' } as any)
      // Mock user has no notionParentPageId
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', notionParentPageId: null } as any)

      const request = new Request('http://localhost/api/channels/channel-1', {
        method: 'PATCH',
        body: JSON.stringify({ autoSyncNotion: true }),
      })

      // Act
      const response = await PATCH(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Notion not connected or Parent Page not set' })
      expect(prisma.channel.update).not.toHaveBeenCalled()
    })

    it('應該在符合條件時成功啟用 Notion 同步', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const existingChannel = {
        id: 'channel-1',
        userId: 'user-1',
        autoSyncNotion: false,
      }

      const updatedChannel = {
        ...existingChannel,
        autoSyncNotion: true,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(existingChannel as any)
      // Mock Notion account exists
      vi.mocked(prisma.account.findFirst).mockResolvedValue({ id: 'acc-1' } as any)
      // Mock user has notionParentPageId
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', notionParentPageId: 'page-1' } as any)
      
      vi.mocked(prisma.channel.update).mockResolvedValue(updatedChannel as any)

      const request = new Request('http://localhost/api/channels/channel-1', {
        method: 'PATCH',
        body: JSON.stringify({ autoSyncNotion: true }),
      })

      // Act
      const response = await PATCH(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.autoSyncNotion).toBe(true)
      expect(prisma.channel.update).toHaveBeenCalledWith({
        where: { id: 'channel-1' },
        data: { autoSyncNotion: true },
      })
    })

    it('應該在嘗試更新不存在的頻道時回傳 404', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(null)

      const request = new Request('http://localhost/api/channels/non-existent', {
        method: 'PATCH',
        body: JSON.stringify({ autoRefresh: true }),
      })
      const params = { params: { id: 'non-existent' } }

      // Act
      const response = await PATCH(request, params)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Channel not found' })
      expect(prisma.channel.update).not.toHaveBeenCalled()
    })

    it('應該在嘗試更新其他使用者的頻道時回傳 404', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(null) // userId 不匹配

      const request = new Request('http://localhost/api/channels/channel-2', {
        method: 'PATCH',
        body: JSON.stringify({ autoRefresh: true }),
      })
      const params = { params: { id: 'channel-2' } }

      // Act
      const response = await PATCH(request, params)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Channel not found' })
      expect(prisma.channel.update).not.toHaveBeenCalled()
    })

    it('應該在 Database 更新失敗時拋出錯誤', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const existingChannel = {
        id: 'channel-1',
        userId: 'user-1',
        autoRefresh: false,
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(existingChannel as any)
      vi.mocked(prisma.channel.update).mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost/api/channels/channel-1', {
        method: 'PATCH',
        body: JSON.stringify({ autoRefresh: true }),
      })

      // Act & Assert
      await expect(PATCH(request, mockParams)).rejects.toThrow('Database error')
    })
  })

  describe('DELETE - 刪除頻道', () => {
    it('應該在未登入時回傳 401', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(null)
      const request = new Request('http://localhost/api/channels/channel-1', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('應該成功刪除自己的頻道', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const existingChannel = {
        id: 'channel-1',
        userId: 'user-1',
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(existingChannel as any)
      vi.mocked(prisma.channel.delete).mockResolvedValue(existingChannel as any)

      const request = new Request('http://localhost/api/channels/channel-1', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, mockParams)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(prisma.channel.delete).toHaveBeenCalledWith({
        where: { id: 'channel-1' },
      })
    })

    it('應該在嘗試刪除不存在的頻道時回傳 404', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(null)

      const request = new Request('http://localhost/api/channels/non-existent', {
        method: 'DELETE',
      })
      const params = { params: { id: 'non-existent' } }

      // Act
      const response = await DELETE(request, params)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Channel not found' })
      expect(prisma.channel.delete).not.toHaveBeenCalled()
    })

    it('應該在嘗試刪除其他使用者的頻道時回傳 404', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.channel.findFirst).mockResolvedValue(null) // userId 不匹配

      const request = new Request('http://localhost/api/channels/channel-2', {
        method: 'DELETE',
      })
      const params = { params: { id: 'channel-2' } }

      // Act
      const response = await DELETE(request, params)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'Channel not found' })
      expect(prisma.channel.delete).not.toHaveBeenCalled()
    })

    it('應該在 Database 刪除失敗時拋出錯誤', async () => {
      // Arrange
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      
      const existingChannel = {
        id: 'channel-1',
        userId: 'user-1',
      }

      vi.mocked(prisma.channel.findFirst).mockResolvedValue(existingChannel as any)
      vi.mocked(prisma.channel.delete).mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost/api/channels/channel-1', {
        method: 'DELETE',
      })

      // Act & Assert
      await expect(DELETE(request, mockParams)).rejects.toThrow('Database error')
    })
  })
})
