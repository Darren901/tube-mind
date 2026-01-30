import { prisma } from '@/lib/db'
import { OverviewChart } from '@/components/admin/OverviewChart'
import { Activity, Users, FileText, Clock } from 'lucide-react'

// 輔助函數：取得過去 7 天的日期陣列
function getLast7Days() {
  const dates = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export default async function AdminDashboardPage() {
  // 1. 基礎統計
  const [totalUsers, totalSummaries, totalChannels] = await Promise.all([
    prisma.user.count(),
    prisma.summary.count(),
    prisma.channel.count(),
  ])

  // 2. 今日摘要
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const summariesToday = await prisma.summary.count({
    where: { createdAt: { gte: today } },
  })

  // 3. 待處理任務
  const pendingJobs = await prisma.summary.count({
    where: { status: { in: ['pending', 'processing'] } },
  })

  // 4. 圖表數據 (過去 7 天摘要生成量)
  // 注意：這是一個簡單的實作，量大時建議用 SQL Group By
  const last7Days = getLast7Days()
  const chartData = await Promise.all(
    last7Days.map(async (date) => {
      const start = new Date(date)
      const end = new Date(date)
      end.setDate(end.getDate() + 1)

      const count = await prisma.summary.count({
        where: {
          createdAt: {
            gte: start,
            lt: end,
          },
        },
      })

      return {
        name: date.slice(5), // MM-DD
        total: count,
      }
    })
  )

  const stats = [
    {
      title: '總使用者',
      value: totalUsers,
      icon: Users,
      description: '註冊使用者總數',
    },
    {
      title: '今日摘要',
      value: summariesToday,
      icon: Activity,
      description: '今日生成的摘要數量',
    },
    {
      title: '總摘要數',
      value: totalSummaries,
      icon: FileText,
      description: '歷史累積摘要總數',
    },
    {
      title: '待處理任務',
      value: pendingJobs,
      icon: Clock,
      description: '目前佇列中的任務',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-rajdhani tracking-tight text-white">儀表板</h2>
        <p className="text-text-secondary">系統運作概況與關鍵指標。</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="p-6 bg-bg-secondary border border-white/5 rounded-xl hover:border-white/10 transition-colors"
          >
            <div className="flex items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-text-secondary">
                {stat.title}
              </span>
              <stat.icon className="h-4 w-4 text-brand-blue" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {stat.value}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-7">
        <div className="col-span-4 p-6 bg-bg-secondary border border-white/5 rounded-xl">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-white">摘要生成趨勢</h3>
            <p className="text-sm text-text-secondary">過去 7 天的每日生成量</p>
          </div>
          <div className="pl-2">
            <OverviewChart data={chartData} />
          </div>
        </div>
        
        {/* System Health / Logs (Placeholder) */}
        <div className="col-span-3 p-6 bg-bg-secondary border border-white/5 rounded-xl">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-white">系統狀態</h3>
            <p className="text-sm text-text-secondary">服務健康度檢查</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Database</span>
              <span className="flex items-center gap-2 text-sm text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Redis Queue</span>
              <span className="flex items-center gap-2 text-sm text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Gemini API</span>
              <span className="flex items-center gap-2 text-sm text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
