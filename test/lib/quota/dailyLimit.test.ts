import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  checkDailyQuota, 
  enforceQuota, 
  checkChannelLimit,
  checkAutoRefreshLimit 
} from '@/lib/quota/dailyLimit'
import { LIMITS } from '@/lib/constants/limits'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  prisma: {
    summary: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    channel: {
      count: vi.fn(),
    },
  },
}))

describe('Daily Quota System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkDailyQuota()', () => {
    describe('正常情況', () => {
      it('應該允許使用者未達上限時使用', async () => {
        // Arrange
        const userId = 'user-123'
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
        
        vi.mocked(prisma.summary.count).mockResolvedValue(5)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({
          createdAt: twoHoursAgo,
        } as any)

        // Act
        const result = await checkDailyQuota(userId)

        // Assert
        expect(result.allowed).toBe(true)
        expect(result.used).toBe(5)
        expect(result.limit).toBe(LIMITS.DAILY_SUMMARY_LIMIT)
        expect(result.remaining).toBe(25)
        expect(result.resetAt.getTime()).toBeGreaterThan(Date.now())
      })

      it('應該允許未使用任何額度的新使用者', async () => {
        // Arrange
        const userId = 'user-new'
        
        vi.mocked(prisma.summary.count).mockResolvedValue(0)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue(null)

        // Act
        const result = await checkDailyQuota(userId)

        // Assert
        expect(result.allowed).toBe(true)
        expect(result.used).toBe(0)
        expect(result.limit).toBe(LIMITS.DAILY_SUMMARY_LIMIT)
        expect(result.remaining).toBe(30)
      })
    })

    describe('邊界值', () => {
      it('應該允許剛好達到上限前一個 (29 個)', async () => {
        // Arrange
        const userId = 'user-almost'
        
        vi.mocked(prisma.summary.count).mockResolvedValue(29)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        } as any)

        // Act
        const result = await checkDailyQuota(userId)

        // Assert
        expect(result.allowed).toBe(true)
        expect(result.used).toBe(29)
        expect(result.remaining).toBe(1)
      })

      it('應該拒絕達到上限 (30 個) 的使用者', async () => {
        // Arrange
        const userId = 'user-limit'
        const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)
        
        vi.mocked(prisma.summary.count).mockResolvedValue(30)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({
          createdAt: oneHourAgo,
        } as any)

        // Act
        const result = await checkDailyQuota(userId)

        // Assert
        expect(result.allowed).toBe(false)
        expect(result.used).toBe(30)
        expect(result.remaining).toBe(0)
        expect(result.resetAt.getTime()).toBeGreaterThan(Date.now())
      })

      it('應該拒絕超過上限的使用者', async () => {
        // Arrange
        const userId = 'user-over'
        
        vi.mocked(prisma.summary.count).mockResolvedValue(35)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        } as any)

        // Act
        const result = await checkDailyQuota(userId)

        // Assert
        expect(result.allowed).toBe(false)
        expect(result.used).toBe(35)
        expect(result.remaining).toBe(0)
      })
    })

    describe('時間計算正確性', () => {
      it('應該正確計算重置時間（最早摘要 + 24 小時）', async () => {
        // Arrange
        const userId = 'user-time'
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000)
        
        vi.mocked(prisma.summary.count).mockResolvedValue(8)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({
          createdAt: fiveHoursAgo,
        } as any)

        // Act
        const result = await checkDailyQuota(userId)

        // Assert
        const expectedResetAt = new Date(fiveHoursAgo.getTime() + 24 * 60 * 60 * 1000)
        expect(result.resetAt.getTime()).toBe(expectedResetAt.getTime())
      })

      it('應該處理摘要剛好在 24 小時邊界的情況', async () => {
        // Arrange
        const userId = 'user-boundary'
        const almostOneDayAgo = new Date(Date.now() - 23.99 * 60 * 60 * 1000)
        
        vi.mocked(prisma.summary.count).mockResolvedValue(10)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({
          createdAt: almostOneDayAgo,
        } as any)

        // Act
        const result = await checkDailyQuota(userId)

        // Assert
        expect(result.used).toBe(10)
        expect(result.resetAt.getTime()).toBeGreaterThan(Date.now())
      })
    })
  })

  describe('enforceQuota()', () => {
    describe('正常情況', () => {
      it('應該在額度足夠時不拋出錯誤', async () => {
        // Arrange
        const userId = 'user-ok'
        
        vi.mocked(prisma.summary.count).mockResolvedValue(3)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        } as any)

        // Act & Assert
        await expect(enforceQuota(userId)).resolves.not.toThrow()
      })
    })

    describe('異常處理', () => {
      it('應該在超過額度時拋出明確錯誤訊息', async () => {
        // Arrange
        const userId = 'user-exceeded'
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
        
        vi.mocked(prisma.summary.count).mockResolvedValue(30)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({
          createdAt: twoHoursAgo,
        } as any)

        // Act & Assert
        await expect(enforceQuota(userId)).rejects.toThrow(/每日摘要生成上限/)
        await expect(enforceQuota(userId)).rejects.toThrow(/30 個\/24 小時/)
        await expect(enforceQuota(userId)).rejects.toThrow(/22 小時後重置/)
      })

      it('應該在剛好重置前 1 分鐘正確計算時間', async () => {
        // Arrange
        const userId = 'user-reset-soon'
        const almostOneDayAgo = new Date(Date.now() - 23 * 60 * 60 * 1000 - 59 * 60 * 1000)
        
        vi.mocked(prisma.summary.count).mockResolvedValue(30)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({
          createdAt: almostOneDayAgo,
        } as any)

        // Act & Assert
        await expect(enforceQuota(userId)).rejects.toThrow(/1 小時後重置/)
      })
    })
  })

  describe('checkChannelLimit()', () => {
    describe('正常情況', () => {
      it('應該允許頻道數量未達上限', async () => {
        // Arrange
        const userId = 'user-channels'
        
        vi.mocked(prisma.channel.count).mockResolvedValue(15)

        // Act
        const result = await checkChannelLimit(userId)

        // Assert
        expect(result.count).toBe(15)
        expect(result.limit).toBe(LIMITS.MAX_CHANNELS_PER_USER)
      })
    })

    describe('邊界值', () => {
      it('應該拒絕頻道數量剛好達到上限 (20 個)', async () => {
        // Arrange
        const userId = 'user-max-channels'
        
        vi.mocked(prisma.channel.count).mockResolvedValue(20)

        // Act & Assert
        await expect(checkChannelLimit(userId)).rejects.toThrow(/頻道訂閱上限/)
        await expect(checkChannelLimit(userId)).rejects.toThrow(/20 個/)
      })

      it('應該允許頻道數量為 19 個 (未達上限)', async () => {
        // Arrange
        const userId = 'user-almost-max'
        
        vi.mocked(prisma.channel.count).mockResolvedValue(19)

        // Act
        const result = await checkChannelLimit(userId)

        // Assert
        expect(result.count).toBe(19)
        expect(result.limit).toBe(20)
      })
    })

    describe('異常處理', () => {
      it('應該在超過頻道上限時拋出錯誤', async () => {
        // Arrange
        const userId = 'user-too-many'
        
        vi.mocked(prisma.channel.count).mockResolvedValue(25)

        // Act & Assert
        await expect(checkChannelLimit(userId)).rejects.toThrow(/頻道訂閱上限/)
        await expect(checkChannelLimit(userId)).rejects.toThrow(/請刪除部分頻道後再試/)
      })
    })
  })

  describe('checkAutoRefreshLimit()', () => {
    describe('正常情況', () => {
      it('應該允許 autoRefresh 頻道數量未達上限', async () => {
        // Arrange
        const userId = 'user-auto'
        
        vi.mocked(prisma.channel.count).mockResolvedValue(3)

        // Act
        const result = await checkAutoRefreshLimit(userId)

        // Assert
        expect(result.count).toBe(3)
        expect(result.limit).toBe(LIMITS.MAX_AUTO_REFRESH_CHANNELS)
      })

      it('應該正確排除特定頻道計數 (更新現有頻道時)', async () => {
        // Arrange
        const userId = 'user-update'
        const excludeChannelId = 'channel-xyz'
        
        // Mock: 總共 5 個 autoRefresh，排除後剩 4 個
        vi.mocked(prisma.channel.count).mockResolvedValue(4)

        // Act
        const result = await checkAutoRefreshLimit(userId, excludeChannelId)

        // Assert
        expect(result.count).toBe(4)
        expect(prisma.channel.count).toHaveBeenCalledWith({
          where: {
            userId,
            autoRefresh: true,
            id: { not: excludeChannelId },
          },
        })
      })
    })

    describe('邊界值', () => {
      it('應該拒絕 autoRefresh 頻道數量達到上限 (5 個)', async () => {
        // Arrange
        const userId = 'user-max-auto'
        
        vi.mocked(prisma.channel.count).mockResolvedValue(5)

        // Act & Assert
        await expect(checkAutoRefreshLimit(userId)).rejects.toThrow(/自動更新頻道上限/)
        await expect(checkAutoRefreshLimit(userId)).rejects.toThrow(/5 個/)
      })

      it('應該允許 autoRefresh 頻道數量為 4 個 (未達上限)', async () => {
        // Arrange
        const userId = 'user-almost-auto'
        
        vi.mocked(prisma.channel.count).mockResolvedValue(4)

        // Act
        const result = await checkAutoRefreshLimit(userId)

        // Assert
        expect(result.count).toBe(4)
        expect(result.limit).toBe(5)
      })
    })

    describe('異常處理', () => {
      it('應該在超過 autoRefresh 上限時拋出錯誤', async () => {
        // Arrange
        const userId = 'user-too-many-auto'
        
        vi.mocked(prisma.channel.count).mockResolvedValue(6)

        // Act & Assert
        await expect(checkAutoRefreshLimit(userId)).rejects.toThrow(/自動更新頻道上限/)
        await expect(checkAutoRefreshLimit(userId)).rejects.toThrow(/請先停用其他頻道的自動更新/)
      })
    })
  })
})
