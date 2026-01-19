'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Channel {
  id: string
  title: string
  youtubeId: string
  thumbnail: string | null
}

interface ChannelFilterProps {
  channels: Channel[]
}

export function ChannelFilter({ channels }: ChannelFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentChannelId = searchParams.get('channelId')

  const handleSelect = (channelId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (channelId) {
      params.set('channelId', channelId)
    } else {
      params.delete('channelId')
    }
    // Reset page to 1 when filter changes
    params.set('page', '1')
    router.push(`/summaries?${params.toString()}`)
  }

  if (channels.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => handleSelect(null)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center gap-2 ${
          !currentChannelId
            ? "bg-brand-blue border-brand-blue text-white"
            : "bg-white/5 border-white/10 text-text-secondary hover:text-white hover:bg-white/10"
        }`}
      >
        全部
      </button>
      {channels.map((channel) => (
        <button
          key={channel.id}
          onClick={() => handleSelect(channel.id)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center gap-2 ${
            currentChannelId === channel.id
              ? "bg-brand-blue border-brand-blue text-white"
              : "bg-white/5 border-white/10 text-text-secondary hover:text-white hover:bg-white/10"
          }`}
        >
          {channel.thumbnail && (
            <img 
              src={channel.thumbnail} 
              alt={channel.title} 
              className="w-5 h-5 rounded-full object-cover"
            />
          )}
          {channel.title}
        </button>
      ))}
    </div>
  )
}
