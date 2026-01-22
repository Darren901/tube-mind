import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { subscribeSummaryEvents } from '@/lib/queue/events'
import type { SummaryEvent } from '@/lib/queue/events'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const summaryId = params.id

  // 驗證使用者權限
  const summary = await prisma.summary.findFirst({
    where: {
      id: summaryId,
      userId: session.user.id,
    },
  })

  if (!summary) {
    return new Response('Summary not found', { status: 404 })
  }

  // 建立 SSE stream
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE] Client connected for summary ${summaryId}`)

      // 訂閱 Redis events
      const subscriber = subscribeSummaryEvents(summaryId, (event: SummaryEvent) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(data))
          
          // 如果摘要完成且音訊也完成，可以選擇關閉連線
          // 但為了簡化，我們讓前端自己決定何時關閉
        } catch (error) {
          console.error(`[SSE] Error sending event:`, error)
        }
      })

      // 發送初始心跳
      const heartbeat = `data: ${JSON.stringify({ type: 'connected' })}\n\n`
      controller.enqueue(encoder.encode(heartbeat))

      // 定期發送心跳以保持連線
      const heartbeatInterval = setInterval(() => {
        try {
          const ping = `:ping\n\n`
          controller.enqueue(encoder.encode(ping))
        } catch (error) {
          console.error(`[SSE] Heartbeat failed:`, error)
          clearInterval(heartbeatInterval)
        }
      }, 30000) // 每 30 秒

      // 清理函式
      const cleanup = () => {
        console.log(`[SSE] Client disconnected for summary ${summaryId}`)
        clearInterval(heartbeatInterval)
        subscriber.quit()
      }

      // 當客戶端斷線時清理
      request.signal.addEventListener('abort', cleanup)

      // 當 stream 關閉時清理
      return cleanup
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
