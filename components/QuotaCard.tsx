'use client'

import { useEffect, useState } from 'react'
import { Activity, Clock, TrendingUp } from 'lucide-react'
import { useQuota } from '@/components/providers/QuotaProvider'

export function QuotaCard() {
  const { quota, loading } = useQuota()
  const [timeUntilReset, setTimeUntilReset] = useState<string>('')

  // Calculate time until reset
  useEffect(() => {
    if (!quota?.resetAt) return

    const updateCountdown = () => {
      const now = new Date()
      const reset = new Date(quota.resetAt!)
      const diff = reset.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeUntilReset('即將重置')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (hours > 0) {
        setTimeUntilReset(`約 ${hours} 小時後重置`)
      } else if (minutes > 0) {
        setTimeUntilReset(`約 ${minutes} 分鐘後重置`)
      } else {
        setTimeUntilReset('即將重置')
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [quota?.resetAt])

  if (loading && !quota) {
    return (
      <div className="bg-bg-secondary border border-white/5 rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-24 mb-4" />
        <div className="h-8 bg-white/10 rounded w-32" />
      </div>
    )
  }

  if (!quota) return null

  const percentage = (quota.used / quota.limit) * 100
  const isGuest = quota.isGuest
  // 對於訪客（額度小），剩餘 1 個才算 Low；對於管理員，剩餘 5 個算 Low
  const isLow = isGuest ? quota.remaining <= 1 : quota.remaining <= 5
  const isCritical = quota.remaining === 0

  return (
    <div className="bg-bg-secondary border border-white/5 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-blue" />
            <h3 className="text-lg font-semibold text-white font-rajdhani">
              每日額度
            </h3>
          </div>
          {isGuest && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-text-secondary border border-white/10">
              訪客模式
            </span>
          )}
        </div>
        {quota.resetAt && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-ibm">{timeUntilReset}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCritical
                ? 'bg-red-500'
                : isLow
                  ? 'bg-yellow-500'
                  : 'bg-brand-blue'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Used */}
        <div>
          <div className="text-xs text-text-secondary mb-1 font-ibm">
            已使用
          </div>
          <div className={`text-2xl font-bold font-mono ${
            isCritical ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'
          }`}>
            {quota.used}
          </div>
        </div>

        {/* Limit */}
        <div>
          <div className="text-xs text-text-secondary mb-1 font-ibm">
            總額度
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {quota.limit}
          </div>
        </div>

        {/* Remaining */}
        <div>
          <div className="text-xs text-text-secondary mb-1 font-ibm">
            剩餘
          </div>
          <div className={`text-2xl font-bold font-mono ${
            isCritical ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {quota.remaining}
          </div>
        </div>
      </div>

      {/* Warning Message */}
      {isLow && (
        <div className={`mt-4 p-3 rounded-lg border ${
          isCritical
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
        }`}>
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-ibm">
              {isCritical
                ? `已達到每日額度上限。${timeUntilReset || '稍後'}即可繼續使用。`
                : `額度即將用盡（剩餘 ${quota.remaining} 個）。${timeUntilReset || '稍後'}將重置。`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
