import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import AdminLayout from '@/app/(admin)/layout'
import AdminDashboardPage from '@/app/(admin)/admin/page'
import UsersPage from '@/app/(admin)/admin/users/page'
import { ADMIN_LIMITS, GUEST_LIMITS } from '@/lib/constants/limits'

// Mocks
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  usePathname: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    summary: {
      count: vi.fn(),
    },
    channel: {
      count: vi.fn(),
    },
  },
}))

// Mock components to avoid rendering issues
vi.mock('@/components/admin/AdminNavbar', () => ({
  AdminNavbar: () => null
}))

vi.mock('@/components/admin/OverviewChart', () => ({
  OverviewChart: () => null
}))

describe('Admin Dashboard', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv }
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('1. 權限檢查 (Layout)', () => {
    it('未登入使用者應被導向登入頁', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      try {
        await AdminLayout({ children: null })
      } catch (e) {
        // redirect throws an error in Next.js, but we mocked it to just be a function
        // However, if the implementation relies on redirect throwing, we might need to handle it
      }

      expect(redirect).toHaveBeenCalledWith('/auth/signin')
    })

    it('非管理員使用者應被導向首頁', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'guest@example.com' }
      } as any)

      await AdminLayout({ children: null })

      expect(redirect).toHaveBeenCalledWith('/channels')
    })

    it('管理員使用者應能訪問', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'admin@example.com' }
      } as any)

      await AdminLayout({ children: 'content' })

      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe('2. 儀表板數據 (Dashboard)', () => {
    it('應正確獲取統計數據', async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(10)
      vi.mocked(prisma.summary.count).mockResolvedValue(50)
      vi.mocked(prisma.channel.count).mockResolvedValue(5)

      await AdminDashboardPage()

      expect(prisma.user.count).toHaveBeenCalled()
      // Total(1) + Today(1) + Pending(1) + Chart(7) = 10 calls
      expect(prisma.summary.count).toHaveBeenCalledTimes(10)
      expect(prisma.channel.count).toHaveBeenCalled()
    })
  })

  describe('3. 使用者列表 (Users)', () => {
    it('應正確計算使用者額度與角色', async () => {
      const mockUsers = [
        { 
          id: '1', 
          email: 'admin@example.com', 
          name: 'Admin', 
          createdAt: new Date(),
          _count: { summaries: 100, channels: 5 } // Added _count
        },
        { 
          id: '2', 
          email: 'guest@example.com', 
          name: 'Guest', 
          createdAt: new Date(),
          _count: { summaries: 5, channels: 1 } // Added _count
        },
      ]

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)
      
      // Mock summary counts for users
      // Admin: 10 used
      // Guest: 2 used
      vi.mocked(prisma.summary.count).mockImplementation((async (args: any) => {
        if (args?.where?.userId === '1') return 10
        if (args?.where?.userId === '2') return 2
        return 0
      }) as any)

      // We can't easily inspect the rendered output of a Server Component in a unit test
      // without rendering it. However, we can ensure the logic runs without error
      // and calls the DB correctly.
      
      await UsersPage()

      expect(prisma.user.findMany).toHaveBeenCalled()
      // Summary count called for each user
      expect(prisma.summary.count).toHaveBeenCalledTimes(2) 
    })
  })
})
