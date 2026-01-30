'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Switch from '@radix-ui/react-switch'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ChannelSettingsProps {
  channelId: string
  initialAutoRefresh: boolean
  initialAutoSyncNotion: boolean
}

export function ChannelSettings({
  channelId,
  initialAutoRefresh,
  initialAutoSyncNotion,
}: ChannelSettingsProps) {
  const router = useRouter()
  const [autoRefresh, setAutoRefresh] = useState(initialAutoRefresh)
  const [autoSyncNotion, setAutoSyncNotion] = useState(initialAutoSyncNotion)
  const [isPending, setIsPending] = useState(false)

  const toggleAutoRefresh = async (checked: boolean) => {
    // Optimistic update
    setAutoRefresh(checked)
    
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRefresh: checked }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || '設定失敗')
      }
      
      toast.success(checked ? '已開啟每日自動更新' : '已關閉每日自動更新')
      router.refresh()
    } catch (err: any) {
      setAutoRefresh(!checked) // Revert
      toast.error(err.message || '設定失敗，請稍後再試')
    }
  }

  const toggleAutoSyncNotion = async (checked: boolean) => {
    // Optimistic update
    setAutoSyncNotion(checked)
    setIsPending(true)

    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoSyncNotion: checked }),
      })

      const text = await res.text()
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        // Ignore JSON parse error if text is not JSON
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
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
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

      {/* Auto-sync Notion Switch */}
      <div className="flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="relative">
          <Switch.Root
              checked={autoSyncNotion}
              onCheckedChange={toggleAutoSyncNotion}
              disabled={isPending}
              className="w-10 h-6 bg-white/10 rounded-full relative data-[state=checked]:bg-[#0081F5] disabled:opacity-50 transition-colors cursor-pointer border border-white/5"
            >
              <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform translate-x-1 data-[state=checked]:translate-x-5 will-change-transform shadow-sm" />
          </Switch.Root>
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-brand-blue animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-text-secondary font-ibm">自動同步到 Notion</span>
          <span className="text-xs text-text-secondary/60">生成的摘要將自動儲存至您的 Notion 頁面</span>
        </div>
      </div>
    </div>
  )
}
