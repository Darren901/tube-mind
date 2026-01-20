import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/summaries/route' // 假設能透過 alias 引用，或者用相對路徑
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { addSummaryJob } from '@/lib/queue/summaryQueue'
import { NextResponse } from 'next/server'

// Mocks
vi.mock('next-auth')
vi.mock('@/lib/db', () => ({
  prisma: {
    summary: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    video: {
      findUnique: vi.fn(),
    },
  },
}))
vi.mock('@/lib/queue/summaryQueue', () => ({
  addSummaryJob: vi.fn(),
}))
// Mock NextResponse to return simple JSON objects for easier testing
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((body, init) => ({ 
        body, 
        status: init?.status || 200,
        json: async () => body 
      })),
    },
  }
})

describe('Summaries API', () => {
  const mockSession = { user: { id: 'user-1' } }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getServerSession as any).mockResolvedValue(mockSession)
  })

  describe('GET', () => {
    it('應該在未登入時回傳 401', async () => {
      ;(getServerSession as any).mockResolvedValue(null)
      const res = await GET() as any
      expect(res.status).toBe(401)
    })

    it('應該回傳使用者的摘要列表', async () => {
      const mockSummaries = [{ id: 's1', title: 'Summary 1' }]
      ;(prisma.summary.findMany as any).mockResolvedValue(mockSummaries)

      const res = await GET() as any
      
      expect(prisma.summary.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 'user-1' }
      }))
      expect(res.body).toEqual(mockSummaries)
      expect(res.status).toBe(200)
    })
  })

  describe('POST', () => {
    const validVideoId = 'vid-1'
    const createRequest = () => new Request('http://localhost/api/summaries', {
      method: 'POST',
      body: JSON.stringify({ videoId: validVideoId }),
    })

    it('應該在未登入時回傳 401', async () => {
      ;(getServerSession as any).mockResolvedValue(null)
      const res = await POST(createRequest()) as any
      expect(res.status).toBe(401)
    })

    it('應該在缺少 videoId 時回傳 400', async () => {
      const req = new Request('http://localhost/api/summaries', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const res = await POST(req) as any
      expect(res.status).toBe(400)
    })

    it('應該在影片不存在時回傳 404', async () => {
      ;(prisma.video.findUnique as any).mockResolvedValue(null)
      const res = await POST(createRequest()) as any
      expect(res.status).toBe(404)
    })

    it('應該在影片過長時回傳 400', async () => {
      ;(prisma.video.findUnique as any).mockResolvedValue({ 
        id: validVideoId, 
        duration: 4 * 60 * 60 // 4 hours 
      })
      const res = await POST(createRequest()) as any
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/影片過長/)
    })

    it('應該在摘要已存在時回傳 400', async () => {
      ;(prisma.video.findUnique as any).mockResolvedValue({ 
        id: validVideoId, 
        duration: 100 
      })
      ;(prisma.summary.findUnique as any).mockResolvedValue({ id: 'existing-s1' })
      
      const res = await POST(createRequest()) as any
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Summary already exists')
    })

    it('應該成功建立摘要並加入工作佇列', async () => {
      const mockVideo = { 
        id: validVideoId, 
        youtubeId: 'yt-1',
        duration: 100 
      }
      const newSummary = { id: 'new-s1', status: 'pending' }

      ;(prisma.video.findUnique as any).mockResolvedValue(mockVideo)
      ;(prisma.summary.findUnique as any).mockResolvedValue(null)
      ;(prisma.summary.create as any).mockResolvedValue(newSummary)

      const res = await POST(createRequest()) as any

      expect(prisma.summary.create).toHaveBeenCalledWith({
        data: {
          videoId: validVideoId,
          userId: 'user-1',
          status: 'pending',
        }
      })
      expect(addSummaryJob).toHaveBeenCalledWith({
        summaryId: 'new-s1',
        videoId: validVideoId,
        youtubeVideoId: 'yt-1',
        userId: 'user-1',
      })
      expect(res.status).toBe(201)
      expect(res.body).toEqual(newSummary)
    })
  })
})
