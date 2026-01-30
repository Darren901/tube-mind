'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuota } from '@/components/providers/QuotaProvider'

interface CreateSummaryButtonProps {
  videoId: string
  showQuota?: boolean
}

export function CreateSummaryButton({ videoId, showQuota = false }: CreateSummaryButtonProps) {
  const router = useRouter()
  const { quota, refreshQuota } = useQuota()
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const res = await fetch('/api/summaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create summary')
      }

      toast.success('摘要建立成功')
      // Refresh quota after successful creation
      refreshQuota()
      
      const summary = await res.json()
      router.push(`/summaries/${summary.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || '建立摘要失敗，請稍後再試')
      setIsCreating(false)
    }
  }

  // Check quota only if available
  const isQuotaFull = quota ? quota.remaining === 0 : false
  const isDisabled = isCreating || isQuotaFull

  return (
    <button
      onClick={handleCreate}
      disabled={isDisabled}
      title={isQuotaFull ? '今日額度已用完' : ''}
      className="bg-bg-tertiary hover:bg-white/10 text-white text-sm font-semibold py-2 px-4 rounded transition border border-white/10 font-ibm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isCreating && <Loader2 className="w-3 h-3 animate-spin" />}
      {isCreating ? '建立中...' : '建立摘要'}
      {showQuota && quota && quota.remaining > 0 && (
        <span className="text-xs text-text-secondary">
          (剩餘 {quota.remaining})
        </span>
      )}
    </button>
  )
}
