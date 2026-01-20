import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/videos/check/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { YouTubeClient } from '@/lib/youtube/client'

// Mocks
vi.mock('next-auth')
vi.mock('@/lib/db', () => ({
  prisma: {
    video: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    channel: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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

describe('Video Check API', () => {
  const mockSession = { user: { id: 'user-1', accessToken: 'token' } }
  // Define mock functions here so they are fresh for each test suite run
  const mockGetVideoDetails = vi.fn()
  const mockGetChannelDetails = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getServerSession as any).mockResolvedValue(mockSession)
    
    // Setup YouTubeClient mock implementation
    // Use a regular function instead of arrow function to support 'new' keyword
    ;(YouTubeClient as any).mockImplementation(function() {
      return {
        getVideoDetails: mockGetVideoDetails,
        getChannelDetails: mockGetChannelDetails,
        getSubscriptions: vi.fn(),
        getChannelVideos: vi.fn(),
      }
    })
  })

  const createRequest = (body: any) => new Request('http://localhost/api/videos/check', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  it('應該在未登入時回傳 401', async () => {
    ;(getServerSession as any).mockResolvedValue(null)
    const res = await POST(createRequest({})) as any
    expect(res.status).toBe(401)
  })

  it('應該在缺少 youtubeId 時回傳 400', async () => {
    const res = await POST(createRequest({})) as any
    expect(res.status).toBe(400)
  })

  it('應該在影片已存在時直接回傳 DB 資料', async () => {
    const existingVideo = { id: 'v1', youtubeId: 'yt-1', title: 'Existing' }
    ;(prisma.video.findUnique as any).mockResolvedValue(existingVideo)

    const res = await POST(createRequest({ youtubeId: 'yt-1' })) as any
    
    expect(res.status).toBe(200)
    expect(res.body).toEqual(existingVideo)
    expect(mockGetVideoDetails).not.toHaveBeenCalled()
  })

  it('應該在影片不存在且 Channel 已存在時建立 Video', async () => {
    ;(prisma.video.findUnique as any).mockResolvedValue(null)
    
    const ytVideo = { 
      id: 'yt-new', 
      title: 'New Video', 
      channelId: 'ch-1',
      publishedAt: new Date(),
      duration: 100 
    }
    const existingChannel = { id: 'db-ch-1', youtubeId: 'ch-1' }
    
    mockGetVideoDetails.mockResolvedValue(ytVideo)
    ;(prisma.channel.findUnique as any).mockResolvedValue(existingChannel)
    ;(prisma.video.create as any).mockResolvedValue({ ...ytVideo, id: 'db-v1' })

    const res = await POST(createRequest({ youtubeId: 'yt-new' })) as any

    expect(mockGetVideoDetails).toHaveBeenCalledWith('yt-new')
    expect(prisma.video.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        youtubeId: 'yt-new',
        channelId: 'db-ch-1'
      })
    }))
    expect(res.status).toBe(200)
  })

  it('應該在影片與 Channel 都不存在時建立兩者', async () => {
    ;(prisma.video.findUnique as any).mockResolvedValue(null)
    
    const ytVideo = { 
      id: 'yt-new', 
      title: 'New Video', 
      channelId: 'ch-new',
      publishedAt: new Date(),
      duration: 100 
    }
    const ytChannel = {
      id: 'ch-new',
      title: 'New Channel',
      description: 'Desc',
      thumbnail: 'url'
    }
    
    mockGetVideoDetails.mockResolvedValue(ytVideo)
    ;(prisma.channel.findUnique as any).mockResolvedValue(null) // Channel not found in DB
    mockGetChannelDetails.mockResolvedValue(ytChannel)
    ;(prisma.channel.create as any).mockResolvedValue({ ...ytChannel, id: 'db-ch-new' })
    ;(prisma.video.create as any).mockResolvedValue({ ...ytVideo, id: 'db-v1' })

    const res = await POST(createRequest({ youtubeId: 'yt-new' })) as any

    expect(mockGetChannelDetails).toHaveBeenCalledWith('ch-new')
    expect(prisma.channel.create).toHaveBeenCalled()
    expect(prisma.video.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        channelId: 'db-ch-new'
      })
    }))
    expect(res.status).toBe(200)
  })

  it('應該在 YouTube 上找不到影片時回傳 404', async () => {
    ;(prisma.video.findUnique as any).mockResolvedValue(null)
    mockGetVideoDetails.mockResolvedValue(null)

    const res = await POST(createRequest({ youtubeId: 'yt-404' })) as any
    
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/Video not found on YouTube/)
  })

  it('應該在無法解析 Channel 資訊時回傳 500', async () => {
    ;(prisma.video.findUnique as any).mockResolvedValue(null)
    mockGetVideoDetails.mockResolvedValue({ id: 'yt-1', channelId: 'ch-1' })
    ;(prisma.channel.findUnique as any).mockResolvedValue(null)
    mockGetChannelDetails.mockResolvedValue(null) // Failed to get channel details

    const res = await POST(createRequest({ youtubeId: 'yt-1' })) as any
    
    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/Failed to resolve channel info/)
  })

  it('應該在建立 Channel 發生 Race Condition 時自動改為查詢現有頻道', async () => {
    ;(prisma.video.findUnique as any).mockResolvedValue(null)
    
    const ytVideo = { 
      id: 'yt-race', 
      title: 'New Video', 
      channelId: 'ch-race',
      publishedAt: new Date(),
      duration: 100 
    }
    const ytChannel = { id: 'ch-race', title: 'Race Channel', thumbnail: 'url' }
    const existingChannelDB = { id: 'db-ch-race', youtubeId: 'ch-race' }
    
    mockGetVideoDetails.mockResolvedValue(ytVideo)
    ;(prisma.channel.findUnique as any).mockResolvedValue(null) // 一開始沒查到
    mockGetChannelDetails.mockResolvedValue(ytChannel)
    
    // 模擬 create 失敗 (Race Condition)
    ;(prisma.channel.create as any).mockRejectedValue(new Error('Unique constraint failed'))
    // 模擬 fallback 查詢成功
    ;(prisma.channel.findFirst as any).mockResolvedValue(existingChannelDB)
    
    ;(prisma.video.create as any).mockResolvedValue({ ...ytVideo, id: 'db-v1' })

    const res = await POST(createRequest({ youtubeId: 'yt-race' })) as any

    expect(prisma.channel.create).toHaveBeenCalled()
    expect(prisma.channel.findFirst).toHaveBeenCalledWith({ where: { youtubeId: 'ch-race' } })
    expect(prisma.video.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        channelId: 'db-ch-race' // 應該使用 fallback 查到的 ID
      })
    }))
    expect(res.status).toBe(200)
  })

  it('應該在 YouTube Client 拋出未預期錯誤時回傳 500', async () => {
    ;(prisma.video.findUnique as any).mockResolvedValue(null)
    mockGetVideoDetails.mockRejectedValue(new Error('YouTube API Quota Exceeded'))

    const res = await POST(createRequest({ youtubeId: 'yt-error' })) as any
    
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('YouTube API Quota Exceeded')
  })
})
