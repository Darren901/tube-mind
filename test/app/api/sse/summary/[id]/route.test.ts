import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/sse/summary/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { subscribeSummaryEvents } from '@/lib/queue/events'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    summary: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/queue/events', () => ({
  subscribeSummaryEvents: vi.fn(() => ({
    quit: vi.fn(),
  })),
}))

describe('GET /api/sse/summary/[id]', () => {
  const userId = 'user-123'
  const summaryId = 'summary-123'
  const mockSession = { user: { id: userId } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('應該在未登入時返回 401', async () => {
    ;(getServerSession as any).mockResolvedValue(null)
    const res = await GET({} as Request, { params: { id: summaryId } })
    expect(res.status).toBe(401)
  })

  it('應該在找不到摘要或權限不足時返回 404', async () => {
    ;(getServerSession as any).mockResolvedValue(mockSession)
    ;(prisma.summary.findFirst as any).mockResolvedValue(null)
    const res = await GET({} as Request, { params: { id: summaryId } })
    expect(res.status).toBe(404)
  })

  it('應該成功建立 SSE 連線並回傳正確 Header', async () => {
    ;(getServerSession as any).mockResolvedValue(mockSession)
    ;(prisma.summary.findFirst as any).mockResolvedValue({
      id: summaryId,
      userId,
    })

    const res = await GET({
      signal: {
        addEventListener: vi.fn(),
      }
    } as any, { params: { id: summaryId } })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
    expect(res.headers.get('Connection')).toBe('keep-alive')
    
    // 驗證是否有訂閱 Redis 事件
    expect(subscribeSummaryEvents).toHaveBeenCalledWith(summaryId, expect.any(Function))
  })
})
