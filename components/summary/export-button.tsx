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
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-secondary border border-white/10 rounded-lg hover:text-white hover:bg-white/5 transition disabled:opacity-50"
      title="匯出至 Notion"
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" role="img" aria-label="Notion icon">
           <path d="M4.223 2.978c-.296 0-.547.164-.69.447L.58 8.706a.798.798 0 00.292 1.055l1.096.634v8.28c0 .87.7 1.576 1.564 1.576h15.225c.864 0 1.564-.706 1.564-1.576v-7.9l1.838-.96a.8.8 0 00.32-1.077l-2.47-5.32a.774.774 0 00-.705-.44h-15.08zm1.097 9.15h1.968a.39.39 0 01.39.387v5.006a.39.39 0 01-.39.388H5.32a.39.39 0 01-.39-.388v-5.006a.39.39 0 01.39-.387zm4.782 0h2.952a.39.39 0 01.39.387v5.006a.39.39 0 01-.39.388h-2.952a.39.39 0 01-.39-.388v-5.006a.39.39 0 01.39-.387zm5.766 0h1.968a.39.39 0 01.39.387v5.006a.39.39 0 01-.39.388h-1.968a.39.39 0 01-.39-.388v-5.006a.39.39 0 01.39-.387z" />
           <path d="M0 0h24v24H0z" fill="none"/>
           {/* Fallback to simple N if path above is too complex or just use simple text */}
        </svg>
      )}
      <span>Notion</span>
    </button>
  )
}
