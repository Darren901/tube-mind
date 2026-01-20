'use client'

import { useState } from 'react'
import { Share } from 'lucide-react'
import { toast } from 'sonner'

interface ExportButtonProps {
  summaryId: string
}

export function ExportButton({ summaryId }: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/summaries/${summaryId}/export/notion`, {
        method: 'POST',
      })
      
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '匯出失敗')
      }

      toast.success('已匯出至 Notion', {
        action: data.url ? {
          label: '開啟',
          onClick: () => window.open(data.url, '_blank')
        } : undefined
      })
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : '匯出失敗，請確認是否已連接 Notion')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isLoading}
      className="p-2 text-text-secondary hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition disabled:opacity-50"
      title="匯出至 Notion"
    >
      <Share className="w-5 h-5" />
    </button>
  )
}
