import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/channels/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { YouTubeClient } from '@/lib/youtube/client'

// Mocks
vi.mock('next-auth')
vi.mock('@/lib/quota/dailyLimit', () => ({
  checkChannelLimit: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/lib/db', () => ({
  prisma: {
    channel: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    video: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock YouTubeClient class
vi.mock('@/lib/youtube/client', () => {
  return {
    YouTubeClient: vi.fn()
  }
})

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

describe('Channels API', () => {
  const mockSession = { user: { id: 'user-1', accessToken: 'token' } }
  const mockGetChannelDetails = vi.fn()
  const mockGetChannelVideos = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getServerSession as any).mockResolvedValue(mockSession)
    
    // Setup YouTubeClient mock implementation
    ;(YouTubeClient as any).mockImplementation(function() {
      return {
        getChannelDetails: mockGetChannelDetails,
        getChannelVideos: mockGetChannelVideos,
      }
    })
  })

  describe('GET', () => {
    it('應該在未登入時回傳 401', async () => {
      ;(getServerSession as any).mockResolvedValue(null)
      const res = await GET() as any
      expect(res.status).toBe(401)
    })

    it('應該回傳頻道列表', async () => {
      const mockChannels = [{ id: 'ch1', title: 'Channel 1', _count: { videos: 10 } }]
      ;(prisma.channel.findMany as any).mockResolvedValue(mockChannels)

      const res = await GET() as any
      expect(res.status).toBe(200)
      expect(res.body).toEqual(mockChannels)
      expect(prisma.channel.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 'user-1' }
      }))
    })
  })

  describe('POST', () => {
    const createRequest = (body: any) => new Request('http://localhost/api/channels', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    it('應該在未登入時回傳 401', async () => {
      ;(getServerSession as any).mockResolvedValue(null)
      const res = await POST(createRequest({ youtubeId: 'yt-ch' })) as any
      expect(res.status).toBe(401)
    })

    it('應該在缺少 youtubeId 時回傳 400', async () => {
      const res = await POST(createRequest({})) as any
      expect(res.status).toBe(400)
    })

    it('應該在頻道已存在時回傳 400', async () => {
      ;(prisma.channel.findUnique as any).mockResolvedValue({ id: 'existing-ch' })
      const res = await POST(createRequest({ youtubeId: 'yt-ch' })) as any
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Channel already exists')
    })

    it('應該在 YouTube 上找不到頻道時回傳 404', async () => {
      ;(prisma.channel.findUnique as any).mockResolvedValue(null)
      mockGetChannelDetails.mockResolvedValue(null)

      const res = await POST(createRequest({ youtubeId: 'yt-404' })) as any
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Channel not found')
    })

    it('應該成功建立頻道並抓取新影片', async () => {
      const ytChannel = { id: 'yt-ch', title: 'New Channel', description: 'Desc', thumbnail: 'url' }
      const videos = [
        { id: 'v1', title: 'Video 1', publishedAt: new Date() }, // New
        { id: 'v2', title: 'Video 2', publishedAt: new Date() }, // Existing
      ]
      
      ;(prisma.channel.findUnique as any).mockResolvedValue(null)
      mockGetChannelDetails.mockResolvedValue(ytChannel)
      ;(prisma.channel.create as any).mockResolvedValue({ ...ytChannel, id: 'db-ch' })
      mockGetChannelVideos.mockResolvedValue(videos)
      
      // Mock video existence check
      ;(prisma.video.findUnique as any)
        .mockResolvedValueOnce(null)  // v1 not found -> create
        .mockResolvedValueOnce({ id: 'db-v2', youtubeId: 'v2' }) // v2 found -> skip

      ;(prisma.video.create as any).mockResolvedValue({ id: 'db-v1', youtubeId: 'v1' })

      const res = await POST(createRequest({ youtubeId: 'yt-ch' })) as any

      expect(res.status).toBe(201)
      expect(prisma.channel.create).toHaveBeenCalled()
      expect(mockGetChannelVideos).toHaveBeenCalledWith('yt-ch', 5)
      expect(prisma.video.create).toHaveBeenCalledTimes(1) // Only created v1
      expect(res.body.recentVideos).toHaveLength(2) // Should return both saved videos
    })

    it('應該在 YouTube API 錯誤時回傳 500', async () => {
      ;(prisma.channel.findUnique as any).mockResolvedValue(null)
      mockGetChannelDetails.mockRejectedValue(new Error('API Error'))

      const res = await POST(createRequest({ youtubeId: 'yt-error' })) as any
      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Failed to create channel')
    })
  })
})
