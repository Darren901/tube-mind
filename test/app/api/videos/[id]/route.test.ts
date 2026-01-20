import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/videos/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    video: {
      findUnique: vi.fn(),
    },
  },
}))

describe('Videos ID API', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('應該在未登入時回傳 401', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await GET(new Request('http://localhost/api/videos/vid-1'), {
        params: { id: 'vid-1' },
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('應該在影片不存在時回傳 404', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.video.findUnique).mockResolvedValue(null)

      const response = await GET(new Request('http://localhost/api/videos/non-existent'), {
        params: { id: 'non-existent' },
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Video not found')
    })

    it('應該成功獲取影片詳情 (包含頻道與摘要)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      
      const mockVideo = {
        id: 'vid-1',
        title: 'Video Title',
        channelId: 'chan-1',
        channel: { id: 'chan-1', title: 'Channel Title' },
        summaries: [
          { id: 'sum-1', status: 'completed', userId: 'user-1' }
        ]
      }
      vi.mocked(prisma.video.findUnique).mockResolvedValue(mockVideo as any)

      const response = await GET(new Request('http://localhost/api/videos/vid-1'), {
        params: { id: 'vid-1' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockVideo)
      
      expect(prisma.video.findUnique).toHaveBeenCalledWith({
        where: { id: 'vid-1' },
        include: {
          channel: true,
          summaries: {
            where: { userId: 'user-1' },
          },
        },
      })
    })

    it('應該在影片存在但該使用者無摘要時回傳空摘要列表', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      
      const mockVideo = {
        id: 'vid-1',
        title: 'Video Title',
        channel: { id: 'chan-1', title: 'Channel Title' },
        summaries: []
      }
      vi.mocked(prisma.video.findUnique).mockResolvedValue(mockVideo as any)

      const response = await GET(new Request('http://localhost/api/videos/vid-1'), {
        params: { id: 'vid-1' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.summaries).toEqual([])
    })

    it('應該在 Database 查詢失敗時拋出錯誤 (回傳 500)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.video.findUnique).mockRejectedValue(new Error('DB Error'))

      // Next.js Route Handlers don't automatically catch errors unless wrapped
      // But in this implementation, it's not wrapped in try-catch, so it will bubble up
      await expect(GET(new Request('http://localhost/api/videos/vid-1'), {
        params: { id: 'vid-1' },
      })).rejects.toThrow('DB Error')
    })
  })
})
