import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/tags/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

// Mocks
vi.mock('next-auth')
vi.mock('@/lib/db', () => ({
  prisma: {
    tag: {
      findMany: vi.fn(),
    },
  },
}))

// Mock NextResponse
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

describe('Tags API', () => {
  const mockSession = { user: { id: 'user-1' } }
  
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getServerSession as any).mockResolvedValue(mockSession)
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      ;(getServerSession as any).mockResolvedValue(null)
      const res = await GET() as any
      expect(res.status).toBe(401)
      expect(res.body).toEqual({ error: 'Unauthorized' })
    })

    it('should return tags ordered by usage count', async () => {
      const mockTags = [
        { id: '1', name: 'React', _count: { summaryTags: 10 } },
        { id: '2', name: 'Next.js', _count: { summaryTags: 5 } },
      ]
      ;(prisma.tag.findMany as any).mockResolvedValue(mockTags)

      const res = await GET() as any
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual(mockTags)
      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          summaryTags: {
            some: {
              isConfirmed: true,
            },
          },
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              summaryTags: {
                where: {
                  isConfirmed: true,
                },
              },
            },
          },
        },
      })
    })
  })
})
