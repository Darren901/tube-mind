import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateSpeech } from '@/lib/audio/tts'

const { mockSynthesizeSpeech } = vi.hoisted(() => ({
  mockSynthesizeSpeech: vi.fn(),
}))

// Mock Google TTS Client
vi.mock('@google-cloud/text-to-speech', () => ({
  TextToSpeechClient: class {
    synthesizeSpeech = mockSynthesizeSpeech
  },
}))

describe('TTS Service (Long Text Support)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('應該正確處理短文字並合併 Buffer', async () => {
    // Arrange
    mockSynthesizeSpeech.mockResolvedValue([{ audioContent: Uint8Array.from([1, 2, 3]) }])

    // Act
    const result = await generateSpeech({ text: '你好' })

    // Assert
    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBe(3)
    expect(mockSynthesizeSpeech).toHaveBeenCalledTimes(1)
  })

  it('應該將長文字切分為多段並合併結果', async () => {
    // Arrange
    // 構造一段超過 4500 bytes 的文字
    const longText = '這是一個很長的文章。'.repeat(300) // 約 300 * 30 = 9000 bytes
    
    mockSynthesizeSpeech
      .mockResolvedValue([{ audioContent: Uint8Array.from([1, 1, 1]) }]) // 每次回傳不同內容模擬分段

    // Act
    const result = await generateSpeech({ text: longText })

    // Assert
    // 9000 bytes / 4500 bytes = 2 chunks (但因為標點符號切割，可能會多一小塊)
    expect(mockSynthesizeSpeech.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(result).toBeInstanceOf(Buffer)
  })

  it('應該在合成失敗時拋出錯誤', async () => {
    // Arrange
    mockSynthesizeSpeech.mockResolvedValue([{ audioContent: null }])

    // Act & Assert
    await expect(generateSpeech({ text: '失敗' })).rejects.toThrow('TTS 生成失敗：無音訊內容')
  })
})
