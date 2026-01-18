'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CreateSummaryButtonProps {
  videoId: string
}

export function CreateSummaryButton({ videoId }: CreateSummaryButtonProps) {
  const router = useRouter()
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
      const summary = await res.json()
      router.push(`/summaries/${summary.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || '建立摘要失敗，請稍後再試')
      setIsCreating(false)
    }
  }

  return (
    <button
      onClick={handleCreate}
      disabled={isCreating}
      className="bg-bg-tertiary hover:bg-white/10 text-white text-sm font-semibold py-2 px-4 rounded transition border border-white/10 font-ibm flex items-center gap-2"
    >
      {isCreating && <Loader2 className="w-3 h-3 animate-spin" />}
      {isCreating ? '建立中...' : '建立摘要'}
    </button>
  )
}
