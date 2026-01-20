'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Check, ChevronLeft, ChevronRight, Loader2, PlaySquare, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { SearchInput } from '@/components/SearchInput'

interface YouTubeChannel {
  id: string
  title: string
  description?: string
  thumbnail?: string
  isAdded?: boolean
}

interface Video {
  id: string
  title: string
  thumbnail: string
  publishedAt: string
  channelId: string
  // Optional: add channel name if API returns it, otherwise we map it
  channelName?: string
}

const ITEMS_PER_PAGE = 15

export default function NewChannelPage() {
  const router = useRouter()

  // Step 1: Subscriptions
  const [step, setStep] = useState(1)
  const [subscriptions, setSubscriptions] = useState<YouTubeChannel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 2: Recent Videos
  const [recentVideos, setRecentVideos] = useState<Video[]>([])
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())

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

  // --- Step 1 Logic ---

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredSubscriptions.length / ITEMS_PER_PAGE)
  const currentData = filteredSubscriptions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const toggleChannelSelection = (id: string) => {
    const newSelected = new Set(selectedChannelIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedChannelIds(newSelected)
  }

  const handleStep1Submit = async () => {
    if (selectedChannelIds.size === 0) return
    setIsSubmitting(true)

    try {
      // Import channels and get their recent videos
      const promises = Array.from(selectedChannelIds).map(id =>
        fetch('/api/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtubeId: id }),
        }).then(res => res.json())
      )

      const results = await Promise.all(promises)

      // Collect all recent videos from the imported channels
      const allVideos: Video[] = []
      results.forEach((result: any) => {
        if (result.recentVideos && Array.isArray(result.recentVideos)) {
          // Add channel name to video object for display
          const videosWithChannel = result.recentVideos.map((v: any) => ({
            ...v,
            channelName: result.title
          }))
          allVideos.push(...videosWithChannel)
        }
      })

      // Sort by date desc
      allVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

      setRecentVideos(allVideos)

      // Pre-select up to 5 latest videos
      const preSelected = new Set<string>()
      allVideos.slice(0, 5).forEach(v => preSelected.add(v.id))
      setSelectedVideoIds(preSelected)

      // Move to Step 2
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      toast.error('部分頻道匯入失敗，請稍後再試')
      // If failed, maybe just go back to list
      router.push('/channels')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Step 2 Logic ---

  const toggleVideoSelection = (id: string) => {
    const newSelected = new Set(selectedVideoIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      // Optional cap: if (newSelected.size >= 5) ...
      newSelected.add(id)
    }
    setSelectedVideoIds(newSelected)
  }

  const handleStep2Submit = async () => {
    setIsSubmitting(true)
    try {
      if (selectedVideoIds.size > 0) {
        await fetch('/api/summaries/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoIds: Array.from(selectedVideoIds) }),
        })
      }

      // Done, go to summaries page
      router.push('/summaries')
      router.refresh()
    } catch (err) {
      toast.error('建立摘要任務失敗')
      router.push('/channels')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Render ---

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-rajdhani text-white mb-2">
            {step === 1 ? '從訂閱匯入' : '選擇初始影片'}
          </h1>
          <div className="w-20 h-1 bg-brand-blue rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] mb-4" />
          <p className="text-text-secondary font-ibm text-sm">
            {step === 1
              ? '選擇您想要 AI 自動生成摘要的頻道'
              : '我們為您找到了這些頻道的最新影片，選擇您想立即摘要的內容'
            }
          </p>
        </div>

        {step === 1 && (
          <SearchInput
            placeholder="搜尋頻道..."
            onSearch={(term) => {
              setSearchTerm(term)
              setCurrentPage(1)
            }}
          />
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded text-red-200 font-ibm">
          {error}
        </div>
      )}

      {/* Step 1: Channel Selection */}
      {step === 1 && (
        <>
          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="w-10 h-10 text-brand-blue animate-spin mx-auto mb-4" />
              <p className="text-text-secondary font-ibm">正在與 YouTube 同步您的訂閱列表...</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
                {currentData.map((channel) => {
                  const isSelected = selectedChannelIds.has(channel.id)
                  const isAdded = channel.isAdded

                  return (
                    <div
                      key={channel.id}
                      onClick={() => !isAdded && toggleChannelSelection(channel.id)}
                      className={`
                        relative flex items-center gap-4 p-4 rounded-lg border transition-all group select-none
                        ${isAdded
                          ? 'opacity-40 cursor-default border-white/5 bg-bg-tertiary'
                          : isSelected
                            ? 'bg-brand-blue/10 border-brand-blue shadow-[0_0_20px_rgba(59,130,246,0.15)] cursor-pointer'
                            : 'bg-bg-secondary border-white/5 hover:border-brand-blue/50 hover:bg-white/5 cursor-pointer'
                        }
                      `}
                    >
                      <div className={`
                        w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0
                        ${isAdded
                          ? 'border-transparent'
                          : isSelected
                            ? 'bg-brand-blue border-brand-blue'
                            : 'border-white/30 group-hover:border-white/50 bg-transparent'
                        }
                      `}>
                        {isAdded ? (
                          <Check className="w-4 h-4 text-text-secondary" />
                        ) : isSelected && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>

                      {channel.thumbnail && (
                        <Image
                          src={channel.thumbnail}
                          alt={channel.title}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold truncate transition-colors ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                          {channel.title}
                        </h3>
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 py-8">
                  <button
                    onClick={() => {
                      setCurrentPage(p => Math.max(1, p - 1))
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-white transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <span className="font-mono text-brand-blue">
                    {currentPage} <span className="text-text-secondary">/</span> {totalPages}
                  </span>

                  <button
                    onClick={() => {
                      setCurrentPage(p => Math.min(totalPages, p + 1))
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-white transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Step 2: Video Selection */}
      {step === 2 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {recentVideos.length === 0 ? (
            <div className="col-span-full text-center py-12 text-text-secondary font-ibm">
              這些頻道似乎沒有近期影片。
            </div>
          ) : (
            recentVideos.map((video) => {
              const isSelected = selectedVideoIds.has(video.id)

              return (
                <div
                  key={video.id}
                  onClick={() => toggleVideoSelection(video.id)}
                  className={`
                    relative flex flex-col gap-3 p-4 rounded-lg border cursor-pointer transition-all group select-none
                    ${isSelected
                      ? 'bg-brand-blue/10 border-brand-blue shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                      : 'bg-bg-secondary border-white/5 hover:border-brand-blue/50 hover:bg-white/5'
                    }
                  `}
                >
                  <div className="relative aspect-video w-full rounded overflow-hidden bg-black">
                    {video.thumbnail && (
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        className="object-cover"
                      />
                    )}
                    <div className="absolute top-2 left-2">
                      <div className={`
                        w-6 h-6 rounded border flex items-center justify-center transition-colors shadow-lg
                        ${isSelected
                          ? 'bg-brand-blue border-brand-blue'
                          : 'bg-black/50 border-white/50 group-hover:border-white'
                        }
                      `}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className={`font-semibold line-clamp-2 mb-1 leading-snug transition-colors ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                      {video.title}
                    </h3>
                    <p className="text-xs text-text-secondary font-ibm flex justify-between">
                      <span>{video.channelName}</span>
                      <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Floating Action Bar */}
      <div className={`
        fixed bottom-0 left-0 right-0 p-4 bg-bg-secondary/90 backdrop-blur-lg border-t border-white/10 transition-transform duration-300 z-40
        ${(step === 1 && selectedChannelIds.size > 0) || (step === 2) ? 'translate-y-0' : 'translate-y-full'}
      `}>
        <div className="max-w-6xl mx-auto flex justify-between items-center px-4">
          <div className="text-white font-ibm">
            {step === 1 ? (
              <>已選擇 <span className="text-brand-blue font-bold font-mono text-lg mx-1">{selectedChannelIds.size}</span> 個頻道</>
            ) : (
              <>已選擇 <span className="text-brand-blue font-bold font-mono text-lg mx-1">{selectedVideoIds.size}</span> 部影片</>
            )}
          </div>

          <button
            onClick={step === 1 ? handleStep1Submit : handleStep2Submit}
            disabled={isSubmitting}
            className="bg-brand-blue hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-lg transition shadow-lg shadow-brand-blue/20 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                處理中...
              </>
            ) : step === 1 ? (
              <>下一步 <ArrowRight className="w-4 h-4" /></>
            ) : (
              `開始生成摘要`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
