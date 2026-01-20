import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '@/app/api/user/settings/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}))

describe('User Settings API', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PATCH', () => {
    it('應該在未登入時回傳 401', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        body: JSON.stringify({ notionParentPageId: 'page-1' }),
      })

      const response = await PATCH(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('應該在缺少 notionParentPageId 時回傳 400', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })

      const response = await PATCH(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid notionParentPageId')
    })

    it('應該在 notionParentPageId 格式錯誤時回傳 400', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        body: JSON.stringify({ notionParentPageId: 123 }),
      })

      const response = await PATCH(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid notionParentPageId')
    })

    it('應該成功更新 Notion Parent Page ID', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'user-1',
        notionParentPageId: 'new-page-id',
      } as any)

      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        body: JSON.stringify({ notionParentPageId: 'new-page-id' }),
      })

      const response = await PATCH(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.user.notionParentPageId).toBe('new-page-id')
      
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { notionParentPageId: 'new-page-id' },
      })
    })

    it('應該在 Database 更新失敗時回傳 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.update).mockRejectedValue(new Error('DB Error'))

      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        body: JSON.stringify({ notionParentPageId: 'page-1' }),
      })

      const response = await PATCH(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to update settings')
    })
  })
})
