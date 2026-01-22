'use client'

import { useState, useCallback } from 'react'
import { useSummarySSE } from '@/hooks/useSummarySSE'
import type { SummaryEvent } from '@/lib/queue/events'

interface SummaryStatusWrapperProps {
  summaryId: string
  initialStatus: string
  initialContent: any
  children: (status: string, content: any) => React.ReactNode
}

export function SummaryStatusWrapper({
  summaryId,
  initialStatus,
  initialContent,
  children,
}: SummaryStatusWrapperProps) {
  const [status, setStatus] = useState(initialStatus)
  const [content, setContent] = useState(initialContent)

  const handleSSEEvent = useCallback((event: SummaryEvent) => {
    if (event.type === 'summary_processing') {
      setStatus('processing')
    } else if (event.type === 'summary_completed') {
      setStatus('completed')
      setContent(event.data.content)
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

  return <>{children(status, content)}</>
}
