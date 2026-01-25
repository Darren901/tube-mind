import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateVideoSummary, generateSummaryWithRetry, type UserPreferences } from '@/lib/ai/summarizer'
import type { TranscriptSegment } from '@/lib/youtube/types'
import type { SummaryResult } from '@/lib/ai/types'

// Mock @google/generative-ai
const mockGenerateContent = vi.fn()

vi.mock('@google/generative-ai', () => {
  class MockGenerativeModel {
    generateContent = mockGenerateContent
  }
  
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return new MockGenerativeModel()
    }
  }
  
  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
  }
})

describe('AI Summarizer', () => {
  const mockTranscript: TranscriptSegment[] = [
    { timestamp: 0, text: 'Hello world' },
    { timestamp: 120, text: 'This is a test' },
    { timestamp: 300, text: 'Video content here' },
  ]
  
  const mockSummaryResult: SummaryResult = {
    topic: '測試影片主題',
    keyPoints: ['重點1', '重點2', '重點3'],
    sections: [
      {
        timestamp: '00:00',
        title: '開場',
        summary: '這是開場的摘要內容',
      },
      {
        timestamp: '02:00',
        title: '主要內容',
        summary: '這是主要內容的摘要',
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateVideoSummary()', () => {
    it('應該成功生成影片摘要', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockSummaryResult),
        },
      })

      const result = await generateVideoSummary(mockTranscript, 'Test Video')

      expect(result).toEqual(mockSummaryResult)
      expect(mockGenerateContent).toHaveBeenCalledTimes(1)
      
      // 驗證呼叫時的 prompt 包含必要資訊
      const callArgs = mockGenerateContent.mock.calls[0][0]
      expect(callArgs).toContain('Test Video')
      expect(callArgs).toContain('[00:00] Hello world')
      expect(callArgs).toContain('[02:00] This is a test')
      expect(callArgs).toContain('[05:00] Video content here')
    })

    it('應該正確格式化時間戳', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockSummaryResult),
        },
      })

      const transcript: TranscriptSegment[] = [
        { timestamp: 0, text: 'Start' },
        { timestamp: 65, text: 'One minute five' },
        { timestamp: 3661, text: 'One hour one minute one second' },
      ]

      await generateVideoSummary(transcript, 'Test')

      const callArgs = mockGenerateContent.mock.calls[0][0]
      expect(callArgs).toContain('[00:00] Start')
      expect(callArgs).toContain('[01:05] One minute five')
      expect(callArgs).toContain('[61:01] One hour one minute one second')
    })

    it('應該處理空字幕陣列', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockSummaryResult),
        },
      })

      const result = await generateVideoSummary([], 'Empty Video')

      expect(result).toEqual(mockSummaryResult)
      expect(mockGenerateContent).toHaveBeenCalled()
    })

    it('應該在 AI API 返回無效 JSON 時拋出錯誤', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Invalid JSON',
        },
      })

      await expect(
        generateVideoSummary(mockTranscript, 'Test Video')
      ).rejects.toThrow()
    })

    it('應該在 AI API 呼叫失敗時拋出錯誤', async () => {
      mockGenerateContent.mockRejectedValue(
        new Error('AI service unavailable')
      )

      await expect(
        generateVideoSummary(mockTranscript, 'Test Video')
      ).rejects.toThrow('AI service unavailable')
    })

    it('應該使用正確的模型配置', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockSummaryResult),
        },
      })

      await generateVideoSummary(mockTranscript, 'Test')

      // 驗證 model 被呼叫時的配置
      // 由於我們 mock 的方式，這裡主要驗證函數有被呼叫
      expect(mockGenerateContent).toHaveBeenCalled()
    })

    it('應該在 prompt 中包含使用者偏好設定', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockSummaryResult),
        },
      })

      const prefs: UserPreferences = {
        summaryTone: 'casual',
        summaryDetail: 'comprehensive',
      }

      await generateVideoSummary(mockTranscript, 'Test Video', [], prefs)

      const callArgs = mockGenerateContent.mock.calls[0][0]
      expect(callArgs).toContain('使用輕鬆、友善、口語化的語氣')
      expect(callArgs).toContain('"keyPoints" 5-7 個')
    })

    it('應該處理自訂語氣', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockSummaryResult),
        },
      })

      const prefs: UserPreferences = {
        summaryTone: 'custom',
        summaryToneCustom: '像個海盜一樣說話',
        summaryDetail: 'standard',
      }

      await generateVideoSummary(mockTranscript, 'Test Video', [], prefs)

      const callArgs = mockGenerateContent.mock.calls[0][0]
      expect(callArgs).toContain('風格：像個海盜一樣說話')
    })
  })

  describe('generateSummaryWithRetry()', () => {
    it('應該在第一次嘗試成功時直接返回結果', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockSummaryResult),
        },
      })

      const result = await generateSummaryWithRetry(mockTranscript, 'Test Video')

      expect(result).toEqual(mockSummaryResult)
      expect(mockGenerateContent).toHaveBeenCalledTimes(1)
    })

    it('應該在遇到 429 錯誤時重試', async () => {
      const error429 = Object.assign(new Error('Rate limit'), { status: 429 })
      
      mockGenerateContent
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(mockSummaryResult),
          },
        })

      const result = await generateSummaryWithRetry(mockTranscript, 'Test Video')

      expect(result).toEqual(mockSummaryResult)
      expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    })

    it('應該在遇到 500 錯誤時重試', async () => {
      const error500 = Object.assign(new Error('Server error'), { status: 500 })
      
      mockGenerateContent
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(mockSummaryResult),
          },
        })

      const result = await generateSummaryWithRetry(mockTranscript, 'Test Video')

      expect(result).toEqual(mockSummaryResult)
      expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    })

    it('應該在遇到 503 錯誤時重試', async () => {
      const error503 = Object.assign(new Error('Service unavailable'), { status: 503 })
      
      mockGenerateContent
        .mockRejectedValueOnce(error503)
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(mockSummaryResult),
          },
        })

      const result = await generateSummaryWithRetry(mockTranscript, 'Test Video')

      expect(result).toEqual(mockSummaryResult)
      expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    })

    it('應該在遇到非可重試錯誤時立即失敗', async () => {
      const error400 = Object.assign(new Error('Bad request'), { status: 400 })
      
      mockGenerateContent.mockRejectedValue(error400)

      await expect(
        generateSummaryWithRetry(mockTranscript, 'Test Video')
      ).rejects.toThrow('Bad request')

      // 不應該重試
      expect(mockGenerateContent).toHaveBeenCalledTimes(1)
    })

    it('應該在達到最大重試次數後拋出錯誤', async () => {
      const error429 = Object.assign(new Error('Rate limit'), { status: 429 })
      
      mockGenerateContent.mockRejectedValue(error429)

      await expect(
        generateSummaryWithRetry(mockTranscript, 'Test Video', [], undefined, 2)
      ).rejects.toThrow('Max retries exceeded')

      // 應該重試 2 次
      expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    }, 10000) // 增加 timeout

    it('應該使用自訂的最大重試次數', async () => {
      const error429 = Object.assign(new Error('Rate limit'), { status: 429 })
      
      mockGenerateContent.mockRejectedValue(error429)

      await expect(
        generateSummaryWithRetry(mockTranscript, 'Test Video', [], undefined, 5)
      ).rejects.toThrow('Max retries exceeded')

      expect(mockGenerateContent).toHaveBeenCalledTimes(5)
    }, 35000) // 增加 timeout 因為有 5 次重試，每次延遲 2,4,6,8,10 秒

    it('應該在多次 429 錯誤後最終成功', async () => {
      const error429 = Object.assign(new Error('Rate limit'), { status: 429 })
      
      mockGenerateContent
        .mockRejectedValueOnce(error429)
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(mockSummaryResult),
          },
        })

      const result = await generateSummaryWithRetry(mockTranscript, 'Test Video', [], undefined, 3)

      expect(result).toEqual(mockSummaryResult)
      expect(mockGenerateContent).toHaveBeenCalledTimes(3)
    }, 15000) // 增加 timeout 因為有延遲
  })
})
