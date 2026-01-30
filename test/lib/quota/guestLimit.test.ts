import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkDailyQuota, checkChannelLimit, checkAutoRefreshLimit, enforceQuota } from '@/lib/quota/dailyLimit'
import { prisma } from '@/lib/db'
import { GUEST_LIMITS, ADMIN_LIMITS } from '@/lib/constants/limits'

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    summary: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    channel: {
      count: vi.fn(),
    },
  },
}))

describe('Guest Mode Quota System', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv } // Reset env before each test
  })

  afterEach(() => {
    process.env = originalEnv // Restore env after each test
  })

  describe('1. 權限識別 (Identify User Role)', () => {
    it('非白名單 Email 視為訪客 (Guest)', async () => {
      // Arrange
      process.env.ADMIN_EMAILS = 'admin@example.com'
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'guest@example.com' } as any)
      vi.mocked(prisma.summary.count).mockResolvedValue(0)

      // Act
      const result = await checkDailyQuota('user-guest')

      // Assert
      expect(result.limit).toBe(GUEST_LIMITS.DAILY_SUMMARY_LIMIT) // Guest limit (3)
      expect(result.isGuest).toBe(true)
    })

    it('白名單 Email 視為管理員 (Admin)', async () => {
      // Arrange
      process.env.ADMIN_EMAILS = 'admin@example.com'
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'admin@example.com' } as any)
      vi.mocked(prisma.summary.count).mockResolvedValue(0)

      // Act
      const result = await checkDailyQuota('user-admin')

      // Assert
      expect(result.limit).toBe(ADMIN_LIMITS.DAILY_SUMMARY_LIMIT) // Admin limit (30)
      expect(result.isGuest).toBe(false)
    })

    it('ADMIN_EMAILS 解析（多個 Email 含空格）', async () => {
      // Arrange
      process.env.ADMIN_EMAILS = 'admin1@example.com, admin2@example.com ,admin3@example.com'
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'admin2@example.com' } as any)
      vi.mocked(prisma.summary.count).mockResolvedValue(0)

      // Act
      const result = await checkDailyQuota('user-admin-2')

      // Assert
      expect(result.isGuest).toBe(false)
      expect(result.limit).toBe(ADMIN_LIMITS.DAILY_SUMMARY_LIMIT)
    })

    it('ADMIN_EMAILS 未設定或為空時，所有人視為訪客', async () => {
      // Arrange
      process.env.ADMIN_EMAILS = ''
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'any@example.com' } as any)
      vi.mocked(prisma.summary.count).mockResolvedValue(0)

      // Act
      const result = await checkDailyQuota('user-any')

      // Assert
      expect(result.isGuest).toBe(true)
      expect(result.limit).toBe(GUEST_LIMITS.DAILY_SUMMARY_LIMIT)
    })
  })

  describe('2. 每日摘要額度 (Daily Summary Limit)', () => {
    describe('訪客限制 (3 個)', () => {
      beforeEach(() => {
        process.env.ADMIN_EMAILS = 'admin@example.com'
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'guest@example.com' } as any)
      })

      it('訪客使用量未達 3 個時允許', async () => {
        // Arrange
        vi.mocked(prisma.summary.count).mockResolvedValue(GUEST_LIMITS.DAILY_SUMMARY_LIMIT - 1)

        // Act
        const result = await checkDailyQuota('user-guest')

        // Assert
        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(GUEST_LIMITS.DAILY_SUMMARY_LIMIT)
        expect(result.remaining).toBe(1)
      })

      it('訪客使用量達到 3 個時禁止', async () => {
        // Arrange
        vi.mocked(prisma.summary.count).mockResolvedValue(GUEST_LIMITS.DAILY_SUMMARY_LIMIT)
        // Mock oldest summary for reset time calculation
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        } as any)

        // Act
        const result = await checkDailyQuota('user-guest')

        // Assert
        expect(result.allowed).toBe(false)
        expect(result.limit).toBe(GUEST_LIMITS.DAILY_SUMMARY_LIMIT)
        expect(result.remaining).toBe(0)
      })

      it('enforceQuota 拋出錯誤當訪客超過額度', async () => {
        // Arrange
        vi.mocked(prisma.summary.count).mockResolvedValue(GUEST_LIMITS.DAILY_SUMMARY_LIMIT)
        vi.mocked(prisma.summary.findFirst).mockResolvedValue({
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        } as any)

        // Act & Assert
        await expect(enforceQuota('user-guest'))
          .rejects.toThrow(`已達到每日摘要生成上限（${GUEST_LIMITS.DAILY_SUMMARY_LIMIT} 個/24 小時）`)
      })
    })

    describe('管理員限制 (30 個)', () => {
      beforeEach(() => {
        process.env.ADMIN_EMAILS = 'admin@example.com'
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'admin@example.com' } as any)
      })

      it('管理員使用量超過 3 個但在 30 個以內允許', async () => {
        // Arrange
        vi.mocked(prisma.summary.count).mockResolvedValue(GUEST_LIMITS.DAILY_SUMMARY_LIMIT + 1)

        // Act
        const result = await checkDailyQuota('user-admin')

        // Assert
        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(ADMIN_LIMITS.DAILY_SUMMARY_LIMIT)
        expect(result.remaining).toBe(ADMIN_LIMITS.DAILY_SUMMARY_LIMIT - (GUEST_LIMITS.DAILY_SUMMARY_LIMIT + 1))
      })
    })
  })

  describe('3. 頻道訂閱限制 (Channel Limit)', () => {
    describe('訪客限制 (3 個)', () => {
      beforeEach(() => {
        process.env.ADMIN_EMAILS = 'admin@example.com'
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'guest@example.com' } as any)
      })

      it('訪客訂閱滿 3 個頻道時拋出錯誤', async () => {
        // Arrange
        vi.mocked(prisma.channel.count).mockResolvedValue(GUEST_LIMITS.MAX_CHANNELS_PER_USER)

        // Act & Assert
        await expect(checkChannelLimit('user-guest'))
          .rejects.toThrow(`已達到頻道訂閱上限（${GUEST_LIMITS.MAX_CHANNELS_PER_USER} 個）`)
      })

      it('訪客訂閱未滿 3 個時允許', async () => {
        // Arrange
        vi.mocked(prisma.channel.count).mockResolvedValue(GUEST_LIMITS.MAX_CHANNELS_PER_USER - 1)

        // Act
        const result = await checkChannelLimit('user-guest')

        // Assert
        expect(result.limit).toBe(GUEST_LIMITS.MAX_CHANNELS_PER_USER)
        expect(result.count).toBe(GUEST_LIMITS.MAX_CHANNELS_PER_USER - 1)
      })
    })

    describe('管理員限制 (20 個)', () => {
      beforeEach(() => {
        process.env.ADMIN_EMAILS = 'admin@example.com'
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'admin@example.com' } as any)
      })

      it('管理員訂閱超過 3 個但在 20 個以內允許', async () => {
        // Arrange
        vi.mocked(prisma.channel.count).mockResolvedValue(GUEST_LIMITS.MAX_CHANNELS_PER_USER + 1)

        // Act
        const result = await checkChannelLimit('user-admin')

        // Assert
        expect(result.limit).toBe(ADMIN_LIMITS.MAX_CHANNELS_PER_USER)
        expect(result.count).toBe(GUEST_LIMITS.MAX_CHANNELS_PER_USER + 1)
      })
    })
  })

  describe('4. 自動更新限制 (Auto Refresh Limit)', () => {
    describe('訪客限制 (0 個 - 停用)', () => {
      beforeEach(() => {
        process.env.ADMIN_EMAILS = 'admin@example.com'
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'guest@example.com' } as any)
      })

      it('訪客嘗試啟用自動更新時拋出錯誤', async () => {
        // Arrange
        // Note: count doesn't matter because limit is 0
        vi.mocked(prisma.channel.count).mockResolvedValue(0)

        // Act & Assert
        await expect(checkAutoRefreshLimit('user-guest'))
          .rejects.toThrow('訪客模式不支援自動更新頻道')
      })
    })

    describe('管理員限制 (5 個)', () => {
      beforeEach(() => {
        process.env.ADMIN_EMAILS = 'admin@example.com'
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'admin@example.com' } as any)
      })

      it('管理員啟用自動更新 (未達上限) 允許', async () => {
        // Arrange
        vi.mocked(prisma.channel.count).mockResolvedValue(ADMIN_LIMITS.MAX_AUTO_REFRESH_CHANNELS - 1)

        // Act
        const result = await checkAutoRefreshLimit('user-admin')

        // Assert
        expect(result.limit).toBe(ADMIN_LIMITS.MAX_AUTO_REFRESH_CHANNELS)
        expect(result.count).toBe(ADMIN_LIMITS.MAX_AUTO_REFRESH_CHANNELS - 1)
      })

      it('管理員啟用自動更新 (達上限) 拋出錯誤', async () => {
        // Arrange
        vi.mocked(prisma.channel.count).mockResolvedValue(ADMIN_LIMITS.MAX_AUTO_REFRESH_CHANNELS)

        // Act & Assert
        await expect(checkAutoRefreshLimit('user-admin'))
          .rejects.toThrow(`已達到自動更新頻道上限（${ADMIN_LIMITS.MAX_AUTO_REFRESH_CHANNELS} 個）`)
      })
    })
  })
})
