'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSummarySSE } from '@/hooks/useSummarySSE'
import type { SummaryEvent } from '@/lib/queue/events'
import { AlertCircle } from 'lucide-react'
import { DeleteSummaryButton } from '@/components/DeleteSummaryButton'
import { RetryButton } from '@/components/RetryButton'

interface SummaryStatusWrapperProps {
  summaryId: string
  initialStatus: string
  errorMessage?: string | null
}

export function SummaryStatusWrapper({
  summaryId,
  initialStatus,
  errorMessage,
}: SummaryStatusWrapperProps) {
  const [status, setStatus] = useState(initialStatus)

  const handleSSEEvent = useCallback((event: SummaryEvent) => {
    if (event.type === 'summary_processing') {
      setStatus('processing')
    } else if (event.type === 'summary_completed') {
      setStatus('completed')
    } else if (event.type === 'summary_failed') {
      setStatus('failed')
    }
  }, [])

  // 智能連線：只在未完成時連線
  const shouldConnect = status !== 'completed'

  useSummarySSE({
    summaryId,
    enabled: shouldConnect,
    onEvent: handleSSEEvent,
  })

  // 當狀態變更為 completed 時，自動重新整理頁面以顯示內容
  useEffect(() => {
    if (status === 'completed') {
      window.location.reload()
    }
  }, [status])

  if (status === 'completed') {
    return null
  }

  const isFailed = status === 'failed'

  return (
    <div className="text-center py-12 relative group max-w-2xl mx-auto">
      <div className="absolute top-0 right-0">
        <DeleteSummaryButton id={summaryId} />
      </div>

      {isFailed ? (
        <div className="flex flex-col items-center gap-6">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-full">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-rajdhani">
              摘要生成失敗
            </h1>
            <p className="text-text-secondary font-ibm mb-4">
              抱歉，我們在處理這部影片時遇到了問題。
            </p>

            {errorMessage && (
              <div className="bg-bg-secondary border border-white/10 p-4 rounded-lg text-left mb-6 font-mono text-sm text-red-300 max-w-full overflow-auto">
                {errorMessage}
              </div>
            )}
          </div>

          <RetryButton id={summaryId} />
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-bold text-white mb-4 font-rajdhani animate-pulse">
            {status === 'processing' ? 'AI 正在分析影片...' : '等待處理中...'}
          </h1>
          <p className="text-text-secondary font-ibm">這可能需要幾分鐘的時間，您可以稍後再回來查看。</p>
        </div>
      )}
    </div>
  )
}
