'use client'

import { useEffect, useRef } from 'react'
import type { SummaryEvent } from '@/lib/queue/events'

interface UseSummarySSEOptions {
  summaryId: string
  enabled: boolean
  onEvent: (event: SummaryEvent) => void
}

export function useSummarySSE({ summaryId, enabled, onEvent }: UseSummarySSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled) {
      // 如果不需要連線，確保清理現有連線
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    console.log(`[SSE Hook] Connecting to summary ${summaryId}`)

    const eventSource = new EventSource(`/api/sse/summary/${summaryId}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as SummaryEvent
        
        // 忽略心跳和連線確認
        if ('type' in event && (event as any).type === 'connected') {
          console.log(`[SSE Hook] Connected to summary ${summaryId}`)
          return
        }

        console.log(`[SSE Hook] Received event:`, event)
        onEvent(event)
      } catch (error) {
        console.error(`[SSE Hook] Failed to parse event:`, error)
      }
    }

    eventSource.onerror = (error) => {
      console.error(`[SSE Hook] Error:`, error)
      // EventSource 會自動重連，除非我們主動 close
    }

    // 清理函式
    return () => {
      console.log(`[SSE Hook] Disconnecting from summary ${summaryId}`)
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [summaryId, enabled, onEvent])

  return {
    isConnected: eventSourceRef.current !== null,
  }
}
