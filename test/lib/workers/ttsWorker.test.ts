import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import type { Job } from 'bullmq'
import type { TTSJobData } from '@/lib/queue/types'
import type { SummaryResult } from '@/lib/ai/types'

// Mock external dependencies
const mockPrismaUpdate = vi.fn()
const mockPrismaFindUnique = vi.fn()
const mockGenerateSpeech = vi.fn()
const mockUploadAudio = vi.fn()
const mockPublishSummaryEvent = vi.fn()

// Store worker callbacks
let workerJobHandler: ((job: Job<TTSJobData>) => Promise<any>) | null = null
let workerEventHandlers: Record<string, Function> = {}

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    summary: {
      update: mockPrismaUpdate,
      findUnique: mockPrismaFindUnique,
    },
  },
}))

// Mock TTS Engine
vi.mock('@/lib/audio/tts', () => ({
  generateSpeech: mockGenerateSpeech,
}))

// Mock Storage
vi.mock('@/lib/audio/storage', () => ({
  uploadAudio: mockUploadAudio,
}))

// Mock Events
vi.mock('@/lib/queue/events', () => ({
  publishSummaryEvent: mockPublishSummaryEvent,
}))

// Mock Redis Connection
vi.mock('@/lib/queue/connection', () => ({
  redisConnection: {},
}))

// Mock BullMQ Worker
vi.mock('bullmq', () => {
  class MockWorker {
    constructor(queueName: string, handler: Function, options: any) {
      workerJobHandler = handler as any
    }
    
    on(event: string, callback: Function) {
      workerEventHandlers[event] = callback
      return this
    }
  }
  
  return {
    Worker: MockWorker,
  }
})

describe('TTS Worker', () => {
  // Import worker once to set up handlers
  beforeAll(async () => {
    await import('@/lib/workers/ttsWorker')
  })

  const mockJobData: TTSJobData = {
    summaryId: 'summary-123',
    youtubeVideoId: 'dQw4w9WgXcQ',
  }

  const mockJob = {
    id: 'job-789',
    data: mockJobData,
  } as Job<TTSJobData>

  const mockSummaryResult: SummaryResult = {
    topic: '測試主題',
    keyPoints: ['要點1'],
    sections: [{ timestamp: '00:00', title: '小節', summary: '摘要內容' }],
  }

  const mockSummary = {
    id: 'summary-123',
    status: 'completed',
    content: mockSummaryResult,
    audioUrl: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('核心流程測試', () => {
    it('應該成功生成語音並更新資料庫', async () => {
      // Arrange
      mockPrismaFindUnique.mockResolvedValueOnce(mockSummary)
      mockGenerateSpeech.mockResolvedValueOnce(Buffer.from('fake-audio'))
      mockUploadAudio.mockResolvedValueOnce('https://storage.com/audio.mp3')
      mockPrismaUpdate.mockResolvedValueOnce({ ...mockSummary, audioUrl: 'https://storage.com/audio.mp3' })

      // Act
      const result = await workerJobHandler!(mockJob)

      // Assert
      expect(result).toEqual({ success: true })
      
      // 驗證事件發布
      expect(mockPublishSummaryEvent).toHaveBeenCalledWith('summary-123', { type: 'audio_generating' })
      expect(mockPublishSummaryEvent).toHaveBeenCalledWith('summary-123', {
        type: 'audio_completed',
        data: { audioUrl: 'https://storage.com/audio.mp3' },
      })

      // 驗證 TTS 文字組合
      expect(mockGenerateSpeech).toHaveBeenCalledWith(expect.objectContaining({
        text: expect.stringContaining('測試主題'),
      }))

      // 驗證資料庫更新
      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'summary-123' },
        data: {
          audioUrl: 'https://storage.com/audio.mp3',
          audioGeneratedAt: expect.any(Date),
        },
      })
    })

    it('應該在音訊已存在時跳過生成', async () => {
      // Arrange
      const existingSummary = { ...mockSummary, audioUrl: 'https://existing.mp3' }
      mockPrismaFindUnique.mockResolvedValueOnce(existingSummary)

      // Act
      const result = await workerJobHandler!(mockJob)

      // Assert
      expect(result).toEqual({ success: true, cached: true })
      expect(mockGenerateSpeech).not.toHaveBeenCalled()
      expect(mockPublishSummaryEvent).toHaveBeenCalledWith('summary-123', {
        type: 'audio_completed',
        data: { audioUrl: 'https://existing.mp3' },
      })
    })
  })

  describe('錯誤處理測試', () => {
    it('應該在 Summary 不存在時拋出錯誤並發布失敗事件', async () => {
      // Arrange
      mockPrismaFindUnique.mockResolvedValueOnce(null)

      // Act & Assert
      await expect(workerJobHandler!(mockJob)).rejects.toThrow('Summary summary-123 not found')
      expect(mockPublishSummaryEvent).toHaveBeenCalledWith('summary-123', {
        type: 'audio_failed',
        error: 'Summary summary-123 not found',
      })
    })

    it('應該在 Summary 未完成時拋出錯誤', async () => {
      // Arrange
      mockPrismaFindUnique.mockResolvedValueOnce({ ...mockSummary, status: 'processing' })

      // Act & Assert
      await expect(workerJobHandler!(mockJob)).rejects.toThrow('Summary summary-123 is not completed yet')
    })

    it('應該在 TTS 生成失敗時發布失敗事件', async () => {
      // Arrange
      mockPrismaFindUnique.mockResolvedValueOnce(mockSummary)
      mockGenerateSpeech.mockRejectedValueOnce(new Error('TTS Engine Error'))

      // Act & Assert
      await expect(workerJobHandler!(mockJob)).rejects.toThrow('TTS Engine Error')
      expect(mockPublishSummaryEvent).toHaveBeenCalledWith('summary-123', {
        type: 'audio_failed',
        error: 'TTS Engine Error',
      })
    })
  })
})
