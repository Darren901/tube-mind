import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/chat/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { getVideoTranscript } from '@/lib/youtube/client'
import { streamText } from 'ai'

// Mocks
vi.mock('next-auth')
vi.mock('@/lib/db', () => ({
  prisma: {
    video: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))
vi.mock('@/lib/youtube/client')
vi.mock('ai', () => ({
  streamText: vi.fn(),
}))
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn()),
}))

describe('Chat API POST', () => {
  const mockSession = { user: { id: 'user-1' } }

  beforeEach(() => {
    vi.clearAllMocks()
      // Default mocks
      ; (getServerSession as any).mockResolvedValue(mockSession)
      ; (streamText as any).mockReturnValue({
        toUIMessageStreamResponse: vi.fn().mockReturnValue(new Response('stream')),
      })
  })

  it('應該在未登入時回傳 401', async () => {
    ; (getServerSession as any).mockResolvedValue(null)

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('應該在缺少 videoId 時回傳 400', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [] }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('應該在影片不存在時回傳 404', async () => {
    ; (prisma.video.findUnique as any).mockResolvedValue(null)

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [], videoId: 'vid-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('應該正確轉換訊息格式並呼叫 streamText', async () => {
    const mockVideo = {
      id: 'vid-1',
      title: 'Test Video',
      transcript: [{ text: 'Hello', timestamp: 0 }]
    }
      ; (prisma.video.findUnique as any).mockResolvedValue(mockVideo)

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        videoId: 'vid-1',
        messages: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'Hi AI' }] // Frontend format
          }
        ]
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(streamText).toHaveBeenCalledWith(expect.objectContaining({
      messages: [{ role: 'user', content: 'Hi AI' }] // Backend format
    }))
  })

  it('應該在沒有字幕時自動抓取 (Lazy Fetch)', async () => {
    const mockVideo = {
      id: 'vid-1',
      youtubeId: 'yt-1',
      title: 'Test Video',
      transcript: null // No transcript initially
    }
    const newTranscript = [{ text: 'Fetched', timestamp: 10 }]

      ; (prisma.video.findUnique as any).mockResolvedValue(mockVideo)
      ; (getVideoTranscript as any).mockResolvedValue(newTranscript)

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ videoId: 'vid-1', messages: [] }),
    })

    await POST(req)

    expect(getVideoTranscript).toHaveBeenCalledWith('yt-1')
    expect(prisma.video.update).toHaveBeenCalledWith({
      where: { id: 'vid-1' },
      data: { transcript: newTranscript },
    })
  })

  it('應該在抓取字幕失敗時回傳 500', async () => {
    const mockVideo = {
      id: 'vid-1',
      youtubeId: 'yt-1',
      transcript: null
    }
      ; (prisma.video.findUnique as any).mockResolvedValue(mockVideo)
      ; (getVideoTranscript as any).mockRejectedValue(new Error('API Error'))

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ videoId: 'vid-1', messages: [] }),
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
