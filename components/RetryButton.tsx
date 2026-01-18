'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCw } from 'lucide-react'

export function RetryButton({ id }: { id: string }) {
  const router = useRouter()
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      const res = await fetch(`/api/summaries/${id}/retry`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to retry')
      router.refresh()
    } catch (error) {
      alert('重試失敗，請稍後再試')
      setIsRetrying(false)
    }
  }

  return (
    <button
      onClick={handleRetry}
      disabled={isRetrying}
      className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50 font-ibm"
    >
      <RotateCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
      {isRetrying ? '重試中...' : '重試生成'}
    </button>
  )
}
