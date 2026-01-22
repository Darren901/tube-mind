import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/summaries/[id]/audio/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { addTTSJob } from '@/lib/queue/ttsQueue'

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

vi.mock('@/lib/queue/ttsQueue', () => ({
  addTTSJob: vi.fn(),
}))

describe('POST /api/summaries/[id]/audio (Non-blocking)', () => {
  const userId = 'user-123'
  const summaryId = 'summary-123'
  const mockSession = { user: { id: userId } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('應該在未登入時返回 401', async () => {
    ;(getServerSession as any).mockResolvedValue(null)
    const res = await POST({} as Request, { params: { id: summaryId } })
    expect(res.status).toBe(401)
  })

  it('應該在找不到摘要時返回 404', async () => {
    ;(getServerSession as any).mockResolvedValue(mockSession)
    ;(prisma.summary.findFirst as any).mockResolvedValue(null)
    const res = await POST({} as Request, { params: { id: summaryId } })
    expect(res.status).toBe(404)
  })

  it('應該在音訊已存在時直接返回快取的 URL', async () => {
    const cachedUrl = 'https://gcs.com/cached.mp3'
    ;(getServerSession as any).mockResolvedValue(mockSession)
    ;(prisma.summary.findFirst as any).mockResolvedValue({
      id: summaryId,
      userId,
      audioUrl: cachedUrl,
    })

    const res = await POST({} as Request, { params: { id: summaryId } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.audioUrl).toBe(cachedUrl)
    expect(addTTSJob).not.toHaveBeenCalled()
  })

  it('應該在摘要尚未完成時返回 400', async () => {
    ;(getServerSession as any).mockResolvedValue(mockSession)
    ;(prisma.summary.findFirst as any).mockResolvedValue({
      id: summaryId,
      userId,
      status: 'processing',
      audioUrl: null,
    })

    const res = await POST({} as Request, { params: { id: summaryId } })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Summary is not completed yet')
  })

  it('應該成功將任務加入隊列並返回 processing 狀態', async () => {
    ;(getServerSession as any).mockResolvedValue(mockSession)
    ;(prisma.summary.findFirst as any).mockResolvedValue({
      id: summaryId,
      userId,
      status: 'completed',
      audioUrl: null,
      video: { youtubeId: 'v123' },
    })

    const res = await POST({} as Request, { params: { id: summaryId } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('processing')
    expect(addTTSJob).toHaveBeenCalledWith({
      summaryId: summaryId,
      youtubeVideoId: 'v123',
    })
  })
})
