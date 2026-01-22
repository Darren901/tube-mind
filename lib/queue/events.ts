// lib/queue/events.ts
import { Redis } from 'ioredis'
import { redisConnection } from './connection'
import type { SummaryEvent } from '@/types/events'

export type { SummaryEvent }

// Redis channel 命名函式
export function getSummaryChannel(summaryId: string): string {
  return `summary:${summaryId}`
}

// 發布事件到 Redis channel
export async function publishSummaryEvent(
  summaryId: string,
  event: SummaryEvent
): Promise<void> {
  const publisher = redisConnection.duplicate()
  
  try {
    const channel = getSummaryChannel(summaryId)
    const message = JSON.stringify(event)
    
    await publisher.publish(channel, message)
    console.log(`[Events] Published to ${channel}:`, event.type)
  } catch (error) {
    console.error(`[Events] Failed to publish event:`, error)
    throw error
  } finally {
    await publisher.quit()
  }
}

// 訂閱 Summary 事件
export function subscribeSummaryEvents(
  summaryId: string,
  callback: (event: SummaryEvent) => void
): Redis {
  const subscriber = redisConnection.duplicate()
  const channel = getSummaryChannel(summaryId)
  
  subscriber.subscribe(channel, (err) => {
    if (err) {
      console.error(`[Events] Failed to subscribe to ${channel}:`, err)
    } else {
      console.log(`[Events] Subscribed to ${channel}`)
    }
  })
  
  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        const event = JSON.parse(message) as SummaryEvent
        callback(event)
      } catch (error) {
        console.error(`[Events] Failed to parse message:`, error)
      }
    }
  })
  
  return subscriber
}
