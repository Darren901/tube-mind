import { describe, it, expect, vi, beforeEach } from 'vitest'
import { publishSummaryEvent, subscribeSummaryEvents } from '@/lib/queue/events'

// 使用 vi.hoisted 解決 hoisting 問題
const { mockDuplicate, mockPublish, mockSubscribe } = vi.hoisted(() => ({
  mockDuplicate: vi.fn(),
  mockPublish: vi.fn(),
  mockSubscribe: vi.fn(),
}))

vi.mock('@/lib/queue/connection', () => ({
  redisConnection: {
    duplicate: mockDuplicate.mockImplementation(() => ({
      publish: mockPublish,
      subscribe: mockSubscribe,
      on: vi.fn(),
      quit: vi.fn().mockResolvedValue('OK'),
    })),
  },
}))

describe('Redis Events Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('應該能正確發布事件', async () => {
    // Act
    await publishSummaryEvent('s1', { type: 'summary_processing' })

    // Assert
    expect(mockDuplicate).toHaveBeenCalled()
    expect(mockPublish).toHaveBeenCalledWith(
      'summary:s1',
      JSON.stringify({ type: 'summary_processing' })
    )
  })

  it('應該能正確訂閱事件', () => {
    // Act
    const subscriber = subscribeSummaryEvents('s1', () => {})

    // Assert
    expect(mockDuplicate).toHaveBeenCalled()
    expect(mockSubscribe).toHaveBeenCalledWith('summary:s1', expect.any(Function))
    expect(subscriber).toBeDefined()
  })
})
