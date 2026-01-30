import { prisma } from '@/lib/db'
import { ADMIN_LIMITS, GUEST_LIMITS } from '@/lib/constants/limits'

/**
 * 根據使用者 Email 判斷權限並回傳對應的限制設定
 */
async function getUserLimits(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  })
  
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())
  const isAdmin = user?.email && adminEmails.includes(user.email)
  
  return {
    limits: isAdmin ? ADMIN_LIMITS : GUEST_LIMITS,
    isAdmin: !!isAdmin
  }
}

/**
 * 檢查使用者是否已達每日摘要生成額度
 * @param userId 使用者 ID
 * @returns { allowed: boolean, used: number, limit: number, resetAt: Date }
 */
export async function checkDailyQuota(userId: string) {
  const { limits, isAdmin } = await getUserLimits(userId)
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // 查詢過去 24 小時內建立的摘要數量（手動 + 自動）
  const used = await prisma.summary.count({
    where: {
      userId,
      createdAt: {
        gte: twentyFourHoursAgo,
      },
    },
  })

  // 計算額度重置時間（最早的摘要建立時間 + 24 小時）
  const oldestSummary = await prisma.summary.findFirst({
    where: {
      userId,
      createdAt: {
        gte: twentyFourHoursAgo,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      createdAt: true,
    },
  })

  const resetAt = oldestSummary
    ? new Date(oldestSummary.createdAt.getTime() + 24 * 60 * 60 * 1000)
    : now

  return {
    allowed: used < limits.DAILY_SUMMARY_LIMIT,
    used,
    limit: limits.DAILY_SUMMARY_LIMIT,
    remaining: Math.max(0, limits.DAILY_SUMMARY_LIMIT - used),
    resetAt,
    isGuest: !isAdmin, // 新增
  }
}

/**
 * 檢查並拋出錯誤（若超過額度）
 * @throws Error 當使用者超過每日額度
 */
export async function enforceQuota(userId: string) {
  const quota = await checkDailyQuota(userId)

  if (!quota.allowed) {
    const hoursUntilReset = Math.ceil(
      (quota.resetAt.getTime() - Date.now()) / (1000 * 60 * 60)
    )

    throw new Error(
      `已達到每日摘要生成上限（${quota.limit} 個/24 小時）。` +
      `將在約 ${hoursUntilReset} 小時後重置。`
    )
  }

  return quota
}

/**
 * 檢查使用者的頻道數量限制
 * @throws Error 當超過頻道數量上限
 */
export async function checkChannelLimit(userId: string) {
  const { limits } = await getUserLimits(userId)
  
  const count = await prisma.channel.count({
    where: { userId },
  })

  if (count >= limits.MAX_CHANNELS_PER_USER) {
    throw new Error(
      `已達到頻道訂閱上限（${limits.MAX_CHANNELS_PER_USER} 個）。` +
      `請刪除部分頻道後再試。`
    )
  }

  return { count, limit: limits.MAX_CHANNELS_PER_USER }
}

/**
 * 檢查 autoRefresh 頻道數量限制
 * @throws Error 當超過 autoRefresh 頻道數量上限
 */
export async function checkAutoRefreshLimit(userId: string, excludeChannelId?: string) {
  const { limits } = await getUserLimits(userId)

  // 如果上限為 0（訪客），直接拋出錯誤
  if (limits.MAX_AUTO_REFRESH_CHANNELS === 0) {
    throw new Error('訪客模式不支援自動更新頻道。')
  }

  const count = await prisma.channel.count({
    where: {
      userId,
      autoRefresh: true,
      ...(excludeChannelId && { id: { not: excludeChannelId } }),
    },
  })

  if (count >= limits.MAX_AUTO_REFRESH_CHANNELS) {
    throw new Error(
      `已達到自動更新頻道上限（${limits.MAX_AUTO_REFRESH_CHANNELS} 個）。` +
      `請先停用其他頻道的自動更新。`
    )
  }

  return { count, limit: limits.MAX_AUTO_REFRESH_CHANNELS }
}
