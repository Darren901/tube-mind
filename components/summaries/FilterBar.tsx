'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Youtube } from 'lucide-react'

interface Channel {
  id: string
  title: string
  youtubeId: string
  thumbnail: string | null
}

interface Tag {
  id: string
  name: string
  _count?: {
    summaryTags: number
  }
}

interface FilterBarProps {
  channels: Channel[]
  tags: Tag[]
}

type FilterType = 'channel' | 'tag'

export function FilterBar({ channels, tags }: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentChannelId = searchParams.get('channelId')
  const currentTagId = searchParams.get('tagId')

  // Determine initial filter type based on URL params
  const [filterType, setFilterType] = useState<FilterType>(() => {
    if (currentTagId) return 'tag'
    return 'channel'
  })

  // Sync state with URL if it changes externally
  useEffect(() => {
    if (currentTagId) {
      setFilterType('tag')
    } else if (currentChannelId) {
      setFilterType('channel')
    }
  }, [currentChannelId, currentTagId])

  const handleSelectChannel = (channelId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    params.delete('tagId')

    if (channelId) {
      params.set('channelId', channelId)
    } else {
      params.delete('channelId')
    }

    params.set('page', '1')
    router.push(`/summaries?${params.toString()}`)
  }

  const handleSelectTag = (tagId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    params.delete('channelId')

    if (tagId) {
      params.set('tagId', tagId)
    } else {
      params.delete('tagId')
    }

    params.set('page', '1')
    router.push(`/summaries?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Type Switcher */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setFilterType('channel')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${filterType === 'channel'
              ? "text-brand-blue bg-brand-blue/10"
              : "text-text-secondary hover:text-white hover:bg-white/5"
            }`}
        >
          <span><Youtube /></span>
          頻道
        </button>
        <button
          onClick={() => setFilterType('tag')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${filterType === 'tag'
              ? "text-brand-blue bg-brand-blue/10"
              : "text-text-secondary hover:text-white hover:bg-white/5"
            }`}
        >
          <span>#</span>
          標籤
        </button>
      </div>

      {/* Filter List */}
      <div className="flex flex-wrap gap-2">
        {filterType === 'channel' ? (
          <>
            <button
              onClick={() => handleSelectChannel(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center gap-2 ${!currentChannelId
                  ? "bg-brand-blue border-brand-blue text-white"
                  : "bg-white/5 border-white/10 text-text-secondary hover:text-white hover:bg-white/10"
                }`}
            >
              全部
            </button>
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => handleSelectChannel(channel.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center gap-2 ${currentChannelId === channel.id
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
            {channels.length === 0 && (
              <span className="text-text-secondary text-sm py-1.5">暫無頻道</span>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => handleSelectTag(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center gap-2 ${!currentTagId
                  ? "bg-brand-blue border-brand-blue text-white"
                  : "bg-white/5 border-white/10 text-text-secondary hover:text-white hover:bg-white/10"
                }`}
            >
              全部
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleSelectTag(tag.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center gap-2 ${currentTagId === tag.id
                    ? "bg-brand-blue border-brand-blue text-white"
                    : "bg-white/5 border-white/10 text-text-secondary hover:text-white hover:bg-white/10"
                  }`}
              >
                #{tag.name}
                {tag._count && (
                  <span className={`text-xs ml-1 ${currentTagId === tag.id ? "text-white/80" : "text-text-secondary"
                    }`}>
                    {tag._count.summaryTags}
                  </span>
                )}
              </button>
            ))}
            {tags.length === 0 && (
              <span className="text-text-secondary text-sm py-1.5">暫無標籤</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
