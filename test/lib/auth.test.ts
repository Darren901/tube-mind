import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authOptions } from '@/lib/auth'

// Mock dependencies
vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  prisma: {},
}))
vi.mock('next-auth/providers/google', () => ({
  default: vi.fn(),
}))

describe('NextAuth Configuration', () => {
  const { jwt, session } = authOptions.callbacks!

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock global fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('JWT Callback', () => {
    it('應該在初次登入時設定 token 資訊', async () => {
      // Arrange
      const token = {}
      const account = {
        access_token: 'access-123',
        refresh_token: 'refresh-123',
        expires_at: 1700000000,
        provider: 'google',
        type: 'oauth' as const,
        providerAccountId: '123',
      }

      // Act
      const result = await jwt!({ token, account, user: null as any })

      // Assert
      expect(result).toEqual({
        accessToken: 'access-123',
        refreshToken: 'refresh-123',
        accessTokenExpires: 1700000000000,
      })
    })

    it('應該在 token 未過期時直接回傳', async () => {
      // Arrange
      const token = {
        accessToken: 'access-123',
        accessTokenExpires: Date.now() + 10000, // 未來時間
      }

      // Act
      const result = await jwt!({ token, account: null, user: null as any })

      // Assert
      expect(result).toBe(token)
    })

    it('應該在 token 已過期時刷新 token', async () => {
      // Arrange
      const token = {
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        accessTokenExpires: Date.now() - 10000, // 過去時間
      }

      const mockResponse = {
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          expires_in: 3600,
          refresh_token: 'new-refresh',
        }),
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      // Act
      const result = await jwt!({ token, account: null, user: null as any })

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.any(Object)
      )
      expect(result).toEqual(expect.objectContaining({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        // expires_in * 1000 + Date.now() (approx)
      }))
    })

    it('應該在刷新 token 失敗時回傳 error', async () => {
      // Arrange
      const token = {
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        accessTokenExpires: Date.now() - 10000,
      }

      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'invalid_grant' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      // Act
      const result = await jwt!({ token, account: null, user: null as any })

      // Assert
      expect(result).toEqual({
        ...token,
        error: 'RefreshAccessTokenError',
      })
    })
  })

  describe('Session Callback', () => {
    it('應該將 token 資訊注入 session', async () => {
      // Arrange
      const sessionData = {
        user: { name: 'Test User', email: 'test@example.com' },
        expires: '2024-01-01',
      }
      const token = {
        accessToken: 'access-123',
        sub: 'user-123',
      }

      // Act
      const result = await session!({ session: sessionData, token, user: null as any } as any)

      // Assert
      expect((result as any).accessToken).toBe('access-123')
      expect((result.user as any)?.id).toBe('user-123')
    })

    it('應該處理 token 錯誤', async () => {
      // Arrange
      const sessionData = { user: {}, expires: '' }
      const token = {
        error: 'RefreshAccessTokenError',
      }

      // Act
      const result = await session!({ session: sessionData, token, user: null as any } as any)

      // Assert
      expect((result as any).error).toBe('RefreshAccessTokenError')
    })
  })
})
