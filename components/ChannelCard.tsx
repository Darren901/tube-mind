'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/components/providers/ConfirmProvider'

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
  const { confirm } = useConfirm()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch(`/api/channels/${channel.id}/refresh`, { method: 'POST' })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '更新失敗')
      }

      toast.success('頻道已更新')
      window.location.reload()
    } catch (error: any) {
      console.error('Failed to refresh:', error)
      toast.error(error.message || '更新失敗')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: '刪除頻道',
      description: '確定要刪除此頻道嗎？這將會刪除該頻道的所有影片與摘要紀錄。',
      confirmText: '刪除',
      variant: 'danger'
    })

    if (!ok) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/channels/${channel.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      
      toast.success('頻道已刪除')
      window.location.reload()
    } catch (error) {
      toast.error('刪除失敗，請稍後再試')
      setIsDeleting(false)
    }
  }

  return (
    <div className="relative p-6 bg-bg-secondary border border-white/5 rounded-lg hover:border-brand-blue/30 transition group">
      {/* Delete Button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-4 right-4 p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100"
        title="刪除頻道"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <h3 className="text-xl font-semibold text-white mb-2 font-ibm group-hover:text-brand-blue transition-colors pr-8">{channel.title}</h3>
      <p className="text-text-secondary text-sm mb-4 font-mono">
        {channel._count.videos} 部影片
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-brand-blue hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold py-2 px-4 rounded transition font-ibm"
        >
          {isRefreshing ? '更新中...' : '立即更新'}
        </button>
        <Link
          href={`/channels/${channel.id}`}
          className="bg-bg-tertiary hover:bg-white/10 text-white text-sm font-semibold py-2 px-4 rounded transition border border-white/10 font-ibm"
        >
          查看影片
        </Link>
      </div>
    </div>
  )
}
