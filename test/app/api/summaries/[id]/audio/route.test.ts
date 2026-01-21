import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/summaries/[id]/audio/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { generateSpeech } from '@/lib/audio/tts'
import { uploadAudio } from '@/lib/audio/storage'
import { NextResponse } from 'next/server'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    summary: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/audio/tts', () => ({
  generateSpeech: vi.fn(),
}))

vi.mock('@/lib/audio/storage', () => ({
  uploadAudio: vi.fn(),
}))

describe('POST /api/summaries/[id]/audio', () => {
  const userId = 'user-123'
  const summaryId = 'summary-123'
  const mockSession = { user: { id: userId } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('應該在未登入時返回 401', async () => {
    // Arrange
    ;(getServerSession as any).mockResolvedValue(null)

    // Act
    const res = await POST({} as Request, { params: { id: summaryId } })

    // Assert
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('應該在找不到摘要時返回 404', async () => {
    // Arrange
    ;(getServerSession as any).mockResolvedValue(mockSession)
    ;(prisma.summary.findFirst as any).mockResolvedValue(null)

    // Act
    const res = await POST({} as Request, { params: { id: summaryId } })

    // Assert
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Summary not found')
  })

  it('應該在音訊已存在時直接返回快取的 URL', async () => {
    // Arrange
    const cachedUrl = 'https://gcs.com/cached.mp3'
    ;(getServerSession as any).mockResolvedValue(mockSession)
    ;(prisma.summary.findFirst as any).mockResolvedValue({
      id: summaryId,
      userId,
      audioUrl: cachedUrl,
    })

    // Act
    const res = await POST({} as Request, { params: { id: summaryId } })

    // Assert
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.audioUrl).toBe(cachedUrl)
    expect(generateSpeech).not.toHaveBeenCalled()
  })

  it('應該在摘要尚未完成時返回 400', async () => {
    // Arrange
    ;(getServerSession as any).mockResolvedValue(mockSession)
    ;(prisma.summary.findFirst as any).mockResolvedValue({
      id: summaryId,
      userId,
      status: 'processing',
      audioUrl: null,
    })

    // Act
    const res = await POST({} as Request, { params: { id: summaryId } })

    // Assert
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Summary is not completed yet')
  })

  it('應該在內容不足時返回 400', async () => {
    // Arrange
    ;(getServerSession as any).mockResolvedValue(mockSession)
    ;(prisma.summary.findFirst as any).mockResolvedValue({
      id: summaryId,
      userId,
      status: 'completed',
      audioUrl: null,
      content: { topic: '', keyPoints: [], sections: [] },
    })

    // Act
    const res = await POST({} as Request, { params: { id: summaryId } })

    // Assert
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('摘要內容不足，無法生成語音')
  })

  it('應該正確生成音訊並快取到資料庫', async () => {
    // Arrange
    const mockAudioUrl = 'https://gcs.com/new.mp3'
    const mockContent = {
      topic: '測試主題',
      keyPoints: ['觀點 1'],
      sections: [{ title: '段落 1', summary: '摘要 1' }],
    }

    ;(getServerSession as any).mockResolvedValue(mockSession)
    ;(prisma.summary.findFirst as any).mockResolvedValue({
      id: summaryId,
      userId,
      status: 'completed',
      audioUrl: null,
      content: mockContent,
    })
    ;(generateSpeech as any).mockResolvedValue(Buffer.from('fake-audio'))
    ;(uploadAudio as any).mockResolvedValue(mockAudioUrl)

    // Act
    const res = await POST({} as Request, { params: { id: summaryId } })

    // Assert
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.audioUrl).toBe(mockAudioUrl)
    expect(generateSpeech).toHaveBeenCalled()
    expect(uploadAudio).toHaveBeenCalled()
    expect(prisma.summary.update).toHaveBeenCalledWith({
      where: { id: summaryId },
      data: expect.objectContaining({
        audioUrl: mockAudioUrl,
        audioGeneratedAt: expect.any(Date),
      }),
    })
  })

  it('應該在 Google TTS 失敗時返回 500', async () => {
    // Arrange
    ;(getServerSession as any).mockResolvedValue(mockSession)
    ;(prisma.summary.findFirst as any).mockResolvedValue({
      id: summaryId,
      userId,
      status: 'completed',
      audioUrl: null,
      content: { topic: '有效內容' },
    })
    ;(generateSpeech as any).mockRejectedValue(new Error('TTS Engine Error'))

    // Act
    const res = await POST({} as Request, { params: { id: summaryId } })

    // Assert
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('Failed to generate audio')
  })
})
