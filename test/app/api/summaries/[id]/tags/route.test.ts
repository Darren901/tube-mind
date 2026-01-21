import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, PATCH, DELETE } from '@/app/api/summaries/[id]/tags/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

// Mocks
vi.mock('next-auth')
vi.mock('@/lib/db', () => ({
  prisma: {
    summary: {
      findFirst: vi.fn(),
    },
    tag: {
      upsert: vi.fn(),
    },
    summaryTag: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('Summary Tags API', () => {
  const mockSession = {
    user: { id: 'user-1' },
  }
  const mockParams = { params: { id: 'summary-1' } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET - Get all tags for summary', () => {
    it('should return 401 if not authenticated', async () => {
        vi.mocked(getServerSession).mockResolvedValue(null)
        const request = new Request('http://localhost/api/summaries/summary-1/tags')
        const response = await GET(request, mockParams)
        expect(response.status).toBe(401)
    })

    it('should return 404 if summary not found', async () => {
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)
        const request = new Request('http://localhost/api/summaries/summary-1/tags')
        const response = await GET(request, mockParams)
        expect(response.status).toBe(404)
    })

    it('should return tags if summary exists', async () => {
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({ id: 'summary-1' } as any)
        
        const mockTags = [
            { id: 'st-1', summaryId: 'summary-1', tagId: 't-1', tag: { id: 't-1', name: 'React' } }
        ]
        vi.mocked(prisma.summaryTag.findMany).mockResolvedValue(mockTags as any)

        const request = new Request('http://localhost/api/summaries/summary-1/tags')
        const response = await GET(request, mockParams)
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data).toHaveLength(1)
        expect(data[0].tag.name).toBe('React')
    })
  })

  describe('POST - Add a new tag', () => {
      it('should return 400 if name is missing', async () => {
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
        const request = new Request('http://localhost/api/summaries/summary-1/tags', {
            method: 'POST',
            body: JSON.stringify({})
        })
        const response = await POST(request, mockParams)
        expect(response.status).toBe(400)
      })

      it('should add tag successfully', async () => {
          vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
          vi.mocked(prisma.summary.findFirst).mockResolvedValue({ id: 'summary-1' } as any)
          vi.mocked(prisma.tag.upsert).mockResolvedValue({ id: 't-2', name: 'Next.js' } as any)
          vi.mocked(prisma.summaryTag.upsert).mockResolvedValue({
              id: 'st-2', 
              summaryId: 'summary-1', 
              tagId: 't-2',
              isConfirmed: true,
              createdBy: 'USER',
              tag: { id: 't-2', name: 'Next.js' }
          } as any)

          const request = new Request('http://localhost/api/summaries/summary-1/tags', {
            method: 'POST',
            body: JSON.stringify({ name: 'Next.js' })
          })
          const response = await POST(request, mockParams)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.tag.name).toBe('Next.js')
          expect(prisma.tag.upsert).toHaveBeenCalled()
          expect(prisma.summaryTag.upsert).toHaveBeenCalled()
      })
  })

  describe('PATCH - Confirm a tag', () => {
      it('should return 400 if tagId is missing', async () => {
          vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
          const request = new Request('http://localhost/api/summaries/summary-1/tags')
          const response = await PATCH(request, mockParams)
          expect(response.status).toBe(400)
      })

      it('should confirm tag successfully', async () => {
          vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
          vi.mocked(prisma.summary.findFirst).mockResolvedValue({ id: 'summary-1' } as any)
          vi.mocked(prisma.summaryTag.update).mockResolvedValue({
              id: 'st-1',
              isConfirmed: true
          } as any)

          const request = new Request('http://localhost/api/summaries/summary-1/tags?tagId=t-1', {
              method: 'PATCH',
              body: JSON.stringify({ isConfirmed: true })
          })
          const response = await PATCH(request, mockParams)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.isConfirmed).toBe(true)
      })
      
      it('should return 404 if tag update fails (tag not found)', async () => {
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({ id: 'summary-1' } as any)
        vi.mocked(prisma.summaryTag.update).mockRejectedValue(new Error('Record to update not found.'))

        const request = new Request('http://localhost/api/summaries/summary-1/tags?tagId=t-1', {
            method: 'PATCH',
            body: JSON.stringify({ isConfirmed: true })
        })
        const response = await PATCH(request, mockParams)
        expect(response.status).toBe(404)
      })
  })

  describe('DELETE - Remove a tag', () => {
       it('should return 400 if tagId is missing', async () => {
          vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
          const request = new Request('http://localhost/api/summaries/summary-1/tags')
          const response = await DELETE(request, mockParams)
          expect(response.status).toBe(400)
      })

      it('should remove tag successfully', async () => {
          vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
          vi.mocked(prisma.summary.findFirst).mockResolvedValue({ id: 'summary-1' } as any)
          vi.mocked(prisma.summaryTag.delete).mockResolvedValue({ success: true } as any)

          const request = new Request('http://localhost/api/summaries/summary-1/tags?tagId=t-1', {
              method: 'DELETE'
          })
          const response = await DELETE(request, mockParams)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.success).toBe(true)
      })

      it('should return 404 if tag delete fails (tag not found)', async () => {
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({ id: 'summary-1' } as any)
        vi.mocked(prisma.summaryTag.delete).mockRejectedValue(new Error('Record to delete does not exist.'))

        const request = new Request('http://localhost/api/summaries/summary-1/tags?tagId=t-1', {
            method: 'DELETE'
        })
        const response = await DELETE(request, mockParams)
        expect(response.status).toBe(404)
      })
  })
})
