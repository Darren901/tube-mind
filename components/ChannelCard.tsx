'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ChannelCardProps {
  channel: {
    id: string
    title: string
    thumbnail: string | null
    _count: {
      videos: number
    }
  }
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetch(`/api/channels/${channel.id}/refresh`, { method: 'POST' })
      window.location.reload()
    } catch (error) {
      console.error('Failed to refresh:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-purple-900/20 to-yellow-900/20 border border-purple-500/30 rounded-lg">
      <h3 className="text-xl font-semibold text-white mb-2">{channel.title}</h3>
      <p className="text-gray-400 text-sm mb-4">
        {channel._count.videos} 部影片
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-500 hover:to-yellow-500 disabled:opacity-50 text-white text-sm font-semibold py-2 px-4 rounded transition"
        >
          {isRefreshing ? '更新中...' : '立即更新'}
        </button>
        <Link
          href={`/channels/${channel.id}`}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-4 rounded transition"
        >
          查看影片
        </Link>
      </div>
    </div>
  )
}
