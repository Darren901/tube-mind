'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/components/providers/ConfirmProvider'

export function DeleteChannelButton({ id }: { id: string }) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    const ok = await confirm({
      title: '刪除頻道',
      description: '確定要刪除此頻道嗎？這將會刪除該頻道的所有影片與摘要紀錄，此動作無法復原。',
      confirmText: '確認刪除',
      variant: 'danger'
    })

    if (!ok) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/channels/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      
      toast.success('頻道已刪除')
      router.push('/channels')
      router.refresh()
    } catch (error) {
      toast.error('刪除失敗，請稍後再試')
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
      title="刪除頻道"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  )
}
