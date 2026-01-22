import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/summaries/[id]/export/notion/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { createSummaryPage } from '@/lib/notion/service'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
    },
    summary: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/notion/service', () => ({
  createSummaryPage: vi.fn(),
}))

describe('Notion Export API', () => {
  const mockSession = {
    user: {
      id: 'user-1',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('應該在未登入時回傳 401', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await POST(new Request('http://localhost'), { params: { id: 'sum-1' } })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('應該在嘗試匯出其他使用者的摘要時回傳 403', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ notionParentPageId: 'parent-1' } as any)
      vi.mocked(prisma.account.findFirst).mockResolvedValue({ access_token: 'token-1' } as any)
      vi.mocked(prisma.summary.findUnique).mockResolvedValue({ 
        id: 'sum-1', 
        userId: 'user-2' // Different user
      } as any)

      const response = await POST(new Request('http://localhost'), { params: { id: 'sum-1' } })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('應該在摘要不存在時回傳 404', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ notionParentPageId: 'parent-1' } as any)
      vi.mocked(prisma.account.findFirst).mockResolvedValue({ access_token: 'token-1' } as any)
      vi.mocked(prisma.summary.findUnique).mockResolvedValue(null)

      const response = await POST(new Request('http://localhost'), { params: { id: 'non-existent' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Summary not found')
    })

    it('應該在使用者尚未設定 Notion Parent Page ID 時回傳 400', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ notionParentPageId: null } as any)

      const response = await POST(new Request('http://localhost'), { params: { id: 'sum-1' } })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Notion settings missing (Parent Page ID)')
    })

    it('應該在未連接 Notion 帳號時回傳 400', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ notionParentPageId: 'parent-1' } as any)
      vi.mocked(prisma.account.findFirst).mockResolvedValue(null)

      const response = await POST(new Request('http://localhost'), { params: { id: 'sum-1' } })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Notion account not connected')
    })

    it('應該在摘要內容無效或為空時回傳 400', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ notionParentPageId: 'parent-1' } as any)
      vi.mocked(prisma.account.findFirst).mockResolvedValue({ access_token: 'token-1' } as any)
      vi.mocked(prisma.summary.findUnique).mockResolvedValue({ 
        id: 'sum-1', 
        userId: 'user-1',
        content: {} // Invalid content
      } as any)

      const response = await POST(new Request('http://localhost'), { params: { id: 'sum-1' } })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Summary content is invalid or empty')
    })

    it('應該成功匯出摘要到 Notion', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ notionParentPageId: 'parent-1' } as any)
      vi.mocked(prisma.account.findFirst).mockResolvedValue({ access_token: 'token-1' } as any)
      
      const mockSummaryContent = { topic: 'AI', sections: [] }
      vi.mocked(prisma.summary.findUnique).mockResolvedValue({ 
        id: 'sum-1', 
        userId: 'user-1',
        content: mockSummaryContent,
        video: { 
          title: 'Video Title', 
          youtubeId: 'yt-1', 
          thumbnail: 'thumb.jpg'
        }
      } as any)
      
      vi.mocked(createSummaryPage).mockResolvedValue({ url: 'https://notion.so/page-1' } as any)

      const response = await POST(new Request('http://localhost'), { params: { id: 'sum-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.url).toBe('https://notion.so/page-1')
      
      expect(createSummaryPage).toHaveBeenCalledWith(
        'token-1',
        'parent-1',
        mockSummaryContent,
        expect.objectContaining({
          title: 'Video Title',
          videoId: 'yt-1'
        })
      )
    })

    it('應該在 Notion Service 建立頁面失敗時回傳 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ notionParentPageId: 'parent-1' } as any)
      vi.mocked(prisma.account.findFirst).mockResolvedValue({ access_token: 'token-1' } as any)
      vi.mocked(prisma.summary.findUnique).mockResolvedValue({ 
        id: 'sum-1', 
        userId: 'user-1',
        content: { topic: 'AI' },
        video: { 
          title: 'Title', 
          youtubeId: 'id'
        }
      } as any)
      
      vi.mocked(createSummaryPage).mockRejectedValue(new Error('Notion API Error'))

      const response = await POST(new Request('http://localhost'), { params: { id: 'sum-1' } })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal Server Error')
    })
  })
})
