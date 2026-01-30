import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkDailyQuota } from '@/lib/quota/dailyLimit'

// GET /api/quota - 查詢使用者的每日額度狀態
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const quota = await checkDailyQuota(session.user.id)

  return NextResponse.json({
    used: quota.used,
    limit: quota.limit,
    remaining: quota.limit - quota.used,
    resetAt: quota.resetAt.toISOString(),
    isGuest: quota.isGuest, // 新增
  })
}
