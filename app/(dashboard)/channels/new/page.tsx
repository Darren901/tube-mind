'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface YouTubeChannel {
  id: string
  title: string
  description?: string
  thumbnail?: string
}

export default function NewChannelPage() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<YouTubeChannel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/youtube/subscriptions')
      if (!res.ok) throw new Error('Failed to fetch subscriptions')
      const data = await res.json()
      setSubscriptions(data)
    } catch (err) {
      setError('無法載入您的訂閱列表，請確認已授權 YouTube 存取權限。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscribe = async (channel: YouTubeChannel) => {
    setProcessingId(channel.id)
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeId: channel.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add channel')
      }

      // 成功後重新整理或導向
      router.push('/channels')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
      setProcessingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
        從我的訂閱匯入
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded text-red-200">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          載入中...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {subscriptions.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-purple-500/30 transition"
            >
              {channel.thumbnail && (
                <Image
                  src={channel.thumbnail}
                  alt={channel.title}
                  width={50}
                  height={50}
                  className="rounded-full"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">
                  {channel.title}
                </h3>
              </div>
              <button
                onClick={() => handleSubscribe(channel)}
                disabled={processingId === channel.id}
                className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition"
              >
                {processingId === channel.id ? '處理中...' : '追蹤'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
