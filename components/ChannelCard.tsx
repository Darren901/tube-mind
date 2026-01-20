'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trash2, User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/components/providers/ConfirmProvider'
import * as Switch from '@radix-ui/react-switch'

interface ChannelCardProps {
  channel: {
    id: string
    title: string
    thumbnail: string | null
    autoRefresh: boolean
    autoSyncNotion: boolean
    _count: {
      videos: number
    }
  }
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(channel.autoRefresh)
  const [autoSyncNotion, setAutoSyncNotion] = useState(channel.autoSyncNotion)
  const [isNotionPending, setIsNotionPending] = useState(false)

  const toggleAutoRefresh = async (checked: boolean) => {
    setAutoRefresh(checked)
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRefresh: checked })
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(checked ? '已開啟自動更新' : '已關閉自動更新')
      router.refresh()
    } catch (err) {
      setAutoRefresh(!checked)
      toast.error('設定失敗')
    }
  }

  const toggleAutoSyncNotion = async (checked: boolean) => {
    setAutoSyncNotion(checked)
    setIsNotionPending(true)

    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoSyncNotion: checked }),
      })

      const text = await res.text()
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        // Ignore JSON parse error
      }

      if (!res.ok) {
        if (res.status === 400 && data?.error && (data.error.includes('Notion') || data.error.includes('Parent Page'))) {
          throw new Error('請先至設定頁面連結 Notion 帳號並選擇儲存位置')
        }
        throw new Error(data?.error || '設定失敗')
      }

      toast.success(checked ? '已開啟 Notion 同步' : '已關閉 Notion 同步')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      setAutoSyncNotion(!checked) // Revert
      toast.error(err.message || '設定失敗')
    } finally {
      setIsNotionPending(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch(`/api/channels/${channel.id}/refresh`, { method: 'POST' })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '更新失敗')
      }

      toast.success('頻道已更新')
      router.refresh()
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
      router.refresh()
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

      <div className="flex items-start gap-4 mb-4">
        <div className="relative w-12 h-12 flex-shrink-0 rounded-full bg-white/10 overflow-hidden">
          {channel.thumbnail ? (
            <Image
              src={channel.thumbnail}
              alt={channel.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary">
              <User className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="text-xl font-semibold text-white mb-1 font-ibm group-hover:text-brand-blue transition-colors truncate">
            {channel.title}
          </h3>
          <p className="text-text-secondary text-sm font-mono">
            {channel._count.videos} 部影片
          </p>
        </div>
      </div>
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

      <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/5">
        {/* Daily Update Switch */}
        <div className="flex items-center gap-3">
          <Switch.Root 
            checked={autoRefresh} 
            onCheckedChange={toggleAutoRefresh}
            className="w-10 h-6 bg-white/10 rounded-full relative data-[state=checked]:bg-brand-blue transition-colors cursor-pointer border border-white/5"
          >
            <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform translate-x-1 data-[state=checked]:translate-x-5 will-change-transform shadow-sm" />
          </Switch.Root>
          <span className="text-sm text-text-secondary font-ibm">每日自動更新</span>
        </div>

        {/* Auto-sync Notion Switch (Conditional) */}
        {autoRefresh && (
          <div className="flex items-center gap-3 ml-6 transition-all animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="relative">
              <Switch.Root
                checked={autoSyncNotion}
                onCheckedChange={toggleAutoSyncNotion}
                disabled={isNotionPending}
                className="w-10 h-6 bg-white/10 rounded-full relative data-[state=checked]:bg-[#0081F5] disabled:opacity-50 transition-colors cursor-pointer border border-white/5"
              >
                <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform translate-x-1 data-[state=checked]:translate-x-5 will-change-transform shadow-sm" />
              </Switch.Root>
              {isNotionPending && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-3 h-3 text-brand-blue animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary font-ibm">自動同步到 Notion</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
