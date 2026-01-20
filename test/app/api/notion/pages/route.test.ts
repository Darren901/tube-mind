import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/notion/pages/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { searchAccessiblePages } from '@/lib/notion/service'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    account: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/notion/service', () => ({
  searchAccessiblePages: vi.fn(),
}))

describe('Notion Pages API', () => {
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

      const response = await GET()

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('應該在未連接 Notion 帳號時回傳 400', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.account.findFirst).mockResolvedValue(null)

      const response = await GET()

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Notion account not connected')
    })

    it('應該在 Notion 帳號缺少 access_token 時回傳 400', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.account.findFirst).mockResolvedValue({ access_token: null } as any)

      const response = await GET()

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Notion account not connected')
    })

    it('應該成功獲取 Notion 頁面列表', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.account.findFirst).mockResolvedValue({ access_token: 'ntn-token-123' } as any)
      
      const mockPages = [{ id: 'page-1', title: 'My Page', icon: '📄' }]
      vi.mocked(searchAccessiblePages).mockResolvedValue(mockPages as any)

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.pages).toEqual(mockPages)
      
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          provider: 'notion',
        },
        select: { access_token: true },
      })
      expect(searchAccessiblePages).toHaveBeenCalledWith('ntn-token-123')
    })

    it('應該在 Notion Service 搜尋失敗時回傳 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.account.findFirst).mockResolvedValue({ access_token: 'ntn-token-123' } as any)
      vi.mocked(searchAccessiblePages).mockRejectedValue(new Error('Notion API Error'))

      const response = await GET()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal Server Error')
    })
  })
})
