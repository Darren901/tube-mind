import { prisma } from '@/lib/db'
import Image from 'next/image'
import { LIMITS, GUEST_LIMITS, ADMIN_LIMITS } from '@/lib/constants/limits'

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          channels: true,
          summaries: true,
        }
      }
    }
  })

  // 計算今日用量與角色
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())

  const usersWithQuota = await Promise.all(
    users.map(async (user) => {
      const usedToday = await prisma.summary.count({
        where: {
          userId: user.id,
          createdAt: { gte: today },
        },
      })

      const isAdmin = user.email && adminEmails.includes(user.email)
      const limit = isAdmin ? ADMIN_LIMITS.DAILY_SUMMARY_LIMIT : GUEST_LIMITS.DAILY_SUMMARY_LIMIT

      return {
        ...user,
        isAdmin,
        quota: {
          used: usedToday,
          limit,
        },
      }
    })
  )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-rajdhani tracking-tight text-white">使用者管理</h2>
        <p className="text-text-secondary">查看註冊使用者與額度使用情形。</p>
      </div>

      <div className="bg-bg-secondary border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-secondary uppercase bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3">使用者</th>
                <th className="px-6 py-3">角色</th>
                <th className="px-6 py-3">今日額度</th>
                <th className="px-6 py-3">總摘要數</th>
                <th className="px-6 py-3">訂閱頻道</th>
                <th className="px-6 py-3">註冊時間</th>
              </tr>
            </thead>
            <tbody>
              {usersWithQuota.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name || ''}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">
                        {user.name?.[0] || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-white">{user.name}</div>
                      <div className="text-xs text-text-secondary">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.isAdmin ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-brand-blue/20 text-brand-blue">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/10 text-text-secondary">
                        Guest
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            user.quota.used >= user.quota.limit
                              ? 'bg-red-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              (user.quota.used / user.quota.limit) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="font-mono">
                        {user.quota.used}/{user.quota.limit}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-text-secondary">
                    {user._count.summaries}
                  </td>
                  <td className="px-6 py-4 font-mono text-text-secondary">
                    {user._count.channels}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">
                    {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
